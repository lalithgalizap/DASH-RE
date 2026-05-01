const express = require('express');
const router = express.Router();
const models = require('../models');
const dbAdapter = require('../dbAdapter');
const { authenticate, requirePermission } = require('../auth');
const { sendWeeklyUpdateReminder } = require('../email');

// GET /api/weekly-updates - Get weekly updates with role-based filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const isManager = user.role_name === 'Manager';
    
    // Check for global view permission
    const hasGlobalPermission = user.permissions?.includes('view_global_weekly_updates');
    
    let query = {};
    
    if (hasGlobalPermission || isAdmin || isCSP) {
      // Global view - no filtering needed
      query = {};
    } else if (isManager) {
      // Manager sees own updates + resources assigned to them
      const allUsers = await dbAdapter.getAllUsers();
      const managedResourceIds = allUsers
        .filter(u => u.manager_id === user.id && u.role_name === 'Resource')
        .map(u => u.id);
      query = {
        $or: [
          { resource_id: user.id },
          { resource_id: { $in: managedResourceIds } },
          { manager_id: user.id }
        ]
      };
    } else {
      // Resource (or other roles) sees only own updates
      query = { resource_id: user.id };
    }
    
    // Optional filters from query params
    if (req.query.resource_id) {
      query.resource_id = req.query.resource_id;
    }
    if (req.query.manager_id) {
      query.manager_id = req.query.manager_id;
    }
    if (req.query.week_starting) {
      const startDate = new Date(req.query.week_starting);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      query.week_starting = { $gte: startDate, $lt: endDate };
    }
    
    const updates = await models.WeeklyUpdate.find(query)
      .populate('resource_id', 'username email')
      .populate('manager_id', 'username email')
      .sort({ week_starting: -1, created_at: -1 })
      .lean();
    
    // Transform to include readable names
    const transformedUpdates = updates.map(update => ({
      ...update,
      resource_name: update.resource_id?.username || 'Unknown',
      resource_email: update.resource_id?.email,
      manager_name: update.manager_id?.username || null,
      resource_id: update.resource_id?._id || update.resource_id,
      manager_id: update.manager_id?._id || update.manager_id
    }));
    
    res.json({ updates: transformedUpdates });
  } catch (err) {
    console.error('Error fetching weekly updates:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weekly-updates/resources - Get resources accessible to current user with latest update info
router.get('/resources', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const isManager = user.role_name === 'Manager';
    const hasGlobalPermission = user.permissions?.includes('view_global_weekly_updates');
    
    const allUsers = await dbAdapter.getAllUsers();
    let resources;
    
    if (isAdmin || isCSP || hasGlobalPermission) {
      // Admin, CSP, and global view users see all Resources AND Managers
      resources = allUsers.filter(u => u.role_name === 'Resource' || u.role_name === 'Manager');
    } else if (isManager) {
      // Managers see their own resources
      resources = allUsers.filter(u => u.role_name === 'Resource' && u.manager_id === user.id);
    } else {
      // Regular resources see only themselves
      resources = allUsers.filter(u => u.id === user.id && u.role_name === 'Resource');
    }
    
    // Get latest update for each resource
    const resourcesWithUpdates = await Promise.all(
      resources.map(async (resource) => {
        const latestUpdate = await models.WeeklyUpdate
          .findOne({ resource_id: resource.id })
          .sort({ week_starting: -1 })
          .lean();
        
        return {
          ...resource,
          client_name: resource.client_name || '-',
          last_update: latestUpdate ? {
            week_starting: latestUpdate.week_starting,
            updated_at: latestUpdate.updated_at,
            status: latestUpdate.status
          } : null
        };
      })
    );
    
    res.json({ resources: resourcesWithUpdates });
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weekly-updates/:id - Get single weekly update
router.get('/:id', authenticate, async (req, res) => {
  try {
    const update = await models.WeeklyUpdate.findById(req.params.id)
      .populate('resource_id', 'username email')
      .populate('manager_id', 'username email')
      .lean();
    
    if (!update) {
      return res.status(404).json({ error: 'Weekly update not found' });
    }
    
    // Check access permissions
    const user = await dbAdapter.getUserById(req.user.id);
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const isManager = user.role_name === 'Manager';
    const hasGlobalPermission = user.permissions?.includes('view_global_weekly_updates');
    
    const canView = hasGlobalPermission || isAdmin || isCSP ||
                    update.resource_id._id.toString() === user.id ||
                    (isManager && update.manager_id?._id?.toString() === user.id);
    
    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      ...update,
      resource_name: update.resource_id?.username,
      resource_id: update.resource_id._id,
      manager_name: update.manager_id?.username,
      manager_id: update.manager_id?._id
    });
  } catch (err) {
    console.error('Error fetching weekly update:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/weekly-updates - Create new weekly update
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    const { week_starting, accomplishments, challenges, next_week_plans, status } = req.body;
    
    // Check if user can create for self (anyone can create for self)
    // Or has manage permission
    const hasManagePermission = user.permissions?.includes('manage_weekly_updates');
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    
    // Check for duplicate week
    const existingUpdate = await models.WeeklyUpdate.findOne({
      resource_id: user.id,
      week_starting: new Date(week_starting)
    });
    
    if (existingUpdate) {
      return res.status(400).json({ error: 'Weekly update already exists for this week' });
    }
    
    const update = await models.WeeklyUpdate.create({
      resource_id: user.id,
      manager_id: user.manager_id,
      week_starting: new Date(week_starting),
      accomplishments: accomplishments || '',
      challenges: challenges || '',
      next_week_plans: next_week_plans || '',
      status: status || 'draft'
    });
    
    res.status(201).json({ success: true, update });
  } catch (err) {
    console.error('Error creating weekly update:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/weekly-updates/:id - Update weekly update
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    const { week_starting, accomplishments, challenges, next_week_plans, status } = req.body;
    
    const update = await models.WeeklyUpdate.findById(req.params.id);
    if (!update) {
      return res.status(404).json({ error: 'Weekly update not found' });
    }
    
    // Check permissions
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const hasManagePermission = user.permissions?.includes('manage_weekly_updates');
    const isOwner = update.resource_id.toString() === user.id;
    const isManager = user.role_name === 'Manager' && update.manager_id?.toString() === user.id;
    
    if (!isOwner && !isManager && !hasManagePermission && !isAdmin && !isCSP) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update fields
    if (week_starting) update.week_starting = new Date(week_starting);
    if (accomplishments !== undefined) update.accomplishments = accomplishments;
    if (challenges !== undefined) update.challenges = challenges;
    if (next_week_plans !== undefined) update.next_week_plans = next_week_plans;
    if (status) update.status = status;
    
    await update.save();
    
    res.json({ success: true, update });
  } catch (err) {
    console.error('Error updating weekly update:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/weekly-updates/:id - Delete weekly update
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    const update = await models.WeeklyUpdate.findById(req.params.id);
    
    if (!update) {
      return res.status(404).json({ error: 'Weekly update not found' });
    }
    
    // Check permissions
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const hasManagePermission = user.permissions?.includes('manage_weekly_updates');
    const isOwner = update.resource_id.toString() === user.id;
    const isManager = user.role_name === 'Manager' && update.manager_id?.toString() === user.id;
    
    if (!isOwner && !isManager && !hasManagePermission && !isAdmin && !isCSP) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await models.WeeklyUpdate.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Weekly update deleted' });
  } catch (err) {
    console.error('Error deleting weekly update:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weekly-updates/resource/:resourceId - Get all updates for a specific resource
router.get('/resource/:resourceId', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const isManager = user.role_name === 'Manager';
    const hasGlobalPermission = user.permissions?.includes('view_global_weekly_updates');
    const resourceId = req.params.resourceId;
    
    // Check access permissions
    const canView = hasGlobalPermission || isAdmin || isCSP ||
                    resourceId === user.id ||
                    (isManager && await isResourceManagedBy(user.id, resourceId));
    
    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = await models.WeeklyUpdate.find({ resource_id: resourceId })
      .populate('resource_id', 'username email')
      .populate('manager_id', 'username email')
      .sort({ week_starting: -1 })
      .lean();
    
    const transformedUpdates = updates.map(update => ({
      ...update,
      resource_name: update.resource_id?.username || 'Unknown',
      manager_name: update.manager_id?.username || null,
      resource_id: update.resource_id?._id || update.resource_id,
      manager_id: update.manager_id?._id || update.manager_id
    }));
    
    res.json({ updates: transformedUpdates });
  } catch (err) {
    console.error('Error fetching resource updates:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/weekly-updates/remind/:resourceId - Send reminder to resource
router.post('/remind/:resourceId', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    const isAdmin = user.role_name === 'Admin' || user.role_name === 'Superuser';
    const isCSP = user.role_name === 'CSP';
    const isManager = user.role_name === 'Manager';
    const resourceId = req.params.resourceId;
    
    // Only managers, admin, or CSP can send reminders
    if (!isManager && !isAdmin && !isCSP) {
      return res.status(403).json({ error: 'Only managers can send reminders' });
    }
    
    // Check if manager manages this resource
    if (isManager && !(await isResourceManagedBy(user.id, resourceId))) {
      return res.status(403).json({ error: 'You can only remind your assigned resources' });
    }
    
    const resource = await dbAdapter.getUserById(resourceId);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Get the week from request body or use current week
    const weekStarting = req.body.week_starting || new Date();
    
    // Send the actual email
    const emailResult = await sendWeeklyUpdateReminder(
      resource.email,
      resource.username,
      weekStarting,
      user.username
    );
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send email: ' + emailResult.error });
    }
    
    res.json({ 
      success: true, 
      message: `Reminder sent to ${resource.username} at ${resource.email}` 
    });
  } catch (err) {
    console.error('Error sending reminder:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to check if a resource is managed by a manager
async function isResourceManagedBy(managerId, resourceId) {
  const resource = await dbAdapter.getUserById(resourceId);
  return resource && resource.manager_id === managerId;
}

module.exports = router;
