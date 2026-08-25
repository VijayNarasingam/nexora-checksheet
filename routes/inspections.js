const express = require('express');
const router = express.Router();
const db = require('../db/setup');
const { authMiddleware } = require('./auth');

// Submit inspection form — only 4 category-specific types allowed (no unified)
const ALLOWED_TYPES = ['pdi', 'inprocess', 'tape', 'lamination'];
const MAX_REMARKS_LEN = 2000;
const MAX_NAME_LEN = 255;
const MAX_FORM_DATA_SIZE = 1024 * 100; // 100KB limit for form_data JSON

function parseFormData(row) {
  if (!row) return row;
  let fd = row.form_data;
  if (typeof fd === 'string') {
    try { fd = JSON.parse(fd); } catch (e) {}
  }
  return { ...row, form_data: fd };
}

function parseIdParam(id) {
  const num = parseInt(id, 10);
  if (!num || num < 1) return null;
  return num;
}

function sanitizeStr(val, maxLen) {
  if (!val || typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen || MAX_NAME_LEN);
}

router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { inspection_type, form_data, remarks, inspected_by, approved_by } = req.body;

    if (!inspection_type || !form_data) {
      return res.status(400).json({ error: 'Inspection type and form data are required' });
    }
    if (typeof form_data !== 'object' || Array.isArray(form_data)) {
      return res.status(400).json({ error: 'Form data must be an object' });
    }
    if (!ALLOWED_TYPES.includes(inspection_type)) {
      return res.status(400).json({ error: 'Invalid inspection type. Allowed: ' + ALLOWED_TYPES.join(', ') });
    }

    // Sanitize string fields
    const safeRemarks = sanitizeStr(remarks, MAX_REMARKS_LEN);
    const safeInspectedBy = sanitizeStr(inspected_by, MAX_NAME_LEN) || req.user.name;
    const safeApprovedBy = sanitizeStr(approved_by, MAX_NAME_LEN);

    // Validate form_data size
    const fdString = JSON.stringify(form_data);
    if (fdString.length > MAX_FORM_DATA_SIZE) {
      return res.status(400).json({ error: 'Form data exceeds maximum size limit' });
    }

    let result;
    if (db.isPg) {
      result = await db.run(
        `INSERT INTO inspections (user_id, inspection_type, form_data, status, remarks, inspected_by, approved_by)
         VALUES (?, ?, ?::jsonb, 'submitted', ?, ?, ?)`,
        [req.user.id, inspection_type, fdString, safeRemarks, safeInspectedBy, safeApprovedBy]
      );
    } else {
      result = await db.run(
        `INSERT INTO inspections (user_id, inspection_type, form_data, status, remarks, inspected_by, approved_by)
         VALUES (?, ?, ?, 'submitted', ?, ?, ?)`,
        [req.user.id, inspection_type, fdString, safeRemarks, safeInspectedBy, safeApprovedBy]
      );
    }

    res.json({ message: 'Inspection submitted successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit inspection' });
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
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// Get single inspection by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid inspection ID' });

    const inspection = await db.get(
      `SELECT i.*, u.name as user_name, u.employee_id as user_emp_id
       FROM inspections i
       JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [id]
    );

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    res.json(parseFormData(inspection));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
});

// Delete inspection
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid inspection ID' });

    const inspection = await db.get('SELECT * FROM inspections WHERE id = ?', [id]);
    if (!inspection) return res.status(404).json({ error: 'Not found' });

    if (req.user.role !== 'admin' && inspection.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.run('DELETE FROM inspections WHERE id = ?', [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete inspection' });
  }
});

module.exports = router;
