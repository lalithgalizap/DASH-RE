import React, { useState, useMemo } from 'react';
import RAGProjectCard from './RAGProjectCard';

const RAGBoard = ({ 
  projects, 
  onProjectClick,
  onMilestoneClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState(null);

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

  return (
    <div className="rag-board">
      {/* Search */}
      <div className="rag-board-search-container" style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Search Projects:</span>
        <input
          type="text"
          placeholder="Search by project name, client, or owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            maxWidth: '400px',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* RAG Columns */}
      <div className="rag-board-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '0 24px' }}>
        {/* Red Column */}
        <div className="rag-column rag-column-red">
          <div className="rag-column-header" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 16px', 
            background: '#fef2f2',
            borderRadius: '8px 8px 0 0',
            borderBottom: '2px solid #fecaca'
          }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: '#ef4444' 
            }} />
            <span style={{ fontWeight: 600, color: '#991b1b' }}>Critical</span>
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '14px', 
              fontWeight: 600, 
              color: '#dc2626',
              background: '#fee2e2',
              padding: '2px 10px',
              borderRadius: '12px'
            }}>
              {ragBuckets.red.length}
            </span>
          </div>
          <div className="rag-column-content" style={{ padding: '12px', background: '#fafafa', minHeight: '400px' }}>
            {ragBuckets.red.map(project => (
              <RAGProjectCard
                key={project.id || project._id}
                project={project}
                isExpanded={expandedProjectId === (project.id || project._id)}
                onToggle={() => handleToggleExpand(project.id || project._id)}
                onMilestoneClick={onMilestoneClick}
                onClick={() => onProjectClick(project)}
              />
            ))}
            {ragBuckets.red.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                No critical projects
              </div>
            )}
          </div>
        </div>

        {/* Amber Column */}
        <div className="rag-column rag-column-amber">
          <div className="rag-column-header" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 16px', 
            background: '#fffbeb',
            borderRadius: '8px 8px 0 0',
            borderBottom: '2px solid #fcd34d'
          }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: '#f59e0b' 
            }} />
            <span style={{ fontWeight: 600, color: '#92400e' }}>Caution</span>
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '14px', 
              fontWeight: 600, 
              color: '#d97706',
              background: '#fef3c7',
              padding: '2px 10px',
              borderRadius: '12px'
            }}>
              {ragBuckets.amber.length}
            </span>
          </div>
          <div className="rag-column-content" style={{ padding: '12px', background: '#fafafa', minHeight: '400px' }}>
            {ragBuckets.amber.map(project => (
              <RAGProjectCard
                key={project.id || project._id}
                project={project}
                isExpanded={expandedProjectId === (project.id || project._id)}
                onToggle={() => handleToggleExpand(project.id || project._id)}
                onMilestoneClick={onMilestoneClick}
                onClick={() => onProjectClick(project)}
              />
            ))}
            {ragBuckets.amber.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                No caution projects
              </div>
            )}
          </div>
        </div>

        {/* Green Column */}
        <div className="rag-column rag-column-green">
          <div className="rag-column-header" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 16px', 
            background: '#f0fdf4',
            borderRadius: '8px 8px 0 0',
            borderBottom: '2px solid #86efac'
          }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: '#10b981' 
            }} />
            <span style={{ fontWeight: 600, color: '#166534' }}>On Track</span>
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '14px', 
              fontWeight: 600, 
              color: '#059669',
              background: '#d1fae5',
              padding: '2px 10px',
              borderRadius: '12px'
            }}>
              {ragBuckets.green.length}
            </span>
          </div>
          <div className="rag-column-content" style={{ padding: '12px', background: '#fafafa', minHeight: '400px' }}>
            {ragBuckets.green.map(project => (
              <RAGProjectCard
                key={project.id || project._id}
                project={project}
                isExpanded={expandedProjectId === (project.id || project._id)}
                onToggle={() => handleToggleExpand(project.id || project._id)}
                onMilestoneClick={onMilestoneClick}
                onClick={() => onProjectClick(project)}
              />
            ))}
            {ragBuckets.green.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                No on-track projects
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGBoard;
