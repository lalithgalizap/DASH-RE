const cron = require('node-cron');
const { MetricSnapshot, AppSettings } = require('../models');
const dbAdapter = require('../dbAdapter');

// Use the shared utility — same logic as the portfolio-metrics endpoint
const { loadProjectDocuments, calculateProjectMetrics: calcMetrics } = require('../utils/projectMetrics');

// Thin wrapper: snapshot job only needs the 6 count fields
const calculateProjectMetrics = (documents) => {
  const full = calcMetrics(documents);
  return {
    overdueMilestones:  full.overdueMilestones,
    upcomingMilestones: full.upcomingMilestones,
    openCriticalRisks:  full.openCriticalRisks,
    openCriticalIssues: full.openCriticalIssues,
    openEscalations:    full.openEscalations,
    openDependencies:   full.openDependencies,
  };
};

// Helper to extract client from project (handles multiple client formats)
const normalizeClient = (project) => {
  if (project.client && project.client.trim()) return project.client.trim();
  if (project.clientName && project.clientName.trim()) return project.clientName.trim();
  if (project.clients && project.clients.trim()) {
    return project.clients
      .split(',')
      .map(c => c.trim())
      .filter(Boolean)
      .join(', ');
  }
  return '';
};

// Calculate aggregate metrics across all projects with per-project breakdown
const calculateAggregateMetrics = async () => {
  try {
    const projects = await dbAdapter.getAllProjects({});

    const activeProjects = projects.filter(p => {
      const status = (p.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    });

    console.log(`[MetricSnapshot] Processing ${activeProjects.length} active projects out of ${projects.length} total`);

    let totals = {
      overdueMilestonesTotal: 0,
      upcomingMilestonesTotal: 0,
      openCriticalRisksTotal: 0,
      openCriticalIssuesTotal: 0,
      openEscalationsTotal: 0,
      openDependenciesTotal: 0
    };

    const projectMetrics = [];

    for (const project of activeProjects) {
      const documents = loadProjectDocuments(project.name);
      const metrics = calculateProjectMetrics(documents);

      const hasMetrics = Object.values(metrics).some(v => v > 0);

      if (hasMetrics) {
        const clientValue = normalizeClient(project);
        projectMetrics.push({
          projectId: project._id || project.id,
          projectName: project.name,
          client: clientValue,
          overdueMilestones: metrics.overdueMilestones,
          upcomingMilestones: metrics.upcomingMilestones,
          openCriticalRisks: metrics.openCriticalRisks,
          openCriticalIssues: metrics.openCriticalIssues,
          openEscalations: metrics.openEscalations,
          openDependencies: metrics.openDependencies
        });
      }

      totals.overdueMilestonesTotal += metrics.overdueMilestones;
      totals.upcomingMilestonesTotal += metrics.upcomingMilestones;
      totals.openCriticalRisksTotal += metrics.openCriticalRisks;
      totals.openCriticalIssuesTotal += metrics.openCriticalIssues;
      totals.openEscalationsTotal += metrics.openEscalations;
      totals.openDependenciesTotal += metrics.openDependencies;
    }

    projectMetrics.sort((a, b) => a.projectName.localeCompare(b.projectName));

    return {
      metrics: totals,
      projectCount: projects.length,
      activeProjectCount: activeProjects.length,
      projectMetrics
    };
  } catch (err) {
    console.error('[MetricSnapshot] Error calculating aggregate metrics:', err);
    throw err;
  }
};

// Create snapshot for current week
const createWeeklySnapshot = async () => {
  try {
    console.log('[MetricSnapshot] Starting weekly snapshot creation...');

    const now = new Date();
    const cstOffset = -6;
    const cstDate = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));

    const dayOfWeek = cstDate.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const weekEnding = new Date(cstDate);
    weekEnding.setDate(cstDate.getDate() + daysUntilFriday);
    weekEnding.setHours(0, 0, 0, 0);

    const year = weekEnding.getFullYear();
    const weekNumber = getISOWeek(weekEnding);

    console.log(`[MetricSnapshot] Creating snapshot for week ending ${weekEnding.toISOString().split('T')[0]} (Week ${weekNumber}, ${year})`);

    const existingSnapshot = await MetricSnapshot.findOne({ weekEnding });
    if (existingSnapshot) {
      console.log('[MetricSnapshot] Snapshot already exists for this week, skipping...');
      return existingSnapshot;
    }

    const { metrics, projectCount, activeProjectCount, projectMetrics } = await calculateAggregateMetrics();

    const snapshot = new MetricSnapshot({
      weekEnding,
      year,
      weekNumber,
      metrics,
      projectCount,
      activeProjectCount,
      projectMetrics
    });

    await snapshot.save();
    console.log('[MetricSnapshot] Snapshot created successfully:', {
      weekEnding: weekEnding.toISOString().split('T')[0],
      ...metrics,
      projectCount,
      activeProjectCount
    });

    return snapshot;
  } catch (err) {
    console.error('[MetricSnapshot] Error creating weekly snapshot:', err);
    throw err;
  }
};

// Helper to get ISO week number
const getISOWeek = (date) => {
  const tmpDate = new Date(date);
  tmpDate.setHours(0, 0, 0, 0);
  tmpDate.setDate(tmpDate.getDate() + 4 - (tmpDate.getDay() || 7));
  const yearStart = new Date(tmpDate.getFullYear(), 0, 1);
  return Math.ceil((((tmpDate - yearStart) / 86400000) + 1) / 7);
};

// ── Live-reschedulable job holder ─────────────────────────────────────────────
let _currentJob = null;
let _currentCron = null;

// Get the current schedule from DB (falls back to default if not set)
const getScheduleFromDB = async () => {
  try {
    const settings = await AppSettings.findOne({ key: 'global' }).lean();
    if (settings?.snapshotSchedule?.cronExpression) {
      return {
        cronExpression: settings.snapshotSchedule.cronExpression,
        label: settings.snapshotSchedule.label || settings.snapshotSchedule.cronExpression,
        enabled: settings.snapshotSchedule.enabled !== false,
      };
    }
  } catch (err) {
    console.warn('[MetricSnapshot] Could not read schedule from DB, using default:', err.message);
  }
  return {
    cronExpression: '0 0 * * 6',
    label: 'Every Friday at 6:00 PM CST',
    enabled: true,
  };
};

// Start (or restart) the cron job with a given expression
const startJob = (cronExpression) => {
  if (_currentJob) {
    _currentJob.stop();
    _currentJob = null;
  }

  if (!cron.validate(cronExpression)) {
    console.error(`[MetricSnapshot] Invalid cron expression: "${cronExpression}" — job not started`);
    return;
  }

  _currentCron = cronExpression;
  _currentJob = cron.schedule(cronExpression, async () => {
    console.log('[MetricSnapshot] Scheduled job triggered at:', new Date().toISOString());
    try {
      await createWeeklySnapshot();
    } catch (err) {
      console.error('[MetricSnapshot] Scheduled job failed:', err);
    }
  }, {
    scheduled: true,
    timezone: 'America/Chicago'
  });

  console.log(`[MetricSnapshot] Job scheduled with cron: "${cronExpression}"`);
};

// Initialize the scheduled job — reads schedule from DB on startup
const initializeMetricSnapshotJob = async () => {
  console.log('[MetricSnapshot] Initializing scheduled job...');
  const { cronExpression, label, enabled } = await getScheduleFromDB();

  if (!enabled) {
    console.log('[MetricSnapshot] Job is disabled in settings — not starting');
    return null;
  }

  startJob(cronExpression);
  console.log(`[MetricSnapshot] Job ready — ${label}`);
  return _currentJob;
};

// Reschedule the job live (called after saving new schedule via API)
const rescheduleJob = async (cronExpression) => {
  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression: "${cronExpression}"`);
  }
  startJob(cronExpression);
  console.log(`[MetricSnapshot] Job rescheduled to: "${cronExpression}"`);
};

// Stop the job (when disabled)
const stopJob = () => {
  if (_currentJob) {
    _currentJob.stop();
    _currentJob = null;
    _currentCron = null;
    console.log('[MetricSnapshot] Job stopped');
  }
};

// Get current job status
const getJobStatus = () => ({
  running: !!_currentJob,
  cronExpression: _currentCron,
});

// Manual trigger function (for testing or admin use)
const triggerManualSnapshot = async () => {
  console.log('[MetricSnapshot] Manual snapshot triggered');
  return await createWeeklySnapshot();
};

module.exports = {
  initializeMetricSnapshotJob,
  triggerManualSnapshot,
  createWeeklySnapshot,
  rescheduleJob,
  stopJob,
  getJobStatus,
};
