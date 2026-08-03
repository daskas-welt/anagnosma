'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AddBookModal } from '@/components/add-book-modal';
import { CatalogGrid } from '@/components/catalog-grid';
import { CatalogTable } from '@/components/catalog-table';
import { BookDetailSheet } from '@/components/book-detail-sheet';
import type { BookWithCopies } from '@/lib/books/repository';

export default function CatalogPage() {
  const [books, setBooks] = useState<BookWithCopies[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function refresh() {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`/api/books${params}`);
    setBooks(await res.json());
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
      <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'list')}>
        <TabsList>
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
      </Tabs>
      {view === 'grid' ? (
        <CatalogGrid books={books} onSelect={setSelectedId} />
      ) : (
        <CatalogTable books={books} onSelect={setSelectedId} />
      )}
      <BookDetailSheet bookId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
    </div>
  );
}
