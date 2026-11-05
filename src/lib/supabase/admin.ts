// src/lib/supabase/admin.ts
// Service-role Supabase client for Server Components, Server Actions, and Route Handlers.
// Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS. Never expose to the client.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
