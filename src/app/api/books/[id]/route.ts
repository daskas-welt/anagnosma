import { NextResponse } from 'next/server';
import { deleteBook, getBook, updateBook, type NewBookInput } from '@/lib/books/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const book = await getBook(userId, bookId);
  if (!book) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(book);
}

export async function PATCH(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<Partial<Omit<NewBookInput, 'format'>>>(request);
  if (error) return error;
  const updated = await updateBook(userId, bookId, body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  await deleteBook(userId, bookId);
  return new NextResponse(null, { status: 204 });
}
