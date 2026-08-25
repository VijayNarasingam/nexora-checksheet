try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { router: authRouter } = require('./routes/auth');
const inspectionRoutes = require('./routes/inspections');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/inspections', inspectionRoutes);

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Nexora CheckSheet running at http://localhost:${PORT}`);
    console.log('Default Admin: Employee ID: ADMIN001 / Password: admin123');
    console.log('DB:', process.env.DATABASE_URL ? 'Supabase Postgres' : 'SQLite ' + (process.env.DATABASE_PATH || 'db/checksheet.db'));
  });
}

module.exports = app;
