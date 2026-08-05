import { NextResponse } from 'next/server';
import { runImport, type ImportRow } from '@/lib/csv/import';
import { createBook, listBooks } from '@/lib/books/repository';
import { updateCopy } from '@/lib/copies/repository';
import { assignSubject, getOrCreateSubject } from '@/lib/subjects/repository';
import type { ExistingBook } from '@/lib/books/duplicates';
import { parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } = await parseJsonBody<{ rows?: ImportRow[] }>(request);
  if (error) return error;
  const rows: ImportRow[] = body.rows ?? [];
  const existingBooks = await listBooks(userId);
  const existing: ExistingBook[] = existingBooks.map((b) => ({
    id: b.id,
    isbn: b.isbn,
    title: b.title,
    author: b.author,
  }));
  const result = await runImport(rows, existing, async (row) => {
    const pageCount = row.pageCount ? Number(row.pageCount) : undefined;
    const publishYear = row.publishYear ? Number(row.publishYear) : undefined;
    const book = await createBook(userId, {
      title: row.title,
      author: row.author,
      format: row.format || 'paperback',
      isbn: row.isbn,
      publisher: row.publisher || undefined,
      coverUrl: row.coverUrl || undefined,
      publishYear: publishYear != null && !Number.isNaN(publishYear) ? publishYear : undefined,
      pageCount: pageCount != null && !Number.isNaN(pageCount) ? pageCount : undefined,
    });

    if (row.notes && book.copies[0]) {
      await updateCopy(userId, book.copies[0].id, { notes: row.notes });
    }

    for (const rawName of (row.subjects ?? '').split(';')) {
      const name = rawName.trim();
      if (!name) continue;
      const subject = await getOrCreateSubject(userId, name);
      if (subject) await assignSubject(userId, book.id, subject.id);
    }

    return book;
  });
  return NextResponse.json(result);
}
