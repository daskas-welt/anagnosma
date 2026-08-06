'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { formatLabel } from '@/lib/formats';
import { useSubjectNamesByBook } from '@/lib/use-subject-names-by-book';
import type { BookWithCopies } from '@/lib/books/repository';

export function CatalogCarousel({
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
    <Carousel opts={{ align: 'start' }} className="mx-auto max-w-5xl">
      <CarouselContent>
        {sortedBooks.map((book) => {
          const subjectNames = subjectNamesByBook?.[book.id] ?? [];
          return (
            <CarouselItem key={book.id}>
              <Card
                className="cursor-pointer"
                onClick={() => onSelect(book.id)}
              >
                <CardContent className="flex flex-col items-center gap-4 p-4 sm:gap-6 sm:p-6 sm:flex-row sm:items-start sm:justify-center">
                  {book.coverUrl ? (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      width={420}
                      height={630}
                      className="h-[240px] w-[160px] shrink-0 object-cover sm:aspect-[2/3] sm:h-auto sm:max-h-[630px] sm:w-full sm:max-w-[420px]"
                    />
                  ) : (
                    <div className="flex h-[240px] w-[160px] shrink-0 items-center justify-center bg-muted text-sm text-muted-foreground sm:aspect-[2/3] sm:h-auto sm:max-h-[630px] sm:w-full sm:max-w-[420px]">
                      No cover
                    </div>
                  )}
                  <div className="min-w-0 space-y-3 text-center sm:max-w-sm sm:text-left">
                    <div>
                      <p className="text-xl font-semibold">{book.title}</p>
                      <p className="text-muted-foreground">{book.author}</p>
                    </div>
                    <dl className="grid max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">ISBN</dt>
                      <dd>{book.isbn ?? '—'}</dd>
                      <dt className="text-muted-foreground">Publisher</dt>
                      <dd>{book.publisher ?? '—'}</dd>
                      <dt className="text-muted-foreground">Year</dt>
                      <dd>{book.publishYear ?? '—'}</dd>
                      <dt className="text-muted-foreground">Pages</dt>
                      <dd>{book.pageCount ?? '—'}</dd>
                      <dt className="text-muted-foreground">Format</dt>
                      <dd>{formatLabel(book.copies[0]?.format)}</dd>
                    </dl>
                    {subjectNames.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 sm:justify-start">
                        {subjectNames.map((name) => (
                          <Badge key={name} variant="outline">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {book.copies[0]?.notes && (
                      <p className="text-sm text-muted-foreground">
                        {book.copies[0].notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="left-2 size-11 sm:-left-12 sm:size-7" />
      <CarouselNext className="right-2 size-11 sm:-right-12 sm:size-7" />
    </Carousel>
  );
}
