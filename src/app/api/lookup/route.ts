import { NextResponse } from 'next/server';
import { lookupByIsbn } from '@/lib/google-books/client';

export async function GET(request: Request) {
  const isbn = new URL(request.url).searchParams.get('isbn');
  if (!isbn) return NextResponse.json({ error: 'isbn query param is required' }, { status: 400 });
  const result = await lookupByIsbn(isbn);
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(result);
}
