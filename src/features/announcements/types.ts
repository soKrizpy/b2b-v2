// src/features/announcements/types.ts
// Data types for the Supabase-backed announcement and banner system.

export type AnnouncementTarget = 'all' | 'students' | 'teachers';
export type AnnouncementUrgency = 'info' | 'warning' | 'urgent';

/** Database IDs are numeric; string IDs are retained for old local cache entries. */
export interface Announcement {
  id: number | string;
  title: string;
  content: string;
  image_url?: string | null;
  target: AnnouncementTarget;
  urgency: AnnouncementUrgency;
  duration_days?: number;
  expires_at?: string | null;
  created_at: string;
  is_active: boolean;
}
