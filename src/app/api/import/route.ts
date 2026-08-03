import { NextResponse } from 'next/server';
import { runImport, type ImportRow } from '@/lib/csv/import';
import { createBook, listBooks } from '@/lib/books/repository';
import type { ExistingBook } from '@/lib/books/duplicates';

export async function POST(request: Request) {
  const body = await request.json();
  const rows: ImportRow[] = body.rows ?? [];
  const existingBooks = await listBooks();
  const existing: ExistingBook[] = existingBooks.map((b) => ({
    id: b.id,
    isbn: b.isbn,
    title: b.title,
    author: b.author,
  }));
  const result = await runImport(rows, existing, (row) =>
    createBook({
      title: row.title,
      author: row.author,
      format: row.format || 'paperback',
      isbn: row.isbn,
    }),
  );
  return NextResponse.json(result);
}
