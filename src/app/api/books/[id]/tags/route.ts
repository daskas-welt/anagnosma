import { NextResponse } from 'next/server';
import { assignTag, removeTag } from '@/lib/tags/repository';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  await assignTag(Number(id), Number(body.tagId));
  return new NextResponse(null, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const tagId = new URL(request.url).searchParams.get('tagId');
  await removeTag(Number(id), Number(tagId));
  return new NextResponse(null, { status: 204 });
}
