'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/star-rating';
import type { BookWithCopies } from '@/lib/books/repository';

type Tag = { id: number; name: string; bookCount: number };

const STATUSES = ['to-read', 'reading', 'read', 'dnf'];

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
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<Set<number>>(new Set());
  // Tracks which bookId `assignedTagIds` was fetched for, so a response that
  // resolves after the user has already switched to a different book can be
  // recognized as stale (see `displayedAssignedTagIds` below) instead of
  // being shown — and toggled — against the wrong book.
  const [assignedTagIdsBookId, setAssignedTagIdsBookId] = useState<number | null>(null);

  useEffect(() => {
    if (bookId == null) return;
    fetch(`/api/books/${bookId}`).then((r) => r.json()).then(setBook);
    fetch('/api/tags').then((r) => r.json()).then(setAllTags);
    fetch(`/api/books/${bookId}/tags`)
      .then((r) => r.json())
      .then((ids: number[]) => {
        setAssignedTagIds(new Set(ids));
        setAssignedTagIdsBookId(bookId);
      });
  }, [bookId]);

  // Guard against showing stale data from a previously selected book while the
  // fetch for the newly selected `bookId` is still in flight.
  const displayedBook = book && book.id === bookId ? book : null;
  // Same guard for assigned tags: only trust `assignedTagIds` once it was
  // fetched for the currently selected book. Otherwise a badge that's
  // actually from the previous book could read as "assigned" and invert the
  // toggle (DELETE instead of POST) when clicked.
  const displayedAssignedTagIds = assignedTagIdsBookId === bookId ? assignedTagIds : new Set<number>();

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

  async function toggleTag(tagId: number, assigned: boolean) {
    if (!displayedBook) return;
    if (assigned) {
      await fetch(`/api/books/${displayedBook.id}/tags?tagId=${tagId}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/books/${displayedBook.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
    }
    // Base the update on `displayedAssignedTagIds` (the value actually shown
    // and toggled), not the raw `assignedTagIds`, in case the fetch for this
    // book hadn't resolved yet — and stamp the bookId so this now-correct
    // state isn't immediately treated as stale by the guard above.
    setAssignedTagIds(() => {
      const next = new Set(displayedAssignedTagIds);
      if (assigned) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
    setAssignedTagIdsBookId(displayedBook.id);
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
              <div>
                <h3 className="mb-2 text-sm font-medium">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const assigned = displayedAssignedTagIds.has(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        variant={assigned ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag.id, assigned)}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Copies</h3>
                {displayedBook.copies.map((copy) => (
                  <div key={copy.id} className="space-y-2 rounded border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{copy.format}</span>
                      <Select
                        value={copy.status}
                        onValueChange={(v) => v != null && updateCopy(copy.id, { status: v })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <StarRating value={copy.rating} onChange={(rating) => updateCopy(copy.id, { rating })} />
                    <Textarea
                      defaultValue={copy.notes ?? ''}
                      placeholder="Notes"
                      onBlur={(e) => updateCopy(copy.id, { notes: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
