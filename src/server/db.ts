import { Pool, QueryResult, QueryResultRow } from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let poolInstance: Pool | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

export function getCleanConnectionString(): string {
  // `VRCL_SUPA_*` first because it is the pair that is known-good in production today; the
  // unprefixed names are what a Vercel Supabase integration writes, and what `.env` holds.
  // Both are accepted so neither naming scheme can leave the server with no database — which
  // is exactly what happened in October 2026 when only the unprefixed set survived.
  const raw =
    process.env.VRCL_SUPA_POSTGRES_PRISMA_URL ||
    process.env.VRCL_SUPA_POSTGRES_URL ||
    process.env.VRCL_SUPA_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';

  // Strip query parameters so pg SSL configuration is authoritative
  return raw.replace(/\?.*$/, '');
}

export function getDbPool(): Pool {
  if (!poolInstance) {
    const connectionString = getCleanConnectionString();
    if (!connectionString) {
      throw new Error('PostgreSQL connection string is missing from environment.');
    }

    poolInstance = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client pool:', err);
    });
  }
  return poolInstance;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getDbPool();
  return pool.query<T>(text, params);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    // ⚠️ No cross-project fallback. This client carries the service-role key, so a stale host
    // literal would point privileged writes at a retired project instead of failing loudly.
    // Both naming schemes are accepted; the host is never defaulted.
    const supabaseUrl =
      process.env.NEXT_PUBLIC_VRCL_SUPA_SUPABASE_URL ||
      process.env.VRCL_SUPA_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error(
        'Supabase URL missing: set NEXT_PUBLIC_VRCL_SUPA_SUPABASE_URL, VRCL_SUPA_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.'
      );
    }

    const serviceKey =
      process.env.VRCL_SUPA_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      throw new Error(
        'Supabase service-role key missing: set VRCL_SUPA_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY.'
      );
    }

    supabaseAdminInstance = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdminInstance;
}

export async function checkDbHealth(): Promise<{
  connected: boolean;
  version?: string;
  artworksCount?: number;
  error?: string;
}> {
  try {
    const res = await query('SELECT version(), (SELECT count(*) FROM public.artworks) as artworks_count;');
    return {
      connected: true,
      version: res.rows[0].version,
      artworksCount: Number(res.rows[0].artworks_count || 0),
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Database connection error',
    };
  }
}
