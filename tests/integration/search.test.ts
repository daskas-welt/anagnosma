import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, copies, tags, bookTags } from '@/lib/db/schema';
import { createBook } from '@/lib/books/repository';
import { createTag, assignTag } from '@/lib/tags/repository';
import { GET } from '@/app/api/books/route';

beforeEach(async () => {
  await db.delete(bookTags);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(tags);
});

describe('book search/filter', () => {
  it('filters by title/author text', async () => {
    await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const res = await GET(new Request('http://localhost/api/books?q=dune'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });

  it('filters by status', async () => {
    const dune = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    await db.update(copies).set({ status: 'reading' }).where(eq(copies.bookId, dune.id));
    const res = await GET(new Request('http://localhost/api/books?status=reading'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });

  it('filters by format', async () => {
    await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const res = await GET(new Request('http://localhost/api/books?format=ebook'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Foundation');
  });

  it('filters by tag', async () => {
    const dune = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const tag = await createTag('sci-fi');
    await assignTag(dune.id, tag.id);
    const res = await GET(new Request(`http://localhost/api/books?tagId=${tag.id}`));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });
});
