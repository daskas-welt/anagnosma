import { NextResponse } from 'next/server';
import { deleteSampleBooks } from '@/lib/books/repository';
import { requireUserId } from '@/lib/auth-helpers';

export async function DELETE() {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;

  const deletedCount = await deleteSampleBooks(userId);
  return NextResponse.json({ deletedCount });
}
