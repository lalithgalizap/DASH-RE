const cron = require('node-cron');
const { ExportSchedule } = require('../models');
const { sendPortfolioExportEmail } = require('../email');
const dbAdapter = require('../dbAdapter');
const xlsx = require('xlsx');

// Day name to cron day-of-week mapping (0=Sunday … 6=Saturday)
const dayToCronMap = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6
};

// ─── File generators ────────────────────────────────────────────────────────

const generateCSV = (projects) => {
  if (!projects || projects.length === 0)
    return 'Project Name,SPOC,RAG Status,Status,Action Item,Risk Summary,Mitigation,Updated At\n';

  const headers = ['Project Name','SPOC','RAG Status','Status','Action Item','Risk Summary','Mitigation','Updated At'];
  const escape = (cell) => {
    const s = String(cell || '');
    return (s.includes(',') || s.includes('\n') || s.includes('"'))
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = projects.map(p => [
    p.name, p.spoc, p.ragStatus, p.status,
    p.actionItem, p.riskSummary, p.riskMitigation,
    p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ''
  ]);
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
};

const generateExcel = (projects) => {
  const headers = ['Project Name','SPOC','RAG Status','Status','Action Item','Risk Summary','Mitigation','Updated At'];
  const data = projects.map(p => ({
    'Project Name': p.name || '', 'SPOC': p.spoc || '',
    'RAG Status': p.ragStatus || '', 'Status': p.status || '',
    'Action Item': p.actionItem || '', 'Risk Summary': p.riskSummary || '',
    'Mitigation': p.riskMitigation || '',
    'Updated At': p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ''
  }));
  const ws = xlsx.utils.json_to_sheet(data, { header: headers });
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Portfolio');
  ws['!cols'] = [30,20,12,15,40,40,40,15].map(w => ({ wch: w }));
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

// ─── Export executor ─────────────────────────────────────────────────────────

const executeExport = async (schedule) => {
  try {
    console.log('[PortfolioExport] Running scheduled export...');
    const projects = await dbAdapter.getAllProjects({});
    const timestamp = new Date().toISOString().split('T')[0];

    let attachmentBuffer, filename;
    if (schedule.format === 'excel') {
      attachmentBuffer = generateExcel(projects);
      filename = `portfolio-export-${timestamp}`;
    } else {
      attachmentBuffer = Buffer.from(generateCSV(projects), 'utf-8');
      filename = `portfolio-export-${timestamp}`;
    }

    const result = await sendPortfolioExportEmail(
      schedule.recipients, attachmentBuffer, filename, schedule.format
    );

    schedule.lastSent = new Date();
    schedule.lastSentStatus = result.success ? 'success' : 'failed';
    schedule.lastSentError = result.success ? null : result.error;
    await schedule.save();

    if (result.success) {
      console.log('[PortfolioExport] Email sent to:', schedule.recipients);
    } else {
      console.error('[PortfolioExport] Email failed:', result.error);
    }
    return result;
  } catch (err) {
    console.error('[PortfolioExport] Export error:', err);
    try {
      schedule.lastSent = new Date();
      schedule.lastSentStatus = 'failed';
      schedule.lastSentError = err.message;
      await schedule.save();
    } catch (_) {}
    return { success: false, error: err.message };
  }
};

// ─── Precise scheduler ───────────────────────────────────────────────────────
// Instead of polling every minute, we build the exact cron expression from the
// schedule config and fire it once at the right time. No missed-tick spam.

let activeJob = null;

/**
 * Build a cron expression from schedule config.
 * e.g. scheduleTime="14:30", scheduleDay="friday" → "30 14 * * 5"
 */
const buildCronExpression = (scheduleTime, scheduleDay) => {
  const [hour, minute] = scheduleTime.split(':').map(Number);
  const dow = dayToCronMap[scheduleDay?.toLowerCase()] ?? 1;
  return `${minute} ${hour} * * ${dow}`;
};

/**
 * Stop any existing job and schedule a new one based on the current DB config.
 * Call this on startup AND whenever the schedule is updated via the API.
 */
const rescheduleJob = async () => {
  // Stop previous job if running
  if (activeJob) {
    activeJob.stop();
    activeJob = null;
    console.log('[PortfolioExport] Previous job stopped.');
  }

  try {
    const schedule = await ExportSchedule.findOne({ isActive: true }).lean();

    if (!schedule) {
      console.log('[PortfolioExport] No active schedule found — job not started.');
      return;
    }

    const cronExpr = buildCronExpression(schedule.scheduleTime, schedule.scheduleDay);

    if (!cron.validate(cronExpr)) {
      console.error('[PortfolioExport] Invalid cron expression:', cronExpr);
      return;
    }

    console.log(`[PortfolioExport] Scheduling job: "${cronExpr}" (${schedule.scheduleDay} at ${schedule.scheduleTime} CT)`);

    activeJob = cron.schedule(cronExpr, async () => {
      console.log('[PortfolioExport] Cron fired — fetching latest schedule...');
      try {
        // Re-fetch to get latest config (recipients, format, isActive)
        const latest = await ExportSchedule.findOne({ isActive: true });
        if (!latest) {
          console.log('[PortfolioExport] Schedule deactivated — skipping.');
          return;
        }
        await executeExport(latest);
      } catch (err) {
        console.error('[PortfolioExport] Job execution error:', err);
      }
    }, {
      scheduled: true,
      timezone: 'America/Chicago'
    });

    console.log('[PortfolioExport] Job scheduled successfully.');
  } catch (err) {
    console.error('[PortfolioExport] Failed to schedule job:', err);
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

/** Called once at server startup */
const initializePortfolioExportJob = () => {
  rescheduleJob();
};

/** Called by the export-schedule API route whenever the schedule is saved/updated */
const refreshSchedule = () => {
  rescheduleJob();
};

/** Manual one-off trigger (from UI) */
const triggerManualExport = async () => {
  console.log('[PortfolioExport] Manual export triggered');
  const schedule = await ExportSchedule.findOne({ isActive: true });
  if (!schedule) throw new Error('No active export schedule found');
  return executeExport(schedule);
};

module.exports = {
  initializePortfolioExportJob,
  refreshSchedule,
  triggerManualExport
};
