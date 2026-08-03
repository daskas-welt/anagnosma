import { NextResponse } from 'next/server';
import { listAllBookSubjectIds } from '@/lib/subjects/repository';

export async function GET() {
  return NextResponse.json(await listAllBookSubjectIds());
}
