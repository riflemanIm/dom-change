import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '..'),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'files.domobmen.ru' },
    ],
  },
};

export default nextConfig;
