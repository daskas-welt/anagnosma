import { eq, and, or, ilike, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, copies, bookSubjects } from '@/lib/db/schema';

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
};

export type BookWithCopies = typeof books.$inferSelect & {
  copies: (typeof copies.$inferSelect)[];
};

export async function createBook(userId: string, input: NewBookInput): Promise<BookWithCopies> {
  const { format, ...bookFields } = input;
  const isbn = input.isbn?.trim() || undefined;
  return db.transaction(async (tx) => {
    const [book] = await tx.insert(books).values({ ...bookFields, isbn, userId }).returning();
    const [copy] = await tx
      .insert(copies)
      .values({ bookId: book.id, format })
      .returning();
    return { ...book, copies: [copy] };
  });
}

export async function getBook(userId: string, id: number): Promise<BookWithCopies | undefined> {
  const [book] = await db.select().from(books).where(and(eq(books.id, id), eq(books.userId, userId)));
  if (!book) return undefined;
  const bookCopies = await db.select().from(copies).where(eq(copies.bookId, id));
  return { ...book, copies: bookCopies };
}

export type BookFilters = {
  q?: string;
  format?: string;
  subjectId?: number;
};

export async function listBooks(userId: string, filters: BookFilters = {}): Promise<BookWithCopies[]> {
  let bookIds: number[] | undefined;

  if (filters.subjectId) {
    const rows = await db
      .select({ bookId: bookSubjects.bookId })
      .from(bookSubjects)
      .where(eq(bookSubjects.subjectId, filters.subjectId));
    bookIds = rows.map((r) => r.bookId);
  }

  const bookConditions = [
    eq(books.userId, userId),
    filters.q ? or(ilike(books.title, `%${filters.q}%`), ilike(books.author, `%${filters.q}%`)) : undefined,
    bookIds ? inArray(books.id, bookIds.length ? bookIds : [-1]) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const allBooks = await db
    .select()
    .from(books)
    .where(and(...bookConditions));

  const copyConditions = [
    filters.format ? eq(copies.format, filters.format) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const allCopies = await db
    .select()
    .from(copies)
    .where(copyConditions.length ? and(...copyConditions) : undefined);

  const copiesByBook = new Map<number, (typeof copies.$inferSelect)[]>();
  for (const copy of allCopies) {
    copiesByBook.set(copy.bookId, [...(copiesByBook.get(copy.bookId) ?? []), copy]);
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
  type NormalizedInput = Omit<Partial<Omit<NewBookInput, 'format'>>, 'isbn'> & { isbn?: string | null };
  const normalizedInput: NormalizedInput = { ...input };
  if (input.isbn !== undefined) {
    normalizedInput.isbn = input.isbn?.trim() || null;
  }
  const [updated] = await db
    .update(books)
    .set(normalizedInput)
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .returning();
  if (!updated) return undefined;
  return getBook(userId, id);
}

export async function deleteBook(userId: string, id: number): Promise<void> {
  await db.delete(books).where(and(eq(books.id, id), eq(books.userId, userId)));
}
