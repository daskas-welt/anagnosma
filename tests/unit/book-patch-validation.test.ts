import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { PATCH } from '@/app/api/books/[id]/route';

async function patchBook(body: unknown) {
  return PATCH(
    new Request('http://localhost/api/books/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: '1' }) },
  );
}

describe('book PATCH validation', () => {
  it.each([
    ['empty body', {}],
    ['unsupported fields only', { userId: 'user_test_b' }],
  ])('returns 400 for %s', async (_description, body) => {
    const response = await patchBook(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'no book fields to update',
    });
  });
});
