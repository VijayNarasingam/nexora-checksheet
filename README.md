# Nexora CheckSheet — Quality Inspection System

4-category manufacturing inspection (PDI / Inprocess / Tape Plant / Lamination), role-based auth, A4 printable record-specific download.

**Stack:** Express 5 + JWT + bcryptjs + **Supabase Postgres** (via `pg`) / SQLite fallback — Vanilla JS SPA

> **No Unified form.** Dashboard → 4 categories (signatures auto-locked to logged-in user, no New Entry badge) → Submitted Data → category → **Aggregated roll table (all rolls of that category in ONE combined table, all means that particular category)** → View (dedicated A4 for that record only) → Download Document (single record). Dashboard shows **Recent Submissions** (`Date & Time | Employee ID | Name | Category | Roll No. | View`).

**Repo:** Public — `https://github.com/VijayNarasingam/nexora-checksheet` — `.env` and `db/*.db*` excluded.

## Quick Start (Local — SQLite fallback, no Supabase needed)
```bash
npm ci
npm start
# http://localhost:3000
# Admin: ADMIN001 / admin123   Inspector: EMP001 / test123
# Uses SQLite at ./db/checksheet.db automatically if DATABASE_URL not set
```

## Supabase Setup (Live — Free, no Subscription)
1. Create project at https://supabase.com → Project Settings → Database → **Connection String** (URI) → copy.
2. Local test: create `.env` from `.env.example`:
```
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=your-random-32chars
PORT=3000
```
   `npm start` → auto-creates `users` + `inspections (JSONB)` + seeds `ADMIN001` (fresh).

## Deploy

### Option A — Vercel (Free, serverless, no Disk) — Recommended with Supabase
- Import GitHub repo `VijayNarasingam/nexora-checksheet` on https://vercel.com → Framework Other → env vars `DATABASE_URL`, `JWT_SECRET` → Deploy (uses `vercel.json` → `server.js` via `@vercel/node`). `better-sqlite3` still installed but not used when `DATABASE_URL` set; `server.js` exports `app` for serverless.

### Option B — Render (Docker or Node, no Disk needed with Supabase)
- If you still want Render: New Web Service → Connect repo → **do NOT attach Disk** when using Supabase → Build `npm ci`, Start `npm start`, env `DATABASE_URL`, `JWT_SECRET`. Existing `Dockerfile`/`render.yaml` still works but set `DATABASE_PATH` not needed.

## API
- `POST /api/auth/register` / `login` → JWT 24h Bearer
- `GET /api/auth/pending-users` / `all-users` / `POST /verify-user/:id` (admin)
- `POST /api/inspections/submit` (allowed: `pdi|inprocess|tape|lamination` — `unified` rejected)
- `GET /api/inspections/my-inspections` / `all-inspections` / `:id` / `DELETE :id`
