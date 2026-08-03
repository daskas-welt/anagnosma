import { NextResponse } from 'next/server';
import { createSubject, listSubjectsWithCounts } from '@/lib/subjects/repository';
import { parseJsonBody } from '@/lib/api-helpers';

export async function GET() {
  return NextResponse.json(await listSubjectsWithCounts());
}

export async function POST(request: Request) {
  const { data: body, error } = await parseJsonBody<{ name?: string }>(request);
  if (error) return error;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const subject = await createSubject(body.name);
  return NextResponse.json(subject, { status: 201 });
}
