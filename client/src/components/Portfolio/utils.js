// Portfolio utility functions

// Helper to convert Excel serial dates to JS dates
export const convertExcelDateToJS = (excelDate) => {
  if (!excelDate) return null;
  if (typeof excelDate === 'number' && excelDate > 40000 && excelDate < 50000) {
    return new Date(Date.UTC(1899, 11, 30) + excelDate * 86400 * 1000);
  }
  const parsed = new Date(excelDate);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Helper to format dates same as ProjectDashboard
export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return 'N/A';
  
  // Handle Excel serial date numbers
  if (typeof dateStr === 'number' && dateStr > 40000 && dateStr < 50000) {
    const utcDate = new Date(Date.UTC(1899, 11, 30) + dateStr * 86400 * 1000);
    const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utcDate.getUTCDate()).padStart(2, '0');
    const year = utcDate.getUTCFullYear();
    return `${month}/${day}/${year}`;
  }
  
  // Handle ISO date strings
  const date = new Date(dateStr);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'No update yet';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'No update yet';
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

export const formatMilestoneDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = convertExcelDateToJS(dateValue);
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getRAGColor = (ragStatus) => {
  switch (ragStatus?.toLowerCase()) {
    case 'green':
      return '#10b981';
    case 'amber':
      return '#f59e0b';
    case 'red':
      return '#ef4444';
    default:
      return '#10b981';
  }
};

export const getMilestoneColor = (status) => {
  switch (status) {
    case 'completed':
      return '#10b981';
    case 'overdue':
      return '#ef4444';
    case 'upcoming':
      return '#f59e0b';
    default:
      return '#9ca3af';
  }
};

export const getMilestoneStatus = (milestone) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = convertExcelDateToJS(milestone['Planned End Date']);
  if (!endDate) return 'unknown';
  endDate.setHours(0, 0, 0, 0);
  const isCompleted = milestone.Status && (milestone.Status.toLowerCase() === 'completed' || milestone.Status.toLowerCase() === 'complete');
  if (isCompleted) return 'completed';
  if (endDate < today) return 'overdue';
  const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (endDate <= fourteenDaysFromNow) return 'upcoming';
  return 'normal';
};

export const getProjectOwner = (project) => {
  const owner = project.project_owner || project.owner || project.projectOwner || project.Owner;
  if (owner) return owner;
  
  const charter = project.projectCharter || project.documents?.projectCharter;
  if (!charter) return 'Unassigned';
  
  if (charter.basicInfo?.projectManager) return charter.basicInfo.projectManager;
  if (charter.basicInfo?.['Project Manager']) return charter.basicInfo['Project Manager'];
  if (charter.projectManager) return charter.projectManager;
  if (charter['Project Manager']) return charter['Project Manager'];
  
  if (charter.rawData) {
    const row7 = charter.rawData[7];
    if (row7 && row7[2]) return row7[2];
  }
  
  return 'Unassigned';
};

export const isActiveStatus = (status) => {
  const normalized = (status || '').toLowerCase();
  return normalized !== 'completed' && normalized !== 'cancelled';
};

// Calculate RAG status for a project
export const calculateRAGStatus = (overdueMilestones, overdueTasks, openCriticalRisks, openCriticalIssues) => {
  if (overdueMilestones > 0 || overdueTasks > 3) {
    return 'Red';
  } else if (openCriticalRisks > 3 || openCriticalIssues > 2) {
    return 'Amber';
  }
  return 'Green';
};

// Calculate project metrics from documents
export const calculateProjectMetrics = (documents) => {
  const milestones = documents.milestoneTracker || [];
  const tasks = documents.projectPlan || [];
  const raidLog = documents.raidLog || [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const overdueMilestoneDetails = [];
  const upcomingMilestoneDetails = [];
  const allMilestoneDetails = [];

  milestones.forEach(m => {
    if (!m['Planned End Date']) return;
    const endDate = convertExcelDateToJS(m['Planned End Date']);
    if (!endDate) return;
    endDate.setHours(0, 0, 0, 0);

    const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
    allMilestoneDetails.push(m);

    if (!isCompleted && endDate < today) {
      overdueMilestoneDetails.push(m);
    } else if (!isCompleted && endDate >= today && endDate <= fourteenDaysFromNow) {
      upcomingMilestoneDetails.push(m);
    }
  });
  
  // Overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (!t['Planned End Date'] || t.Status?.toLowerCase() === 'completed') return false;
    const endDate = new Date(t['Planned End Date']);
    return endDate < today;
  }).length;
  
  // Open critical risks
  const openCriticalRisksDetails = raidLog.filter(r => {
    const isRisk = r.Type && r.Type.toLowerCase() === 'risk';
    const isOpen = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    const isHighOrCritical = r.Severity && (r.Severity.toLowerCase() === 'high' || r.Severity.toLowerCase() === 'critical');
    return isRisk && isOpen && isHighOrCritical;
  });
  
  // Open critical issues
  const openCriticalIssuesDetails = raidLog.filter(r => {
    const isIssue = r.Type && r.Type.toLowerCase() === 'issue';
    const isOpen = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    return isIssue && isOpen;
  });
  
  const ragStatus = calculateRAGStatus(
    overdueMilestoneDetails.length,
    overdueTasks,
    openCriticalRisksDetails.length,
    openCriticalIssuesDetails.length
  );
  
  return {
    ragStatus,
    overdueMilestones: overdueMilestoneDetails.length,
    overdueMilestoneDetails,
    upcomingMilestones: upcomingMilestoneDetails.length,
    upcomingMilestoneDetails,
    allMilestoneDetails,
    overdueTasks,
    openCriticalRisks: openCriticalRisksDetails.length,
    openCriticalRisksDetails,
    openCriticalIssues: openCriticalIssuesDetails.length,
    openCriticalIssuesDetails,
    projectCharter: documents.projectCharter
  };
};
