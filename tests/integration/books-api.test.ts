import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { GET, POST } from '@/app/api/books/route';
import { POST as POST_WISHLIST } from '@/app/api/wishlist/route';
import { GET as GET_ONE, PATCH, DELETE } from '@/app/api/books/[id]/route';
import { requireUserId } from '@/lib/auth-helpers';

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
  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(requireUserId).mockResolvedValueOnce({
      error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    });
    const res = await GET(new Request('http://localhost/api/books'));
    expect(res.status).toBe(401);
  });

  it('POST creates a book', async () => {
    const res = await POST(
      req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Dune');
    expect(body.copies).toHaveLength(1);
  });

  it('POST rejects a missing title', async () => {
    const res = await POST(
      req({ author: 'Frank Herbert', format: 'paperback' }),
    );
    expect(res.status).toBe(400);
  });

  it('GET lists books', async () => {
    await POST(
      req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }),
    );
    const res = await GET(new Request('http://localhost/api/books'));
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('GET one returns 404 for missing book', async () => {
    const res = await GET_ONE(
      new Request('http://localhost/api/books/999999'),
      {
        params: Promise.resolve({ id: '999999' }),
      },
    );
    expect(res.status).toBe(404);
  });

  it('PATCH updates a book', async () => {
    const created = await (
      await POST(
        req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }),
      )
    ).json();
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

  it('POST returns a friendly 409 (not an unhandled 500) for a duplicate ISBN for the same user', async () => {
    await POST(
      req({
        title: 'Dune',
        author: 'Frank Herbert',
        format: 'paperback',
        isbn: '9780441013593',
      }),
    );
    const res = await POST(
      req({
        title: 'Dune (2nd copy)',
        author: 'Frank Herbert',
        format: 'hardcover',
        isbn: '9780441013593',
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already have a book with this isbn/i);
  });

  it('POST rejects an ISBN already in the wishlist', async () => {
    await POST_WISHLIST(
      new Request('http://localhost/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Dune wishlist',
          author: 'Frank Herbert',
          isbn: '9780441013593',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const res = await POST(
      req({
        title: 'Dune',
        author: 'Frank Herbert',
        format: 'paperback',
        isbn: '9780441013593',
      }),
    );
    expect(res.status).toBe(409);
  });

  it('DELETE removes a book', async () => {
    const created = await (
      await POST(
        req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }),
      )
    ).json();
    const res = await DELETE(
      new Request(`http://localhost/api/books/${created.id}`, {
        method: 'DELETE',
      }),
      {
        params: Promise.resolve({ id: String(created.id) }),
      },
    );
    expect(res.status).toBe(204);
  });
});
