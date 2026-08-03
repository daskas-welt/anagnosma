import { NextResponse } from 'next/server';
import { deleteTag, renameTag } from '@/lib/tags/repository';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const updated = await renameTag(Number(id), body.name);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteTag(Number(id));
  return new NextResponse(null, { status: 204 });
}
