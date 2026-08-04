import { NextResponse } from 'next/server';
import { deleteCopy, updateCopy, type NewCopyInput } from '@/lib/copies/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const copyId = parseId(id);
  if (copyId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<Partial<Omit<NewCopyInput, 'bookId'>>>(request);
  if (error) return error;
  const updated = await updateCopy(userId, copyId, body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const copyId = parseId(id);
  if (copyId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const found = await deleteCopy(userId, copyId);
  if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
