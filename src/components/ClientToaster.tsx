'use client';
// src/components/ClientToaster.tsx
// Wraps Sonner <Toaster> in a 'use client' boundary so Next.js 15.5
// does not attempt to SSR it during static prerender of /404 and /_error.
// Without this, sonner v2 crashes with "Cannot read properties of null
// (reading 'useContext')" when React is null in the prerender pass.
import { Toaster } from 'sonner';
export function ClientToaster() {
  return <Toaster richColors position="top-right" closeButton />;
}
