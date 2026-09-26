import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOrigin, rateLimit } from '@/lib/http';
import { adminDb } from '@/lib/supabase/admin';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit('newsletter', 5);
    const input = z
      .object({ email: z.email(), consent: z.literal(true) })
      .parse(await request.json());
    const { error } = await adminDb()
      .from('newsletter_subscribers')
      .upsert(
        { email: input.email.toLowerCase() },
        { onConflict: 'email', ignoreDuplicates: true },
      );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Subscription could not be saved. Please check your email or try again later.' },
      { status: 400 },
    );
  }
}
