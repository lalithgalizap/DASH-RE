import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { isActiveStatus } from './utils';

const PortfolioContext = createContext(null);

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [portfolioData, setPortfolioData] = useState({
    projects: [],
    totalActiveProjects: 0,
    projectsByRAG: { green: 0, amber: 0, red: 0 },
    updatedThisWeek: [],
    notUpdated: [],
    noData: [],
    updatedCount: 0,
    overdueMilestonesTotal: 0,
    projectsWithOverdueMilestones: 0,
    upcomingMilestonesTotal: 0,
    openCriticalRisksTotal: 0,
    openCriticalIssuesTotal: 0,
    openEscalationsTotal: 0,
    openDependenciesTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const isFetchingRef         = useRef(false); // prevent concurrent calls

  const fetchPortfolioData = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log('[PortfolioContext] Fetch already in progress, skipping...');
      return;
    }
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // ── Single request — server returns all projects with pre-computed metrics ──
      const response = await axios.get('/api/metrics/portfolio-metrics');
      const projects = response.data.projects || [];

      // ── Freshness categorisation (same logic as before) ──────────────────────
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const updatedThisWeek = [];
      const notUpdated      = [];
      const noData          = [];

      projects.forEach(project => {
        if (!isActiveStatus(project.status)) return; // skip completed/cancelled

        if (!project.hasData || !project.lastModified) {
          noData.push(project);
        } else if (new Date(project.lastModified) >= sevenDaysAgo) {
          updatedThisWeek.push(project);
        } else {
          notUpdated.push(project);
        }
      });

      // ── Active project subset ─────────────────────────────────────────────────
      const activeEligibleProjects = projects.filter(p => isActiveStatus(p.status));
      const activeCount            = activeEligibleProjects.length;

      // ── RAG counts ────────────────────────────────────────────────────────────
      const projectsByRAG = {
        green: activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'green').length,
        amber: activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'amber').length,
        red:   activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'red').length,
      };

      // ── Portfolio-level totals ────────────────────────────────────────────────
      const overdueMilestonesTotal      = activeEligibleProjects.reduce((s, p) => s + (p.overdueMilestones  || 0), 0);
      const projectsWithOverdueMilestones = activeEligibleProjects.filter(p => (p.overdueMilestones || 0) > 0).length;
      const upcomingMilestonesTotal     = activeEligibleProjects.reduce((s, p) => s + (p.upcomingMilestones || 0), 0);
      const openCriticalRisksTotal      = activeEligibleProjects.reduce((s, p) => s + (p.openCriticalRisks  || 0), 0);
      const openCriticalIssuesTotal     = activeEligibleProjects.reduce((s, p) => s + (p.openCriticalIssues || 0), 0);
      const openEscalationsTotal        = activeEligibleProjects.reduce((s, p) => s + (p.openEscalations    || 0), 0);
      const openDependenciesTotal       = activeEligibleProjects.reduce((s, p) => s + (p.openDependencies   || 0), 0);

      setPortfolioData({
        projects,
        totalActiveProjects: activeCount,
        projectsByRAG,
        updatedThisWeek,
        notUpdated,
        noData,
        updatedCount: updatedThisWeek.length,
        overdueMilestonesTotal,
        projectsWithOverdueMilestones,
        upcomingMilestonesTotal,
        openCriticalRisksTotal,
        openCriticalIssuesTotal,
        openEscalationsTotal,
        openDependenciesTotal,
      });
    } catch (err) {
      console.error('[PortfolioContext] Error fetching portfolio data:', err);
      setError(err.message);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  const value = {
    portfolioData,
    loading,
    error,
    fetchPortfolioData,
    refresh: fetchPortfolioData,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
