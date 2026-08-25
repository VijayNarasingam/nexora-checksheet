const express = require('express');
const router = express.Router();
const db = require('../db/setup');
const { authMiddleware } = require('./auth');

// Submit inspection form — only 4 category-specific types allowed (no unified)
const ALLOWED_TYPES = ['pdi', 'inprocess', 'tape', 'lamination'];

function parseFormData(row) {
  if (!row) return row;
  let fd = row.form_data;
  if (typeof fd === 'string') {
    try { fd = JSON.parse(fd); } catch (e) {}
  }
  return { ...row, form_data: fd };
}

router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { inspection_type, form_data, remarks, inspected_by, approved_by } = req.body;

    if (!inspection_type || !form_data) {
      return res.status(400).json({ error: 'Inspection type and form data are required' });
    }
    if (!ALLOWED_TYPES.includes(inspection_type)) {
      return res.status(400).json({ error: 'Invalid inspection type. Allowed: ' + ALLOWED_TYPES.join(', ') });
    }

    const fdString = JSON.stringify(form_data);
    let result;
    if (db.isPg) {
      result = await db.run(
        `INSERT INTO inspections (user_id, inspection_type, form_data, status, remarks, inspected_by, approved_by)
         VALUES (?, ?, ?::jsonb, 'submitted', ?, ?, ?)`,
        [req.user.id, inspection_type, fdString, remarks || '', inspected_by || req.user.name, approved_by || '']
      );
    } else {
      result = await db.run(
        `INSERT INTO inspections (user_id, inspection_type, form_data, status, remarks, inspected_by, approved_by)
         VALUES (?, ?, ?, 'submitted', ?, ?, ?)`,
        [req.user.id, inspection_type, fdString, remarks || '', inspected_by || req.user.name, approved_by || '']
      );
    }

    res.json({ message: 'Inspection submitted successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all inspections for current user
router.get('/my-inspections', authMiddleware, async (req, res) => {
  try {
    const inspections = await db.all(
      `SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
       FROM inspections i
       JOIN users u ON i.user_id = u.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );

    res.json(inspections.map(parseFormData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all inspections (admin)
router.get('/all-inspections', authMiddleware, async (req, res) => {
  try {
    let inspections;
    if (req.user.role === 'admin') {
      inspections = await db.all(
        `SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
         FROM inspections i
         JOIN users u ON i.user_id = u.id
         ORDER BY i.created_at DESC`
      );
    } else {
      inspections = await db.all(
        `SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
         FROM inspections i
         JOIN users u ON i.user_id = u.id
         WHERE i.user_id = ?
         ORDER BY i.created_at DESC`,
        [req.user.id]
      );
    }

    res.json(inspections.map(parseFormData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single inspection by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const inspection = await db.get(
      `SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
       FROM inspections i
       JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [req.params.id]
    );

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    res.json(parseFormData(inspection));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete inspection
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const inspection = await db.get('SELECT * FROM inspections WHERE id = ?', [req.params.id]);
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    if (req.user.role !== 'admin' && inspection.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.run('DELETE FROM inspections WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
