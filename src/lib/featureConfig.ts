// src/lib/featureConfig.ts
// Feature flags for extension features (opt-out by default).
// Core features (auth, curriculum, users, sessions, teacher, challenges,
// quiz, gamification, certificates, announcements, questMap) are always on.
//
// Only these 3 flags remain toggleable:
//   billing      — invoices & post-paid billing
//   parentPortal — parent report portal
//   aiAssistant  — Gemini chatbot & AI explanations
//
// Set the env var to "false" (case-insensitive) to disable.
// Every other value — "0", "no", "", undefined — leaves it enabled.

export type FeatureGroup =
  | 'billing'
  | 'parentPortal'
  | 'aiAssistant';

export const FEATURE_GROUP_KEYS: readonly FeatureGroup[] = [
  'billing',
  'parentPortal',
  'aiAssistant',
] as const;

const ENV_VAR: Record<FeatureGroup, string> = {
  billing:      'NEXT_PUBLIC_ENABLE_BILLING',
  parentPortal: 'NEXT_PUBLIC_ENABLE_PARENT_PORTAL',
  aiAssistant:  'NEXT_PUBLIC_ENABLE_AI',
};

function resolveFlag(group: FeatureGroup): boolean {
  const raw = process.env[ENV_VAR[group]];
  return raw?.toLowerCase() !== 'false';
}

export const FEATURE_FLAGS: Record<FeatureGroup, boolean> = {
  billing:      resolveFlag('billing'),
  parentPortal: resolveFlag('parentPortal'),
  aiAssistant:  resolveFlag('aiAssistant'),
};

export function isFeatureEnabled(group: FeatureGroup): boolean {
  return resolveFlag(group);
}
