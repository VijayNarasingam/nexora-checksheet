const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/setup');

const JWT_SECRET = process.env.JWT_SECRET || 'nexora-checksheet-secret-key-2026';

// Register
router.post('/register', (req, res) => {
  try {
    const { employee_id, name, email, password } = req.body;

    if (!employee_id || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE employee_id = ? OR email = ?').get(employee_id, email);
    if (existing) {
      return res.status(400).json({ error: 'Employee ID or Email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (employee_id, name, email, password, role, is_verified)
      VALUES (?, ?, ?, ?, 'inspector', 0)
    `).run(employee_id, name, email, hashedPassword);

    res.json({ message: 'Registration successful. Waiting for admin approval.', userId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { employee_id, password } = req.body;

    if (!employee_id || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE employee_id = ?').get(employee_id);
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
      JWT_SECRET,
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
    res.status(500).json({ error: err.message });
  }
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
router.get('/pending-users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = db.prepare('SELECT id, employee_id, name, email, role, is_verified, created_at FROM users WHERE is_verified = 0').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (admin only)
router.get('/all-users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = db.prepare('SELECT id, employee_id, name, email, role, is_verified, created_at FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify user (admin only)
router.post('/verify-user/:userId', authMiddleware, adminMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(req.params.userId);
    res.json({ message: 'User verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject user (admin only)
router.post('/reject-user/:userId', authMiddleware, adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.userId);
    res.json({ message: 'User rejected and removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, authMiddleware, adminMiddleware, JWT_SECRET };
