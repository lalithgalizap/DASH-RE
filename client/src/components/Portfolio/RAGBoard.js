import React, { useState, useMemo } from 'react';
import RAGProjectCard from './RAGProjectCard';
import RAGProjectCardCompact from './RAGProjectCardCompact';

const RAGBoard = ({ 
  projects, 
  onProjectClick,
  onMilestoneClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [collapsedColumns, setCollapsedColumns] = useState({});

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const term = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.name.toLowerCase().includes(term) ||
      (project.clients || '').toLowerCase().includes(term) ||
      (project.status || '').toLowerCase().includes(term) ||
      (project.ragStatus || '').toLowerCase().includes(term) ||
      (project.project_owner || '').toLowerCase().includes(term)
    );
  }, [projects, searchQuery]);

  // Group by RAG status
  const ragBuckets = useMemo(() => ({
    red: filteredProjects.filter(p => p.ragStatus?.toLowerCase() === 'red'),
    amber: filteredProjects.filter(p => p.ragStatus?.toLowerCase() === 'amber'),
    green: filteredProjects.filter(p => p.ragStatus?.toLowerCase() === 'green')
  }), [filteredProjects]);

  const handleToggleExpand = (projectId) => {
    setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
  };

  const toggleColumn = (column) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const renderColumn = (key, title, colorConfig, projects) => {
    const isCollapsed = collapsedColumns[key];
    const count = projects.length;
    const hasExpanded = expandedProjectId && projects.some(p => (p.id || p._id) === expandedProjectId);

    return (
      <div className={`rag-column rag-column-${key} ${isCollapsed ? 'collapsed' : ''}`}>
        <div 
          className="rag-column-header"
          style={{ background: colorConfig.bg, borderBottomColor: colorConfig.border }}
          onClick={() => toggleColumn(key)}
        >
          <span className="rag-column-indicator" style={{ background: colorConfig.dot }} />
          <span className="rag-column-title" style={{ color: colorConfig.text }}>{title}</span>
          <span className="rag-column-count" style={{ 
            color: colorConfig.countText, 
            background: colorConfig.countBg 
          }}>
            {count}
          </span>
          <span className={`rag-column-chevron ${isCollapsed ? 'collapsed' : ''}`}>⌄</span>
        </div>
        
        {!isCollapsed && (
          <div className="rag-column-content">
            {projects.map(project => {
              const projectId = project.id || project._id;
              const isExpanded = expandedProjectId === projectId;
              
              return (
                <div key={projectId} className="rag-project-wrapper">
                  {isExpanded ? (
                    <RAGProjectCard
                      project={project}
                      isExpanded={true}
                      onToggle={() => handleToggleExpand(projectId)}
                      onMilestoneClick={onMilestoneClick}
                      onClick={() => onProjectClick(project)}
                    />
                  ) : (
                    <RAGProjectCardCompact
                      project={project}
                      onClick={() => onProjectClick(project)}
                      onToggle={() => handleToggleExpand(projectId)}
                    />
                  )}
                </div>
              );
            })}
            
            {count === 0 && (
              <div className="rag-empty-state">
                No {key} projects
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rag-board">
      {/* Modern Search Bar */}
      <div className="rag-board-search-container">
        <div className="rag-search-wrapper">
          <svg className="rag-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search projects by name, client, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="rag-search-clear" onClick={() => setSearchQuery('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        
        {searchQuery && (
          <div className="rag-search-results">
            Showing {filteredProjects.length} of {projects?.length || 0} projects
          </div>
        )}
      </div>

      {/* RAG Columns - Modern Grid */}
      <div className="rag-board-grid">
        {renderColumn('red', 'Critical', {
          bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '#fecaca',
          dot: '#ef4444',
          text: '#991b1b',
          countText: '#dc2626',
          countBg: '#fecaca'
        }, ragBuckets.red)}
        
        {renderColumn('amber', 'Caution', {
          bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '#fcd34d',
          dot: '#f59e0b',
          text: '#92400e',
          countText: '#d97706',
          countBg: '#fcd34d'
        }, ragBuckets.amber)}
        
        {renderColumn('green', 'On Track', {
          bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '#86efac',
          dot: '#10b981',
          text: '#166534',
          countText: '#059669',
          countBg: '#86efac'
        }, ragBuckets.green)}
      </div>
    </div>
  );
};

export default RAGBoard;
