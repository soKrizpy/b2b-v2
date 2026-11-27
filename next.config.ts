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
