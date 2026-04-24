import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import PortfolioMetrics from '../components/PortfolioMetrics';
import { 
  PortfolioProvider, 
  usePortfolio,
  PortfolioHeader,
  ProjectsTable,
  DetailedProjectsTable,
  RAGBoardWithSearch,
  RAGProjectsModal,
  UpdatedProjectsModal,
  OverdueMilestonesModal,
  UpcomingMilestonesModal,
  CriticalRisksModal,
  CriticalIssuesModal,
  EscalationsModal,
  ProjectRadialView,
  SummaryModal,
  RAGCategoryModal,
  MilestoneVarianceModal
} from '../components/Portfolio';
import './Portfolio.css';

function PortfolioContent() {
  const navigate = useNavigate();
  const { portfolioData, loading, error, fetchPortfolioData } = usePortfolio();
  const [showRAGProjectsModal, setShowRAGProjectsModal] = useState(false);
  const [showUpdatedProjectsModal, setShowUpdatedProjectsModal] = useState(false);
  const [showOverdueMilestonesModal, setShowOverdueMilestonesModal] = useState(false);
  const [showUpcomingMilestonesModal, setShowUpcomingMilestonesModal] = useState(false);
  const [showOpenCriticalRisksModal, setShowOpenCriticalRisksModal] = useState(false);
  const [showOpenCriticalIssuesModal, setShowOpenCriticalIssuesModal] = useState(false);
  const [showOpenEscalationsModal, setShowOpenEscalationsModal] = useState(false);
  const [showMilestoneVarianceModal, setShowMilestoneVarianceModal] = useState(false);
  const [radialViewProject, setRadialViewProject] = useState(null);
  const [summaryModal, setSummaryModal] = useState(null);
  const [milestoneTooltip, setMilestoneTooltip] = useState(null);
  const [ragSearchQuery, setRagSearchQuery] = useState('');
  const [ragExpandedProjectId, setRagExpandedProjectId] = useState(null);
  const [ragCategoryModal, setRagCategoryModal] = useState(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('All');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [tableViewMode, setTableViewMode] = useState('default'); // 'default' or 'detailed'

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  // Get unique clients from all projects
  const allClients = useMemo(() => {
    const clientsSet = new Set();
    (portfolioData.projects || []).forEach(project => {
      if (project.clients) {
        project.clients.split(',').forEach(client => {
          const trimmed = client.trim();
          if (trimmed) clientsSet.add(trimmed);
        });
      }
    });
    return ['All', ...Array.from(clientsSet).sort()];
  }, [portfolioData.projects]);

  // Filter projects by selected client
  const clientFilteredProjects = useMemo(() => {
    if (selectedClient === 'All') return portfolioData.projects || [];
    return (portfolioData.projects || []).filter(project => {
      if (!project.clients) return false;
      const projectClients = project.clients.split(',').map(c => c.trim().toLowerCase());
      return projectClients.includes(selectedClient.toLowerCase());
    });
  }, [portfolioData.projects, selectedClient]);

  const ragBuckets = useMemo(() => ({
    red: clientFilteredProjects.filter(p => p.ragStatus?.toLowerCase() === 'red'),
    amber: clientFilteredProjects.filter(p => p.ragStatus?.toLowerCase() === 'amber'),
    green: clientFilteredProjects.filter(p => p.ragStatus?.toLowerCase() === 'green')
  }), [clientFilteredProjects]);

  const freshnessLists = useMemo(() => {
    // Filter freshness lists to only include client-filtered projects
    const clientFilteredIds = new Set(clientFilteredProjects.map(p => String(p._id || p.id)));
    
    const fresh = [...(portfolioData.updatedThisWeek || [])]
      .filter(p => clientFilteredIds.has(String(p._id || p.id)))
      .sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
    const stale = [...(portfolioData.notUpdated || [])]
      .filter(p => clientFilteredIds.has(String(p._id || p.id)))
      .sort((a, b) => new Date(a.lastModified || 0) - new Date(b.lastModified || 0));
    const missing = (portfolioData.noData || [])
      .filter(p => clientFilteredIds.has(String(p._id || p.id)));
    
    return { fresh, stale, missing };
  }, [portfolioData, clientFilteredProjects]);

  const activeProjectsFiltered = useMemo(() => (
    clientFilteredProjects.filter(p => {
      const status = (p.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    })
  ), [clientFilteredProjects]);

  const filteredRagBuckets = useMemo(() => {
    const valid = (project) => {
      const status = (project.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    };
    return {
      red: ragBuckets.red.filter(valid),
      amber: ragBuckets.amber.filter(valid),
      green: ragBuckets.green.filter(valid)
    };
  }, [ragBuckets]);

  const staleProjectsList = useMemo(() => ([...freshnessLists.stale, ...freshnessLists.missing]), [freshnessLists]);

  // Filter projects by search query (client or project name)
  const filteredProjects = useMemo(() => {
    const projects = clientFilteredProjects;
    if (!projectSearchQuery.trim()) return projects;
    
    const query = projectSearchQuery.toLowerCase().trim();
    return projects.filter(project => {
      const nameMatch = (project.name || '').toLowerCase().includes(query);
      const clientMatch = (project.client || project.clientName || '').toLowerCase().includes(query);
      return nameMatch || clientMatch;
    });
  }, [clientFilteredProjects, projectSearchQuery]);

  // Calculate percentage of ACTIVE projects updated within last 7 days
  const totalActiveProjects = activeProjectsFiltered.length;
  const freshProjects = freshnessLists.fresh.length || 0;
  const updatePercentage = totalActiveProjects > 0 ? Math.round((freshProjects / totalActiveProjects) * 100) : 0;
  
  // Calculate portfolio-level planned vs actual progress for header strip
  const totalPlannedDue = clientFilteredProjects.reduce((sum, p) => sum + (p.totalMilestonesDue || 0), 0);
  const totalCompletedDue = clientFilteredProjects.reduce((sum, p) => sum + (p.completedMilestonesDue || 0), 0);
  const portfolioActualProgress = totalPlannedDue > 0 ? Math.round((totalCompletedDue / totalPlannedDue) * 100) : 0;
  const portfolioVariance = portfolioActualProgress - 100; // 100 = expected completion

  const summaryHighlights = [
    {
      label: 'Active Projects',
      value: activeProjectsFiltered.length,
      helper: 'In-flight initiatives',
      tone: 'primary',
      type: 'active'
    },
    {
      label: 'Projects by RAG',
      value: `${filteredRagBuckets.red.length}/${filteredRagBuckets.amber.length}/${filteredRagBuckets.green.length}`,
      valueJSX: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '28px', fontWeight: '700' }}>
          <span style={{ color: '#dc2626' }}>{filteredRagBuckets.red.length}</span>
          <span style={{ color: '#9ca3af', fontWeight: '400' }}>/</span>
          <span style={{ color: '#f59e0b' }}>{filteredRagBuckets.amber.length}</span>
          <span style={{ color: '#9ca3af', fontWeight: '400' }}>/</span>
          <span style={{ color: '#16a34a' }}>{filteredRagBuckets.green.length}</span>
        </span>
      ),
      helper: 'Red / Amber / Green',
      tone: 'warning',
      type: 'rag'
    },
    {
      label: 'Planned vs Actual',
      value: `${portfolioVariance >= 0 ? '+' : ''}${portfolioVariance}%`,
      helper: portfolioVariance >= 0 ? 'Ahead of schedule' : `${Math.abs(portfolioVariance)}% behind schedule`,
      tone: portfolioVariance >= 0 ? 'primary' : 'danger',
      type: 'plannedVsActual'
    },
    {
      label: 'Update Status',
      value: `${updatePercentage}%`,
      helper: `${freshProjects}/${totalActiveProjects} active projects up to date`,
      tone: 'muted',
      type: 'stale'
    }
  ];

  if (loading) {
    return (
      <div className="portfolio-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-page">
        <div className="error-container" style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#dc2626', marginBottom: '12px' }}>Failed to Load Portfolio Data</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            {error?.message || 'An unexpected error occurred while fetching project data.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={fetchPortfolioData}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-container">
        {/* Client Filter Dropdown - Top Right */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '0 4px'
        }}>
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setShowClientDropdown(!showClientDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                minWidth: '220px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter by Client</span>
                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>
                  {selectedClient === 'All' ? 'All Clients' : selectedClient}
                </span>
              </div>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#64748b" 
                strokeWidth="2" 
                strokeLinecap="round"
                style={{ 
                  transform: showClientDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <path d='m6 9 6 6 6-6' />
              </svg>
            </div>

            {/* Searchable Dropdown */}
            {showClientDropdown && (
              <div 
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '280px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}
              >
                {/* Search Input */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      autoFocus
                      style={{
                        border: 'none',
                        outline: 'none',
                        fontSize: '13px',
                        color: '#1e293b',
                        background: 'transparent',
                        width: '100%'
                      }}
                    />
                    {clientSearchQuery && (
                      <button
                        onClick={() => setClientSearchQuery('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Client List */}
                <div style={{
                  maxHeight: '240px',
                  overflowY: 'auto'
                }}>
                  {allClients
                    .filter(client => 
                      client === 'All' || 
                      client.toLowerCase().includes(clientSearchQuery.toLowerCase())
                    )
                    .map(client => (
                      <div
                        key={client}
                        onClick={() => {
                          setSelectedClient(client);
                          setShowClientDropdown(false);
                          setClientSearchQuery('');
                        }}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: selectedClient === client ? '#2563eb' : '#374151',
                          backgroundColor: selectedClient === client ? '#eff6ff' : 'transparent',
                          fontWeight: selectedClient === client ? '600' : '400',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedClient !== client) {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedClient !== client) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <span>{client === 'All' ? 'All Clients' : client}</span>
                        {selectedClient === client && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Click outside to close dropdown */}
        {showClientDropdown && (
          <div 
            onClick={() => setShowClientDropdown(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />
        )}

        <PortfolioHeader 
          summaryHighlights={summaryHighlights}
          onHighlightClick={(type) => {
            if (type === 'plannedVsActual') {
              setShowMilestoneVarianceModal(true);
            } else {
              setSummaryModal(type);
            }
          }}
        />

        {/* Portfolio Metrics Cards */}
        <PortfolioMetrics 
          metrics={{
            ...portfolioData,
            totalActiveProjects: activeProjectsFiltered.length,
            projectsByRAG: {
              green: filteredRagBuckets.green.length,
              amber: filteredRagBuckets.amber.length,
              red: filteredRagBuckets.red.length
            },
            updatedThisWeek: freshnessLists.fresh,
            notUpdated: freshnessLists.stale,
            noData: freshnessLists.missing,
            updatedCount: freshnessLists.fresh.length,
            overdueMilestonesTotal: clientFilteredProjects.reduce((sum, p) => sum + (p.overdueMilestones || 0), 0),
            projectsWithOverdueMilestones: clientFilteredProjects.filter(p => (p.overdueMilestones || 0) > 0).length,
            upcomingMilestonesTotal: clientFilteredProjects.reduce((sum, p) => sum + (p.upcomingMilestones || 0), 0),
            openCriticalRisksTotal: clientFilteredProjects.reduce((sum, p) => sum + (p.openCriticalRisks || 0), 0),
            openCriticalIssuesTotal: clientFilteredProjects.reduce((sum, p) => sum + (p.openCriticalIssues || 0), 0),
            openEscalationsTotal: clientFilteredProjects.reduce((sum, p) => sum + (p.openEscalations || 0), 0)
          }} 
          onMetricClick={(type) => {
            if (type === 'rag') setShowRAGProjectsModal(true);
            if (type === 'updated') setShowUpdatedProjectsModal(true);
            if (type === 'overdue') setShowOverdueMilestonesModal(true);
            if (type === 'upcoming') setShowUpcomingMilestonesModal(true);
            if (type === 'criticalRisks') setShowOpenCriticalRisksModal(true);
            if (type === 'criticalIssues') setShowOpenCriticalIssuesModal(true);
            if (type === 'escalations') setShowOpenEscalationsModal(true);
          }}
        />

      <RAGBoardWithSearch
        ragBuckets={ragBuckets}
        ragSearchQuery={ragSearchQuery}
        setRagSearchQuery={setRagSearchQuery}
        ragExpandedProjectId={ragExpandedProjectId}
        setRagExpandedProjectId={setRagExpandedProjectId}
        milestoneTooltip={milestoneTooltip}
        setMilestoneTooltip={setMilestoneTooltip}
        setRagCategoryModal={setRagCategoryModal}
      />

      <div className="portfolio-main-grid">
        <div className="portfolio-main-left">
          {/* Search Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '10px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <Search size={20} color="#6b7280" />
              <input
                type="text"
                placeholder="Search by project or client..."
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#111827',
                  background: 'transparent'
                }}
              />
              {projectSearchQuery && (
                <button
                  onClick={() => setProjectSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 8px'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {(projectSearchQuery || selectedClient !== 'All') && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                Showing {filteredProjects.length} of {clientFilteredProjects.length} projects
                {selectedClient !== 'All' && <span> for <strong>{selectedClient}</strong></span>}
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setTableViewMode('default')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: tableViewMode === 'default' ? '#2563eb' : 'white',
                  color: tableViewMode === 'default' ? 'white' : '#374151'
                }}
              >
                Default View
              </button>
              <button
                onClick={() => setTableViewMode('detailed')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: tableViewMode === 'detailed' ? '#2563eb' : 'white',
                  color: tableViewMode === 'detailed' ? 'white' : '#374151'
                }}
              >
                Detailed View
              </button>
            </div>
          </div>

          {tableViewMode === 'default' ? (
            <ProjectsTable 
              projects={filteredProjects}
              onProjectClick={(project) => setRadialViewProject(project)}
            />
          ) : (
            <DetailedProjectsTable
              projects={filteredProjects}
              onProjectClick={(project) => setRadialViewProject(project)}
              onProjectUpdate={fetchPortfolioData}
            />
          )}
        </div>

        <div className="portfolio-main-right">
          {/* Placeholder for future widgets */}
        </div>
      </div>

      {/* Summary Modal (active/rag/critical/stale) */}
      <SummaryModal
        type={summaryModal}
        onClose={() => setSummaryModal(null)}
        projects={clientFilteredProjects}
        ragBuckets={filteredRagBuckets}
        staleProjectsList={staleProjectsList}
      />

      {/* Project Radial View */}
      <ProjectRadialView
        project={radialViewProject}
        isOpen={!!radialViewProject}
        onClose={() => setRadialViewProject(null)}
        onMetricClick={(metricId, project) => {
          // Navigate to metric detail or project page
          if (metricId === 'rag' || metricId === 'timeline') {
            navigate(`/project/${project.id || project._id}`);
          }
        }}
      />

      <RAGCategoryModal
        isOpen={!!ragCategoryModal}
        onClose={() => setRagCategoryModal(null)}
        modalData={ragCategoryModal}
        expandedProjectId={ragExpandedProjectId}
        onToggleProject={setRagExpandedProjectId}
        milestoneTooltip={milestoneTooltip}
        onMilestoneClick={(projectId, idx, name, date, status, milestone) => {
          setMilestoneTooltip({
            projectId,
            milestoneIndex: idx,
            name,
            date,
            status,
            milestone
          });
        }}
        onCloseTooltip={() => setMilestoneTooltip(null)}
      />

      {/* RAG Status Modal */}
      <RAGProjectsModal 
        isOpen={showRAGProjectsModal} 
        onClose={() => setShowRAGProjectsModal(false)} 
        projects={clientFilteredProjects}
      />

      {/* Updated Projects Modal */}
      <UpdatedProjectsModal 
        isOpen={showUpdatedProjectsModal} 
        onClose={() => setShowUpdatedProjectsModal(false)} 
        projects={{
          ...portfolioData,
          updatedThisWeek: freshnessLists.fresh,
          notUpdated: freshnessLists.stale,
          noData: freshnessLists.missing
        }}
      />

      {/* Overdue Milestones Modal */}
      <OverdueMilestonesModal 
        isOpen={showOverdueMilestonesModal} 
        onClose={() => setShowOverdueMilestonesModal(false)} 
        projects={clientFilteredProjects}
      />

      {/* Upcoming Milestones Modal */}
      <UpcomingMilestonesModal 
        isOpen={showUpcomingMilestonesModal} 
        onClose={() => setShowUpcomingMilestonesModal(false)} 
        projects={clientFilteredProjects}
      />

      {/* Open Critical Risks Modal */}
      <CriticalRisksModal 
        isOpen={showOpenCriticalRisksModal} 
        onClose={() => setShowOpenCriticalRisksModal(false)} 
        projects={clientFilteredProjects}
      />

      {/* Open Critical Issues Modal */}
      <CriticalIssuesModal 
        isOpen={showOpenCriticalIssuesModal} 
        onClose={() => setShowOpenCriticalIssuesModal(false)} 
        projects={clientFilteredProjects}
      />

      {/* Open Escalations Modal */}
      <EscalationsModal 
        isOpen={showOpenEscalationsModal} 
        onClose={() => setShowOpenEscalationsModal(false)} 
        projects={clientFilteredProjects}
      />

      {/* Milestone Variance Modal */}
      <MilestoneVarianceModal 
        isOpen={showMilestoneVarianceModal} 
        onClose={() => setShowMilestoneVarianceModal(false)} 
        projects={clientFilteredProjects}
      />
      </div>
    </div>
  );
}

// Wrap with PortfolioProvider
function Portfolio() {
  return (
    <PortfolioProvider>
      <PortfolioContent />
    </PortfolioProvider>
  );
}

export default Portfolio;
