import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { calculateProjectMetrics, isActiveStatus } from './utils';

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
    openCriticalIssuesTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const metricsCacheRef = useRef(new Map());
  const inFlightRequestsRef = useRef(new Map()); // Track ongoing document requests
  const isFetchingRef = useRef(false); // Prevent concurrent fetchPortfolioData calls

  const getDefaultMetrics = (project) => ({
    ragStatus: 'Green',
    overdueMilestones: 0,
    overdueMilestoneDetails: [],
    upcomingMilestones: 0,
    upcomingMilestoneDetails: [],
    allMilestoneDetails: [],
    overdueTasks: 0,
    openCriticalRisks: 0,
    openCriticalRisksDetails: [],
    openCriticalIssues: 0,
    openCriticalIssuesDetails: [],
    projectCharter: project.projectCharter || null
  });

  // Helper to batch process promises with concurrency limit
  const batchPromises = async (items, processor, batchSize = 5) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }
    return results;
  };

  const fetchPortfolioData = useCallback(async () => {
    // Prevent concurrent calls
    if (isFetchingRef.current) {
      console.log('[PortfolioContext] Fetch already in progress, skipping...');
      return;
    }
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const [projectsResult, fileStatusResult] = await Promise.allSettled([
        axios.get('/api/projects'),
        axios.get('/api/projects-file-status')
      ]);

      if (projectsResult.status !== 'fulfilled') {
        throw projectsResult.reason;
      }

      const projects = projectsResult.value.data || [];
      let fileStatusData = { projects: [] };

      if (fileStatusResult.status === 'fulfilled') {
        fileStatusData = fileStatusResult.value.data || { projects: [] };
      } else {
        console.error('Error fetching file status:', fileStatusResult.reason);
      }

      const fileStatusMap = new Map(
        (fileStatusData.projects || []).map(item => [String(item.projectId), item])
      );
      const metricsCache = metricsCacheRef.current;

      // Calculate RAG for each project by fetching documents (batched to avoid N+1 overload)
      const processProject = async (project) => {
        try {
          const projectId = project._id || project.id;
          const fileInfo = fileStatusMap.get(String(projectId));

          if (fileInfo && fileInfo.hasData === false) {
            return { ...project, ...getDefaultMetrics(project) };
          }

          const cacheKey = fileInfo?.hasData
            ? `${projectId}-${fileInfo.lastModified || 'no-date'}`
            : null;

          if (cacheKey && metricsCache.has(cacheKey)) {
            return { ...project, ...metricsCache.get(cacheKey) };
          }

          // Check if there's already an in-flight request for this project
          if (inFlightRequestsRef.current.has(projectId)) {
            const documents = await inFlightRequestsRef.current.get(projectId);
            const metrics = calculateProjectMetrics(documents);
            if (cacheKey) {
              metricsCache.set(cacheKey, metrics);
            }
            return { ...project, ...metrics };
          }

          // Create the request promise and track it
          const docRequest = axios.get(`/api/projects/${projectId}/documents?projectName=${encodeURIComponent(project.name)}`);
          inFlightRequestsRef.current.set(projectId, docRequest.then(r => r.data));
          
          try {
            const docResponse = await docRequest;
            const documents = docResponse.data;
            inFlightRequestsRef.current.delete(projectId);
            
            const metrics = calculateProjectMetrics(documents);
          if (cacheKey) {
            metricsCache.set(cacheKey, metrics);
          }
          
          return { ...project, ...metrics };
          } catch (docErr) {
            inFlightRequestsRef.current.delete(projectId);
            throw docErr;
          }
        } catch (err) {
          // If documents fail to load, default to prior metrics
          return { ...project, ...getDefaultMetrics(project) };
        }
      };

      // Process in batches of 5 to avoid overwhelming the server
      const projectsWithRAG = await batchPromises(projects, processProject, 5);
      
      // Clear in-flight requests after processing
      inFlightRequestsRef.current.clear();
      
      // Calculate 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Categorize projects by file update status and attach lastModified to all
      const updatedThisWeek = [];
      const notUpdated = [];
      const noData = [];
      
      const projectsWithLastModified = projectsWithRAG.map(project => {
        const fileInfo = fileStatusData.projects.find(f => String(f.projectId) === String(project._id || project.id));
        const lastModified = fileInfo?.lastModified || null;
        return { ...project, lastModified, hasData: fileInfo?.hasData || false };
      });
      
      projectsWithLastModified.forEach(project => {
        if (!project.hasData || !project.lastModified) {
          noData.push(project);
        } else if (new Date(project.lastModified) >= sevenDaysAgo) {
          updatedThisWeek.push(project);
        } else {
          notUpdated.push(project);
        }
      });
      
      // Calculate active projects (excluding completed/cancelled)
      const activeEligibleProjects = projectsWithRAG.filter(p => isActiveStatus(p.status));
      const activeCount = activeEligibleProjects.length;
      
      // Calculate RAG counts
      const projectsByRAG = {
        green: activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'green').length,
        amber: activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'amber').length,
        red: activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'red').length
      };
      
      // Calculate totals
      const overdueMilestonesTotal = projectsWithRAG.reduce((sum, p) => sum + (p.overdueMilestones || 0), 0);
      const projectsWithOverdueMilestones = projectsWithRAG.filter(p => (p.overdueMilestones || 0) > 0).length;
      const upcomingMilestonesTotal = projectsWithRAG.reduce((sum, p) => sum + (p.upcomingMilestones || 0), 0);
      const openCriticalRisksTotal = projectsWithRAG.reduce((sum, p) => sum + (p.openCriticalRisks || 0), 0);
      const openCriticalIssuesTotal = projectsWithRAG.reduce((sum, p) => sum + (p.openCriticalIssues || 0), 0);
      
      setPortfolioData({
        projects: projectsWithLastModified,
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
        openCriticalIssuesTotal
      });
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
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
    refresh: fetchPortfolioData
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
