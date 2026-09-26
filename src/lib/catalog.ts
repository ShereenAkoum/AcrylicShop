import 'server-only';
import { db } from './supabase/server';
import { configured } from './env';
import type { Product } from './domain';
import { documentSchema } from './cms';
export async function document(key: string, preview = false) {
  if (!configured()) return null;
  const client = await db();
  const result = preview
    ? await client.from('website_documents').select('draft').eq('key', key).maybeSingle()
    : await client.rpc('published_document', { p_key: key });
  if (result.error) {
    if (!preview && ['PGRST202', 'PGRST205', '42P01'].includes(result.error.code)) return null;
    throw new Error('Website content could not be loaded.');
  }
  const raw = preview ? result.data?.draft : result.data;
  return raw ? documentSchema.parse(raw) : null;
}
export async function catalog(
  options: {
    q?: string;
    category?: string;
    collection?: string;
    page?: number;
    selection?: string;
    ids?: string[];
  } = {},
) {
  if (!configured()) return { products: [] as Product[], count: 0 };
  const client = await db();
  const { data: visibleCategories, error: categoryError } = await client
    .from('categories')
    .select('id')
    .eq('active', true);
  if (categoryError) throw new Error('Categories could not be loaded.');
  const visibility = visibleCategories?.length
    ? `category_id.is.null,category_id.in.(${visibleCategories.map((c) => c.id).join(',')})`
    : 'category_id.is.null';
  let query = client
    .from('products')
    .select('*,product_images(*),product_variants(*,inventory_items(quantity))', { count: 'exact' })
    .eq('status', 'Active')
    .or(visibility);
  if (options.q) query = query.ilike('title', `%${options.q.replace(/[%_]/g, '')}%`);
  if (options.category) {
    const { data } = await client
      .from('categories')
      .select('id')
      .eq('slug', options.category)
      .eq('active', true)
      .maybeSingle();
    if (!data) return { products: [], count: 0 };
    query = query.eq('category_id', data.id);
  }
  if (options.collection) {
    const { data: collection } = await client
      .from('collections')
      .select('id')
      .eq(/^[a-f0-9-]{36}$/.test(options.collection) ? 'id' : 'slug', options.collection)
      .maybeSingle();
    if (!collection) return { products: [], count: 0 };
    const { data } = await client
      .from('collection_products')
      .select('product_id')
      .eq('collection_id', collection.id)
      .limit(500);
    query = query.in(
      'id',
      (data || []).map((x) => x.product_id),
    );
  }
  if (options.selection && ['featured', 'bestseller', 'new_arrival'].includes(options.selection))
    query = query.eq(options.selection, true);
  if (options.ids) query = query.in('id', options.ids);
  const start = ((options.page || 1) - 1) * 12;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(start, start + 11);
  if (error) throw new Error('The collection could not be loaded. Please try again.');
  return { products: (data || []) as Product[], count: count || 0 };
}
export async function product(slug: string) {
  if (!configured()) return null;
  const { data, error } = await (
    await db()
  )
    .from('products')
    .select('*,product_images(*),product_variants(*,inventory_items(quantity))')
    .eq('slug', slug)
    .eq('status', 'Active')
    .maybeSingle();
  if (error) throw new Error('Product could not be loaded');
  if (data?.category_id) {
    const { data: category, error } = await (
      await db()
    )
      .from('categories')
      .select('id')
      .eq('id', data.category_id)
      .eq('active', true)
      .maybeSingle();
    if (error) throw new Error('Category could not be loaded');
    if (!category) return null;
  }
  return data as Product | null;
}
export async function taxonomy(table: 'categories' | 'collections', slug: string) {
  if (!configured()) return null;
  const { data, error } = await (
    await db()
  )
    .from(table)
    .select('title,description,seo_title,seo_description')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error) throw new Error('Collection information unavailable');
  return data;
}
