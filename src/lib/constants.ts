// src/lib/constants.ts
import type { UserRole } from '@/types/roles';

export const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  admin:   '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

export const PROTECTED_PREFIXES: Record<string, UserRole> = {
  '/admin':   'admin',
  '/teacher': 'teacher',
  '/student': 'student',
};

/**
 * Routes that bypass auth checks entirely.
 * '/' is included so the root static-redirect page never triggers
 * a middleware bounce that appends redirectTo=/ and causes a login loop.
 */
export const PUBLIC_PATHS: string[] = [
  '/',           // root static redirect — let Next.js handle it directly
  '/login',
  '/parent/report',
  '/verify',      // public QR certificate verification — no student login required
  '/api/auth',
];
