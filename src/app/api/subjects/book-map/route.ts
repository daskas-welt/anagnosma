import { NextResponse } from 'next/server';
import { listAllBookSubjectIds } from '@/lib/subjects/repository';
import { requireUserId } from '@/lib/auth-helpers';

export async function GET() {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  return NextResponse.json(await listAllBookSubjectIds(userId));
}
