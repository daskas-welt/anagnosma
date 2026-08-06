import { eq, and, or, ilike, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  books,
  copies,
  bookSubjects,
  catalogPreferences,
} from '@/lib/db/schema';

export type NewBookInput = {
  isbn?: string;
  title: string;
  author: string;
  coverUrl?: string;
  publisher?: string;
  publishYear?: number;
  pageCount?: number;
  description?: string;
  format: string;
  notes?: string;
};

export type BookWithCopies = typeof books.$inferSelect & {
  copies: (typeof copies.$inferSelect)[];
};

export async function createBook(
  userId: string,
  input: NewBookInput,
  options: { isSample?: boolean } = {},
): Promise<BookWithCopies> {
  const { format, notes, ...bookFields } = input;
  const isbn = input.isbn?.trim() || undefined;
  return db.transaction(async (tx) => {
    const [book] = await tx
      .insert(books)
      .values({
        ...bookFields,
        isbn,
        userId,
        isSample: options.isSample ?? false,
      })
      .returning();
    const [copy] = await tx
      .insert(copies)
      .values({ bookId: book.id, format, notes })
      .returning();
    return { ...book, copies: [copy] };
  });
}

export async function getBook(
  userId: string,
  id: number,
): Promise<BookWithCopies | undefined> {
  const [book] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.userId, userId)));
  if (!book) return undefined;
  const bookCopies = await db
    .select()
    .from(copies)
    .where(eq(copies.bookId, id));
  return { ...book, copies: bookCopies };
}

export type BookFilters = {
  q?: string;
  format?: string;
  subjectId?: number;
};

export async function listBooks(
  userId: string,
  filters: BookFilters = {},
): Promise<BookWithCopies[]> {
  let bookIds: number[] | undefined;

  if (filters.subjectId) {
    // Join through books and scope to this user so the subquery never scans
    // every other tenant's book_subjects rows just to intersect them away
    // below via bookConditions.
    const rows = await db
      .select({ bookId: bookSubjects.bookId })
      .from(bookSubjects)
      .innerJoin(books, eq(books.id, bookSubjects.bookId))
      .where(
        and(
          eq(bookSubjects.subjectId, filters.subjectId),
          eq(books.userId, userId),
        ),
      );
    bookIds = rows.map((r) => r.bookId);
  }

  const bookConditions = [
    eq(books.userId, userId),
    filters.q
      ? or(
          ilike(books.title, `%${filters.q}%`),
          ilike(books.author, `%${filters.q}%`),
        )
      : undefined,
    bookIds ? inArray(books.id, bookIds.length ? bookIds : [-1]) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const allBooks = await db
    .select()
    .from(books)
    .where(and(...bookConditions));

  const ownBookIds = allBooks.map((b) => b.id);

  // Scope to this user's own book ids (computed above) rather than scanning
  // every tenant's copies on every catalog page load — results were already
  // filtered down to this user's books afterward, but the underlying query
  // previously had no WHERE clause at all when no format filter was given.
  const copyConditions = [
    inArray(copies.bookId, ownBookIds.length ? ownBookIds : [-1]),
    filters.format ? eq(copies.format, filters.format) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const allCopies = ownBookIds.length
    ? await db
        .select()
        .from(copies)
        .where(and(...copyConditions))
    : [];

  const copiesByBook = new Map<number, (typeof copies.$inferSelect)[]>();
  for (const copy of allCopies) {
    copiesByBook.set(copy.bookId, [
      ...(copiesByBook.get(copy.bookId) ?? []),
      copy,
    ]);
  }

  return allBooks
    .map((book) => ({ ...book, copies: copiesByBook.get(book.id) ?? [] }))
    .filter((book) => (filters.format ? book.copies.length > 0 : true));
}

export async function updateBook(
  userId: string,
  id: number,
  input: Partial<Omit<NewBookInput, 'format'>>,
): Promise<BookWithCopies | undefined> {
  // Whitelist explicitly rather than spreading `input` (or any object built
  // from it) into `.set()` — Drizzle's `.set()` writes any object key that
  // matches a real column name, so a raw spread would let an attacker-
  // supplied `userId`/`id`/`createdAt` key in the request body reassign
  // ownership of the row. Only these named, allowed fields may reach `.set()`.
  const patch: Omit<Partial<Omit<NewBookInput, 'format'>>, 'isbn'> & {
    isbn?: string | null;
  } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.author !== undefined) patch.author = input.author;
  if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;
  if (input.publisher !== undefined) patch.publisher = input.publisher;
  if (input.publishYear !== undefined) patch.publishYear = input.publishYear;
  if (input.pageCount !== undefined) patch.pageCount = input.pageCount;
  if (input.description !== undefined) patch.description = input.description;
  if (input.isbn !== undefined) patch.isbn = input.isbn?.trim() || null;

  const [updated] = await db
    .update(books)
    .set(patch)
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .returning();
  if (!updated) return undefined;
  return getBook(userId, id);
}

export async function deleteBook(userId: string, id: number): Promise<void> {
  await db.delete(books).where(and(eq(books.id, id), eq(books.userId, userId)));
}

export async function deleteSampleBooks(userId: string): Promise<number> {
  return db.transaction(async (tx) => {
    await tx
      .insert(catalogPreferences)
      .values({ userId, sampleCatalogSeeded: true })
      .onConflictDoNothing();
    const deleted = await tx
      .delete(books)
      .where(and(eq(books.userId, userId), eq(books.isSample, true)))
      .returning({ id: books.id });
    return deleted.length;
  });
}
