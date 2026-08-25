try { require('dotenv').config({ override: false }); } catch (e) {}
const path = require('path');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;
const isPg = !!DATABASE_URL;

let db; // sqlite instance if isPg false
let pool; // pg Pool if isPg true
let get, all, run, query;

// Promise that resolves when schema is ready (important for Vercel cold starts)
let _readyResolve;
const ready = new Promise(resolve => { _readyResolve = resolve; });

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
  query = async (text, params = []) => pool.query(toPg(text), params);
  get = async (text, params = []) => {
    const res = await pool.query(toPg(text), params);
    return res.rows[0];
  };
  all = async (text, params = []) => {
    const res = await pool.query(toPg(text), params);
    return res.rows;
  };
  run = async (text, params = []) => {
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
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_inspections_type ON inspections(inspection_type)`);
      const adminExists = await get('SELECT id FROM users WHERE employee_id = ?', ['ADMIN001']);
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
    } finally {
      _readyResolve();
    }
  })();
} else if (process.env.VERCEL === '1') {
  // Vercel serverless has read-only filesystem — require DATABASE_URL
  console.error('FATAL: DATABASE_URL not set on Vercel. Set it in Vercel Dashboard → Settings → Environment Variables → DATABASE_URL=postgresql://... (Supabase). SQLite not supported on Vercel.');
  const errMsg = 'Database not configured. Set DATABASE_URL env var to your Supabase Postgres URL.';
  query = get = all = run = async () => { throw new Error(errMsg); };
  // Resolve ready to avoid hanging
  _readyResolve();
} else {
  // Local SQLite fallback
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.error('better-sqlite3 not available and DATABASE_URL not set. Set DATABASE_URL for Vercel/Supabase or install better-sqlite3 for local dev.');
    const errMsg = 'Database not configured. Set DATABASE_URL env var.';
    query = get = all = run = async () => { throw new Error(errMsg); };
    _readyResolve();
    Database = null;
  }
  if (Database) {
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
    _readyResolve();

    query = async (text, params = []) => {
      const stmt = db.prepare(text);
      if (/^\s*SELECT/i.test(text)) {
        const rows = stmt.all(...params);
        return { rows };
      } else {
        const info = stmt.run(...params);
        return { rows: [], rowCount: info.changes, ...info };
      }
    };
    get = async (text, params = []) => db.prepare(text).get(...params);
    all = async (text, params = []) => db.prepare(text).all(...params);
    run = async (text, params = []) => {
      const info = db.prepare(text).run(...params);
      return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
    };
  } else if (!query) {
    // Fallback if Database not loaded
    query = get = all = run = async () => { throw new Error('Database not configured'); };
    _readyResolve();
  }
}

module.exports = {
  isPg,
  pool,
  db,
  ready,
  query,
  get,
  all,
  run,
  prepare: isPg || !db ? undefined : (sql) => db.prepare(sql),
  exec: isPg || !db ? undefined : (sql) => db.exec(sql),
  pragma: isPg || !db ? undefined : (p) => db.pragma(p),
};
