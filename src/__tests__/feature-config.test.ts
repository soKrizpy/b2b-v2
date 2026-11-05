// src/__tests__/feature-config.test.ts
// Tests for the feature config layer — now 3 flags: billing, parentPortal, aiAssistant.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  FEATURE_GROUP_KEYS,
  FEATURE_FLAGS,
  isFeatureEnabled,
  type FeatureGroup,
} from '@/lib/featureConfig';

const ENV_VAR_NAME: Record<FeatureGroup, string> = {
  billing:      'NEXT_PUBLIC_ENABLE_BILLING',
  parentPortal: 'NEXT_PUBLIC_ENABLE_PARENT_PORTAL',
  aiAssistant:  'NEXT_PUBLIC_ENABLE_AI',
};

const ORIGINAL_ENV: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const key of Object.values(ENV_VAR_NAME)) {
    ORIGINAL_ENV[key] = process.env[key];
  }
});

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function flagWithEnv(group: FeatureGroup, value: string | undefined): boolean {
  const envKey = ENV_VAR_NAME[group];
  if (value === undefined) delete process.env[envKey];
  else process.env[envKey] = value;
  return isFeatureEnabled(group);
}

describe('feature config — defaults', () => {
  afterEach(restoreEnv);

  it('enables every feature when no env vars are set', () => {
    for (const group of FEATURE_GROUP_KEYS) {
      expect(flagWithEnv(group, undefined)).toBe(true);
    }
  });

  it('exposes a static FEATURE_FLAGS object with all 3 groups', () => {
    expect(FEATURE_GROUP_KEYS).toHaveLength(3);
    for (const group of FEATURE_GROUP_KEYS) {
      expect(typeof FEATURE_FLAGS[group]).toBe('boolean');
    }
  });

  it('has exactly billing, parentPortal, aiAssistant', () => {
    expect(FEATURE_GROUP_KEYS).toContain('billing');
    expect(FEATURE_GROUP_KEYS).toContain('parentPortal');
    expect(FEATURE_GROUP_KEYS).toContain('aiAssistant');
  });
});

describe('feature config — opt-out via "false"', () => {
  afterEach(restoreEnv);

  it('disables a feature when env is "false"', () => {
    for (const group of FEATURE_GROUP_KEYS) {
      expect(flagWithEnv(group, 'false')).toBe(false);
    }
  });

  it('is case-insensitive — "FALSE" and "False" also disable', () => {
    expect(flagWithEnv('billing', 'FALSE')).toBe(false);
    expect(flagWithEnv('parentPortal', 'False')).toBe(false);
  });
});

describe('feature config — edge cases remain enabled', () => {
  afterEach(restoreEnv);

  it('treats "0" as enabled (only "false" disables)', () => {
    expect(flagWithEnv('billing', '0')).toBe(true);
  });

  it('treats "no" as enabled', () => {
    expect(flagWithEnv('parentPortal', 'no')).toBe(true);
  });

  it('treats empty string as enabled', () => {
    expect(flagWithEnv('aiAssistant', '')).toBe(true);
  });

  it('treats "true" as enabled', () => {
    expect(flagWithEnv('billing', 'true')).toBe(true);
  });

  it('treats "off" as enabled', () => {
    expect(flagWithEnv('aiAssistant', 'off')).toBe(true);
  });
});
