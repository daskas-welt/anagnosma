'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BookWithCopies } from '@/lib/books/repository';
import { FORMATS, formatLabel } from '@/lib/formats';

type Subject = { id: number; name: string; bookCount: number };

const schema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  format: z.string().min(1, 'Format is required'),
  publisher: z.string().optional(),
  publishYear: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v), 'Enter a 4-digit year'),
  coverUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  isbn: '',
  title: '',
  author: '',
  format: 'paperback',
  publisher: '',
  publishYear: '',
  coverUrl: '',
};

export function AddBookModal({ onCreated }: { onCreated: (book: BookWithCopies) => void }) {
  const [open, setOpen] = useState(false);
  const isbnRef = useRef<HTMLInputElement | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<number>>(new Set());
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const coverUrl = useWatch({ control, name: 'coverUrl' });

  // Ref access is deferred to an effect (not read during render/submit) to satisfy
  // react-hooks/refs and avoid relying on RHF's setFocus, which does not reliably
  // reach this component stack's underlying DOM node (see task-11-report.md).
  useEffect(() => {
    if (savedCount > 0) {
      isbnRef.current?.focus();
    }
  }, [savedCount]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/subjects').then((r) => r.json()).then(setAllSubjects);
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

  async function handleIsbnBlur(isbn: string) {
    if (!isbn) return;
    let res: Response;
    try {
      res = await fetch(`/api/lookup?isbn=${encodeURIComponent(isbn)}`);
    } catch {
      toast.error('No match found for that ISBN — fill in the details manually.');
      return;
    }
    if (!res.ok) {
      toast.error('No match found for that ISBN — fill in the details manually.');
      return;
    }
    const meta = await res.json();
    setValue('title', meta.title);
    setValue('author', meta.author);
    if (meta.publisher) setValue('publisher', meta.publisher);
    if (meta.publishYear) setValue('publishYear', String(meta.publishYear));
    if (meta.coverUrl) setValue('coverUrl', meta.coverUrl);
  }

  async function onSubmit(values: FormValues) {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        publishYear: values.publishYear ? Number(values.publishYear) : undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? 'Could not save the book.');
      return;
    }
    const book = await res.json();
    if (selectedSubjectIds.size > 0) {
      await Promise.all(
        [...selectedSubjectIds].map((subjectId) =>
          fetch(`/api/books/${book.id}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId }),
          }),
        ),
      );
    }
    onCreated(book);
    toast.success(`Added "${book.title}"`);
    reset(defaultValues);
    setSelectedSubjectIds(new Set());
    setSavedCount((count) => count + 1);
  }

  const isbnField = register('isbn');

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          reset(defaultValues);
          setSelectedSubjectIds(new Set());
        }
      }}
    >
      <DialogTrigger render={<Button />}>+ Add Book</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Book</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={!!errors.isbn}>
              <FieldLabel htmlFor="isbn">ISBN</FieldLabel>
              <Input
                id="isbn"
                autoFocus
                aria-invalid={!!errors.isbn}
                {...isbnField}
                ref={(el) => {
                  isbnField.ref(el);
                  isbnRef.current = el;
                }}
                onBlur={(e) => {
                  isbnField.onBlur(e);
                  handleIsbnBlur(e.target.value);
                }}
              />
              <FieldError errors={errors.isbn ? [errors.isbn] : undefined} />
            </Field>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
              <FieldError errors={errors.title ? [errors.title] : undefined} />
            </Field>
            <Field data-invalid={!!errors.author}>
              <FieldLabel htmlFor="author">Author</FieldLabel>
              <Input id="author" aria-invalid={!!errors.author} {...register('author')} />
              <FieldError errors={errors.author ? [errors.author] : undefined} />
            </Field>
            <Field data-invalid={!!errors.coverUrl}>
              <FieldLabel htmlFor="coverUrl">Cover</FieldLabel>
              <div className="flex items-start gap-3">
                {coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="h-24 w-16 shrink-0 rounded object-cover"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <Input id="coverUrl" placeholder="Cover URL" {...register('coverUrl')} />
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
              <FieldError errors={errors.coverUrl ? [errors.coverUrl] : undefined} />
            </Field>
            <Field data-invalid={!!errors.publisher}>
              <FieldLabel htmlFor="publisher">Publisher</FieldLabel>
              <Input id="publisher" aria-invalid={!!errors.publisher} {...register('publisher')} />
              <FieldError errors={errors.publisher ? [errors.publisher] : undefined} />
            </Field>
            <Field data-invalid={!!errors.publishYear}>
              <FieldLabel htmlFor="publishYear">Year</FieldLabel>
              <Input
                id="publishYear"
                inputMode="numeric"
                aria-invalid={!!errors.publishYear}
                {...register('publishYear')}
              />
              <FieldError errors={errors.publishYear ? [errors.publishYear] : undefined} />
            </Field>
            <Field data-invalid={!!errors.format}>
              <FieldLabel htmlFor="format">Format</FieldLabel>
              <Controller
                control={control}
                name="format"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="format" aria-invalid={!!errors.format}>
                      <SelectValue>{(value: string) => formatLabel(value)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={errors.format ? [errors.format] : undefined} />
            </Field>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
