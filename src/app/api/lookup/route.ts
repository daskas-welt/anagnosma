import { NextResponse } from 'next/server';
import { lookupByIsbn, searchOpenLibrary } from '@/lib/isbn-lookup/client';
import { requireUserId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { error: authError } = await requireUserId();
  if (authError) return authError;
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get('query')?.trim();
  if (query) return NextResponse.json(await searchOpenLibrary(query));

  const isbn = searchParams.get('isbn');
  if (!isbn) return NextResponse.json({ error: 'isbn query param is required' }, { status: 400 });
  const result = await lookupByIsbn(isbn);
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(result);
}
