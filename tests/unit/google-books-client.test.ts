import { describe, it, expect, vi } from 'vitest';
import { lookupByIsbn } from '@/lib/google-books/client';

const sampleResponse = {
  totalItems: 1,
  items: [
    {
      volumeInfo: {
        title: 'Dune',
        authors: ['Frank Herbert'],
        publisher: 'Ace Books',
        publishedDate: '1990-09-01',
        pageCount: 412,
        description: 'A desert planet...',
        imageLinks: { thumbnail: 'http://books.google.com/dune.jpg' },
      },
    },
  ],
};

describe('lookupByIsbn', () => {
  it('parses a successful Google Books response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => sampleResponse });
    const result = await lookupByIsbn('9780441013593', fetchImpl as any);
    expect(result).toEqual({
      isbn: '9780441013593',
      title: 'Dune',
      author: 'Frank Herbert',
      coverUrl: 'http://books.google.com/dune.jpg',
      publisher: 'Ace Books',
      publishYear: 1990,
      pageCount: 412,
      description: 'A desert planet...',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9780441013593',
    );
  });

  it('returns null when no items are found', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ totalItems: 0 }) });
    const result = await lookupByIsbn('0000000000', fetchImpl as any);
    expect(result).toBeNull();
  });

  it('returns null on a non-ok response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const result = await lookupByIsbn('9780441013593', fetchImpl as any);
    expect(result).toBeNull();
  });

  it('joins multiple authors with a comma', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalItems: 1,
        items: [{ volumeInfo: { title: 'Good Omens', authors: ['Terry Pratchett', 'Neil Gaiman'] } }],
      }),
    });
    const result = await lookupByIsbn('9780060853976', fetchImpl as any);
    expect(result?.author).toBe('Terry Pratchett, Neil Gaiman');
  });

  it('returns null on network error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network error'));
    const result = await lookupByIsbn('9780441013593', fetchImpl as any);
    expect(result).toBeNull();
  });
});
