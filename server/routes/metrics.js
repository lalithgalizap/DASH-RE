const express = require('express');
const dbAdapter = require('../dbAdapter');
const { authenticate } = require('../auth');

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

module.exports = router;
