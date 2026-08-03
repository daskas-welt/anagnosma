import { NextResponse } from 'next/server';
import { runImport, type ImportRow } from '@/lib/csv/import';
import { createBook, listBooks } from '@/lib/books/repository';
import { updateCopy } from '@/lib/copies/repository';
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
  const result = await runImport(rows, existing, async (row) => {
    const pageCount = row.pageCount ? Number(row.pageCount) : undefined;
    const book = await createBook({
      title: row.title,
      author: row.author,
      format: row.format || 'paperback',
      isbn: row.isbn,
      publisher: row.publisher || undefined,
      pageCount: pageCount != null && !Number.isNaN(pageCount) ? pageCount : undefined,
    });

    // notes apply to a specific copy, not the book itself — stamp it on the
    // first copy created alongside this book.
    if (row.notes && book.copies[0]) {
      await updateCopy(book.copies[0].id, { notes: row.notes });
    }

    return book;
  });
  return NextResponse.json(result);
}
