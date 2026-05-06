/**
 * server/utils/projectMetrics.js
 *
 * Shared server-side metric calculation — mirrors the client-side
 * calculateProjectMetrics in client/src/components/Portfolio/utils.js
 * exactly, including all *Details arrays needed by Portfolio modals.
 *
 * Used by:
 *   - server/routes/metrics.js  (GET /api/portfolio-metrics)
 *   - server/jobs/metricSnapshotJob.js  (weekly snapshot)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// ─── Date helpers ────────────────────────────────────────────────────────────

const convertExcelDateToJS = (excelDate) => {
  if (!excelDate) return null;
  if (typeof excelDate === 'number' && excelDate > 40000 && excelDate < 50000) {
    return new Date(Date.UTC(1899, 11, 30) + excelDate * 86400 * 1000);
  }
  const parsed = new Date(excelDate);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// ─── RAG fallback ─────────────────────────────────────────────────────────────

const calculateRAGStatus = (overdueMilestones, overdueTasks, openCriticalRisks, openCriticalIssues) => {
  if (overdueMilestones > 0 || overdueTasks > 3) return 'Red';
  if (openCriticalRisks > 3 || openCriticalIssues > 2) return 'Amber';
  return 'Green';
};

// ─── Load raw documents from Excel ───────────────────────────────────────────

/**
 * Reads the project's .xlsx file and returns the raw sheet data needed
 * for metric calculation.  Returns empty arrays when the file is absent.
 *
 * @param {string} projectName
 * @returns {{ milestoneTracker, projectPlan, raidLog, ragStatus, projectCharter }}
 */
const loadProjectDocuments = (projectName) => {
  const filePath = path.join(__dirname, '..', '..', 'project-documents', `${projectName}.xlsx`);

  if (!fs.existsSync(filePath)) {
    return { milestoneTracker: [], projectPlan: [], raidLog: [], ragStatus: '', projectCharter: null };
  }

  try {
    const workbook = xlsx.readFile(filePath);

    // Milestone Tracker
    let milestoneTracker = [];
    const msSheet = workbook.Sheets['Milestone Tracker'] || workbook.Sheets['Milestones'];
    if (msSheet) {
      milestoneTracker = xlsx.utils.sheet_to_json(msSheet, { defval: '' })
        .filter(r => r['Milestone Ref'] && String(r['Milestone Ref']).trim() !== '');
    }

    // Project Plan (tasks)
    let projectPlan = [];
    const planSheet = workbook.Sheets['Project Plan'] || workbook.Sheets['Tasks'];
    if (planSheet) {
      projectPlan = xlsx.utils.sheet_to_json(planSheet, { defval: '' })
        .filter(r => r['Task ID'] && String(r['Task ID']).trim() !== '');
    }

    // RAID Log
    let raidLog = [];
    const raidSheet = workbook.Sheets['RAID Log'] || workbook.Sheets['RAID'];
    if (raidSheet) {
      raidLog = xlsx.utils.sheet_to_json(raidSheet, { defval: '' })
        .filter(r => r['RAID ID'] && r.Type && r.Title);
    }

    // RAG Status from Project Cover Sheet cell L3
    let ragStatus = '';
    const coverSheetName = workbook.SheetNames.find(n =>
      n.toLowerCase().includes('cover') ||
      n.toLowerCase().includes('charter') ||
      n.toLowerCase().includes('project')
    );
    if (coverSheetName) {
      const coverSheet = workbook.Sheets[coverSheetName];
      if (coverSheetName.toLowerCase().includes('cover')) {
        const ragCell = coverSheet['L3'];
        ragStatus = ragCell?.v || ragCell?.w || '';
      }
    }

    // Project Charter (basicInfo for getProjectOwner)
    let projectCharter = null;
    if (coverSheetName) {
      const worksheet = workbook.Sheets[coverSheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
      if (data.length > 0) {
        const findByLabel = (label) => {
          const labelLower = label.toLowerCase();
          for (const row of data) {
            const keys = Object.keys(row);
            for (let i = 0; i < keys.length; i++) {
              const val = row[keys[i]];
              if (val && String(val).toLowerCase().includes(labelLower)) {
                for (let j = i + 1; j < keys.length && j <= i + 3; j++) {
                  const nextVal = row[keys[j]];
                  if (nextVal && String(nextVal).trim() !== '' &&
                      !String(nextVal).toLowerCase().includes(labelLower)) {
                    return nextVal;
                  }
                }
              }
            }
          }
          return '';
        };
        const parseDate = (val) => {
          if (typeof val === 'number' && val > 40000) {
            return new Date(Date.UTC(1899, 11, 30) + val * 86400 * 1000).toISOString().split('T')[0];
          }
          return val;
        };
        projectCharter = {
          basicInfo: {
            projectName:       findByLabel('project name') || '',
            projectManager:    findByLabel('project manager') || '',
            projectSponsor:    findByLabel('project sponsor') || findByLabel('sponsor') || '',
            client:            findByLabel('client') || '',
            projectStartDate:  parseDate(findByLabel('start date') || findByLabel('start')),
            forecastEndDate:   parseDate(findByLabel('forecast end') || findByLabel('end') || findByLabel('forecast')),
            estimatedDuration: findByLabel('duration') || findByLabel('days'),
            estimatedBudget:   findByLabel('budget') || '',
            projectComplexity: findByLabel('complexity') || findByLabel('complex')
          }
        };
      }
    }

    return { milestoneTracker, projectPlan, raidLog, ragStatus, projectCharter };
  } catch (err) {
    console.error(`[projectMetrics] Error loading documents for "${projectName}":`, err.message);
    return { milestoneTracker: [], projectPlan: [], raidLog: [], ragStatus: '', projectCharter: null };
  }
};

// ─── Core metric calculation ──────────────────────────────────────────────────

/**
 * Calculates all portfolio metrics from parsed document data.
 * Returns the same 25-field object as the client-side calculateProjectMetrics
 * in client/src/components/Portfolio/utils.js — including all *Details arrays.
 *
 * @param {{ milestoneTracker, projectPlan, raidLog, ragStatus, projectCharter }} documents
 * @returns {object}
 */
const calculateProjectMetrics = (documents) => {
  const milestones = documents.milestoneTracker || [];
  const tasks      = documents.projectPlan      || [];
  const raidLog    = documents.raidLog          || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  // ── Milestones ──────────────────────────────────────────────────────────────
  const overdueMilestoneDetails  = [];
  const upcomingMilestoneDetails = [];
  const allMilestoneDetails      = [];

  // Planned vs Actual: milestones whose planned end date is on or before today
  const milestonesDueByToday = milestones.filter(m => {
    if (!m['Planned End Date']) return false;
    const d = convertExcelDateToJS(m['Planned End Date']);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d <= today;
  });
  const totalMilestonesDue    = milestonesDueByToday.length;
  const completedMilestonesDue = milestonesDueByToday.filter(m =>
    m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete')
  ).length;
  const plannedProgress        = totalMilestonesDue > 0 ? 100 : 0;
  const actualProgress         = totalMilestonesDue > 0
    ? Math.round((completedMilestonesDue / totalMilestonesDue) * 100) : 0;
  const plannedVsActualProgress = actualProgress - plannedProgress;

  milestones.forEach(m => {
    if (!m['Planned End Date']) return;
    const endDate = convertExcelDateToJS(m['Planned End Date']);
    if (!endDate) return;
    endDate.setHours(0, 0, 0, 0);
    const isCompleted = m.Status &&
      (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
    allMilestoneDetails.push(m);
    if (!isCompleted && endDate < today) {
      overdueMilestoneDetails.push(m);
    } else if (!isCompleted && endDate >= today && endDate <= fourteenDaysFromNow) {
      upcomingMilestoneDetails.push(m);
    }
  });

  // ── Tasks ───────────────────────────────────────────────────────────────────
  const overdueTasks = tasks.filter(t => {
    if (!t['Planned End Date'] || (t.Status || '').toLowerCase() === 'completed') return false;
    const d = new Date(t['Planned End Date']);
    return d < today;
  }).length;

  const totalTasks     = tasks.length;
  const completedTasks = tasks.filter(t =>
    t.Status && (t.Status.toLowerCase() === 'completed' || t.Status.toLowerCase() === 'complete')
  ).length;
  const projectCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ── RAID ────────────────────────────────────────────────────────────────────
  const openCriticalRisksDetails = raidLog.filter(r => {
    const isRisk           = r.Type && r.Type.toLowerCase() === 'risk';
    const isOpen           = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    const isHighOrCritical = r.Severity && (r.Severity.toLowerCase() === 'high' || r.Severity.toLowerCase() === 'critical');
    return isRisk && isOpen && isHighOrCritical;
  });

  const openCriticalIssuesDetails = raidLog.filter(r => {
    const isIssue = r.Type && r.Type.toLowerCase() === 'issue';
    const isOpen  = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    return isIssue && isOpen;
  });

  const openEscalationsDetails = raidLog.filter(r => {
    const mitigation = r['Mitigation Strategy'] || r.MitigationStrategy || '';
    const isEscalate = mitigation.toLowerCase() === 'escalate';
    const closedDate = r['Closed Date'] || r.ClosedDate || r['Closed'] || r.closedDate;
    const isNotClosed = !closedDate ||
      String(closedDate).trim() === '' ||
      String(closedDate).toLowerCase() === 'n/a';
    return isEscalate && isNotClosed;
  });

  const openDependenciesDetails = raidLog.filter(r => {
    const isDependency = r.Type && r.Type.toLowerCase() === 'dependency';
    const isOpen       = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    return isDependency && isOpen;
  });

  // ── RAG Status ──────────────────────────────────────────────────────────────
  const excelRagStatus = documents.ragStatus || '';
  const validRagValues = ['red', 'amber', 'green'];
  const ragStatus = excelRagStatus && validRagValues.includes(excelRagStatus.toLowerCase())
    ? excelRagStatus.charAt(0).toUpperCase() + excelRagStatus.slice(1).toLowerCase()
    : calculateRAGStatus(
        overdueMilestoneDetails.length,
        overdueTasks,
        openCriticalRisksDetails.length,
        openCriticalIssuesDetails.length
      );

  return {
    ragStatus,
    plannedVsActualProgress,
    plannedProgress,
    actualProgress,
    totalMilestonesDue,
    completedMilestonesDue,
    overdueMilestones:        overdueMilestoneDetails.length,
    overdueMilestoneDetails,
    upcomingMilestones:       upcomingMilestoneDetails.length,
    upcomingMilestoneDetails,
    allMilestoneDetails,
    overdueTasks,
    openCriticalRisks:        openCriticalRisksDetails.length,
    openCriticalRisksDetails,
    openCriticalIssues:       openCriticalIssuesDetails.length,
    openCriticalIssuesDetails,
    openEscalations:          openEscalationsDetails.length,
    openEscalationsDetails,
    openDependencies:         openDependenciesDetails.length,
    openDependenciesDetails,
    projectCharter:           documents.projectCharter || null,
    projectCompletion,
    totalTasks,
    completedTasks,
    projectPlan:              tasks,
  };
};

module.exports = { loadProjectDocuments, calculateProjectMetrics };
