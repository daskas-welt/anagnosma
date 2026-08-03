import { findDuplicate, type ExistingBook } from '@/lib/books/duplicates';

export type ImportRow = { title: string; author: string; format?: string; isbn?: string; [key: string]: string | undefined };
export type ImportResult = {
  successCount: number;
  failures: { row: number; reason: string }[];
  duplicates: { row: number; matchedId: number }[];
};
export type CreateBookFn = (row: ImportRow) => Promise<{ id: number }>;

export async function runImport(
  rows: ImportRow[],
  existing: ExistingBook[],
  createBookFn: CreateBookFn,
): Promise<ImportResult> {
  const result: ImportResult = { successCount: 0, failures: [], duplicates: [] };

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
    const duplicate = findDuplicate({ isbn: row.isbn, title: row.title, author: row.author }, existing);
    try {
      await createBookFn({ ...row, format: row.format || 'paperback' });
      result.successCount++;
      if (duplicate) result.duplicates.push({ row: rowNumber, matchedId: duplicate.id });
    } catch (err) {
      result.failures.push({ row: rowNumber, reason: err instanceof Error ? err.message : 'unknown error' });
    }
  }

  return result;
}
