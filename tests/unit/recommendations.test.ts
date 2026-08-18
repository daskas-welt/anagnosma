import { describe, expect, it } from 'vitest';
import {
  buildRecommendationResponse,
  mergeProviderResults,
  type Recommendation,
} from '@/lib/recommendations';

const subject = (id: number, name: string) => ({ id, name });
const book = (title: string, isbn?: string) => ({
  title,
  author: `${title} author`,
  isbn,
});

describe('buildRecommendationResponse', () => {
  it('excludes existing books, deduplicates results, and limits subject groups', () => {
    const response = buildRecommendationResponse(
      [
        {
          subject: subject(1, 'Fantasy'),
          books: [
            book('Owned', '9780441013593'),
            book('Shared', '9780060853976'),
            ...Array.from({ length: 6 }, (_, index) =>
              book(`Fantasy ${index}`),
            ),
          ],
        },
        {
          subject: subject(2, 'History'),
          books: [book('Shared', '9780060853976'), book('History 1')],
        },
      ],
      [book('Owned', '9780441013593')],
    );

    expect(response.bySubject[0].books).toHaveLength(4);
    expect(response.bySubject[0].books.map((item) => item.title)).not.toContain(
      'Owned',
    );
    expect(response.all.map((item) => item.title)).toEqual([
      'Shared',
      'Fantasy 0',
      'History 1',
      'Fantasy 1',
      'Fantasy 2',
      'Fantasy 3',
      'Fantasy 4',
      'Fantasy 5',
    ]);
    expect(response.all.filter((item) => item.title === 'Shared')).toHaveLength(
      1,
    );
    expect(response.all.find((item) => item.title === 'Shared')).toMatchObject({
      subjectIds: [1, 2],
      subjectNames: ['Fantasy', 'History'],
    });
  });

  it('uses fallback results when there are no subjects', () => {
    const fallback = book('A fallback book') as Recommendation;
    const response = buildRecommendationResponse([], [], [fallback]);

    expect(response.all).toHaveLength(1);
    expect(response.all[0]).toMatchObject({
      title: 'A fallback book',
      subjectIds: [],
      subjectNames: [],
    });
    expect(response.bySubject).toEqual([]);
  });

  it('rotates the selected window when more than 12 books are available', () => {
    const fallback = Array.from({ length: 15 }, (_, index) =>
      book(`Fallback ${index}`),
    );
    const firstPage = buildRecommendationResponse([], [], fallback, 1);
    const secondPage = buildRecommendationResponse([], [], fallback, 2);

    expect(firstPage.all).toHaveLength(12);
    expect(secondPage.all).toHaveLength(12);
    expect(secondPage.all[0].title).not.toBe(firstPage.all[0].title);
  });
});

describe('mergeProviderResults', () => {
  it('prefers Google Books metadata and fills missing fields from Open Library', () => {
    const results = mergeProviderResults(
      [
        {
          title: 'Dune',
          author: 'Frank Herbert',
          isbn: '9780441013593',
          description: 'Google description',
          publishYear: 1965,
        },
      ],
      [
        {
          title: 'Dune',
          author: 'Frank Herbert',
          isbn: '9780441013593',
          coverUrl: 'https://covers.openlibrary.org/b/id/123-M.jpg',
          description: 'Open Library description',
          pageCount: 412,
        },
      ],
    );

    expect(results).toEqual([
      {
        title: 'Dune',
        author: 'Frank Herbert',
        isbn: '9780441013593',
        description: 'Google description',
        publishYear: 1965,
        coverUrl: 'https://covers.openlibrary.org/b/id/123-M.jpg',
        pageCount: 412,
      },
    ]);
  });

  it('ranks highly rated popular books before unrated results', () => {
    const results = mergeProviderResults(
      [
        {
          title: 'Popular',
          author: 'Author',
          averageRating: 4.6,
          ratingsCount: 1200,
        },
        { title: 'Unrated', author: 'Author' },
      ],
      [
        {
          title: 'Highly Rated',
          author: 'Author',
          averageRating: 4.9,
          ratingsCount: 120,
        },
      ],
    );

    expect(results.map((book) => book.title)).toEqual([
      'Highly Rated',
      'Popular',
      'Unrated',
    ]);
  });
});
