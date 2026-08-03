// tests/integration/tags-api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, tags, bookTags } from '@/lib/db/schema';
import { createBook } from '@/lib/books/repository';
import { GET, POST } from '@/app/api/tags/route';
import { PATCH, DELETE } from '@/app/api/tags/[id]/route';
import { POST as ASSIGN, DELETE as UNASSIGN } from '@/app/api/books/[id]/tags/route';

beforeEach(async () => {
  await db.delete(bookTags);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(tags);
});

describe('tags API', () => {
  it('POST creates a tag', async () => {
    const res = await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }));
    expect(res.status).toBe(201);
    expect((await res.json()).name).toBe('sci-fi');
  });

  it('assigns a tag to a book and counts it in GET /api/tags', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const tag = await (await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/tags`, { method: 'POST', body: JSON.stringify({ tagId: tag.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const list = await (await GET()).json();
    expect(list.find((t: any) => t.id === tag.id).bookCount).toBe(1);
  });

  it('removes a tag from a book', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const tag = await (await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/tags`, { method: 'POST', body: JSON.stringify({ tagId: tag.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    await UNASSIGN(
      new Request(`http://localhost/api/books/${book.id}/tags?tagId=${tag.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const list = await (await GET()).json();
    expect(list.find((t: any) => t.id === tag.id).bookCount).toBe(0);
  });

  it('renames a tag', async () => {
    const tag = await (await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await PATCH(
      new Request(`http://localhost/api/tags/${tag.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'science-fiction' }) }),
      { params: Promise.resolve({ id: String(tag.id) }) },
    );
    expect((await res.json()).name).toBe('science-fiction');
  });

  it('deletes a tag', async () => {
    const tag = await (await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await DELETE(new Request(`http://localhost/api/tags/${tag.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(tag.id) }),
    });
    expect(res.status).toBe(204);
  });
});
