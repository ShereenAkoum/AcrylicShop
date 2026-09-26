import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOrigin, rateLimit } from '@/lib/http';
import { adminDb } from '@/lib/supabase/admin';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit('contact', 5);
    const data = z
      .object({
        full_name: z.string().min(2).max(120),
        email: z.email(),
        message: z.string().min(10).max(5000),
      })
      .parse(await request.json());
    const { error } = await adminDb().from('contact_messages').insert(data);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Your message could not be saved. Check your details or try again later.' },
      { status: 400 },
    );
  }
}
