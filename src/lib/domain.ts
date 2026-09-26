import { z } from 'zod';
export const stages = [
  'New Order',
  'Design',
  'Approved',
  'UV DTF',
  'Applied',
  'QC',
  'Packed',
  'Out for Delivery',
  'Completed',
] as const;
export function canMove(from: string, to: string) {
  const a = stages.indexOf(from as (typeof stages)[number]);
  const b = stages.indexOf(to as (typeof stages)[number]);
  return a >= 0 && b >= 0 && Math.abs(a - b) === 1;
}
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,32}$/, 'Use 3–32 lowercase letters, numbers, or underscores.');
export const customerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  email: z.union([z.email(), z.literal('')]),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(120),
  instructions: z.string().max(1000).default(''),
  notes: z.string().max(1000).default(''),
});
export const checkoutSchema = z
  .object({
    request_id: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
    customer: customerSchema,
    items: z
      .array(z.object({ variant_id: z.uuid(), quantity: z.number().int().min(1).max(99) }))
      .min(1)
      .max(50),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.items.map((i) => i.variant_id)).size !== data.items.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate variants are not allowed.' });
  });
export const safeUrl = z
  .string()
  .refine(
    (v) => v === '' || /^\/(?!\/)/.test(v) || /^https:\/\//.test(v),
    'Use a local path or HTTPS URL.',
  );
export function money(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
export function calculateTotal(items: { quantity: number; unit_price: number }[], fee: number) {
  if (
    !Number.isInteger(fee) ||
    fee < 0 ||
    items.some(
      (i) =>
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 99 ||
        !Number.isInteger(i.unit_price) ||
        i.unit_price < 0,
    )
  )
    throw new Error('Invalid pricing');
  return items.reduce((sum, i) => sum + i.quantity * i.unit_price, fee);
}
export type Variant = {
  id: string;
  product_id: string;
  sku: string;
  color: string;
  size: string;
  stand: string;
  price_override: number | null;
  inventory_item_id: string | null;
  inventory_items: { quantity: number } | null;
  image_url: string | null;
  active: boolean;
};
export type Product = {
  id: string;
  sku: string;
  slug: string;
  title: string;
  arabic_title: string;
  transliteration: string | null;
  translation: string | null;
  description: string;
  price: number;
  compare_at_price: number | null;
  shape: string;
  featured: boolean;
  bestseller: boolean;
  new_arrival: boolean;
  seo_title: string | null;
  seo_description: string | null;
  product_images: { id: string; url: string; alt: string; position: number }[];
  product_variants: Variant[];
};
