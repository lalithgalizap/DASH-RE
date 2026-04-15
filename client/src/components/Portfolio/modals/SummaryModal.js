import React, { useState } from 'react';
import { getRAGColor, getProjectOwner, isActiveStatus, formatDate } from '../utils';

const SummaryModal = ({ 
  type, 
  onClose, 
  projects, 
  ragBuckets,
  staleProjectsList 
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!type) return null;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getTitle = () => {
    switch (type) {
      case 'active': return 'Active Projects';
      case 'rag': return 'Projects by RAG';
      case 'critical': return 'Portfolio Critical Items';
      case 'stale': return 'Stale or Missing Updates';
      default: return '';
    }
  };

  // Filter projects based on search for critical items
  const getCriticalProjects = () => {
    const criticalItems = projects.flatMap(project => {
      const risks = (project.openCriticalRisksDetails || []).map((item, index) => ({
        id: `${project.id || project._id}-risk-${index}`,
        title: item.Title || item.Description || 'Risk',
        owner: item.Owner || 'Unassigned',
        severity: item.Severity || 'High',
        type: 'Risk'
      }));
      const issues = (project.openCriticalIssuesDetails || []).map((item, index) => ({
        id: `${project.id || project._id}-issue-${index}`,
        title: item.Title || item.Description || item['Issue Title'] || 'Issue',
        owner: item.Owner || 'Unassigned',
        severity: item.Severity || 'High',
        type: 'Issue'
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
                      <button
                        type="button"
                        className="rag-summary-project-header"
                        onClick={() => toggleExpand(`active-${project.id || project._id}`)}
                      >
                        <div className="rag-summary-project-name">{project.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                          <span className={`rag-summary-chevron ${expandedId === `active-${project.id || project._id}` ? 'open' : ''}`}>⌄</span>
                        </div>
                      </button>
                      {expandedId === `active-${project.id || project._id}` && (
                        <div className="rag-summary-project-metrics">
                          <span>{getProjectOwner(project)}</span>
                          <span>{project.clients || '—'}</span>
                          <span>{project.status || '—'}</span>
                        </div>
                      )}
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
              {getCriticalProjects().map(project => (
                <div key={`critical-modal-project-${project.id}`} className="critical-project">
                  <button
                    type="button"
                    className="critical-project-header"
                    onClick={() => toggleExpand(project.id)}
                  >
                    <div className="critical-project-info">
                      <div className="critical-project-name">{project.name}</div>
                      <div className="critical-meta">
                        <span>{project.owner}</span>
                        <span>•</span>
                        <span>{project.client}</span>
                        <span>•</span>
                        <span>{project.items.length} items</span>
                      </div>
                    </div>
                    <div className="critical-project-right">
                      <span className="critical-status-dot" style={{ backgroundColor: getRAGColor(project.ragStatus) }}></span>
                      <span className={`critical-chevron ${expandedId === project.id ? 'open' : ''}`}>⌄</span>
                    </div>
                  </button>
                  {expandedId === project.id && (
                    <ul className="critical-list">
                      {project.items.map(item => (
                        <li key={item.id} className={`critical-item critical-${item.type.toLowerCase()}`}>
                          <div className="critical-type">{item.type}</div>
                          <div className="critical-title">{item.title}</div>
                          <div className="critical-meta">
                            <span>{item.owner}</span>
                            <span>•</span>
                            <span>{item.severity}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {getCriticalProjects().length === 0 && (
                <p className="rag-summary-empty">No critical items found</p>
              )}
            </div>
          )}

          {/* Stale Projects */}
          {type === 'stale' && (
            <div className="rag-summary-modal">
              {(staleProjectsList || []).length > 0 ? (
                <ul className="rag-summary-list">
                  {(staleProjectsList || []).map(project => (
                    <li key={`stale-${project.id || project._id}`} className="rag-summary-project-item">
                      <button
                        type="button"
                        className="rag-summary-project-header"
                        onClick={() => toggleExpand(`stale-${project.id || project._id}`)}
                      >
                        <div className="rag-summary-project-name">{project.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                          <span className={`rag-summary-chevron ${expandedId === `stale-${project.id || project._id}` ? 'open' : ''}`}>⌄</span>
                        </div>
                      </button>
                      {expandedId === `stale-${project.id || project._id}` && (
                        <div className="rag-summary-project-metrics">
                          <span>{project.status || '—'}</span>
                          <span>{project.lastModified ? formatDate(project.lastModified) : 'No data'}</span>
                          <span>{project.clients || '—'}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rag-summary-empty">No stale or missing updates</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
