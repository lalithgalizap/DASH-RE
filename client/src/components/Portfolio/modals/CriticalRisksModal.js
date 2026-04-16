import React, { useState } from 'react';
import { getRAGColor, getProjectOwner } from '../utils';
import RiskDetailModal from './RiskDetailModal';

const CriticalRisksModal = ({ isOpen, onClose, projects }) => {
  const [selectedProject, setSelectedProject] = useState(null);

  if (!isOpen) return null;

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
        maxWidth: '800px', 
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
          <div className="critical-accordion">
            {projectsWithRisks.length > 0 ? (
              projectsWithRisks
                .sort((a, b) => (b.openCriticalRisks || 0) - (a.openCriticalRisks || 0))
                .map(project => (
                  <div key={`risks-${project.id || project._id}`} className="critical-project">
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
                          <span>{project.openCriticalRisks} risks</span>
                        </div>
                      </div>
                      <div className="critical-project-right">
                        <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px', marginRight: '12px' }}>
                          {project.openCriticalRisks} risks
                        </span>
                        <span className="critical-status-dot" style={{ backgroundColor: getRAGColor(project.ragStatus) }}></span>
                        <span className="critical-chevron">⌄</span>
                      </div>
                    </button>
                  </div>
                ))
            ) : (
              <p className="rag-summary-empty">No projects with open critical risks</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Risk Detail Modal */}
      {selectedProject && (
        <RiskDetailModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
        />
      )}
    </div>
  );
};

export default CriticalRisksModal;
