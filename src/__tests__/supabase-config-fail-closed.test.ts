import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabase/mock';

// This is a syntactically valid fixture only. It is not a real project key.
const VALID_TEST_ANON_KEY = `eyJ${'x'.repeat(90)}.${'y'.repeat(24)}.${'z'.repeat(24)}`;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Supabase configuration fails closed', () => {
  it('does not fall back to a hosted database when URL and key are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    expect(getSupabaseUrl()).toBe('');
    expect(getSupabaseAnonKey()).toBe('');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('requires both an explicitly configured URL and a valid public key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', VALID_TEST_ANON_KEY);

    expect(getSupabaseUrl()).toBe('https://example.supabase.co');
    expect(getSupabaseAnonKey()).toBe(VALID_TEST_ANON_KEY);
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('does not replace a missing or malformed public key with a default', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'not-a-valid-key');

    expect(getSupabaseUrl()).toBe('https://example.supabase.co');
    expect(getSupabaseAnonKey()).toBe('');
    expect(isSupabaseConfigured()).toBe(false);
  });
});
