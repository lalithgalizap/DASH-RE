import React, { useState, useMemo } from 'react';
import { getRAGColor, getProjectOwner, isActiveStatus } from '../utils';
import MilestoneDetailModal from './MilestoneDetailModal';
import ViewToggle from './ViewToggle';
import ChartView from './ChartView';

const UpcomingMilestonesModal = ({ isOpen, onClose, projects }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'chart'

  // Filter out completed/cancelled projects
  const activeProjects = (projects || []).filter(p => isActiveStatus(p.status));
  const projectsWithUpcoming = activeProjects.filter(p => (p.upcomingMilestones || 0) > 0);

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projectsWithUpcoming;
    const term = searchTerm.toLowerCase();
    return projectsWithUpcoming.filter(p => 
      (p.name?.toLowerCase() || '').includes(term) ||
      (getProjectOwner(p)?.toLowerCase() || '').includes(term)
    );
  }, [projectsWithUpcoming, searchTerm]);

  if (!isOpen) return null;

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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Upcoming Milestones</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          {/* View Toggle + Search */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
            gap: '12px'
          }}>
            <ViewToggle view={viewMode} onChange={setViewMode} />
            
            {viewMode === 'list' && projectsWithUpcoming.length > 4 && (
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    pointerEvents: 'none'
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects or owners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 40px',
                    fontSize: '13px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>
          
          {viewMode === 'list' && searchTerm && (
            <div style={{ 
              marginBottom: '12px', 
              fontSize: '12px', 
              color: '#6b7280'
            }}>
              Showing {filteredProjects.length} of {projectsWithUpcoming.length} projects
            </div>
          )}

          {/* Content Area */}
          {viewMode === 'list' ? (
            <div style={{ 
              maxHeight: '350px', 
              overflowY: 'auto'
            }}>
              <div className="critical-accordion" style={{ border: 'none' }}>
                {filteredProjects.length > 0 ? (
                  filteredProjects
                    .sort((a, b) => (b.upcomingMilestones || 0) - (a.upcomingMilestones || 0))
                    .map(project => (
                      <div key={`upcoming-${project.id || project._id}`} className="critical-project">
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
                              <span>{project.upcomingMilestones} upcoming</span>
                            </div>
                          </div>
                          <div className="critical-project-right">
                            <span style={{ color: '#3b82f6', fontWeight: '600', fontSize: '13px', marginRight: '12px' }}>
                              {project.upcomingMilestones} upcoming
                            </span>
                            <span className="critical-status-dot" style={{ backgroundColor: getRAGColor(project.ragStatus) }}></span>
                            <span className="critical-chevron">⌄</span>
                          </div>
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="rag-summary-empty" style={{ padding: '40px 20px' }}>
                    {searchTerm ? 'No projects match your search' : 'No projects with upcoming milestones'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <ChartView 
              data={filteredProjects}
              metricKey="upcomingMilestones"
              metricLabel="upcoming milestones"
              color="#3b82f6"
              onBarClick={setSelectedProject}
            />
          )}
        </div>
      </div>
      
      {/* Milestone Detail Modal */}
      {selectedProject && (
        <MilestoneDetailModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
          type="upcoming"
        />
      )}
    </div>
  );
};

export default UpcomingMilestonesModal;
