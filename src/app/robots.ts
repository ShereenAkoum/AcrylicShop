import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api',
        '/login',
        '/checkout',
        '/cart',
        '/order-confirmation',
        '/track-order',
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
