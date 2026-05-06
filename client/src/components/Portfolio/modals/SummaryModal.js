import React, { useState } from 'react';
import { getRAGColor, getProjectOwner, isActiveStatus, formatDate } from '../utils';
import CriticalItemsDetailModal from './CriticalItemsDetailModal';
import './modals.css';

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
        maxWidth: type === 'rag' ? '900px' : '1000px', 
        width: '95%', 
        height: (type === 'rag' || type === 'stale') ? '600px' : undefined,
        maxHeight: '80vh', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{getTitle()}</h2>
          <button type="button" onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px', flex: 1, overflowY: (type === 'rag' || type === 'stale') ? 'hidden' : 'auto', display: (type === 'rag' || type === 'stale') ? 'flex' : 'block', flexDirection: 'column' }}>
          
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

          {/* RAG Summary — 3 columns: Red | Amber | Green */}
          {type === 'rag' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              {/* Search bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '8px', padding: '8px 12px', flexShrink: 0
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search projects by name, owner or client..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: '13px', color: '#0f172a', background: 'transparent'
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: '0 2px'
                  }}>×</button>
                )}
              </div>

              {/* 3 columns */}
              <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
              {[
                { key: 'red',   label: 'Red',     sublabel: 'Critical',  color: '#dc2626', lightColor: '#ef4444', bg: '#fef2f2', border: '#fecaca', headerBg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' },
                { key: 'amber', label: 'Amber',   sublabel: 'Caution',   color: '#d97706', lightColor: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', headerBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' },
                { key: 'green', label: 'Green',   sublabel: 'On Track',  color: '#059669', lightColor: '#22c55e', bg: '#f0fdf4', border: '#86efac', headerBg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' },
              ].map(rag => {
                const allList = ragBuckets?.[rag.key] || [];
                const list = searchQuery.trim()
                  ? allList.filter(p =>
                      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      getProjectOwner(p)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (p.clients || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : allList;
                return (
                  <div key={rag.key} style={{
                    flex: 1,
                    border: `1px solid ${rag.border}`,
                    borderRadius: '12px',
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    minWidth: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}>
                    {/* Column header */}
                    <div style={{
                      background: rag.headerBg,
                      borderBottom: `1px solid ${rag.border}`,
                      padding: '12px 16px',
                      flexShrink: 0
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: rag.lightColor, flexShrink: 0,
                            boxShadow: `0 0 0 3px ${rag.border}`
                          }} />
                          <span style={{ fontWeight: 700, fontSize: '14px', color: rag.color }}>
                            {rag.label}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '13px', fontWeight: 700,
                          color: rag.color, background: 'white',
                          border: `1px solid ${rag.border}`, borderRadius: '20px',
                          padding: '2px 10px', minWidth: '28px', textAlign: 'center'
                        }}>
                          {searchQuery ? `${list.length}/${allList.length}` : list.length}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: rag.color, opacity: 0.7, marginTop: '2px', paddingLeft: '18px' }}>
                        {rag.sublabel}
                      </div>
                    </div>

                    {/* Scrollable project list */}
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                      {list.length === 0 ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          height: '100%', padding: '24px',
                          fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center'
                        }}>
                          {searchQuery ? 'No matches' : 'No projects in this band'}
                        </div>
                      ) : (
                        list.map((project, idx) => (
                          <div key={project.id || project._id} style={{
                            padding: '10px 16px',
                            borderBottom: idx < list.length - 1 ? `1px solid ${rag.border}` : 'none',
                            background: idx % 2 === 0 ? 'white' : rag.bg
                          }}>
                            <div style={{
                              fontSize: '13px', fontWeight: 600, color: '#0f172a',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              marginBottom: '3px'
                            }}>
                              {project.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {getProjectOwner(project) && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{getProjectOwner(project)}</span>
                              )}
                              {project.status && (
                                <span style={{
                                  fontSize: '10px', fontWeight: 600, padding: '1px 6px',
                                  borderRadius: '4px', background: '#f1f5f9', color: '#475569'
                                }}>{project.status}</span>
                              )}
                              <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: rag.color }}>
                                {project.projectCompletion ?? project.percentComplete ?? 0}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
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

          {/* Stale Projects — 3 columns: Updated | Stale | No Data */}
          {type === 'stale' && (() => {
            const activeProjects = (projects || []).filter(p => isActiveStatus(p.status));
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const term = searchQuery.toLowerCase().trim();
            const matches = p => !term ||
              p.name?.toLowerCase().includes(term) ||
              getProjectOwner(p)?.toLowerCase().includes(term);

            const updatedList   = activeProjects.filter(p => p.hasData && p.lastModified && new Date(p.lastModified) >= sevenDaysAgo).filter(matches);
            const staleList     = activeProjects.filter(p => p.hasData && p.lastModified && new Date(p.lastModified) < sevenDaysAgo).filter(matches);
            const noDataList    = activeProjects.filter(p => !p.hasData || !p.lastModified).filter(matches);

            const cols = [
              {
                key: 'updated',
                label: 'Up to Date',
                sublabel: 'Updated within 7 days',
                color: '#059669',
                lightColor: '#22c55e',
                bg: '#f0fdf4',
                border: '#86efac',
                headerBg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                list: updatedList,
                renderSub: p => formatDate(p.lastModified),
                subColor: '#059669'
              },
              {
                key: 'stale',
                label: 'Needs Update',
                sublabel: 'Not updated in 7+ days',
                color: '#d97706',
                lightColor: '#f59e0b',
                bg: '#fffbeb',
                border: '#fcd34d',
                headerBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                list: staleList,
                renderSub: p => formatDate(p.lastModified),
                subColor: '#b45309'
              },
              {
                key: 'nodata',
                label: 'No Data',
                sublabel: 'No file uploaded',
                color: '#dc2626',
                lightColor: '#ef4444',
                bg: '#fef2f2',
                border: '#fecaca',
                headerBg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                list: noDataList,
                renderSub: () => 'No file',
                subColor: '#dc2626'
              },
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                {/* Search bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '8px', padding: '8px 12px', flexShrink: 0
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search projects by name or owner..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: '#0f172a', background: 'transparent' }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>×</button>
                  )}
                </div>

                {/* 3 columns */}
                <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {cols.map(col => (
                    <div key={col.key} style={{
                      flex: 1, border: `1px solid ${col.border}`, borderRadius: '12px',
                      background: 'white', display: 'flex', flexDirection: 'column',
                      overflow: 'hidden', minWidth: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}>
                      {/* Column header */}
                      <div style={{ background: col.headerBg, borderBottom: `1px solid ${col.border}`, padding: '12px 16px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.lightColor, flexShrink: 0, boxShadow: `0 0 0 3px ${col.border}` }} />
                            <span style={{ fontWeight: 700, fontSize: '14px', color: col.color }}>{col.label}</span>
                          </div>
                          <span style={{
                            fontSize: '13px', fontWeight: 700, color: col.color,
                            background: 'white', border: `1px solid ${col.border}`,
                            borderRadius: '20px', padding: '2px 10px', minWidth: '28px', textAlign: 'center'
                          }}>
                            {searchQuery ? `${col.list.length}/${activeProjects.filter(p =>
                              col.key === 'updated' ? (p.hasData && p.lastModified && new Date(p.lastModified) >= sevenDaysAgo) :
                              col.key === 'stale'   ? (p.hasData && p.lastModified && new Date(p.lastModified) < sevenDaysAgo) :
                              (!p.hasData || !p.lastModified)
                            ).length}` : col.list.length}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: col.color, opacity: 0.7, marginTop: '2px', paddingLeft: '18px' }}>{col.sublabel}</div>
                      </div>

                      {/* Scrollable list — max 6 items visible, then scroll */}
                      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                        {col.list.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                            {searchQuery ? 'No matches' : 'No projects'}
                          </div>
                        ) : (
                          col.list.map((project, idx) => (
                            <div key={project.id || project._id} style={{
                              padding: '9px 14px',
                              borderBottom: idx < col.list.length - 1 ? `1px solid ${col.border}` : 'none',
                              background: idx % 2 === 0 ? 'white' : col.bg
                            }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                                {project.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{getProjectOwner(project) || 'Unassigned'}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: col.subColor, flexShrink: 0 }}>
                                  {col.renderSub(project)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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
