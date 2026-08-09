import { findDuplicate, type ExistingBook } from '@/lib/books/duplicates';
import { isUniqueViolation } from '@/lib/api-helpers';

export type ImportRow = {
  title: string;
  author: string;
  format?: string;
  isbn?: string;
  publisher?: string;
  publishYear?: string;
  pageCount?: string;
  coverUrl?: string;
  subjects?: string;
  notes?: string;
  collection?: string;
  [key: string]: string | undefined;
};
export type ImportCollection = 'catalog' | 'wishlist';
export type ImportResult = {
  successCount: number;
  failures: { row: number; reason: string }[];
  duplicates: {
    row: number;
    matchedId: number;
    reason: 'isbn' | 'title-author';
    collection?: ImportCollection;
  }[];
};
export type CreateBookFn = (
  row: ImportRow,
  collection: ImportCollection,
) => Promise<{ id: number }>;

function parseCollection(
  value: string | undefined,
  fallback: ImportCollection,
): ImportCollection | 'invalid' {
  if (!value?.trim()) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'catalog' || normalized === 'library') return 'catalog';
  if (normalized === 'wishlist' || normalized === 'wish list')
    return 'wishlist';
  return 'invalid';
}

export async function runImport(
  rows: ImportRow[],
  existing: ExistingBook[],
  createBookFn: CreateBookFn,
  defaultCollection: ImportCollection = 'catalog',
): Promise<ImportResult> {
  const result: ImportResult = {
    successCount: 0,
    failures: [],
    duplicates: [],
  };
  // Working copy so duplicates within the same CSV batch (not yet in the DB
  // snapshot passed in) are also detected against each other.
  const working: ExistingBook[] = [...existing];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1;
    const row = rows[i];
    if (!row.title) {
      result.failures.push({ row: rowNumber, reason: 'title is required' });
      continue;
    }
    if (!row.author) {
      result.failures.push({ row: rowNumber, reason: 'author is required' });
      continue;
    }
    const collection = parseCollection(row.collection, defaultCollection);
    if (collection === 'invalid') {
      result.failures.push({
        row: rowNumber,
        reason: 'collection must be Catalog or Wishlist',
      });
      continue;
    }
    // Trim once and reuse everywhere below — findDuplicate, the in-batch
    // working list, and createBookFn must all see the same normalized value,
    // otherwise a leading/trailing space on the ISBN column defeats duplicate
    // detection against already-trimmed existing/working entries and hits
    // the DB unique constraint instead.
    const isbn = row.isbn?.trim() || undefined;
    const duplicate = findDuplicate(
      { isbn, title: row.title, author: row.author },
      working,
    );
    if (duplicate && duplicate.reason === 'isbn') {
      // The book already exists with this ISBN. Never block on a duplicate
      // ISBN — flag it and skip creating a second row for it. This is not
      // an error, so it counts toward successCount (the row was handled
      // successfully, just not as a new create).
      result.duplicates.push({
        row: rowNumber,
        matchedId: duplicate.id,
        reason: duplicate.reason,
        ...(working.find((book) => book.id === duplicate.id)?.collection
          ? {
              collection: working.find((book) => book.id === duplicate.id)
                ?.collection,
            }
          : {}),
      });
      result.successCount++;
      continue;
    }
    try {
      const created = await createBookFn(
        {
          ...row,
          isbn,
          format:
            collection === 'catalog' ? row.format || 'paperback' : undefined,
        },
        collection,
      );
      result.successCount++;
      working.push({
        id: created.id,
        isbn: isbn ?? null,
        title: row.title,
        author: row.author,
        collection,
      });
      if (duplicate)
        result.duplicates.push({
          row: rowNumber,
          matchedId: duplicate.id,
          reason: duplicate.reason,
          ...(working.find((book) => book.id === duplicate.id)?.collection
            ? {
                collection: working.find((book) => book.id === duplicate.id)
                  ?.collection,
              }
            : {}),
        });
    } catch (err) {
      const reason = isUniqueViolation(err)
        ? 'you already have a book with this ISBN'
        : err instanceof Error
          ? err.message
          : 'unknown error';
      result.failures.push({ row: rowNumber, reason });
    }
  }

  return result;
}
