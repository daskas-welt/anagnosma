import { describe, it, expect, vi } from 'vitest';
import { lookupByIsbn, searchOpenLibrary } from '@/lib/isbn-lookup/client';

const sampleResponse = {
  'ISBN:9780441013593': {
    title: 'Dune',
    authors: [{ name: 'Frank Herbert' }],
    publishers: [{ name: 'Ace Books' }],
    publish_date: 'September 1990',
    number_of_pages: 412,
    cover: { medium: 'https://covers.openlibrary.org/b/id/12345-M.jpg' },
    notes: 'A desert planet...',
  },
};

describe('lookupByIsbn', () => {
  it('parses a successful Open Library response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => sampleResponse });
    const result = await lookupByIsbn('9780441013593', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({
      isbn: '9780441013593',
      title: 'Dune',
      author: 'Frank Herbert',
      coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
      publisher: 'Ace Books',
      publishYear: 1990,
      pageCount: 412,
      description: 'A desert planet...',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://openlibrary.org/api/books?bibkeys=ISBN:9780441013593&format=json&jscmd=data',
    );
  });

  it('returns null when the ISBN key is absent from the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await lookupByIsbn('0000000000', fetchImpl as unknown as typeof fetch);
    expect(result).toBeNull();
  });

  it('returns null on a non-ok response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const result = await lookupByIsbn('9780441013593', fetchImpl as unknown as typeof fetch);
    expect(result).toBeNull();
  });

  it('joins multiple authors with a comma', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'ISBN:9780060853976': {
          title: 'Good Omens',
          authors: [{ name: 'Terry Pratchett' }, { name: 'Neil Gaiman' }],
        },
      }),
    });
    const result = await lookupByIsbn('9780060853976', fetchImpl as unknown as typeof fetch);
    expect(result?.author).toBe('Terry Pratchett, Neil Gaiman');
  });

  it('returns null on a network error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network error'));
    const result = await lookupByIsbn('9780441013593', fetchImpl as unknown as typeof fetch);
    expect(result).toBeNull();
  });
});

describe('searchOpenLibrary', () => {
  it('maps search results into editable book metadata', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [
          {
            title: 'Dune',
            author_name: ['Frank Herbert'],
            isbn: ['9780441013593'],
            publisher: ['Ace Books'],
            first_publish_year: 1965,
            number_of_pages_median: 412,
            cover_i: 12345,
          },
        ],
      }),
    });

    await expect(searchOpenLibrary('Dune', fetchImpl as unknown as typeof fetch)).resolves.toEqual([
      {
        isbn: '9780441013593',
        title: 'Dune',
        author: 'Frank Herbert',
        coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
        publisher: 'Ace Books',
        publishYear: 1965,
        pageCount: 412,
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('https://openlibrary.org/search.json?'));
  });
});
