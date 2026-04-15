import React, { useState, useEffect, useMemo } from 'react';
import PortfolioMetrics from '../components/PortfolioMetrics';
import { 
  PortfolioProvider, 
  usePortfolio,
  PortfolioHeader,
  ProjectsTable,
  UpdatePulse,
  RAGBoardWithSearch,
  RAGProjectsModal,
  UpdatedProjectsModal,
  OverdueMilestonesModal,
  UpcomingMilestonesModal,
  CriticalRisksModal,
  CriticalIssuesModal,
  SummaryModal,
  RAGCategoryModal
} from '../components/Portfolio';
import './Portfolio.css';

function PortfolioContent() {
  const { portfolioData, loading, fetchPortfolioData } = usePortfolio();
  const [showRAGProjectsModal, setShowRAGProjectsModal] = useState(false);
  const [showUpdatedProjectsModal, setShowUpdatedProjectsModal] = useState(false);
  const [showOverdueMilestonesModal, setShowOverdueMilestonesModal] = useState(false);
  const [showUpcomingMilestonesModal, setShowUpcomingMilestonesModal] = useState(false);
  const [showOpenCriticalRisksModal, setShowOpenCriticalRisksModal] = useState(false);
  const [showOpenCriticalIssuesModal, setShowOpenCriticalIssuesModal] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [summaryModal, setSummaryModal] = useState(null);
  const [milestoneTooltip, setMilestoneTooltip] = useState(null);
  const [ragSearchQuery, setRagSearchQuery] = useState('');
  const [ragExpandedProjectId, setRagExpandedProjectId] = useState(null);
  const [ragCategoryModal, setRagCategoryModal] = useState(null);

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

  const allCriticalItems = useMemo(() => {
    const projects = portfolioData.projects || [];
    const risks = projects.flatMap(project => (project.openCriticalRisksDetails || []).map((item, index) => ({
      id: `${project.id || project._id}-risk-${index}`,
      projectName: project.name,
      title: item.Title || item.Description || item['Risk Title'] || 'Risk',
      owner: item.Owner || item['Owner'] || 'Unassigned',
      severity: item.Severity || 'High',
      type: 'Risk'
    })));

    const issues = projects.flatMap(project => (project.openCriticalIssuesDetails || []).map((item, index) => ({
      id: `${project.id || project._id}-issue-${index}`,
      projectName: project.name,
      title: item.Title || item.Description || item['Issue Title'] || 'Issue',
      owner: item.Owner || item['Owner'] || 'Unassigned',
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

  const staleProjects = staleProjectsList.length;
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
      label: 'Stale / Missing Updates',
      value: staleProjects,
      helper: 'Older than 7 days',
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
          <ProjectsTable 
            projects={portfolioData.projects}
            expandedProject={expandedProject}
            onToggleExpand={setExpandedProject}
          />
        </div>

        <div className="portfolio-main-right">
          <UpdatePulse freshnessLists={freshnessLists} />
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

      {/* RAG Category Modal - View All Projects */}
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
