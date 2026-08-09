import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  books,
  bookSubjects,
  catalogPreferences,
  copies,
  subjects,
} from '@/lib/db/schema';
import { createBook, listBooks } from '@/lib/books/repository';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { GET, POST } from '@/app/api/wishlist/route';
import { DELETE as DELETE_SAMPLES } from '@/app/api/wishlist/samples/route';
import { requireUserId } from '@/lib/auth-helpers';

beforeEach(async () => {
  await db.delete(bookSubjects);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(subjects);
  await db.delete(catalogPreferences);
});

function jsonRequest(body: unknown, url = 'http://localhost/api/wishlist') {
  return new Request(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('wishlist API', () => {
  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(requireUserId).mockResolvedValueOnce({
      error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    });
    const res = await GET(new Request('http://localhost/api/wishlist'));
    expect(res.status).toBe(401);
  });

  it('POST creates a wishlist book without a physical copy', async () => {
    const res = await POST(
      jsonRequest({ title: 'Dune', author: 'Frank Herbert' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.isWishlist).toBe(true);
    expect(body.copies).toEqual([]);
  });

  it('allows the same ISBN in the catalog and wishlist', async () => {
    await POST(
      jsonRequest({
        title: 'Dune wishlist',
        author: 'Frank Herbert',
        isbn: '9780441013593',
      }),
    );
    const owned = await createBook('user_test_a', {
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441013593',
      format: 'paperback',
    });
    expect(owned.isWishlist).toBe(false);
  });

  it('seeds ten sample wishlist books only on first access', async () => {
    const first = await GET(new Request('http://localhost/api/wishlist'));
    const firstBody = await first.json();
    expect(firstBody).toHaveLength(10);
    expect(
      firstBody.every((book: { isSample: boolean }) => book.isSample),
    ).toBe(true);
    expect(
      firstBody.every((book: { isWishlist: boolean }) => book.isWishlist),
    ).toBe(true);
    expect(
      firstBody.every(
        (book: { copies: unknown[] }) => book.copies.length === 0,
      ),
    ).toBe(true);

    const second = await GET(new Request('http://localhost/api/wishlist'));
    expect(await second.json()).toHaveLength(10);
  });

  it('replaces the old Pachinko sample for existing users', async () => {
    await createBook(
      'user_test_a',
      {
        title: 'Pachinko',
        author: 'Min Jin Lee',
        isbn: '9781455563927',
      },
      { isSample: true, isWishlist: true },
    );
    await db.insert(catalogPreferences).values({
      userId: 'user_test_a',
      sampleWishlistSeeded: true,
    });

    const res = await GET(new Request('http://localhost/api/wishlist'));
    const body = await res.json();
    expect(
      body.some((book: { isbn: string }) => book.isbn === '9781455563927'),
    ).toBe(false);
    expect(
      body.some((book: { isbn: string }) => book.isbn === '9780062459367'),
    ).toBe(true);
  });

  it('deletes wishlist samples without deleting owned books', async () => {
    await GET(new Request('http://localhost/api/wishlist'));
    const owned = await createBook('user_test_a', {
      title: 'Owned book',
      author: 'An Author',
      format: 'paperback',
    });

    const res = await DELETE_SAMPLES();
    expect(res.status).toBe(200);
    expect((await res.json()).deletedCount).toBe(10);
    expect(await listBooks('user_test_a')).toHaveLength(1);
    expect((await listBooks('user_test_a'))[0].id).toBe(owned.id);
    expect(await listBooks('user_test_a', { wishlist: true })).toEqual([]);
  });
});
