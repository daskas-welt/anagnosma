import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import { POST } from '@/app/api/import/route';
import { listBooks } from '@/lib/books/repository';

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
    const stored = await listBooks();
    expect(stored).toHaveLength(1);
  });
});
