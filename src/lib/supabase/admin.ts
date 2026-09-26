import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import { isPrivilegedKey } from '@/lib/key-validation';
export function adminDb() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Server credential is not configured.');
  if (!isPrivilegedKey(secret))
    throw new Error(
      'SUPABASE_SECRET_KEY must be a secret or service-role key, not a publishable key.',
    );
  return createClient(publicEnv().url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
