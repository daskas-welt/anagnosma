'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { FORMATS } from '@/lib/formats';

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
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Ref access is deferred to an effect (not read during render/submit) to satisfy
  // react-hooks/refs and avoid relying on RHF's setFocus, which does not reliably
  // reach this component stack's underlying DOM node (see task-11-report.md).
  useEffect(() => {
    if (savedCount > 0) {
      isbnRef.current?.focus();
    }
  }, [savedCount]);

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
      toast.error('Could not save the book.');
      return;
    }
    const book = await res.json();
    onCreated(book);
    toast.success(`Added "${book.title}"`);
    reset(defaultValues);
    setSavedCount((count) => count + 1);
  }

  const isbnField = register('isbn');

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset(defaultValues);
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
            <Field data-invalid={!!errors.publisher}>
              <FieldLabel htmlFor="publisher">Publisher</FieldLabel>
              <Input id="publisher" aria-invalid={!!errors.publisher} {...register('publisher')} />
              <FieldError errors={errors.publisher ? [errors.publisher] : undefined} />
            </Field>
            <Field data-invalid={!!errors.publishYear}>
              <FieldLabel htmlFor="publishYear">Publication Year</FieldLabel>
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
                      <SelectValue />
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
            <Button type="submit">Save</Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
