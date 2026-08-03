import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import { createBook } from '@/lib/books/repository';
import { POST } from '@/app/api/copies/route';
import { PATCH, DELETE } from '@/app/api/copies/[id]/route';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('copies API', () => {
  it('POST adds a second copy to an existing book', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const res = await POST(
      new Request('http://localhost/api/copies', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.id, format: 'ebook' }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.format).toBe('ebook');
    expect(body.bookId).toBe(book.id);
  });

  it('PATCH updates copy reading state', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await PATCH(
      new Request(`http://localhost/api/copies/${copyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'reading', progressPage: 120, rating: 5 }),
      }),
      { params: Promise.resolve({ id: String(copyId) }) },
    );
    const body = await res.json();
    expect(body.status).toBe('reading');
    expect(body.progressPage).toBe(120);
    expect(body.rating).toBe(5);
  });

  it('DELETE removes a copy without deleting the book', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await DELETE(new Request(`http://localhost/api/copies/${copyId}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(copyId) }),
    });
    expect(res.status).toBe(204);
  });
});
