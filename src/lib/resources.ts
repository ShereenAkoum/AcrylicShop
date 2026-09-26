import { z } from 'zod';
import { safeUrl } from './domain';
const text = z.string().trim().min(1).max(500);
const nullable = z.string().max(5000).nullable();
const uuid = z.union([z.uuid(), z.null()]);
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export type ResourceField = {
  key: string;
  label: string;
  type?: 'textarea' | 'number' | 'checkbox' | 'select' | 'relation' | 'url';
  options?: string[];
  table?: string;
  required?: boolean;
  arabic?: boolean;
};
export type Resource = {
  table: string;
  permission: string;
  title: string;
  fields: ResourceField[];
  schema: z.ZodType;
  columns: string[];
};
export const resources: Record<string, Resource> = {
  products: {
    table: 'products',
    permission: 'products',
    title: 'Products',
    columns: ['title', 'sku', 'status', 'price'],
    schema: z.object({
      title: text,
      sku: text,
      description: z.string().max(10000),
      price: z
        .number()
        .min(0)
        .max(1000000)
        .refine(
          (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001,
          'Use at most two decimal places',
        )
        .transform((v) => Math.round(v * 100)),
      category_id: uuid,
      design_id: uuid,
      status: z.boolean().transform((active) => (active ? 'Active' : 'Draft')),
      featured: z.boolean(),
      bestseller: z.boolean(),
      new_arrival: z.boolean(),
      seo_title: nullable,
      seo_description: nullable,
    }),
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'sku', label: 'SKU', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      {
        key: 'price',
        label: 'Price (USD)',
        type: 'number',
        required: true,
      },
      { key: 'category_id', label: 'Category', type: 'relation', table: 'categories' },
      { key: 'design_id', label: 'Master design', type: 'relation', table: 'designs' },
      { key: 'status', label: 'Active on website', type: 'checkbox' },
      { key: 'featured', label: 'Featured', type: 'checkbox' },
      { key: 'bestseller', label: 'Bestseller', type: 'checkbox' },
      { key: 'new_arrival', label: 'New arrival', type: 'checkbox' },
      { key: 'seo_title', label: 'SEO title' },
      { key: 'seo_description', label: 'SEO description', type: 'textarea' },
    ],
  },
  categories: {
    table: 'categories',
    permission: 'products',
    title: 'Categories',
    fields: [
      { key: 'title', label: 'Name', required: true },
      { key: 'active', label: 'Active', type: 'checkbox' },
    ],
    schema: z.object({ title: text, active: z.boolean() }),
    columns: ['title', 'active'],
  },
  designs: {
    table: 'designs',
    permission: 'designs',
    title: 'Design Library',
    columns: ['code', 'title', 'type', 'status'],
    schema: z.object({
      title: text,
      arabic_phrase: z.string().max(10000),
      transliteration: nullable,
      translation: nullable,
      type: z.enum(['Quran', 'Dua', 'Dhikr', 'Quote', 'Custom']),
      reference: nullable,
      source_notes: nullable,
      shape: nullable,
      status: z.enum(['Draft', 'Approved', 'Archived']),
      preview_url: safeUrl.nullable(),
      supported_sizes: z.array(z.string().max(100)),
      colors: z.array(z.string().max(100)),
      tags: z.array(z.string().max(100)),
    }),
    fields: [
      { key: 'title', label: 'Title', required: true },
      {
        key: 'arabic_phrase',
        label: 'Arabic phrase — enter approved text exactly',
        type: 'textarea',
        arabic: true,
      },
      { key: 'transliteration', label: 'Transliteration' },
      { key: 'translation', label: 'Translation' },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        options: ['Quran', 'Dua', 'Dhikr', 'Quote', 'Custom'],
      },
      { key: 'reference', label: 'Quran / dua reference' },
      { key: 'source_notes', label: 'Source and review notes', type: 'textarea' },
      { key: 'supported_sizes', label: 'Supported sizes (comma separated)' },
      { key: 'colors', label: 'Colors (comma separated)' },
      { key: 'tags', label: 'Tags (comma separated)' },
      { key: 'shape', label: 'Shape' },
      { key: 'preview_url', label: 'Public preview URL', type: 'url' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['Draft', 'Approved', 'Archived'],
      },
    ],
  },
  customers: {
    table: 'customers',
    permission: 'customers',
    title: 'Customers',
    columns: ['full_name', 'phone', 'email', 'created_at'],
    schema: z.object({
      full_name: text,
      phone: text,
      email: z.union([z.email(), z.null()]),
      notes: z.string().max(5000),
    }),
    fields: [
      { key: 'full_name', label: 'Full name', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'email', label: 'Email' },
      { key: 'notes', label: 'Internal notes', type: 'textarea' },
    ],
  },
};
export function formRecord(form: FormData, fields: ResourceField[]) {
  return Object.fromEntries(
    fields.map((f) => {
      const value = form.get(f.key);
      return [
        f.key,
        ['supported_sizes', 'colors', 'tags'].includes(f.key)
          ? String(value || '')
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
          : f.type === 'checkbox'
            ? value === 'on'
            : f.type === 'number'
              ? value === ''
                ? null
                : Number(value)
              : f.type === 'relation'
                ? value || null
                : value === '' &&
                    !f.required &&
                    !['description', 'notes', 'arabic_title', 'arabic_phrase'].includes(f.key)
                  ? null
                  : String(value || ''),
      ];
    }),
  );
}
