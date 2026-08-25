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

app.listen(PORT, () => {
  console.log(`CheckSheet App running at http://localhost:${PORT}`);
  console.log('Default Admin: Employee ID: ADMIN001 / Password: admin123');
});
