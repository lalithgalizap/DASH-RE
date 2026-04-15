import React, { useState } from 'react';
import { convertExcelDateToJS, getRAGColor } from '../utils';

const UpcomingMilestonesModal = ({ isOpen, onClose, projects }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!isOpen) return null;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const projectsWithUpcoming = projects.filter(p => (p.upcomingMilestones || 0) > 0);
  const todayCalc = new Date();
  todayCalc.setHours(0, 0, 0, 0);

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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Upcoming Milestones (Next 14 Days)</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <div className="rag-summary-modal">
            {projectsWithUpcoming.length > 0 ? (
              <ul className="rag-summary-list">
                {projectsWithUpcoming
                  .sort((a, b) => (b.upcomingMilestones || 0) - (a.upcomingMilestones || 0))
                  .map(project => (
                    <li key={`upcoming-${project.id}`} className="rag-summary-project-item">
                      <button
                        type="button"
                        className="rag-summary-project-header"
                        onClick={() => toggleExpand(`upcoming-${project.id}`)}
                      >
                        <div className="rag-summary-project-name">{project.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: '#3b82f6', fontWeight: '600', fontSize: '13px' }}>{project.upcomingMilestones} upcoming</span>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                          <span className={`rag-summary-chevron ${expandedId === `upcoming-${project.id}` ? 'open' : ''}`}>⌄</span>
                        </div>
                      </button>
                      {expandedId === `upcoming-${project.id}` && project.upcomingMilestoneDetails?.length > 0 && (
                        <div className="rag-summary-project-metrics" style={{ flexDirection: 'column', gap: '8px' }}>
                          {project.upcomingMilestoneDetails.map((milestone, idx) => {
                            const endDate = convertExcelDateToJS(milestone['Planned End Date']);
                            const daysUntilDue = endDate ? Math.ceil((endDate - todayCalc) / (1000 * 60 * 60 * 24)) : 0;
                            return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <span>{milestone['Milestone / Task Name'] || 'Unnamed'}</span>
                                <span style={{ color: '#3b82f6' }}>{daysUntilDue} days</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="rag-summary-empty">No projects with upcoming milestones</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingMilestonesModal;
