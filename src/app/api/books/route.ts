import { NextResponse } from 'next/server';
import {
  createBook,
  listBooks,
  type NewBookInput,
} from '@/lib/books/repository';
import { parseJsonBody, isUniqueViolation } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;
  const format = url.searchParams.get('format') ?? undefined;
  const subjectIdParam = url.searchParams.get('subjectId');
  const books = await listBooks(userId, {
    q,
    format,
    subjectId: subjectIdParam ? Number(subjectIdParam) : undefined,
  });
  return NextResponse.json(books);
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } =
    await parseJsonBody<Partial<NewBookInput>>(request);
  if (error) return error;
  if (!body.title || !body.author || !body.format) {
    return NextResponse.json(
      { error: 'title, author, and format are required' },
      { status: 400 },
    );
  }
  try {
    const book = await createBook(userId, body as NewBookInput);
    return NextResponse.json(book, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: 'you already have a book with this ISBN' },
        { status: 409 },
      );
    }
    throw err;
  }
}
