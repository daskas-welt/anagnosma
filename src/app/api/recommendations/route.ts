import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth-helpers';
import { getRecommendations } from '@/lib/recommendations';

export async function GET(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const url = new URL(request.url);
  const subjectIdParam = url.searchParams.get('subjectId');
  const pageParam = url.searchParams.get('page');
  const excludeParam = url.searchParams.get('exclude');
  const subjectId = subjectIdParam ? Number(subjectIdParam) : undefined;
  const page = pageParam ? Number(pageParam) : undefined;
  const excludeKeys = excludeParam
    ? excludeParam.split(',').filter(Boolean)
    : undefined;
  const validSubjectId =
    typeof subjectId === 'number' && Number.isInteger(subjectId)
      ? subjectId
      : undefined;
  const validPage =
    typeof page === 'number' && Number.isInteger(page) && page > 0
      ? page
      : undefined;
  return NextResponse.json(
    await getRecommendations(userId, fetch, {
      subjectId: validSubjectId,
      page: validPage,
      excludeKeys,
    }),
  );
}
