import React from 'react';

const RAGCategoryModal = ({
  isOpen,
  onClose,
  modalData,
  onProjectSelect
}) => {
  if (!isOpen || !modalData) return null;

  const { title, projects } = modalData;

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
        maxWidth: '900px', 
        width: '90%', 
        maxHeight: '85vh', 
        overflow: 'auto' 
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{title} Projects ({projects.length})</h2>
          <button type="button" onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          {projects.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>No projects in this category</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map(project => {
                const projectId = project.id || project._id;

                return (
                  <div
                    key={projectId}
                    className="rag-modal-project-card"
                    onClick={() => onProjectSelect(project)}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{project.name}</span>
                      <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '12px' }}>{project.clients || 'Client TBD'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {project.overdueMilestones > 0 && (
                        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>🔴 {project.overdueMilestones}</span>
                      )}
                      {project.upcomingMilestones > 0 && (
                        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>🟡 {project.upcomingMilestones}</span>
                      )}
                      {project.openCriticalRisks > 0 && (
                        <span style={{ fontSize: '12px', color: '#ef4444' }}>🔴 {project.openCriticalRisks}</span>
                      )}
                      {project.openCriticalIssues > 0 && (
                        <span style={{ fontSize: '12px', color: '#f59e0b' }}>⚠️ {project.openCriticalIssues}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RAGCategoryModal;
