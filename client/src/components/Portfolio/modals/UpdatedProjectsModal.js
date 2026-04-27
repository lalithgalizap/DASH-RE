import React, { useState } from 'react';
import { getRAGColor } from '../utils';
import './modals.css';

const UpdatedProjectsModal = ({ isOpen, onClose, projects }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!isOpen) return null;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        maxWidth: '1000px', 
        maxHeight: '80vh', 
        overflow: 'auto', 
        width: '90%' 
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Project Data Status</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <div className="rag-summary-modal">
            {/* Updated This Week */}
            <div className="rag-summary-card rag-summary-green" style={{ marginBottom: '16px' }}>
              <div className="rag-summary-header" style={{ cursor: 'default' }}>
                <div className="rag-summary-header-left">
                  <div className="rag-summary-label">Updated This Week</div>
                  <p className="rag-summary-helper">{projects.updatedThisWeek?.length || 0} projects</p>
                </div>
              </div>
              {projects.updatedThisWeek?.length > 0 && (
                <div className="rag-summary-projects" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <ul className="rag-summary-list">
                    {projects.updatedThisWeek.map(project => (
                      <li key={`updated-${project.id}`} className="rag-summary-project-item">
                        <button
                          type="button"
                          className="rag-summary-project-header"
                          onClick={() => toggleExpand(`updated-${project.id}`)}
                        >
                          <div className="rag-summary-project-name">{project.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                            <span className={`rag-summary-chevron ${expandedId === `updated-${project.id}` ? 'open' : ''}`}>⌄</span>
                          </div>
                        </button>
                        {expandedId === `updated-${project.id}` && (
                          <div className="rag-summary-project-metrics">
                            <span>{new Date(project.lastModified).toLocaleDateString()}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Not Updated */}
            <div className="rag-summary-card rag-summary-amber" style={{ marginBottom: '16px' }}>
              <div className="rag-summary-header" style={{ cursor: 'default' }}>
                <div className="rag-summary-header-left">
                  <div className="rag-summary-label">Not Updated Recently</div>
                  <p className="rag-summary-helper">{projects.notUpdated?.length || 0} projects</p>
                </div>
              </div>
              {projects.notUpdated?.length > 0 && (
                <div className="rag-summary-projects" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <ul className="rag-summary-list">
                    {projects.notUpdated.map(project => (
                      <li key={`notupdated-${project.id}`} className="rag-summary-project-item">
                        <button
                          type="button"
                          className="rag-summary-project-header"
                          onClick={() => toggleExpand(`notupdated-${project.id}`)}
                        >
                          <div className="rag-summary-project-name">{project.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                            <span className={`rag-summary-chevron ${expandedId === `notupdated-${project.id}` ? 'open' : ''}`}>⌄</span>
                          </div>
                        </button>
                        {expandedId === `notupdated-${project.id}` && (
                          <div className="rag-summary-project-metrics">
                            <span>{project.lastModified ? new Date(project.lastModified).toLocaleDateString() : 'Unknown'}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* No Data */}
            <div className="rag-summary-card rag-summary-red">
              <div className="rag-summary-header" style={{ cursor: 'default' }}>
                <div className="rag-summary-header-left">
                  <div className="rag-summary-label">No Excel Data</div>
                  <p className="rag-summary-helper">{projects.noData?.length || 0} projects</p>
                </div>
              </div>
              {projects.noData?.length > 0 && (
                <div className="rag-summary-projects" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <ul className="rag-summary-list">
                    {projects.noData.map(project => (
                      <li key={`nodata-${project.id}`} className="rag-summary-project-item">
                        <button
                          type="button"
                          className="rag-summary-project-header"
                          onClick={() => toggleExpand(`nodata-${project.id}`)}
                        >
                          <div className="rag-summary-project-name">{project.name}</div>
                          <span className={`rag-summary-chevron ${expandedId === `nodata-${project.id}` ? 'open' : ''}`}>⌄</span>
                        </button>
                        {expandedId === `nodata-${project.id}` && (
                          <div className="rag-summary-project-metrics">
                            <span>{project.status || '—'}</span>
                            <span style={{ color: '#ef4444' }}>Upload Excel file</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatedProjectsModal;
