import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildCsv,
  buildExcelWorkbook,
  buildExportRows,
} from '@/lib/csv/export';
import type { BookWithCopies } from '@/lib/books/repository';

function book(overrides: Partial<BookWithCopies> = {}): BookWithCopies {
  return {
    id: 1,
    userId: 'user_1',
    isbn: '9780441013593',
    title: 'Dune',
    author: 'Frank Herbert',
    coverUrl: null,
    publisher: 'Ace Books',
    publishYear: 1965,
    pageCount: 412,
    description: null,
    isSample: false,
    isWishlist: false,
    createdAt: new Date(),
    copies: [
      {
        id: 1,
        bookId: 1,
        format: 'paperback',
        notes: 'Great world-building.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ...overrides,
  };
}

describe('buildCsv', () => {
  it('includes a header row and one row per book', () => {
    const csv = buildCsv([book()], {});
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'Title,Author,ISBN,Collection,Publisher,Year,Format,Pages,Subjects,Notes,Cover URL',
    );
    expect(lines[1]).toBe(
      'Dune,Frank Herbert,9780441013593,Catalog,Ace Books,1965,paperback,412,,Great world-building.,',
    );
  });

  it('joins subject names with a semicolon', () => {
    const csv = buildCsv([book({ id: 42 })], {
      42: ['Science Fiction', 'Classic Fiction'],
    });
    expect(csv).toContain('Science Fiction; Classic Fiction');
  });

  it('falls back to empty strings for missing optional fields', () => {
    const csv = buildCsv(
      [
        book({
          isbn: null,
          publisher: null,
          publishYear: null,
          pageCount: null,
          copies: [],
        }),
      ],
      {},
    );
    const lines = csv.trim().split('\r\n');
    expect(lines[1]).toBe('Dune,Frank Herbert,,Catalog,,,,,,,');
  });
});

describe('buildExportRows', () => {
  it('uses the shared export columns for other document formats', () => {
    expect(buildExportRows([book()], {})[0]).toEqual({
      Title: 'Dune',
      Author: 'Frank Herbert',
      ISBN: '9780441013593',
      Collection: 'Catalog',
      Publisher: 'Ace Books',
      Year: 1965,
      Format: 'paperback',
      Pages: 412,
      Subjects: '',
      Notes: 'Great world-building.',
      'Cover URL': '',
    });
  });
});

describe('buildExcelWorkbook', () => {
  it('creates separate Catalog and Wishlist worksheets', () => {
    const catalogRows = buildExportRows([book()], {});
    const wishlistRows = buildExportRows(
      [book({ id: 2, isWishlist: true, copies: [] })],
      {},
    );
    const workbook = buildExcelWorkbook(
      catalogRows,
      [
        { name: 'Catalog', rows: catalogRows },
        { name: 'Wishlist', rows: wishlistRows },
      ],
      'Book Catalog',
    );

    const parsed = XLSX.read(workbook, { type: 'array' });
    expect(parsed.SheetNames).toEqual(['Catalog', 'Wishlist']);
    expect(parsed.Sheets.Catalog['!merges']).toHaveLength(4);
    const catalogSheet = XLSX.utils.sheet_to_json(parsed.Sheets.Catalog, {
      header: 1,
    });
    expect(catalogSheet.slice(0, 3)).toEqual([
      ['Exported from Anagnosma'],
      ['Version 0.1.0'],
      [expect.stringMatching(/^Export date /)],
    ]);
    expect(catalogSheet).toContainEqual(['Catalog']);
    const singleSheet = XLSX.read(
      buildExcelWorkbook(catalogRows, undefined, 'Book Catalog'),
      { type: 'array' },
    );
    expect(
      XLSX.utils.sheet_to_json(singleSheet.Sheets['Book Catalog'], {
        header: 1,
      }),
    ).toContainEqual(['Book Catalog']);

    const wishlistSheet = XLSX.read(
      buildExcelWorkbook(wishlistRows, undefined, 'Book Wishlist'),
      { type: 'array' },
    );
    expect(wishlistSheet.SheetNames).toEqual(['Book Wishlist']);
    expect(wishlistSheet.Sheets['Book Wishlist']['!merges']).toHaveLength(4);
    expect(
      XLSX.utils.sheet_to_json(wishlistSheet.Sheets['Book Wishlist'], {
        header: 1,
      }),
    ).toContainEqual(['Book Wishlist']);
    expect(catalogSheet).toContainEqual([
      'Dune',
      'Frank Herbert',
      '9780441013593',
      'Catalog',
      'Ace Books',
      1965,
      'paperback',
      412,
      '',
      'Great world-building.',
    ]);
  });
});
