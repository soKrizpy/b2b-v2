import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestClient = {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  auth: { admin: Record<string, ReturnType<typeof vi.fn>> };
};

const state = vi.hoisted(() => ({
  realClient: null as unknown as TestClient,
  mockClient: null as unknown as TestClient,
  mockMode: false,
  serviceKey: 'service-role-test-key',
  createClientCalls: [] as unknown[][],
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((...args: unknown[]) => {
    state.createClientCalls.push(args);
    return state.realClient;
  }),
}));

vi.mock('@/lib/supabase/mock', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  isValidServiceRoleJwt: vi.fn(() => true),
  getSupabaseUrl: vi.fn(() => 'https://example.supabase.co'),
  getSupabaseAnonKey: vi.fn(() => 'public-anon-key'),
  getSupabaseServiceRoleKey: vi.fn(() => state.serviceKey),
  markSupabaseKeyInvalid: vi.fn(),
  createMockSupabaseClient: vi.fn(() => state.mockClient),
  getPreviewFallbackSession: vi.fn(() =>
    state.mockMode ? { isMock: true } : null
  ),
  MOCK_SESSION_COOKIE: 'b2b_mock_user_id',
  getMockStore: vi.fn(() => ({ users: [] })),
}));

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function makeQueryResult(result: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'upsert', 'delete']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return builder;
}

describe('createSupabaseAdminClient fallback behavior', () => {
  const schemaError = {
    code: '42P01',
    message: 'relation does not exist',
    details: 'schema detail',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    state.mockMode = false;
    state.serviceKey = 'service-role-test-key';
    state.createClientCalls = [];
    state.mockClient = {
      from: vi.fn(() => makeQueryResult({ data: [{ id: 'mock-row' }], error: null })),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user' } }, error: null }),
          updateUserById: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user' } }, error: null }),
          deleteUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user' } }, error: null }),
        },
      },
    };
    state.realClient = {
      from: vi.fn(() => makeQueryResult({ data: null, error: schemaError })),
      rpc: vi.fn(),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
          createUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
          updateUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
          deleteUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      },
    };
  });

  it('passes real schema errors through instead of returning mock data', async () => {
    const result = await createSupabaseAdminClient().from('missing_table').select('*');
    expect(result).toEqual({ data: null, error: schemaError });
    expect(state.mockClient.from).not.toHaveBeenCalled();
  });

  it('returns a safe explicit error when a real query rejects with transport details', async () => {
    state.realClient.from.mockImplementation(() => {
      throw new Error('request failed with service-role-test-key');
    });
    const result = await createSupabaseAdminClient().from('records').select('*');
    expect(result).toEqual({ data: null, error: { message: 'Supabase request failed.' } });
    expect(JSON.stringify(result)).not.toContain('service-role-test-key');
    expect(state.mockClient.from).not.toHaveBeenCalled();
  });

  it('preserves failed real writes as errors, never mock success', async () => {
    const writeError = { code: '42501', message: 'permission denied' };
    state.realClient.from.mockReturnValue(makeQueryResult({ data: null, error: writeError }));
    const client = createSupabaseAdminClient() as unknown as {
      from: (table: string) => {
        insert: (values: Record<string, number>) => Promise<unknown>;
      };
    };
    const result = await client.from('records').insert({ value: 1 });
    expect(result).toEqual({ data: null, error: writeError });
    expect(state.mockClient.from).not.toHaveBeenCalled();
  });

  it('passes real admin auth errors through and does not fall back to mock success', async () => {
    const authError = { message: 'admin request denied' };
    state.realClient.auth.admin.createUser.mockResolvedValue({ data: { user: null }, error: authError });
    const result = await createSupabaseAdminClient().auth.admin.createUser({ email: 'user@example.test' });
    expect(result.error).toBe(authError);
    expect(state.mockClient.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('uses a modern Supabase secret key as apikey without a Bearer header', async () => {
    state.serviceKey = `sb_secret_${'a'.repeat(22)}_${'b'.repeat(8)}`;
    state.realClient.rpc.mockResolvedValue({ data: null, error: null });

    const client = createSupabaseAdminClient() as unknown as {
      rpc: (functionName: string, args: Record<string, never>) => Promise<unknown>;
    };
    await client.rpc('save_meeting_report', {});

    const [, apiKey, options] = state.createClientCalls[0] as [
      string,
      string,
      { global: { headers: Record<string, string> } },
    ];
    expect(apiKey).toBe(state.serviceKey);
    expect(options.global.headers.apikey).toBe(state.serviceKey);
    expect(options.global.headers).not.toHaveProperty('Authorization');
    expect(state.realClient.rpc).toHaveBeenCalledWith('save_meeting_report', {});
  });

  it('does not expose credentials included in a rejected RPC transport error', async () => {
    state.realClient.rpc.mockRejectedValue(
      new Error('request failed with service-role-test-key')
    );
    const client = createSupabaseAdminClient() as unknown as {
      rpc: (functionName: string, args: Record<string, never>) => Promise<unknown>;
    };
    const result = await client.rpc('example_rpc', {});
    expect(result).toEqual({
      data: null,
      error: { message: 'Supabase RPC request failed.' },
    });
    expect(JSON.stringify(result)).not.toContain('service-role-test-key');
  });

  it('keeps explicitly selected demo mode on the mock client', async () => {
    state.mockMode = true;
    const result = await createSupabaseAdminClient().from('records').select('*');
    expect(result).toEqual({ data: [{ id: 'mock-row' }], error: null });
    expect(state.mockClient.from).toHaveBeenCalledWith('records');
    expect(state.realClient.from).not.toHaveBeenCalled();
  });

  it('keeps admin auth operations on the mock client in demo mode', async () => {
    state.mockMode = true;
    const result = await createSupabaseAdminClient().auth.admin.createUser({ email: 'demo@example.test' });
    expect(result.error).toBeNull();
    expect(state.mockClient.auth.admin.createUser).toHaveBeenCalled();
    expect(state.realClient.auth.admin.createUser).not.toHaveBeenCalled();
  });
});
