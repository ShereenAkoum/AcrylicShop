import { z } from 'zod';
import { safeUrl } from './domain';
export const sectionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['hero', 'products', 'categories', 'banner', 'story', 'newsletter']),
  enabled: z.boolean(),
  heading: z.string().max(300),
  subheading: z.string().max(500).default(''),
  body: z.string().max(5000).default(''),
  arabic: z.string().max(1000).default(''),
  image: safeUrl.default(''),
  cta_text: z.string().max(100).default(''),
  cta_url: safeUrl.default(''),
  product_ids: z.array(z.uuid()).default([]),
  selection: z.enum(['featured', 'bestseller', 'new_arrival', 'selected']).default('featured'),
});
export const documentSchema = z.object({
  heading: z.string().max(300).default(''),
  body: z.string().max(20000).default(''),
  seo_title: z.string().max(160).default(''),
  seo_description: z.string().max(300).default(''),
  sections: z.array(sectionSchema).max(30).default([]),
  links: z
    .array(z.object({ label: z.string().max(100), url: safeUrl }))
    .max(30)
    .default([]),
  faqs: z
    .array(z.object({ question: z.string().max(500), answer: z.string().max(5000) }))
    .max(100)
    .default([]),
  contact_email: z.union([z.email(), z.literal('')]).default(''),
  contact_phone: z.string().max(40).default(''),
  announcement: z.string().max(300).default(''),
  light_primary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#3F5038'),
  dark_primary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#B1C09F'),
});
export type WebsiteDocument = z.infer<typeof documentSchema>;
export type Section = z.infer<typeof sectionSchema>;
