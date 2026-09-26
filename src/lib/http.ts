import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { adminDb } from './supabase/admin';
export async function rateLimit(scope: string, limit = 20, identity = '') {
  const h = await headers();
  // Vercel overwrites x-vercel-forwarded-for. Never trust arbitrary client forwarding headers.
  const ip = process.env.VERCEL ? h.get('x-vercel-forwarded-for') || 'unknown' : 'local';
  const key = createHash('sha256').update(`${scope}:${ip}:${identity}`).digest('hex');
  const { data, error } = await adminDb().rpc('consume_rate_limit', {
    p_key: key,
    p_max: limit,
    p_seconds: 600,
  });
  if (error || !data) throw new Error('Too many attempts. Please try again in ten minutes.');
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new Error('Invalid request origin');
}
