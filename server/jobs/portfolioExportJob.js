const cron = require('node-cron');
const { ExportSchedule } = require('../models');
const { sendPortfolioExportEmail } = require('../email');
const dbAdapter = require('../dbAdapter');
const xlsx = require('xlsx');

// Day name to cron day mapping (0 = Sunday, 5 = Friday)
const dayToCronMap = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

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

  const colWidths = [
    { wch: 30 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 40 },
    { wch: 40 },
    { wch: 40 },
    { wch: 15 }
  ];
  worksheet['!cols'] = colWidths;

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// Execute the export and email
const executeExport = async (schedule) => {
  try {
    console.log('[PortfolioExport] Starting scheduled export...');

    // Get portfolio data
    const projects = await dbAdapter.getAllProjects({});
    console.log(`[PortfolioExport] Exporting ${projects.length} projects`);

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

    // Update schedule with result
    schedule.lastSent = new Date();
    if (emailResult.success) {
      schedule.lastSentStatus = 'success';
      schedule.lastSentError = null;
      console.log('[PortfolioExport] Export email sent successfully to:', schedule.recipients);
    } else {
      schedule.lastSentStatus = 'failed';
      schedule.lastSentError = emailResult.error;
      console.error('[PortfolioExport] Failed to send export email:', emailResult.error);
    }

    await schedule.save();

    return emailResult;
  } catch (err) {
    console.error('[PortfolioExport] Error executing export:', err);

    // Update schedule with error
    schedule.lastSent = new Date();
    schedule.lastSentStatus = 'failed';
    schedule.lastSentError = err.message;
    await schedule.save();

    return { success: false, error: err.message };
  }
};

// Check if it's time to send export (based on schedule)
const checkAndSendExport = async () => {
  try {
    // Get active schedule
    const schedule = await ExportSchedule.findOne({ isActive: true });
    if (!schedule) {
      return;
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 5 = Friday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Parse schedule time (HH:MM)
    const [scheduleHour, scheduleMinute] = schedule.scheduleTime.split(':').map(Number);
    const scheduledDay = dayToCronMap[schedule.scheduleDay];

    // Check if today is the scheduled day and time matches
    if (currentDay !== scheduledDay) {
      return;
    }

    if (currentHour !== scheduleHour || currentMinute !== scheduleMinute) {
      return;
    }

    // Check if we already sent today
    if (schedule.lastSent) {
      const lastSent = new Date(schedule.lastSent);
      const today = new Date();
      if (lastSent.toDateString() === today.toDateString()) {
        console.log('[PortfolioExport] Already sent today, skipping...');
        return;
      }
    }

    // Execute the export
    await executeExport(schedule);
  } catch (err) {
    console.error('[PortfolioExport] Error in checkAndSendExport:', err);
  }
};

// Initialize the scheduled job
const initializePortfolioExportJob = () => {
  console.log('[PortfolioExport] Initializing scheduled job...');

  // Run every minute to check if it's time to send
  const job = cron.schedule('* * * * *', async () => {
    try {
      await checkAndSendExport();
    } catch (err) {
      console.error('[PortfolioExport] Scheduled job error:', err);
    }
  }, {
    scheduled: true,
    timezone: 'America/Chicago' // CST timezone
  });

  console.log('[PortfolioExport] Job initialized - checking every minute');

  return job;
};

// Manual trigger function
const triggerManualExport = async () => {
  console.log('[PortfolioExport] Manual export triggered');

  const schedule = await ExportSchedule.findOne({ isActive: true });
  if (!schedule) {
    throw new Error('No active export schedule found');
  }

  return await executeExport(schedule);
};

module.exports = {
  initializePortfolioExportJob,
  triggerManualExport
};
