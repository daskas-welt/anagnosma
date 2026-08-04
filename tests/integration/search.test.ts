import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, subjects, bookSubjects } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { createBook } from '@/lib/books/repository';
import { createSubject, assignSubject } from '@/lib/subjects/repository';
import { GET } from '@/app/api/books/route';

const USER_ID = 'user_test_a';

beforeEach(async () => {
  await db.delete(bookSubjects);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(subjects);
});

describe('book search/filter', () => {
  it('filters by title/author text', async () => {
    await createBook(USER_ID, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook(USER_ID, { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const res = await GET(new Request('http://localhost/api/books?q=dune'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });

  it('filters by format', async () => {
    await createBook(USER_ID, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook(USER_ID, { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const res = await GET(new Request('http://localhost/api/books?format=ebook'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Foundation');
  });

  it('filters by subject', async () => {
    const dune = await createBook(USER_ID, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook(USER_ID, { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const subject = await createSubject(USER_ID, 'sci-fi');
    await assignSubject(USER_ID, dune.id, subject.id);
    const res = await GET(new Request(`http://localhost/api/books?subjectId=${subject.id}`));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });
});
