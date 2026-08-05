import { describe, it, expect } from 'vitest';
import { parseCsv, mapColumns, HEADER_PRESETS } from '@/lib/csv/parse';

describe('parseCsv', () => {
  it('parses headers and rows', () => {
    const csv = 'Title,Author,ISBN\nDune,Frank Herbert,9780441013593\n';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['Title', 'Author', 'ISBN']);
    expect(rows).toEqual([
      { Title: 'Dune', Author: 'Frank Herbert', ISBN: '9780441013593' },
    ]);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'Title,Author\n"Some Book, Vol. 2",Jane Doe\n';
    const { rows } = parseCsv(csv);
    expect(rows[0].Title).toBe('Some Book, Vol. 2');
  });
});

describe('mapColumns', () => {
  it('remaps arbitrary headers to app field names', () => {
    const rows = [
      { Title: 'Dune', Author: 'Frank Herbert', ISBN: '9780441013593' },
    ];
    const mapped = mapColumns(rows, {
      Title: 'title',
      Author: 'author',
      ISBN: 'isbn',
    });
    expect(mapped).toEqual([
      { title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593' },
    ]);
  });

  it('drops columns with no mapping target', () => {
    const rows = [{ Title: 'Dune', 'My Rating': '5' }];
    const mapped = mapColumns(rows, { Title: 'title' });
    expect(mapped).toEqual([{ title: 'Dune' }]);
  });
});

describe('HEADER_PRESETS', () => {
  it('maps Anagnosma export headers for round-trip imports', () => {
    expect(HEADER_PRESETS.anagnosma).toEqual({
      Title: 'title',
      Author: 'author',
      ISBN: 'isbn',
      Publisher: 'publisher',
      Year: 'publishYear',
      Format: 'format',
      Pages: 'pageCount',
      Subjects: 'subjects',
      Notes: 'notes',
      'Cover URL': 'coverUrl',
    });
  });

  it('has a goodreads preset mapping common export headers', () => {
    expect(HEADER_PRESETS.goodreads).toMatchObject({
      Title: 'title',
      Author: 'author',
      ISBN13: 'isbn',
      'My Review': 'notes',
    });
  });
});
