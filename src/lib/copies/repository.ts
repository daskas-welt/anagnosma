import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

export type NewCopyInput = {
  bookId: number;
  format: string;
  notes?: string;
};

export async function createCopy(userId: string, input: NewCopyInput) {
  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, input.bookId), eq(books.userId, userId)));
  if (!book) return undefined;
  const [copy] = await db.insert(copies).values(input).returning();
  return copy;
}

async function copyBelongsToUser(userId: string, copyId: number): Promise<boolean> {
  const [row] = await db
    .select({ copyId: copies.id })
    .from(copies)
    .innerJoin(books, eq(books.id, copies.bookId))
    .where(and(eq(copies.id, copyId), eq(books.userId, userId)));
  return !!row;
}

export async function updateCopy(userId: string, id: number, input: Partial<Omit<NewCopyInput, 'bookId'>>) {
  if (!(await copyBelongsToUser(userId, id))) return undefined;
  // Whitelist explicitly rather than spreading `input` into `.set()` —
  // Drizzle's `.set()` writes any object key that matches a real column
  // name, so a raw spread would let an attacker-supplied `bookId` key in the
  // request body reassign which book this copy belongs to. Only these
  // named, allowed fields may reach `.set()`.
  const patch: Partial<Omit<NewCopyInput, 'bookId'>> = {};
  if (input.format !== undefined) patch.format = input.format;
  if (input.notes !== undefined) patch.notes = input.notes;

  const [updated] = await db
    .update(copies)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(copies.id, id))
    .returning();
  return updated;
}

export async function deleteCopy(userId: string, id: number): Promise<boolean> {
  if (!(await copyBelongsToUser(userId, id))) return false;
  await db.delete(copies).where(eq(copies.id, id));
  return true;
}
