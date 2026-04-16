import React, { useState } from 'react';
import { getRAGColor, getProjectOwner, isActiveStatus, formatDate } from '../utils';
import CriticalItemsDetailModal from './CriticalItemsDetailModal';

const SummaryModal = ({ 
  type, 
  onClose, 
  projects, 
  ragBuckets,
  staleProjectsList 
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  if (!type) return null;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getTitle = () => {
    switch (type) {
      case 'active': return 'Active Projects';
      case 'rag': return 'Projects by RAG';
      case 'critical': return 'Portfolio Critical Items';
      case 'stale': return 'Project Update Status';
      default: return '';
    }
  };

  // Filter projects based on search for critical items (exclude completed/cancelled)
  const getCriticalProjects = () => {
    const activeProjects = projects.filter(p => isActiveStatus(p.status));
    const criticalItems = activeProjects.flatMap(project => {
      const risks = (project.openCriticalRisksDetails || []).map((item, index) => ({
        id: `${project.id || project._id}-risk-${index}`,
        title: item.Title || item.Description || 'Risk',
        owner: item['RAID Owner'] || item.Owner || item['Owner'] || item['Risk Owner'] || 'Unassigned',
        severity: item.Severity || 'High',
        type: 'Risk',
        dateRaised: item['Date Raised'],
        status: item.Status,
        raidId: item['RAID ID'] || item.ID
      }));
      const issues = (project.openCriticalIssuesDetails || []).map((item, index) => ({
        id: `${project.id || project._id}-issue-${index}`,
        title: item.Title || item.Description || item['Issue Title'] || 'Issue',
        owner: item['RAID Owner'] || item.Owner || item['Owner'] || 'Unassigned',
        severity: item.Severity || 'High',
        type: 'Issue',
        dateRaised: item['Date Raised'],
        status: item.Status,
        raidId: item['RAID ID'] || item.ID
      }));
      const items = [...risks, ...issues];
      if (!items.length) return [];
      return [{
        id: project.id || project._id,
        name: project.name,
        owner: getProjectOwner(project),
        client: project.clients || '—',
        ragStatus: project.ragStatus || 'Green',
        items
      }];
    });

    if (!searchQuery.trim()) return criticalItems;
    const term = searchQuery.toLowerCase();
    return criticalItems.filter(project =>
      project.name.toLowerCase().includes(term) ||
      project.owner.toLowerCase().includes(term) ||
      project.client.toLowerCase().includes(term)
    );
  };

  // Filter active projects based on search
  const getActiveProjects = () => {
    const active = projects.filter(p => isActiveStatus(p.status));
    if (!searchQuery.trim()) return active;
    const term = searchQuery.toLowerCase();
    return active.filter(project =>
      project.name.toLowerCase().includes(term) ||
      (project.clients || '').toLowerCase().includes(term) ||
      (project.status || '').toLowerCase().includes(term) ||
      (project.ragStatus || '').toLowerCase().includes(term)
    );
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
        maxWidth: '1000px', 
        width: '90%', 
        maxHeight: '80vh', 
        overflow: 'auto' 
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{getTitle()}</h2>
          <button type="button" onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          
          {/* Search for critical items */}
          {type === 'critical' && (
            <div className="critical-search" style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search by project, owner, or client"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Search for active projects */}
          {type === 'active' && (
            <div className="critical-search" style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search by project, client, status, or RAG"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* RAG Summary */}
          {type === 'rag' && (
            <div className="rag-summary-modal">
              {['green', 'amber', 'red'].map(status => (
                <div key={`rag-summary-${status}`} className={`rag-summary-card rag-summary-${status}`}>
                  <button
                    type="button"
                    className="rag-summary-header"
                    onClick={() => toggleExpand(status)}
                  >
                    <div className="rag-summary-header-left">
                      <div className="rag-summary-label">{status === 'green' ? 'Green' : status === 'amber' ? 'Amber' : 'Red'}</div>
                      <p className="rag-summary-helper">{(ragBuckets?.[status] || []).length} projects</p>
                    </div>
                    <div className="rag-summary-header-right">
                      <span className={`rag-summary-chevron ${expandedId === status ? 'open' : ''}`}>⌄</span>
                    </div>
                  </button>
                  {expandedId === status && (
                    <div className="rag-summary-projects">
                      {(ragBuckets?.[status] || []).length > 0 ? (
                        <ul className="rag-summary-list">
                          {(ragBuckets?.[status] || []).map(project => (
                            <li key={`rag-summary-${status}-${project.id || project._id}`} className="rag-summary-project-item">
                              <button
                                type="button"
                                className="rag-summary-project-header"
                                onClick={() => toggleExpand(`${status}-${project.id || project._id}`)}
                              >
                                <div className="rag-summary-project-name">{project.name}</div>
                                <span className={`rag-summary-chevron ${expandedId === `${status}-${project.id || project._id}` ? 'open' : ''}`}>⌄</span>
                              </button>
                              {expandedId === `${status}-${project.id || project._id}` && (
                                <div className="rag-summary-project-metrics">
                                  <span>{project.overdueMilestones || 0} overdue</span>
                                  <span>{project.openCriticalRisks || 0} risks</span>
                                  <span>{project.openCriticalIssues || 0} issues</span>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rag-summary-empty">No projects in this band</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Active Projects */}
          {type === 'active' && (
            <div className="rag-summary-modal">
              {getActiveProjects().length > 0 ? (
                <ul className="rag-summary-list">
                  {getActiveProjects().map(project => (
                    <li key={`active-${project.id || project._id}`} className="rag-summary-project-item">
                      <div className="rag-summary-project-header" style={{ cursor: 'default' }}>
                        <div className="rag-summary-project-name">{project.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', color: '#6b7280' }}>
                          <span>{getProjectOwner(project)}</span>
                          <span>{project.clients || '—'}</span>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px', 
                            fontWeight: 500,
                            background: project.status === 'On Track' ? '#d1fae5' : 
                                        project.status === 'On Hold' ? '#fef3c7' : 
                                        project.status === 'Delayed' ? '#fee2e2' : '#f3f4f6',
                            color: project.status === 'On Track' ? '#059669' : 
                                   project.status === 'On Hold' ? '#d97706' : 
                                   project.status === 'Delayed' ? '#dc2626' : '#6b7280'
                          }}>
                            {project.status || '—'}
                          </span>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rag-summary-empty">No active projects</p>
              )}
            </div>
          )}

          {/* Critical Items */}
          {type === 'critical' && (
            <div className="critical-accordion">
              {(() => {
                // Get active projects that have critical items (exclude completed/cancelled)
                const projectsWithCritical = projects.filter(project => 
                  isActiveStatus(project.status) &&
                  ((project.openCriticalRisksDetails?.length || 0) > 0 || 
                   (project.openCriticalIssuesDetails?.length || 0) > 0)
                );
                
                const filteredProjects = searchQuery.trim() 
                  ? projectsWithCritical.filter(project => 
                      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      getProjectOwner(project).toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (project.clients || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : projectsWithCritical;
                
                return filteredProjects.length > 0 ? (
                  filteredProjects.map(project => {
                    const itemCount = (project.openCriticalRisksDetails?.length || 0) + 
                                      (project.openCriticalIssuesDetails?.length || 0);
                    return (
                      <div key={`critical-project-${project.id || project._id}`} className="critical-project">
                        <button
                          type="button"
                          className="critical-project-header"
                          onClick={() => setSelectedProject(project)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="critical-project-info">
                            <div className="critical-project-name">{project.name}</div>
                            <div className="critical-meta">
                              <span>{getProjectOwner(project)}</span>
                              <span>•</span>
                              <span>{project.clients || '—'}</span>
                              <span>•</span>
                              <span>{itemCount} items</span>
                            </div>
                          </div>
                          <div className="critical-project-right">
                            <span className="critical-status-dot" style={{ backgroundColor: getRAGColor(project.ragStatus) }}></span>
                            <span className="critical-chevron">⌄</span>
                          </div>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="rag-summary-empty">No critical items found</p>
                );
              })()}
            </div>
          )}

          {/* Stale Projects */}
          {type === 'stale' && (
            <div className="stale-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* All Projects with Last Update */}
              <section>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>All Projects</h4>
                <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Project</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Owner</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(projects || []).filter(p => isActiveStatus(p.status)).map(project => (
                        <tr key={`all-${project.id || project._id}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px', color: '#111827' }}>{project.name}</td>
                          <td style={{ padding: '10px', color: '#6b7280' }}>{getProjectOwner(project)}</td>
                          <td style={{ padding: '10px', color: '#6b7280' }}>{project.status || '—'}</td>
                          <td style={{ padding: '10px', color: project.lastModified ? '#059669' : '#dc2626', fontWeight: 500 }}>
                            {project.lastModified ? formatDate(project.lastModified) : 'No data'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Missing Updates (7+ days) */}
              <section>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#b45309' }}>
                  Missing Updates (7+ days)
                </h4>
                {(() => {
                  const activeProjects = (projects || []).filter(p => isActiveStatus(p.status));
                  const stale = activeProjects.filter(p => p.lastModified && !p.hasData === false);
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  const missingUpdates = stale.filter(p => new Date(p.lastModified) < sevenDaysAgo);
                  
                  return missingUpdates.length > 0 ? (
                    <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #fed7aa', borderRadius: '8px', background: '#fffbeb' }}>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <tbody>
                          {missingUpdates.map(project => (
                            <tr key={`stale-${project.id || project._id}`} style={{ borderBottom: '1px solid #fed7aa' }}>
                              <td style={{ padding: '10px', color: '#92400e', fontWeight: 500 }}>{project.name}</td>
                              <td style={{ padding: '10px', color: '#b45309' }}>{formatDate(project.lastModified)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#6b7280', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                      All projects updated within the last 7 days
                    </p>
                  );
                })()}
              </section>

              {/* No Data */}
              <section>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#dc2626' }}>
                  No Data
                </h4>
                {(() => {
                  const activeProjects = (projects || []).filter(p => isActiveStatus(p.status));
                  const noData = activeProjects.filter(p => !p.hasData || !p.lastModified);
                  
                  return noData.length > 0 ? (
                    <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2' }}>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <tbody>
                          {noData.map(project => (
                            <tr key={`nodata-${project.id || project._id}`} style={{ borderBottom: '1px solid #fecaca' }}>
                              <td style={{ padding: '10px', color: '#dc2626', fontWeight: 500 }}>{project.name}</td>
                              <td style={{ padding: '10px', color: '#991b1b' }}>{getProjectOwner(project)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#6b7280', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                      All projects have data files
                    </p>
                  );
                })()}
              </section>
            </div>
          )}
        </div>
      </div>
      
      {/* Critical Items Detail Modal */}
      {selectedProject && (
        <CriticalItemsDetailModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
        />
      )}
    </div>
  );
};

export default SummaryModal;
