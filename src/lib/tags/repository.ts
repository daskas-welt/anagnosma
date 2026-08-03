import { eq, and, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tags, bookTags } from '@/lib/db/schema';

export async function createTag(name: string) {
  const [tag] = await db.insert(tags).values({ name }).returning();
  return tag;
}

export async function listTagsWithCounts() {
  const rows = await db
    .select({ id: tags.id, name: tags.name, bookCount: count(bookTags.bookId) })
    .from(tags)
    .leftJoin(bookTags, eq(bookTags.tagId, tags.id))
    .groupBy(tags.id, tags.name);
  return rows.map((r) => ({ ...r, bookCount: Number(r.bookCount) }));
}

export async function renameTag(id: number, name: string) {
  const [updated] = await db.update(tags).set({ name }).where(eq(tags.id, id)).returning();
  return updated;
}

export async function deleteTag(id: number) {
  await db.delete(tags).where(eq(tags.id, id));
}

export async function assignTag(bookId: number, tagId: number) {
  await db.insert(bookTags).values({ bookId, tagId }).onConflictDoNothing();
}

export async function listTagIdsForBook(bookId: number): Promise<number[]> {
  const rows = await db.select({ tagId: bookTags.tagId }).from(bookTags).where(eq(bookTags.bookId, bookId));
  return rows.map((r) => r.tagId);
}

export async function removeTag(bookId: number, tagId: number) {
  await db.delete(bookTags).where(and(eq(bookTags.bookId, bookId), eq(bookTags.tagId, tagId)));
}
