import type { MetadataRoute } from 'next';
import { siteUrl, configured } from '@/lib/env';
import { db } from '@/lib/supabase/server';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ['', '/shop', '/about', '/contact', '/faq'].map((path) => ({ url: base + path }));
  if (!configured()) return pages;
  const client = await db();
  const [products, categories, collections] = await Promise.all([
    client.from('products').select('slug,updated_at').eq('status', 'Active').limit(1000),
    client.from('categories').select('slug,updated_at').eq('active', true).limit(1000),
    client.from('collections').select('slug,updated_at').eq('active', true).limit(1000),
  ]);
  return [
    ...pages,
    ...[
      [products, 'products'],
      [categories, 'categories'],
      [collections, 'collections'],
    ].flatMap(([result, path]) =>
      ((result as typeof products).data || []).map((p) => ({
        url: `${base}/${path}/${p.slug}`,
        lastModified: p.updated_at,
      })),
    ),
  ];
}
