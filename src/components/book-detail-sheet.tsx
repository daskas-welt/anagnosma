'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { IsbnScanner } from '@/components/isbn-scanner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { parsePageCount, parsePublishYear } from '@/lib/isbn';
import type {
  BookMetadata,
  OpenLibrarySearchResult,
} from '@/lib/isbn-lookup/client';
import type { BookWithCopies } from '@/lib/books/repository';

type Subject = { id: number; name: string; bookCount: number };
type BookDraft = {
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  publisher: string;
  publishYear: string;
  pageCount: string;
};

function CopyFormatSelect({
  copyId,
  value,
  onChange,
}: {
  copyId: number;
  value: string;
  onChange: (format: string) => void;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={`copy-format-${copyId}`}>Format</FieldLabel>
      <Select value={value} onValueChange={(v) => v != null && onChange(v)}>
        <SelectTrigger id={`copy-format-${copyId}`} className="w-full">
          <SelectValue>{(v: string) => formatLabel(v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {FORMATS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<Set<number>>(
    new Set(),
  );
  // Tracks which bookId `assignedSubjectIds` was fetched for, so a response
  // that resolves after the user has already switched to a different book can
  // be recognized as stale (see `displayedAssignedSubjectIds` below) instead
  // of being shown — and toggled — against the wrong book.
  const [assignedSubjectIdsBookId, setAssignedSubjectIdsBookId] = useState<
    number | null
  >(null);
  const [openLibraryQuery, setOpenLibraryQuery] = useState('');
  const [openLibraryResults, setOpenLibraryResults] = useState<
    OpenLibrarySearchResult[]
  >([]);
  const [searchingOpenLibrary, setSearchingOpenLibrary] = useState(false);
  const [searchingIsbn, setSearchingIsbn] = useState(false);
  const [bookDraft, setBookDraft] = useState<BookDraft>({
    title: '',
    author: '',
    isbn: '',
    coverUrl: '',
    publisher: '',
    publishYear: '',
    pageCount: '',
  });
  const [savingChanges, setSavingChanges] = useState(false);
  const [copyNotes, setCopyNotes] = useState<Record<number, string>>({});
  const [copyFormats, setCopyFormats] = useState<Record<number, string>>({});
  const [draftSubjectIds, setDraftSubjectIds] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    if (bookId == null) return;
    fetch(`/api/books/${bookId}`)
      .then((r) => r.json())
      .then((nextBook: BookWithCopies) => {
        setBook(nextBook);
        setOpenLibraryQuery(nextBook.title);
        setOpenLibraryResults([]);
        setBookDraft({
          title: nextBook.title,
          author: nextBook.author,
          isbn: nextBook.isbn ?? '',
          coverUrl: nextBook.coverUrl ?? '',
          publisher: nextBook.publisher ?? '',
          publishYear: nextBook.publishYear ? String(nextBook.publishYear) : '',
          pageCount: nextBook.pageCount ? String(nextBook.pageCount) : '',
        });
        setCopyNotes(
          Object.fromEntries(
            nextBook.copies.map((copy) => [copy.id, copy.notes ?? '']),
          ),
        );
        setCopyFormats(
          Object.fromEntries(
            nextBook.copies.map((copy) => [copy.id, copy.format]),
          ),
        );
      });
    fetch('/api/subjects')
      .then((r) => r.json())
      .then(setAllSubjects);
    fetch(`/api/books/${bookId}/subjects`)
      .then((r) => r.json())
      .then((ids: number[]) => {
        setAssignedSubjectIds(new Set(ids));
        setDraftSubjectIds(new Set(ids));
        setAssignedSubjectIdsBookId(bookId);
      });
  }, [bookId]);

  async function handleOpenLibrarySearch() {
    const query = openLibraryQuery.trim();
    if (!query) return;
    setSearchingOpenLibrary(true);
    try {
      const res = await fetch(`/api/lookup?query=${encodeURIComponent(query)}`);
      if (!res.ok) {
        toast.error('Could not search Open Library.');
        return;
      }
      const results = await res.json();
      setOpenLibraryResults(results);
      if (results.length === 0) toast.error('No matching books found.');
    } catch {
      toast.error('Could not search Open Library.');
    } finally {
      setSearchingOpenLibrary(false);
    }
  }

  async function applyOpenLibraryResult(result: OpenLibrarySearchResult) {
    setBookDraft((draft) => ({
      ...draft,
      title: result.title,
      author: result.author,
      ...(result.isbn ? { isbn: result.isbn } : {}),
      ...(result.coverUrl ? { coverUrl: result.coverUrl } : {}),
      ...(result.publisher ? { publisher: result.publisher } : {}),
      ...(result.publishYear
        ? { publishYear: String(result.publishYear) }
        : {}),
      ...(result.pageCount ? { pageCount: String(result.pageCount) } : {}),
    }));
    setOpenLibraryResults([]);
    toast.success(`Loaded metadata for "${result.title}".`);
  }

  function handleScannedIsbn(isbn: string) {
    setBookDraft((draft) => ({ ...draft, isbn }));
  }

  async function handleIsbnSearch() {
    const isbn = bookDraft.isbn.trim();
    if (!isbn) return;
    setSearchingIsbn(true);
    try {
      const res = await fetch(`/api/lookup?isbn=${encodeURIComponent(isbn)}`);
      if (!res.ok) {
        toast.error('No metadata found for that ISBN.');
        return;
      }
      const metadata = (await res.json()) as BookMetadata;
      setBookDraft((draft) => ({
        ...draft,
        isbn: metadata.isbn,
        title: metadata.title,
        author: metadata.author,
        coverUrl: metadata.coverUrl ?? draft.coverUrl,
        publisher: metadata.publisher ?? draft.publisher,
        publishYear: metadata.publishYear
          ? String(metadata.publishYear)
          : draft.publishYear,
        pageCount: metadata.pageCount
          ? String(metadata.pageCount)
          : draft.pageCount,
      }));
      toast.success('Loaded ISBN metadata.');
    } catch {
      toast.error('Could not look up that ISBN.');
    } finally {
      setSearchingIsbn(false);
    }
  }

  // Guard against showing stale data from a previously selected book while the
  // fetch for the newly selected `bookId` is still in flight.
  const displayedBook = book && book.id === bookId ? book : null;
  const singleCopy =
    displayedBook?.copies.length === 1 ? displayedBook.copies[0] : null;

  function setCopyFormat(copyId: number, format: string) {
    setCopyFormats((formats) => ({ ...formats, [copyId]: format }));
  }

  // Same guard for assigned subjects: only trust `assignedSubjectIds` once it
  // was fetched for the currently selected book. Otherwise a badge that's
  // actually from the previous book could read as "assigned" and invert the
  // toggle (DELETE instead of POST) when clicked.
  const displayedAssignedSubjectIds =
    assignedSubjectIdsBookId === bookId ? draftSubjectIds : new Set<number>();

  async function updateBookField(
    patch: Record<string, unknown>,
  ): Promise<boolean> {
    if (!displayedBook) return false;
    const res = await fetch(`/api/books/${displayedBook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error('Could not update book.');
      return false;
    }
    const updated = await res.json();
    setBook(updated);
    onChanged();
    return true;
  }

  async function handleSaveChanges() {
    if (savingChanges) return;
    const publishYear = parsePublishYear(bookDraft.publishYear);
    const pageCount = parsePageCount(bookDraft.pageCount);
    if (publishYear === 'invalid') {
      toast.error('Year must be a 4-digit number.');
      return;
    }
    if (pageCount === 'invalid') {
      toast.error('Pages must be a whole number.');
      return;
    }
    setSavingChanges(true);
    try {
      await saveChanges(publishYear, pageCount);
    } finally {
      setSavingChanges(false);
    }
  }

  async function saveChanges(
    publishYear: number | null,
    pageCount: number | null,
  ) {
    // Send null rather than omitting empty values, so clearing a field in the
    // form actually clears the column instead of leaving the old value behind.
    const updated = await updateBookField({
      title: bookDraft.title,
      author: bookDraft.author,
      isbn: bookDraft.isbn.trim() || null,
      coverUrl: bookDraft.coverUrl.trim() || null,
      publisher: bookDraft.publisher.trim() || null,
      publishYear,
      pageCount,
    });
    if (!updated || !displayedBook) return;
    const copyResults = await Promise.all(
      displayedBook.copies
        .filter(
          (copy) =>
            copyNotes[copy.id] !== (copy.notes ?? '') ||
            copyFormats[copy.id] !== copy.format,
        )
        .map((copy) =>
          updateCopy(copy.id, {
            notes: copyNotes[copy.id] ?? '',
            format: copyFormats[copy.id] ?? copy.format,
          }),
        ),
    );
    const subjectResults = await Promise.all([
      ...[...assignedSubjectIds]
        .filter((subjectId) => !draftSubjectIds.has(subjectId))
        .map((subjectId) =>
          requestSucceeded(
            `/api/books/${displayedBook.id}/subjects?subjectId=${subjectId}`,
            { method: 'DELETE' },
          ),
        ),
      ...[...draftSubjectIds]
        .filter((subjectId) => !assignedSubjectIds.has(subjectId))
        .map((subjectId) =>
          requestSucceeded(`/api/books/${displayedBook.id}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId }),
          }),
        ),
    ]);
    // The book row is already written at this point, so a failed copy or
    // subject write is a partial save: say so and keep the sheet open with the
    // draft intact rather than closing on a success message that isn't true.
    if ([...copyResults, ...subjectResults].some((ok) => !ok)) {
      toast.error('Book saved, but some changes could not be applied.');
      return;
    }
    toast.success('Book changes saved.');
    onClose();
  }

  // Resolves to false instead of throwing, so one failed write is reported
  // without aborting the rest of the save.
  async function requestSucceeded(
    url: string,
    init: RequestInit,
  ): Promise<boolean> {
    try {
      const res = await fetch(url, init);
      return res.ok;
    } catch {
      return false;
    }
  }

  async function updateCopy(
    copyId: number,
    patch: Record<string, unknown>,
  ): Promise<boolean> {
    let res: Response;
    try {
      res = await fetch(`/api/copies/${copyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {
      toast.error('Could not update copy.');
      return false;
    }
    if (!res.ok) {
      toast.error('Could not update copy.');
      return false;
    }
    const updated = await res.json();
    setBook((prev) =>
      prev
        ? {
            ...prev,
            copies: prev.copies.map((c) => (c.id === copyId ? updated : c)),
          }
        : prev,
    );
    onChanged();
    return true;
  }

  async function handleConfirmDelete() {
    if (!displayedBook) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${displayedBook.id}`, {
        method: 'DELETE',
      });
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
      setBookDraft((draft) => ({ ...draft, coverUrl: url }));
    } finally {
      setUploadingCover(false);
    }
  }

  async function toggleSubject(subjectId: number, assigned: boolean) {
    setDraftSubjectIds(() => {
      const next = new Set(displayedAssignedSubjectIds);
      if (assigned) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  }

  return (
    <Sheet open={bookId != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl data-[side=right]:sm:max-w-2xl">
        {displayedBook && (
          <>
            <SheetHeader>
              <SheetTitle>{bookDraft.title || displayedBook.title}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {bookDraft.author || displayedBook.author}
              </p>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-4">
              <div className="space-y-3 rounded-lg border p-3">
                <div>
                  <h3 className="text-sm font-medium">Search Open Library</h3>
                  <p className="text-xs text-muted-foreground">
                    Find a matching book to update its metadata.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={openLibraryQuery}
                    onChange={(event) =>
                      setOpenLibraryQuery(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleOpenLibrarySearch();
                      }
                    }}
                    placeholder="Search by title or author"
                    aria-label="Search Open Library"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleOpenLibrarySearch}
                    disabled={searchingOpenLibrary || !openLibraryQuery.trim()}
                    aria-label="Search Open Library"
                  >
                    {searchingOpenLibrary ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Search />
                    )}
                  </Button>
                </div>
                {openLibraryResults.length > 0 && (
                  <div aria-label="Open Library results">
                    <div className="mb-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Close Open Library results"
                        title="Close results"
                        onClick={() => setOpenLibraryResults([])}
                      >
                        <X />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {openLibraryResults.map((result, index) => (
                        <div
                          key={`${result.isbn ?? result.title}-${index}`}
                          className="flex items-center gap-3 rounded border p-2"
                        >
                          {result.coverUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={result.coverUrl}
                              alt=""
                              className="h-12 w-8 shrink-0 rounded object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {result.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {result.author || 'Unknown author'}
                              {result.publishYear
                                ? ` · ${result.publishYear}`
                                : ''}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => applyOpenLibraryResult(result)}
                          >
                            Apply
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Title</h3>
                  <Input
                    key={displayedBook.id}
                    value={bookDraft.title}
                    placeholder="Title"
                    onChange={(e) =>
                      setBookDraft((draft) => ({
                        ...draft,
                        title: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Author</h3>
                  <Input
                    key={displayedBook.id}
                    value={bookDraft.author}
                    placeholder="Author"
                    onChange={(e) =>
                      setBookDraft((draft) => ({
                        ...draft,
                        author: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">ISBN</h3>
                  <div className="relative flex items-end gap-2">
                    <Input
                      key={displayedBook.id}
                      className="flex-1"
                      value={bookDraft.isbn}
                      placeholder="ISBN"
                      onChange={(e) =>
                        setBookDraft((draft) => ({
                          ...draft,
                          isbn: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleIsbnSearch();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Search ISBN"
                      title="Search ISBN"
                      disabled={searchingIsbn}
                      onClick={() => void handleIsbnSearch()}
                    >
                      {searchingIsbn ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Search />
                      )}
                    </Button>
                    <IsbnScanner
                      compact
                      busy={searchingIsbn}
                      mobileOnly
                      onScan={handleScannedIsbn}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <h3 className="mb-2 text-sm font-medium">Cover</h3>
                  <div className="flex items-start gap-3">
                    {bookDraft.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bookDraft.coverUrl}
                        alt={bookDraft.title}
                        className="h-48 w-32 shrink-0 rounded object-cover shadow-sm"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        key={`${displayedBook.id}-${displayedBook.coverUrl ?? ''}`}
                        value={bookDraft.coverUrl}
                        placeholder="Cover URL"
                        onChange={(e) =>
                          setBookDraft((draft) => ({
                            ...draft,
                            coverUrl: e.target.value,
                          }))
                        }
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
                      {uploadingCover && (
                        <p className="text-xs text-muted-foreground">
                          Uploading…
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Publisher</h3>
                  <Input
                    key={displayedBook.id}
                    value={bookDraft.publisher}
                    placeholder="Publisher"
                    onChange={(e) =>
                      setBookDraft((draft) => ({
                        ...draft,
                        publisher: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Year</h3>
                  <Input
                    key={displayedBook.id}
                    inputMode="numeric"
                    value={bookDraft.publishYear}
                    placeholder="Year"
                    onChange={(e) =>
                      setBookDraft((draft) => ({
                        ...draft,
                        publishYear: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Pages</h3>
                  <Input
                    key={displayedBook.id}
                    inputMode="numeric"
                    value={bookDraft.pageCount}
                    placeholder="Pages"
                    onChange={(e) =>
                      setBookDraft((draft) => ({
                        ...draft,
                        pageCount: e.target.value,
                      }))
                    }
                  />
                </div>
                {/* A single-copy book keeps Format inline with Pages; once
                    there is more than one copy each gets its own Format and
                    Notes below, since they can differ per copy. */}
                {singleCopy && (
                  <CopyFormatSelect
                    copyId={singleCopy.id}
                    value={copyFormats[singleCopy.id] ?? singleCopy.format}
                    onChange={(format) => setCopyFormat(singleCopy.id, format)}
                  />
                )}
              </div>
              <div className="space-y-4">
                {displayedBook.copies.map((copy, index) => (
                  <div
                    key={copy.id}
                    className={
                      singleCopy ? 'space-y-2' : 'space-y-2 rounded border p-3'
                    }
                  >
                    {!singleCopy && (
                      <h3 className="text-sm font-medium">Copy {index + 1}</h3>
                    )}
                    {!singleCopy && (
                      <CopyFormatSelect
                        copyId={copy.id}
                        value={copyFormats[copy.id] ?? copy.format}
                        onChange={(format) => setCopyFormat(copy.id, format)}
                      />
                    )}
                    <div className="space-y-2">
                      <FieldLabel htmlFor={`copy-notes-${copy.id}`}>
                        Notes
                      </FieldLabel>
                      <Textarea
                        id={`copy-notes-${copy.id}`}
                        value={copyNotes[copy.id] ?? ''}
                        onChange={(e) =>
                          setCopyNotes((notes) => ({
                            ...notes,
                            [copy.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Subjects</h3>
                <div className="flex flex-wrap gap-2">
                  {allSubjects.map((subject) => {
                    const assigned = displayedAssignedSubjectIds.has(
                      subject.id,
                    );
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
              <Button
                type="button"
                className="w-full"
                disabled={
                  savingChanges ||
                  searchingOpenLibrary ||
                  searchingIsbn ||
                  uploadingCover
                }
                onClick={() => void handleSaveChanges()}
              >
                {savingChanges ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
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
            <AlertDialogTitle>
              Delete &ldquo;{displayedBook?.title}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the book and all of its copies. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
