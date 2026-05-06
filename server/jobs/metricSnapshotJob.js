const cron = require('node-cron');
const { MetricSnapshot } = require('../models');
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
    // Get all projects
    const projects = await dbAdapter.getAllProjects({});

    // Filter active projects (not completed or cancelled)
    const activeProjects = projects.filter(p => {
      const status = (p.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    });

    console.log(`[MetricSnapshot] Processing ${activeProjects.length} active projects out of ${projects.length} total`);

    // Calculate totals and per-project breakdown
    let totals = {
      overdueMilestonesTotal: 0,
      upcomingMilestonesTotal: 0,
      openCriticalRisksTotal: 0,
      openCriticalIssuesTotal: 0,
      openEscalationsTotal: 0,
      openDependenciesTotal: 0
    };

    const projectMetrics = [];

    // Process each active project
    for (const project of activeProjects) {
      const documents = loadProjectDocuments(project.name);
      const metrics = calculateProjectMetrics(documents);

      // Only include projects that have metrics > 0 for at least one category
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

    // Sort by project name
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

    // Get current date in CST
    const now = new Date();
    const cstOffset = -6; // CST is UTC-6 (ignoring DST for simplicity)
    const cstDate = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));

    // Get week ending date (Friday of current week)
    const dayOfWeek = cstDate.getDay(); // 0 = Sunday, 5 = Friday
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // Days until next Friday (or 7 if today is Friday)
    const weekEnding = new Date(cstDate);
    weekEnding.setDate(cstDate.getDate() + daysUntilFriday);
    weekEnding.setHours(0, 0, 0, 0);

    // Calculate ISO week number
    const year = weekEnding.getFullYear();
    const weekNumber = getISOWeek(weekEnding);

    console.log(`[MetricSnapshot] Creating snapshot for week ending ${weekEnding.toISOString().split('T')[0]} (Week ${weekNumber}, ${year})`);

    // Check if snapshot already exists for this week
    const existingSnapshot = await MetricSnapshot.findOne({ weekEnding });
    if (existingSnapshot) {
      console.log('[MetricSnapshot] Snapshot already exists for this week, skipping...');
      return existingSnapshot;
    }

    // Calculate metrics
    const { metrics, projectCount, activeProjectCount, projectMetrics } = await calculateAggregateMetrics();

    // Create new snapshot
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

// Initialize the scheduled job
const initializeMetricSnapshotJob = () => {
  // Schedule: Every Friday at 6:00 PM CST
  // CST is UTC-6, so 6 PM CST = 00:00 UTC Saturday
  // Cron format: minute hour day month day-of-week
  // Run at 00:00 UTC on Saturday (Friday 6 PM CST)

  console.log('[MetricSnapshot] Initializing scheduled job...');

  // For testing, you can use '*/5 * * * *' to run every 5 minutes
  // Production: '0 0 * * 6' = Saturday at 00:00 UTC (Friday 6 PM CST)
  const schedule = process.env.NODE_ENV === 'production' ? '0 0 * * 6' : '0 0 * * 6';

  const job = cron.schedule(schedule, async () => {
    console.log('[MetricSnapshot] Scheduled job triggered at:', new Date().toISOString());
    try {
      await createWeeklySnapshot();
    } catch (err) {
      console.error('[MetricSnapshot] Scheduled job failed:', err);
    }
  }, {
    scheduled: true,
    timezone: 'America/Chicago' // CST timezone
  });

  console.log('[MetricSnapshot] Job scheduled for Fridays at 6:00 PM CST');

  return job;
};

// Manual trigger function (for testing or admin use)
const triggerManualSnapshot = async () => {
  console.log('[MetricSnapshot] Manual snapshot triggered');
  return await createWeeklySnapshot();
};

module.exports = {
  initializeMetricSnapshotJob,
  triggerManualSnapshot,
  createWeeklySnapshot
};
