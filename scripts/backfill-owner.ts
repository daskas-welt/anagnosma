import { isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, subjects } from '@/lib/db/schema';

export async function backfillOwner(
  userId: string,
): Promise<{ books: number; subjects: number }> {
  const updatedBooks = await db
    .update(books)
    .set({ userId })
    .where(isNull(books.userId))
    .returning({ id: books.id });
  const updatedSubjects = await db
    .update(subjects)
    .set({ userId })
    .where(isNull(subjects.userId))
    .returning({ id: subjects.id });
  return { books: updatedBooks.length, subjects: updatedSubjects.length };
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: tsx scripts/backfill-owner.ts <clerk-user-id>');
    process.exit(1);
  }
  const result = await backfillOwner(userId);
  console.log(
    `Assigned ${result.books} book(s) and ${result.subjects} subject(s) to user ${userId}.`,
  );
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
}
