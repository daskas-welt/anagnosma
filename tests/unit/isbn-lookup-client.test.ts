import { describe, it, expect, vi } from 'vitest';
import {
  lookupByIsbn,
  searchGoogleBooks,
  searchOpenLibrary,
} from '@/lib/isbn-lookup/client';

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
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => sampleResponse });
    const result = await lookupByIsbn(
      '9780441013593',
      fetchImpl as unknown as typeof fetch,
    );
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
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await lookupByIsbn(
      '0000000000',
      fetchImpl as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });

  it('returns null on a non-ok response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) });
    const result = await lookupByIsbn(
      '9780441013593',
      fetchImpl as unknown as typeof fetch,
    );
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
    const result = await lookupByIsbn(
      '9780060853976',
      fetchImpl as unknown as typeof fetch,
    );
    expect(result?.author).toBe('Terry Pratchett, Neil Gaiman');
  });

  it('returns null on a network error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network error'));
    const result = await lookupByIsbn(
      '9780441013593',
      fetchImpl as unknown as typeof fetch,
    );
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
            first_sentence: ['A desert planet...'],
            ratings_average: 4.6,
            ratings_count: 1200,
          },
        ],
      }),
    });

    await expect(
      searchOpenLibrary('Dune', fetchImpl as unknown as typeof fetch),
    ).resolves.toEqual([
      {
        isbn: '9780441013593',
        title: 'Dune',
        author: 'Frank Herbert',
        coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
        publisher: 'Ace Books',
        publishYear: 1965,
        pageCount: 412,
        description: 'A desert planet...',
        averageRating: 4.6,
        ratingsCount: 1200,
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://openlibrary.org/search.json?'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

describe('searchGoogleBooks', () => {
  it('maps descriptions from search results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            volumeInfo: {
              title: 'Dune',
              authors: ['Frank Herbert'],
              description: 'A Google Books description',
              industryIdentifiers: [
                { type: 'ISBN_13', identifier: '9780441013593' },
              ],
            },
          },
        ],
      }),
    });

    await expect(
      searchGoogleBooks('Dune', fetchImpl as unknown as typeof fetch),
    ).resolves.toEqual([
      expect.objectContaining({
        title: 'Dune',
        description: 'A Google Books description',
      }),
    ]);
  });
});
