import { eq, and, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, subjects, bookSubjects } from '@/lib/db/schema';

export async function createSubject(userId: string, name: string) {
  const [subject] = await db.insert(subjects).values({ userId, name }).returning();
  return subject;
}

export async function listSubjectsWithCounts(userId: string) {
  const rows = await db
    .select({ id: subjects.id, name: subjects.name, bookCount: count(bookSubjects.bookId) })
    .from(subjects)
    .leftJoin(bookSubjects, eq(bookSubjects.subjectId, subjects.id))
    .where(eq(subjects.userId, userId))
    .groupBy(subjects.id, subjects.name);
  return rows.map((r) => ({ ...r, bookCount: Number(r.bookCount) }));
}

export async function renameSubject(userId: string, id: number, name: string) {
  const [updated] = await db
    .update(subjects)
    .set({ name })
    .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
    .returning();
  return updated;
}

export async function deleteSubject(userId: string, id: number): Promise<boolean> {
  const deleted = await db
    .delete(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
    .returning({ id: subjects.id });
  return deleted.length > 0;
}

async function bookAndSubjectBelongToUser(userId: string, bookId: number, subjectId: number): Promise<boolean> {
  const [book] = await db.select({ id: books.id }).from(books).where(and(eq(books.id, bookId), eq(books.userId, userId)));
  if (!book) return false;
  const [subject] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)));
  return !!subject;
}

export async function assignSubject(userId: string, bookId: number, subjectId: number): Promise<boolean> {
  if (!(await bookAndSubjectBelongToUser(userId, bookId, subjectId))) return false;
  await db.insert(bookSubjects).values({ bookId, subjectId }).onConflictDoNothing();
  return true;
}

export async function removeSubject(userId: string, bookId: number, subjectId: number): Promise<boolean> {
  if (!(await bookAndSubjectBelongToUser(userId, bookId, subjectId))) return false;
  await db.delete(bookSubjects).where(and(eq(bookSubjects.bookId, bookId), eq(bookSubjects.subjectId, subjectId)));
  return true;
}

export async function listSubjectIdsForBook(userId: string, bookId: number): Promise<number[]> {
  const [book] = await db.select({ id: books.id }).from(books).where(and(eq(books.id, bookId), eq(books.userId, userId)));
  if (!book) return [];
  const rows = await db.select({ subjectId: bookSubjects.subjectId }).from(bookSubjects).where(eq(bookSubjects.bookId, bookId));
  return rows.map((r) => r.subjectId);
}

// A book can belong to more than one subject. Returns every book->subject
// association for this user's books in one flat query so a "grouped by
// subject" view can section an already-loaded book list client-side
// without an N+1 fetch per subject.
export async function listAllBookSubjectIds(userId: string): Promise<Record<number, number[]>> {
  const rows = await db
    .select({ bookId: bookSubjects.bookId, subjectId: bookSubjects.subjectId })
    .from(bookSubjects)
    .innerJoin(books, eq(books.id, bookSubjects.bookId))
    .where(eq(books.userId, userId));
  const map: Record<number, number[]> = {};
  for (const row of rows) {
    (map[row.bookId] ??= []).push(row.subjectId);
  }
  return map;
}
