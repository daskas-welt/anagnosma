import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { copies } from '@/lib/db/schema';

export type NewCopyInput = {
  bookId: number;
  format: string;
  notes?: string;
};

export async function createCopy(input: NewCopyInput) {
  const [copy] = await db.insert(copies).values(input).returning();
  return copy;
}

export async function updateCopy(id: number, input: Partial<Omit<NewCopyInput, 'bookId'>>) {
  const [updated] = await db
    .update(copies)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(copies.id, id))
    .returning();
  return updated;
}

export async function deleteCopy(id: number) {
  await db.delete(copies).where(eq(copies.id, id));
}
