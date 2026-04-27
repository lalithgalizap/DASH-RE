const cron = require('node-cron');
const { MetricSnapshot } = require('../models');
const dbAdapter = require('../dbAdapter');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Helper to convert Excel serial dates to JS dates
const convertExcelDateToJS = (excelDate) => {
  if (!excelDate) return null;
  if (typeof excelDate === 'number' && excelDate > 40000 && excelDate < 50000) {
    return new Date(Date.UTC(1899, 11, 30) + excelDate * 86400 * 1000);
  }
  const parsed = new Date(excelDate);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Calculate metrics for a single project from its Excel documents
const calculateProjectMetrics = (documents) => {
  const milestones = documents.milestoneTracker || [];
  const tasks = documents.projectPlan || [];
  const raidLog = documents.raidLog || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  let overdueMilestones = 0;
  let upcomingMilestones = 0;
  let openCriticalRisks = 0;
  let openCriticalIssues = 0;
  let openEscalations = 0;
  let openDependencies = 0;

  // Count overdue and upcoming milestones
  milestones.forEach(m => {
    if (!m['Planned End Date']) return;
    const endDate = convertExcelDateToJS(m['Planned End Date']);
    if (!endDate) return;
    endDate.setHours(0, 0, 0, 0);

    const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');

    if (!isCompleted && endDate < today) {
      overdueMilestones++;
    } else if (!isCompleted && endDate >= today && endDate <= fourteenDaysFromNow) {
      upcomingMilestones++;
    }
  });

  // Count open critical risks (High or Critical severity)
  openCriticalRisks = raidLog.filter(r => {
    const isRisk = r.Type && r.Type.toLowerCase() === 'risk';
    const isOpen = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    const isHighOrCritical = r.Severity && (r.Severity.toLowerCase() === 'high' || r.Severity.toLowerCase() === 'critical');
    return isRisk && isOpen && isHighOrCritical;
  }).length;

  // Count open critical issues
  openCriticalIssues = raidLog.filter(r => {
    const isIssue = r.Type && r.Type.toLowerCase() === 'issue';
    const isOpen = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    return isIssue && isOpen;
  }).length;

  // Count open escalations (Mitigation Strategy = "Escalate" and not closed)
  openEscalations = raidLog.filter(r => {
    const mitigation = r['Mitigation Strategy'] || r.MitigationStrategy || '';
    const isEscalate = mitigation.toLowerCase() === 'escalate';
    const closedDate = r['Closed Date'] || r.ClosedDate || r['Closed'] || r.closedDate;
    const isNotClosed = !closedDate || String(closedDate).trim() === '' || String(closedDate).toLowerCase() === 'n/a';
    return isEscalate && isNotClosed;
  }).length;

  // Count open dependencies
  openDependencies = raidLog.filter(r => {
    const isDependency = r.Type && r.Type.toLowerCase() === 'dependency';
    const isOpen = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    return isDependency && isOpen;
  }).length;

  return {
    overdueMilestones,
    upcomingMilestones,
    openCriticalRisks,
    openCriticalIssues,
    openEscalations,
    openDependencies
  };
};

// Load project documents from Excel files
const loadProjectDocuments = async (projectName) => {
  const documentsDir = path.join(__dirname, '..', '..', 'project-documents');
  const filePath = path.join(documentsDir, `${projectName}.xlsx`);

  if (!fs.existsSync(filePath)) {
    return { milestoneTracker: [], projectPlan: [], raidLog: [] };
  }

  try {
    const workbook = xlsx.readFile(filePath);

    // Load Milestone Tracker
    let milestoneTracker = [];
    const milestoneSheet = workbook.Sheets['Milestone Tracker'] || workbook.Sheets['Milestones'];
    if (milestoneSheet) {
      milestoneTracker = xlsx.utils.sheet_to_json(milestoneSheet);
    }

    // Load Project Plan
    let projectPlan = [];
    const planSheet = workbook.Sheets['Project Plan'] || workbook.Sheets['Tasks'];
    if (planSheet) {
      projectPlan = xlsx.utils.sheet_to_json(planSheet);
    }

    // Load RAID Log
    let raidLog = [];
    const raidSheet = workbook.Sheets['RAID Log'] || workbook.Sheets['RAID'];
    if (raidSheet) {
      raidLog = xlsx.utils.sheet_to_json(raidSheet);
    }

    return { milestoneTracker, projectPlan, raidLog };
  } catch (err) {
    console.error(`Error loading documents for ${projectName}:`, err);
    return { milestoneTracker: [], projectPlan: [], raidLog: [] };
  }
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
      const documents = await loadProjectDocuments(project.name);
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
