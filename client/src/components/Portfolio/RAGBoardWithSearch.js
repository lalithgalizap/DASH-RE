import React from 'react';

const RAGBoardWithSearch = ({
  ragBuckets,
  ragSearchQuery,
  setRagSearchQuery,
  setRagCategoryModal,
  onProjectSelect
}) => {
  return (
    <>
      {/* RAG Board Search */}
      <div className="rag-board-search-container" style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Search Projects:</span>
        <input
          type="text"
          placeholder="Search by project name, client, or owner..."
          value={ragSearchQuery}
          onChange={(e) => setRagSearchQuery(e.target.value)}
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
        {ragSearchQuery && (
          <button
            onClick={() => setRagSearchQuery('')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        )}
      </div>

      <section className="portfolio-rag-board">
        {['red', 'amber', 'green'].map(status => {
          // Filter projects based on search query
          const filteredProjects = ragBuckets[status].filter(project => {
            if (!ragSearchQuery.trim()) return true;
            const query = ragSearchQuery.toLowerCase();
            const nameMatch = project.name?.toLowerCase().includes(query);
            const clientMatch = project.clients?.toLowerCase().includes(query);
            const ownerMatch = project.projectCharter?.['Project Owner']?.toLowerCase().includes(query);
            return nameMatch || clientMatch || ownerMatch;
          });
          const previewProjects = filteredProjects.slice(0, 3);
          const hasMoreProjects = filteredProjects.length > 3;

          return (
            <div key={status} className={`rag-column rag-${status}`}>
              <div className="rag-column-header">
                <div>
                  <span className="rag-column-label">{status === 'red' ? 'Red' : status === 'amber' ? 'Amber' : 'Green'}</span>
                  <p className="rag-column-helper">{status === 'green' ? 'On Track' : status === 'red' ? 'Critical' : 'Caution'}</p>
                </div>
                <span className="rag-column-count">{filteredProjects.length}</span>
              </div>
              <div className="rag-column-body">
                {filteredProjects.length === 0 && (
                  <p className="rag-empty">{ragSearchQuery ? 'No matching projects' : 'No projects in this band'}</p>
                )}
                {previewProjects.map(project => {
                    const projectId = project.id || project._id;

                    return (
                      <div
                        key={projectId}
                        className="rag-project-card"
                        onClick={() => onProjectSelect(project)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{project.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {project.overdueMilestones > 0 && (
                            <span style={{ fontSize: '11px', color: '#ef4444' }}>🔴 {project.overdueMilestones}</span>
                          )}
                          {project.upcomingMilestones > 0 && (
                            <span style={{ fontSize: '11px', color: '#f59e0b' }}>🟡 {project.upcomingMilestones}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* View All Button */}
                  {hasMoreProjects && (
                    <button
                      onClick={() => setRagCategoryModal({ status, projects: filteredProjects, title: status === 'red' ? 'Critical' : status === 'amber' ? 'Caution' : 'On Track' })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '8px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>View All</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>({filteredProjects.length})</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
            </div>
          );
        })}
      </section>
    </>
  );
};

export default RAGBoardWithSearch;
