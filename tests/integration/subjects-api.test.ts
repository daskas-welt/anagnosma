// tests/integration/subjects-api.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, subjects, bookSubjects } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { createBook } from '@/lib/books/repository';
import { GET, POST } from '@/app/api/subjects/route';
import { PATCH, DELETE } from '@/app/api/subjects/[id]/route';
import { GET as BOOK_SUBJECTS, POST as ASSIGN, DELETE as UNASSIGN } from '@/app/api/books/[id]/subjects/route';

type SubjectWithCount = { id: number; name: string; bookCount: number };

beforeEach(async () => {
  await db.delete(bookSubjects);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(subjects);
});

describe('subjects API', () => {
  it('POST creates a subject', async () => {
    const res = await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }));
    expect(res.status).toBe(201);
    expect((await res.json()).name).toBe('sci-fi');
  });

  it('assigns a subject to a book and counts it in GET /api/subjects', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const list: SubjectWithCount[] = await (await GET()).json();
    expect(list.find((s) => s.id === subject.id)?.bookCount).toBe(1);
  });

  it('a book can be assigned more than one subject', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const scifi = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'Science Fiction' }) }))).json();
    const fantasy = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'Fantasy' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: scifi.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: fantasy.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const assigned = await (
      await BOOK_SUBJECTS(new Request(`http://localhost/api/books/${book.id}/subjects`), { params: Promise.resolve({ id: String(book.id) }) })
    ).json();
    expect(assigned.sort()).toEqual([scifi.id, fantasy.id].sort());
  });

  it('GET /api/books/:id/subjects returns assigned subject ids so the UI can distinguish assigned vs unassigned', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const before = await (
      await BOOK_SUBJECTS(new Request(`http://localhost/api/books/${book.id}/subjects`), { params: Promise.resolve({ id: String(book.id) }) })
    ).json();
    expect(before).toEqual([]);

    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const after = await (
      await BOOK_SUBJECTS(new Request(`http://localhost/api/books/${book.id}/subjects`), { params: Promise.resolve({ id: String(book.id) }) })
    ).json();
    expect(after).toEqual([subject.id]);
  });

  it('removes a subject from a book', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    await UNASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects?subjectId=${subject.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const list: SubjectWithCount[] = await (await GET()).json();
    expect(list.find((s) => s.id === subject.id)?.bookCount).toBe(0);
  });

  it('renames a subject', async () => {
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await PATCH(
      new Request(`http://localhost/api/subjects/${subject.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'science-fiction' }) }),
      { params: Promise.resolve({ id: String(subject.id) }) },
    );
    expect((await res.json()).name).toBe('science-fiction');
  });

  it('deletes a subject', async () => {
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await DELETE(new Request(`http://localhost/api/subjects/${subject.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(subject.id) }),
    });
    expect(res.status).toBe(204);
  });

  it('cannot assign another user\'s book to your own subject', async () => {
    const otherUsersBook = await createBook('user_test_b', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await ASSIGN(
      new Request(`http://localhost/api/books/${otherUsersBook.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) }),
      { params: Promise.resolve({ id: String(otherUsersBook.id) }) },
    );
    expect(res.status).toBe(404);
  });
});
