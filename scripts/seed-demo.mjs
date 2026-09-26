import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Explicit opt-in: uploads selected owner-supplied artwork and inserts demo catalog rows.
// Deterministic IDs and ignoreDuplicates preserve edits and stock on subsequent runs.
const directory = process.argv[2];
if (!directory) throw new Error('Provide the directory containing the selected demo images.');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const id = (group, n) => `d3000000-0000-4000-${group}-000000000${String(n).padStart(3, '0')}`;
const samples = [
  ['02_23_28', 'Blush Botanical Reminder', 'blush-botanical-reminder', 'Blush Pink', 1800, 1],
  ['02_26_09', 'Golden Hour Dua', 'golden-hour-dua', 'Warm Ivory', 2200, 2],
  ['02_29_14', 'Sunshine Dua Reminder', 'sunshine-dua-reminder', 'Butter Yellow', 1800, 1],
  ['02_34_51', 'A Little Ease', 'a-little-ease', 'Butter Yellow', 2000, 2],
  ['03_19_50', 'The Peaceful Corner', 'the-peaceful-corner', 'Lavender', 2400, 2],
].map(([time, title, slug, color, price, category], index) => ({
  title,
  slug,
  color,
  price,
  category,
  n: index + 1,
  bytes: readFileSync(join(directory, `ChatGPT Image Sep 22, 2026, ${time} PM.png`)),
}));
async function insert(table, rows, onConflict = 'id') {
  const { error } = await client.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) throw new Error(`${table}: ${error.code || 'request failed'}`);
}
const urls = [];
for (const sample of samples) {
  const path = `demo-farah/${sample.slug}.png`;
  const { error } = await client.storage.from('product-images').upload(path, sample.bytes, {
    contentType: 'image/png',
    upsert: false,
  });
  if (error && !['409', '400'].includes(String(error.statusCode)))
    throw new Error(`Image upload failed (${error.statusCode || 'network'}).`);
  // A successful public read verifies an existing object as well as a new upload.
  const { data } = client.storage.from('product-images').getPublicUrl(path);
  const response = await fetch(data.publicUrl, { method: 'HEAD' });
  if (!response.ok) throw new Error('Uploaded image is not publicly readable.');
  sample.url = data.publicUrl;
  urls.push(data.publicUrl);
}
await insert(
  'categories',
  [
    {
      id: id('8002', 1),
      title: 'Desk Reminders',
      slug: 'desk-reminders',
      description: 'A little purpose for your everyday space.',
      image_url: urls[0],
    },
  ],
  'slug',
);
const { data: categories, error: categoryError } = await client
  .from('categories')
  .select('id,slug')
  .eq('slug', 'desk-reminders');
if (categoryError) throw new Error('Could not resolve demo catalog groups.');
for (const sample of samples) {
  const product = id('8005', sample.n);
  await insert('designs', {
    id: id('8004', sample.n),
    title: sample.title,
    type: 'Dua',
    status: 'Draft',
    preview_url: sample.url,
    source_notes:
      'Demo artwork supplied from the Farah image folder. Review text and production artwork before approval.',
  });
  await insert('products', {
    id: product,
    sku: `DEMO-FARAH-${sample.n}`,
    slug: sample.slug,
    title: sample.title,
    price: sample.price,
    status: 'Active',
    featured: true,
    bestseller: sample.n <= 3,
    new_arrival: sample.n >= 3,
    category_id: categories[0].id,
    design_id: id('8004', sample.n),
    description:
      'Demo product for exploring the shop. A colorful acrylic reminder for your desk or a thoughtful gift. Sample price and stock; supplied illustration awaits production review.',
  });
  await insert('product_images', {
    id: id('8006', sample.n),
    product_id: product,
    url: sample.url,
    alt: `${sample.title} artwork`,
    position: 0,
  });
  await insert('product_variants', [
    {
      id: id('8007', sample.n),
      product_id: product,
      sku: `DEMO-FARAH-${sample.n}-WOOD`,
      color: sample.color,
      size: '10 × 7 cm',
      stand: 'Natural Wood',
      stock: 12,
      image_url: sample.url,
    },
    {
      id: id('8008', sample.n),
      product_id: product,
      sku: `DEMO-FARAH-${sample.n}-IVORY`,
      color: sample.color,
      size: '10 × 7 cm',
      stand: 'Ivory Acrylic',
      stock: 8,
      price_override: sample.price + 200,
      image_url: sample.url,
    },
  ]);
}
await insert('inventory_items', [
  {
    id: id('8009', 1),
    sku: 'DEMO-ACRYLIC-107',
    title: 'Demo acrylic blanks — 10 × 7 cm',
    quantity: 100,
    low_stock_threshold: 15,
  },
  {
    id: id('8009', 2),
    sku: 'DEMO-STAND-WOOD',
    title: 'Demo natural wood stands',
    quantity: 60,
    low_stock_threshold: 10,
  },
  {
    id: id('8009', 3),
    sku: 'DEMO-STAND-IVORY',
    title: 'Demo ivory acrylic stands',
    quantity: 40,
    low_stock_threshold: 10,
  },
  {
    id: id('8009', 4),
    sku: 'DEMO-GIFT-BOX',
    title: 'Demo gift packaging',
    quantity: 8,
    low_stock_threshold: 10,
  },
]);
const publicClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await publicClient
  .from('products')
  .select('id,product_images(id),product_variants(id)')
  .in(
    'id',
    samples.map((s) => id('8005', s.n)),
  );
if (
  error ||
  data.length !== 5 ||
  data.some((p) => p.product_images.length < 1 || p.product_variants.length < 2)
)
  throw new Error('Public catalog verification failed.');
console.log(
  'Verified: 5 public demo products, 10 variants, 5 readable images, 1 category, and 4 inventory items.',
);
