import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSupabaseAnonKey,
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  isValidServiceRoleJwt,
  isValidSupabasePublishableKey,
  isValidSupabaseSecretKey,
} from '@/lib/supabase/mock';

function legacyJwt(role: 'anon' | 'service_role'): string {
  const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const payload = Buffer.from(JSON.stringify({ role }), 'utf8').toString('base64url');
  return `${header}.${payload}.${'x'.repeat(40)}`;
}

const VALID_PUBLISHABLE_KEY = `sb_publishable_${'p'.repeat(22)}_${'c'.repeat(8)}`;
const VALID_SECRET_KEY = `sb_secret_${'s'.repeat(22)}_${'c'.repeat(8)}`;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Supabase configuration fails closed', () => {
  it('does not fall back to a hosted database when URL and public key are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    expect(getSupabaseUrl()).toBe('');
    expect(getSupabasePublishableKey()).toBe('');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('accepts the modern publishable key and modern server secret key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', VALID_PUBLISHABLE_KEY);
    vi.stubEnv('SUPABASE_SECRET_KEY', VALID_SECRET_KEY);

    expect(getSupabasePublishableKey()).toBe(VALID_PUBLISHABLE_KEY);
    expect(getSupabaseAnonKey()).toBe(VALID_PUBLISHABLE_KEY);
    expect(getSupabaseSecretKey()).toBe(VALID_SECRET_KEY);
    expect(isValidServiceRoleJwt(VALID_SECRET_KEY)).toBe(true);
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('continues to accept legacy anon and service_role JWTs during migration', () => {
    const anon = legacyJwt('anon');
    const serviceRole = legacyJwt('service_role');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', anon);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', serviceRole);

    expect(getSupabasePublishableKey()).toBe(anon);
    expect(getSupabaseSecretKey()).toBe(serviceRole);
    expect(isValidServiceRoleJwt(serviceRole)).toBe(true);
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('rejects malformed modern API keys with invalid key lengths', () => {
    expect(isValidSupabasePublishableKey('sb_publishable_short_bad')).toBe(false);
    expect(isValidSupabaseSecretKey('sb_secret_short_bad')).toBe(false);
  });

  it('does not accept a secret key as a browser publishable key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', VALID_SECRET_KEY);

    expect(getSupabasePublishableKey()).toBe('');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('does not accept an anon key as a server secret key', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', legacyJwt('anon'));
    expect(getSupabaseSecretKey()).toBe('');
    expect(isValidServiceRoleJwt(legacyJwt('anon'))).toBe(false);
  });

  it('falls back to a valid legacy key when a malformed modern variable is present', () => {
    const anon = legacyJwt('anon');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'not-a-valid-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', anon);

    expect(getSupabasePublishableKey()).toBe(anon);
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('requires an explicitly configured URL and a valid publishable key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'not-a-valid-key');

    expect(getSupabaseUrl()).toBe('https://example.supabase.co');
    expect(getSupabasePublishableKey()).toBe('');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('keeps mock mode explicit and disables real Supabase configuration while enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', VALID_PUBLISHABLE_KEY);
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'true');

    expect(isSupabaseConfigured()).toBe(false);
  });
});
