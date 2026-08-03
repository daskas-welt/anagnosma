import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import type { BookWithCopies } from '@/lib/books/repository';

export function CatalogGrid({ books, onSelect }: { books: BookWithCopies[]; onSelect: (id: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {books.map((book) => (
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
            <p className="text-xs text-muted-foreground">{book.copies[0]?.status}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
