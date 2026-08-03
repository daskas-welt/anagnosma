import { NextResponse } from 'next/server';
import { deleteTag, renameTag } from '@/lib/tags/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const tagId = parseId(id);
  if (tagId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<{ name?: string }>(request);
  if (error) return error;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const updated = await renameTag(tagId, body.name);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const tagId = parseId(id);
  if (tagId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  await deleteTag(tagId);
  return new NextResponse(null, { status: 204 });
}
