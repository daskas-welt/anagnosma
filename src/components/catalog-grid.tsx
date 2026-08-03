'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatLabel } from '@/lib/formats';
import { useSubjectNamesByBook } from '@/lib/use-subject-names-by-book';
import type { BookWithCopies } from '@/lib/books/repository';

export function CatalogGrid({ books, onSelect }: { books: BookWithCopies[]; onSelect: (id: number) => void }) {
  const subjectNamesByBook = useSubjectNamesByBook(true);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {books.map((book) => {
        const subjectNames = subjectNamesByBook?.[book.id] ?? [];
        return (
          <Card key={book.id} className="cursor-pointer" onClick={() => onSelect(book.id)}>
            <CardContent className="p-2">
              {book.coverUrl ? (
                <Image src={book.coverUrl} alt={book.title} width={120} height={180} className="mx-auto h-auto w-full" />
              ) : (
                <div className="flex h-[180px] items-center justify-center bg-muted text-xs text-muted-foreground">
                  No cover
                </div>
              )}
              <p className="mt-2 truncate text-sm font-medium">{book.title}</p>
              <p className="truncate text-xs text-muted-foreground">{book.author}</p>
              <p className="truncate text-xs text-muted-foreground">{book.publisher ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {book.publishYear ?? '—'} &middot; {formatLabel(book.copies[0]?.format)}
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
              <p className="truncate text-xs text-muted-foreground">{book.isbn ?? '—'}</p>
              {book.copies[0]?.notes && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{book.copies[0].notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
