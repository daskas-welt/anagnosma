import { NextResponse } from 'next/server';
import { createCopy, type NewCopyInput } from '@/lib/copies/repository';
import { parseJsonBody } from '@/lib/api-helpers';

export async function POST(request: Request) {
  const { data: body, error } = await parseJsonBody<Partial<NewCopyInput>>(request);
  if (error) return error;
  if (!body.bookId || !body.format) {
    return NextResponse.json({ error: 'bookId and format are required' }, { status: 400 });
  }
  const copy = await createCopy(body as NewCopyInput);
  return NextResponse.json(copy, { status: 201 });
}
