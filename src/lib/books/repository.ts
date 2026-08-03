import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

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

export async function createBook(input: NewBookInput): Promise<BookWithCopies> {
  const { format, ...bookFields } = input;
  // Normalize empty/whitespace-only isbn to undefined so it's stored as NULL, not ''
  // This prevents unique constraint violations when multiple books lack an ISBN
  const isbn = input.isbn?.trim() || undefined;
  return db.transaction(async (tx) => {
    const [book] = await tx.insert(books).values({ ...bookFields, isbn }).returning();
    const [copy] = await tx
      .insert(copies)
      .values({ bookId: book.id, format })
      .returning();
    return { ...book, copies: [copy] };
  });
}

export async function getBook(id: number): Promise<BookWithCopies | undefined> {
  const [book] = await db.select().from(books).where(eq(books.id, id));
  if (!book) return undefined;
  const bookCopies = await db.select().from(copies).where(eq(copies.bookId, id));
  return { ...book, copies: bookCopies };
}

export async function listBooks(): Promise<BookWithCopies[]> {
  const allBooks = await db.select().from(books);
  const allCopies = await db.select().from(copies);
  return allBooks.map((book) => ({
    ...book,
    copies: allCopies.filter((c) => c.bookId === book.id),
  }));
}

export async function updateBook(
  id: number,
  input: Partial<Omit<NewBookInput, 'format'>>,
): Promise<BookWithCopies | undefined> {
  const [updated] = await db.update(books).set(input).where(eq(books.id, id)).returning();
  if (!updated) return undefined;
  return getBook(id);
}

export async function deleteBook(id: number): Promise<void> {
  await db.delete(books).where(eq(books.id, id));
}
