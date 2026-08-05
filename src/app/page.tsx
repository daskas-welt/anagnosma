'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

type ExportFormat = 'csv' | 'xlsx' | 'docx' | 'pdf';

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
  const [view, setView] = useState<'grid' | 'carousel' | 'list' | 'subject'>('grid');
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(
    searchParams.get('subjectId') ? Number(searchParams.get('subjectId')) : null,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const subjectNamesByBookId = useSubjectNamesByBook(true);

  async function handleExport() {
    const rows = buildExportRows(books, subjectNamesByBookId ?? {});
    const date = new Date().toISOString().slice(0, 10);
    if (exportFormat === 'csv') downloadCsv(`anagnosma-books-${date}.csv`, buildCsv(books, subjectNamesByBookId ?? {}));
    if (exportFormat === 'xlsx') downloadExcel(`anagnosma-books-${date}.xlsx`, rows);
    if (exportFormat === 'docx') await downloadWord(`anagnosma-books-${date}.docx`, rows);
    if (exportFormat === 'pdf') downloadPdf(`anagnosma-books-${date}.pdf`, rows);
  }

  async function refresh() {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (subjectId) params.set('subjectId', String(subjectId));
    const res = await fetch(`/api/books?${params.toString()}`);
    setBooks(await res.json());
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, subjectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search title or author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Export format"
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
            <option value="docx">Word</option>
            <option value="pdf">PDF</option>
          </select>
          <Button variant="outline" onClick={handleExport} disabled={books.length === 0}>
            Export
          </Button>
          <AddBookModal onCreated={(book) => setBooks((prev) => [book, ...prev])} />
        </div>
      </div>
      <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'carousel' | 'list' | 'subject')}>
        <TabsList>
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
      {view === 'grid' && <CatalogGrid books={books} onSelect={setSelectedId} />}
      {view === 'carousel' && <CatalogCarousel books={books} onSelect={setSelectedId} />}
      {view === 'list' && (
        <CatalogTable books={books} onSelect={setSelectedId} paginate />
      )}
      {view === 'subject' && <CatalogBySubject books={books} onSelect={setSelectedId} />}
      <BookDetailSheet bookId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
    </div>
  );
}
