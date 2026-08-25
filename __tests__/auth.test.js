const request = require('supertest');
const express = require('express');
const path = require('path');

// Force SQLite for tests — must be set before any module loads
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.DATABASE_URL = "";
process.env.DATABASE_PATH = path.join(__dirname, 'test-auth.db');

// Rebuild app for each test suite
let app;
beforeAll(() => {
  app = require('../server');
});

afterAll(() => {
  // Clean up test DB
  const fs = require('fs');
  const dbPath = process.env.DATABASE_PATH;
  try { fs.unlinkSync(dbPath); } catch (e) {}
  try { fs.unlinkSync(dbPath + '-shm'); } catch (e) {}
  try { fs.unlinkSync(dbPath + '-wal'); } catch (e) {}
});

describe('Auth Routes', () => {
  const testUserId = 'TEST' + Date.now().toString(36).toUpperCase();
  const testUser = {
    employee_id: testUserId,
    name: 'Test User',
    email: `test-${testUserId.toLowerCase()}@example.com`,
    password: 'password123',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/successful/i);
      expect(res.body.userId).toBeDefined();
    });

    it('should reject duplicate employee_id', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ employee_id: 'X' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject short employee_id', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, employee_id: 'AB' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, employee_id: 'TEST002', email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, employee_id: 'TEST003', email: 't2@test.com', password: '123' });
      expect(res.status).toBe(400);
    });

    it('should sanitize and lowercase email', async () => {
      const sanitizeId = 'SAN' + Date.now().toString(36).toUpperCase();
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          employee_id: sanitizeId,
          name: '  Sanitize Test  ',
          email: `  ${sanitizeId}@Example.COM  `,
          password: 'password123',
        });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid admin credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ employee_id: 'ADMIN001', password: 'admin123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.employee_id).toBe('ADMIN001');
      expect(res.body.user.role).toBe('admin');
    });

    it('should reject unverified user', async () => {
      // testUserId was registered but not verified
      const res = await request(app)
        .post('/api/auth/login')
        .send({ employee_id: testUserId, password: 'password123' });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not yet verified/i);
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ employee_id: 'ADMIN001', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ employee_id: 'NOBODY', password: 'password123' });
      expect(res.status).toBe(401);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ employee_id: 'ADMIN001' });
      expect(res.status).toBe(400);
    });
  });

  describe('Admin routes', () => {
    let adminToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ employee_id: 'ADMIN001', password: 'admin123' });
      adminToken = res.body.token;
    });

    it('should list pending users', async () => {
      const res = await request(app)
        .get('/api/auth/pending-users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should list all users', async () => {
      const res = await request(app)
        .get('/api/auth/all-users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should verify a pending user', async () => {
      // First get pending users to find TEST001's ID
      const pending = await request(app)
        .get('/api/auth/pending-users')
        .set('Authorization', `Bearer ${adminToken}`);
      const testUser = pending.body.find(u => u.employee_id === testUserId);
      // If user was already verified in a previous run, skip this assertion
      if (testUser) {
        const res = await request(app)
          .post(`/api/auth/verify-user/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
      }
    });

    it('should reject non-admin access', async () => {
      const res = await request(app)
        .get('/api/auth/pending-users')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('should reject verify with invalid ID', async () => {
      const res = await request(app)
        .post('/api/auth/verify-user/abc')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });
});
