import React, { useState } from 'react';
import { getRAGColor } from '../utils';

const CriticalRisksModal = ({ isOpen, onClose, projects }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!isOpen) return null;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const projectsWithRisks = projects.filter(p => (p.openCriticalRisks || 0) > 0);

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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Open Critical Risks (High & Critical)</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <div className="rag-summary-modal">
            {projectsWithRisks.length > 0 ? (
              <ul className="rag-summary-list">
                {projectsWithRisks
                  .sort((a, b) => (b.openCriticalRisks || 0) - (a.openCriticalRisks || 0))
                  .map(project => (
                    <li key={`risks-${project.id}`} className="rag-summary-project-item">
                      <button
                        type="button"
                        className="rag-summary-project-header"
                        onClick={() => toggleExpand(`risks-${project.id}`)}
                      >
                        <div className="rag-summary-project-name">{project.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px' }}>{project.openCriticalRisks} risks</span>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                          <span className={`rag-summary-chevron ${expandedId === `risks-${project.id}` ? 'open' : ''}`}>⌄</span>
                        </div>
                      </button>
                      {expandedId === `risks-${project.id}` && project.openCriticalRisksDetails?.length > 0 && (
                        <div className="rag-summary-project-metrics" style={{ flexDirection: 'column', gap: '8px' }}>
                          {project.openCriticalRisksDetails.map((risk, idx) => (
                            <div key={idx} style={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              padding: '12px', 
                              background: '#fef2f2',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              marginBottom: '8px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600, color: '#991b1b' }}>{risk.Title || 'Unnamed Risk'}</span>
                                <span style={{ 
                                  padding: '2px 8px', 
                                  borderRadius: '4px', 
                                  fontSize: '11px', 
                                  fontWeight: 500,
                                  background: risk.Severity?.toLowerCase() === 'critical' ? '#fee2e2' : '#fef3c7',
                                  color: risk.Severity?.toLowerCase() === 'critical' ? '#dc2626' : '#d97706'
                                }}>
                                  {risk.Severity || 'High'}
                                </span>
                              </div>
                              <span style={{ fontSize: '12px', color: '#7f1d1d' }}>
                                Owner: {risk.Owner || 'Unassigned'}
                              </span>
                              {risk.Description && (
                                <span style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>
                                  {risk.Description}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="rag-summary-empty">No projects with open critical risks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriticalRisksModal;
