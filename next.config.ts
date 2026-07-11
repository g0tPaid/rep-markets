import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Up to 8 product images × ~8MB each
      bodySizeLimit: '64mb',
    },
    // Allow large single-image uploads via /api/admin/upload
    middlewareClientMaxBodySize: '64mb',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async rewrites() {
    return [
      // Legacy /uploads/... paths → dynamic media API (volume-backed)
      { source: '/uploads/:path*', destination: '/api/media/:path*' },
    ];
  },
};

export default nextConfig;
