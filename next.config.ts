import type { NextConfig } from "next";


import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  sw: "sw.js",
  customWorkerSrc: "worker", // Explicitly name the output service worker
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
        pathname: '/dnix4q1rl/**'
      }
    ],
    formats: ['image/avif', 'image/webp'],
  }
};

export default withPWA(nextConfig);
