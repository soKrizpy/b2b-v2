// src/features/announcements/announcementStore.ts
// Server-synced announcement store with localStorage cache & per-device dismissal persistence.

import type { Announcement } from './types';

const STORAGE_KEY = 'b2b_announcements_v2';
const DISMISSED_KEY = 'b2b_dismissed_announcements_v2';

export function getStoredAnnouncements(): Announcement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw) as Announcement[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item.id === 'number' && Number.isSafeInteger(item.id) && item.id > 0)
      : [];
  } catch {
    return INITIAL_ANNOUNCEMENTS;
  }
}

export function saveStoredAnnouncements(list: Announcement[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('announcements_updated'));
  } catch (err) {
    console.error('Failed to save announcements:', err);
  }
}

/**
 * Fetches announcements from `/api/announcements` and updates the local cache.
 */
export async function fetchServerAnnouncements(): Promise<Announcement[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/announcements', { cache: 'no-store' });
    if (!res.ok) return getStoredAnnouncements();
    const data = (await res.json()) as { announcements?: Announcement[] };
    if (Array.isArray(data.announcements)) {
      const serverList = data.announcements.filter(
        (item) => typeof item.id === 'number' && Number.isSafeInteger(item.id) && item.id > 0
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serverList));
      return serverList;
    }
    return getStoredAnnouncements();
  } catch {
    return getStoredAnnouncements();
  }
}

export function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function dismissAnnouncementId(id: string | number): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDismissedIds();
    const normalizedId = String(id);
    if (!current.includes(normalizedId)) {
      const next = [...current, normalizedId];
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('announcements_updated'));
    }
  } catch (err) {
    console.error('Failed to dismiss announcement:', err);
  }
}
