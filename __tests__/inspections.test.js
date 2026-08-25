const request = require('supertest');
const express = require('express');
const path = require('path');

// Force SQLite for tests — must be set before any module loads
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.DATABASE_URL = "";
process.env.DATABASE_PATH = path.join(__dirname, 'test-inspections.db');

let app;
let adminToken;
let inspectorToken;

beforeAll(async () => {
  app = require('../server');

  // Login as admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ employee_id: 'ADMIN001', password: 'admin123' });
  adminToken = adminRes.body.token;

  // Use unique ID to avoid conflicts with previous test runs
  const inspEmpId = 'INSP' + Date.now().toString(36).toUpperCase();
  const inspEmail = `inspector-${inspEmpId.toLowerCase()}@test.com`;

  // Register and verify a test inspector
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({
      employee_id: inspEmpId,
      name: 'Test Inspector',
      email: inspEmail,
      password: 'password123',
    });

  // Get pending user ID and verify
  if (regRes.status === 200) {
    const pending = await request(app)
      .get('/api/auth/pending-users')
      .set('Authorization', `Bearer ${adminToken}`);
    const inspUser = pending.body.find(u => u.employee_id === inspEmpId);
    if (inspUser) {
      await request(app)
        .post(`/api/auth/verify-user/${inspUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  }

  // Login as inspector
  const inspRes = await request(app)
    .post('/api/auth/login')
    .send({ employee_id: inspEmpId, password: 'password123' });
  inspectorToken = inspRes.body.token;
});

afterAll(() => {
  const fs = require('fs');
  const dbPath = process.env.DATABASE_PATH;
  try { fs.unlinkSync(dbPath); } catch (e) {}
  try { fs.unlinkSync(dbPath + '-shm'); } catch (e) {}
  try { fs.unlinkSync(dbPath + '-wal'); } catch (e) {}
});

describe('Inspection Routes', () => {
  const samplePDI = {
    inspection_type: 'pdi',
    form_data: {
      date: '2026-08-25',
      wo_no: 'W72600095',
      customer: 'Polyglass',
      rolls: [{ roll_number: 'R001', roll_weight: 300, width: 100 }],
      result: 'Accepted',
    },
    inspected_by: 'Test Inspector',
    approved_by: 'Admin',
    remarks: 'Test submission',
  };

  const sampleInprocess = {
    inspection_type: 'inprocess',
    form_data: {
      date: '2026-08-25',
      shift: 'Morning',
      rows: [{ loom: 'L001', wo: 'W72600098', mesh: '10x10', gsm_actual: 162 }],
    },
  };

  let createdInspectionId;

  describe('POST /api/inspections/submit', () => {
    it('should submit a PDI inspection', async () => {
      const res = await request(app)
        .post('/api/inspections/submit')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send(samplePDI);
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      createdInspectionId = res.body.id;
    });

    it('should submit an inprocess inspection', async () => {
      const res = await request(app)
        .post('/api/inspections/submit')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send(sampleInprocess);
      expect(res.status).toBe(200);
    });

    it('should reject invalid inspection type', async () => {
      const res = await request(app)
        .post('/api/inspections/submit')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ inspection_type: 'unified', form_data: {} });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('should reject missing form_data', async () => {
      const res = await request(app)
        .post('/api/inspections/submit')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ inspection_type: 'pdi' });
      expect(res.status).toBe(400);
    });

    it('should reject non-object form_data', async () => {
      const res = await request(app)
        .post('/api/inspections/submit')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ inspection_type: 'pdi', form_data: 'not-an-object' });
      expect(res.status).toBe(400);
    });

    it('should reject array form_data', async () => {
      const res = await request(app)
        .post('/api/inspections/submit')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ inspection_type: 'pdi', form_data: [1, 2, 3] });
      expect(res.status).toBe(400);
    });

    it('should sanitize string fields', async () => {
      const res = await request(app)
        .post('/api/inspections/submit')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          inspection_type: 'pdi',
          form_data: { date: '2026-08-25' },
          remarks: '  <script>alert("xss")</script>  ',
          inspected_by: '<img src=x onerror=alert(1)>',
        });
      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/inspections/submit')
        .send(samplePDI);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/inspections/my-inspections', () => {
    it('should return inspector own inspections', async () => {
      const res = await request(app)
        .get('/api/inspections/my-inspections')
        .set('Authorization', `Bearer ${inspectorToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/inspections/all-inspections', () => {
    it('should return all inspections for admin', async () => {
      const res = await request(app)
        .get('/api/inspections/all-inspections')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/inspections/:id', () => {
    it('should return a specific inspection', async () => {
      const res = await request(app)
        .get(`/api/inspections/${createdInspectionId}`)
        .set('Authorization', `Bearer ${inspectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdInspectionId);
      expect(res.body.form_data).toBeDefined();
    });

    it('should return 404 for non-existent inspection', async () => {
      const res = await request(app)
        .get('/api/inspections/99999')
        .set('Authorization', `Bearer ${inspectorToken}`);
      expect(res.status).toBe(404);
    });

    it('should reject invalid ID format', async () => {
      const res = await request(app)
        .get('/api/inspections/abc')
        .set('Authorization', `Bearer ${inspectorToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/inspections/:id', () => {
    it('should delete own inspection', async () => {
      const res = await request(app)
        .delete(`/api/inspections/${createdInspectionId}`)
        .set('Authorization', `Bearer ${inspectorToken}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 after deletion', async () => {
      const res = await request(app)
        .get(`/api/inspections/${createdInspectionId}`)
        .set('Authorization', `Bearer ${inspectorToken}`);
      expect(res.status).toBe(404);
    });

    it('should reject invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/inspections/abc')
        .set('Authorization', `Bearer ${inspectorToken}`);
      expect(res.status).toBe(400);
    });
  });
});
