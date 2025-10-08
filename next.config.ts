
import type {NextConfig} from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4.5mb',
      timeout: 120,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'buiprkjrvglmrytovjbp.supabase.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
};


export default () => {
  require('dotenv').config({ path: './.env.local' });
  process.env.TURBOPACK_MEMORY_LIMIT = '0.1';
  return withBundleAnalyzer(nextConfig);
};
