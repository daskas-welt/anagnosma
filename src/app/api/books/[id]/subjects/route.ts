import { NextResponse } from 'next/server';
import { assignSubject, listSubjectIdsForBook, removeSubject } from '@/lib/subjects/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const subjectIds = await listSubjectIdsForBook(bookId);
  return NextResponse.json(subjectIds);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<{ subjectId?: string | number }>(request);
  if (error) return error;
  const subjectId = parseId(String(body.subjectId ?? ''));
  if (subjectId == null) return NextResponse.json({ error: 'invalid subjectId' }, { status: 400 });
  await assignSubject(bookId, subjectId);
  return new NextResponse(null, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const subjectIdParam = new URL(request.url).searchParams.get('subjectId') ?? '';
  const subjectId = parseId(subjectIdParam);
  if (subjectId == null) return NextResponse.json({ error: 'invalid subjectId' }, { status: 400 });
  await removeSubject(bookId, subjectId);
  return new NextResponse(null, { status: 204 });
}
