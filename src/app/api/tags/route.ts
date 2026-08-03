import { NextResponse } from 'next/server';
import { createTag, listTagsWithCounts } from '@/lib/tags/repository';
import { parseJsonBody } from '@/lib/api-helpers';

export async function GET() {
  return NextResponse.json(await listTagsWithCounts());
}

export async function POST(request: Request) {
  const { data: body, error } = await parseJsonBody<{ name?: string }>(request);
  if (error) return error;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const tag = await createTag(body.name);
  return NextResponse.json(tag, { status: 201 });
}
