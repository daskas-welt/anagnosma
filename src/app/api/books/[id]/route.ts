import { NextResponse } from 'next/server';
import { deleteBook, getBook, updateBook } from '@/lib/books/repository';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const book = await getBook(Number(id));
  if (!book) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(book);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const updated = await updateBook(Number(id), body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteBook(Number(id));
  return new NextResponse(null, { status: 204 });
}
