import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { createBook } from '@/lib/books/repository';
import { POST } from '@/app/api/copies/route';
import { PATCH, DELETE } from '@/app/api/copies/[id]/route';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('copies API', () => {
  it('POST adds a second copy to an existing book', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
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

  it('POST returns 404 for a book belonging to another user', async () => {
    const book = await createBook('user_test_b', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const res = await POST(
      new Request('http://localhost/api/copies', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.id, format: 'ebook' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('PATCH updates copy notes', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await PATCH(
      new Request(`http://localhost/api/copies/${copyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Great world-building.' }),
      }),
      { params: Promise.resolve({ id: String(copyId) }) },
    );
    const body = await res.json();
    expect(body.notes).toBe('Great world-building.');
  });

  it('DELETE removes a copy without deleting the book', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await DELETE(new Request(`http://localhost/api/copies/${copyId}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(copyId) }),
    });
    expect(res.status).toBe(204);
  });

  it('DELETE returns 404 for a copy belonging to another user\'s book', async () => {
    const book = await createBook('user_test_b', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await DELETE(new Request(`http://localhost/api/copies/${copyId}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(copyId) }),
    });
    expect(res.status).toBe(404);
  });
});
