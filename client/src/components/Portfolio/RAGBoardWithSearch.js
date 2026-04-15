import React from 'react';
import { convertExcelDateToJS, getMilestoneColor, getMilestoneStatus } from './utils';

const RAGBoardWithSearch = ({
  ragBuckets,
  ragSearchQuery,
  setRagSearchQuery,
  ragExpandedProjectId,
  setRagExpandedProjectId,
  milestoneTooltip,
  setMilestoneTooltip,
  setRagCategoryModal
}) => {
  // Helper functions for timeline
  const calculateTimelineRange = (milestones) => {
    if (!milestones || milestones.length === 0) return null;
    const dates = milestones
      .map(m => convertExcelDateToJS(m['Planned End Date']))
      .filter(d => d !== null);
    if (dates.length === 0) return null;
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const paddingDays = 30;
    return { start: new Date(minDate.getTime() - paddingDays * 24 * 60 * 60 * 1000), end: new Date(maxDate.getTime() + paddingDays * 24 * 60 * 60 * 1000) };
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
    today.setHours(0, 0, 0, 0);
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
    <>
      {/* RAG Board Search */}
      <div className="rag-board-search-container" style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Search Projects:</span>
        <input
          type="text"
          placeholder="Search by project name, client, or owner..."
          value={ragSearchQuery}
          onChange={(e) => setRagSearchQuery(e.target.value)}
          style={{
            flex: 1,
            maxWidth: '400px',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        {ragSearchQuery && (
          <button
            onClick={() => setRagSearchQuery('')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        )}
      </div>

      <section className="portfolio-rag-board">
        {['red', 'amber', 'green'].map(status => {
          // Filter projects based on search query
          const filteredProjects = ragBuckets[status].filter(project => {
            if (!ragSearchQuery.trim()) return true;
            const query = ragSearchQuery.toLowerCase();
            const nameMatch = project.name?.toLowerCase().includes(query);
            const clientMatch = project.clients?.toLowerCase().includes(query);
            const ownerMatch = project.projectCharter?.['Project Owner']?.toLowerCase().includes(query);
            return nameMatch || clientMatch || ownerMatch;
          });
          const previewProjects = filteredProjects.slice(0, 3);
          const hasMoreProjects = filteredProjects.length > 3;

          return (
            <div key={status} className={`rag-column rag-${status}`}>
              <div className="rag-column-header">
                <div>
                  <span className="rag-column-label">{status === 'red' ? 'Critical' : status === 'amber' ? 'Caution' : 'On Track'}</span>
                  <p className="rag-column-helper">{status === 'green' ? 'Monitoring' : 'Immediate follow-up'}</p>
                </div>
                <span className="rag-column-count">{filteredProjects.length}</span>
              </div>
              <div className="rag-column-body">
                {filteredProjects.length === 0 && (
                  <p className="rag-empty">{ragSearchQuery ? 'No matching projects' : 'No projects in this band'}</p>
                )}
                {previewProjects.map(project => {
                    const projectId = project.id || project._id;
                    const isProjectExpanded = ragExpandedProjectId === projectId;
                    const allMilestones = project.allMilestoneDetails || [];
                    const timelineRange = calculateTimelineRange(allMilestones);
                    const todayPosition = getTodayPosition(timelineRange);

                    return (
                      <div key={projectId} className="rag-project-card" style={{ position: 'relative' }}>
                        {/* Compact Project Name Row - Always Visible */}
                        <div
                          onClick={() => setRagExpandedProjectId(isProjectExpanded ? null : projectId)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            backgroundColor: isProjectExpanded ? '#f3f4f6' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {isProjectExpanded ? '▼' : '▶'}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{project.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {project.overdueMilestones > 0 && (
                              <span style={{ fontSize: '11px', color: '#ef4444' }}>🔴 {project.overdueMilestones}</span>
                            )}
                            {project.upcomingMilestones > 0 && (
                              <span style={{ fontSize: '11px', color: '#f59e0b' }}>🟡 {project.upcomingMilestones}</span>
                            )}
                          </div>
                        </div>

                        {/* Expanded Project Details */}
                        {isProjectExpanded && (
                          <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
                            <div className="rag-project-meta" style={{ marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>{project.clients || 'Client TBD'}</span>
                              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                                RAG: <span style={{ fontWeight: 500, color: getMilestoneColor(project.ragStatus?.toLowerCase() === 'red' ? 'overdue' : project.ragStatus?.toLowerCase() === 'amber' ? 'upcoming' : 'completed') }}>{project.ragStatus || 'Green'}</span>
                              </span>
                            </div>

                            {/* Interactive Timeline */}
                            {allMilestones.length > 0 && timelineRange && (
                              <div className="rag-timeline-container">
                                <div className="rag-timeline-labels">
                                  <span>{timelineRange.start.toLocaleDateString('en-US', { month: 'short' })}</span>
                                  <span className="rag-timeline-today">Today</span>
                                  <span>{timelineRange.end.toLocaleDateString('en-US', { month: 'short' })}</span>
                                </div>
                                <div className="rag-timeline-track">
                                  {/* Timeline bar segments */}
                                  <div className="rag-timeline-past" style={{ width: `${todayPosition}%` }} />
                                  <div className="rag-timeline-future" style={{ width: `${100 - todayPosition}%` }} />

                                  {/* Today marker */}
                                  <div
                                    className="rag-timeline-today-marker"
                                    style={{ left: `${todayPosition}%` }}
                                    title="Today"
                                  />

                                  {/* Milestone dots */}
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
                                          const isSame = milestoneTooltip && 
                                            milestoneTooltip.projectId === projectId && 
                                            milestoneTooltip.milestoneIndex === idx;
                                          if (isSame) {
                                            setMilestoneTooltip(null);
                                          } else {
                                            setMilestoneTooltip({
                                              projectId: projectId,
                                              milestoneIndex: idx,
                                              name: milestoneName,
                                              date: milestoneDate,
                                              status: milestoneStatus,
                                              milestone: milestone
                                            });
                                          }
                                        }}
                                        title={`${milestoneName}: ${milestoneDate}`}
                                      />
                                    );
                                  })}
                                </div>

                                {/* Milestone summary */}
                                <div className="rag-timeline-summary">
                                  <span className="rag-summary-item rag-summary-overdue">
                                    🔴 {project.overdueMilestones || 0} overdue
                                  </span>
                                  <span className="rag-summary-item rag-summary-upcoming">
                                    🟡 {(project.upcomingMilestones || 0)} upcoming
                                  </span>
                                  {allMilestones.length > 5 && (
                                    <span className="rag-summary-item">+{allMilestones.length - 5} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Show message if no milestones */}
                            {allMilestones.length === 0 && (
                              <div className="rag-timeline-empty">
                                <span>No milestone data available</span>
                              </div>
                            )}

                            {/* Quick stats row */}
                            <div className="rag-project-quick-stats">
                              <span className="rag-stat-badge rag-stat-risks">
                                🔴 {project.openCriticalRisks || 0}
                              </span>
                              <span className="rag-stat-badge rag-stat-issues">
                                ⚠️ {project.openCriticalIssues || 0}
                              </span>
                            </div>

                            {/* Milestone Tooltip - Rendered inside card */}
                            {milestoneTooltip && milestoneTooltip.projectId === projectId && (
                              <div
                                className="milestone-tooltip"
                                style={{
                                  position: 'absolute',
                                  left: '50%',
                                  top: '10px',
                                  transform: 'translateX(-50%)',
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                  zIndex: 100,
                                  minWidth: '260px',
                                  maxWidth: '280px'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Milestone</div>
                                    <strong style={{ fontSize: '15px', color: '#111827', display: 'block' }}>
                                      {milestoneTooltip.milestone?.['Milestone / Task Name'] || milestoneTooltip.milestone?.['Milestone Name'] || milestoneTooltip.milestone?.['Milestone'] || milestoneTooltip.milestone?.['Task Name'] || milestoneTooltip.milestone?.['Name'] || milestoneTooltip.name}
                                    </strong>
                                  </div>
                                  <button
                                    onClick={() => setMilestoneTooltip(null)}
                                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280', padding: 0, marginLeft: '8px' }}
                                  >
                                    ×
                                  </button>
                                </div>

                                {/* Status Badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      backgroundColor: getMilestoneColor(milestoneTooltip.status)
                                    }}
                                  />
                                  <span style={{ color: getMilestoneColor(milestoneTooltip.status), fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                                    {milestoneTooltip.status}
                                  </span>
                                </div>

                                {/* Details Grid */}
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Planned End:</span>
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.date}</span>
                                  </div>
                                  {milestoneTooltip.milestone?.['Actual End Date'] && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Actual End:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                                        {formatMilestoneDate(milestoneTooltip.milestone['Actual End Date'])}
                                      </span>
                                    </div>
                                  )}
                                  {milestoneTooltip.milestone?.Status && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Status:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.Status}</span>
                                    </div>
                                  )}
                                  {milestoneTooltip.milestone?.Owner && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Owner:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.Owner}</span>
                                    </div>
                                  )}
                                  {milestoneTooltip.milestone?.WBS && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>WBS:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.WBS}</span>
                                    </div>
                                  )}
                                  {milestoneTooltip.milestone?.['Milestone Ref'] && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Ref:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone['Milestone Ref']}</span>
                                    </div>
                                  )}
                                </div>
                                {milestoneTooltip.milestone?.Description && (
                                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Description</div>
                                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>
                                      {milestoneTooltip.milestone.Description}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* View All Button */}
                  {hasMoreProjects && (
                    <button
                      onClick={() => setRagCategoryModal({ status, projects: filteredProjects, title: status === 'red' ? 'Critical' : status === 'amber' ? 'Caution' : 'On Track' })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '8px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>View All</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>({filteredProjects.length})</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
            </div>
          );
        })}
      </section>
    </>
  );
};

export default RAGBoardWithSearch;
