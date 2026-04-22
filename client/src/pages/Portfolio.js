import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import PortfolioMetrics from '../components/PortfolioMetrics';
import { 
  PortfolioProvider, 
  usePortfolio,
  PortfolioHeader,
  ProjectsTable,
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
  RAGCategoryModal
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
  const [radialViewProject, setRadialViewProject] = useState(null);
  const [summaryModal, setSummaryModal] = useState(null);
  const [milestoneTooltip, setMilestoneTooltip] = useState(null);
  const [ragSearchQuery, setRagSearchQuery] = useState('');
  const [ragExpandedProjectId, setRagExpandedProjectId] = useState(null);
  const [ragCategoryModal, setRagCategoryModal] = useState(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  const ragBuckets = useMemo(() => ({
    red: (portfolioData.projects || []).filter(p => p.ragStatus?.toLowerCase() === 'red'),
    amber: (portfolioData.projects || []).filter(p => p.ragStatus?.toLowerCase() === 'amber'),
    green: (portfolioData.projects || []).filter(p => p.ragStatus?.toLowerCase() === 'green')
  }), [portfolioData.projects]);

  const freshnessLists = useMemo(() => {
    const fresh = [...(portfolioData.updatedThisWeek || [])].sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
    const stale = [...(portfolioData.notUpdated || [])].sort((a, b) => new Date(a.lastModified || 0) - new Date(b.lastModified || 0));
    const missing = portfolioData.noData || [];
    return { fresh, stale, missing };
  }, [portfolioData.updatedThisWeek, portfolioData.notUpdated, portfolioData.noData]);

  // Only count critical items from active projects (exclude completed/cancelled)
  const allCriticalItems = useMemo(() => {
    const activeProjects = (portfolioData.projects || []).filter(p => {
      const status = (p.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    });
    const risks = activeProjects.flatMap(project => (project.openCriticalRisksDetails || []).map((item, index) => ({
      id: `${project.id || project._id}-risk-${index}`,
      projectName: project.name,
      title: item.Title || item.Description || item['Risk Title'] || 'Risk',
      owner: item['RAID Owner'] || item.Owner || item['Owner'] || item['Risk Owner'] || 'Unassigned',
      severity: item.Severity || 'High',
      type: 'Risk'
    })));

    const issues = activeProjects.flatMap(project => (project.openCriticalIssuesDetails || []).map((item, index) => ({
      id: `${project.id || project._id}-issue-${index}`,
      projectName: project.name,
      title: item.Title || item.Description || item['Issue Title'] || 'Issue',
      owner: item['RAID Owner'] || item.Owner || item['Owner'] || 'Unassigned',
      severity: item.Severity || 'High',
      type: 'Issue'
    })));

    return [...risks, ...issues];
  }, [portfolioData.projects]);

  const activeProjectsFiltered = useMemo(() => (
    (portfolioData.projects || []).filter(p => {
      const status = (p.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    })
  ), [portfolioData.projects]);

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
    const projects = portfolioData.projects || [];
    if (!projectSearchQuery.trim()) return projects;
    
    const query = projectSearchQuery.toLowerCase().trim();
    return projects.filter(project => {
      const nameMatch = (project.name || '').toLowerCase().includes(query);
      const clientMatch = (project.client || project.clientName || '').toLowerCase().includes(query);
      return nameMatch || clientMatch;
    });
  }, [portfolioData.projects, projectSearchQuery]);

  // Calculate percentage of ACTIVE projects updated within last 7 days
  const totalActiveProjects = activeProjectsFiltered.length;
  const freshProjects = portfolioData.updatedThisWeek?.length || 0;
  const updatePercentage = totalActiveProjects > 0 ? Math.round((freshProjects / totalActiveProjects) * 100) : 0;
  
  const criticalTotal = allCriticalItems.length;
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
      value: `${filteredRagBuckets.green.length}/${filteredRagBuckets.amber.length}/${filteredRagBuckets.red.length}`,
      helper: 'Green / Amber / Red',
      tone: 'warning',
      type: 'rag'
    },
    {
      label: 'Critical Items',
      value: criticalTotal,
      helper: 'Risks & Issues',
      tone: 'danger',
      type: 'critical'
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
        <PortfolioHeader 
          summaryHighlights={summaryHighlights}
          onHighlightClick={(type) => setSummaryModal(type)}
        />

        {/* Portfolio Metrics Cards */}
        <PortfolioMetrics 
          metrics={portfolioData} 
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
            {projectSearchQuery && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                Showing {filteredProjects.length} of {portfolioData.projects?.length || 0} projects
              </div>
            )}
          </div>

          <ProjectsTable 
            projects={filteredProjects}
            onProjectClick={(project) => setRadialViewProject(project)}
          />
        </div>

        <div className="portfolio-main-right">
          {/* Placeholder for future widgets */}
        </div>
      </div>

      {/* Summary Modal (active/rag/critical/stale) */}
      <SummaryModal
        type={summaryModal}
        onClose={() => setSummaryModal(null)}
        projects={portfolioData.projects}
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
        projects={portfolioData.projects}
      />

      {/* Updated Projects Modal */}
      <UpdatedProjectsModal 
        isOpen={showUpdatedProjectsModal} 
        onClose={() => setShowUpdatedProjectsModal(false)} 
        projects={portfolioData}
      />

      {/* Overdue Milestones Modal */}
      <OverdueMilestonesModal 
        isOpen={showOverdueMilestonesModal} 
        onClose={() => setShowOverdueMilestonesModal(false)} 
        projects={portfolioData.projects}
      />

      {/* Upcoming Milestones Modal */}
      <UpcomingMilestonesModal 
        isOpen={showUpcomingMilestonesModal} 
        onClose={() => setShowUpcomingMilestonesModal(false)} 
        projects={portfolioData.projects}
      />

      {/* Open Critical Risks Modal */}
      <CriticalRisksModal 
        isOpen={showOpenCriticalRisksModal} 
        onClose={() => setShowOpenCriticalRisksModal(false)} 
        projects={portfolioData.projects}
      />

      {/* Open Critical Issues Modal */}
      <CriticalIssuesModal 
        isOpen={showOpenCriticalIssuesModal} 
        onClose={() => setShowOpenCriticalIssuesModal(false)} 
        projects={portfolioData.projects}
      />

      {/* Open Escalations Modal */}
      <EscalationsModal 
        isOpen={showOpenEscalationsModal} 
        onClose={() => setShowOpenEscalationsModal(false)} 
        projects={portfolioData.projects}
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
