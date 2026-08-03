import Papa from 'papaparse';

export function parseCsv(fileContents: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(fileContents, { header: true, skipEmptyLines: true });
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

export function mapColumns(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
): Record<string, string>[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [sourceHeader, targetField] of Object.entries(mapping)) {
      if (row[sourceHeader] !== undefined) mapped[targetField] = row[sourceHeader];
    }
    return mapped;
  });
}

export const HEADER_PRESETS: Record<string, Record<string, string>> = {
  goodreads: {
    Title: 'title',
    Author: 'author',
    ISBN13: 'isbn',
    'Exclusive Shelf': 'status',
    'My Rating': 'rating',
    'My Review': 'notes',
    Publisher: 'publisher',
    'Number of Pages': 'pageCount',
  },
  librarything: {
    Title: 'title',
    'Primary Author': 'author',
    ISBN: 'isbn',
    'Collections': 'status',
    Rating: 'rating',
    Review: 'notes',
    Publisher: 'publisher',
    Pages: 'pageCount',
  },
};
