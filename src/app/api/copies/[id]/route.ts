import { NextResponse } from 'next/server';
import { deleteCopy, updateCopy, type NewCopyInput } from '@/lib/copies/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const copyId = parseId(id);
  if (copyId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<Partial<Omit<NewCopyInput, 'bookId'>>>(request);
  if (error) return error;
  const updated = await updateCopy(copyId, body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const copyId = parseId(id);
  if (copyId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  await deleteCopy(copyId);
  return new NextResponse(null, { status: 204 });
}
