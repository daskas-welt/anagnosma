'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type Subject = { id: number; name: string; bookCount: number };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(search.toLowerCase()),
  );
  const visibleSubjects = filteredSubjects;
  const totalBookCount = subjects.reduce(
    (total, subject) => total + subject.bookCount,
    0,
  );

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

  async function create() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? 'Could not create subject.');
        return;
      }
      setNewName('');
      setAddOpen(false);
      await refresh();
      toast.success('Subject added.');
    } finally {
      setAdding(false);
    }
  }

  async function remove() {
    if (deleteId == null) return;
    const res = await fetch(`/api/subjects/${deleteId}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Could not delete subject.');
      return;
    }
    setDeleteId(null);
    await refresh();
    toast.success('Subject deleted.');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize and manage the subjects assigned to your books.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add subject</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total subjects</CardDescription>
            <CardTitle className="text-2xl">{subjects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Books assigned</CardDescription>
            <CardTitle className="text-2xl">{totalBookCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unused subjects</CardDescription>
            <CardTitle className="text-2xl">
              {subjects.filter((subject) => subject.bookCount === 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Subject library</CardTitle>
          <CardDescription>
            Manage subject names and see how many books use each one.
          </CardDescription>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Search subjects..."
            aria-label="Search subjects"
            className="mt-2 max-w-sm"
          />
        </CardHeader>
        <CardContent className="p-4">
          {visibleSubjects.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
              {search ? 'No subjects match your search.' : 'No subjects yet.'}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {visibleSubjects.map((subject) => (
                <Card
                  key={subject.id}
                  size="sm"
                  className="border-border/80 bg-background shadow-sm"
                >
                  <CardContent className="flex min-h-32 flex-col justify-between gap-4 p-4">
                    {editingId === subject.id ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void rename(subject.id);
                          if (event.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <div>
                        <p className="text-sm font-semibold">{subject.name}</p>
                        <Badge
                          variant={subject.bookCount ? 'secondary' : 'outline'}
                          className="mt-2"
                        >
                          {subject.bookCount}{' '}
                          {subject.bookCount === 1 ? 'book' : 'books'}
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      {editingId === subject.id ? (
                        <Button
                          size="sm"
                          onClick={() => void rename(subject.id)}
                        >
                          Save
                        </Button>
                      ) : (
                        <>
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
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteId(subject.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {filteredSubjects.length > 0 && (
            <div className="border-t p-4 text-sm text-muted-foreground">
              Showing {filteredSubjects.length} subjects
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add subject</DialogTitle>
            <DialogDescription>
              Create a subject to use when organizing your books.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Historical Fiction"
            aria-label="Subject name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void create();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || adding}
              onClick={() => void create()}
            >
              {adding ? 'Adding...' : 'Add subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the subject assignment from its books. The books
              themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void remove()}
            >
              Delete subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
