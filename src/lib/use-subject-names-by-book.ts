'use client';

import { useEffect, useState } from 'react';

type Subject = { id: number; name: string; bookCount: number };

// Fetches all subjects and the book->subject association map once, and
// resolves them into a bookId -> subject-name-list lookup. Shared by any
// catalog view (grid, table) that needs to display each book's subjects
// without an N+1 fetch per book.
export function useSubjectNamesByBook(enabled: boolean): Record<number, string[]> | null {
  const [map, setMap] = useState<Record<number, string[]> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      const [subjects, bookMap]: [Subject[], Record<number, number[]>] = await Promise.all([
        fetch('/api/subjects').then((r) => r.json()),
        fetch('/api/subjects/book-map').then((r) => r.json()),
      ]);
      const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
      const resolved: Record<number, string[]> = {};
      for (const [bookId, subjectIds] of Object.entries(bookMap)) {
        resolved[Number(bookId)] = subjectIds.map((id) => subjectNameById.get(id)).filter((n): n is string => !!n);
      }
      setMap(resolved);
    })();
  }, [enabled]);

  return map;
}
