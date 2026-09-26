import 'server-only';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase/server';
import { configured } from '@/lib/env';
export async function staff(permission?: string) {
  if (!configured()) redirect('/login?setup=1');
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await client.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.active) redirect('/login?disabled=1');
  const { data: permissions, error } = await client.rpc('my_permissions');
  if (error) throw new Error('Unable to verify access.');
  const allowed = (permissions || []) as string[];
  if (permission && !allowed.includes(permission))
    throw new Error('Forbidden: your role does not allow this action.');
  return { client, user, profile, permissions: allowed };
}
export async function owner() {
  const session = await staff('users.edit');
  const { data } = await session.client.rpc('is_owner');
  if (!data) throw new Error('Only an owner can manage staff and roles.');
  return session;
}
