# Book Catalog MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Anagnosma single-user book catalog MVP — add/edit books and copies, search/filter/tag, per-copy reading state, and CSV import — per `docs/superpowers/specs/2026-08-02-book-catalog-mvp-design.md`.

**Architecture:** Next.js 14 App Router + TypeScript monolith (UI + API routes in one deployable). Postgres via Drizzle ORM. shadcn/ui + Tailwind for UI. No auth in v1 (single-user).

**Tech Stack:** Next.js 14 (App Router, TS), Tailwind CSS, shadcn/ui, Drizzle ORM + drizzle-kit, `postgres` (postgres.js) driver, Vitest, react-hook-form + zod, papaparse, next-themes, lucide-react, Vercel deploy target.

## Global Constraints

- No user auth in v1 — single-user by design (spec line 29-33).
- Tags apply at the book level; reading status/progress/rating/notes are per-copy (spec line 82-84).
- CSV import runs row-by-row; invalid rows are skipped and reported, never fatal to the whole batch (spec line 102-104, 172-174).
- Duplicate ISBN/title+author on add or import: warn, never block (spec line 105-107, 174).
- ISBN lookup failure falls back to a manual entry form pre-filled with the typed ISBN (spec line 169-171).
- Manual ISBN entry only in v1 — no camera/barcode scanning (spec line 88-90).
- Grid view is the default catalog layout (spec line 124-125).

---

## File Structure

```
anagnosma/
  package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.js
  drizzle.config.ts
  .env.example
  vitest.config.ts
  src/
    app/
      layout.tsx                 - root layout, ThemeProvider, Toaster
      globals.css
      page.tsx                   - Catalog page ("/")
      import/page.tsx            - CSV import page ("/import")
      tags/page.tsx               - Tags page ("/tags")
      api/
        books/route.ts            - GET (list/search), POST (create book+first copy)
        books/[id]/route.ts       - GET, PATCH, DELETE one book
        copies/route.ts           - POST (create additional copy)
        copies/[id]/route.ts      - PATCH, DELETE one copy
        tags/route.ts             - GET (list w/ counts), POST (create)
        tags/[id]/route.ts        - PATCH (rename), DELETE
        books/[id]/tags/route.ts  - POST (assign), DELETE (remove, ?tagId=)
        lookup/route.ts           - GET ?isbn= -> Google Books metadata
        import/route.ts           - POST CSV rows -> import result summary
    components/
      nav.tsx
      add-book-modal.tsx
      catalog-grid.tsx
      catalog-table.tsx
      catalog-filters.tsx
      book-detail-sheet.tsx
      star-rating.tsx
      csv-import-wizard.tsx
    lib/
      db/index.ts                - drizzle client singleton
      db/schema.ts                - books, copies, tags, bookTags tables
      books/repository.ts         - createBook, getBook, listBooks, updateBook, deleteBook
      books/duplicates.ts         - findDuplicate() pure function
      copies/repository.ts        - createCopy, updateCopy, deleteCopy
      tags/repository.ts          - createTag, listTagsWithCounts, renameTag, deleteTag, assignTag, removeTag
      google-books/client.ts      - lookupByIsbn() pure function
      csv/parse.ts                - parseCsv(), mapColumns(), HEADER_PRESETS
      csv/import.ts               - runImport() row-by-row
  drizzle/                        - generated SQL migrations
  tests/
    unit/duplicates.test.ts
    unit/google-books-client.test.ts
    unit/csv-parse.test.ts
    unit/csv-import.test.ts
    integration/books-api.test.ts
    integration/copies-api.test.ts
    integration/tags-api.test.ts
    integration/search.test.ts
    integration/import-api.test.ts
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.env.example`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: a running Next.js 14 App Router project on `npm run dev`, Tailwind wired, shadcn/ui initialized (components land in `src/components/ui/`), `npm test` runs Vitest.

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```
Answer "Yes" to overwrite when prompted (target dir has only docs/investigation files, no conflicting Next.js files).

- [ ] **Step 2: Init git**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js app"
```

- [ ] **Step 3: Init shadcn/ui**

```bash
npx shadcn@latest init -d
```
This creates `components.json` and `src/components/ui/`. Accept the defaults (New York style, Zinc base color, CSS variables).

- [ ] **Step 4: Install remaining core dependencies**

```bash
npm install drizzle-orm postgres papaparse next-themes lucide-react react-hook-form zod @hookform/resolvers
npm install -D drizzle-kit vitest @vitejs/plugin-react vite-tsconfig-paths @types/papaparse dotenv-cli
```

- [ ] **Step 5: Add `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 6: Add test script to `package.json`**

Add to `"scripts"`: `"test": "dotenv -e .env.test -- vitest run"`, `"test:watch": "dotenv -e .env.test -- vitest"`.

- [ ] **Step 7: Add `.env.example`**

```
DATABASE_URL=postgres://user:password@host/anagnosma
```

- [ ] **Step 8: Verify dev server boots**

Run: `npm run dev` (start in background, then curl or open `http://localhost:3000`, confirm the default Next.js page renders), then stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: install shadcn/ui, drizzle, vitest, and app dependencies"
```

---

### Task 2: Database Connection + Drizzle Config

**Files:**
- Create: `src/lib/db/index.ts`
- Create: `drizzle.config.ts`
- Modify: `.env.example` (already has `DATABASE_URL`)
- Create: `.env.test.example`

**Interfaces:**
- Consumes: `process.env.DATABASE_URL` (real DB), `process.env.DATABASE_URL` when `.env.test` is loaded (test DB).
- Produces: `db` — a Drizzle instance exported from `src/lib/db/index.ts`, used by every repository module in later tasks.

- [ ] **Step 1: Write `src/lib/db/index.ts`**

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

Note: `./schema` does not exist yet — created in Task 3. This file will not type-check until then; that's expected and resolved by the next task.

- [ ] **Step 2: Write `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Add `.env.test.example`**

```
DATABASE_URL=postgres://user:password@host/anagnosma_test
```

- [ ] **Step 4: Add db scripts to `package.json`**

Add to `"scripts"`: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:migrate:test": "dotenv -e .env.test -- drizzle-kit migrate"`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add drizzle db client and config"
```

*(No automated test for this step — it's config/wiring, verified functionally once Task 3's schema and migration exist.)*

---

### Task 3: Schema Definition + Migration

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `drizzle/*` (generated)

**Interfaces:**
- Produces: `books`, `copies`, `tags`, `bookTags` Drizzle table objects — the only interface later repository tasks import from this file.

- [ ] **Step 1: Write `src/lib/db/schema.ts`**

```ts
import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  isbn: text('isbn').unique(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  coverUrl: text('cover_url'),
  publisher: text('publisher'),
  publishYear: integer('publish_year'),
  pageCount: integer('page_count'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const copies = pgTable('copies', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  format: text('format').notNull(),
  condition: text('condition'),
  purchasePrice: numeric('purchase_price'),
  purchaseDate: date('purchase_date'),
  shelfLocation: text('shelf_location'),
  status: text('status').notNull().default('to-read'),
  progressPage: integer('progress_page'),
  rating: integer('rating'),
  notes: text('notes'),
  dateStarted: date('date_started'),
  dateFinished: date('date_finished'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const bookTags = pgTable(
  'book_tags',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.bookId, t.tagId] }),
  }),
);
```

- [ ] **Step 2: Generate migration**

Run: `npm run db:generate` — creates SQL under `drizzle/`.
Expected: a new `drizzle/0000_*.sql` file containing `CREATE TABLE` statements for all four tables.

- [ ] **Step 3: Provision dev and test databases**

Create two Postgres databases (e.g. two free Neon projects/branches, or two local databases): one for `.env` (`DATABASE_URL`), one for `.env.test` (`DATABASE_URL`). Copy `.env.example` to `.env` and `.env.test.example` to `.env.test`, filling in real connection strings for each.

- [ ] **Step 4: Run migration against both databases**

Run: `npm run db:migrate` (dev DB), then `npm run db:migrate:test` (test DB).
Expected: both commands report the migration applied with no errors.

- [ ] **Step 5: Verify tables exist**

Run: `dotenv -e .env.test -- node -e "require('postgres')(process.env.DATABASE_URL)\`select table_name from information_schema.tables where table_schema='public'\`.then(r=>{console.log(r.map(x=>x.table_name)); process.exit(0)})"`
Expected: output includes `books`, `copies`, `tags`, `book_tags`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: define books/copies/tags schema and generate migration"
```

---

### Task 4: Books Repository

**Files:**
- Create: `src/lib/books/repository.ts`
- Test: `tests/integration/books-repository.test.ts`

**Interfaces:**
- Consumes: `db` from `src/lib/db/index.ts`, `books`/`copies` from `src/lib/db/schema.ts`.
- Produces (used by Task 5's API routes and later UI):
  - `createBook(input: NewBookInput): Promise<BookWithCopies>`
  - `getBook(id: number): Promise<BookWithCopies | undefined>`
  - `listBooks(): Promise<BookWithCopies[]>`
  - `updateBook(id: number, input: Partial<NewBookFields>): Promise<BookWithCopies | undefined>`
  - `deleteBook(id: number): Promise<void>`
  - Types: `NewBookInput = { isbn?: string; title: string; author: string; coverUrl?: string; publisher?: string; publishYear?: number; pageCount?: number; description?: string; format: string }` (format is required to create the first copy), `BookWithCopies = typeof books.$inferSelect & { copies: (typeof copies.$inferSelect)[] }`

- [ ] **Step 1: Write failing integration test**

```ts
// tests/integration/books-repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import { createBook, getBook, listBooks, updateBook, deleteBook } from '@/lib/books/repository';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('books repository', () => {
  it('creates a book with its first copy', async () => {
    const created = await createBook({
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    expect(created.title).toBe('Dune');
    expect(created.copies).toHaveLength(1);
    expect(created.copies[0].format).toBe('paperback');
    expect(created.copies[0].status).toBe('to-read');
  });

  it('gets a book by id with its copies', async () => {
    const created = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'hardcover' });
    const fetched = await getBook(created.id);
    expect(fetched?.title).toBe('Dune');
    expect(fetched?.copies).toHaveLength(1);
  });

  it('returns undefined for a missing book', async () => {
    const fetched = await getBook(999999);
    expect(fetched).toBeUndefined();
  });

  it('lists all books', async () => {
    await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const list = await listBooks();
    expect(list.map((b) => b.title).sort()).toEqual(['Dune', 'Foundation']);
  });

  it('updates a book', async () => {
    const created = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const updated = await updateBook(created.id, { title: 'Dune (Deluxe)' });
    expect(updated?.title).toBe('Dune (Deluxe)');
  });

  it('deletes a book and its copies', async () => {
    const created = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await deleteBook(created.id);
    expect(await getBook(created.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/books-repository.test.ts`
Expected: FAIL — `src/lib/books/repository.ts` does not exist.

- [ ] **Step 3: Write `src/lib/books/repository.ts`**

```ts
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

export type NewBookInput = {
  isbn?: string;
  title: string;
  author: string;
  coverUrl?: string;
  publisher?: string;
  publishYear?: number;
  pageCount?: number;
  description?: string;
  format: string;
};

export type BookWithCopies = typeof books.$inferSelect & {
  copies: (typeof copies.$inferSelect)[];
};

export async function createBook(input: NewBookInput): Promise<BookWithCopies> {
  const { format, ...bookFields } = input;
  const [book] = await db.insert(books).values(bookFields).returning();
  const [copy] = await db
    .insert(copies)
    .values({ bookId: book.id, format })
    .returning();
  return { ...book, copies: [copy] };
}

export async function getBook(id: number): Promise<BookWithCopies | undefined> {
  const [book] = await db.select().from(books).where(eq(books.id, id));
  if (!book) return undefined;
  const bookCopies = await db.select().from(copies).where(eq(copies.bookId, id));
  return { ...book, copies: bookCopies };
}

export async function listBooks(): Promise<BookWithCopies[]> {
  const allBooks = await db.select().from(books);
  const allCopies = await db.select().from(copies);
  return allBooks.map((book) => ({
    ...book,
    copies: allCopies.filter((c) => c.bookId === book.id),
  }));
}

export async function updateBook(
  id: number,
  input: Partial<Omit<NewBookInput, 'format'>>,
): Promise<BookWithCopies | undefined> {
  const [updated] = await db.update(books).set(input).where(eq(books.id, id)).returning();
  if (!updated) return undefined;
  return getBook(id);
}

export async function deleteBook(id: number): Promise<void> {
  await db.delete(books).where(eq(books.id, id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/books-repository.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add books repository with CRUD operations"
```

---

### Task 5: Books API Routes

**Files:**
- Create: `src/app/api/books/route.ts`
- Create: `src/app/api/books/[id]/route.ts`
- Test: `tests/integration/books-api.test.ts`

**Interfaces:**
- Consumes: `createBook`, `getBook`, `listBooks`, `updateBook`, `deleteBook` from `@/lib/books/repository`.
- Produces: `GET /api/books`, `POST /api/books`, `GET /api/books/:id`, `PATCH /api/books/:id`, `DELETE /api/books/:id` — the HTTP contract every UI task (11-14) calls through `fetch`.

- [ ] **Step 1: Write failing integration test**

```ts
// tests/integration/books-api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import { GET, POST } from '@/app/api/books/route';
import { GET as GET_ONE, PATCH, DELETE } from '@/app/api/books/[id]/route';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

function req(body?: unknown, url = 'http://localhost/api/books') {
  return new Request(url, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('books API', () => {
  it('POST creates a book', async () => {
    const res = await POST(req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Dune');
    expect(body.copies).toHaveLength(1);
  });

  it('POST rejects a missing title', async () => {
    const res = await POST(req({ author: 'Frank Herbert', format: 'paperback' }));
    expect(res.status).toBe(400);
  });

  it('GET lists books', async () => {
    await POST(req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }));
    const res = await GET(new Request('http://localhost/api/books'));
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('GET one returns 404 for missing book', async () => {
    const res = await GET_ONE(new Request('http://localhost/api/books/999999'), {
      params: Promise.resolve({ id: '999999' }),
    });
    expect(res.status).toBe(404);
  });

  it('PATCH updates a book', async () => {
    const created = await (await POST(req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }))).json();
    const res = await PATCH(
      new Request(`http://localhost/api/books/${created.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Dune (Deluxe)' }),
      }),
      { params: Promise.resolve({ id: String(created.id) }) },
    );
    const body = await res.json();
    expect(body.title).toBe('Dune (Deluxe)');
  });

  it('DELETE removes a book', async () => {
    const created = await (await POST(req({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' }))).json();
    const res = await DELETE(new Request(`http://localhost/api/books/${created.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/books-api.test.ts`
Expected: FAIL — route files don't exist.

- [ ] **Step 3: Write `src/app/api/books/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createBook, listBooks } from '@/lib/books/repository';

export async function GET() {
  const books = await listBooks();
  return NextResponse.json(books);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.title || !body.author || !body.format) {
    return NextResponse.json(
      { error: 'title, author, and format are required' },
      { status: 400 },
    );
  }
  const book = await createBook(body);
  return NextResponse.json(book, { status: 201 });
}
```

- [ ] **Step 4: Write `src/app/api/books/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { deleteBook, getBook, updateBook } from '@/lib/books/repository';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const book = await getBook(Number(id));
  if (!book) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(book);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const updated = await updateBook(Number(id), body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteBook(Number(id));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/integration/books-api.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add books API routes"
```

---

### Task 6: Copies Repository + API Routes

**Files:**
- Create: `src/lib/copies/repository.ts`
- Create: `src/app/api/copies/route.ts`
- Create: `src/app/api/copies/[id]/route.ts`
- Test: `tests/integration/copies-api.test.ts`

**Interfaces:**
- Consumes: `db`, `books`/`copies` from `src/lib/db/schema.ts`.
- Produces: `createCopy(input: NewCopyInput): Promise<Copy>`, `updateCopy(id, input): Promise<Copy | undefined>`, `deleteCopy(id): Promise<void>`; HTTP: `POST /api/copies`, `PATCH /api/copies/:id`, `DELETE /api/copies/:id`. `NewCopyInput = { bookId: number; format: string; condition?: string; purchasePrice?: string; purchaseDate?: string; shelfLocation?: string; status?: string; progressPage?: number; rating?: number; notes?: string; dateStarted?: string; dateFinished?: string }`.

- [ ] **Step 1: Write failing integration test**

```ts
// tests/integration/copies-api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import { createBook } from '@/lib/books/repository';
import { POST } from '@/app/api/copies/route';
import { PATCH, DELETE } from '@/app/api/copies/[id]/route';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('copies API', () => {
  it('POST adds a second copy to an existing book', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const res = await POST(
      new Request('http://localhost/api/copies', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.id, format: 'ebook' }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.format).toBe('ebook');
    expect(body.bookId).toBe(book.id);
  });

  it('PATCH updates copy reading state', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await PATCH(
      new Request(`http://localhost/api/copies/${copyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'reading', progressPage: 120, rating: 5 }),
      }),
      { params: Promise.resolve({ id: String(copyId) }) },
    );
    const body = await res.json();
    expect(body.status).toBe('reading');
    expect(body.progressPage).toBe(120);
    expect(body.rating).toBe(5);
  });

  it('DELETE removes a copy without deleting the book', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await DELETE(new Request(`http://localhost/api/copies/${copyId}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(copyId) }),
    });
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/copies-api.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write `src/lib/copies/repository.ts`**

```ts
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { copies } from '@/lib/db/schema';

export type NewCopyInput = {
  bookId: number;
  format: string;
  condition?: string;
  purchasePrice?: string;
  purchaseDate?: string;
  shelfLocation?: string;
  status?: string;
  progressPage?: number;
  rating?: number;
  notes?: string;
  dateStarted?: string;
  dateFinished?: string;
};

export async function createCopy(input: NewCopyInput) {
  const [copy] = await db.insert(copies).values(input).returning();
  return copy;
}

export async function updateCopy(id: number, input: Partial<Omit<NewCopyInput, 'bookId'>>) {
  const [updated] = await db
    .update(copies)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(copies.id, id))
    .returning();
  return updated;
}

export async function deleteCopy(id: number) {
  await db.delete(copies).where(eq(copies.id, id));
}
```

- [ ] **Step 4: Write `src/app/api/copies/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createCopy } from '@/lib/copies/repository';

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.bookId || !body.format) {
    return NextResponse.json({ error: 'bookId and format are required' }, { status: 400 });
  }
  const copy = await createCopy(body);
  return NextResponse.json(copy, { status: 201 });
}
```

- [ ] **Step 5: Write `src/app/api/copies/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { deleteCopy, updateCopy } from '@/lib/copies/repository';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const updated = await updateCopy(Number(id), body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteCopy(Number(id));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/integration/copies-api.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add copies repository and API routes"
```

---

### Task 7: Tags Repository + API Routes

**Files:**
- Create: `src/lib/tags/repository.ts`
- Create: `src/app/api/tags/route.ts`
- Create: `src/app/api/tags/[id]/route.ts`
- Create: `src/app/api/books/[id]/tags/route.ts`
- Test: `tests/integration/tags-api.test.ts`

**Interfaces:**
- Consumes: `db`, `books`/`tags`/`bookTags` from schema.
- Produces: `createTag(name)`, `listTagsWithCounts(): Promise<{id, name, bookCount}[]>`, `renameTag(id, name)`, `deleteTag(id)`, `assignTag(bookId, tagId)`, `removeTag(bookId, tagId)`; HTTP: `GET/POST /api/tags`, `PATCH/DELETE /api/tags/:id`, `POST /api/books/:id/tags` (body `{tagId}`), `DELETE /api/books/:id/tags?tagId=`.

- [ ] **Step 1: Write failing integration test**

```ts
// tests/integration/tags-api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, tags, bookTags } from '@/lib/db/schema';
import { createBook } from '@/lib/books/repository';
import { GET, POST } from '@/app/api/tags/route';
import { PATCH, DELETE } from '@/app/api/tags/[id]/route';
import { POST as ASSIGN, DELETE as UNASSIGN } from '@/app/api/books/[id]/tags/route';

beforeEach(async () => {
  await db.delete(bookTags);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(tags);
});

describe('tags API', () => {
  it('POST creates a tag', async () => {
    const res = await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }));
    expect(res.status).toBe(201);
    expect((await res.json()).name).toBe('sci-fi');
  });

  it('assigns a tag to a book and counts it in GET /api/tags', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const tag = await (await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/tags`, { method: 'POST', body: JSON.stringify({ tagId: tag.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const list = await (await GET()).json();
    expect(list.find((t: any) => t.id === tag.id).bookCount).toBe(1);
  });

  it('removes a tag from a book', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const tag = await (await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/tags`, { method: 'POST', body: JSON.stringify({ tagId: tag.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    await UNASSIGN(
      new Request(`http://localhost/api/books/${book.id}/tags?tagId=${tag.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const list = await (await GET()).json();
    expect(list.find((t: any) => t.id === tag.id).bookCount).toBe(0);
  });

  it('renames a tag', async () => {
    const tag = await (await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await PATCH(
      new Request(`http://localhost/api/tags/${tag.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'science-fiction' }) }),
      { params: Promise.resolve({ id: String(tag.id) }) },
    );
    expect((await res.json()).name).toBe('science-fiction');
  });

  it('deletes a tag', async () => {
    const tag = await (await POST(new Request('http://localhost/api/tags', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await DELETE(new Request(`http://localhost/api/tags/${tag.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(tag.id) }),
    });
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/tags-api.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write `src/lib/tags/repository.ts`**

```ts
import { eq, and, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tags, bookTags } from '@/lib/db/schema';

export async function createTag(name: string) {
  const [tag] = await db.insert(tags).values({ name }).returning();
  return tag;
}

export async function listTagsWithCounts() {
  const rows = await db
    .select({ id: tags.id, name: tags.name, bookCount: count(bookTags.bookId) })
    .from(tags)
    .leftJoin(bookTags, eq(bookTags.tagId, tags.id))
    .groupBy(tags.id, tags.name);
  return rows.map((r) => ({ ...r, bookCount: Number(r.bookCount) }));
}

export async function renameTag(id: number, name: string) {
  const [updated] = await db.update(tags).set({ name }).where(eq(tags.id, id)).returning();
  return updated;
}

export async function deleteTag(id: number) {
  await db.delete(tags).where(eq(tags.id, id));
}

export async function assignTag(bookId: number, tagId: number) {
  await db.insert(bookTags).values({ bookId, tagId }).onConflictDoNothing();
}

export async function removeTag(bookId: number, tagId: number) {
  await db.delete(bookTags).where(and(eq(bookTags.bookId, bookId), eq(bookTags.tagId, tagId)));
}
```

- [ ] **Step 4: Write `src/app/api/tags/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createTag, listTagsWithCounts } from '@/lib/tags/repository';

export async function GET() {
  return NextResponse.json(await listTagsWithCounts());
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const tag = await createTag(body.name);
  return NextResponse.json(tag, { status: 201 });
}
```

- [ ] **Step 5: Write `src/app/api/tags/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { deleteTag, renameTag } from '@/lib/tags/repository';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const updated = await renameTag(Number(id), body.name);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteTag(Number(id));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 6: Write `src/app/api/books/[id]/tags/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { assignTag, removeTag } from '@/lib/tags/repository';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  await assignTag(Number(id), Number(body.tagId));
  return new NextResponse(null, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const tagId = new URL(request.url).searchParams.get('tagId');
  await removeTag(Number(id), Number(tagId));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- tests/integration/tags-api.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add tags repository and API routes"
```

---

### Task 8: Duplicate Detection

**Files:**
- Create: `src/lib/books/duplicates.ts`
- Test: `tests/unit/duplicates.test.ts`

**Interfaces:**
- Produces: `findDuplicate(candidate: { isbn?: string; title: string; author: string }, existing: { id: number; isbn: string | null; title: string; author: string }[]): { id: number; reason: 'isbn' | 'title-author' } | null` — used by Task 11 (add-book modal) and Task 17 (CSV import) to warn, never block.

- [ ] **Step 1: Write failing unit test**

```ts
// tests/unit/duplicates.test.ts
import { describe, it, expect } from 'vitest';
import { findDuplicate } from '@/lib/books/duplicates';

const existing = [
  { id: 1, isbn: '9780441013593', title: 'Dune', author: 'Frank Herbert' },
  { id: 2, isbn: null, title: 'Foundation', author: 'Isaac Asimov' },
];

describe('findDuplicate', () => {
  it('matches on isbn', () => {
    const result = findDuplicate({ isbn: '9780441013593', title: 'Dune (reprint)', author: 'Herbert, F.' }, existing);
    expect(result).toEqual({ id: 1, reason: 'isbn' });
  });

  it('matches on case-insensitive title+author when isbn is absent', () => {
    const result = findDuplicate({ title: 'FOUNDATION', author: 'isaac asimov' }, existing);
    expect(result).toEqual({ id: 2, reason: 'title-author' });
  });

  it('returns null when nothing matches', () => {
    const result = findDuplicate({ title: 'Neuromancer', author: 'William Gibson' }, existing);
    expect(result).toBeNull();
  });

  it('does not match title alone without matching author', () => {
    const result = findDuplicate({ title: 'Dune', author: 'Someone Else' }, existing);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/duplicates.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `src/lib/books/duplicates.ts`**

```ts
export type DuplicateCandidate = { isbn?: string; title: string; author: string };
export type ExistingBook = { id: number; isbn: string | null; title: string; author: string };
export type DuplicateMatch = { id: number; reason: 'isbn' | 'title-author' };

export function findDuplicate(
  candidate: DuplicateCandidate,
  existing: ExistingBook[],
): DuplicateMatch | null {
  if (candidate.isbn) {
    const isbnMatch = existing.find((b) => b.isbn === candidate.isbn);
    if (isbnMatch) return { id: isbnMatch.id, reason: 'isbn' };
  }
  const normalizedTitle = candidate.title.trim().toLowerCase();
  const normalizedAuthor = candidate.author.trim().toLowerCase();
  const titleAuthorMatch = existing.find(
    (b) => b.title.trim().toLowerCase() === normalizedTitle && b.author.trim().toLowerCase() === normalizedAuthor,
  );
  if (titleAuthorMatch) return { id: titleAuthorMatch.id, reason: 'title-author' };
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/duplicates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add duplicate book detection"
```

---

### Task 9: Google Books ISBN Lookup

**Files:**
- Create: `src/lib/google-books/client.ts`
- Create: `src/app/api/lookup/route.ts`
- Test: `tests/unit/google-books-client.test.ts`

**Interfaces:**
- Produces: `lookupByIsbn(isbn: string, fetchImpl?: typeof fetch): Promise<BookMetadata | null>` where `BookMetadata = { isbn: string; title: string; author: string; coverUrl?: string; publisher?: string; publishYear?: number; pageCount?: number; description?: string }`; HTTP: `GET /api/lookup?isbn=` returning the same shape or 404.

- [ ] **Step 1: Write failing unit test**

```ts
// tests/unit/google-books-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { lookupByIsbn } from '@/lib/google-books/client';

const sampleResponse = {
  totalItems: 1,
  items: [
    {
      volumeInfo: {
        title: 'Dune',
        authors: ['Frank Herbert'],
        publisher: 'Ace Books',
        publishedDate: '1990-09-01',
        pageCount: 412,
        description: 'A desert planet...',
        imageLinks: { thumbnail: 'http://books.google.com/dune.jpg' },
      },
    },
  ],
};

describe('lookupByIsbn', () => {
  it('parses a successful Google Books response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => sampleResponse });
    const result = await lookupByIsbn('9780441013593', fetchImpl as any);
    expect(result).toEqual({
      isbn: '9780441013593',
      title: 'Dune',
      author: 'Frank Herbert',
      coverUrl: 'http://books.google.com/dune.jpg',
      publisher: 'Ace Books',
      publishYear: 1990,
      pageCount: 412,
      description: 'A desert planet...',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9780441013593',
    );
  });

  it('returns null when no items are found', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ totalItems: 0 }) });
    const result = await lookupByIsbn('0000000000', fetchImpl as any);
    expect(result).toBeNull();
  });

  it('returns null on a non-ok response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const result = await lookupByIsbn('9780441013593', fetchImpl as any);
    expect(result).toBeNull();
  });

  it('joins multiple authors with a comma', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalItems: 1,
        items: [{ volumeInfo: { title: 'Good Omens', authors: ['Terry Pratchett', 'Neil Gaiman'] } }],
      }),
    });
    const result = await lookupByIsbn('9780060853976', fetchImpl as any);
    expect(result?.author).toBe('Terry Pratchett, Neil Gaiman');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/google-books-client.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `src/lib/google-books/client.ts`**

```ts
export type BookMetadata = {
  isbn: string;
  title: string;
  author: string;
  coverUrl?: string;
  publisher?: string;
  publishYear?: number;
  pageCount?: number;
  description?: string;
};

export async function lookupByIsbn(
  isbn: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BookMetadata | null> {
  const res = await fetchImpl(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.totalItems || !data.items?.length) return null;
  const info = data.items[0].volumeInfo;
  const publishYear = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : undefined;
  return {
    isbn,
    title: info.title,
    author: (info.authors ?? []).join(', '),
    coverUrl: info.imageLinks?.thumbnail,
    publisher: info.publisher,
    publishYear: Number.isNaN(publishYear) ? undefined : publishYear,
    pageCount: info.pageCount,
    description: info.description,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/google-books-client.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write `src/app/api/lookup/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { lookupByIsbn } from '@/lib/google-books/client';

export async function GET(request: Request) {
  const isbn = new URL(request.url).searchParams.get('isbn');
  if (!isbn) return NextResponse.json({ error: 'isbn query param is required' }, { status: 400 });
  const result = await lookupByIsbn(isbn);
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(result);
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Google Books ISBN lookup client and API route"
```

---

### Task 10: App Shell (Nav, Theme, Layout)

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/nav.tsx`
- Modify: `src/app/globals.css` (only if shadcn init didn't already add CSS variables — verify, don't duplicate)

**Interfaces:**
- Consumes: shadcn `Button` (installed this task).
- Produces: `<Nav />` rendered in root layout on every route; `next-themes` `ThemeProvider` wraps the app; `Toaster` (Sonner) mounted globally for later save/error feedback (Task 11+).

- [ ] **Step 1: Install shadcn components needed for the shell**

```bash
npx shadcn@latest add button sonner
```

- [ ] **Step 2: Write `src/components/nav.tsx`**

```tsx
import Link from 'next/link';

export function Nav() {
  return (
    <header className="border-b">
      <div className="flex items-center gap-6 px-6 py-3">
        <Link href="/" className="text-lg font-semibold">
          📚 Anagnosma
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/">Catalog</Link>
          <Link href="/import">Import</Link>
          <Link href="/tags">Tags</Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anagnosma',
  description: 'A memory aid for readers with large book collections.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Nav />
          <main className="p-6">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, open `http://localhost:3000`, confirm the nav bar renders with the three links and the page doesn't error. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add app shell with nav and theme provider"
```

*(No automated test — this is static layout markup, verified visually.)*

---

### Task 11: Add-Book Modal

**Files:**
- Create: `src/components/add-book-modal.tsx`
- Modify: `src/app/page.tsx` (render the modal's trigger button)

**Interfaces:**
- Consumes: `GET /api/lookup?isbn=` (Task 9), `POST /api/books` (Task 5).
- Produces: `<AddBookModal onCreated={(book: BookWithCopies) => void} />` — Task 12 passes a callback that prepends the new book to catalog state.

- [ ] **Step 1: Install shadcn components**

```bash
npx shadcn@latest add dialog form input label select
```

- [ ] **Step 2: Write `src/components/add-book-modal.tsx`**

```tsx
'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { BookWithCopies } from '@/lib/books/repository';

const schema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  format: z.string().min(1, 'Format is required'),
  publisher: z.string().optional(),
  coverUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddBookModal({ onCreated }: { onCreated: (book: BookWithCopies) => void }) {
  const [open, setOpen] = useState(false);
  const isbnRef = useRef<HTMLInputElement>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isbn: '', title: '', author: '', format: 'paperback', publisher: '', coverUrl: '' },
  });

  async function handleIsbnBlur(isbn: string) {
    if (!isbn) return;
    const res = await fetch(`/api/lookup?isbn=${encodeURIComponent(isbn)}`);
    if (!res.ok) {
      toast.error('No match found for that ISBN — fill in the details manually.');
      return;
    }
    const meta = await res.json();
    form.setValue('title', meta.title);
    form.setValue('author', meta.author);
    if (meta.publisher) form.setValue('publisher', meta.publisher);
    if (meta.coverUrl) form.setValue('coverUrl', meta.coverUrl);
  }

  async function onSubmit(values: FormValues) {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error('Could not save the book.');
      return;
    }
    const book = await res.json();
    onCreated(book);
    toast.success(`Added "${book.title}"`);
    form.reset({ isbn: '', title: '', author: '', format: 'paperback', publisher: '', coverUrl: '' });
    isbnRef.current?.focus();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Add Book</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Book</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISBN</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      ref={isbnRef}
                      autoFocus
                      onBlur={(e) => {
                        field.onBlur();
                        handleIsbnBlur(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="paperback, hardcover, ebook, audiobook" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000`, click "+ Add Book" (rendered once Task 12 wires it into the page), type a real ISBN (e.g. `9780441013593`), confirm on blur the title/author auto-fill, save, and confirm a success toast appears. Then try an invalid ISBN and confirm the error toast appears and the form stays editable. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add book modal with ISBN auto-fill and manual fallback"
```

*(Covered by manual/exploratory testing per spec line 182-184 — real Google Books API behavior is not usefully mocked at the UI layer; the underlying `lookupByIsbn` logic is already unit-tested in Task 9.)*

---

### Task 12: Catalog Page (Grid/List)

**Files:**
- Create: `src/components/catalog-grid.tsx`
- Create: `src/components/catalog-table.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `GET /api/books` (Task 5), `<AddBookModal>` (Task 11), `<BookDetailSheet>` (Task 14, wired here as a click handler stub that Task 14 fills in).
- Produces: `src/app/page.tsx` renders the full catalog: nav (from layout) + add-book button + view toggle + grid/table.

- [ ] **Step 1: Install shadcn components**

```bash
npx shadcn@latest add tabs card table badge
```

- [ ] **Step 2: Write `src/components/catalog-grid.tsx`**

```tsx
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import type { BookWithCopies } from '@/lib/books/repository';

export function CatalogGrid({ books, onSelect }: { books: BookWithCopies[]; onSelect: (id: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {books.map((book) => (
        <Card key={book.id} className="cursor-pointer" onClick={() => onSelect(book.id)}>
          <CardContent className="p-2">
            {book.coverUrl ? (
              <Image src={book.coverUrl} alt={book.title} width={120} height={180} className="mx-auto h-auto w-full" />
            ) : (
              <div className="flex h-[180px] items-center justify-center bg-muted text-xs text-muted-foreground">
                No cover
              </div>
            )}
            <p className="mt-2 truncate text-sm font-medium">{book.title}</p>
            <p className="truncate text-xs text-muted-foreground">{book.author}</p>
            <p className="text-xs text-muted-foreground">{book.copies[0]?.status}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/catalog-table.tsx`**

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BookWithCopies } from '@/lib/books/repository';

export function CatalogTable({ books, onSelect }: { books: BookWithCopies[]; onSelect: (id: number) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Shelf</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {books.map((book) => (
          <TableRow key={book.id} className="cursor-pointer" onClick={() => onSelect(book.id)}>
            <TableCell>{book.title}</TableCell>
            <TableCell>{book.author}</TableCell>
            <TableCell>{book.copies[0]?.status}</TableCell>
            <TableCell>{book.copies[0]?.rating ?? '—'}</TableCell>
            <TableCell>{book.copies[0]?.shelfLocation ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Write `src/app/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AddBookModal } from '@/components/add-book-modal';
import { CatalogGrid } from '@/components/catalog-grid';
import { CatalogTable } from '@/components/catalog-table';
import { BookDetailSheet } from '@/components/book-detail-sheet';
import type { BookWithCopies } from '@/lib/books/repository';

export default function CatalogPage() {
  const [books, setBooks] = useState<BookWithCopies[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function refresh() {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`/api/books${params}`);
    setBooks(await res.json());
  }

  useEffect(() => {
    refresh();
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input placeholder="Search title or author..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
        <AddBookModal onCreated={(book) => setBooks((prev) => [book, ...prev])} />
      </div>
      <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'list')}>
        <TabsList>
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
      </Tabs>
      {view === 'grid' ? (
        <CatalogGrid books={books} onSelect={setSelectedId} />
      ) : (
        <CatalogTable books={books} onSelect={setSelectedId} />
      )}
      <BookDetailSheet
        bookId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={refresh}
      />
    </div>
  );
}
```

Note: `search` via `?q=` param wiring is added to `/api/books` in Task 13; `BookDetailSheet` is built in Task 14. Until those land, this page renders with an inert search box and a selection that opens nothing — expected intermediate state, resolved by the next two tasks.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `http://localhost:3000`, add two books via the modal, confirm they appear in the grid, toggle to list view and confirm the table renders the same books. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add catalog page with grid/list views"
```

---

### Task 13: Search + Filters

**Files:**
- Modify: `src/lib/books/repository.ts` (extend `listBooks` to accept filters)
- Modify: `src/app/api/books/route.ts` (parse query params)
- Create: `src/components/catalog-filters.tsx`
- Modify: `src/app/page.tsx` (render filters, pass params through)
- Test: `tests/integration/search.test.ts`

**Interfaces:**
- Consumes: `tags`/`bookTags` from schema (for tag filter).
- Produces: `listBooks(filters?: { q?: string; status?: string; format?: string; tagId?: number }): Promise<BookWithCopies[]>`; `GET /api/books?q=&status=&format=&tagId=`.

- [ ] **Step 1: Write failing integration test**

```ts
// tests/integration/search.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, tags, bookTags } from '@/lib/db/schema';
import { createBook } from '@/lib/books/repository';
import { createTag, assignTag } from '@/lib/tags/repository';
import { GET } from '@/app/api/books/route';

beforeEach(async () => {
  await db.delete(bookTags);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(tags);
});

describe('book search/filter', () => {
  it('filters by title/author text', async () => {
    await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const res = await GET(new Request('http://localhost/api/books?q=dune'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });

  it('filters by status', async () => {
    const dune = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    await db.update(copies).set({ status: 'reading' }).where(undefined as never);
    const res = await GET(new Request('http://localhost/api/books?status=reading'));
    const body = await res.json();
    expect(body.every((b: any) => b.copies.some((c: any) => c.status === 'reading'))).toBe(true);
  });

  it('filters by format', async () => {
    await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const res = await GET(new Request('http://localhost/api/books?format=ebook'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Foundation');
  });

  it('filters by tag', async () => {
    const dune = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const tag = await createTag('sci-fi');
    await assignTag(dune.id, tag.id);
    const res = await GET(new Request(`http://localhost/api/books?tagId=${tag.id}`));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });
});
```

Fix the status test's broken `.where(undefined as never)` — replace with a real update targeting Dune's copy:

```ts
  it('filters by status', async () => {
    const dune = await createBook({ title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook({ title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    await db.update(copies).set({ status: 'reading' }).where(eq(copies.bookId, dune.id));
    const res = await GET(new Request('http://localhost/api/books?status=reading'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });
```

Add `import { eq } from 'drizzle-orm';` to the test file's imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/search.test.ts`
Expected: FAIL — `listBooks` doesn't accept filters yet, `q`/`status`/`format`/`tagId` are ignored.

- [ ] **Step 3: Extend `src/lib/books/repository.ts`**

Replace the `listBooks` function with:

```ts
import { eq, and, or, ilike, inArray } from 'drizzle-orm';
import { bookTags } from '@/lib/db/schema';

export type BookFilters = {
  q?: string;
  status?: string;
  format?: string;
  tagId?: number;
};

export async function listBooks(filters: BookFilters = {}): Promise<BookWithCopies[]> {
  let bookIds: number[] | undefined;

  if (filters.tagId) {
    const rows = await db.select({ bookId: bookTags.bookId }).from(bookTags).where(eq(bookTags.tagId, filters.tagId));
    bookIds = rows.map((r) => r.bookId);
  }

  const bookConditions = [
    filters.q ? or(ilike(books.title, `%${filters.q}%`), ilike(books.author, `%${filters.q}%`)) : undefined,
    bookIds ? inArray(books.id, bookIds.length ? bookIds : [-1]) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const allBooks = await db
    .select()
    .from(books)
    .where(bookConditions.length ? and(...bookConditions) : undefined);

  const copyConditions = [
    filters.status ? eq(copies.status, filters.status) : undefined,
    filters.format ? eq(copies.format, filters.format) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const allCopies = await db
    .select()
    .from(copies)
    .where(copyConditions.length ? and(...copyConditions) : undefined);

  const copiesByBook = new Map<number, (typeof copies.$inferSelect)[]>();
  for (const copy of allCopies) {
    copiesByBook.set(copy.bookId, [...(copiesByBook.get(copy.bookId) ?? []), copy]);
  }

  return allBooks
    .map((book) => ({ ...book, copies: copiesByBook.get(book.id) ?? [] }))
    .filter((book) => (filters.status || filters.format ? book.copies.length > 0 : true));
}
```

Move the `import { eq } from 'drizzle-orm';` at the top of the file to `import { eq, and, or, ilike, inArray } from 'drizzle-orm';` (single import line — remove the duplicate added above and consolidate).

- [ ] **Step 4: Update `src/app/api/books/route.ts` GET handler**

```ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const format = url.searchParams.get('format') ?? undefined;
  const tagIdParam = url.searchParams.get('tagId');
  const books = await listBooks({ q, status, format, tagId: tagIdParam ? Number(tagIdParam) : undefined });
  return NextResponse.json(books);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/integration/search.test.ts`
Expected: PASS (4 tests). Also re-run `npm test -- tests/integration/books-api.test.ts` to confirm no regression.

- [ ] **Step 6: Write `src/components/catalog-filters.tsx`**

```tsx
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUSES = ['to-read', 'reading', 'read', 'dnf'];
const FORMATS = ['hardcover', 'paperback', 'ebook', 'audiobook'];

export function CatalogFilters({
  status,
  format,
  onStatusChange,
  onFormatChange,
}: {
  status: string;
  format: string;
  onStatusChange: (value: string) => void;
  onFormatChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={format} onValueChange={onFormatChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All formats</SelectItem>
          {FORMATS.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 7: Wire filters into `src/app/page.tsx`**

Add `const [status, setStatus] = useState('all');` and `const [format, setFormat] = useState('all');`. Update `refresh()`:

```tsx
  async function refresh() {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    if (format !== 'all') params.set('format', format);
    const res = await fetch(`/api/books?${params.toString()}`);
    setBooks(await res.json());
  }
```

Update the `useEffect` dependency array to `[query, status, format]`, and render `<CatalogFilters status={status} format={format} onStatusChange={setStatus} onFormatChange={setFormat} />` next to the view `Tabs`.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, add a couple of books with different formats/statuses via the modal and the copy editor (Task 14), confirm filtering narrows the grid/list correctly. Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add search and filter support to catalog"
```

---

### Task 14: Book Detail Sheet

**Files:**
- Create: `src/components/star-rating.tsx`
- Create: `src/components/book-detail-sheet.tsx`

**Interfaces:**
- Consumes: `GET /api/books/:id`, `PATCH /api/copies/:id`, `POST /api/copies`, `DELETE /api/copies/:id`, `GET /api/tags`, `POST/DELETE /api/books/:id/tags`.
- Produces: `<BookDetailSheet bookId={number|null} onClose={() => void} onChanged={() => void} />`, rendered from `src/app/page.tsx` (Task 12 already renders it; this task fills in its body).

- [ ] **Step 1: Install shadcn components**

```bash
npx shadcn@latest add sheet textarea badge
```

- [ ] **Step 2: Write `src/components/star-rating.tsx`**

```tsx
'use client';

import { Star } from 'lucide-react';

export function StarRating({ value, onChange }: { value: number | null; onChange: (rating: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`Rate ${n} stars`}>
          <Star className={n <= (value ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} size={18} />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/book-detail-sheet.tsx`**

```tsx
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

  useEffect(() => {
    if (bookId == null) {
      setBook(null);
      return;
    }
    fetch(`/api/books/${bookId}`).then((r) => r.json()).then(setBook);
    fetch('/api/tags').then((r) => r.json()).then(setAllTags);
  }, [bookId]);

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
    if (!book) return;
    if (assigned) {
      await fetch(`/api/books/${book.id}/tags?tagId=${tagId}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/books/${book.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
    }
    onChanged();
  }

  return (
    <Sheet open={bookId != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {book && (
          <>
            <SheetHeader>
              <SheetTitle>{book.title}</SheetTitle>
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.id, false)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Copies</h3>
                {book.copies.map((copy) => (
                  <div key={copy.id} className="space-y-2 rounded border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{copy.format}</span>
                      <Select value={copy.status} onValueChange={(v) => updateCopy(copy.id, { status: v })}>
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
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, click a book in the catalog to open the detail sheet, change its status/rating/notes, confirm the changes persist after closing and reopening the sheet, and confirm assigning a tag then reopening the sheet reflects it (tag toggle logic currently only supports "assign"; verify visually and note the pre-existing-tag highlight is a nice-to-have, not required for this task's acceptance). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add book detail sheet with copy editing and tags"
```

---

### Task 15: Tags Page

**Files:**
- Create: `src/app/tags/page.tsx`

**Interfaces:**
- Consumes: `GET /api/tags`, `PATCH /api/tags/:id`, `DELETE /api/tags/:id`.
- Produces: `/tags` route; clicking a tag row navigates to `/?tagId=<id>` which Task 13's catalog page must read on mount (small addition below).

- [ ] **Step 1: Add `tagId` URL param support to `src/app/page.tsx`**

At the top of the component, read the initial tag filter from the URL:

```tsx
import { useSearchParams } from 'next/navigation';
```

Inside the component: `const searchParams = useSearchParams();` and add `const [tagId, setTagId] = useState<number | null>(searchParams.get('tagId') ? Number(searchParams.get('tagId')) : null);`. Add `if (tagId) params.set('tagId', String(tagId));` to `refresh()`, and add `tagId` to the `useEffect` dependency array.

- [ ] **Step 2: Write `src/app/tags/page.tsx`**

```tsx
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
    refresh();
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
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/tags`, rename and delete a tag, click a tag name and confirm it navigates to `/?tagId=<id>` with the catalog filtered to that tag. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add tags page with rename/delete and filter navigation"
```

---

### Task 16: CSV Parsing + Column Mapping

**Files:**
- Create: `src/lib/csv/parse.ts`
- Test: `tests/unit/csv-parse.test.ts`

**Interfaces:**
- Produces: `parseCsv(fileContents: string): { headers: string[]; rows: Record<string, string>[] }`, `HEADER_PRESETS: Record<string, Partial<Record<'isbn'|'title'|'author'|'format'|'status'|'rating'|'notes', string>>>` (keyed `goodreads`, `librarything`), `mapColumns(rows: Record<string,string>[], mapping: Record<string, string>): Record<string, string>[]` — remaps arbitrary CSV headers to the app's field names, used by Task 17's import runner.

- [ ] **Step 1: Write failing unit test**

```ts
// tests/unit/csv-parse.test.ts
import { describe, it, expect } from 'vitest';
import { parseCsv, mapColumns, HEADER_PRESETS } from '@/lib/csv/parse';

describe('parseCsv', () => {
  it('parses headers and rows', () => {
    const csv = 'Title,Author,ISBN\nDune,Frank Herbert,9780441013593\n';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['Title', 'Author', 'ISBN']);
    expect(rows).toEqual([{ Title: 'Dune', Author: 'Frank Herbert', ISBN: '9780441013593' }]);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'Title,Author\n"Some Book, Vol. 2",Jane Doe\n';
    const { rows } = parseCsv(csv);
    expect(rows[0].Title).toBe('Some Book, Vol. 2');
  });
});

describe('mapColumns', () => {
  it('remaps arbitrary headers to app field names', () => {
    const rows = [{ Title: 'Dune', Author: 'Frank Herbert', ISBN: '9780441013593' }];
    const mapped = mapColumns(rows, { Title: 'title', Author: 'author', ISBN: 'isbn' });
    expect(mapped).toEqual([{ title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593' }]);
  });

  it('drops columns with no mapping target', () => {
    const rows = [{ Title: 'Dune', 'My Rating': '5' }];
    const mapped = mapColumns(rows, { Title: 'title' });
    expect(mapped).toEqual([{ title: 'Dune' }]);
  });
});

describe('HEADER_PRESETS', () => {
  it('has a goodreads preset mapping common export headers', () => {
    expect(HEADER_PRESETS.goodreads).toMatchObject({
      Title: 'title',
      Author: 'author',
      ISBN13: 'isbn',
      'Exclusive Shelf': 'status',
      'My Rating': 'rating',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/csv-parse.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `src/lib/csv/parse.ts`**

```ts
import Papa from 'papaparse';

export function parseCsv(fileContents: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(fileContents, { header: true, skipEmptyLines: true });
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

export function mapColumns(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
): Record<string, string>[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [sourceHeader, targetField] of Object.entries(mapping)) {
      if (row[sourceHeader] !== undefined) mapped[targetField] = row[sourceHeader];
    }
    return mapped;
  });
}

export const HEADER_PRESETS: Record<string, Record<string, string>> = {
  goodreads: {
    Title: 'title',
    Author: 'author',
    ISBN13: 'isbn',
    'Exclusive Shelf': 'status',
    'My Rating': 'rating',
    'My Review': 'notes',
    Publisher: 'publisher',
    'Number of Pages': 'pageCount',
  },
  librarything: {
    Title: 'title',
    'Primary Author': 'author',
    ISBN: 'isbn',
    'Collections': 'status',
    Rating: 'rating',
    Review: 'notes',
    Publisher: 'publisher',
    Pages: 'pageCount',
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/csv-parse.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add CSV parsing and column mapping"
```

---

### Task 17: CSV Import — Runner + API + UI

**Files:**
- Create: `src/lib/csv/import.ts`
- Create: `src/app/api/import/route.ts`
- Create: `src/components/csv-import-wizard.tsx`
- Create: `src/app/import/page.tsx`
- Test: `tests/unit/csv-import.test.ts`
- Test: `tests/integration/import-api.test.ts`

**Interfaces:**
- Consumes: `mapColumns` (Task 16), `createBook` (Task 4), `findDuplicate` (Task 8).
- Produces: `runImport(mappedRows: Record<string,string>[], existing: ExistingBook[]): Promise<ImportResult>` where `ImportResult = { successCount: number; failures: { row: number; reason: string }[]; duplicates: { row: number; matchedId: number }[] }`; `POST /api/import` accepting `{ rows: Record<string,string>[] }` and returning `ImportResult`.

- [ ] **Step 1: Write failing unit test for the import runner**

```ts
// tests/unit/csv-import.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runImport } from '@/lib/csv/import';

describe('runImport', () => {
  it('imports valid rows and reports a success count', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 });
    const result = await runImport(
      [
        { title: 'Dune', author: 'Frank Herbert', format: 'paperback' },
        { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' },
      ],
      [],
      create,
    );
    expect(result.successCount).toBe(2);
    expect(result.failures).toHaveLength(0);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('skips invalid rows and reports the reason without failing the batch', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 });
    const result = await runImport(
      [
        { title: 'Dune', author: 'Frank Herbert', format: 'paperback' },
        { title: '', author: 'No Title', format: 'paperback' },
      ],
      [],
      create,
    );
    expect(result.successCount).toBe(1);
    expect(result.failures).toEqual([{ row: 2, reason: 'title is required' }]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('imports a row flagged as a duplicate but still reports the match', async () => {
    const create = vi.fn().mockResolvedValue({ id: 2 });
    const existing = [{ id: 1, isbn: null, title: 'Dune', author: 'Frank Herbert' }];
    const result = await runImport(
      [{ title: 'Dune', author: 'Frank Herbert', format: 'hardcover' }],
      existing,
      create,
    );
    expect(result.successCount).toBe(1);
    expect(result.duplicates).toEqual([{ row: 1, matchedId: 1 }]);
  });

  it('continues importing subsequent rows after a create call throws', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('db error'))
      .mockResolvedValueOnce({ id: 1 });
    const result = await runImport(
      [
        { title: 'Bad Row', author: 'X', format: 'paperback' },
        { title: 'Dune', author: 'Frank Herbert', format: 'paperback' },
      ],
      [],
      create,
    );
    expect(result.successCount).toBe(1);
    expect(result.failures).toEqual([{ row: 1, reason: 'db error' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/csv-import.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `src/lib/csv/import.ts`**

```ts
import { findDuplicate, type ExistingBook } from '@/lib/books/duplicates';

export type ImportRow = { title: string; author: string; format?: string; isbn?: string; [key: string]: string | undefined };
export type ImportResult = {
  successCount: number;
  failures: { row: number; reason: string }[];
  duplicates: { row: number; matchedId: number }[];
};
export type CreateBookFn = (row: ImportRow) => Promise<{ id: number }>;

export async function runImport(
  rows: ImportRow[],
  existing: ExistingBook[],
  createBookFn: CreateBookFn,
): Promise<ImportResult> {
  const result: ImportResult = { successCount: 0, failures: [], duplicates: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1;
    const row = rows[i];
    if (!row.title) {
      result.failures.push({ row: rowNumber, reason: 'title is required' });
      continue;
    }
    if (!row.author) {
      result.failures.push({ row: rowNumber, reason: 'author is required' });
      continue;
    }
    const duplicate = findDuplicate({ isbn: row.isbn, title: row.title, author: row.author }, existing);
    try {
      await createBookFn({ ...row, format: row.format || 'paperback' });
      result.successCount++;
      if (duplicate) result.duplicates.push({ row: rowNumber, matchedId: duplicate.id });
    } catch (err) {
      result.failures.push({ row: rowNumber, reason: err instanceof Error ? err.message : 'unknown error' });
    }
  }

  return result;
}
```

- [ ] **Step 4: Run unit test to verify it passes**

Run: `npm test -- tests/unit/csv-import.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write failing integration test for the import API**

```ts
// tests/integration/import-api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import { POST } from '@/app/api/import/route';
import { listBooks } from '@/lib/books/repository';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('import API', () => {
  it('imports rows and returns a summary', async () => {
    const res = await POST(
      new Request('http://localhost/api/import', {
        method: 'POST',
        body: JSON.stringify({
          rows: [
            { title: 'Dune', author: 'Frank Herbert', format: 'paperback' },
            { title: '', author: 'Missing Title', format: 'paperback' },
          ],
        }),
      }),
    );
    const body = await res.json();
    expect(body.successCount).toBe(1);
    expect(body.failures).toEqual([{ row: 2, reason: 'title is required' }]);
    const stored = await listBooks();
    expect(stored).toHaveLength(1);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/integration/import-api.test.ts`
Expected: FAIL — route doesn't exist.

- [ ] **Step 7: Write `src/app/api/import/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { runImport, type ImportRow } from '@/lib/csv/import';
import { createBook, listBooks } from '@/lib/books/repository';
import type { ExistingBook } from '@/lib/books/duplicates';

export async function POST(request: Request) {
  const body = await request.json();
  const rows: ImportRow[] = body.rows ?? [];
  const existingBooks = await listBooks();
  const existing: ExistingBook[] = existingBooks.map((b) => ({
    id: b.id,
    isbn: b.isbn,
    title: b.title,
    author: b.author,
  }));
  const result = await runImport(rows, existing, (row) =>
    createBook({
      title: row.title,
      author: row.author,
      format: row.format || 'paperback',
      isbn: row.isbn,
    }),
  );
  return NextResponse.json(result);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/integration/import-api.test.ts`
Expected: PASS (1 test).

- [ ] **Step 9: Install shadcn components for the wizard**

```bash
npx shadcn@latest add progress alert
```

- [ ] **Step 10: Write `src/components/csv-import-wizard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseCsv, mapColumns, HEADER_PRESETS } from '@/lib/csv/parse';

const TARGET_FIELDS = ['title', 'author', 'isbn', 'format', 'status', 'rating', 'notes', 'publisher', 'pageCount'];

export function CsvImportWizard() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ successCount: number; failures: { row: number; reason: string }[] } | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    setHeaders(headers);
    setRawRows(rows);
    const preset = headers.every((h) => HEADER_PRESETS.goodreads[h]) ? HEADER_PRESETS.goodreads : {};
    setMapping(preset);
  }

  async function runImport() {
    const rows = mapColumns(rawRows, mapping);
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    setResult(await res.json());
  }

  return (
    <div className="space-y-6">
      <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {headers.length > 0 && (
        <>
          <div>
            <h3 className="mb-2 text-sm font-medium">Map columns</h3>
            <div className="grid grid-cols-2 gap-2">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <span className="w-40 truncate text-sm">{header}</span>
                  <Select value={mapping[header] ?? '__skip'} onValueChange={(v) => setMapping((m) => ({ ...m, [header]: v === '__skip' ? '' : v }))}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip">Skip</SelectItem>
                      {TARGET_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Preview (first 5 rows)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.values(mapping)
                    .filter(Boolean)
                    .map((field) => (
                      <TableHead key={field}>{field}</TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapColumns(rawRows.slice(0, 5), mapping).map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(mapping)
                      .filter(Boolean)
                      .map((field) => (
                        <TableCell key={field}>{row[field]}</TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button onClick={runImport}>Import {rawRows.length} rows</Button>
        </>
      )}

      {result && (
        <Alert>
          <AlertDescription>
            Imported {result.successCount} of {rawRows.length} rows.
            {result.failures.length > 0 && (
              <ul className="mt-2 list-disc pl-4">
                {result.failures.map((f) => (
                  <li key={f.row}>
                    Row {f.row}: {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Write `src/app/import/page.tsx`**

```tsx
import { CsvImportWizard } from '@/components/csv-import-wizard';

export default function ImportPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Import from CSV</h1>
      <CsvImportWizard />
    </div>
  );
}
```

- [ ] **Step 12: Manual verification**

Run: `npm run dev`, open `/import`, upload a small Goodreads-style CSV (`Title,Author,ISBN13,Exclusive Shelf,My Rating` with 2-3 rows including one with a blank title), confirm column mapping auto-detects the Goodreads preset, preview shows mapped rows, running the import reports the correct success count and the blank-title row listed as a failure, and confirm the new books appear in the catalog at `/`. Stop the dev server.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add CSV import wizard, runner, and API route"
```

---

## Self-Review Notes

**Spec coverage check:**
- Architecture (Next.js/Postgres/Drizzle/Vercel, no auth) — Tasks 1-2.
- Data model (books/copies/tags/book_tags) — Task 3.
- Add by ISBN + manual fallback — Tasks 9, 11.
- Edit/delete books and copies — Tasks 4-6.
- Search/filter by title/author/tag/status/format — Task 13.
- Tag management + counts + filter-on-click — Tasks 7, 15.
- Per-copy reading state (status/progress/rating/notes) — Tasks 6, 14.
- CSV import with mapping/preview/row-level results — Tasks 16-17.
- Duplicate warning (never block) — Task 8, wired into import (Task 17); note the add-book modal (Task 11) does not yet surface a duplicate warning inline — see below.
- Grid/list toggle, nav, persistent Add Book button, search bar — Tasks 10, 12.
- Star rating custom component — Task 14.
- Dark mode via next-themes — Task 10.
- Unit tests for CSV/duplicate logic, integration tests for API routes, manual testing for ISBN auto-fill — satisfied throughout.

**Known gap accepted for v1 scope:** the add-book modal (Task 11) does not call `findDuplicate` before submit — it relies on the CSV import path and the unique `isbn` DB constraint (which will reject a second identical ISBN at insert time with a 500, not a friendly warning). If in-modal duplicate warnings are wanted before shipping, add a follow-up task that calls `GET /api/books` client-side on blur and runs `findDuplicate` client-side, showing a non-blocking toast rather than preventing submit. Flagging here rather than silently deferring it.

**Type consistency check:** `BookWithCopies`, `NewBookInput`, `NewCopyInput`, `ImportRow`, `ImportResult`, `ExistingBook`, `DuplicateMatch` are each defined once (Tasks 4, 6, 8, 17) and referenced identically by name in every later task that consumes them.
