import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import {
  createBook,
  getBook,
  listBooks,
  updateBook,
  deleteBook,
  type NewBookInput,
} from '@/lib/books/repository';

const USER_A = 'user_test_a';
const USER_B = 'user_test_b';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('books repository', () => {
  it('creates a book with its first copy', async () => {
    const created = await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    expect(created.title).toBe('Dune');
    expect(created.copies).toHaveLength(1);
    expect(created.copies[0].format).toBe('paperback');
  });

  it('gets a book by id with its copies', async () => {
    const created = await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'hardcover',
    });
    const fetched = await getBook(USER_A, created.id);
    expect(fetched?.title).toBe('Dune');
    expect(fetched?.copies).toHaveLength(1);
  });

  it('returns undefined for a missing book', async () => {
    const fetched = await getBook(USER_A, 999999);
    expect(fetched).toBeUndefined();
  });

  it('lists all books for that user', async () => {
    await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    await createBook(USER_A, {
      title: 'Foundation',
      author: 'Isaac Asimov',
      format: 'ebook',
    });
    const list = await listBooks(USER_A);
    expect(list.map((b) => b.title).sort()).toEqual(['Dune', 'Foundation']);
  });

  it('updates a book', async () => {
    const created = await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    const updated = await updateBook(USER_A, created.id, {
      title: 'Dune (Deluxe)',
    });
    expect(updated?.title).toBe('Dune (Deluxe)');
  });

  it('deletes a book and its copies', async () => {
    const created = await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    await deleteBook(USER_A, created.id);
    expect(await getBook(USER_A, created.id)).toBeUndefined();
  });

  it('creates multiple books with empty isbn without unique constraint violation', async () => {
    const book1 = await createBook(USER_A, {
      title: 'Book One',
      author: 'Author One',
      isbn: '',
      format: 'paperback',
    });
    const book2 = await createBook(USER_A, {
      title: 'Book Two',
      author: 'Author Two',
      isbn: '',
      format: 'hardcover',
    });
    expect(book1.isbn).toBeNull();
    expect(book2.isbn).toBeNull();
  });

  it('allows two different users to each own a book with the same ISBN (per-user unique, not global)', async () => {
    const bookA = await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441013593',
      format: 'paperback',
    });
    const bookB = await createBook(USER_B, {
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441013593',
      format: 'hardcover',
    });
    expect(bookA.isbn).toBe('9780441013593');
    expect(bookB.isbn).toBe('9780441013593');
  });

  it('updates multiple books with empty isbn without unique constraint violation', async () => {
    const book1 = await createBook(USER_A, {
      title: 'Book One',
      author: 'Author One',
      isbn: '978-0-123456-78-9',
      format: 'paperback',
    });
    const book2 = await createBook(USER_A, {
      title: 'Book Two',
      author: 'Author Two',
      isbn: '978-0-987654-32-1',
      format: 'hardcover',
    });
    const updated1 = await updateBook(USER_A, book1.id, { isbn: '' });
    const updated2 = await updateBook(USER_A, book2.id, { isbn: '' });
    expect(updated1?.isbn).toBeNull();
    expect(updated2?.isbn).toBeNull();
  });

  it("does not return, update, or delete another user's book", async () => {
    const created = await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    expect(await getBook(USER_B, created.id)).toBeUndefined();
    expect(
      await updateBook(USER_B, created.id, { title: 'Hacked' }),
    ).toBeUndefined();
    await deleteBook(USER_B, created.id);
    expect(await getBook(USER_A, created.id)).toBeDefined();
  });

  it('does not allow a mass-assignment userId key in the patch to reassign ownership', async () => {
    const created = await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    // Cast needed: the type correctly forbids `userId` in the input, but a
    // real attacker controls the raw request body, not the TypeScript type.
    await updateBook(USER_A, created.id, {
      title: 'Still Mine',
      userId: USER_B,
    } as unknown as Partial<Omit<NewBookInput, 'format'>>);
    const [row] = await db.select().from(books).where(eq(books.id, created.id));
    expect(row.userId).toBe(USER_A);
    expect(row.title).toBe('Still Mine');
  });
});
