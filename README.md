# Nexora CheckSheet — Quality Inspection System

4-category manufacturing inspection (PDI / Inprocess / Tape Plant / Lamination), role-based auth, A4 printable record-specific download.

**Live:** `https://nexora-checksheet.onrender.com` (after Render deploy)  
**Stack:** Express 5 + better-sqlite3 + JWT + bcryptjs — Vanilla JS SPA (no bundler)

## Flow
Dashboard → Choose 1 of 4 categories → Fill form (signatures auto-locked to logged-in user) → Submit → Submitted Data → Select category → **Aggregated roll table (all rolls of that category in ONE table)** → View (dedicated A4 page for that record only) → Download Document (single record)

No Unified form. Dashboard shows **Recent Submissions** table (Date & Time, Employee ID, Employee Name, Category, Roll No., View).

## Quick Start (Local)
```bash
npm ci
# optional: set env
# PORT=3000
# JWT_SECRET=change-me
# DATABASE_PATH=./db/checksheet.db
npm start
# http://localhost:3000
# Admin: ADMIN001 / admin123   Inspector: EMP001 / test123
```

## Render Deploy (Fresh DB)
Created from `Dockerfile` + `render.yaml` with persistent Disk at `/data`:

- Env vars on Render (private): `JWT_SECRET` (random 32 chars), `DATABASE_PATH=/data/checksheet.db`, `PORT=3000`
- Disk wipes keep data persistent; first boot seeds admin if empty (`db/setup.js`). Local `db/*.db*` is gitignored → live starts fresh.
- Health check `GET /`

## Repo
Private — `.env` and `db/*.db*` excluded. See `.env.example`.

## API
- `POST /api/auth/register` / `login` → JWT 24h Bearer
- `GET /api/auth/pending-users` / `all-users` / `verify-user/:id` (admin)
- `POST /api/inspections/submit` (allowed: `pdi|inprocess|tape|lamination`)
- `GET /api/inspections/my-inspections` / `all-inspections` / `:id` / `DELETE :id`
