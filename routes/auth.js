const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/setup');

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'nexora-checksheet-secret-key-2026';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set. Using fallback key. Set JWT_SECRET in Vercel Dashboard → Settings → Environment Variables for production.');
}
if (process.env.VERCEL === '1' && !process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set on Vercel. Set it in Vercel Dashboard → Settings → Environment Variables.');
}

// --- Input Validation Helpers ---
const EMP_ID_REGEX = /^[A-Za-z0-9]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LEN = 100;
const MIN_PASSWORD_LEN = 6;
const MAX_PASSWORD_LEN = 128;

function validateEmployeeId(id) {
  if (!id || typeof id !== 'string') return 'Employee ID is required';
  if (!EMP_ID_REGEX.test(id.trim())) return 'Employee ID must be 3-20 alphanumeric characters';
  return null;
}

function validateName(name) {
  if (!name || typeof name !== 'string') return 'Name is required';
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > MAX_NAME_LEN) return `Name must be 2-${MAX_NAME_LEN} characters`;
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email is required';
  if (!EMAIL_REGEX.test(email.trim())) return 'Invalid email format';
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters`;
  if (password.length > MAX_PASSWORD_LEN) return `Password must be at most ${MAX_PASSWORD_LEN} characters`;
  return null;
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { employee_id, name, email, password } = req.body;

    // Validate all fields
    const errors = [
      validateEmployeeId(employee_id),
      validateName(name),
      validateEmail(email),
      validatePassword(password),
    ].filter(Boolean);
    if (errors.length) {
      return res.status(400).json({ error: errors[0] });
    }

    const trimmedEmpId = employee_id.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const existing = await db.get('SELECT id FROM users WHERE employee_id = ? OR email = ?', [trimmedEmpId, trimmedEmail]);
    if (existing) {
      return res.status(400).json({ error: 'Employee ID or Email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await db.run(
      `INSERT INTO users (employee_id, name, email, password, role, is_verified) VALUES (?, ?, ?, ?, 'inspector', 0)`,
      [trimmedEmpId, trimmedName, trimmedEmail, hashedPassword]
    );

    res.json({ message: 'Registration successful. Waiting for admin approval.', userId: result.lastInsertRowid });
  } catch (err) {
    console.error('Registration error:', err.message);
    if (err.message.includes('Database not configured')) {
      return res.status(503).json({ error: 'Database not configured. Please contact administrator.' });
    }
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { employee_id, password } = req.body;

    if (!employee_id || typeof employee_id !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Employee ID and password are required' });
    }

    const trimmedEmpId = employee_id.trim();
    if (!trimmedEmpId) {
      return res.status(400).json({ error: 'Employee ID and password are required' });
    }

    const user = await db.get('SELECT * FROM users WHERE employee_id = ?', [trimmedEmpId]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Account not yet verified by admin. Please wait for approval.' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, employee_id: user.employee_id, name: user.name, role: user.role },
      JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    if (err.message.includes('Database not configured')) {
      return res.status(503).json({ error: 'Database not configured. Please contact administrator.' });
    }
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin middleware
function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Get pending users (admin only)
router.get('/pending-users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await db.all('SELECT id, employee_id, name, email, role, is_verified, created_at FROM users WHERE is_verified = 0');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (admin only)
router.get('/all-users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await db.all('SELECT id, employee_id, name, email, role, is_verified, created_at FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify user (admin only)
router.post('/verify-user/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || userId < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    await db.run('UPDATE users SET is_verified = 1 WHERE id = ?', [userId]);
    res.json({ message: 'User verified successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Reject user (admin only)
router.post('/reject-user/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || userId < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    // Prevent admin from rejecting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot reject your own account' });
    }
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User rejected and removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

module.exports = { router, authMiddleware, adminMiddleware, JWT_SECRET: JWT_SECRET_KEY };
