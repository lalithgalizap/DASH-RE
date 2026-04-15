const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dbAdapter = require('../dbAdapter');
const { authenticate, requirePermission } = require('../auth');

const router = express.Router();

// Configure multer for project documents
const projectDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'project-documents');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const projectDocUpload = multer({
  storage: projectDocStorage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Configure multer for closure documents
const closureDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'project-closure-documents', req.params.id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const closureDocUpload = multer({ storage: closureDocStorage });

// GET all projects
router.get('/', async (req, res) => {
  try {
    const { priority, stage, status, client } = req.query;
    const projects = await dbAdapter.getAllProjects({ priority, stage, status, client });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single project
router.get('/:id', async (req, res) => {
  try {
    const project = await dbAdapter.getProjectById(req.params.id);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new project
router.post('/', authenticate, requirePermission('projects', 'add_delete'), async (req, res) => {
  try {
    const { name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer } = req.body;
    const result = await dbAdapter.createProject({ name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update project
router.put('/:id', authenticate, requirePermission('projects', 'edit'), async (req, res) => {
  try {
    const { name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer } = req.body;
    const result = await dbAdapter.updateProject(req.params.id, { name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update project field
router.patch('/:id/:field', authenticate, requirePermission('projects', 'edit'), async (req, res) => {
  const { id, field } = req.params;
  const { value } = req.body;
  
  const allowedFields = {
    'priority': 'priority',
    'stage': 'stage',
    'status': 'status'
  };
  
  if (!allowedFields[field]) {
    res.status(400).json({ error: 'Invalid field' });
    return;
  }
  
  try {
    const project = await dbAdapter.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    project[field] = value;
    const result = await dbAdapter.updateProject(id, project);
    res.json({ success: true, changes: result.changes, field, value });
  } catch (err) {
    console.error(`[PATCH] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE project
router.delete('/:id', authenticate, requirePermission('projects', 'add_delete'), async (req, res) => {
  try {
    const project = await dbAdapter.getProjectById(req.params.id);
    
    if (project) {
      const excelFilePath = path.join(__dirname, '..', '..', 'project-documents', `${project.name}.xlsx`);
      if (fs.existsSync(excelFilePath)) {
        fs.unlinkSync(excelFilePath);
      }
      
      const closureDocsPath = path.join(__dirname, '..', '..', 'project-closure-documents', req.params.id);
      if (fs.existsSync(closureDocsPath)) {
        fs.rmSync(closureDocsPath, { recursive: true, force: true });
      }
    }
    
    const result = await dbAdapter.deleteProject(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload project document
router.post('/upload-document', authenticate, requirePermission('projects', 'add_delete'), projectDocUpload.single('file'), async (req, res) => {
  try {
    const { projectId, projectName } = req.body;
    
    if (!projectId || !projectName) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Project ID and name are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileNameWithoutExt = req.file.originalname.replace(/\.(xlsx|xls)$/i, '');
    if (fileNameWithoutExt !== projectName) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `File name must match project name: "${projectName}.xlsx"`
      });
    }

    const project = await dbAdapter.getProjectById(projectId);
    if (!project) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Document uploaded successfully',
      filename: req.file.originalname,
      projectName: projectName
    });
  } catch (err) {
    console.error('[UPLOAD] Error:', err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// Get closure documents list
router.get('/:id/closure-documents', authenticate, async (req, res) => {
  try {
    const dir = path.join(__dirname, '..', '..', 'project-closure-documents', req.params.id);
    if (!fs.existsSync(dir)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(dir).map(filename => {
      const stats = fs.statSync(path.join(dir, filename));
      return {
        filename,
        size: stats.size,
        uploadedAt: stats.mtime
      };
    });
    res.json({ files });
  } catch (err) {
    console.error('Error listing closure documents:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload closure documents
router.post('/:id/closure-documents', authenticate, requirePermission('projects', 'add_delete'), closureDocUpload.array('files'), async (req, res) => {
  try {
    res.json({
      message: 'Files uploaded successfully',
      files: req.files.map(f => ({ filename: f.filename, originalname: f.originalname, size: f.size }))
    });
  } catch (err) {
    console.error('Error uploading closure documents:', err);
    res.status(500).json({ error: err.message });
  }
});

// Download closure document
router.get('/:id/closure-documents/download/:filename', authenticate, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', '..', 'project-closure-documents', req.params.id, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.download(filePath);
  } catch (err) {
    console.error('Error downloading closure document:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete closure document
router.delete('/:id/closure-documents/:filename', authenticate, requirePermission('projects', 'add_delete'), async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', '..', 'project-closure-documents', req.params.id, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting closure document:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
