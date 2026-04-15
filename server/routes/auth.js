const express = require('express');
const bcrypt = require('bcryptjs');
const dbAdapter = require('../dbAdapter');
const { authenticate, getUserPermissions, generateToken } = require('../auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await dbAdapter.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const permissions = await getUserPermissions(user.id);
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role: user.role,
        role_name: user.role_name,
        permissions: permissions || []
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = await getUserPermissions(user.id);
    
    res.json({
      user: {
        ...user,
        permissions: permissions || []
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    const user = await dbAdapter.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const adminRole = await dbAdapter.getRoleByName('Admin');
    if (adminRole && user.role_id === adminRole.id) {
      return res.status(403).json({ error: 'Admin users cannot change password here. Use User Management.' });
    }

    const validPassword = bcrypt.compareSync(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await dbAdapter.updateUser(user.id, { password: hashedPassword });
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
