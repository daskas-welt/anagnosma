'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookTableRow } from '@/components/book-table-row';
import { formatLabel } from '@/lib/formats';
import { useSubjectNamesByBook } from '@/lib/use-subject-names-by-book';
import type { BookWithCopies } from '@/lib/books/repository';

type SortKey = 'title' | 'author' | 'publisher' | 'publishYear' | 'format';
type SortDir = 'asc' | 'desc';

const SORT_ACCESSORS: Record<SortKey, (book: BookWithCopies) => string | number | null> = {
  title: (book) => book.title,
  author: (book) => book.author,
  publisher: (book) => book.publisher,
  publishYear: (book) => book.publishYear,
  format: (book) => formatLabel(book.copies[0]?.format),
};

function SortableHead({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (column: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === column;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <Icon className={active ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 opacity-40'} />
      </button>
    </TableHead>
  );
}

export function CatalogTable({
  books,
  onSelect,
  showSubjectsColumn = true,
  subjectNamesByBookId,
}: {
  books: BookWithCopies[];
  onSelect: (id: number) => void;
  showSubjectsColumn?: boolean;
  subjectNamesByBookId?: Record<number, string[]>;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fetchedMap = useSubjectNamesByBook(showSubjectsColumn && !subjectNamesByBookId);
  const resolvedMap = subjectNamesByBookId ?? fetchedMap;

  function handleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column);
      setSortDir('asc');
    }
  }

  const sortedBooks = useMemo(() => {
    if (!sortKey) return books;
    const accessor = SORT_ACCESSORS[sortKey];
    const sorted = [...books].sort((a, b) => {
      const valueA = accessor(a);
      const valueB = accessor(b);
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      if (typeof valueA === 'number' && typeof valueB === 'number') return valueA - valueB;
      return String(valueA).localeCompare(String(valueB));
    });
    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [books, sortKey, sortDir]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[96px]"></TableHead>
          <SortableHead label="Title" column="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[20%]" />
          <SortableHead label="Author" column="author" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[13%]" />
          <SortableHead label="Publisher" column="publisher" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[11%]" />
          <SortableHead label="Year" column="publishYear" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[90px]" />
          <SortableHead label="Format" column="format" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[110px]" />
          {showSubjectsColumn && <TableHead className="w-[16%]">Subject(s)</TableHead>}
          <TableHead className="w-[130px]">ISBN</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedBooks.map((book) => (
          <BookTableRow
            key={book.id}
            book={book}
            onSelect={onSelect}
            subjectNames={showSubjectsColumn ? resolvedMap?.[book.id] ?? [] : undefined}
          />
        ))}
      </TableBody>
    </Table>
  );
}
