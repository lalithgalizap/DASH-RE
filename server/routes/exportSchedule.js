const express = require('express');
const { ExportSchedule } = require('../models');
const { authenticate, requireAdmin } = require('../auth');
const { sendPortfolioExportEmail } = require('../email');
const dbAdapter = require('../dbAdapter');
const xlsx = require('xlsx');

const router = express.Router();

// Helper to generate CSV from portfolio data
const generateCSV = (projects) => {
  if (!projects || projects.length === 0) {
    return 'Project Name,SPOC,RAG Status,Status,Action Item,Risk Summary,Mitigation,Updated At\n';
  }

  const headers = ['Project Name', 'SPOC', 'RAG Status', 'Status', 'Action Item', 'Risk Summary', 'Mitigation', 'Updated At'];
  const rows = projects.map(project => [
    project.name || '',
    project.spoc || '',
    project.ragStatus || '',
    project.status || '',
    project.actionItem || '',
    project.riskSummary || '',
    project.riskMitigation || '',
    project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : ''
  ]);

  // Escape special characters and wrap in quotes if needed
  const escapeCell = (cell) => {
    const str = String(cell || '');
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers, ...rows].map(row => row.map(escapeCell).join(','));
  return csvRows.join('\n');
};

// Helper to generate Excel from portfolio data
const generateExcel = (projects) => {
  const headers = ['Project Name', 'SPOC', 'RAG Status', 'Status', 'Action Item', 'Risk Summary', 'Mitigation', 'Updated At'];
  const data = projects.map(project => ({
    'Project Name': project.name || '',
    'SPOC': project.spoc || '',
    'RAG Status': project.ragStatus || '',
    'Status': project.status || '',
    'Action Item': project.actionItem || '',
    'Risk Summary': project.riskSummary || '',
    'Mitigation': project.riskMitigation || '',
    'Updated At': project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : ''
  }));

  const worksheet = xlsx.utils.json_to_sheet(data, { header: headers });
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Portfolio');

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Project Name
    { wch: 20 }, // SPOC
    { wch: 12 }, // RAG Status
    { wch: 15 }, // Status
    { wch: 40 }, // Action Item
    { wch: 40 }, // Risk Summary
    { wch: 40 }, // Mitigation
    { wch: 15 }  // Updated At
  ];
  worksheet['!cols'] = colWidths;

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// Get current export schedule configuration
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const schedule = await ExportSchedule.findOne({ isActive: true }).lean();
    if (!schedule) {
      return res.json({
        scheduleDay: 'friday',
        scheduleTime: '18:00',
        recipients: [],
        format: 'csv',
        isActive: false,
        lastSent: null,
        lastSentStatus: null
      });
    }
    res.json(schedule);
  } catch (err) {
    console.error('Error fetching export schedule:', err);
    res.status(500).json({ error: 'Failed to fetch export schedule' });
  }
});

// Create or update export schedule
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { scheduleDay, scheduleTime, recipients, format, isActive } = req.body;

    // Validate required fields
    if (!scheduleDay || !scheduleTime || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Schedule day, time, and at least one recipient are required' });
    }

    // Validate day
    const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (!validDays.includes(scheduleDay)) {
      return res.status(400).json({ error: 'Invalid schedule day' });
    }

    // Validate time format (HH:MM)
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleTime)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM (24-hour)' });
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ error: `Invalid email addresses: ${invalidEmails.join(', ')}` });
    }

    // Validate format
    if (!['csv', 'excel'].includes(format)) {
      return res.status(400).json({ error: 'Format must be csv or excel' });
    }

    // Deactivate existing active schedule
    await ExportSchedule.updateMany({ isActive: true }, { isActive: false });

    // Create new schedule
    const schedule = new ExportSchedule({
      scheduleDay,
      scheduleTime,
      recipients,
      format: format || 'csv',
      isActive: isActive !== false,
      createdBy: req.user.id
    });

    await schedule.save();

    res.json({
      success: true,
      message: 'Export schedule saved successfully',
      schedule: {
        id: schedule._id,
        scheduleDay: schedule.scheduleDay,
        scheduleTime: schedule.scheduleTime,
        recipients: schedule.recipients,
        format: schedule.format,
        isActive: schedule.isActive
      }
    });
  } catch (err) {
    console.error('Error saving export schedule:', err);
    res.status(500).json({ error: 'Failed to save export schedule' });
  }
});

// Manually trigger export email
router.post('/trigger', authenticate, requireAdmin, async (req, res) => {
  try {
    const schedule = await ExportSchedule.findOne({ isActive: true });
    if (!schedule) {
      return res.status(400).json({ error: 'No active export schedule found. Please configure schedule first.' });
    }

    // Get portfolio data
    const projects = await dbAdapter.getAllProjects({});

    // Generate file
    let attachmentBuffer;
    let filename;
    const timestamp = new Date().toISOString().split('T')[0];

    if (schedule.format === 'excel') {
      attachmentBuffer = generateExcel(projects);
      filename = `portfolio-export-${timestamp}`;
    } else {
      const csvContent = generateCSV(projects);
      attachmentBuffer = Buffer.from(csvContent, 'utf-8');
      filename = `portfolio-export-${timestamp}`;
    }

    // Send email
    const emailResult = await sendPortfolioExportEmail(
      schedule.recipients,
      attachmentBuffer,
      filename,
      schedule.format
    );

    if (!emailResult.success) {
      // Update last sent status to failed
      schedule.lastSent = new Date();
      schedule.lastSentStatus = 'failed';
      schedule.lastSentError = emailResult.error;
      await schedule.save();

      return res.status(500).json({ error: `Failed to send email: ${emailResult.error}` });
    }

    // Update last sent status to success
    schedule.lastSent = new Date();
    schedule.lastSentStatus = 'success';
    schedule.lastSentError = null;
    await schedule.save();

    res.json({
      success: true,
      message: `Portfolio export sent successfully to ${schedule.recipients.length} recipient(s)`,
      recipients: schedule.recipients,
      format: schedule.format,
      projectCount: projects.length
    });
  } catch (err) {
    console.error('Error triggering export:', err);
    res.status(500).json({ error: 'Failed to trigger export' });
  }
});

// Send test email
router.post('/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const { recipients, format } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ error: `Invalid email addresses: ${invalidEmails.join(', ')}` });
    }

    // Get portfolio data
    const projects = await dbAdapter.getAllProjects({});

    // Generate file
    let attachmentBuffer;
    let filename;
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      attachmentBuffer = generateExcel(projects);
      filename = `portfolio-export-test-${timestamp}`;
    } else {
      const csvContent = generateCSV(projects);
      attachmentBuffer = Buffer.from(csvContent, 'utf-8');
      filename = `portfolio-export-test-${timestamp}`;
    }

    // Send email
    const emailResult = await sendPortfolioExportEmail(
      recipients,
      attachmentBuffer,
      filename,
      format || 'csv'
    );

    if (!emailResult.success) {
      return res.status(500).json({ error: `Failed to send test email: ${emailResult.error}` });
    }

    res.json({
      success: true,
      message: `Test email sent successfully to ${recipients.length} recipient(s)`,
      recipients,
      format: format || 'csv',
      projectCount: projects.length
    });
  } catch (err) {
    console.error('Error sending test email:', err);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

module.exports = router;
