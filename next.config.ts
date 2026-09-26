import type { NextConfig } from 'next';
import { isPrivilegedKey } from './src/lib/key-validation';
if (isPrivilegedKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '')) {
  throw new Error(
    'A privileged Supabase key is assigned to a NEXT_PUBLIC variable. Replace it before building.',
  );
}
const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;
const config: NextConfig = {
  poweredByHeader: false,
  images: {
    maximumRedirects: 0,
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [
          {
            protocol: storageOrigin?.protocol === 'http:' ? 'http' : 'https',
            hostname: storageOrigin!.hostname,
            port: storageOrigin!.port,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default config;
