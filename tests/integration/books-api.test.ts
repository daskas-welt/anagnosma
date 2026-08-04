import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { GET, POST } from '@/app/api/books/route';
import { GET as GET_ONE, PATCH, DELETE } from '@/app/api/books/[id]/route';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

function req(body?: unknown, url = 'http://localhost/api/books') {
  return new Request(url, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('books API', () => {
  it('POST creates a book', async () => {
    const res = await POST(req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Dune');
    expect(body.copies).toHaveLength(1);
  });

  it('POST rejects a missing title', async () => {
    const res = await POST(req({ author: 'Frank Herbert', format: 'paperback' }));
    expect(res.status).toBe(400);
  });

  it('GET lists books', async () => {
    await POST(req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }));
    const res = await GET(new Request('http://localhost/api/books'));
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('GET one returns 404 for missing book', async () => {
    const res = await GET_ONE(new Request('http://localhost/api/books/999999'), {
      params: Promise.resolve({ id: '999999' }),
    });
    expect(res.status).toBe(404);
  });

  it('PATCH updates a book', async () => {
    const created = await (await POST(req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }))).json();
    const res = await PATCH(
      new Request(`http://localhost/api/books/${created.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Dune (Deluxe)' }),
      }),
      { params: Promise.resolve({ id: String(created.id) }) },
    );
    const body = await res.json();
    expect(body.title).toBe('Dune (Deluxe)');
  });

  it('DELETE removes a book', async () => {
    const created = await (await POST(req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }))).json();
    const res = await DELETE(new Request(`http://localhost/api/books/${created.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(204);
  });
});
