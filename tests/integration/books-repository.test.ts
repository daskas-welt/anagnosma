import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import { createBook, getBook, listBooks, updateBook, deleteBook } from '@/lib/books/repository';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('books repository', () => {
  it('creates a book with its first copy', async () => {
    const created = await createBook({
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    expect(created.title).toBe('Dune');
    expect(created.copies).toHaveLength(1);
    expect(created.copies[0].format).toBe('paperback');
    expect(created.copies[0].status).toBe('to-read');
  });

  it('gets a book by id with its copies', async () => {
    const created = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'hardcover' });
    const fetched = await getBook(created.id);
    expect(fetched?.title).toBe('Dune');
    expect(fetched?.copies).toHaveLength(1);
  });

  it('returns undefined for a missing book', async () => {
    const fetched = await getBook(999999);
    expect(fetched).toBeUndefined();
  });

  it('lists all books', async () => {
    await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const list = await listBooks();
    expect(list.map((b) => b.title).sort()).toEqual(['Dune', 'Foundation']);
  });

  it('updates a book', async () => {
    const created = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const updated = await updateBook(created.id, { title: 'Dune (Deluxe)' });
    expect(updated?.title).toBe('Dune (Deluxe)');
  });

  it('deletes a book and its copies', async () => {
    const created = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await deleteBook(created.id);
    expect(await getBook(created.id)).toBeUndefined();
  });

  it('creates multiple books with empty isbn without unique constraint violation', async () => {
    // Regression test for bug where empty string ISBN collides on unique constraint.
    // Empty/whitespace isbn should be normalized to NULL so multiple books can omit it.
    const book1 = await createBook({
      title: 'Book One',
      author: 'Author One',
      isbn: '',
      format: 'paperback',
    });
    const book2 = await createBook({
      title: 'Book Two',
      author: 'Author Two',
      isbn: '',
      format: 'hardcover',
    });
    expect(book1.isbn).toBeNull();
    expect(book2.isbn).toBeNull();
    const fetched1 = await getBook(book1.id);
    const fetched2 = await getBook(book2.id);
    expect(fetched1?.isbn).toBeNull();
    expect(fetched2?.isbn).toBeNull();
  });

  it('updates multiple books with empty isbn without unique constraint violation', async () => {
    // Regression test for updateBook: empty string ISBN should normalize to NULL
    // so two books can both have their ISBN cleared without unique constraint error.
    const book1 = await createBook({
      title: 'Book One',
      author: 'Author One',
      isbn: '978-0-123456-78-9',
      format: 'paperback',
    });
    const book2 = await createBook({
      title: 'Book Two',
      author: 'Author Two',
      isbn: '978-0-987654-32-1',
      format: 'hardcover',
    });

    // Update both books to have empty ISBN
    const updated1 = await updateBook(book1.id, { isbn: '' });
    const updated2 = await updateBook(book2.id, { isbn: '' });

    // Both updates should succeed and result in NULL isbn
    expect(updated1?.isbn).toBeNull();
    expect(updated2?.isbn).toBeNull();

    // Verify persistence
    const fetched1 = await getBook(book1.id);
    const fetched2 = await getBook(book2.id);
    expect(fetched1?.isbn).toBeNull();
    expect(fetched2?.isbn).toBeNull();
  });
});
