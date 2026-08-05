import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { POST } from '@/app/api/import/route';
import { listBooks } from '@/lib/books/repository';
import {
  listSubjectIdsForBook,
  listSubjectsWithCounts,
} from '@/lib/subjects/repository';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('import API', () => {
  it('imports rows and returns a summary', async () => {
    const res = await POST(
      new Request('http://localhost/api/import', {
        method: 'POST',
        body: JSON.stringify({
          rows: [
            { title: 'Dune', author: 'Frank Herbert', format: 'paperback' },
            { title: '', author: 'Missing Title', format: 'paperback' },
          ],
        }),
      }),
    );
    const body = await res.json();
    expect(body.successCount).toBe(1);
    expect(body.failures).toEqual([{ row: 2, reason: 'title is required' }]);
    const stored = await listBooks('user_test_a');
    expect(stored).toHaveLength(1);
  });

  it('flags an ISBN duplicate against an existing book as a duplicate, not a failure, and does not create a second row', async () => {
    await POST(
      new Request('http://localhost/api/import', {
        method: 'POST',
        body: JSON.stringify({
          rows: [
            {
              title: 'Dune',
              author: 'Frank Herbert',
              format: 'paperback',
              isbn: '9780441013593',
            },
          ],
        }),
      }),
    );

    const res = await POST(
      new Request('http://localhost/api/import', {
        method: 'POST',
        body: JSON.stringify({
          rows: [
            {
              title: 'Dune',
              author: 'Frank Herbert',
              format: 'hardcover',
              isbn: '9780441013593',
            },
          ],
        }),
      }),
    );
    const body = await res.json();
    expect(body.failures).toHaveLength(0);
    expect(body.duplicates).toEqual([
      { row: 1, matchedId: expect.any(Number), reason: 'isbn' },
    ]);
    expect(body.successCount).toBe(1);

    const stored = await listBooks('user_test_a');
    expect(stored).toHaveLength(1);
  });

  it('round-trips Anagnosma export metadata and subjects', async () => {
    const res = await POST(
      new Request('http://localhost/api/import', {
        method: 'POST',
        body: JSON.stringify({
          rows: [
            {
              title: 'Dune',
              author: 'Frank Herbert',
              isbn: '9780441013593',
              publisher: 'Ace Books',
              publishYear: '1965',
              format: 'hardcover',
              pageCount: '412',
              subjects: 'Imported Science Fiction; Imported Classic',
              notes: 'Great world-building.',
              coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
            },
          ],
        }),
      }),
    );

    expect((await res.json()).successCount).toBe(1);
    const [stored] = await listBooks('user_test_a');
    expect(stored).toMatchObject({
      title: 'Dune',
      publisher: 'Ace Books',
      publishYear: 1965,
      pageCount: 412,
      coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
    });
    expect(stored.copies[0]?.format).toBe('hardcover');
    expect(stored.copies[0]?.notes).toBe('Great world-building.');

    const subjects = await listSubjectsWithCounts('user_test_a');
    const importedSubjectIds = subjects
      .filter((subject) => subject.name.startsWith('Imported '))
      .map((subject) => subject.id);
    expect(await listSubjectIdsForBook('user_test_a', stored.id)).toEqual(
      expect.arrayContaining(importedSubjectIds),
    );
  });
});
