'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookTableRow } from '@/components/book-table-row';
import { formatLabel } from '@/lib/formats';
import { useSubjectNamesByBook } from '@/lib/use-subject-names-by-book';
import type { BookWithCopies } from '@/lib/books/repository';

type SortKey = 'title' | 'author' | 'publisher' | 'publishYear' | 'format' | 'subjects';
type SortDir = 'asc' | 'desc';
type FilterKey = SortKey;

const PAGE_SIZE = 10;

const SORT_ACCESSORS: Record<Exclude<SortKey, 'subjects'>, (book: BookWithCopies) => string | number | null> = {
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

function FilterHead({
  column,
  value,
  onChange,
  className,
}: {
  column: FilterKey;
  value: string;
  onChange: (column: FilterKey, value: string) => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <Input
        value={value}
        onChange={(e) => onChange(column, e.target.value)}
        placeholder="Filter..."
        className="h-7"
      />
    </TableHead>
  );
}

export function CatalogTable({
  books,
  onSelect,
  showSubjectsColumn = true,
  subjectNamesByBookId,
  paginate = false,
}: {
  books: BookWithCopies[];
  onSelect: (id: number) => void;
  showSubjectsColumn?: boolean;
  subjectNamesByBookId?: Record<number, string[]>;
  paginate?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [columnFilters, setColumnFilters] = useState<Partial<Record<FilterKey, string>>>({});
  const [page, setPage] = useState(1);

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

  function handleFilterChange(column: FilterKey, value: string) {
    setColumnFilters((prev) => ({ ...prev, [column]: value }));
  }

  function subjectsText(book: BookWithCopies): string {
    return resolvedMap?.[book.id]?.length ? resolvedMap[book.id].join(', ') : '';
  }

  const sortedBooks = useMemo(() => {
    if (!sortKey) return books;
    const accessor: (book: BookWithCopies) => string | number | null =
      sortKey === 'subjects' ? subjectsText : SORT_ACCESSORS[sortKey];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, sortKey, sortDir, resolvedMap]);

  const filteredBooks = useMemo(() => {
    const activeFilters = (Object.entries(columnFilters) as [FilterKey, string][]).filter(([, v]) => v.trim());
    if (activeFilters.length === 0) return sortedBooks;
    return sortedBooks.filter((book) =>
      activeFilters.every(([column, value]) => {
        const raw = column === 'subjects' ? subjectsText(book) : SORT_ACCESSORS[column](book);
        return String(raw ?? '').toLowerCase().includes(value.trim().toLowerCase());
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedBooks, columnFilters, resolvedMap]);

  // Column filters/sort/an updated book list can all shrink the result set
  // out from under the current page — reset to page 1 whenever any of them
  // change so the user never lands on a blank out-of-range page. Adjusted
  // during render (React's recommended pattern for this) rather than in an
  // effect, since an effect-based reset costs an extra, avoidable render.
  const [prevResetDeps, setPrevResetDeps] = useState({ books, sortKey, sortDir, columnFilters });
  if (
    prevResetDeps.books !== books ||
    prevResetDeps.sortKey !== sortKey ||
    prevResetDeps.sortDir !== sortDir ||
    prevResetDeps.columnFilters !== columnFilters
  ) {
    setPrevResetDeps({ books, sortKey, sortDir, columnFilters });
    setPage(1);
  }

  const totalPages = paginate ? Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, totalPages);
  const pageBooks = paginate
    ? filteredBooks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : filteredBooks;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[64px]"></TableHead>
            <SortableHead label="Title" column="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[20%]" />
            <SortableHead label="Author" column="author" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[13%]" />
            <TableHead className="w-[130px]">ISBN</TableHead>
            <SortableHead label="Publisher" column="publisher" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[11%]" />
            <SortableHead label="Year" column="publishYear" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[90px]" />
            <SortableHead label="Format" column="format" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[110px]" />
            {showSubjectsColumn && (
              <SortableHead label="Subject(s)" column="subjects" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[16%]" />
            )}
            <TableHead>Notes</TableHead>
          </TableRow>
          <TableRow>
            <TableHead></TableHead>
            <FilterHead column="title" value={columnFilters.title ?? ''} onChange={handleFilterChange} />
            <FilterHead column="author" value={columnFilters.author ?? ''} onChange={handleFilterChange} />
            <TableHead></TableHead>
            <FilterHead column="publisher" value={columnFilters.publisher ?? ''} onChange={handleFilterChange} />
            <FilterHead column="publishYear" value={columnFilters.publishYear ?? ''} onChange={handleFilterChange} />
            <FilterHead column="format" value={columnFilters.format ?? ''} onChange={handleFilterChange} />
            {showSubjectsColumn && (
              <FilterHead column="subjects" value={columnFilters.subjects ?? ''} onChange={handleFilterChange} />
            )}
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageBooks.map((book) => (
            <BookTableRow
              key={book.id}
              book={book}
              onSelect={onSelect}
              subjectNames={showSubjectsColumn ? resolvedMap?.[book.id] ?? [] : undefined}
            />
          ))}
        </TableBody>
      </Table>
      {paginate && filteredBooks.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredBooks.length} book{filteredBooks.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
