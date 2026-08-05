'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { FORMATS, formatLabel } from '@/lib/formats';
import type { BookWithCopies } from '@/lib/books/repository';

type Subject = { id: number; name: string; bookCount: number };

export function BookDetailSheet({
  bookId,
  onClose,
  onChanged,
}: {
  bookId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [book, setBook] = useState<BookWithCopies | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<Set<number>>(new Set());
  // Tracks which bookId `assignedSubjectIds` was fetched for, so a response
  // that resolves after the user has already switched to a different book can
  // be recognized as stale (see `displayedAssignedSubjectIds` below) instead
  // of being shown — and toggled — against the wrong book.
  const [assignedSubjectIdsBookId, setAssignedSubjectIdsBookId] = useState<number | null>(null);

  useEffect(() => {
    if (bookId == null) return;
    fetch(`/api/books/${bookId}`).then((r) => r.json()).then(setBook);
    fetch('/api/subjects').then((r) => r.json()).then(setAllSubjects);
    fetch(`/api/books/${bookId}/subjects`)
      .then((r) => r.json())
      .then((ids: number[]) => {
        setAssignedSubjectIds(new Set(ids));
        setAssignedSubjectIdsBookId(bookId);
      });
  }, [bookId]);

  // Guard against showing stale data from a previously selected book while the
  // fetch for the newly selected `bookId` is still in flight.
  const displayedBook = book && book.id === bookId ? book : null;
  // Same guard for assigned subjects: only trust `assignedSubjectIds` once it
  // was fetched for the currently selected book. Otherwise a badge that's
  // actually from the previous book could read as "assigned" and invert the
  // toggle (DELETE instead of POST) when clicked.
  const displayedAssignedSubjectIds = assignedSubjectIdsBookId === bookId ? assignedSubjectIds : new Set<number>();

  async function updateBookField(patch: Record<string, unknown>) {
    if (!displayedBook) return;
    const res = await fetch(`/api/books/${displayedBook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error('Could not update book.');
      return;
    }
    const updated = await res.json();
    setBook(updated);
    onChanged();
  }

  async function updateCopy(copyId: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/copies/${copyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error('Could not update copy.');
      return;
    }
    const updated = await res.json();
    setBook((prev) =>
      prev ? { ...prev, copies: prev.copies.map((c) => (c.id === copyId ? updated : c)) } : prev,
    );
    onChanged();
  }

  async function handleConfirmDelete() {
    if (!displayedBook) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${displayedBook.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Could not delete book.');
        return;
      }
      toast.success(`Deleted "${displayedBook.title}".`);
      setConfirmingDelete(false);
      onChanged();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  async function uploadCover(file: File) {
    setUploadingCover(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type, 'X-Filename': file.name },
        body: file,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Could not upload cover image.');
        return;
      }
      const { url } = await res.json();
      await updateBookField({ coverUrl: url });
    } finally {
      setUploadingCover(false);
    }
  }

  async function toggleSubject(subjectId: number, assigned: boolean) {
    if (!displayedBook) return;
    if (assigned) {
      await fetch(`/api/books/${displayedBook.id}/subjects?subjectId=${subjectId}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/books/${displayedBook.id}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      });
    }
    // Base the update on `displayedAssignedSubjectIds` (the value actually
    // shown and toggled), not the raw `assignedSubjectIds`, in case the fetch
    // for this book hadn't resolved yet — and stamp the bookId so this
    // now-correct state isn't immediately treated as stale by the guard above.
    setAssignedSubjectIds(() => {
      const next = new Set(displayedAssignedSubjectIds);
      if (assigned) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
    setAssignedSubjectIdsBookId(displayedBook.id);
    onChanged();
  }

  return (
    <Sheet open={bookId != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {displayedBook && (
          <>
            <SheetHeader>
              <SheetTitle>{displayedBook.title}</SheetTitle>
              <p className="text-sm text-muted-foreground">{displayedBook.author}</p>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Title</h3>
                  <Input
                    key={displayedBook.id}
                    defaultValue={displayedBook.title}
                    placeholder="Title"
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== displayedBook.title) {
                        updateBookField({ title: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Author</h3>
                  <Input
                    key={displayedBook.id}
                    defaultValue={displayedBook.author}
                    placeholder="Author"
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== displayedBook.author) {
                        updateBookField({ author: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">ISBN</h3>
                  <Input
                    key={displayedBook.id}
                    defaultValue={displayedBook.isbn ?? ''}
                    placeholder="ISBN"
                    onBlur={(e) => {
                      if (e.target.value !== (displayedBook.isbn ?? '')) {
                        updateBookField({ isbn: e.target.value });
                      }
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <h3 className="mb-2 text-sm font-medium">Cover</h3>
                  <div className="flex items-start gap-3">
                    {displayedBook.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayedBook.coverUrl}
                        alt={displayedBook.title}
                        className="h-24 w-16 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        key={`${displayedBook.id}-${displayedBook.coverUrl ?? ''}`}
                        defaultValue={displayedBook.coverUrl ?? ''}
                        placeholder="Cover URL"
                        onBlur={(e) => {
                          if (e.target.value !== (displayedBook.coverUrl ?? '')) {
                            updateBookField({ coverUrl: e.target.value });
                          }
                        }}
                      />
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={uploadingCover}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadCover(file);
                          e.target.value = '';
                        }}
                      />
                      {uploadingCover && <p className="text-xs text-muted-foreground">Uploading…</p>}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Publisher</h3>
                  <Input
                    key={displayedBook.id}
                    defaultValue={displayedBook.publisher ?? ''}
                    placeholder="Publisher"
                    onBlur={(e) => {
                      if (e.target.value !== (displayedBook.publisher ?? '')) {
                        updateBookField({ publisher: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Year</h3>
                  <Input
                    key={displayedBook.id}
                    inputMode="numeric"
                    defaultValue={displayedBook.publishYear ?? ''}
                    placeholder="Year"
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) return;
                      const value = Number(raw);
                      if (!Number.isNaN(value) && value !== displayedBook.publishYear) {
                        updateBookField({ publishYear: value });
                      }
                    }}
                  />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Subjects</h3>
                <div className="flex flex-wrap gap-2">
                  {allSubjects.map((subject) => {
                    const assigned = displayedAssignedSubjectIds.has(subject.id);
                    return (
                      <Badge
                        key={subject.id}
                        variant={assigned ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleSubject(subject.id, assigned)}
                      >
                        {subject.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Copies</h3>
                {displayedBook.copies.map((copy) => (
                  <div key={copy.id} className="space-y-2 rounded border p-3">
                    <Select value={copy.format} onValueChange={(v) => v != null && updateCopy(copy.id, { format: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(value: string) => formatLabel(value)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      defaultValue={copy.notes ?? ''}
                      placeholder="Notes"
                      onBlur={(e) => updateCopy(copy.id, { notes: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium">Danger zone</h3>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 /> Delete Book
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{displayedBook?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the book and all of its copies. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={handleConfirmDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
