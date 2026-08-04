import { NextResponse } from 'next/server';
import { lookupByIsbn } from '@/lib/isbn-lookup/client';
import { requireUserId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { error: authError } = await requireUserId();
  if (authError) return authError;
  const isbn = new URL(request.url).searchParams.get('isbn');
  if (!isbn) return NextResponse.json({ error: 'isbn query param is required' }, { status: 400 });
  const result = await lookupByIsbn(isbn);
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(result);
}
