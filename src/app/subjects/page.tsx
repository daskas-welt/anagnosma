'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Subject = { id: number; name: string; bookCount: number };

export default function SubjectsPage() {
  const pageSize = 10;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(subjects.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleSubjects = subjects.slice(pageStart, pageStart + pageSize);

  async function refresh() {
    const res = await fetch('/api/subjects');
    setSubjects(await res.json());
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, []);

  async function rename(id: number) {
    const res = await fetch(`/api/subjects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editValue }),
    });
    if (!res.ok) {
      toast.error('Could not rename subject.');
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function remove(id: number) {
    await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Books</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleSubjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell>
                {editingId === subject.id ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                ) : (
                  <Link href={`/?subjectId=${subject.id}`}>{subject.name}</Link>
                )}
              </TableCell>
              <TableCell>{subject.bookCount}</TableCell>
              <TableCell className="space-x-2">
                {editingId === subject.id ? (
                  <Button size="sm" onClick={() => rename(subject.id)}>
                    Save
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(subject.id);
                      setEditValue(subject.name);
                    }}
                  >
                    Rename
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => remove(subject.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {subjects.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {pageStart + 1}-
            {Math.min(pageStart + pageSize, subjects.length)} of{' '}
            {subjects.length} subjects
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
