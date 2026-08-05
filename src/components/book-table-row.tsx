import Image from 'next/image';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatLabel } from '@/lib/formats';
import type { BookWithCopies } from '@/lib/books/repository';

export function BookTableRow({
  book,
  onSelect,
  subjectNames,
}: {
  book: BookWithCopies;
  onSelect: (id: number) => void;
  subjectNames?: string[];
}) {
  return (
    <TableRow className="cursor-pointer" onClick={() => onSelect(book.id)}>
      <TableCell>
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.title}
            width={48}
            height={72}
            className="h-[72px] w-[48px] object-cover"
          />
        ) : (
          <div className="flex h-[72px] w-[48px] items-center justify-center bg-muted text-xs text-muted-foreground">
            —
          </div>
        )}
      </TableCell>
      <TableCell>{book.title}</TableCell>
      <TableCell>{book.author}</TableCell>
      <TableCell>{book.isbn ?? '—'}</TableCell>
      <TableCell
        className="max-w-[160px] truncate"
        title={book.publisher ?? undefined}
      >
        {book.publisher ?? '—'}
      </TableCell>
      <TableCell>{book.publishYear ?? '—'}</TableCell>
      <TableCell>{book.pageCount ?? '—'}</TableCell>
      <TableCell>{formatLabel(book.copies[0]?.format)}</TableCell>
      {subjectNames !== undefined && (
        <TableCell className="max-w-xs">
          {subjectNames.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {subjectNames.map((name) => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      )}
      <TableCell className="max-w-xs truncate text-muted-foreground">
        {book.copies[0]?.notes ?? '—'}
      </TableCell>
    </TableRow>
  );
}
