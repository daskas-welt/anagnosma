import { NextResponse } from 'next/server';
import {
  assignSubject,
  listSubjectIdsForBook,
  removeSubject,
} from '@/lib/subjects/repository';
import { getBook } from '@/lib/books/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null)
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const book = await getBook(userId, bookId);
  if (!book) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const subjectIds = await listSubjectIdsForBook(userId, bookId);
  return NextResponse.json(subjectIds);
}

export async function POST(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null)
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<{
    subjectId?: string | number;
  }>(request);
  if (error) return error;
  const subjectId = parseId(String(body.subjectId ?? ''));
  if (subjectId == null)
    return NextResponse.json({ error: 'invalid subjectId' }, { status: 400 });
  const assigned = await assignSubject(userId, bookId, subjectId);
  if (!assigned)
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null)
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const subjectIdParam =
    new URL(request.url).searchParams.get('subjectId') ?? '';
  const subjectId = parseId(subjectIdParam);
  if (subjectId == null)
    return NextResponse.json({ error: 'invalid subjectId' }, { status: 400 });
  const removed = await removeSubject(userId, bookId, subjectId);
  if (!removed)
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
