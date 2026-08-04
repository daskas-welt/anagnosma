import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { seedGenresForUser } from '@/lib/subjects/genres';

export async function POST(request: Request) {
  let event;
  try {
    event = await verifyWebhook(request as NextRequest);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.type === 'user.created') {
    await seedGenresForUser(event.data.id);
  }

  return NextResponse.json({ received: true });
}
