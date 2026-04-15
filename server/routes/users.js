const express = require('express');
const bcrypt = require('bcryptjs');
const dbAdapter = require('../dbAdapter');
const { authenticate, requireAdmin } = require('../auth');
const { sendWelcomeEmail } = require('../email');

const router = express.Router();

// Get all users
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await dbAdapter.getAllUsers();
    res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Create user
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { username, email, password, role_id, is_active, send_email } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await dbAdapter.createUser({ username, email, password: hashedPassword, role_id: role_id || null });
    
    if (send_email) {
      const emailResult = await sendWelcomeEmail(email, username, password);
      if (!emailResult.success) {
        console.warn('Failed to send welcome email:', emailResult.error);
      }
    }
    
    res.json({ ...result, message: 'User created successfully' });
  } catch (err) {
    if (err.message.includes('duplicate') || err.message.includes('unique')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role_id, is_active } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
      updateData.password = bcrypt.hashSync(password, 10);
    }
    if (role_id !== undefined) {
      updateData.role_id = role_id || null;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const result = await dbAdapter.updateUser(req.params.id, updateData);
    res.json({ changes: result.changes, message: 'User updated successfully' });
  } catch (err) {
    if (err.message && err.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await dbAdapter.deleteUser(req.params.id);
    res.json({ changes: result.changes, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
