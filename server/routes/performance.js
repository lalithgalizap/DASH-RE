const express = require('express');
const dbAdapter = require('../dbAdapter');
const { authenticate, requireAdmin } = require('../auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { parseOCRText } = require('../utils/ocrParser');

const router = express.Router();

// Multer config for temp PDF uploads
const upload = multer({ dest: 'tmp/' });

// Helper: CSP or Admin only
const requireCSPOrAdmin = (req, res, next) => {
  const role = req.user?.role_name;
  if (role === 'CSP' || role === 'Admin' || role === 'Superuser') {
    return next();
  }
  return res.status(403).json({ error: 'CSP or Admin access required' });
};

// GET /api/performance/clients — returns clients that have resources assigned
router.get('/clients', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    const allClients = await dbAdapter.getAllClients();
    const allUsers = await dbAdapter.getAllUsers();
    
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const hasGlobalPerformance = user.permissions?.includes('can_view_global_performance');
    const canViewAll = isAdmin || isCSP || hasGlobalPerformance;
    
    // Filter to only Manager/Resource users that have a client assigned
    const mrUsers = allUsers.filter(u => u.role_name === 'Manager' || u.role_name === 'Resource');
    
    if (canViewAll) {
      // Admin/CSP/Global view sees all clients that have at least one Manager or Resource assigned
      const clientIds = new Set(mrUsers.filter(u => u.client_id).map(u => u.client_id));
      const clients = allClients.filter(c => clientIds.has(c.id));
      return res.json(clients);
    }
    
    // Manager: only clients where their own resources are assigned
    if (user.role_name === 'Manager') {
      const myResourceIds = new Set(
        allUsers
          .filter(u => u.role_name === 'Resource' && u.manager_id === user.id)
          .map(u => u.client_id)
      );
      const clients = allClients.filter(c => myResourceIds.has(c.id));
      return res.json(clients);
    }
    
    // Resource: only their own client
    const myClient = allClients.filter(c => c.id === user.client_id);
    res.json(myClient);
  } catch (err) {
    console.error('Error fetching performance clients:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/performance/metrics?client_id=xxx — aggregated dashboard metrics
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const { client_id } = req.query;
    const user = await dbAdapter.getUserById(req.user.id);
    const allClients = await dbAdapter.getAllClients();
    const allUsers = await dbAdapter.getAllUsers();
    const allReports = await dbAdapter.getPerformanceReports({});

    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const isManager = user.role_name === 'Manager';
    const hasGlobalPerformance = user.permissions?.includes('can_view_global_performance');
    const canViewAll = isAdmin || isCSP || hasGlobalPerformance;

    // Filter users based on role
    let relevantUsers = allUsers.filter(u => u.role_name === 'Manager' || u.role_name === 'Resource');
    if (isManager && !canViewAll) {
      // Manager sees self + assigned resources
      relevantUsers = relevantUsers.filter(u => u.manager_id === user.id || u.id === user.id);
    }

    // Filter clients
    const clientIds = new Set(relevantUsers.filter(u => u.client_id).map(u => u.client_id));
    let clients = allClients.filter(c => clientIds.has(c.id));

    // If client_id filter requested
    if (client_id) {
      clients = clients.filter(c => c.id === client_id);
      relevantUsers = relevantUsers.filter(u => u.client_id === client_id);
    }

    // Track all relevant user IDs (both managers and resources)
    const relevantUserIds = new Set(relevantUsers.map(u => u.id));
    // Track resource IDs specifically for report filtering
    const relevantResourceIds = new Set(relevantUsers.filter(u => u.role_name === 'Resource').map(u => u.id));
    // Track manager IDs
    const relevantManagerIds = new Set(relevantUsers.filter(u => u.role_name === 'Manager').map(u => u.id));

    // Get reports for resources AND managers (if managers have reports)
    let reports = allReports.filter(r => relevantUserIds.has(r.resource_id?.toString?.() || r.resource_id));

    // Latest report per user (by createdAt desc)
    const latestByUser = {};
    reports.forEach(r => {
      const rid = r.resource_id?.toString?.() || r.resource_id;
      if (!latestByUser[rid] || new Date(r.createdAt) > new Date(latestByUser[rid].createdAt)) {
        latestByUser[rid] = r;
      }
    });
    const latestReports = Object.values(latestByUser);

    // Status distribution (latest report per user)
    const statusCounts = { red: 0, amber: 0, green: 0, unknown: 0 };
    latestReports.forEach(r => {
      const st = r.overall_status;
      if (statusCounts[st] !== undefined) statusCounts[st]++;
      else statusCounts.unknown++;
    });

    // Weighted overall score (Green=100, Amber=66.66, Red=33.33, N/A=0)
    const scoreWeights = { green: 100, amber: 66.66, red: 33.33, unknown: 0 };
    const overallScore = latestReports.length > 0
      ? Math.round(latestReports.reduce((sum, r) => sum + (scoreWeights[r.overall_status] || 0), 0) / latestReports.length)
      : 0;

    // Users without any report
    const userIdsWithReport = new Set(Object.keys(latestByUser));
    const resourcesWithoutReport = relevantUsers
      .filter(u => u.role_name === 'Resource' && !userIdsWithReport.has(u.id))
      .map(u => ({
        id: u.id,
        username: u.username,
        role_name: u.role_name,
        client_id: u.client_id,
        client_name: clients.find(c => c.id === u.client_id)?.name || ''
      }));

    const managersWithoutReport = relevantUsers
      .filter(u => u.role_name === 'Manager' && !userIdsWithReport.has(u.id))
      .map(u => ({
        id: u.id,
        username: u.username,
        role_name: u.role_name,
        client_id: u.client_id,
        client_name: clients.find(c => c.id === u.client_id)?.name || ''
      }));

    // Count resources per client with detailed metrics
    const resourcesPerClient = clients.map(c => {
      const clientUsers = relevantUsers.filter(u => u.client_id === c.id);
      const clientResources = clientUsers.filter(u => u.role_name === 'Resource');
      const clientManagers = clientUsers.filter(u => u.role_name === 'Manager');
      const clientUserIds = new Set(clientUsers.map(u => u.id));

      // Latest reports for this client
      const clientLatestReports = latestReports.filter(r => clientUserIds.has(r.resource_id?.toString?.() || r.resource_id));

      // Status distribution for this client
      const clientStatusCounts = { red: 0, amber: 0, green: 0, unknown: 0 };
      clientLatestReports.forEach(r => {
        const st = r.overall_status;
        if (clientStatusCounts[st] !== undefined) clientStatusCounts[st]++;
        else clientStatusCounts.unknown++;
      });

      // Weighted overall score for this client
      const clientScoreWeights = { green: 100, amber: 66.66, red: 33.33, unknown: 0 };
      const clientOverallScore = clientLatestReports.length > 0
        ? Math.round(clientLatestReports.reduce((sum, r) => sum + (clientScoreWeights[r.overall_status] || 0), 0) / clientLatestReports.length)
        : 0;

      // Users without updates for this client
      const clientResourcesWithoutUpdates = resourcesWithoutReport.filter(r => r.client_id === c.id).length;
      const clientManagersWithoutUpdates = managersWithoutReport.filter(r => r.client_id === c.id).length;

      // Last updated for this client
      const clientLastUpdatedAt = clientLatestReports.length > 0
        ? clientLatestReports.reduce((latest, r) => {
            const d = new Date(r.updatedAt);
            return d > latest ? d : latest;
          }, new Date(0)).toISOString()
        : null;

      return {
        name: c.name,
        count: clientResources.length,
        managerCount: clientManagers.length,
        totalCount: clientResources.length + clientManagers.length,
        id: c.id,
        resourcesWithoutUpdates: clientResourcesWithoutUpdates,
        managersWithoutUpdates: clientManagersWithoutUpdates,
        overallScore: clientOverallScore,
        lastUpdatedAt: clientLastUpdatedAt,
        statusDistribution: {
          red: clientStatusCounts.red,
          amber: clientStatusCounts.amber,
          green: clientStatusCounts.green,
          unknown: clientStatusCounts.unknown
        }
      };
    }).filter(c => c.count > 0 || c.managerCount > 0);

    // Quarter distribution
    const quarterCounts = {};
    reports.forEach(r => {
      const key = `${r.quarter} ${r.year}`;
      quarterCounts[key] = (quarterCounts[key] || 0) + 1;
    });

    // Last updated timestamp from any report
    const lastUpdatedAt = reports.length > 0
      ? reports.reduce((latest, r) => {
          const d = new Date(r.updatedAt);
          return d > latest ? d : latest;
        }, new Date(0)).toISOString()
      : null;

    res.json({
      totalClients: clients.length,
      totalResources: relevantUsers.filter(u => u.role_name === 'Resource').length,
      totalManagers: relevantUsers.filter(u => u.role_name === 'Manager').length,
      totalReports: reports.length,
      totalWithLatestReport: latestReports.length,
      resourcesWithoutReport,
      managersWithoutReport,
      totalWithoutReport: {
        resources: resourcesWithoutReport.length,
        managers: managersWithoutReport.length,
        total: resourcesWithoutReport.length + managersWithoutReport.length
      },
      overallScore,
      lastUpdatedAt,
      resourcesPerClient,
      statusDistribution: [
        { name: 'Red', value: statusCounts.red, color: '#ef4444' },
        { name: 'Amber', value: statusCounts.amber, color: '#f59e0b' },
        { name: 'Green', value: statusCounts.green, color: '#22c55e' },
        { name: 'N/A', value: statusCounts.unknown, color: '#94a3b8' }
      ],
      quarterDistribution: Object.entries(quarterCounts).map(([name, value]) => ({ name, value }))
    });
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/performance/resources?client_id=xxx — resources under a client, or all if no client_id
router.get('/resources', authenticate, async (req, res) => {
  try {
    const { client_id } = req.query;
    
    const user = await dbAdapter.getUserById(req.user.id);
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const isManager = user.role_name === 'Manager';
    const hasGlobalPerformance = user.permissions?.includes('can_view_global_performance');
    const canViewAll = isAdmin || isCSP || hasGlobalPerformance;
    
    let resources;
    if (client_id) {
      // Get resources for specific client
      const allUsers = await dbAdapter.getAllUsers();
      resources = allUsers.filter(u => u.client_id === client_id && u.role_name === 'Resource');
      // Include managers for admin/CSP/global view
      if (canViewAll) {
        const clientManagers = allUsers.filter(u => u.client_id === client_id && u.role_name === 'Manager');
        resources = [...resources, ...clientManagers];
      }
    } else {
      // Get all resources and managers across all clients
      const allUsers = await dbAdapter.getAllUsers();
      resources = allUsers.filter(u => u.role_name === 'Resource');
      // Include managers for admin/CSP/global view
      if (canViewAll) {
        const managers = allUsers.filter(u => u.role_name === 'Manager');
        resources = [...resources, ...managers];
      }
    }
    
    if (isManager && !canViewAll) {
      // Manager only sees their own resources + self
      resources = resources.filter(r => r.manager_id === user.id || r.id === user.id);
      // Ensure manager themselves is in the list so they can see their own reports
      if (!resources.some(r => r.id === user.id)) {
        if (!client_id || user.client_id === client_id) {
          resources = [...resources, user];
        }
      }
    } else if (!canViewAll) {
      // Resource user only sees themselves
      resources = resources.filter(r => r.id === user.id);
    }
    
    // Helper function to calculate rating out of 5 based on report metrics
    const calculateRating = (report) => {
      if (!report) return null;
      
      // Score mapping for each metric (higher is better)
      const scores = {
        // Delivery: yes=5, mostly=3, not=1
        delivery: { yes: 5, mostly: 3, not: 1 },
        // Quality: good=5, mixed=3, poor=1
        quality: { good: 5, mixed: 3, poor: 1 },
        // Rework: low=5, medium=3, high=1 (inverse - lower rework is better)
        rework: { low: 5, medium: 3, high: 1 },
        // Communication: effective=5, needs_improvement=2
        communication: { effective: 5, needs_improvement: 2 }
      };
      
      let totalScore = 0;
      let count = 0;
      
      // Calculate average of available metrics
      if (report.delivery && scores.delivery[report.delivery]) {
        totalScore += scores.delivery[report.delivery];
        count++;
      }
      if (report.quality && scores.quality[report.quality]) {
        totalScore += scores.quality[report.quality];
        count++;
      }
      if (report.rework && scores.rework[report.rework]) {
        totalScore += scores.rework[report.rework];
        count++;
      }
      if (report.communication && scores.communication[report.communication]) {
        totalScore += scores.communication[report.communication];
        count++;
      }
      
      // If no metrics available, fall back to overall_status
      if (count === 0) {
        const statusScore = { green: 5, amber: 3, red: 1 };
        return statusScore[report.overall_status] || null;
      }
      
      // Return average rounded to 1 decimal place
      return Math.round((totalScore / count) * 10) / 10;
    };
    
    // Fetch latest confirmed report for each resource/manager (sorted by createdAt desc)
    const resourcesWithReports = await Promise.all(
      resources.map(async (resource) => {
        const reports = await dbAdapter.getPerformanceReports({ resource_id: resource.id });
        // Sort reports by createdAt descending to get the latest first
        const sortedReports = reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // Find the latest confirmed report, or the latest overall if none confirmed
        const latestReport = sortedReports.find(r => r.status === 'confirmed') || sortedReports[0] || null;
        return {
          ...resource,
          latest_report: latestReport ? {
            id: latestReport.id,
            createdAt: latestReport.createdAt,
            updatedAt: latestReport.updatedAt,
            overall_status: latestReport.overall_status,
            quarter: latestReport.quarter,
            year: latestReport.year,
            delivery: latestReport.delivery,
            quality: latestReport.quality,
            rework: latestReport.rework,
            communication: latestReport.communication,
            recommendation: latestReport.recommendation,
            role_team: latestReport.role_team,
            rating: calculateRating(latestReport),
            strengths: latestReport.strengths,
            areas_of_improvement: latestReport.areas_of_improvement,
            overall_reasons: latestReport.overall_reasons
          } : null
        };
      })
    );
    
    res.json(resourcesWithReports);
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/performance/reports?resource_id=xxx
router.get('/reports', authenticate, async (req, res) => {
  try {
    const { resource_id } = req.query;
    if (!resource_id) {
      return res.status(400).json({ error: 'resource_id is required' });
    }
    
    const user = await dbAdapter.getUserById(req.user.id);
    const resource = await dbAdapter.getUserById(resource_id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const isManager = user.role_name === 'Manager';
    
    // Authorization check
    if (!isAdmin && !isCSP && !(isManager && resource.manager_id === user.id) && user.id !== resource_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const reports = await dbAdapter.getPerformanceReports({ resource_id });
    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper: upload PDF to OCR.space API
function ocrSpaceUpload(filePath, apiKey) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Date.now();
    const filename = path.basename(filePath);

    const parts = [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="apikey"\r\n\r\n${apiKey}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\neng\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="isOverlayRequired"\r\n\r\nfalse\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="detectOrientation"\r\n\r\ntrue\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="scale"\r\n\r\ntrue\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="OCREngine"\r\n\r\n2\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="filetype"\r\n\r\nPDF\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`),
      fileData,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ];

    const postData = Buffer.concat(parts);

    const options = {
      hostname: 'api.ocr.space',
      path: '/parse/image',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': postData.length
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON from OCR.space: ' + data.substring(0, 200)));
        }
      });
    });

    request.on('error', reject);
    request.write(postData);
    request.end();
  });
}

// POST /api/performance/extract — upload PDF, run OCR.space, return draft suggestions
router.post('/extract', authenticate, requireCSPOrAdmin, upload.single('pdf'), async (req, res) => {
  const tempPath = req.file?.path;

  if (!tempPath) {
    return res.status(400).json({ error: 'PDF file is required' });
  }

  try {
    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';
    const ocrResult = await ocrSpaceUpload(tempPath, apiKey);

    if (ocrResult.IsErroredOnProcessing) {
      throw new Error(ocrResult.ErrorMessage || 'OCR.space processing error');
    }

    if (!ocrResult.ParsedResults || ocrResult.ParsedResults.length === 0) {
      throw new Error('No text found in PDF');
    }

    // Concatenate text from all pages
    const fullText = ocrResult.ParsedResults.map(r => r.ParsedText).join('\n\n');

    // Parse structured metrics from OCR text (pure JS)
    const suggestions = parseOCRText(fullText);

    res.json({
      success: true,
      extracted_text: fullText,
      suggestions: suggestions || {},
      raw_ocr: ocrResult
    });

  } catch (err) {
    console.error('Error in OCR extraction:', err);
    res.status(500).json({ error: err.message || 'OCR extraction failed' });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
});

// POST /api/performance/reports — CSP/Admin confirms and saves report
router.post('/reports', authenticate, requireCSPOrAdmin, async (req, res) => {
  try {
    const {
      resource_id, client_id, manager_id,
      quarter, year, period_start, period_end,
      overall_status, overall_reasons,
      delivery, delivery_comments,
      quality, quality_comments,
      rework, rework_comments,
      communication, communication_comments,
      strengths, areas_of_improvement,
      support_needed, recommendation,
      extracted_raw_text,
      resource_name, resource_id_string, role_team,
      manager_name, prepared_by, prepared_on
    } = req.body;
    
    if (!resource_id || !client_id || !manager_id || !quarter || !year) {
      return res.status(400).json({ error: 'resource_id, client_id, manager_id, quarter, and year are required' });
    }

    // Helper: clean empty strings for enum fields (Mongoose rejects '' on enums)
    const clean = (val) => (val === '' || val === undefined ? null : val);

    const report = await dbAdapter.createPerformanceReport({
      resource_id,
      client_id,
      manager_id,
      quarter,
      year: parseInt(year),
      period_start: period_start ? new Date(period_start) : undefined,
      period_end: period_end ? new Date(period_end) : undefined,
      overall_status: clean(overall_status),
      overall_reasons: overall_reasons || undefined,
      delivery: clean(delivery),
      delivery_comments: delivery_comments || undefined,
      quality: clean(quality),
      quality_comments: quality_comments || undefined,
      rework: clean(rework),
      rework_comments: rework_comments || undefined,
      communication: clean(communication),
      communication_comments: communication_comments || undefined,
      strengths: strengths || undefined,
      areas_of_improvement: areas_of_improvement || undefined,
      support_needed: support_needed || undefined,
      recommendation: clean(recommendation),
      extracted_raw_text: extracted_raw_text || '',
      resource_name: resource_name || '',
      resource_id_string: resource_id_string || '',
      role_team: role_team || '',
      manager_name: manager_name || '',
      prepared_by: prepared_by || '',
      prepared_on: prepared_on || '',
      status: 'confirmed',
      created_by: req.user.id
    });
    
    res.json({ ...report, message: 'Performance report saved' });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/performance/reports/:id — CSP/Admin only
router.put('/reports/:id', authenticate, requireCSPOrAdmin, async (req, res) => {
  try {
    const {
      quarter, year, period_start, period_end,
      overall_status, overall_reasons,
      delivery, delivery_comments,
      quality, quality_comments,
      rework, rework_comments,
      communication, communication_comments,
      strengths, areas_of_improvement,
      support_needed, recommendation,
      extracted_raw_text,
      resource_name, resource_id_string, role_team,
      manager_name, prepared_by, prepared_on
    } = req.body;

    const clean = (val) => (val === '' || val === undefined ? null : val);

    await dbAdapter.updatePerformanceReport(req.params.id, {
      quarter,
      year: parseInt(year),
      period_start: period_start ? new Date(period_start) : undefined,
      period_end: period_end ? new Date(period_end) : undefined,
      overall_status: clean(overall_status),
      overall_reasons: overall_reasons || undefined,
      delivery: clean(delivery),
      delivery_comments: delivery_comments || undefined,
      quality: clean(quality),
      quality_comments: quality_comments || undefined,
      rework: clean(rework),
      rework_comments: rework_comments || undefined,
      communication: clean(communication),
      communication_comments: communication_comments || undefined,
      strengths: strengths || undefined,
      areas_of_improvement: areas_of_improvement || undefined,
      support_needed: support_needed || undefined,
      recommendation: clean(recommendation),
      extracted_raw_text: extracted_raw_text || '',
      resource_name: resource_name || '',
      resource_id_string: resource_id_string || '',
      role_team: role_team || '',
      manager_name: manager_name || '',
      prepared_by: prepared_by || '',
      prepared_on: prepared_on || ''
    });

    res.json({ message: 'Performance report updated' });
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/performance/reports/:id — CSP/Admin only
router.delete('/reports/:id', authenticate, requireCSPOrAdmin, async (req, res) => {
  try {
    await dbAdapter.deletePerformanceReport(req.params.id);
    res.json({ message: 'Report deleted' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
