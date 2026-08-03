import { NextResponse } from 'next/server';
import { assignTag, listTagIdsForBook, removeTag } from '@/lib/tags/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const tagIds = await listTagIdsForBook(bookId);
  return NextResponse.json(tagIds);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<{ tagId?: string | number }>(request);
  if (error) return error;
  const tagId = parseId(String(body.tagId ?? ''));
  if (tagId == null) return NextResponse.json({ error: 'invalid tagId' }, { status: 400 });
  await assignTag(bookId, tagId);
  return new NextResponse(null, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const tagIdParam = new URL(request.url).searchParams.get('tagId') ?? '';
  const tagId = parseId(tagIdParam);
  if (tagId == null) return NextResponse.json({ error: 'invalid tagId' }, { status: 400 });
  await removeTag(bookId, tagId);
  return new NextResponse(null, { status: 204 });
}
