import { NextResponse } from 'next/server';
import { checkoutSchema } from '@/lib/domain';
import { adminDb } from '@/lib/supabase/admin';
import { rateLimit, sameOrigin } from '@/lib/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit('checkout', 10);
    const input = checkoutSchema.parse(await request.json());
    const { data, error } = await adminDb().rpc('checkout', {
      p_request: input.request_id,
      p_customer: input.customer,
      p_items: input.items,
      p_token: input.token,
    });
    if (error)
      return NextResponse.json(
        {
          error:
            'Your order could not be placed. Check availability and your details, then try again.',
        },
        { status: 409 },
      );
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { error: 'Unable to complete checkout. Check the form, or wait before trying again.' },
      { status: 400 },
    );
  }
}
