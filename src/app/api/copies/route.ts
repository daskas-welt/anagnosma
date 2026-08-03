import { NextResponse } from 'next/server';
import { createCopy } from '@/lib/copies/repository';

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.bookId || !body.format) {
    return NextResponse.json({ error: 'bookId and format are required' }, { status: 400 });
  }
  const copy = await createCopy(body);
  return NextResponse.json(copy, { status: 201 });
}
