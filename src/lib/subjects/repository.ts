import { eq, and, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subjects, bookSubjects } from '@/lib/db/schema';

export async function createSubject(name: string) {
  const [subject] = await db.insert(subjects).values({ name }).returning();
  return subject;
}

export async function listSubjectsWithCounts() {
  const rows = await db
    .select({ id: subjects.id, name: subjects.name, bookCount: count(bookSubjects.bookId) })
    .from(subjects)
    .leftJoin(bookSubjects, eq(bookSubjects.subjectId, subjects.id))
    .groupBy(subjects.id, subjects.name);
  return rows.map((r) => ({ ...r, bookCount: Number(r.bookCount) }));
}

export async function renameSubject(id: number, name: string) {
  const [updated] = await db.update(subjects).set({ name }).where(eq(subjects.id, id)).returning();
  return updated;
}

export async function deleteSubject(id: number) {
  await db.delete(subjects).where(eq(subjects.id, id));
}

export async function assignSubject(bookId: number, subjectId: number) {
  await db.insert(bookSubjects).values({ bookId, subjectId }).onConflictDoNothing();
}

export async function listSubjectIdsForBook(bookId: number): Promise<number[]> {
  const rows = await db.select({ subjectId: bookSubjects.subjectId }).from(bookSubjects).where(eq(bookSubjects.bookId, bookId));
  return rows.map((r) => r.subjectId);
}

export async function removeSubject(bookId: number, subjectId: number) {
  await db.delete(bookSubjects).where(and(eq(bookSubjects.bookId, bookId), eq(bookSubjects.subjectId, subjectId)));
}

// A book can belong to more than one subject. Returns every book->subject
// association in one flat query so a "grouped by subject" view can section
// an already-loaded book list client-side without an N+1 fetch per subject.
export async function listAllBookSubjectIds(): Promise<Record<number, number[]>> {
  const rows = await db.select({ bookId: bookSubjects.bookId, subjectId: bookSubjects.subjectId }).from(bookSubjects);
  const map: Record<number, number[]> = {};
  for (const row of rows) {
    (map[row.bookId] ??= []).push(row.subjectId);
  }
  return map;
}
