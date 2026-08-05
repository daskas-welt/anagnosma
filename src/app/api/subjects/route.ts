import { NextResponse } from 'next/server';
import {
  createSubject,
  listSubjectsWithCounts,
} from '@/lib/subjects/repository';
import { parseJsonBody, isUniqueViolation } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';
import { seedGenresForUser } from '@/lib/subjects/genres';

export async function GET() {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  let subjectsWithCounts = await listSubjectsWithCounts(userId);
  if (subjectsWithCounts.length === 0) {
    // Fallback for a new user whose Clerk `user.created` webhook was never
    // delivered (dropped event, webhook not configured, etc.). Seeding is
    // idempotent (onConflictDoNothing), so this is safe to call even if the
    // webhook did fire but simply hasn't landed yet. Makes the webhook a
    // fast-path optimization rather than a single point of failure.
    await seedGenresForUser(userId);
    subjectsWithCounts = await listSubjectsWithCounts(userId);
  }
  return NextResponse.json(subjectsWithCounts);
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } = await parseJsonBody<{ name?: string }>(request);
  if (error) return error;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  try {
    const subject = await createSubject(userId, body.name);
    return NextResponse.json(subject, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: 'you already have a subject with this name' },
        { status: 409 },
      );
    }
    throw err;
  }
}
