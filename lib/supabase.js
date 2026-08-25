try { require('dotenv').config(); } catch (e) {}
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// Publishable client (frontend-safe, respects RLS) — use this for most app code
let supabase = null;
if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
} else if (SUPABASE_URL) {
  console.warn('Supabase URL set but PUBLISHABLE_KEY missing — supabase client not created');
}

// Service-role client (bypasses RLS) — only use server-side for admin tasks
let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { supabase, supabaseAdmin, SUPABASE_URL, SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL };
