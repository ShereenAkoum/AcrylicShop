'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/supabase/server';
import { usernameSchema } from '@/lib/domain';
import { rateLimit } from '@/lib/http';
import type { Result } from '@/components/action-form';
export async function login(_: Result, form: FormData): Promise<Result> {
  const parsed = z
    .object({ username: usernameSchema, password: z.string().min(1).max(200) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Enter your username and password.' };
  try {
    await rateLimit('login', 20);
    const client = await db();
    const { error } = await client.auth.signInWithPassword({
      email: `${parsed.data.username}@staff.yaqeen.invalid`,
      password: parsed.data.password,
    });
    if (error) return { error: 'Invalid username or password.' };
    const {
      data: { user },
    } = await client.auth.getUser();
    const { data } = await client
      .from('profiles')
      .select('active')
      .eq('id', user?.id || '')
      .maybeSingle();
    if (!data?.active) {
      await client.auth.signOut();
      return { error: 'This account is not available.' };
    }
  } catch {
    return { error: 'Sign-in is temporarily unavailable. Please try again later.' };
  }
  redirect('/admin');
}
export async function logout() {
  await (await db()).auth.signOut();
  redirect('/login');
}
