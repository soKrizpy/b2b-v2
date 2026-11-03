// src/lib/featureConfig.ts
// Single source of truth for enabling/disabling extension features.
//
// Core features (auth, curriculum, users, sessions, teacher, challenges,
// quiz assessment logic) are always on — they are the learning backbone.
//
// Extension features are toggleable via NEXT_PUBLIC_ENABLE_* env vars.
// Default: all enabled (backward compatible). Set to "false" to disable.
// Only the exact string "false" (case-insensitive) disables a feature;
// every other value — "0", "no", "", undefined — leaves it enabled.

// ── Feature groups ────────────────────────────────────────────────────────────

export type FeatureGroup =
  | 'gamification' // pet system, XP, coins, level, cosmetics
  | 'certificates' // tiered completion certificates
  | 'billing' // invoices & post-paid billing
  | 'parentPortal' // parent report portal
  | 'announcements' // admin broadcast banners
  | 'aiAssistant' // Gemini chatbot, curriculum generation, AI explanations
  | 'questMap'; // pixel-art quest map presentation (progression logic stays core)

/** All extension feature keys — core features are intentionally excluded. */
export const FEATURE_GROUP_KEYS: readonly FeatureGroup[] = [
  'gamification',
  'certificates',
  'billing',
  'parentPortal',
  'announcements',
  'aiAssistant',
  'questMap',
] as const;

// ── Env var mapping ───────────────────────────────────────────────────────────

const ENV_VAR: Record<FeatureGroup, string> = {
  gamification: 'NEXT_PUBLIC_ENABLE_GAMIFICATION',
  certificates: 'NEXT_PUBLIC_ENABLE_CERTIFICATES',
  billing: 'NEXT_PUBLIC_ENABLE_BILLING',
  parentPortal: 'NEXT_PUBLIC_ENABLE_PARENT_PORTAL',
  announcements: 'NEXT_PUBLIC_ENABLE_ANNOUNCEMENTS',
  aiAssistant: 'NEXT_PUBLIC_ENABLE_AI',
  questMap: 'NEXT_PUBLIC_ENABLE_QUEST_MAP',
};

// ── Flag resolution ──────────────────────────────────────────────────────────

/**
 * Returns `true` unless the env var is explicitly set to "false"
 * (case-insensitive). This makes the flags opt-out by default, preserving
 * backward compatibility — existing deployments see no change until they
 * explicitly disable a feature.
 */
function resolveFlag(group: FeatureGroup): boolean {
  const raw = process.env[ENV_VAR[group]];
  return raw?.toLowerCase() !== 'false';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolved feature flags. Read this at module scope for static checks or
 * call `isFeatureEnabled()` for dynamic lookups (e.g. in tests that mutate env).
 */
export const FEATURE_FLAGS: Record<FeatureGroup, boolean> = {
  gamification: resolveFlag('gamification'),
  certificates: resolveFlag('certificates'),
  billing: resolveFlag('billing'),
  parentPortal: resolveFlag('parentPortal'),
  announcements: resolveFlag('announcements'),
  aiAssistant: resolveFlag('aiAssistant'),
  questMap: resolveFlag('questMap'),
};

/**
 * Checks whether an extension feature is enabled.
 * Re-reads the env var each call so tests can toggle flags dynamically.
 */
export function isFeatureEnabled(group: FeatureGroup): boolean {
  return resolveFlag(group);
}
