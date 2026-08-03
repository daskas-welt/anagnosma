import { NextResponse } from 'next/server';
import { createBook, listBooks } from '@/lib/books/repository';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const format = url.searchParams.get('format') ?? undefined;
  const tagIdParam = url.searchParams.get('tagId');
  const books = await listBooks({ q, status, format, tagId: tagIdParam ? Number(tagIdParam) : undefined });
  return NextResponse.json(books);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.title || !body.author || !body.format) {
    return NextResponse.json(
      { error: 'title, author, and format are required' },
      { status: 400 },
    );
  }
  const book = await createBook(body);
  return NextResponse.json(book, { status: 201 });
}
