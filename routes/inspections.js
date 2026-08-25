const express = require('express');
const router = express.Router();
const db = require('../db/setup');
const { authMiddleware } = require('./auth');

// Submit inspection form — only 4 category-specific types allowed (no unified)
const ALLOWED_TYPES = ['pdi', 'inprocess', 'tape', 'lamination'];
router.post('/submit', authMiddleware, (req, res) => {
  try {
    const { inspection_type, form_data, remarks, inspected_by, approved_by } = req.body;

    if (!inspection_type || !form_data) {
      return res.status(400).json({ error: 'Inspection type and form data are required' });
    }
    if (!ALLOWED_TYPES.includes(inspection_type)) {
      return res.status(400).json({ error: 'Invalid inspection type. Allowed: ' + ALLOWED_TYPES.join(', ') });
    }

    const result = db.prepare(`
      INSERT INTO inspections (user_id, inspection_type, form_data, status, remarks, inspected_by, approved_by)
      VALUES (?, ?, ?, 'submitted', ?, ?, ?)
    `).run(req.user.id, inspection_type, JSON.stringify(form_data), remarks || '', inspected_by || req.user.name, approved_by || '');

    res.json({ message: 'Inspection submitted successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all inspections for current user
router.get('/my-inspections', authMiddleware, (req, res) => {
  try {
    const inspections = db.prepare(`
      SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
      FROM inspections i
      JOIN users u ON i.user_id = u.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `).all(req.user.id);

    res.json(inspections.map(i => ({
      ...i,
      form_data: JSON.parse(i.form_data)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all inspections (admin)
router.get('/all-inspections', authMiddleware, (req, res) => {
  try {
    let inspections;
    if (req.user.role === 'admin') {
      inspections = db.prepare(`
        SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
        FROM inspections i
        JOIN users u ON i.user_id = u.id
        ORDER BY i.created_at DESC
      `).all();
    } else {
      inspections = db.prepare(`
        SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
        FROM inspections i
        JOIN users u ON i.user_id = u.id
        WHERE i.user_id = ?
        ORDER BY i.created_at DESC
      `).all(req.user.id);
    }

    res.json(inspections.map(i => ({
      ...i,
      form_data: JSON.parse(i.form_data)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single inspection by ID
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const inspection = db.prepare(`
      SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
      FROM inspections i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    res.json({
      ...inspection,
      form_data: JSON.parse(inspection.form_data)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete inspection
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    if (req.user.role !== 'admin' && inspection.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM inspections WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
