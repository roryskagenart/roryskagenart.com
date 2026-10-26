import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable resolution with fallback to Vercel integration variables
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

// ⚠️ No cross-project fallbacks here. A stale host literal silently points the browser at a
// retired project instead of failing, which is exactly how the 2026-10 Supabase cutover went
// unnoticed. Missing config must leave `isSupabaseConfigured` false and disable auth visibly.
const supabaseUrl =
  metaEnv.NEXT_PUBLIC_VRCL_SUPA_SUPABASE_URL ||
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  metaEnv.VITE_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  metaEnv.VRCL_SUPA_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_VRCL_SUPA_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_VRCL_SUPA_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// supabase-js throws on an empty URL, and this module is imported on every page. A loopback
// placeholder keeps construction side-effect free without naming a real project;
// `isSupabaseConfigured` is false, so every consumer short-circuits before using it.
const INERT_URL = 'http://127.0.0.1:54321';
const INERT_KEY = 'unconfigured';

export const supabase: SupabaseClient = createClient(
  supabaseUrl || INERT_URL,
  supabaseAnonKey || INERT_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
