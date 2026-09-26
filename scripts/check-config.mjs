import { createClient } from '@supabase/supabase-js';

// Read-only diagnostics. Never print credentials, project URLs, customer data, or raw errors.
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_SITE_URL',
];
let failed = false;
for (const name of required) {
  const present = Boolean(process.env[name]?.trim());
  console.log(`${name}: ${present ? 'set' : 'MISSING'}`);
  failed ||= !present;
}
if (failed) process.exit(1);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const safeFetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) });
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: safeFetch },
};
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const publicClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const results = await Promise.all([
  (async () => {
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    failed ||= Boolean(error);
    return `Server credential: ${error ? 'NOT AUTHORIZED FOR AUTH ADMIN' : 'authorized'}`;
  })(),
  ...['roles', 'profiles', 'products', 'website_documents', 'upload_requests'].map(
    async (table) => {
      const { error } = await admin.from(table).select('id').limit(1);
      failed ||= Boolean(error);
      return `${table}: ${error ? `UNAVAILABLE (${error.code || 'connection error'})` : 'ready'}`;
    },
  ),
  (async () => {
    const { data, error } = await admin.storage.listBuckets();
    if (error) {
      failed = true;
      return 'Storage: UNAVAILABLE';
    }
    const expected = ['product-images', 'website-media', 'design-previews', 'production-files'];
    const valid = expected.every((name) =>
      data.some((b) => b.name === name && b.public === (name !== 'production-files')),
    );
    failed ||= !valid;
    return `Storage boundaries: ${valid ? 'ready' : 'MISSING OR INCORRECT BUCKETS'}`;
  })(),
  (async () => {
    const { data, error } = await publicClient.from('orders').select('id').limit(1);
    const denied = error?.code === '42501' || (!error && data.length === 0);
    failed ||= !denied;
    return `Anonymous order access: ${denied ? 'no private rows returned' : 'FAILED OR UNAVAILABLE'}`;
  })(),
  (async () => {
    try {
      const response = await safeFetch(`${url}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      });
      if (!response.ok) throw new Error('unavailable');
      const settings = await response.json();
      const disabled = settings.disable_signup === true;
      failed ||= !disabled;
      return `Public Auth signup: ${disabled ? 'disabled' : 'ENABLED — disable before launch'}`;
    } catch {
      failed = true;
      return 'Auth settings: UNAVAILABLE';
    }
  })(),
]);
results.forEach((result) => console.log(result));
process.exitCode = failed ? 1 : 0;
