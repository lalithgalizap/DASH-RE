import React, { useState, useMemo } from 'react';
import { Edit2, Download } from 'lucide-react';
import { getRAGColor } from './utils';
import EditProjectDetailModal from './modals/EditProjectDetailModal';

function DetailedProjectsTable({ projects, onProjectClick, onProjectUpdate }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Sort by last modified (most recent first)
  const sortedProjects = useMemo(() => {
    const getTimestamp = (project) => new Date(
      project.dashboardUpdatedAt || project.lastModified || project.updated_at || 0
    );
    return [...projects].sort((a, b) => {
      const dateA = getTimestamp(a);
      const dateB = getTimestamp(b);
      return dateB - dateA;
    });
  }, [projects]);

  // Show only top 3 unless expanded
  const displayedProjects = showAll ? sortedProjects : sortedProjects.slice(0, 3);
  const hiddenCount = projects.length - 3;

  const getRAGColor = (ragStatus) => {
    switch (ragStatus?.toLowerCase()) {
      case 'red':
        return '#ef4444';
      case 'amber':
        return '#f59e0b';
      case 'green':
        return '#10b981';
      default:
        return '#9ca3af';
    }
  };

  const formatUpdatedAt = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleExport = () => {
    // CSV headers
    const headers = ['Project Name', 'SPOC', 'RAG', 'Status', 'Action Item', 'Risk Summary', 'Mitigation Plan', 'Updated At'];

    // CSV rows
    const rows = sortedProjects.map(project => [
      project.name || '',
      project.spoc || '',
      project.ragStatus || 'Green',
      project.sowStatus || '',
      project.actionItem || '',
      project.riskSummary || '',
      project.mitigationPlan || '',
      formatUpdatedAt(project.dashboardUpdatedAt)
    ]);

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => {
          // Escape cells that contain commas, quotes, or newlines
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'portfolio_detailed_view.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="portfolio-table-section">
      <div className="portfolio-table-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>All Projects</h3>
        <span className="project-count">{projects.length} projects</span>
        <button
          className="export-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleExport();
          }}
          title="Export to CSV"
        >
          <Download size={16} />
          Export
        </button>
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
                <th>Project Name</th>
                <th>SPOC</th>
                <th>RAG</th>
                <th>Status</th>
                <th>Action Item</th>
                <th>Risk Summary</th>
                <th>Mitigation Plan</th>
                <th>Updated At</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedProjects.map((project) => (
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
                  <td>
                    <div className="spoc-name" style={{ fontSize: '13px', color: '#374151' }}>
                      {project.spoc || '—'}
                    </div>
                  </td>
                  <td>
                    <div className="rag-cell">
                      <span
                        className="rag-indicator"
                        style={{ backgroundColor: getRAGColor(project.ragStatus) }}
                      />
                      <span className="rag-text">{project.ragStatus || 'Green'}</span>
                    </div>
                  </td>
                  <td>
                    <div
                      className="tooltip-cell"
                      style={{ fontSize: '13px', color: '#374151', cursor: 'help' }}
                      title={project.sowStatus || '—'}
                      data-tooltip={project.sowStatus || '—'}
                    >
                      {project.sowStatus || '—'}
                    </div>
                  </td>
                  <td>
                    <div
                      className="tooltip-cell"
                      style={{ fontSize: '13px', color: '#374151', cursor: 'help' }}
                      title={project.actionItem || '—'}
                      data-tooltip={project.actionItem || '—'}
                    >
                      <span className="ellipsis-text">
                        {project.actionItem || '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div
                      className="tooltip-cell"
                      style={{ fontSize: '13px', color: '#374151', cursor: 'help' }}
                      title={project.riskSummary || '—'}
                      data-tooltip={project.riskSummary || '—'}
                    >
                      <span className="ellipsis-text">
                        {project.riskSummary || '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div
                      className="tooltip-cell"
                      style={{ fontSize: '13px', color: '#374151', cursor: 'help' }}
                      title={project.mitigationPlan || '—'}
                      data-tooltip={project.mitigationPlan || '—'}
                    >
                      <span className="ellipsis-text">
                        {project.mitigationPlan || '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div
                      className="tooltip-cell"
                      style={{ fontSize: '13px', color: '#374151' }}
                      title={formatUpdatedAt(project.dashboardUpdatedAt)}
                    >
                      {formatUpdatedAt(project.dashboardUpdatedAt)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="action-btn edit-btn"
                      onClick={() => setEditingProject(project)}
                      title="Edit Details"
                    >
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {projects.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              No projects found
            </div>
          )}

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

      <EditProjectDetailModal
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSave={(updatedProject) => {
          if (onProjectUpdate) {
            onProjectUpdate(updatedProject);
          }
          setEditingProject(null);
        }}
      />
    </div>
  );
}

export default DetailedProjectsTable;
