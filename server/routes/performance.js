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
    const user       = await dbAdapter.getUserById(req.user.id);
    const allClients = await dbAdapter.getAllClients();
    const allUsers   = await dbAdapter.getAllUsers();

    const isAdmin    = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP      = user.role_name === 'CSP';
    const isManager  = user.role_name === 'Manager';
    const hasGlobalPerformance = user.permissions?.includes('can_view_global_performance');
    const canViewAll = isAdmin || isCSP || hasGlobalPerformance;

    // ── RBAC: determine which users are in scope ──────────────────────────────
    let relevantUsers = allUsers.filter(u => u.role_name === 'Manager' || u.role_name === 'Resource');
    if (isManager && !canViewAll) {
      relevantUsers = relevantUsers.filter(u => u.manager_id === user.id || u.id === user.id);
    }

    // Filter clients
    const clientIdSet = new Set(relevantUsers.filter(u => u.client_id).map(u => u.client_id));
    let clients = allClients.filter(c => clientIdSet.has(c.id));

    if (client_id) {
      clients       = clients.filter(c => c.id === client_id);
      relevantUsers = relevantUsers.filter(u => u.client_id === client_id);
    }

    // ── DB aggregation — replaces getPerformanceReports({}) full scan ─────────
    const relevantUserIds = relevantUsers.map(u => u.id);
    const { latestByUser, quarterCounts, totalReports, lastUpdatedAt } =
      await dbAdapter.getPerformanceMetricsAggregated(relevantUserIds);

    // ── Status distribution (latest report per user) ──────────────────────────
    const statusCounts = { red: 0, amber: 0, green: 0, unknown: 0 };
    const scoreWeights = { green: 100, amber: 66.66, red: 33.33, unknown: 0 };
    let scoreSum = 0;

    latestByUser.forEach(r => {
      const st = r.overall_status || 'unknown';
      if (statusCounts[st] !== undefined) statusCounts[st]++;
      else statusCounts.unknown++;
      scoreSum += scoreWeights[st] || 0;
    });

    const totalWithLatestReport = latestByUser.size;
    const overallScore = totalWithLatestReport > 0
      ? Math.round(scoreSum / totalWithLatestReport)
      : 0;

    // ── Users without any report ──────────────────────────────────────────────
    const resourcesWithoutReport = relevantUsers
      .filter(u => u.role_name === 'Resource' && !latestByUser.has(u.id))
      .map(u => ({
        id:        u.id,
        username:  u.username,
        role_name: u.role_name,
        client_id: u.client_id,
        client_name: clients.find(c => c.id === u.client_id)?.name || ''
      }));

    const managersWithoutReport = relevantUsers
      .filter(u => u.role_name === 'Manager' && !latestByUser.has(u.id))
      .map(u => ({
        id:        u.id,
        username:  u.username,
        role_name: u.role_name,
        client_id: u.client_id,
        client_name: clients.find(c => c.id === u.client_id)?.name || ''
      }));

    // ── Per-client breakdown ──────────────────────────────────────────────────
    const resourcesPerClient = clients.map(c => {
      const clientUsers     = relevantUsers.filter(u => u.client_id === c.id);
      const clientResources = clientUsers.filter(u => u.role_name === 'Resource');
      const clientManagers  = clientUsers.filter(u => u.role_name === 'Manager');

      const clientStatusCounts = { red: 0, amber: 0, green: 0, unknown: 0 };
      let clientScoreSum = 0;
      let clientLatestDate = new Date(0);

      clientUsers.forEach(u => {
        const r = latestByUser.get(u.id);
        if (!r) return;
        const st = r.overall_status || 'unknown';
        if (clientStatusCounts[st] !== undefined) clientStatusCounts[st]++;
        else clientStatusCounts.unknown++;
        clientScoreSum += scoreWeights[st] || 0;
        const d = new Date(r.updatedAt);
        if (d > clientLatestDate) clientLatestDate = d;
      });

      const clientReportCount = clientUsers.filter(u => latestByUser.has(u.id)).length;
      const clientOverallScore = clientReportCount > 0
        ? Math.round(clientScoreSum / clientReportCount)
        : 0;

      return {
        name:                     c.name,
        count:                    clientResources.length,
        managerCount:             clientManagers.length,
        totalCount:               clientResources.length + clientManagers.length,
        id:                       c.id,
        resourcesWithoutUpdates:  resourcesWithoutReport.filter(r => r.client_id === c.id).length,
        managersWithoutUpdates:   managersWithoutReport.filter(r => r.client_id === c.id).length,
        overallScore:             clientOverallScore,
        lastUpdatedAt:            clientReportCount > 0 ? clientLatestDate.toISOString() : null,
        statusDistribution: {
          red:     clientStatusCounts.red,
          amber:   clientStatusCounts.amber,
          green:   clientStatusCounts.green,
          unknown: clientStatusCounts.unknown
        }
      };
    }).filter(c => c.count > 0 || c.managerCount > 0);

    // ── Build response (identical shape to before) ────────────────────────────
    res.json({
      totalClients:         clients.length,
      totalResources:       relevantUsers.filter(u => u.role_name === 'Resource').length,
      totalManagers:        relevantUsers.filter(u => u.role_name === 'Manager').length,
      totalReports,
      totalWithLatestReport,
      resourcesWithoutReport,
      managersWithoutReport,
      totalWithoutReport: {
        resources: resourcesWithoutReport.length,
        managers:  managersWithoutReport.length,
        total:     resourcesWithoutReport.length + managersWithoutReport.length
      },
      overallScore,
      lastUpdatedAt,
      resourcesPerClient,
      statusDistribution: [
        { name: 'Red',   value: statusCounts.red,     color: '#ef4444' },
        { name: 'Amber', value: statusCounts.amber,   color: '#f59e0b' },
        { name: 'Green', value: statusCounts.green,   color: '#22c55e' },
        { name: 'N/A',   value: statusCounts.unknown, color: '#94a3b8' }
      ],
      quarterDistribution: Object.entries(quarterCounts).map(([name, value]) => ({ name, value }))
    });
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/performance/resources?client_id=xxx&quarter=xxx&year=xxx — resources under a client, or all if no client_id
router.get('/resources', authenticate, async (req, res) => {
  try {
    const { client_id } = req.query;
    // Handle multiple quarters and years (can be arrays)
    const quarters = req.query.quarter ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) : [];
    const years = req.query.year ? (Array.isArray(req.query.year) ? req.query.year : [req.query.year]) : [];
    
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

    // Only show managers/resources who have a product assigned
    resources = resources.filter(r => r.product_id);
    
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
    
    // ── OPTIMIZED: fetch ALL reports for all resources in ONE query ──
    // Then group by resource_id in memory — avoids N+1 (200 queries → 1 query)
    const resourceIds = resources.map(r => r.id);
    const allReports = await dbAdapter.getPerformanceReports({ resource_ids: resourceIds });

    // Group reports by resource_id, already sorted by updatedAt desc from dbAdapter
    const reportsByResource = {};
    allReports.forEach(r => {
      const rid = r.resource_id?.toString?.() || r.resource_id;
      if (!reportsByResource[rid]) reportsByResource[rid] = [];
      reportsByResource[rid].push(r);
    });

    const resourcesWithReports = resources.map(resource => {
      let reports = reportsByResource[resource.id] || [];

      // Apply quarter filter if provided (match any of the selected quarters)
      if (quarters.length > 0) {
        reports = reports.filter(r => quarters.includes(r.quarter));
      }

      // Apply year filter if provided (match any of the selected years)
      if (years.length > 0) {
        reports = reports.filter(r => years.includes(r.year?.toString()));
      }

      // Take the first one (most recently updated) after filtering
      const latestReport = reports[0] || null;

      // ── Quarter activity status ──────────────────────────────────────────
      // When a quarter+year filter is active, look up whether this resource
      // was marked active/inactive for that specific quarter/year combination.
      let quarterActivityStatus = null; // null = not set
      if (quarters.length === 1 && years.length === 1) {
        const filterYear = parseInt(years[0]);
        const qa = (resource.quarter_activity || []).find(
          a => a.quarter === quarters[0] && Number(a.year) === filterYear
        );
        quarterActivityStatus = qa?.status || null; // 'active' | 'inactive' | null
      }

      return {
        ...resource,
        quarter_activity_status: quarterActivityStatus,
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
          overall_reasons: latestReport.overall_reasons,
          client_name_snapshot: latestReport.client_name_snapshot || latestReport.client_name,
          product_name_snapshot: latestReport.product_name_snapshot || latestReport.product_name
        } : null
      };
    });

    // ── Always return ALL resources when a quarter/year filter is active ──
    // (previously we excluded resources without matching reports — now we keep
    //  them so the UI can show "Inactive" or "No Report" for that quarter)
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
      resource_id, client_id, product_id, manager_id,
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

    // Fetch client name for snapshot
    const client = await dbAdapter.getClientById(client_id);
    if (!client) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }

    // Fetch product name for snapshot (if product_id provided)
    let productNameSnapshot = '';
    if (product_id) {
      const products = await dbAdapter.getAllProducts();
      const product = products.find(p => p.id === product_id);
      if (!product) {
        return res.status(400).json({ error: 'Invalid product_id' });
      }
      // Validate product belongs to selected client
      if (product.client_id !== client_id) {
        return res.status(400).json({ error: 'Product does not belong to the selected client' });
      }
      productNameSnapshot = product.name;
    }

    // Helper: clean empty strings for enum fields (Mongoose rejects '' on enums)
    const clean = (val) => (val === '' || val === undefined ? null : val);

    const report = await dbAdapter.createPerformanceReport({
      resource_id,
      client_id,
      client_name_snapshot: client.name,
      product_id: product_id || null,
      product_name_snapshot: productNameSnapshot,
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
      client_id, product_id,
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

    const updateData = {
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
    };

    // If client_id is being updated, fetch and update snapshot
    if (client_id) {
      const client = await dbAdapter.getClientById(client_id);
      if (!client) {
        return res.status(400).json({ error: 'Invalid client_id' });
      }
      updateData.client_id = client_id;
      updateData.client_name_snapshot = client.name;
    }

    // If product_id is being updated, fetch and update snapshot
    if (product_id !== undefined) {
      if (product_id) {
        const products = await dbAdapter.getAllProducts();
        const product = products.find(p => p.id === product_id);
        if (!product) {
          return res.status(400).json({ error: 'Invalid product_id' });
        }
        // Validate product belongs to selected client (use updated or existing client_id)
        const targetClientId = client_id || (await dbAdapter.getPerformanceReports({ _id: req.params.id }))[0]?.client_id;
        if (product.client_id !== targetClientId) {
          return res.status(400).json({ error: 'Product does not belong to the selected client' });
        }
        updateData.product_id = product_id;
        updateData.product_name_snapshot = product.name;
      } else {
        // Allow clearing product
        updateData.product_id = null;
        updateData.product_name_snapshot = '';
      }
    }

    await dbAdapter.updatePerformanceReport(req.params.id, updateData);

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
