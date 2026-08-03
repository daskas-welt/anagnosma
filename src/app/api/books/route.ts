import { NextResponse } from 'next/server';
import { createBook, listBooks, type NewBookInput } from '@/lib/books/repository';
import { parseJsonBody } from '@/lib/api-helpers';

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
  const { data: body, error } = await parseJsonBody<Partial<NewBookInput>>(request);
  if (error) return error;
  if (!body.title || !body.author || !body.format) {
    return NextResponse.json(
      { error: 'title, author, and format are required' },
      { status: 400 },
    );
  }
  const book = await createBook(body as NewBookInput);
  return NextResponse.json(book, { status: 201 });
}
