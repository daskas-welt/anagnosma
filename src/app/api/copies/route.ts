import { NextResponse } from 'next/server';
import { createCopy, type NewCopyInput } from '@/lib/copies/repository';
import { parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } =
    await parseJsonBody<Partial<NewCopyInput>>(request);
  if (error) return error;
  if (!body.bookId || !body.format) {
    return NextResponse.json(
      { error: 'bookId and format are required' },
      { status: 400 },
    );
  }
  const copy = await createCopy(userId, body as NewCopyInput);
  if (!copy) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(copy, { status: 201 });
}
