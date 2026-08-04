import { NextResponse } from 'next/server';
import { createSubject, listSubjectsWithCounts } from '@/lib/subjects/repository';
import { parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

export async function GET() {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  return NextResponse.json(await listSubjectsWithCounts(userId));
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } = await parseJsonBody<{ name?: string }>(request);
  if (error) return error;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const subject = await createSubject(userId, body.name);
  return NextResponse.json(subject, { status: 201 });
}
