import { NextResponse } from 'next/server';
import { createTag, listTagsWithCounts } from '@/lib/tags/repository';

export async function GET() {
  return NextResponse.json(await listTagsWithCounts());
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const tag = await createTag(body.name);
  return NextResponse.json(tag, { status: 201 });
}
