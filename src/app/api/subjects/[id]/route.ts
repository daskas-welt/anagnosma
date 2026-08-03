import { NextResponse } from 'next/server';
import { deleteSubject, renameSubject } from '@/lib/subjects/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const subjectId = parseId(id);
  if (subjectId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<{ name?: string }>(request);
  if (error) return error;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const updated = await renameSubject(subjectId, body.name);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const subjectId = parseId(id);
  if (subjectId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  await deleteSubject(subjectId);
  return new NextResponse(null, { status: 204 });
}
