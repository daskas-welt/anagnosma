'use client';

import { useEffect, useMemo, useState } from 'react';
import { CatalogTable } from '@/components/catalog-table';
import type { BookWithCopies } from '@/lib/books/repository';

type Subject = { id: number; name: string; bookCount: number };

export function CatalogBySubject({
  books,
  onSelect,
}: {
  books: BookWithCopies[];
  onSelect: (id: number) => void;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [bookMap, setBookMap] = useState<Record<number, number[]>>({});

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then(setSubjects);
    fetch('/api/subjects/book-map')
      .then((r) => r.json())
      .then(setBookMap);
  }, []);

  const subjectNamesByBookId = useMemo(() => {
    const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
    const map: Record<number, string[]> = {};
    for (const [bookId, subjectIds] of Object.entries(bookMap)) {
      map[Number(bookId)] = subjectIds
        .map((id) => subjectNameById.get(id))
        .filter((n): n is string => !!n);
    }
    return map;
  }, [subjects, bookMap]);

  const sortedSubjects = [...subjects].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const categorizedBookIds = new Set<number>();
  const sections = sortedSubjects
    .map((subject) => {
      const sectionBooks = books.filter((book) =>
        (bookMap[book.id] ?? []).includes(subject.id),
      );
      sectionBooks.forEach((book) => categorizedBookIds.add(book.id));
      return { subject, books: sectionBooks };
    })
    .filter((section) => section.books.length > 0);

  const uncategorized = books.filter(
    (book) => !categorizedBookIds.has(book.id),
  );

  return (
    <div className="space-y-8">
      {sections.map(({ subject, books: sectionBooks }) => (
        <div key={subject.id}>
          <h2 className="mb-2 border-b pb-1 text-lg font-semibold">
            {subject.name}
          </h2>
          <CatalogTable
            books={sectionBooks}
            onSelect={onSelect}
            subjectNamesByBookId={subjectNamesByBookId}
          />
        </div>
      ))}
      {uncategorized.length > 0 && (
        <div>
          <h2 className="mb-2 border-b pb-1 text-lg font-semibold text-muted-foreground">
            Uncategorized
          </h2>
          <CatalogTable
            books={uncategorized}
            onSelect={onSelect}
            subjectNamesByBookId={subjectNamesByBookId}
          />
        </div>
      )}
    </div>
  );
}
