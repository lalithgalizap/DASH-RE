const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const dbAdapter = require('../dbAdapter');
const { authenticate } = require('../auth');

const router = express.Router();

// In-memory cache for parsed Excel documents: filePath:mtime -> documents
const documentCache = new Map();
const CACHE_MAX_SIZE = 50; // Limit cache to prevent memory bloat

function getCacheKey(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return `${filePath}:${stats.mtimeMs}`;
  } catch {
    return null;
  }
}

function getCachedDocuments(filePath) {
  const cacheKey = getCacheKey(filePath);
  if (!cacheKey) return null;
  
  const cached = documentCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  return null;
}

function setCachedDocuments(filePath, documents) {
  const cacheKey = getCacheKey(filePath);
  if (!cacheKey) return;
  
  // Simple LRU: if cache too big, clear oldest entries
  if (documentCache.size >= CACHE_MAX_SIZE) {
    const firstKey = documentCache.keys().next().value;
    documentCache.delete(firstKey);
  }
  
  documentCache.set(cacheKey, documents);
}

// Get project documents from Excel
router.get('/projects/:id/documents', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const project = await dbAdapter.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const filePath = path.join(__dirname, '..', '..', 'project-documents', `${project.name}.xlsx`);
    
    if (!fs.existsSync(filePath)) {
      return res.json({
        raidLog: [],
        raidDashboard: {},
        riskRegister: [],
        projectCharter: {},
        projectCover: {},
        projectPlan: [],
        milestoneTracker: [],
        stakeholderRegister: [],
        raciMatrix: [],
        resourceManagementPlan: [],
        resourceAvailability: [],
        governanceCadences: [],
        changeManagement: [],
        ragStatus: ''
      });
    }
    
    // Check cache before parsing Excel
    const cached = getCachedDocuments(filePath);
    if (cached) {
      return res.json(cached);
    }
    
    const workbook = XLSX.readFile(filePath);
    
    const documents = {
      raidLog: [],
      raidDashboard: {},
      riskRegister: [],
      projectCharter: {},
      projectCover: {},
      projectPlan: [],
      milestoneTracker: [],
      stakeholderRegister: [],
      raciMatrix: [],
      resourceManagementPlan: [],
      resourceAvailability: [],
      governanceCadences: [],
      changeManagement: [],
      ragStatus: ''
    };
    
    if (workbook.SheetNames.includes('RAID Log')) {
      const worksheet = workbook.Sheets['RAID Log'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.raidLog = data.filter(item => 
        item['RAID ID'] && 
        item.Type && 
        item.Title
      );
    }
    
    if (workbook.SheetNames.includes('Risk Register')) {
      const worksheet = workbook.Sheets['Risk Register'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.riskRegister = data.filter(item => item['ID'] || item['Risk Description']);
    }
    
    if (workbook.SheetNames.includes('RAID Dashboard')) {
      const worksheet = workbook.Sheets['RAID Dashboard'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      documents.raidDashboard = {
        totalRAIDs: data[5] ? data[5][0] : 0,
        risks: data[5] ? data[5][2] : 0,
        assumptions: data[5] ? data[5][4] : 0,
        issues: data[5] ? data[5][6] : 0,
        dependencies: data[5] ? data[5][8] : 0
      };
    }
    
    // Try different possible sheet names for Project Charter
    const charterSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('charter') || name.toLowerCase().includes('cover') || name.toLowerCase().includes('project')
    );
    if (charterSheetName) {
      const worksheet = workbook.Sheets[charterSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      if (data.length > 0) {
        // Find value by looking for label in 'Project Name' or '__EMPTY_5' columns
        const findByLabel = (label) => {
          for (const row of data) {
            // Check 'Project Name' column for labels (values in __EMPTY_1)
            const labelCell = row['Project Name'];
            if (labelCell && String(labelCell).toLowerCase().includes(label.toLowerCase())) {
              const val = row['__EMPTY_1'];
              if (val && String(val).trim() !== '') {
                return val;
              }
            }
            // Check '__EMPTY_5' column for labels (values in __EMPTY_7)
            const labelCell2 = row['__EMPTY_5'];
            if (labelCell2 && String(labelCell2).toLowerCase().includes(label.toLowerCase())) {
              const val = row['__EMPTY_7'];
              if (val && String(val).trim() !== '') {
                return val;
              }
            }
          }
          return '';
        };
        
        // Parse dates from Excel serial numbers
        const parseDate = (val) => {
          if (typeof val === 'number' && val > 40000) {
            const date = new Date(Date.UTC(1899, 11, 30) + val * 86400 * 1000);
            return date.toISOString().split('T')[0];
          }
          return val;
        };
        
        documents.projectCharter = {
          basicInfo: {
            projectName: findByLabel('project name') || data[0]['Project Name'] || '',
            projectManager: findByLabel('project manager') || '',
            projectSponsor: findByLabel('project sponsor') || findByLabel('sponsor') || '',
            client: findByLabel('client') || '',
            projectStartDate: parseDate(findByLabel('start date') || findByLabel('start')),
            forecastEndDate: parseDate(findByLabel('forecast end') || findByLabel('end') || findByLabel('forecast')),
            estimatedDuration: findByLabel('duration') || findByLabel('days'),
            estimatedBudget: findByLabel('budget') || '',
            projectComplexity: findByLabel('complexity') || findByLabel('complex')
          }
        };
        
        // Read RAG Status from cell L3 (if sheet is "Project Cover Sheet")
        if (charterSheetName.toLowerCase().includes('cover')) {
          const ragCell = worksheet['L3'];
          documents.ragStatus = ragCell?.v || ragCell?.w || '';
        }
      }
    }
    
    if (workbook.SheetNames.includes('Project Plan')) {
      const worksheet = workbook.Sheets['Project Plan'];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.projectPlan = allRows.filter(row => row['Task ID'] && String(row['Task ID']).trim() !== '');
    }
    
    if (workbook.SheetNames.includes('Milestone Tracker')) {
      const worksheet = workbook.Sheets['Milestone Tracker'];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.milestoneTracker = allRows.filter(row => row['Milestone Ref'] && String(row['Milestone Ref']).trim() !== '');
    }
    
    if (workbook.SheetNames.includes('Stakeholder Register')) {
      const worksheet = workbook.Sheets['Stakeholder Register'];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.stakeholderRegister = allRows.filter(row => row['Name'] && String(row['Name']).trim() !== '');
    }
    
    // Try different possible sheet names for Resource Management
    const resourceSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('resource') || name.toLowerCase().includes('team') || name.toLowerCase().includes('staff')
    );
    if (resourceSheetName) {
      const worksheet = workbook.Sheets[resourceSheetName];
      documents.resourceManagementPlan = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    // Parse Resource Availability sheet for holiday/leave data
    if (workbook.SheetNames.includes('Resource Availability')) {
      const worksheet = workbook.Sheets['Resource Availability'];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      // Filter rows that have a Resource Name
      documents.resourceAvailability = allRows.filter(row => 
        row['Resource Name'] && String(row['Resource Name']).trim() !== ''
      );
    }
    
    // Try different possible sheet names for Governance
    const governanceSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('governance') || name.toLowerCase().includes('cadence')
    );
    if (governanceSheetName) {
      const worksheet = workbook.Sheets[governanceSheetName];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.governanceCadences = allRows.filter(row => 
        (row['Forum / Meeting Name'] && String(row['Forum / Meeting Name']).trim() !== '') ||
        (row['Meeting Name'] && String(row['Meeting Name']).trim() !== '') ||
        (row['Meeting Type'] && String(row['Meeting Type']).trim() !== '') ||
        (row['Cadence'] && String(row['Cadence']).trim() !== '')
      );
    }
    
    // Try different possible sheet names for Change Management
    const changeSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('change') || name.toLowerCase().includes('cr')
    );
    if (changeSheetName) {
      const worksheet = workbook.Sheets[changeSheetName];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      // Filter out rows with no Change ID and no valid data
      documents.changeManagement = allRows.filter(row => {
        const hasChangeId = row['Change ID'] && String(row['Change ID']).trim() !== '';
        const hasAnyData = Object.keys(row).some(key => 
          !key.startsWith('__EMPTY') && row[key] && String(row[key]).trim() !== ''
        );
        return hasChangeId || hasAnyData;
      });
    }
    
    // Cache parsed documents for future requests
    setCachedDocuments(filePath, documents);
    
    res.json(documents);
  } catch (err) {
    console.error('Error reading project documents:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get project scope
router.get('/projects/:id/scope', authenticate, async (req, res) => {
  try {
    const scope = await dbAdapter.getProjectScope(req.params.id);
    res.json(scope || { scope_included: '', scope_excluded: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update project scope
router.put('/projects/:id/scope', authenticate, async (req, res) => {
  try {
    const { scope_included, scope_excluded } = req.body;
    await dbAdapter.upsertProjectScope(req.params.id, { scope_included, scope_excluded });
    res.json({ message: 'Scope updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
