import type { NextConfig } from "next";


import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  sw: "sw.js",
  customWorkerSrc: "worker",
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
  },
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  /* config options here */

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Set this to 10mb or higher
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/dnix4q1rl/**'
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**'
      }
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/icon-:size(192|512)x:size2(192|512)-v2.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },

    ]
  },

};

export default withPWA(nextConfig);
