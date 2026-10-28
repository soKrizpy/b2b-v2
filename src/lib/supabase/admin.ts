// src/lib/supabase/admin.ts
// Service-role / hybrid Supabase client for Server Components, Server Actions, and Route Handlers.
// - When a valid service_role JWT is configured and no mock user cookie is active, queries real Supabase.
// - When a real Supabase user is logged in (via sb-*-auth-token cookie) and service_role key is absent/invalid,
//   forwards the user's authenticated JWT in Authorization header so RLS policies see auth.uid().
// - When a built-in demo/mock user is logged in (b2b_mock_user_id cookie) or no real Supabase session/service_role
//   is active, executes against the in-memory mock store so Admin, Teacher, and Student features work seamlessly.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  isSupabaseConfigured,
  isValidServiceRoleJwt,
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  markSupabaseKeyInvalid,
  createMockSupabaseClient,
  getPreviewFallbackSession,
  MOCK_SESSION_COOKIE,
  getMockStore,
} from './mock';

async function getRequestCookies(): Promise<
  Array<{ name: string; value: string }>
> {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return document.cookie
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const eqIdx = part.indexOf('=');
        if (eqIdx < 0) return { name: part, value: '' };
        return {
          name: part.slice(0, eqIdx).trim(),
          value: part.slice(eqIdx + 1).trim(),
        };
      });
  }

  try {
    const req = eval('require') as (id: string) => {
      cookies: () => Promise<{
        getAll: () => Array<{ name: string; value: string }>;
      }>;
    };
    const { cookies } = req('next/headers');
    const cookieStore = await cookies();
    return cookieStore.getAll();
  } catch {
    return [];
  }
}

function extractSupabaseSessionToken(
  allCookies: Array<{ name: string; value: string }>
): string | null {
  try {
    // Find base or chunked sb-*-auth-token cookies
    const baseCookie = allCookies.find(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    let rawValue = baseCookie?.value ?? '';

    if (!rawValue) {
      const chunkPrefix = allCookies
        .find(
          (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token.0')
        )
        ?.name.replace(/\.0$/, '');
      if (chunkPrefix) {
        const chunks: string[] = [];
        for (let i = 0; i < 10; i++) {
          const chunk = allCookies.find(
            (c) => c.name === `${chunkPrefix}.${i}`
          );
          if (!chunk) break;
          chunks.push(chunk.value);
        }
        rawValue = chunks.join('');
      }
    }

    if (!rawValue) return null;

    let jsonStr = rawValue;
    if (jsonStr.startsWith('base64-')) {
      const b64 = jsonStr
        .slice('base64-'.length)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      jsonStr = Buffer.from(b64, 'base64').toString('utf8');
    } else if (jsonStr.startsWith('%')) {
      jsonStr = decodeURIComponent(jsonStr);
    }

    const parsed = JSON.parse(jsonStr) as { access_token?: string } | [string];
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return parsed[0];
    }
    if (
      parsed &&
      typeof (parsed as { access_token?: string }).access_token === 'string'
    ) {
      return (parsed as { access_token: string }).access_token;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveExecutionTarget(): Promise<
  { mode: 'mock' } | { mode: 'real'; authToken: string }
> {
  const url = getSupabaseUrl();
  if (!url.startsWith('http') || !isSupabaseConfigured()) {
    return { mode: 'mock' };
  }

  let allCookies: Array<{ name: string; value: string }> = [];
  try {
    allCookies = await getRequestCookies();
    const mockUserId = allCookies.find(
      (c) => c.name === MOCK_SESSION_COOKIE
    )?.value;
    if (mockUserId && getMockStore().users.some((u) => u.id === mockUserId)) {
      return { mode: 'mock' };
    }
  } catch {
    // Called outside request scope (e.g. build time or unstable_cache)
  }

  const fallback = getPreviewFallbackSession();
  if (fallback?.isMock) {
    return { mode: 'mock' };
  }

  const serviceKey = getSupabaseServiceRoleKey();
  if (isValidServiceRoleJwt(serviceKey)) {
    return { mode: 'real', authToken: serviceKey };
  }

  let userAccessToken: string | null = null;
  try {
    userAccessToken = extractSupabaseSessionToken(allCookies);
  } catch {
    // ignore
  }

  if (userAccessToken) {
    return { mode: 'real', authToken: userAccessToken };
  }

  return { mode: 'mock' };
}

function buildRealClientWithToken(authToken: string): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceKey = getSupabaseServiceRoleKey();

  const isServiceRole =
    authToken === serviceKey ||
    authToken.startsWith('sb_secret_') ||
    authToken.startsWith('sbp_');
  const keyToUse = isServiceRole ? serviceKey : anonKey;

  return createClient<Database>(url, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        apikey: keyToUse,
        Authorization: `Bearer ${authToken}`,
      },
      fetch: async (fetchUrl, options) => {
        const res = await fetch(fetchUrl, { ...options, cache: 'no-store' });
        if (res.status === 401 || res.status === 403) {
          try {
            const text = await res.clone().text();
            if (text.toLowerCase().includes('invalid api key')) {
              markSupabaseKeyInvalid(authToken);
            }
          } catch {
            // ignore
          }
        }
        return res;
      },
    },
  });
}

class SmartAdminQueryBuilder {
  private table: string;
  private ops: Array<{ method: string; args: unknown[] }> = [];

  constructor(table: string) {
    this.table = table;
  }

  private record(method: string, ...args: unknown[]) {
    this.ops.push({ method, args });
    return this;
  }

  select(...args: unknown[]) {
    return this.record('select', ...args);
  }
  insert(...args: unknown[]) {
    return this.record('insert', ...args);
  }
  update(...args: unknown[]) {
    return this.record('update', ...args);
  }
  upsert(...args: unknown[]) {
    return this.record('upsert', ...args);
  }
  delete(...args: unknown[]) {
    return this.record('delete', ...args);
  }
  eq(...args: unknown[]) {
    return this.record('eq', ...args);
  }
  neq(...args: unknown[]) {
    return this.record('neq', ...args);
  }
  gt(...args: unknown[]) {
    return this.record('gt', ...args);
  }
  gte(...args: unknown[]) {
    return this.record('gte', ...args);
  }
  lt(...args: unknown[]) {
    return this.record('lt', ...args);
  }
  lte(...args: unknown[]) {
    return this.record('lte', ...args);
  }
  in(...args: unknown[]) {
    return this.record('in', ...args);
  }
  is(...args: unknown[]) {
    return this.record('is', ...args);
  }
  not(...args: unknown[]) {
    return this.record('not', ...args);
  }
  or(...args: unknown[]) {
    return this.record('or', ...args);
  }
  filter(...args: unknown[]) {
    return this.record('filter', ...args);
  }
  order(...args: unknown[]) {
    return this.record('order', ...args);
  }
  range(...args: unknown[]) {
    return this.record('range', ...args);
  }
  limit(...args: unknown[]) {
    return this.record('limit', ...args);
  }
  single(...args: unknown[]) {
    return this.record('single', ...args);
  }
  maybeSingle(...args: unknown[]) {
    return this.record('maybeSingle', ...args);
  }

  private replayOn(client: {
    from: (t: string) => unknown;
  }): Promise<{ data: unknown; error: unknown; count?: number }> {
    let builder = client.from(this.table) as Record<
      string,
      (...a: unknown[]) => unknown
    >;
    for (const op of this.ops) {
      const fn = builder[op.method];
      if (typeof fn === 'function') {
        builder = fn.apply(builder, op.args) as Record<
          string,
          (...a: unknown[]) => unknown
        >;
      }
    }
    return builder as unknown as Promise<{
      data: unknown;
      error: unknown;
      count?: number;
    }>;
  }

  private async execute() {
    const target = await resolveExecutionTarget();
    const mockClient = createMockSupabaseClient();

    if (target.mode === 'mock') {
      return this.replayOn(mockClient);
    }

    try {
      const realClient = buildRealClientWithToken(target.authToken);
      const res = await this.replayOn(
        realClient as unknown as { from: (t: string) => unknown }
      );
      return res;
    } catch {
      // Network/transport failures must not turn into plausible mock results.
      return {
        data: null,
        error: { message: 'Supabase request failed.' },
      };
    }
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const mockClient = createMockSupabaseClient();

  const hybridClient = {
    from(table: string) {
      return new SmartAdminQueryBuilder(table);
    },
    async rpc(functionName: string, args: Record<string, unknown>) {
      const target = await resolveExecutionTarget();
      if (target.mode === 'mock') {
        return mockClient.rpc(functionName, args);
      }

      try {
        const realClient = buildRealClientWithToken(
          target.authToken
        ) as unknown as {
          rpc: (
            name: string,
            params: Record<string, unknown>
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
        return await realClient.rpc(functionName, args);
      } catch {
        return {
          data: null,
          error: { message: 'Supabase RPC request failed.' },
        };
      }
    },
    auth: {
      ...mockClient.auth,
      admin: {
        async listUsers(params?: { page?: number; perPage?: number }) {
          const target = await resolveExecutionTarget();
          if (target.mode === 'mock') {
            return mockClient.auth.admin.listUsers();
          }
          const serviceKey = getSupabaseServiceRoleKey();
          if (isValidServiceRoleJwt(serviceKey)) {
            try {
              const real = buildRealClientWithToken(serviceKey);
              return await real.auth.admin.listUsers(params);
            } catch {
              return {
                data: { users: [] },
                error: { message: 'Supabase admin request failed.' },
              };
            }
          }
          return {
            data: { users: [] },
            error: { message: 'Supabase service role is not configured.' },
          };
        },
        async createUser(attrs: {
          email: string;
          password?: string;
          email_confirm?: boolean;
          user_metadata?: Record<string, unknown>;
        }) {
          const target = await resolveExecutionTarget();
          if (target.mode === 'mock') {
            return mockClient.auth.admin.createUser(attrs);
          }
          const serviceKey = getSupabaseServiceRoleKey();
          if (isValidServiceRoleJwt(serviceKey)) {
            try {
              const real = buildRealClientWithToken(serviceKey);
              return await real.auth.admin.createUser(attrs);
            } catch {
              return {
                data: { user: null },
                error: { message: 'Supabase admin request failed.' },
              };
            }
          }
          return {
            data: { user: null },
            error: { message: 'Supabase service role is not configured.' },
          };
        },
        async updateUserById(
          id: string,
          attrs: {
            user_metadata?: Record<string, unknown>;
            password?: string;
            email_confirm?: boolean;
          }
        ) {
          const target = await resolveExecutionTarget();
          if (target.mode === 'mock') {
            return mockClient.auth.admin.updateUserById(id, attrs);
          }
          const serviceKey = getSupabaseServiceRoleKey();
          if (isValidServiceRoleJwt(serviceKey)) {
            try {
              const real = buildRealClientWithToken(serviceKey);
              return await real.auth.admin.updateUserById(id, attrs);
            } catch {
              return {
                data: { user: null },
                error: { message: 'Supabase admin request failed.' },
              };
            }
          }
          return {
            data: { user: null },
            error: { message: 'Supabase service role is not configured.' },
          };
        },
        async deleteUser(id: string) {
          const target = await resolveExecutionTarget();
          if (target.mode === 'mock') return mockClient.auth.admin.deleteUser(id);
          const serviceKey = getSupabaseServiceRoleKey();
          if (isValidServiceRoleJwt(serviceKey)) {
            try {
              const real = buildRealClientWithToken(serviceKey);
              return await real.auth.admin.deleteUser(id);
            } catch {
              return {
                data: { user: null },
                error: { message: 'Supabase admin request failed.' },
              };
            }
          }
          return {
            data: { user: null },
            error: { message: 'Supabase service role is not configured.' },
          };
        },
      },
    },
  };

  return hybridClient as unknown as SupabaseClient<Database>;
}
