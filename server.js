if (process.env.VERCEL !== '1') { try { require('dotenv').config(); } catch (e) {} }
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('./db/setup');
const { router: authRouter } = require('./routes/auth');
const inspectionRoutes = require('./routes/inspections');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// DB readiness middleware — ensures tables exist before any API handler runs
app.use('/api', async (req, res, next) => {
  try {
    await db.ready;
    next();
  } catch (err) {
    console.error('DB not ready:', err.message);
    res.status(503).json({ error: 'Database is initializing, please retry in a moment' });
  }
});

// Health check for Vercel debugging
app.get('/api/health', async (req, res) => {
  try {
    if (db.isPg && db.pool) {
      await db.pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'Supabase Postgres', isPg: true });
    } else if (!db.isPg && db.db) {
      res.json({ status: 'ok', db: 'SQLite', isPg: false });
    } else {
      const err = process.env.VERCEL === '1' && !process.env.DATABASE_URL
        ? 'DATABASE_URL not set on Vercel. Set it in Vercel Dashboard → Settings → Environment Variables → DATABASE_URL=postgresql://... (Supabase). SQLite not supported on Vercel.'
        : 'Database not configured';
      res.status(500).json({ status: 'error', error: err, isPg: db.isPg, hasPool: !!db.pool, hasDb: !!db.db });
    }
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/inspections', inspectionRoutes);

// SPA fallback — ONLY for non-API GET requests (must come AFTER API routes)
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.VERCEL !== '1') {
  (async () => {
    await db.ready;
    app.listen(PORT, () => {
      console.log(`Nexora CheckSheet running at http://localhost:${PORT}`);
      console.log('Default Admin: Employee ID: ADMIN001 / Password: admin123');
      console.log('DB:', process.env.DATABASE_URL ? 'Supabase Postgres' : 'SQLite ' + (process.env.DATABASE_PATH || 'db/checksheet.db'));
    });
  })();
}

module.exports = app;
