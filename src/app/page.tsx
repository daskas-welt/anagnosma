'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogPageInner />
    </Suspense>
  );
}

function CatalogPageInner() {
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
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [confirmingSampleDelete, setConfirmingSampleDelete] = useState(false);
  const [deletingSamples, setDeletingSamples] = useState(false);
  const subjectNamesByBookId = useSubjectNamesByBook(true);
  const showingSampleCatalog =
    !query &&
    subjectId == null &&
    books.length > 0 &&
    books.every((book) => book.isSample);

  async function handleExport() {
    const rows = buildExportRows(books, subjectNamesByBookId ?? {});
    const date = new Date().toISOString().slice(0, 10);
    if (exportFormat === 'csv')
      downloadCsv(
        `anagnosma-books-${date}.csv`,
        buildCsv(books, subjectNamesByBookId ?? {}),
      );
    if (exportFormat === 'xls')
      downloadExcel(`anagnosma-books-${date}.xls`, rows);
    if (exportFormat === 'docx')
      await downloadWord(`anagnosma-books-${date}.docx`, rows);
    if (exportFormat === 'pdf')
      downloadPdf(`anagnosma-books-${date}.pdf`, rows);
  }

  async function handleDeleteSamples() {
    setDeletingSamples(true);
    try {
      const response = await fetch('/api/books/samples', { method: 'DELETE' });
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
      const res = await fetch(`/api/books?${params.toString()}`, {
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
  }, [query, subjectId]);

  return (
    <div className="space-y-4">
      {showingSampleCatalog && (
        <div
          role="status"
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"
        >
          <p className="font-medium">
            We&apos;ve added sample books to your catalog
          </p>
          <p className="mt-1 text-muted-foreground">
            These sample books show you how Anagnosma works. Add your own books
            to start building your personal library.
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
          <select
            aria-label="Export format"
            value={exportFormat}
            onChange={(event) =>
              setExportFormat(event.target.value as ExportFormat)
            }
            className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm sm:h-8 sm:flex-none"
          >
            <option value="csv">CSV</option>
            <option value="xls">Excel</option>
            <option value="docx">Word</option>
            <option value="pdf">PDF</option>
          </select>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={books.length === 0}
            className="h-11 sm:h-8"
          >
            Export
          </Button>
          <AddBookModal
            onCreated={(book) => setBooks((prev) => [book, ...prev])}
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
          <TabsTrigger value="list">Table</TabsTrigger>
          <TabsTrigger value="subject">By Subject</TabsTrigger>
        </TabsList>
      </Tabs>
      {subjectId != null && (
        <Badge
          variant="outline"
          className="cursor-pointer"
          onClick={() => {
            setSubjectId(null);
            router.replace('/');
          }}
        >
          Filtering by subject &times;
        </Badge>
      )}
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Loading your catalog...
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
              This permanently removes the 10 sample books and their copies.
              Your personal books will not be affected.
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
