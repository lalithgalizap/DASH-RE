import React from 'react';
import { getRAGColor, getProjectOwner, formatDate, formatDateDisplay } from './utils';

const ProjectsTable = ({ 
  projects, 
  expandedProject, 
  onToggleExpand 
}) => {
  return (
    <div className="portfolio-table-section">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Owner</th>
            <th>Client</th>
            <th>RAG</th>
            <th>Overdue</th>
            <th>Upcoming</th>
            <th>Risks</th>
            <th>Issues</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <React.Fragment key={project._id || project.id}>
              <tr 
                onClick={() => onToggleExpand(expandedProject === project.id ? null : project.id)} 
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <div className="project-name-cell">
                    {project.name}
                    <div className="project-identifier">{project.project_identifier || 'No ID'}</div>
                  </div>
                </td>
                <td>{getProjectOwner(project)}</td>
                <td>{project.clients || '—'}</td>
                <td>
                  <div className="rag-cell">
                    <span 
                      className="rag-indicator" 
                      style={{ backgroundColor: getRAGColor(project.ragStatus) }}
                    />
                    <span className="rag-text">{project.ragStatus || 'Green'}</span>
                  </div>
                </td>
                <td className="number-cell">{project.overdueMilestones}</td>
                <td className="number-cell">{project.upcomingMilestones}</td>
                <td className="number-cell">{project.openCriticalRisks}</td>
                <td className="number-cell">{project.openCriticalIssues}</td>
                <td className="date-cell">{formatDate(project.lastUpdated || project.updated_at)}</td>
              </tr>
              {expandedProject === project.id && (
                <tr className="expanded-row">
                  <td colSpan="9">
                    <div className="expanded-content">
                      <div>
                        <h4>Overdue Milestones</h4>
                        {project.overdueMilestoneDetails?.length ? (
                          <ul>
                            {project.overdueMilestoneDetails.map((milestone, index) => (
                              <li key={index}>
                                <strong>
                                  {milestone['Milestone Name'] || milestone['Milestone'] || `Milestone ${index + 1}`}
                                </strong>
                                <span> — Planned End: {formatDateDisplay(milestone['Planned End Date'])}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>No overdue milestones</p>
                        )}
                      </div>
                      <div>
                        <h4>Upcoming Milestones (14 days)</h4>
                        {project.upcomingMilestoneDetails?.length ? (
                          <ul>
                            {project.upcomingMilestoneDetails.map((milestone, index) => (
                              <li key={index}>
                                <strong>
                                  {milestone['Milestone Name'] || milestone['Milestone'] || `Milestone ${index + 1}`}
                                </strong>
                                <span> — Planned End: {formatDateDisplay(milestone['Planned End Date'])}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>No upcoming milestones</p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectsTable;
