import React, { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { getRAGColor, getProjectOwner, formatDateDisplay, formatRelativeTime } from '../utils';

const ProjectRadialView = ({ project, isOpen, onClose, onMetricClick }) => {
  const [expandedMetric, setExpandedMetric] = useState(null);
  const owner = project ? getProjectOwner(project) : '';
  const ragColor = project ? getRAGColor(project.ragStatus) : '#22c55e';
  
  // Define metrics with their positions (angles in degrees, starting from top)
  const metrics = useMemo(() => {
    if (!project) return [];
    return [
      {
        id: 'rag',
        label: 'Status',
        angle: 0,
        color: ragColor,
        fullDetails: {
          title: 'Project Status',
          items: [
            { label: 'Current Status', value: project.ragStatus || 'Green' },
            { label: 'Project Owner', value: owner },
            { label: 'Client', value: project.clients || 'N/A' }
          ]
        },
        render: () => (
          <div className="radial-metric-content rag-metric">
            <div className="rag-large-dot" style={{ backgroundColor: ragColor }} />
            <span className="rag-status-text">{project.ragStatus || 'Green'}</span>
          </div>
        )
      },
      {
        id: 'overdue',
        label: 'Overdue',
        angle: 45,
        color: '#ef4444',
        fullDetails: {
          title: 'Overdue Milestones',
          columns: ['ID', 'Milestone', 'Planned End', 'Status'],
          rows: (project.overdueMilestoneDetails || []).map(m => ({
            id: m['Milestone ID'] || m.ID || '-',
            milestone: m['Milestone Name'] || 'Milestone',
            plannedEnd: formatDateDisplay(m['Planned End Date']),
            status: m.Status || 'Overdue'
          }))
        },
        render: () => {
          const count = project.overdueMilestones || 0;
          const details = project.overdueMilestoneDetails?.slice(0, 2) || [];
          return (
            <div className="radial-metric-content">
              <div className="metric-count" style={{ color: count > 0 ? '#ef4444' : '#22c55e' }}>{count}</div>
              {count > 0 && (
                <ul className="metric-mini-list">
                  {details.map((m, i) => (
                    <li key={i}>{m['Milestone Name'] || 'Milestone'}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        }
      },
      {
        id: 'upcoming',
        label: 'Upcoming',
        angle: 90,
        color: '#f59e0b',
        fullDetails: {
          title: 'Upcoming Milestones (14 days)',
          columns: ['ID', 'Milestone', 'Planned End', 'Status'],
          rows: (project.upcomingMilestoneDetails || []).map(m => ({
            id: m['Milestone ID'] || m.ID || '-',
            milestone: m['Milestone Name'] || 'Milestone',
            plannedEnd: formatDateDisplay(m['Planned End Date']),
            status: m.Status || 'Upcoming'
          }))
        },
        render: () => {
          const count = project.upcomingMilestones || 0;
          const details = project.upcomingMilestoneDetails?.slice(0, 2) || [];
          return (
            <div className="radial-metric-content">
              <div className="metric-count" style={{ color: count > 0 ? '#f59e0b' : '#22c55e' }}>{count}</div>
              {count > 0 && (
                <ul className="metric-mini-list">
                  {details.map((m, i) => (
                    <li key={i}>{m['Milestone Name'] || 'Milestone'}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        }
      },
      {
        id: 'risks',
        label: 'Risks',
        angle: 135,
        color: '#ef4444',
        fullDetails: {
          title: 'Critical Risks',
          columns: ['ID', 'Title', 'Severity', 'Date Raised', 'Owner', 'Status'],
          rows: (project.openCriticalRisksDetails || []).map(r => ({
            id: r['RAID ID'] || r.ID || '-',
            title: r.Title || r.Description || 'Risk',
            severity: r.Severity || 'High',
            dateRaised: formatDateDisplay(r['Date Raised']),
            owner: r['RAID Owner'] || r.Owner || 'Unassigned',
            status: r.Status || 'Open'
          }))
        },
        render: () => {
          const count = project.openCriticalRisks || 0;
          return (
            <div className="radial-metric-content">
              <div className="metric-count" style={{ color: count > 0 ? '#ef4444' : '#22c55e' }}>{count}</div>
              <div className="metric-label-small">Critical Risks</div>
            </div>
          );
        }
      },
      {
        id: 'updated',
        label: 'Updated',
        angle: 180,
        color: '#64748b',
        fullDetails: {
          title: 'Last Update Information',
          items: [
            { label: 'Last Updated', value: formatRelativeTime(project.lastModified) },
            { label: 'Date', value: formatDateDisplay(project.lastModified) }
          ]
        },
        render: () => (
          <div className="radial-metric-content">
            <div className="metric-time">{formatRelativeTime(project.lastModified)}</div>
            <div className="metric-date">{formatDateDisplay(project.lastModified)}</div>
          </div>
        )
      },
      {
        id: 'escalations',
        label: 'Escalations',
        angle: 225,
        color: '#dc2626',
        fullDetails: {
          title: 'Open Escalations',
          columns: ['ID', 'Title', 'Type', 'Date Raised', 'Owner', 'Status'],
          rows: (project.openEscalationsDetails || []).map(e => ({
            id: e['RAID ID'] || e.ID || '-',
            title: e.Title || e.Description || 'Escalation',
            type: e.Type || 'Escalation',
            dateRaised: formatDateDisplay(e['Date Raised']),
            owner: e['RAID Owner'] || e.Owner || 'Unassigned',
            status: e.Status || 'Open'
          }))
        },
        render: () => {
          const count = project.openEscalations || 0;
          const details = project.openEscalationsDetails?.slice(0, 2) || [];
          return (
            <div className="radial-metric-content">
              <div className="metric-count" style={{ color: count > 0 ? '#dc2626' : '#22c55e' }}>{count}</div>
              {count > 0 && (
                <ul className="metric-mini-list">
                  {details.map((e, i) => (
                    <li key={i}>{e.Title || 'Escalation'}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        }
      },
      {
        id: 'issues',
        label: 'Issues',
        angle: 270,
        color: '#f97316',
        fullDetails: {
          title: 'Critical Issues',
          columns: ['ID', 'Title', 'Severity', 'Date Raised', 'Owner', 'Status'],
          rows: (project.openCriticalIssuesDetails || []).map(issue => ({
            id: issue['RAID ID'] || issue.ID || '-',
            title: issue.Title || issue.Description || 'Issue',
            severity: issue.Severity || 'Critical',
            dateRaised: formatDateDisplay(issue['Date Raised']),
            owner: issue['RAID Owner'] || issue.Owner || 'Unassigned',
            status: issue.Status || 'Open'
          }))
        },
        render: () => {
          const count = project.openCriticalIssues || 0;
          return (
            <div className="radial-metric-content">
              <div className="metric-count" style={{ color: count > 0 ? '#f97316' : '#22c55e' }}>{count}</div>
              <div className="metric-label-small">Critical Issues</div>
            </div>
          );
        }
      },
      {
        id: 'completion',
        label: 'Completion',
        angle: 315,
        color: '#3b82f6',
        fullDetails: {
          title: 'Project Completion',
          items: [
            { label: 'Total Tasks', value: project.totalTasks || 0 },
            { label: 'Completed Tasks', value: project.completedTasks || 0 },
            { label: 'Completion %', value: (project.projectCompletion || 0) + '%' }
          ]
        },
        render: () => {
          const percent = project.projectCompletion || 0;
          return (
            <div className="radial-metric-content">
              <div className="metric-progress">
                <div className="progress-ring">
                  <svg viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${percent}, 100`} />
                  </svg>
                  <span className="progress-text">{percent}%</span>
                </div>
              </div>
            </div>
          );
        }
      }
  ];
  }, [project, ragColor]);

  // Calculate positions for metrics
  const radius = 220; // Distance from center
  const centerX = 300;
  const centerY = 300;

  const getPosition = (angle) => {
    const rad = (angle - 90) * (Math.PI / 180); // Adjust so 0 is at top
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad)
    };
  };

  // Generate bezier path from center to node
  const getBezierPath = (angle) => {
    const start = { x: centerX, y: centerY };
    const end = getPosition(angle);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    // Add slight curve
    const controlX = midX + (end.y - start.y) * 0.1;
    const controlY = midY - (end.x - start.x) * 0.1;
    return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
  };

  // Early return after all hooks are defined
  if (!isOpen || !project) return null;

  const nonClickableIds = ['rag', 'completion', 'updated'];
  const expandedMetricData = metrics.find(m => m.id === expandedMetric);

  const handleProjectNavigate = () => {
    if (project?.id || project?._id) {
      window.location.href = `/project/${project.id || project._id}`;
    }
  };

  return (
    <div className="radial-modal-overlay" onClick={onClose}>
      <div className="radial-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Top Bar with Logo and Navigation */}
        <div className="radial-modal-topbar">
          <img src="/LOGO.png" alt="Logo" className="radial-modal-logo" />
          <div className="radial-modal-actions">
            <button 
              className="radial-modal-navigate-btn" 
              onClick={handleProjectNavigate}
              title="Go to Project Page"
            >
              <ExternalLink size={20} />
            </button>
            <button className="radial-close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="radial-container">
          <div className="radial-container-inner">
            <svg className="radial-connections" viewBox="0 0 600 600">
              {metrics.map((metric, index) => (
                <path
                  key={`line-${metric.id}`}
                  d={getBezierPath(metric.angle)}
                  stroke={metric.color}
                  strokeWidth="2"
                  fill="none"
                  className="radial-line"
                  style={{ animationDelay: `${index * 0.1}s` }}
                />
              ))}
            </svg>

            {/* Center Node - Project */}
            <div className="radial-center-node">
              <div className="center-glow" style={{ backgroundColor: ragColor }} />
              <div className="center-content">
                <div className="center-rag-indicator" style={{ backgroundColor: ragColor }} />
                <h2 className="center-project-name">{project.name}</h2>
                <p className="center-project-owner">{owner}</p>
                <span className="center-client">{project.clients || 'No Client'}</span>
              </div>
            </div>

            {/* Metric Nodes */}
            {metrics.map((metric, index) => {
              const pos = getPosition(metric.angle);
              const isClickable = !nonClickableIds.includes(metric.id) && (metric.fullDetails?.rows?.length > 0 || metric.fullDetails?.items?.length > 0);
              
              return (
                <div
                  key={metric.id}
                  className={`radial-metric-node ${isClickable ? 'clickable' : ''}`}
                  style={{ 
                    left: `${pos.x}px`, 
                    top: `${pos.y}px`,
                    animationDelay: `${index * 0.1 + 0.3}s`,
                    cursor: isClickable ? 'pointer' : 'default'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isClickable) {
                      setExpandedMetric(metric.id);
                      onMetricClick?.(metric.id, project);
                    }
                    // Do nothing for non-clickable cards - prevents navigation
                  }}
                >
                  <div className="metric-node-glow" style={{ backgroundColor: metric.color }} />
                  <div className="metric-node-content">
                    <div className="metric-node-label">{metric.label}</div>
                    {metric.render()}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Detail Modal Overlay */}
          {expandedMetricData && (
            <div className="radial-detail-overlay" onClick={(e) => {
              e.stopPropagation();
              setExpandedMetric(null);
            }}>
              <div className="radial-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="radial-detail-header" style={{ borderBottomColor: expandedMetricData.color }}>
                  <span>{expandedMetricData.fullDetails.title}</span>
                  <button 
                    className="radial-detail-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedMetric(null);
                    }}
                  >×</button>
                </div>
                <div className="radial-detail-content">
                  {expandedMetricData.fullDetails.columns ? (
                    // Table format
                    <table className="radial-detail-table">
                      <thead>
                        <tr>
                          {expandedMetricData.fullDetails.columns.map((col, idx) => (
                            <th key={idx}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {expandedMetricData.fullDetails.rows.length > 0 ? (
                          expandedMetricData.fullDetails.rows.map((row, idx) => (
                            <tr key={idx}>
                              <td>{row.id}</td>
                              <td>{row.title || row.milestone}</td>
                              <td style={{ color: row.severity === 'High' || row.severity === 'Critical' ? '#dc2626' : '#111827' }}>
                                {row.severity || row.type || row.status}
                              </td>
                              <td>{row.dateRaised || row.plannedEnd}</td>
                              <td>{row.owner}</td>
                              <td style={{ color: row.status === 'Open' ? '#dc2626' : '#111827', fontWeight: 500 }}>
                                {row.status}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={expandedMetricData.fullDetails.columns.length} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                              No records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    // Simple list format (fallback)
                    expandedMetricData.fullDetails.items.map((item, idx) => (
                      <div key={idx} className="radial-detail-item">
                        <span className="radial-detail-label">{item.label}</span>
                        <span className="radial-detail-value">{item.value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectRadialView;
