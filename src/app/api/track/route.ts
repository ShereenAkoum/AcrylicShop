import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';
import { rateLimit, sameOrigin } from '@/lib/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit('tracking', 30);
    const input = z
      .object({ number: z.string().regex(/^YQ-\d+$/), token: z.string().regex(/^[a-f0-9]{64}$/) })
      .parse(await request.json());
    const { data, error } = await adminDb().rpc('track_order', {
      p_number: input.number,
      p_token: input.token,
    });
    if (error || !data)
      return NextResponse.json(
        { error: 'No matching order. Check your order number and private code.' },
        { status: 404 },
      );
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { error: 'Tracking unavailable. Check your details or try again later.' },
      { status: 400 },
    );
  }
}
