'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BookOpen, BookmarkPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Recommendation } from '@/lib/recommendations';

export function RecommendationCard({
  book,
  saved,
  saving,
  onSave,
}: {
  book: Recommendation;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="flex h-full gap-3 p-2">
        {book.coverUrl && !coverFailed ? (
          <Image
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            width={100}
            height={150}
            className="h-[150px] w-[100px] shrink-0 object-cover"
            unoptimized
            onError={() => setCoverFailed(true)}
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth <= 1) setCoverFailed(true);
            }}
          />
        ) : (
          <div className="flex h-[150px] w-[100px] shrink-0 flex-col justify-between rounded-sm bg-gradient-to-br from-primary/20 via-primary/10 to-muted p-2 text-primary shadow-inner">
            <BookOpen className="size-7 opacity-70" aria-hidden="true" />
            <span className="line-clamp-4 text-xs font-semibold leading-tight">
              {book.title}
            </span>
            <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
              {book.author || 'Unknown author'}
            </span>
          </div>
        )}
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <p className="h-8 shrink-0 overflow-hidden break-words text-sm font-medium leading-4">
            {book.title}
          </p>
          <p className="mt-1 h-4 shrink-0 truncate text-xs leading-4 text-muted-foreground">
            {book.author || 'Unknown author'}
          </p>
          <p className="mt-1 h-4 shrink-0 truncate text-xs leading-4 text-muted-foreground">
            {book.publishYear ?? 'Publication year unavailable'}
          </p>
          {book.isbn && (
            <p className="mt-1 h-4 shrink-0 truncate text-xs leading-4 text-muted-foreground">
              ISBN {book.isbn}
            </p>
          )}
          {book.publisher && (
            <p className="mt-1 h-4 shrink-0 truncate text-xs leading-4 text-muted-foreground">
              {book.publisher}
            </p>
          )}
          {book.pageCount && (
            <p className="mt-1 h-4 shrink-0 truncate text-xs leading-4 text-muted-foreground">
              {book.pageCount} pages
            </p>
          )}
          {book.averageRating !== undefined && (
            <p className="mt-1 h-4 shrink-0 truncate text-xs leading-4 text-amber-600 dark:text-amber-400">
              {`★ ${book.averageRating.toFixed(1)}${
                book.ratingsCount
                  ? ` (${book.ratingsCount.toLocaleString()})`
                  : ''
              }`}
            </p>
          )}
          {book.description && (
            <p className="mt-1 max-h-16 shrink-0 overflow-hidden text-xs leading-4 text-muted-foreground">
              {book.description}
            </p>
          )}
          {book.subjectNames.length > 0 && (
            <div className="mt-2 mb-2 flex max-h-10 flex-wrap gap-1 overflow-hidden">
              {book.subjectNames.map((subject) => (
                <Badge key={subject} variant="outline" className="text-[10px]">
                  {subject}
                </Badge>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant={saved ? 'secondary' : 'outline'}
            className="mt-auto min-h-10 min-w-0 w-full cursor-pointer gap-1 px-2 text-xs disabled:cursor-not-allowed sm:min-h-8"
            disabled={saved || saving}
            onClick={onSave}
            aria-label={
              saved
                ? `${book.title} is in your wishlist`
                : `Add ${book.title} to wishlist`
            }
            title={saved ? 'In wishlist' : 'Add to wishlist'}
          >
            {saved ? (
              <Check className="size-3.5 shrink-0" />
            ) : (
              <BookmarkPlus className="size-3.5 shrink-0" />
            )}
            <span className="truncate">
              {saved ? 'In wishlist' : saving ? 'Saving...' : 'Add to wishlist'}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
