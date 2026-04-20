import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import '../ProjectDashboard.css';
import PlannedVsActualModal from './modals/PlannedVsActualModal';
import MilestoneCompletionModal from './modals/MilestoneCompletionModal';
import UpcomingMilestonesModal from './modals/UpcomingMilestonesModal';
import OverdueMilestonesModal from './modals/OverdueMilestonesModal';
import OverdueTasksModal from './modals/OverdueTasksModal';
import OpenRisksModal from './modals/OpenRisksModal';
import OpenIssuesModal from './modals/OpenIssuesModal';
import AgedRaidModal from './modals/AgedRaidModal';

function ProjectDashboard({ projectId, projectName, project }) {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showPlannedVsActualModal, setShowPlannedVsActualModal] = useState(false);
  const [showMilestoneCompletionModal, setShowMilestoneCompletionModal] = useState(false);
  const [showUpcomingMilestonesModal, setShowUpcomingMilestonesModal] = useState(false);
  const [showOverdueMilestonesModal, setShowOverdueMilestonesModal] = useState(false);
  const [showOverdueTasksModal, setShowOverdueTasksModal] = useState(false);
  const [showOpenRisksModal, setShowOpenRisksModal] = useState(false);
  const [showOpenIssuesModal, setShowOpenIssuesModal] = useState(false);
  const [showAgedRaidModal, setShowAgedRaidModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [projectId, projectName]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/projects/${projectId}/documents?projectName=${encodeURIComponent(projectName)}&t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      setDocuments(response.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !documents) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  const convertExcelDateToJS = (excelDate) => {
    if (!excelDate) return null;
    if (typeof excelDate === 'number' && excelDate > 40000 && excelDate < 50000) {
      return new Date(Date.UTC(1899, 11, 30) + excelDate * 86400 * 1000);
    }
    return new Date(excelDate);
  };

  const analyzeTaskPerformance = () => {
    const tasks = documents?.projectPlan || [];
    
    const completed = tasks.filter(t => {
      const status = t.Status?.toLowerCase();
      return status === 'completed' || status === 'complete';
    });
    const inProgress = tasks.filter(t => {
      const status = t.Status?.toLowerCase();
      return status === 'in progress' || status === 'inprogress' || status === 'started';
    });
    const notStarted = tasks.filter(t => {
      const status = t.Status?.toLowerCase();
      return !status || status === 'not started' || status === 'notstarted' || status === 'planned';
    });
    
    const tasksWithActualDates = tasks.filter(t => t['Actual End Date']);
    
    const onSchedule = tasksWithActualDates.filter(t => {
      const plannedStart = t['Planned Start Date'];
      const actualStart = t['Actual Start Date'];
      const plannedEnd = t['Planned End Date'];
      const actualEnd = t['Actual End Date'];
      
      if (!plannedStart || !actualStart || !plannedEnd || !actualEnd) return false;
      
      const plannedStartDate = convertExcelDateToJS(plannedStart);
      const actualStartDate = convertExcelDateToJS(actualStart);
      const plannedEndDate = convertExcelDateToJS(plannedEnd);
      const actualEndDate = convertExcelDateToJS(actualEnd);
      
      const startOnTime = actualStartDate <= plannedStartDate;
      const endOnTime = actualEndDate <= plannedEndDate;
      
      return startOnTime && endOnTime;
    });
    
    const delayedStart = tasksWithActualDates.filter(t => {
      const plannedStart = t['Planned Start Date'];
      const actualStart = t['Actual Start Date'];
      
      if (!plannedStart || !actualStart) return false;
      
      const plannedStartDate = convertExcelDateToJS(plannedStart);
      const actualStartDate = convertExcelDateToJS(actualStart);
      
      return actualStartDate > plannedStartDate;
    });
    
    const lateFinish = tasksWithActualDates.filter(t => {
      const plannedEnd = t['Planned End Date'];
      const actualEnd = t['Actual End Date'];
      
      if (!plannedEnd || !actualEnd) return false;
      
      const plannedEndDate = convertExcelDateToJS(plannedEnd);
      const actualEndDate = convertExcelDateToJS(actualEnd);
      
      return actualEndDate > plannedEndDate;
    });
    
    return {
      onSchedule,
      delayedStart,
      lateFinish,
      total: tasks,
      completed,
      inProgress,
      notStarted,
      hasActualDates: tasksWithActualDates.length > 0
    };
  };

  const calculateMetrics = () => {
    const milestones = documents.milestoneTracker || [];
    const tasks = documents.projectPlan || [];
    const raidLog = documents.raidLog || [];
    const governanceCadences = documents.governanceCadences || [];

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => 
      m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete')
    ).length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => 
      t.Status && (t.Status.toLowerCase() === 'completed' || t.Status.toLowerCase() === 'complete')
    ).length;

    const projectCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const upcomingMilestones = milestones.filter(m => {
      if (!m['Planned End Date']) return false;
      const endDate = convertExcelDateToJS(m['Planned End Date']);
      if (!endDate) return false;
      endDate.setHours(0, 0, 0, 0);
      const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
      return endDate >= today && endDate <= fourteenDaysFromNow && !isCompleted;
    }).length;

    const overdueMilestones = milestones.filter(m => {
      if (!m['Planned End Date']) return false;
      const endDate = convertExcelDateToJS(m['Planned End Date']);
      if (!endDate) return false;
      endDate.setHours(0, 0, 0, 0);
      const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
      return endDate < today && !isCompleted;
    }).length;

    const overdueTasks = tasks.filter(t => {
      if (!t['Planned End Date']) return false;
      const endDate = convertExcelDateToJS(t['Planned End Date']);
      if (!endDate) return false;
      endDate.setHours(0, 0, 0, 0);
      const isCompleted = t.Status && (t.Status.toLowerCase() === 'completed' || t.Status.toLowerCase() === 'complete');
      return endDate < today && !isCompleted;
    }).length;

    const allRisks = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'risk' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
    ).length;

    const openRisks = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'risk' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved' &&
      r.Severity && (r.Severity.toLowerCase() === 'high' || r.Severity.toLowerCase() === 'critical')
    ).length;

    const openIssues = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'issue' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
    ).length;

    const openDependencies = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'dependency' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
    ).length;

    const openAssumptions = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'assumption' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
    ).length;

    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const agedRaid = raidLog.filter(r => {
      if (!r['Date Raised']) return false;
      const raisedDate = convertExcelDateToJS(r['Date Raised']);
      if (!raisedDate) return false;
      return raisedDate < thirtyDaysAgo && 
             r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    }).length;

    const totalGovernanceMeetings = governanceCadences.length;
    const onTimeGovernance = governanceCadences.filter(g => 
      g.Status && (g.Status.toLowerCase() === 'completed' || g.Status.toLowerCase() === 'on time')
    ).length;
    const governanceCompliance = totalGovernanceMeetings > 0 
      ? Math.round((onTimeGovernance / totalGovernanceMeetings) * 100) 
      : 0;

    return {
      projectCompletion,
      plannedVsActual: { planned: totalTasks, actual: completedTasks },
      milestoneCompletion: { completed: completedMilestones, total: totalMilestones },
      upcomingMilestones,
      overdueMilestones,
      overdueTasks,
      allRisks,
      openRisks,
      openIssues,
      openDependencies,
      openAssumptions,
      agedRaid,
      governanceCompliance,
      governanceOnTime: onTimeGovernance,
      governanceTotal: totalGovernanceMeetings
    };
  };

  const metrics = calculateMetrics();

  const getOverallStatus = () => {
    // Use Excel ragStatus from Project Cover Sheet if available
    const excelRagStatus = documents?.ragStatus;
    const validRagValues = ['red', 'amber', 'green'];
    
    if (excelRagStatus && validRagValues.includes(excelRagStatus.toLowerCase())) {
      const ragLower = excelRagStatus.toLowerCase();
      const colors = { red: '#dc2626', amber: '#f59e0b', green: '#10b981' };
      const labels = { red: 'RED', amber: 'AMBER', green: 'GREEN' };
      return { label: labels[ragLower], color: colors[ragLower] };
    }
    
    // Fallback to calculated RAG
    if (metrics.overdueMilestones > 0 || metrics.overdueTasks > 3) return { label: 'RED', color: '#dc2626' };
    if (metrics.openRisks > 3 || metrics.openIssues > 2) return { label: 'AMBER', color: '#f59e0b' };
    return { label: 'GREEN', color: '#10b981' };
  };

  const overallStatus = getOverallStatus();

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    
    if (typeof dateStr === 'number' && dateStr > 40000 && dateStr < 50000) {
      const utcDate = new Date(Date.UTC(1899, 11, 30) + dateStr * 86400 * 1000);
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      return `${month}/${day}/${year}`;
    }
    
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
  };

  const getTrendIcon = (value, threshold = 0) => {
    if (value > threshold) return <TrendingUp size={14} color="#dc2626" />;
    if (value < threshold) return <TrendingDown size={14} color="#10b981" />;
    return null;
  };

  return (
    <div className="project-dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
        {/* Left: Project Name and Meta */}
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: '700', color: '#111827', letterSpacing: '-0.02em' }}>
            {projectName}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', color: '#6b7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 500 }}>Owner:</span>
              <strong style={{ color: '#111827', fontWeight: 600 }}>
                {project?.owner || documents?.projectCharter?.basicInfo?.projectManager || 'Not Assigned'}
              </strong>
            </span>
            <span style={{ color: '#d1d5db' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 500 }}>Last Updated:</span>
              <strong style={{ color: '#111827', fontWeight: 600 }}>{formatDate(lastRefresh)}</strong>
            </span>
          </div>
        </div>

        {/* Right: Overall Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '6px 12px',
          backgroundColor: '#f9fafb'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Project Status</span>
          <span style={{ 
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            backgroundColor: overallStatus.color
          }} title={`Overall Status: ${overallStatus.label}`}></span>
        </div>
      </div>

      <div className="dashboard-metrics-row">
        <div className="metric-card primary">
          <div className="metric-label">Project % Complete</div>
          <div className="metric-value-large">
            {metrics.projectCompletion}%
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => setShowPlannedVsActualModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Tasks Completed</div>
          <div className="metric-value">
            {metrics.plannedVsActual.actual} of {metrics.plannedVsActual.planned}
            {metrics.plannedVsActual.planned > 0 && (
              <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '8px' }}>
                ({Math.round((metrics.plannedVsActual.actual / metrics.plannedVsActual.planned) * 100)}%)
              </span>
            )}
          </div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>Click for details</div>
        </div>

        <div className="metric-card clickable" onClick={() => setShowMilestoneCompletionModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Milestone Completion</div>
          <div className="metric-value">
            {metrics.milestoneCompletion.completed} / {metrics.milestoneCompletion.total}
          </div>
          <div className="metric-sublabel">
            {metrics.milestoneCompletion.total > 0 
              ? Math.round((metrics.milestoneCompletion.completed / metrics.milestoneCompletion.total) * 100) 
              : 0}%
          </div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>Click for details</div>
        </div>

        <div className="metric-card clickable" onClick={() => setShowUpcomingMilestonesModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Upcoming (14 Days)</div>
          <div className="metric-value highlight-blue">
            {metrics.upcomingMilestones}
          </div>
          <div className="metric-sublabel">Milestones</div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>Click for details</div>
        </div>

        <div className="metric-card alert clickable" onClick={() => setShowOverdueMilestonesModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Overdue Milestones</div>
          <div className="metric-value highlight-red">
            {metrics.overdueMilestones}
          </div>
          <div className="metric-sublabel">{getTrendIcon(metrics.overdueMilestones)} Attention</div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>Click for details</div>
        </div>

        <div className="metric-card alert clickable" onClick={() => setShowOverdueTasksModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Overdue Tasks</div>
          <div className="metric-value highlight-orange">
            {metrics.overdueTasks}
          </div>
          <div className="metric-sublabel">{getTrendIcon(metrics.overdueTasks)} Attention</div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>Click for details</div>
        </div>
      </div>

      <div className="dashboard-footer">
        <div className="raid-section">
          <h3>RAID BREAKDOWN</h3>
          <div className="raid-content">
            <div className="raid-chart-compact">
              <div className="raid-item-compact">
                <div className="raid-label">Risk</div>
                <div className="raid-bar-container-compact">
                  <div 
                    className="raid-bar raid-bar-risk" 
                    style={{ width: `${metrics.allRisks > 0 ? (metrics.allRisks / Math.max(metrics.allRisks, metrics.openAssumptions, metrics.openIssues, metrics.openDependencies, 1)) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="raid-count">{metrics.allRisks}</div>
              </div>
              
              <div className="raid-item-compact">
                <div className="raid-label">Assumption</div>
                <div className="raid-bar-container-compact">
                  <div 
                    className="raid-bar raid-bar-assumption" 
                    style={{ width: `${metrics.openAssumptions > 0 ? (metrics.openAssumptions / Math.max(metrics.allRisks, metrics.openAssumptions, metrics.openIssues, metrics.openDependencies, 1)) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="raid-count">{metrics.openAssumptions}</div>
              </div>
              
              <div className="raid-item-compact">
                <div className="raid-label">Issue</div>
                <div className="raid-bar-container-compact">
                  <div 
                    className="raid-bar raid-bar-issue" 
                    style={{ width: `${metrics.openIssues > 0 ? (metrics.openIssues / Math.max(metrics.allRisks, metrics.openAssumptions, metrics.openIssues, metrics.openDependencies, 1)) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="raid-count">{metrics.openIssues}</div>
              </div>
              
              <div className="raid-item-compact">
                <div className="raid-label">Dependency</div>
                <div className="raid-bar-container-compact">
                  <div 
                    className="raid-bar raid-bar-dependency" 
                    style={{ width: `${metrics.openDependencies > 0 ? (metrics.openDependencies / Math.max(metrics.allRisks, metrics.openAssumptions, metrics.openIssues, metrics.openDependencies, 1)) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="raid-count">{metrics.openDependencies}</div>
              </div>
            </div>

            <div className="raid-summary-horizontal">
              <div className="raid-summary-card" onClick={() => setShowOpenRisksModal(true)} style={{ cursor: 'pointer' }}>
                <div className="raid-summary-card-header">
                  <div className="raid-summary-icon risk">
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <div className="raid-summary-content">
                  <div className="raid-summary-value">{metrics.openRisks}</div>
                  <div className="raid-summary-label">OPEN RISKS (HIGH & CRITICAL)</div>
                  <div className="raid-summary-status">Open</div>
                </div>
              </div>

              <div className="raid-summary-card" onClick={() => setShowOpenIssuesModal(true)} style={{ cursor: 'pointer' }}>
                <div className="raid-summary-card-header">
                  <div className="raid-summary-icon issue">
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <div className="raid-summary-content">
                  <div className="raid-summary-value">{metrics.openIssues}</div>
                  <div className="raid-summary-label">OPEN ISSUES</div>
                  <div className="raid-summary-status">Open</div>
                </div>
              </div>

              <div className="raid-summary-card" onClick={() => setShowAgedRaidModal(true)} style={{ cursor: 'pointer' }}>
                <div className="raid-summary-card-header">
                  <div className="raid-summary-icon aged">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="raid-summary-content">
                  <div className="raid-summary-value">{metrics.agedRaid}</div>
                  <div className="raid-summary-label">AGED RAID &gt;30 DAYS</div>
                  <div className="raid-summary-status">Open</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPlannedVsActualModal && (
        <PlannedVsActualModal
          documents={documents}
          analyzeTaskPerformance={analyzeTaskPerformance}
          convertExcelDateToJS={convertExcelDateToJS}
          onClose={() => setShowPlannedVsActualModal(false)}
        />
      )}

      {showMilestoneCompletionModal && (
        <MilestoneCompletionModal
          documents={documents}
          convertExcelDateToJS={convertExcelDateToJS}
          formatDate={formatDate}
          onClose={() => setShowMilestoneCompletionModal(false)}
        />
      )}

      {showUpcomingMilestonesModal && (
        <UpcomingMilestonesModal
          documents={documents}
          convertExcelDateToJS={convertExcelDateToJS}
          formatDate={formatDate}
          onClose={() => setShowUpcomingMilestonesModal(false)}
        />
      )}

      {showOverdueMilestonesModal && (
        <OverdueMilestonesModal
          documents={documents}
          convertExcelDateToJS={convertExcelDateToJS}
          formatDate={formatDate}
          onClose={() => setShowOverdueMilestonesModal(false)}
        />
      )}

      {showOverdueTasksModal && (
        <OverdueTasksModal
          documents={documents}
          convertExcelDateToJS={convertExcelDateToJS}
          formatDate={formatDate}
          onClose={() => setShowOverdueTasksModal(false)}
        />
      )}

      {showOpenRisksModal && (
        <OpenRisksModal
          documents={documents}
          convertExcelDateToJS={convertExcelDateToJS}
          formatDate={formatDate}
          onClose={() => setShowOpenRisksModal(false)}
        />
      )}

      {showOpenIssuesModal && (
        <OpenIssuesModal
          documents={documents}
          convertExcelDateToJS={convertExcelDateToJS}
          formatDate={formatDate}
          onClose={() => setShowOpenIssuesModal(false)}
        />
      )}

      {showAgedRaidModal && (
        <AgedRaidModal
          documents={documents}
          convertExcelDateToJS={convertExcelDateToJS}
          formatDate={formatDate}
          onClose={() => setShowAgedRaidModal(false)}
        />
      )}
    </div>
  );
}

export default ProjectDashboard;
