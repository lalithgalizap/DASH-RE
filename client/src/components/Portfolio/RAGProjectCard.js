import React, { useMemo } from 'react';
import { 
  convertExcelDateToJS, 
  getProjectOwner,
  getMilestoneStatus,
  getMilestoneColor,
  formatRelativeTime,
  formatMilestoneDate
} from './utils';

const RAGProjectCard = ({ 
  project, 
  isExpanded, 
  onToggle,
  onMilestoneClick,
  onClick
}) => {
  const projectId = project.id || project._id;
  const owner = getProjectOwner(project);
  
  // Calculate timeline range
  const timelineRange = useMemo(() => {
    const milestones = project.allMilestoneDetails || [];
    if (!milestones || milestones.length === 0) return null;
    const dates = milestones
      .map(m => convertExcelDateToJS(m['Planned End Date']))
      .filter(d => d !== null);
    if (dates.length === 0) return null;
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);
    return { start: minDate, end: maxDate };
  }, [project.allMilestoneDetails]);

  // Get milestone position on timeline
  const getMilestonePosition = (milestoneDate) => {
    if (!milestoneDate || !timelineRange) return 50;
    const date = convertExcelDateToJS(milestoneDate);
    if (!date) return 50;
    const totalDuration = timelineRange.end.getTime() - timelineRange.start.getTime();
    const position = date.getTime() - timelineRange.start.getTime();
    return Math.max(0, Math.min(100, (position / totalDuration) * 100));
  };

  // Get today position
  const todayPosition = useMemo(() => {
    if (!timelineRange) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < timelineRange.start || today > timelineRange.end) return null;
    const totalDuration = timelineRange.end.getTime() - timelineRange.start.getTime();
    const position = today.getTime() - timelineRange.start.getTime();
    return Math.max(0, Math.min(100, (position / totalDuration) * 100));
  }, [timelineRange]);

  // Get freshness bar width
  const freshnessBarWidth = (dateString, invert = false) => {
    if (!dateString) return invert ? '15%' : '85%';
    const diffDays = Math.min(14, Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))));
    const width = invert ? Math.min(90, diffDays * 6 + 20) : Math.max(15, 90 - diffDays * 6);
    return `${width}%`;
  };

  const ragColor = project.ragStatus?.toLowerCase() === 'red' ? '#ef4444' : 
                   project.ragStatus?.toLowerCase() === 'amber' ? '#f59e0b' : '#10b981';

  return (
    <div 
      className="rag-project-card"
      style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer'
      }}
      onClick={onClick}
    >
      {/* Card Header */}
      <div 
        className="rag-project-header"
        style={{
          padding: '12px 16px',
          borderLeft: `4px solid ${ragColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        {/* Expand/Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            width: '24px',
            height: '24px',
            border: 'none',
            background: '#f3f4f6',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        {/* Project Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: '14px', 
            color: '#111827',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {project.name}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            display: 'flex',
            gap: '8px',
            marginTop: '2px'
          }}>
            <span>{project.clients || 'No Client'}</span>
            <span>•</span>
            <span>{owner}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {project.openCriticalRisks > 0 && (
            <span style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              🔴 {project.openCriticalRisks}
            </span>
          )}
          {project.openCriticalIssues > 0 && (
            <span style={{
              background: '#fef3c7',
              color: '#d97706',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              ⚠️ {project.openCriticalIssues}
            </span>
          )}
          {project.overdueMilestones > 0 && (
            <span style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              📅 {project.overdueMilestones}
            </span>
          )}
        </div>

        {/* Status Badge */}
        <span style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
          background: project.status?.toLowerCase() === 'completed' ? '#d1fae5' :
                      project.status?.toLowerCase() === 'cancelled' ? '#fee2e2' :
                      '#dbeafe',
          color: project.status?.toLowerCase() === 'completed' ? '#059669' :
                 project.status?.toLowerCase() === 'cancelled' ? '#dc2626' :
                 '#2563eb'
        }}>
          {project.status || 'Active'}
        </span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div 
          className="rag-project-expanded"
          style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            background: '#fafafa'
          }}
        >
          {/* Last Updated */}
          {project.lastModified && (
            <div style={{ 
              marginBottom: '12px', 
              fontSize: '12px', 
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>Last updated:</span>
              <span style={{ fontWeight: 500 }}>{formatRelativeTime(project.lastModified)}</span>
              <div style={{
                flex: 1,
                height: '4px',
                background: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
                marginLeft: '8px'
              }}>
                <div style={{
                  width: freshnessBarWidth(project.lastModified),
                  height: '100%',
                  background: '#10b981',
                  borderRadius: '2px'
                }} />
              </div>
            </div>
          )}

          {/* Milestones Timeline */}
          {project.allMilestoneDetails && project.allMilestoneDetails.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                Milestones Timeline
              </div>
              
              {/* Timeline Track */}
              <div style={{ position: 'relative', height: '60px', marginBottom: '8px' }}>
                {/* Background track */}
                <div style={{
                  position: 'absolute',
                  top: '24px',
                  left: '0',
                  right: '0',
                  height: '4px',
                  background: '#e5e7eb',
                  borderRadius: '2px'
                }} />
                
                {/* Today marker */}
                {todayPosition && (
                  <div style={{
                    position: 'absolute',
                    top: '18px',
                    left: `${todayPosition}%`,
                    width: '2px',
                    height: '16px',
                    background: '#ef4444',
                    zIndex: 10
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '-20px',
                      background: '#ef4444',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      Today
                    </div>
                  </div>
                )}
                
                {/* Milestone markers */}
                {project.allMilestoneDetails.map((milestone, idx) => {
                  const position = getMilestonePosition(milestone['Planned End Date']);
                  const status = getMilestoneStatus(milestone);
                  const color = getMilestoneColor(status);
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${position}%`,
                        top: '18px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: color,
                        border: '2px solid white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        transform: 'translateX(-50%)',
                        zIndex: 5
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMilestoneClick && onMilestoneClick(milestone, status, formatMilestoneDate(milestone['Planned End Date']));
                      }}
                      title={`${milestone['Milestone / Task Name'] || milestone['Milestone Name'] || 'Milestone'} - ${formatMilestoneDate(milestone['Planned End Date'])}`}
                    />
                  );
                })}
              </div>
              
              {/* Milestone Legend */}
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#6b7280' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <span>Completed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  <span>Overdue</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                  <span>Upcoming</span>
                </div>
              </div>
            </div>
          )}

          {/* No milestones message */}
          {(!project.allMilestoneDetails || project.allMilestoneDetails.length === 0) && (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#9ca3af',
              fontSize: '13px'
            }}>
              No milestone data available
            </div>
          )}

          {/* Quick Stats Row */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <span style={{ 
              fontSize: '12px', 
              color: '#374151',
              background: '#f3f4f6',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              🔴 {project.openCriticalRisks || 0} Risks
            </span>
            <span style={{ 
              fontSize: '12px', 
              color: '#374151',
              background: '#f3f4f6',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              ⚠️ {project.openCriticalIssues || 0} Issues
            </span>
            <span style={{ 
              fontSize: '12px', 
              color: '#374151',
              background: '#f3f4f6',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              📅 {project.upcomingMilestones || 0} Upcoming
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGProjectCard;
