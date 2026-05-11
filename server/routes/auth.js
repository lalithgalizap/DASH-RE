const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const dbAdapter = require('../dbAdapter');
const { authenticate, getUserPermissions, generateToken, JWT_SECRET } = require('../auth');
const { sendPasswordResetEmail } = require('../email');

const router = express.Router();

// Rate limiter: max 10 login attempts per username per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by username so different users on the same network don't share a limit
  keyGenerator: (req) => {
    const username = (req.body?.username || '').toLowerCase().trim();
    return username || req.ip; // fall back to IP if no username in body
  },
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Rate limiter: max 3 password reset requests per email address per hour
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by email so User A exhausting resets doesn't block User B
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    return email || req.ip; // fall back to IP if no email in body
  },
  message: { error: 'Too many password reset requests. You can only request 3 resets per hour.' }
});

// In-memory anonymous reset code storage
// Structure: Map<code, { emailHash, expires, attempts }>
const resetCodes = new Map();
const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;
const RESET_TOKEN_EXPIRY = '10m'; // 10 minutes

// Generate 8-character alphanumeric code using cryptographically secure randomness
function generateResetCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// Hash email for anonymous storage
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

// Login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await dbAdapter.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block disabled accounts (only when explicitly false/0 — missing field means active)
    if (user.is_active === false || user.is_active === 0) {
      return res.status(403).json({ error: 'Your account has been disabled. Please contact an administrator.' });
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

// Forgot password - Step 1: Send reset code
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Always return same response to prevent user enumeration
    const user = await dbAdapter.getUserByEmail?.(email) || null;
    
    if (user) {
      // Block disabled accounts — don't send reset code
      if (!user.is_active) {
        // Return same generic response to avoid account enumeration
        return res.json({ 
          success: true, 
          message: 'If an account exists with this email, a reset code has been sent.' 
        });
      }

      // Generate anonymous code
      const code = generateResetCode();
      const emailHash = hashEmail(email);
      
      // Store in memory (anonymous)
      resetCodes.set(code, {
        emailHash,
        expires: Date.now() + CODE_EXPIRY_MS,
        attempts: 0
      });
      
      // Send email
      await sendPasswordResetEmail(email, code);
    }
    
    // Same response whether user exists or not
    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a reset code has been sent.' 
    });
  } catch (err) {
    console.error('Error in forgot-password:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Verify reset code - Step 2
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  try {
    const codeData = resetCodes.get(code);
    
    // Check if code exists
    if (!codeData) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    
    // Check expiry
    if (Date.now() > codeData.expires) {
      resetCodes.delete(code);
      return res.status(400).json({ error: 'Code has expired' });
    }
    
    // Check max attempts
    if (codeData.attempts >= MAX_ATTEMPTS) {
      resetCodes.delete(code);
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }
    
    // Verify email hash
    const emailHash = hashEmail(email);
    if (emailHash !== codeData.emailHash) {
      codeData.attempts++;
      return res.status(400).json({ error: 'Invalid code' });
    }
    
    // Get user
    const user = await dbAdapter.getUserByEmail?.(email);
    if (!user) {
      resetCodes.delete(code);
      return res.status(400).json({ error: 'User not found' });
    }
    
    // Generate reset token (short-lived JWT)
    const resetToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        purpose: 'password-reset'
      },
      JWT_SECRET,
      { expiresIn: RESET_TOKEN_EXPIRY }
    );
    
    // Delete used code
    resetCodes.delete(code);
    
    res.json({ 
      success: true, 
      resetToken 
    });
  } catch (err) {
    console.error('Error verifying code:', err);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Reset password - Step 3
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required' });
  }

  // Validate password strength
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Verify reset token
    const decoded = jwt.verify(resetToken, JWT_SECRET);
    
    // Check purpose
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid token' });
    }
    
    // Get user
    const user = await dbAdapter.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Block disabled accounts (only when explicitly false/0 — missing field means active)
    if (user.is_active === false || user.is_active === 0) {
      return res.status(403).json({ error: 'Your account has been disabled. Please contact an administrator.' });
    }
    
    // Hash and update password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await dbAdapter.updateUser(user.id, { password: hashedPassword });
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully. Please login with your new password.' 
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset session expired. Please start again.' });
    }
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
