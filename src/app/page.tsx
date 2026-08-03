'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AddBookModal } from '@/components/add-book-modal';
import { CatalogFilters } from '@/components/catalog-filters';
import { CatalogGrid } from '@/components/catalog-grid';
import { CatalogTable } from '@/components/catalog-table';
import { BookDetailSheet } from '@/components/book-detail-sheet';
import type { BookWithCopies } from '@/lib/books/repository';

export default function CatalogPage() {
  const [books, setBooks] = useState<BookWithCopies[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [format, setFormat] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function refresh() {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    if (format !== 'all') params.set('format', format);
    const res = await fetch(`/api/books?${params.toString()}`);
    setBooks(await res.json());
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, format]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search title or author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <AddBookModal onCreated={(book) => setBooks((prev) => [book, ...prev])} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'list')}>
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </Tabs>
        <CatalogFilters
          status={status}
          format={format}
          onStatusChange={setStatus}
          onFormatChange={setFormat}
        />
      </div>
      {view === 'grid' ? (
        <CatalogGrid books={books} onSelect={setSelectedId} />
      ) : (
        <CatalogTable books={books} onSelect={setSelectedId} />
      )}
      <BookDetailSheet bookId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
    </div>
  );
}
