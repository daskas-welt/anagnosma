'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { IsbnScanner } from '@/components/isbn-scanner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BookWithCopies } from '@/lib/books/repository';
import type { BookMetadata } from '@/lib/isbn-lookup/client';
import { canonicalizeIsbn } from '@/lib/isbn';
import { FORMATS, formatLabel } from '@/lib/formats';

type Subject = { id: number; name: string; bookCount: number };
type BookCollection = 'catalog' | 'wishlist';

const schema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  format: z.string().optional(),
  publisher: z.string().optional(),
  publishYear: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v), 'Enter a 4-digit year'),
  pageCount: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), 'Enter a whole number'),
  coverUrl: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  isbn: '',
  title: '',
  author: '',
  format: 'paperback',
  publisher: '',
  publishYear: '',
  pageCount: '',
  coverUrl: '',
  notes: '',
};

export function AddBookModal({
  onCreated,
  books,
  onChanged,
  wishlist = false,
}: {
  onCreated: (book: BookWithCopies) => void;
  books: BookWithCopies[];
  onChanged: () => void;
  wishlist?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<number>>(
    new Set(),
  );
  const [duplicateBook, setDuplicateBook] = useState<BookWithCopies | null>(
    null,
  );
  const [duplicateCollection, setDuplicateCollection] =
    useState<BookCollection | null>(null);
  const [scannedMetadata, setScannedMetadata] = useState<BookMetadata | null>(
    null,
  );
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [lookingUpIsbn, setLookingUpIsbn] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const coverUrl = useWatch({ control, name: 'coverUrl' });
  const selectedFormat = useWatch({ control, name: 'format' });
  const endpoint = wishlist ? '/api/wishlist' : '/api/books';

  useEffect(() => {
    if (!open) return;
    fetch('/api/subjects')
      .then((r) => r.json())
      .then(setAllSubjects);
  }, [open]);

  function toggleSubject(subjectId: number) {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
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
      setValue('coverUrl', url);
    } finally {
      setUploadingCover(false);
    }
  }

  // `books` is the catalogue list, which is narrowed by whatever search or
  // subject filter is active, so a local hit is a fast path rather than the
  // source of truth — fall back to a server lookup that sees the whole library.
  // Both sides are canonicalised because rows created before ISBNs were
  // normalised on write still hold the separators the user typed.
  async function findBookByIsbn(
    isbn: string,
  ): Promise<{ book: BookWithCopies; collection: BookCollection } | null> {
    const local = books.find((book) => canonicalizeIsbn(book.isbn) === isbn);
    if (local)
      return { book: local, collection: wishlist ? 'wishlist' : 'catalog' };
    try {
      const candidates: { endpoint: string; collection: BookCollection }[] =
        wishlist
          ? [
              { endpoint: '/api/wishlist', collection: 'wishlist' },
              { endpoint: '/api/books', collection: 'catalog' },
            ]
          : [
              { endpoint: '/api/books', collection: 'catalog' },
              { endpoint: '/api/wishlist', collection: 'wishlist' },
            ];
      const matches = await Promise.all(
        candidates.map(async ({ endpoint: candidateEndpoint, collection }) => {
          try {
            const res = await fetch(
              `${candidateEndpoint}?isbn=${encodeURIComponent(isbn)}`,
            );
            if (!res.ok) return null;
            const books: BookWithCopies[] = await res.json();
            return books[0] ? { book: books[0], collection } : null;
          } catch {
            return null;
          }
        }),
      );
      return matches.find((match) => match !== null) ?? null;
    } catch {
      // A failed duplicate check must not take the metadata lookup down with
      // it: fall through and let the form populate as an ordinary new book.
      return null;
    }
  }

  async function handleIsbnLookup(isbn: string): Promise<boolean> {
    if (!isbn) return false;
    setLookingUpIsbn(true);
    setDuplicateBook(null);
    setDuplicateCollection(null);
    setDuplicateOpen(false);
    try {
      let res: Response;
      try {
        res = await fetch(`/api/lookup?isbn=${encodeURIComponent(isbn)}`);
      } catch {
        toast.error(
          'No match found for that ISBN — fill in the details manually.',
        );
        return false;
      }
      if (!res.ok) {
        toast.error(
          'No match found for that ISBN — fill in the details manually.',
        );
        return false;
      }
      const meta = await res.json();
      const existing = await findBookByIsbn(meta.isbn);
      if (existing) {
        setDuplicateBook(existing.book);
        setDuplicateCollection(existing.collection);
        setScannedMetadata(meta);
        setDuplicateOpen(true);
      }
      // Only overwrite where the lookup actually has a value — a field Open
      // Library doesn't know about keeps whatever the user typed instead of
      // being wiped. Matches how the edit sheet applies ISBN metadata.
      const options = { shouldDirty: true };
      const current = getValues();
      setValue('isbn', meta.isbn ?? isbn, options);
      setValue('title', meta.title, options);
      setValue('author', meta.author, options);
      setValue('publisher', meta.publisher ?? current.publisher ?? '', options);
      setValue(
        'publishYear',
        meta.publishYear
          ? String(meta.publishYear)
          : (current.publishYear ?? ''),
        options,
      );
      setValue(
        'pageCount',
        meta.pageCount ? String(meta.pageCount) : (current.pageCount ?? ''),
        options,
      );
      setValue('coverUrl', meta.coverUrl ?? current.coverUrl ?? '', options);
      return true;
    } finally {
      setLookingUpIsbn(false);
    }
  }

  async function updateExistingBook() {
    if (
      !duplicateBook ||
      !scannedMetadata ||
      duplicateCollection !== (wishlist ? 'wishlist' : 'catalog')
    )
      return;
    const res = await fetch(`/api/books/${duplicateBook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scannedMetadata),
    });
    if (!res.ok) {
      toast.error('Could not update the existing book.');
      return;
    }
    toast.success(`Updated metadata for "${duplicateBook.title}".`);
    setDuplicateOpen(false);
    onChanged();
  }

  async function addExistingCopy() {
    if (
      !duplicateBook ||
      !selectedFormat ||
      duplicateCollection !== 'catalog' ||
      wishlist
    )
      return;
    const res = await fetch('/api/copies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: duplicateBook.id,
        format: selectedFormat,
      }),
    });
    if (!res.ok) {
      toast.error('Could not add another copy.');
      return;
    }
    toast.success(`Added another copy of "${duplicateBook.title}".`);
    setDuplicateOpen(false);
    onChanged();
  }

  async function onSubmit(values: FormValues) {
    if (!wishlist && !values.format) {
      toast.error('Format is required.');
      return;
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        format: wishlist ? undefined : values.format,
        publishYear: values.publishYear
          ? Number(values.publishYear)
          : undefined,
        pageCount: values.pageCount ? Number(values.pageCount) : undefined,
        notes: values.notes || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? 'Could not save the book.');
      return;
    }
    const book = await res.json();
    if (selectedSubjectIds.size > 0) {
      const subjectResults = await Promise.all(
        [...selectedSubjectIds].map(async (subjectId) => {
          try {
            const subjectRes = await fetch(`/api/books/${book.id}/subjects`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subjectId }),
            });
            return subjectRes.ok;
          } catch {
            return false;
          }
        }),
      );
      if (subjectResults.some((ok) => !ok)) {
        onCreated(book);
        toast.error(
          `Added "${book.title}", but some subjects could not be applied.`,
        );
        setOpen(false);
        reset(defaultValues);
        setSelectedSubjectIds(new Set());
        setDuplicateOpen(false);
        setDuplicateBook(null);
        setDuplicateCollection(null);
        return;
      }
    }
    onCreated(book);
    toast.success(
      wishlist
        ? `Added "${book.title}" to your wishlist.`
        : `Added "${book.title}"`,
    );
    setOpen(false);
    reset(defaultValues);
    setSelectedSubjectIds(new Set());
    setDuplicateOpen(false);
  }

  const isbnField = register('isbn');

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          reset(defaultValues);
          setSelectedSubjectIds(new Set());
          setDuplicateOpen(false);
        }
      }}
    >
      <SheetTrigger render={<Button className="h-11 sm:h-8" />}>
        + {wishlist ? 'Add book to wishlist' : 'Add book to catalog'}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b">
          <SheetTitle>
            {wishlist ? 'Add book to wishlist' : 'Add book to catalog'}
          </SheetTitle>
        </SheetHeader>
        {duplicateOpen && duplicateBook && scannedMetadata && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="font-medium">
              This ISBN is already in your{' '}
              {duplicateCollection === 'wishlist' ? 'wishlist' : 'catalog'}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {duplicateCollection === (wishlist ? 'wishlist' : 'catalog')
                ? `${duplicateBook.title} · these actions apply immediately to the existing book.`
                : `${duplicateBook.title} is already tracked there. Remove it from that collection before adding it here.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {duplicateCollection === (wishlist ? 'wishlist' : 'catalog') ? (
                <>
                  <Button
                    type="button"
                    onClick={() => void updateExistingBook()}
                  >
                    Update metadata
                  </Button>
                  {!wishlist && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void addExistingCopy()}
                    >
                      Add another copy
                    </Button>
                  )}
                </>
              ) : (
                <Link
                  href={duplicateCollection === 'wishlist' ? '/wishlist' : '/'}
                  className="inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  Open {duplicateCollection}
                </Link>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDuplicateOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4">
          <FieldGroup>
            <Field data-invalid={!!errors.isbn}>
              <FieldLabel htmlFor="isbn">ISBN</FieldLabel>
              <div className="relative flex items-end gap-2">
                <Input
                  id="isbn"
                  autoFocus
                  className="flex-1"
                  placeholder="Enter ISBN-10 or ISBN-13"
                  aria-invalid={!!errors.isbn}
                  {...isbnField}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleIsbnLookup(e.currentTarget.value);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Search ISBN"
                  title="Search ISBN"
                  disabled={lookingUpIsbn}
                  onClick={() => void handleIsbnLookup(getValues('isbn') ?? '')}
                >
                  <Search />
                </Button>
                <IsbnScanner
                  compact
                  busy={lookingUpIsbn}
                  mobileOnly
                  onScan={(isbn) => {
                    setValue('isbn', isbn, { shouldDirty: true });
                  }}
                />
              </div>
              <FieldError errors={errors.isbn ? [errors.isbn] : undefined} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="title">
                  Title{' '}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="title"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.title}
                  {...register('title')}
                />
                <FieldError
                  errors={errors.title ? [errors.title] : undefined}
                />
              </Field>
              <Field data-invalid={!!errors.author}>
                <FieldLabel htmlFor="author">
                  Author{' '}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="author"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.author}
                  {...register('author')}
                />
                <FieldError
                  errors={errors.author ? [errors.author] : undefined}
                />
              </Field>
            </div>
            <Field data-invalid={!!errors.coverUrl}>
              <FieldLabel htmlFor="coverUrl">Cover</FieldLabel>
              <div className="flex items-start gap-3">
                {coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="h-48 w-32 shrink-0 rounded object-cover shadow-sm"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    id="coverUrl"
                    placeholder="Cover URL"
                    {...register('coverUrl')}
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
                    <p className="text-xs text-muted-foreground">Uploading…</p>
                  )}
                </div>
              </div>
              <FieldError
                errors={errors.coverUrl ? [errors.coverUrl] : undefined}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.publisher}>
                <FieldLabel htmlFor="publisher">Publisher</FieldLabel>
                <Input
                  id="publisher"
                  aria-invalid={!!errors.publisher}
                  {...register('publisher')}
                />
                <FieldError
                  errors={errors.publisher ? [errors.publisher] : undefined}
                />
              </Field>
              <Field data-invalid={!!errors.publishYear}>
                <FieldLabel htmlFor="publishYear">Year</FieldLabel>
                <Input
                  id="publishYear"
                  inputMode="numeric"
                  aria-invalid={!!errors.publishYear}
                  {...register('publishYear')}
                />
                <FieldError
                  errors={errors.publishYear ? [errors.publishYear] : undefined}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.pageCount}>
                <FieldLabel htmlFor="pageCount">Pages</FieldLabel>
                <Input
                  id="pageCount"
                  inputMode="numeric"
                  aria-invalid={!!errors.pageCount}
                  {...register('pageCount')}
                />
                <FieldError
                  errors={errors.pageCount ? [errors.pageCount] : undefined}
                />
              </Field>
              {!wishlist && (
                <Field data-invalid={!!errors.format}>
                  <FieldLabel htmlFor="format">
                    Format{' '}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="format"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="format"
                          aria-required="true"
                          aria-invalid={!!errors.format}
                        >
                          <SelectValue>
                            {(value: string) => formatLabel(value)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {FORMATS.map((format) => (
                              <SelectItem
                                key={format.value}
                                value={format.value}
                              >
                                {format.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError
                    errors={errors.format ? [errors.format] : undefined}
                  />
                </Field>
              )}
            </div>
            {!wishlist && (
              <Field data-invalid={!!errors.notes}>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Textarea
                  id="notes"
                  aria-invalid={!!errors.notes}
                  {...register('notes')}
                />
                <FieldError
                  errors={errors.notes ? [errors.notes] : undefined}
                />
              </Field>
            )}
            <Field>
              <FieldLabel>Subjects</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {allSubjects.map((subject) => {
                  const selected = selectedSubjectIds.has(subject.id);
                  return (
                    <Badge
                      key={subject.id}
                      variant={selected ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSubject(subject.id)}
                    >
                      {subject.name}
                    </Badge>
                  );
                })}
              </div>
            </Field>
            <div className="sticky bottom-0 -mx-4 mt-2 border-t bg-popover p-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || lookingUpIsbn}
              >
                {isSubmitting
                  ? 'Saving...'
                  : lookingUpIsbn
                    ? 'Looking up ISBN...'
                    : wishlist
                      ? 'Add to Wishlist'
                      : 'Save'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  );
}
