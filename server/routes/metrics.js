const express = require('express');
const dbAdapter = require('../dbAdapter');
const { authenticate } = require('../auth');
const { MetricSnapshot } = require('../models');

const router = express.Router();

// Get metrics
router.get('/', async (req, res) => {
  try {
    const projects = await dbAdapter.getAllProjects({});
    
    const activeProjects = projects.filter(p => p.status === 'On Track').length;
    
    const clientsSet = new Set();
    projects.forEach(project => {
      if (project.clients && project.clients.trim()) {
        const projectClients = project.clients.split(',')
          .map(c => c.trim().toLowerCase())
          .filter(c => c.length > 0);
        projectClients.forEach(client => {
          clientsSet.add(client);
        });
      }
    });
    const totalClients = clientsSet.size;
    
    const onTrackProjects = projects.filter(p => p.status === 'On Track').length;
    const totalProjects = projects.length;
    
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    
    const metrics = {
      active_projects: activeProjects,
      total_clients: totalClients,
      on_track: onTrackProjects,
      total_projects: totalProjects,
      completed_projects: completedProjects
    };
    
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get events
router.get('/events', async (req, res) => {
  try {
    const events = await dbAdapter.getAllEvents();
    res.json(events.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create event
router.post('/events', async (req, res) => {
  try {
    const result = await dbAdapter.createEvent(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get project file status
router.get('/projects-file-status', authenticate, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const projects = await dbAdapter.getAllProjects({});
    const projectFiles = projects.map(project => {
      const filePath = path.join(__dirname, '..', '..', 'project-documents', `${project.name}.xlsx`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          projectId: project._id || project.id,
          projectName: project.name,
          lastModified: stats.mtime,
          hasData: true
        };
      } else {
        return {
          projectId: project._id || project.id,
          projectName: project.name,
          lastModified: null,
          hasData: false
        };
      }
    });
    res.json({ projects: projectFiles });
  } catch (err) {
    console.error('Error getting project file status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get metric history for charts
router.get('/history', authenticate, async (req, res) => {
  try {
    const { metric, weeks = 12, client = 'All' } = req.query;

    // Validate metric parameter
    const validMetrics = [
      'overdueMilestonesTotal',
      'upcomingMilestonesTotal',
      'openCriticalRisksTotal',
      'openCriticalIssuesTotal',
      'openEscalationsTotal',
      'openDependenciesTotal'
    ];

    if (!metric || !validMetrics.includes(metric)) {
      return res.status(400).json({
        error: 'Invalid or missing metric parameter',
        validMetrics
      });
    }

    // Support up to 100 weeks of history
    const weeksCount = Math.min(Math.max(parseInt(weeks) || 12, 1), 100);

    // Get snapshots for the last N weeks (including current week which may be in future)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeksCount * 7));

    const snapshots = await MetricSnapshot.find({
      weekEnding: { $gte: startDate }
    }).sort({ weekEnding: 1 }).lean();

    // Metric field mapping
    const metricMap = {
      'overdueMilestonesTotal': 'overdueMilestones',
      'upcomingMilestonesTotal': 'upcomingMilestones',
      'openCriticalRisksTotal': 'openCriticalRisks',
      'openCriticalIssuesTotal': 'openCriticalIssues',
      'openEscalationsTotal': 'openEscalations',
      'openDependenciesTotal': 'openDependencies'
    };
    const field = metricMap[metric];

    // Format response with per-project breakdown and client filtering
    const data = snapshots.map(snapshot => {
      // Filter by client if specified (handles comma-separated clients)
      let projectMetrics = snapshot.projectMetrics || [];
      if (client && client !== 'All') {
        const searchClient = client.toLowerCase().trim();
        projectMetrics = projectMetrics.filter(pm => {
          // Handle comma-separated clients (e.g., "USA, CANADA")
          const clientTokens = (pm.client || '')
            .toLowerCase()
            .split(',')
            .map(c => c.trim())
            .filter(Boolean);
          // Match if any token equals or contains the search client
          return clientTokens.some(token =>
            token === searchClient || token.includes(searchClient)
          );
        });
      }

      // Get relevant projects for this metric
      const relevantProjects = projectMetrics
        .filter(pm => field && pm[field] > 0)
        .map(pm => ({
          projectName: pm.projectName,
          client: pm.client,
          value: pm[field] || 0
        }))
        .sort((a, b) => b.value - a.value); // Sort by value descending

      // Calculate total based on filtered projects
      const filteredTotal = relevantProjects.reduce((sum, p) => sum + p.value, 0);

      // Get unique project names for stacked bar keys
      const projectNames = relevantProjects.map(p => p.projectName);

      return {
        weekEnding: snapshot.weekEnding.toISOString().split('T')[0],
        value: filteredTotal,
        originalTotal: snapshot.metrics[metric] || 0,
        projectCount: snapshot.activeProjectCount || 0,
        totalProjects: snapshot.projectCount || 0,
        projects: relevantProjects,
        projectNames: [...new Set(projectNames)] // Unique project names
      };
    });

    // Get all unique project names across all weeks for color assignment
    const allProjectNames = [...new Set(data.flatMap(d => d.projects.map(p => p.projectName)))];

    res.json({
      metric,
      weeks: weeksCount,
      client,
      allProjectNames,
      data
    });
  } catch (err) {
    console.error('Error getting metric history:', err);
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual snapshot (admin only)
router.post('/snapshot', authenticate, async (req, res) => {
  try {
    const { triggerManualSnapshot } = require('../jobs/metricSnapshotJob');
    const snapshot = await triggerManualSnapshot();
    res.json({
      message: 'Snapshot created successfully',
      snapshot: {
        weekEnding: snapshot.weekEnding,
        metrics: snapshot.metrics,
        projectCount: snapshot.projectCount,
        activeProjectCount: snapshot.activeProjectCount
      }
    });
  } catch (err) {
    console.error('Error creating manual snapshot:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
