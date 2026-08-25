try { require('dotenv').config(); } catch (e) {}
const path = require('path');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;
const isPg = !!DATABASE_URL;

let db; // sqlite instance if isPg false
let pool; // pg Pool if isPg true

// Helpers that will be exported
let get, all, run, query;

if (isPg) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });

  const toPg = (text) => {
    let idx = 0;
    return text.replace(/\?/g, () => `$${++idx}`);
  };
  query = async (text, params = []) => {
    return pool.query(toPg(text), params);
  };
  get = async (text, params = []) => {
    const res = await pool.query(toPg(text), params);
    return res.rows[0];
  };
  all = async (text, params = []) => {
    const res = await pool.query(toPg(text), params);
    return res.rows;
  };
  run = async (text, params = []) => {
    // Auto-add RETURNING id for INSERT without it (for lastInsertRowid)
    let pgText = toPg(text);
    if (/^\s*INSERT/i.test(pgText) && !/RETURNING/i.test(pgText)) {
      pgText = pgText.replace(/;\s*$/, '') + ' RETURNING id';
    }
    const res = await pool.query(pgText, params);
    if (res.rows && res.rows[0] && res.rows[0].id !== undefined) {
      return { lastInsertRowid: res.rows[0].id, changes: res.rowCount, rows: res.rows };
    }
    return { lastInsertRowid: res.rows?.[0]?.id, changes: res.rowCount, rows: res.rows };
  };

  // Async init for Postgres
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          employee_id VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'inspector',
          is_verified INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS inspections (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          inspection_type VARCHAR(50) NOT NULL,
          form_data JSONB NOT NULL,
          status VARCHAR(50) DEFAULT 'draft',
          result VARCHAR(255) DEFAULT '',
          remarks TEXT DEFAULT '',
          inspected_by VARCHAR(255) DEFAULT '',
          approved_by VARCHAR(255) DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // GIN index for JSONB if not exists
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_inspections_type ON inspections(inspection_type)`);
      const adminExists = await get('SELECT id FROM users WHERE employee_id = $1', ['ADMIN001']);
      if (!adminExists) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await pool.query(
          `INSERT INTO users (employee_id, name, email, password, role, is_verified) VALUES ($1,$2,$3,$4,$5,$6)`,
          ['ADMIN001', 'System Admin', 'admin@nexora.com', hashedPassword, 'admin', 1]
        );
        console.log('Default admin created (pg): ADMIN001 / admin123');
      }
      console.log('Postgres DB ready (Supabase):', DATABASE_URL.split('@')[1]?.split('/')[0] || 'configured');
    } catch (e) {
      console.error('Postgres init error:', e.message);
    }
  })();
} else {
  const Database = require('better-sqlite3');
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'checksheet.db');
  try { require('fs').mkdirSync(path.dirname(dbPath), { recursive: true }); } catch (e) {}
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

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
  const adminExists = db.prepare('SELECT id FROM users WHERE employee_id = ?').get('ADMIN001');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (employee_id, name, email, password, role, is_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ADMIN001', 'System Admin', 'admin@nexora.com', hashedPassword, 'admin', 1);
    console.log('Default admin created (sqlite): ADMIN001 / admin123');
  }

  // Async wrappers for sqlite so routes can use await uniformly
  query = async (text, params = []) => {
    // Convert PG $1 style to ? for sqlite if needed; routes now use separate branches, but keep simple
    const stmt = db.prepare(text);
    // Try to detect query type
    if (/^\s*SELECT/i.test(text)) {
      const rows = stmt.all(...params);
      return { rows };
    } else {
      const info = stmt.run(...params);
      return { rows: [], rowCount: info.changes, ...info };
    }
  };
  get = async (text, params = []) => {
    return db.prepare(text).get(...params);
  };
  all = async (text, params = []) => {
    return db.prepare(text).all(...params);
  };
  run = async (text, params = []) => {
    const info = db.prepare(text).run(...params);
    return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
  };
}

// Export dual-mode helpers + raw instances for advanced use
module.exports = {
  isPg,
  pool,
  db,
  query,
  get,
  all,
  run,
  // Backward compat: if sqlite, module.exports itself was db; keep db property plus direct prepare for any old code
  prepare: isPg ? undefined : (sql) => db.prepare(sql),
  exec: isPg ? undefined : (sql) => db.exec(sql),
  pragma: isPg ? undefined : (p) => db.pragma(p),
};
