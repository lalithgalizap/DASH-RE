const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const dbAdapter = require('./dbAdapter');
const { authenticate } = require('./auth');

// Import route modules
const projectsRoutes = require('./routes/projects');
const documentsRoutes = require('./routes/documents');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const rolesRoutes = require('./routes/roles');
const metricsRoutes = require('./routes/metrics');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database adapter
dbAdapter.initialize().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mount routes (order matters)
// documentsRoutes has /projects/:id/documents which becomes /api/projects/:id/documents
// projectsRoutes handles /api/projects base routes
app.use('/api', documentsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/metrics', metricsRoutes);

// Direct route for projects-file-status (also available at /api/metrics/projects-file-status)
app.get('/api/projects-file-status', authenticate, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dbAdapter = require('./dbAdapter');
    const projects = await dbAdapter.getAllProjects({});
    
    const documentsDir = path.join(__dirname, '..', 'project-documents');
    
    const projectFiles = projects.map(project => {
      const filePath = path.join(documentsDir, `${project.name}.xlsx`);
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

// Serve static files from React build
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

// Catch-all route to serve React app for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'client', 'build', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Build folder not found. Run "npm run build" in client folder for production, or use "npm run dev" for development.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
