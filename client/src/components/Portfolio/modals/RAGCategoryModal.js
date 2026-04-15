import React, { useState } from 'react';
import { 
  convertExcelDateToJS, 
  getMilestoneColor, 
  getMilestoneStatus 
} from '../utils';

const RAGCategoryModal = ({ 
  isOpen, 
  onClose, 
  modalData,
  expandedProjectId,
  onToggleProject,
  milestoneTooltip,
  onMilestoneClick,
  onCloseTooltip
}) => {
  if (!isOpen || !modalData) return null;

  const { title, projects } = modalData;

  // Timeline helper functions
  const calculateTimelineRange = (milestones) => {
    if (!milestones || milestones.length === 0) return null;
    const dates = milestones
      .map(m => convertExcelDateToJS(m['Planned End Date']))
      .filter(d => d !== null);
    if (dates.length === 0) return null;
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const paddingDays = 30;
    return {
      start: new Date(minDate.getTime() - paddingDays * 24 * 60 * 60 * 1000),
      end: new Date(maxDate.getTime() + paddingDays * 24 * 60 * 60 * 1000)
    };
  };

  const getMilestonePosition = (milestoneDate, range) => {
    if (!milestoneDate || !range) return 50;
    const date = convertExcelDateToJS(milestoneDate);
    if (!date) return 50;
    const totalDuration = range.end.getTime() - range.start.getTime();
    const position = date.getTime() - range.start.getTime();
    return Math.max(0, Math.min(100, (position / totalDuration) * 100));
  };

  const getTodayPosition = (range) => {
    if (!range) return 50;
    const today = new Date();
    const totalDuration = range.end.getTime() - range.start.getTime();
    const position = today.getTime() - range.start.getTime();
    return Math.max(0, Math.min(100, (position / totalDuration) * 100));
  };

  const formatMilestoneDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = convertExcelDateToJS(dateValue);
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000 
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
        background: 'white', 
        borderRadius: '12px', 
        maxWidth: '900px', 
        width: '90%', 
        maxHeight: '85vh', 
        overflow: 'auto' 
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{title} Projects ({projects.length})</h2>
          <button type="button" onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          {projects.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>No projects in this category</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map(project => {
                const projectId = project.id || project._id;
                const isProjectExpanded = expandedProjectId === `modal-${projectId}`;
                const allMilestones = project.allMilestoneDetails || [];
                const timelineRange = calculateTimelineRange(allMilestones);
                const todayPosition = getTodayPosition(timelineRange);

                return (
                  <div key={projectId} className="rag-modal-project-card" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Compact Project Name Row */}
                    <div
                      onClick={() => onToggleProject(isProjectExpanded ? null : `modal-${projectId}`)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        backgroundColor: isProjectExpanded ? '#f9fafb' : 'white',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {isProjectExpanded ? '▼' : '▶'}
                        </span>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{project.name}</span>
                          <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '12px' }}>{project.clients || 'Client TBD'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {project.overdueMilestones > 0 && (
                          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>🔴 {project.overdueMilestones}</span>
                        )}
                        {project.upcomingMilestones > 0 && (
                          <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>🟡 {project.upcomingMilestones}</span>
                        )}
                        {project.openCriticalRisks > 0 && (
                          <span style={{ fontSize: '12px', color: '#ef4444' }}>🔴 {project.openCriticalRisks}</span>
                        )}
                        {project.openCriticalIssues > 0 && (
                          <span style={{ fontSize: '12px', color: '#f59e0b' }}>⚠️ {project.openCriticalIssues}</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Project Details */}
                    {isProjectExpanded && (
                      <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>
                        {/* Timeline */}
                        {allMilestones.length > 0 && timelineRange && (
                          <div className="rag-timeline-container" style={{ marginBottom: '12px' }}>
                            <div className="rag-timeline-labels">
                              <span>{timelineRange.start.toLocaleDateString('en-US', { month: 'short' })}</span>
                              <span className="rag-timeline-today">Today</span>
                              <span>{timelineRange.end.toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <div className="rag-timeline-track">
                              <div className="rag-timeline-past" style={{ width: `${todayPosition}%` }} />
                              <div className="rag-timeline-future" style={{ width: `${100 - todayPosition}%` }} />
                              <div className="rag-timeline-today-marker" style={{ left: `${todayPosition}%` }} title="Today" />
                              {allMilestones.slice(0, 5).map((milestone, idx) => {
                                const milestoneStatus = getMilestoneStatus(milestone);
                                const position = getMilestonePosition(milestone['Planned End Date'], timelineRange);
                                const milestoneName = milestone['Milestone / Task Name'] || milestone['Milestone Name'] || milestone['Milestone'] || milestone['Task Name'] || milestone['Name'] || `M${idx + 1}`;
                                const milestoneDate = formatMilestoneDate(milestone['Planned End Date']);

                                return (
                                  <div
                                    key={idx}
                                    className={`rag-timeline-dot rag-timeline-dot-${milestoneStatus}`}
                                    style={{ left: `${position}%` }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMilestoneClick(projectId, idx, milestoneName, milestoneDate, milestoneStatus, milestone);
                                    }}
                                    title={`${milestoneName}: ${milestoneDate}`}
                                  />
                                );
                              })}
                            </div>
                            <div className="rag-timeline-summary">
                              <span className="rag-summary-item rag-summary-overdue">🔴 {project.overdueMilestones || 0} overdue</span>
                              <span className="rag-summary-item rag-summary-upcoming">🟡 {project.upcomingMilestones || 0} upcoming</span>
                              {allMilestones.length > 5 && <span className="rag-summary-item">+{allMilestones.length - 5} more</span>}
                            </div>
                          </div>
                        )}
                        {allMilestones.length === 0 && (
                          <div className="rag-timeline-empty"><span>No milestone data available</span></div>
                        )}

                        {/* Stats Row */}
                        <div className="rag-project-quick-stats">
                          <span className="rag-stat-badge rag-stat-risks">🔴 {project.openCriticalRisks || 0} risks</span>
                          <span className="rag-stat-badge rag-stat-issues">⚠️ {project.openCriticalIssues || 0} issues</span>
                          <span className="rag-stat-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>RAG: {project.ragStatus || 'Green'}</span>
                        </div>

                        {/* Milestone Tooltip */}
                        {milestoneTooltip && milestoneTooltip.projectId === `modal-${projectId}` && (
                          <div className="milestone-tooltip" style={{ position: 'relative', marginTop: '12px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <strong style={{ fontSize: '14px' }}>{milestoneTooltip.milestone?.['Milestone / Task Name'] || milestoneTooltip.name}</strong>
                              <button onClick={onCloseTooltip} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>×</button>
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Due: {milestoneTooltip.date}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getMilestoneColor(milestoneTooltip.status) }} />
                              <span style={{ color: getMilestoneColor(milestoneTooltip.status), fontWeight: 500, textTransform: 'capitalize' }}>{milestoneTooltip.status}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RAGCategoryModal;
