import type { NextConfig } from 'next';

// Ensure internal Next.js Server Action worker forwarding stays on localhost in container environments (skipped on Vercel)
if (!process.env.VERCEL && !process.env.__NEXT_PRIVATE_ORIGIN) {
  process.env.__NEXT_PRIVATE_ORIGIN = 'http://localhost:3000';
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://enfqoofluceqrlcjemfu.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZnFvb2ZsdWNlcXJsY2plbWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjI3ODgsImV4cCI6MjEwMDE5ODc4OH0.N0PZY2kmT-5t8gsUKBLCaPH9i4mP9OzcIxt_uGXfpLE',
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.run.app',
        '*.googleusercontent.com',
        '*.vercel.app',
      ],
    },
  },
  async redirects() {
    return [];
  },
};

export default nextConfig;
