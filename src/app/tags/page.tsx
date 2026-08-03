'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Tag = { id: number; name: string; bookCount: number };

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  async function refresh() {
    const res = await fetch('/api/tags');
    setTags(await res.json());
  }

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, []);

  async function rename(id: number) {
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editValue }),
    });
    if (!res.ok) {
      toast.error('Could not rename tag.');
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function remove(id: number) {
    await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Books</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tags.map((tag) => (
          <TableRow key={tag.id}>
            <TableCell>
              {editingId === tag.id ? (
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} />
              ) : (
                <Link href={`/?tagId=${tag.id}`}>{tag.name}</Link>
              )}
            </TableCell>
            <TableCell>{tag.bookCount}</TableCell>
            <TableCell className="space-x-2">
              {editingId === tag.id ? (
                <Button size="sm" onClick={() => rename(tag.id)}>
                  Save
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditValue(tag.name);
                  }}
                >
                  Rename
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => remove(tag.id)}>
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
