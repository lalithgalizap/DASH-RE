import React, { useState } from 'react';
import { getRAGColor, getProjectOwner, isActiveStatus } from '../utils';
import MilestoneDetailModal from './MilestoneDetailModal';

const OverdueMilestonesModal = ({ isOpen, onClose, projects }) => {
  const [selectedProject, setSelectedProject] = useState(null);

  if (!isOpen) return null;

  // Filter out completed/cancelled projects
  const activeProjects = (projects || []).filter(p => isActiveStatus(p.status));
  const projectsWithOverdue = activeProjects.filter(p => (p.overdueMilestones || 0) > 0);

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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Overdue Milestones</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <div className="critical-accordion">
            {projectsWithOverdue.length > 0 ? (
              projectsWithOverdue
                .sort((a, b) => (b.overdueMilestones || 0) - (a.overdueMilestones || 0))
                .map(project => (
                  <div key={`overdue-${project.id || project._id}`} className="critical-project">
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
                          <span>{project.overdueMilestones} overdue</span>
                        </div>
                      </div>
                      <div className="critical-project-right">
                        <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px', marginRight: '12px' }}>
                          {project.overdueMilestones} overdue
                        </span>
                        <span className="critical-status-dot" style={{ backgroundColor: getRAGColor(project.ragStatus) }}></span>
                        <span className="critical-chevron">⌄</span>
                      </div>
                    </button>
                  </div>
                ))
            ) : (
              <p className="rag-summary-empty">No projects with overdue milestones</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Milestone Detail Modal */}
      {selectedProject && (
        <MilestoneDetailModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
          type="overdue"
        />
      )}
    </div>
  );
};

export default OverdueMilestonesModal;
