'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddBookModal } from '@/components/add-book-modal';
import { CatalogGrid } from '@/components/catalog-grid';
import { CatalogCarousel } from '@/components/catalog-carousel';
import { CatalogTable } from '@/components/catalog-table';
import { CatalogBySubject } from '@/components/catalog-by-subject';
import { BookDetailSheet } from '@/components/book-detail-sheet';
import { useSubjectNamesByBook } from '@/lib/use-subject-names-by-book';
import {
  buildCsv,
  buildExportRows,
  downloadCsv,
  downloadExcel,
  downloadPdf,
  downloadWord,
} from '@/lib/csv/export';
import type { BookWithCopies } from '@/lib/books/repository';

type ExportFormat = 'csv' | 'xls' | 'docx' | 'pdf';

export function CatalogPage({ wishlist = false }: { wishlist?: boolean }) {
  return (
    <Suspense fallback={null}>
      <CatalogPageInner wishlist={wishlist} />
    </Suspense>
  );
}

function CatalogPageInner({ wishlist }: { wishlist: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<BookWithCopies[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'carousel' | 'list' | 'subject'>(
    'grid',
  );
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(
    searchParams.get('subjectId')
      ? Number(searchParams.get('subjectId'))
      : null,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmingSampleDelete, setConfirmingSampleDelete] = useState(false);
  const [deletingSamples, setDeletingSamples] = useState(false);
  const subjectNamesByBookId = useSubjectNamesByBook(true);
  const collectionName = wishlist ? 'wishlist' : 'catalog';
  const endpoint = wishlist ? '/api/wishlist' : '/api/books';
  const showingSampleBooks =
    !query &&
    subjectId == null &&
    books.length > 0 &&
    books.every((book) => book.isSample);
  async function handleExport(format: ExportFormat) {
    try {
      const rows = buildExportRows(books, subjectNamesByBookId ?? {});
      const date = new Date().toISOString().slice(0, 10);
      const filename = `anagnosma-${wishlist ? 'wishlist' : 'catalog'}-${date}`;
      const exportTitle = wishlist ? 'Book Wishlist' : 'Book Catalog';
      if (format === 'csv')
        downloadCsv(
          `${filename}.csv`,
          buildCsv(books, subjectNamesByBookId ?? {}),
        );
      if (format === 'xls')
        downloadExcel(`${filename}.xlsx`, rows, undefined, exportTitle);
      if (format === 'docx')
        await downloadWord(`${filename}.docx`, rows, undefined, exportTitle);
      if (format === 'pdf')
        downloadPdf(`${filename}.pdf`, rows, undefined, exportTitle);
    } catch {
      toast.error('Could not export the selected books.');
    }
  }

  async function handleDeleteSamples() {
    setDeletingSamples(true);
    try {
      const response = await fetch(
        wishlist ? '/api/wishlist/samples' : '/api/books/samples',
        { method: 'DELETE' },
      );
      if (response.ok) {
        setBooks((current) => current.filter((book) => !book.isSample));
        setConfirmingSampleDelete(false);
      }
    } finally {
      setDeletingSamples(false);
    }
  }

  async function refresh() {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (subjectId) params.set('subjectId', String(subjectId));
    try {
      const res = await fetch(`${endpoint}?${params.toString()}`, {
        cache: 'no-store',
      });
      setBooks(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, query, subjectId]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {wishlist ? 'Wishlist' : 'Catalog'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {wishlist
              ? 'Books you want to read or add to your library.'
              : 'Your personal library, organized your way.'}
          </p>
        </div>
      </header>
      {showingSampleBooks && (
        <div
          role="status"
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"
        >
          <p className="font-medium">
            We&apos;ve added sample books to your {collectionName}
          </p>
          <p className="mt-1 text-muted-foreground">
            These sample books show you how Anagnosma works. Add your own books
            to start building your personal{' '}
            {wishlist ? 'reading list' : 'library'}.
          </p>
          <Button
            variant="outline"
            className="mt-3 h-11 sm:h-8"
            onClick={() => setConfirmingSampleDelete(true)}
          >
            Remove sample books
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Input
          placeholder="Search title or author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full sm:h-8 sm:max-w-sm"
        />
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={books.length === 0}
              render={
                <Button variant="outline" className="h-11 sm:h-8">
                  <Download />
                  Export
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleExport('csv')}>
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport('xls')}>
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport('docx')}>
                  Word
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport('pdf')}>
                  PDF
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/import?collection=${wishlist ? 'wishlist' : 'catalog'}`,
              )
            }
            className="h-11 sm:h-8"
          >
            Import
          </Button>
          <AddBookModal
            books={books}
            wishlist={wishlist}
            onCreated={(book) => setBooks((prev) => [book, ...prev])}
            onChanged={refresh}
          />
        </div>
      </div>
      <Tabs
        value={view}
        onValueChange={(v) =>
          setView(v as 'grid' | 'carousel' | 'list' | 'subject')
        }
      >
        <TabsList className="max-w-full overflow-x-auto overflow-y-hidden sm:max-w-none sm:overflow-visible">
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="carousel">Carousel</TabsTrigger>
          <TabsTrigger className="hidden sm:inline-flex" value="list">
            Table
          </TabsTrigger>
          <TabsTrigger className="hidden sm:inline-flex" value="subject">
            By Subject
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {subjectId != null && (
        <Badge
          variant="outline"
          className="cursor-pointer"
          onClick={() => {
            setSubjectId(null);
            router.replace(wishlist ? '/wishlist' : '/');
          }}
        >
          Filtering by subject &times;
        </Badge>
      )}
      {loading ? (
        <p
          role="status"
          className="flex min-h-[60vh] items-center justify-center text-center text-sm text-muted-foreground"
        >
          Loading your {collectionName}...
        </p>
      ) : view === 'grid' ? (
        <CatalogGrid books={books} onSelect={setSelectedId} />
      ) : view === 'carousel' ? (
        <CatalogCarousel books={books} onSelect={setSelectedId} />
      ) : view === 'list' ? (
        <CatalogTable books={books} onSelect={setSelectedId} paginate />
      ) : view === 'subject' ? (
        <CatalogBySubject books={books} onSelect={setSelectedId} />
      ) : null}
      <BookDetailSheet
        bookId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={refresh}
      />
      <AlertDialog
        open={confirmingSampleDelete}
        onOpenChange={setConfirmingSampleDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove sample books?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the 10 sample books from your{' '}
              {collectionName}. Your personal books will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSamples}>
              Keep them
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingSamples}
              onClick={() => void handleDeleteSamples()}
            >
              {deletingSamples ? 'Removing...' : 'Remove samples'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
