import React, { useState, useMemo } from 'react';
import { convertExcelDateToJS, getMilestoneColor, getMilestoneStatus, getRAGColor } from '../utils';

function ProjectInfoModal({ project, isOpen, onClose }) {
  const [milestoneTooltip, setMilestoneTooltip] = useState(null);

  const allMilestones = useMemo(() => project?.allMilestoneDetails || [], [project]);

  // Timeline helpers
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

  const timelineRange = useMemo(() => calculateTimelineRange(allMilestones), [allMilestones]);
  const todayPosition = useMemo(() => getTodayPosition(timelineRange), [timelineRange]);

  if (!isOpen || !project) return null;

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
      zIndex: 2000
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div className="modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{project.name}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              {project.clients || 'Client TBD'}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280'
          }}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* RAG & Stats Row */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: getRAGColor(project.ragStatus)
              }} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>
                RAG: {project.ragStatus || 'Green'}
              </span>
            </div>
            {project.overdueMilestones > 0 && (
              <div style={{
                padding: '8px 14px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                fontSize: '13px',
                fontWeight: 500,
                color: '#dc2626'
              }}>
                {project.overdueMilestones} Overdue
              </div>
            )}
            {project.upcomingMilestones > 0 && (
              <div style={{
                padding: '8px 14px',
                backgroundColor: '#fffbeb',
                borderRadius: '8px',
                border: '1px solid #fcd34d',
                fontSize: '13px',
                fontWeight: 500,
                color: '#d97706'
              }}>
                {project.upcomingMilestones} Upcoming
              </div>
            )}
            {project.openCriticalRisks > 0 && (
              <div style={{
                padding: '8px 14px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                fontSize: '13px',
                fontWeight: 500,
                color: '#dc2626'
              }}>
                {project.openCriticalRisks} Risks
              </div>
            )}
            {project.openCriticalIssues > 0 && (
              <div style={{
                padding: '8px 14px',
                backgroundColor: '#fffbeb',
                borderRadius: '8px',
                border: '1px solid #fcd34d',
                fontSize: '13px',
                fontWeight: 500,
                color: '#d97706'
              }}>
                {project.openCriticalIssues} Issues
              </div>
            )}
          </div>

          {/* Timeline */}
          {allMilestones.length > 0 && timelineRange && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#111827'
              }}>Milestone Timeline</h3>
              <div style={{ position: 'relative' }}>
                {/* Timeline labels */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  <span>{timelineRange.start.toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span style={{ fontWeight: 500 }}>Today</span>
                  <span>{timelineRange.end.toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>

                {/* Timeline track */}
                <div style={{
                  position: 'relative',
                  height: '40px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '12px'
                }}>
                  {/* Past segment */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${todayPosition}%`,
                    backgroundColor: '#e5e7eb'
                  }} />
                  {/* Today marker */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: `${todayPosition}%`,
                    height: '100%',
                    width: '2px',
                    backgroundColor: '#6b7280',
                    transform: 'translateX(-50%)'
                  }} title="Today" />

                  {/* Milestone dots */}
                  {allMilestones.slice(0, 5).map((milestone, idx) => {
                    const milestoneStatus = getMilestoneStatus(milestone);
                    const position = getMilestonePosition(milestone['Planned End Date'], timelineRange);
                    const milestoneName = milestone['Milestone / Task Name'] || milestone['Milestone Name'] || milestone['Milestone'] || milestone['Task Name'] || milestone['Name'] || `M${idx + 1}`;
                    const milestoneDate = formatMilestoneDate(milestone['Planned End Date']);

                    return (
                      <div
                        key={idx}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: `${position}%`,
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: getMilestoneColor(milestoneStatus),
                          transform: 'translate(-50%, -50%)',
                          cursor: 'pointer',
                          border: '2px solid white',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const isSame = milestoneTooltip && milestoneTooltip.index === idx;
                          if (isSame) {
                            setMilestoneTooltip(null);
                          } else {
                            setMilestoneTooltip({
                              index: idx,
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
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <span>{project.overdueMilestones || 0} overdue</span>
                  <span>{project.upcomingMilestones || 0} upcoming</span>
                  {allMilestones.length > 5 && (
                    <span>+{allMilestones.length - 5} more</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {allMilestones.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: '#6b7280',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              No milestone data available
            </div>
          )}

          {/* Milestone Tooltip */}
          {milestoneTooltip && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}>Milestone</div>
                  <strong style={{ fontSize: '15px', color: '#111827' }}>
                    {milestoneTooltip.milestone?.['Milestone / Task Name'] || milestoneTooltip.name}
                  </strong>
                </div>
                <button
                  onClick={() => setMilestoneTooltip(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >×</button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px'
              }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getMilestoneColor(milestoneTooltip.status)
                }} />
                <span style={{
                  color: getMilestoneColor(milestoneTooltip.status),
                  fontWeight: 600,
                  fontSize: '13px',
                  textTransform: 'uppercase'
                }}>{milestoneTooltip.status}</span>
              </div>

              <div style={{
                display: 'grid',
                gap: '10px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Planned End:</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{milestoneTooltip.date}</span>
                </div>
                {milestoneTooltip.milestone?.['Actual End Date'] && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Actual End:</span>
                    <span style={{ fontWeight: 500, color: '#111827' }}>
                      {formatMilestoneDate(milestoneTooltip.milestone['Actual End Date'])}
                    </span>
                  </div>
                )}
                {milestoneTooltip.milestone?.Status && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Status:</span>
                    <span style={{ fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.Status}</span>
                  </div>
                )}
                {milestoneTooltip.milestone?.Owner && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Owner:</span>
                    <span style={{ fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.Owner}</span>
                  </div>
                )}
                {milestoneTooltip.milestone?.WBS && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>WBS:</span>
                    <span style={{ fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.WBS}</span>
                  </div>
                )}
              </div>

              {milestoneTooltip.milestone?.Description && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}>Description</div>
                  <div style={{
                    fontSize: '13px',
                    color: '#374151',
                    lineHeight: 1.5
                  }}>
                    {milestoneTooltip.milestone.Description}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Info */}
          {project.actionItem && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#111827'
              }}>Action Item</h3>
              <p style={{
                fontSize: '13px',
                color: '#374151',
                lineHeight: 1.5,
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>{project.actionItem}</p>
            </div>
          )}

          {project.riskSummary && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#111827'
              }}>Risk Summary</h3>
              <p style={{
                fontSize: '13px',
                color: '#374151',
                lineHeight: 1.5,
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px'
              }}>{project.riskSummary}</p>
            </div>
          )}

          {project.mitigationPlan && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#111827'
              }}>Mitigation Plan</h3>
              <p style={{
                fontSize: '13px',
                color: '#374151',
                lineHeight: 1.5,
                padding: '12px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px'
              }}>{project.mitigationPlan}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectInfoModal;
