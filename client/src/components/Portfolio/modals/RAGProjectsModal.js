import React from 'react';
import { getRAGColor, isActiveStatus } from '../utils';
import './modals.css';

const RAGProjectsModal = ({ isOpen, onClose, projects }) => {
  if (!isOpen) return null;

  // Filter out completed/cancelled projects
  const activeProjects = (projects || []).filter(p => isActiveStatus(p.status));

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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects by RAG Status</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          {['Green', 'Amber', 'Red'].map(rag => {
            const projectsWithRAG = activeProjects.filter(p => 
              p.ragStatus?.toLowerCase() === rag.toLowerCase()
            );
            return (
              <div key={rag} style={{ marginBottom: '24px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    backgroundColor: getRAGColor(rag)
                  }} />
                  {rag} ({projectsWithRAG.length})
                </h3>
                {projectsWithRAG.length > 0 ? (
                  <table className="portfolio-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Status</th>
                        <th>% Complete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectsWithRAG.map(project => (
                        <tr key={project.id || project._id}>
                          <td>{project.name}</td>
                          <td>{project.status}</td>
                          <td>{project.percentComplete || 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No projects with {rag} status</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RAGProjectsModal;
