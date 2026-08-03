'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AddBookModal } from '@/components/add-book-modal';
import { CatalogFilters } from '@/components/catalog-filters';
import { CatalogGrid } from '@/components/catalog-grid';
import { CatalogTable } from '@/components/catalog-table';
import { CatalogBySubject } from '@/components/catalog-by-subject';
import { BookDetailSheet } from '@/components/book-detail-sheet';
import type { BookWithCopies } from '@/lib/books/repository';

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
  const [view, setView] = useState<'grid' | 'list' | 'subject'>('grid');
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState('all');
  const [subjectId, setSubjectId] = useState<number | null>(
    searchParams.get('subjectId') ? Number(searchParams.get('subjectId')) : null,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function refresh() {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (format !== 'all') params.set('format', format);
    if (subjectId) params.set('subjectId', String(subjectId));
    const res = await fetch(`/api/books?${params.toString()}`);
    setBooks(await res.json());
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, format, subjectId]);

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
        <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'list' | 'subject')}>
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="subject">By Subject</TabsTrigger>
          </TabsList>
        </Tabs>
        <CatalogFilters format={format} onFormatChange={setFormat} />
      </div>
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
      {view === 'list' && <CatalogTable books={books} onSelect={setSelectedId} />}
      {view === 'subject' && <CatalogBySubject books={books} onSelect={setSelectedId} />}
      <BookDetailSheet bookId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
    </div>
  );
}
