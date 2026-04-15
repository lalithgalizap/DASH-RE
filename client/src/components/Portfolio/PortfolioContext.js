import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const fetchPortfolioData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First get all projects
      const response = await axios.get('/api/projects');
      const projects = response.data || [];
      
      // Calculate RAG for each project by fetching documents
      const projectsWithRAG = await Promise.all(
        projects.map(async (project) => {
          try {
            const docResponse = await axios.get(`/api/projects/${project._id || project.id}/documents?projectName=${encodeURIComponent(project.name)}`);
            const documents = docResponse.data;
            const metrics = calculateProjectMetrics(documents);
            
            return { ...project, ...metrics };
          } catch (err) {
            // If documents fail to load, default to Green
            return { 
              ...project, 
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
            };
          }
        })
      );
      
      // Fetch file modification times
      let fileStatusData = { projects: [] };
      try {
        const fileResponse = await axios.get('/api/projects-file-status');
        fileStatusData = fileResponse.data;
      } catch (err) {
        console.error('Error fetching file status:', err);
      }
      
      // Calculate 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Categorize projects by file update status
      const updatedThisWeek = [];
      const notUpdated = [];
      const noData = [];
      
      projectsWithRAG.forEach(project => {
        const fileInfo = fileStatusData.projects.find(f => f.projectId === (project._id || project.id));
        if (!fileInfo || !fileInfo.hasData) {
          noData.push(project);
        } else if (new Date(fileInfo.lastModified) >= sevenDaysAgo) {
          updatedThisWeek.push({ ...project, lastModified: fileInfo.lastModified });
        } else {
          notUpdated.push({ ...project, lastModified: fileInfo.lastModified });
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
        projects: projectsWithRAG,
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
