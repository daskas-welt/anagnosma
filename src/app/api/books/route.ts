import { NextResponse } from 'next/server';
import { createBook, listBooks } from '@/lib/books/repository';

export async function GET() {
  const books = await listBooks();
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
