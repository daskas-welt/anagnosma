'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatLabel } from '@/lib/formats';
import { useSubjectNamesByBook } from '@/lib/use-subject-names-by-book';
import type { BookWithCopies } from '@/lib/books/repository';

export function CatalogGrid({
  books,
  onSelect,
}: {
  books: BookWithCopies[];
  onSelect: (id: number) => void;
}) {
  const subjectNamesByBook = useSubjectNamesByBook(true);
  const sortedBooks = useMemo(
    () => [...books].sort((a, b) => a.title.localeCompare(b.title)),
    [books],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      {sortedBooks.map((book) => {
        const subjectNames = subjectNamesByBook?.[book.id] ?? [];
        return (
          <Card
            key={book.id}
            className="cursor-pointer"
            onClick={() => onSelect(book.id)}
          >
            <CardContent className="flex gap-3 p-2">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  width={100}
                  height={150}
                  className="h-[150px] w-[100px] shrink-0 object-cover"
                />
              ) : (
                <div className="flex h-[150px] w-[100px] shrink-0 items-center justify-center bg-muted text-xs text-muted-foreground">
                  No cover
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{book.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {book.author}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {book.isbn ?? '—'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {book.publisher ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {book.publishYear ?? '—'} &middot;{' '}
                  {formatLabel(book.copies[0]?.format)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {book.pageCount ?? '—'} pages
                </p>
                {subjectNames.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {subjectNames.map((name) => (
                      <Badge key={name} variant="outline">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
                {book.copies[0]?.notes && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {book.copies[0].notes}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
