import React, { useState, useMemo } from 'react';
import { getRAGColor, getProjectOwner, formatDate, formatDateDisplay } from './utils';

const ProjectsTable = ({ 
  projects, 
  onProjectClick
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Sort by last modified (most recent first)
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const dateA = new Date(a.lastModified || a.updated_at || 0);
      const dateB = new Date(b.lastModified || b.updated_at || 0);
      return dateB - dateA;
    });
  }, [projects]);

  // Show only top 3 unless expanded
  const displayedProjects = showAll ? sortedProjects : sortedProjects.slice(0, 3);
  const hiddenCount = projects.length - 3;

  return (
    <div className="portfolio-table-section">
      <div className="portfolio-table-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>All Projects</h3>
        <span className="project-count">{projects.length} projects</span>
        <button className={`collapse-btn ${isCollapsed ? 'collapsed' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      
      {!isCollapsed && (
        <>
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Owner</th>
              <th>Client</th>
              <th>Overdue</th>
              <th>Upcoming</th>
              <th>Risks</th>
              <th>Issues</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {displayedProjects.map(project => (
              <tr key={project._id || project.id} className="project-row">
                  <td onClick={() => onProjectClick(project)} style={{ cursor: 'pointer' }}>
                    <div className="project-name-cell clickable">
                      {project.name}
                      <svg className="external-link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </div>
                  </td>
                  <td>{getProjectOwner(project)}</td>
                  <td>{project.clients || '—'}</td>
                  <td className="number-cell">{project.overdueMilestones}</td>
                  <td className="number-cell">{project.upcomingMilestones}</td>
                  <td className="number-cell">{project.openCriticalRisks}</td>
                  <td className="number-cell">{project.openCriticalIssues}</td>
                  <td className="date-cell">{formatDate(project.lastModified || project.updated_at)}</td>
                </tr>
            ))}
          </tbody>
        </table>
        
        {hiddenCount > 0 && !showAll && (
          <div className="show-all-projects">
            <button onClick={() => setShowAll(true)}>
              Show all {projects.length} projects
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        )}
        
        {showAll && hiddenCount > 0 && (
          <div className="show-all-projects">
            <button onClick={() => setShowAll(false)}>
              Show less
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: 'rotate(180deg)' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default ProjectsTable;
