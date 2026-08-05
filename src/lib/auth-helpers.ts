import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Resolves the current Clerk session, returning a clean 401 instead of
 * letting an unauthenticated request reach repository/database code.
 */
export async function requireUserId(): Promise<
  | { userId: string; error?: undefined }
  | { userId?: undefined; error: NextResponse }
> {
  const { userId } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }
  return { userId };
}
