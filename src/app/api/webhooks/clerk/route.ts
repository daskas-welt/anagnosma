import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { seedGenresForUser } from '@/lib/subjects/genres';

export async function POST(request: Request) {
  let event;
  try {
    event = await verifyWebhook(request as NextRequest);
  } catch (err) {
    // Leave a log trail for a real delivery failure in production (missing
    // CLERK_WEBHOOK_SIGNING_SECRET, invalid signature, malformed payload,
    // etc.) instead of silently returning 400 with nothing to debug from.
    console.error('Clerk webhook verification failed:', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.type === 'user.created') {
    await seedGenresForUser(event.data.id);
  }

  return NextResponse.json({ received: true });
}
