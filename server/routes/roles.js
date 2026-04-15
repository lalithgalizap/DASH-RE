const express = require('express');
const dbAdapter = require('../dbAdapter');
const { authenticate, requireAdmin } = require('../auth');

const router = express.Router();

// Get all roles with permissions
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const roles = await dbAdapter.getAllRoles();
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await dbAdapter.getRolePermissions(role.id);
        return { 
          ...role, 
          name: role.role_name,
          permissions 
        };
      })
    );
    res.json(rolesWithPermissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all permissions
router.get('/permissions', authenticate, requireAdmin, async (req, res) => {
  try {
    const permissions = await dbAdapter.getAllPermissions();
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create role
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, permission_ids } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const result = await dbAdapter.createRole({ role_name: name, description });
    
    if (permission_ids && permission_ids.length > 0) {
      await dbAdapter.updateRolePermissions(result.id, permission_ids);
    }
    
    res.json({ id: result.id, message: 'Role created successfully' });
  } catch (err) {
    if (err.message && err.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update role
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, permission_ids } = req.body;
    const roleId = req.params.id;
    
    const updateData = {};
    if (name) updateData.role_name = name;
    if (description !== undefined) updateData.description = description;
    
    if (Object.keys(updateData).length > 0) {
      await dbAdapter.updateRole(roleId, updateData);
    }
    
    if (permission_ids !== undefined) {
      await dbAdapter.updateRolePermissions(roleId, permission_ids);
    }
    
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    if (err.message && err.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete role
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await dbAdapter.deleteRole(req.params.id);
    res.json({ changes: result.changes, message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
