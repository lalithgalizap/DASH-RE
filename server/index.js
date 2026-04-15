const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const dbAdapter = require('./dbAdapter');

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
