const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'checksheet.db');
// Ensure directory exists for persistent disk (e.g., /data on Render)
try { require('fs').mkdirSync(path.dirname(dbPath), { recursive: true }); } catch (e) {}
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'inspector',
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create inspections table for all check sheet types
db.exec(`
  CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    inspection_type TEXT NOT NULL,
    form_data TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    result TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    inspected_by TEXT DEFAULT '',
    approved_by TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Create default admin user
const adminExists = db.prepare('SELECT id FROM users WHERE employee_id = ?').get('ADMIN001');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (employee_id, name, email, password, role, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('ADMIN001', 'System Admin', 'admin@nexora.com', hashedPassword, 'admin', 1);
  console.log('Default admin created: ADMIN001 / admin123');
}

module.exports = db;
