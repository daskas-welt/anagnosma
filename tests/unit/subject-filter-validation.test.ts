import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listBooksMock } = vi.hoisted(() => ({
  listBooksMock: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

vi.mock('@/lib/books/repository', () => ({
  createBook: vi.fn(),
  listBooks: listBooksMock,
}));

vi.mock('@/lib/books/sample-catalog', () => ({
  seedSampleCatalog: vi.fn(),
}));

vi.mock('@/lib/books/sample-wishlist', () => ({
  seedSampleWishlist: vi.fn(),
}));

import { GET as getBooks } from '@/app/api/books/route';
import { GET as getWishlist } from '@/app/api/wishlist/route';

const invalidSubjectIds = ['abc', '0', '-1', '', '2147483648'];

describe('subject filter validation', () => {
  beforeEach(() => {
    listBooksMock.mockClear();
  });

  it.each(invalidSubjectIds)(
    'rejects invalid subjectId=%j on the books endpoint',
    async (subjectId) => {
      const response = await getBooks(
        new Request(`http://localhost/api/books?subjectId=${subjectId}`),
      );

      expect(response.status).toBe(400);
      expect(listBooksMock).not.toHaveBeenCalled();
    },
  );

  it.each(invalidSubjectIds)(
    'rejects invalid subjectId=%j on the wishlist endpoint',
    async (subjectId) => {
      const response = await getWishlist(
        new Request(`http://localhost/api/wishlist?subjectId=${subjectId}`),
      );

      expect(response.status).toBe(400);
      expect(listBooksMock).not.toHaveBeenCalled();
    },
  );

  it('passes valid positive subject IDs to both list endpoints', async () => {
    const booksResponse = await getBooks(
      new Request('http://localhost/api/books?subjectId=3'),
    );
    const wishlistResponse = await getWishlist(
      new Request('http://localhost/api/wishlist?subjectId=3'),
    );

    expect(booksResponse.status).toBe(200);
    expect(wishlistResponse.status).toBe(200);
    expect(listBooksMock).toHaveBeenNthCalledWith(1, 'user_test_a', {
      q: undefined,
      format: undefined,
      subjectId: 3,
      isbn: undefined,
    });
    expect(listBooksMock).toHaveBeenNthCalledWith(2, 'user_test_a', {
      q: undefined,
      subjectId: 3,
      isbn: undefined,
      wishlist: true,
    });
  });
});
