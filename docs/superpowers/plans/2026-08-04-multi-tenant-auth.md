# Multi-Tenant Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk-based authentication to Anagnosma and scope every book, copy, and subject to the signed-in user, so each user has a fully private collection.

**Architecture:** Clerk (`@clerk/nextjs`, Core 3) handles sign-up/sign-in via hosted UI and route-protecting middleware. Every books/subjects table row gains a `user_id` column; copies and book-subject links are scoped transitively through their owning book/subject. A Clerk webhook auto-seeds a new user's private genre list on signup.

**Tech Stack:** `@clerk/nextjs` v7, `svix` (webhook signature verification), Drizzle ORM (existing), Vitest (existing).

## Global Constraints

- No roles/permissions system — every signed-in user has identical capabilities over their own data (per spec's explicit non-goal).
- Subjects are per-user, not shared (composite unique on `(user_id, name)`, not a global unique on `name`).
- Ownership failures return **404**, never 403 — never confirm to a caller that a record exists if it isn't theirs.
- The 56 existing books and 25 existing subjects must be preserved and assigned to the first real signed-up user, not deleted.
- `user_id` starts nullable (existing rows have none yet) and is tightened to `NOT NULL` only after a real backfill.

---

## File Structure

```
middleware.ts (project root — Next.js convention when using src/, verify at
               implementation time whether the installed Next.js version
               expects src/middleware.ts instead; see Task 2 note)
src/
  app/
    layout.tsx                        - wrap in <ClerkProvider>
    sign-in/[[...sign-in]]/page.tsx   - Clerk <SignIn />
    sign-up/[[...sign-up]]/page.tsx   - Clerk <SignUp />
    api/
      webhooks/clerk/route.ts         - user.created -> seed genres
      books/route.ts                  - scoped to userId
      books/[id]/route.ts             - scoped to userId
      copies/route.ts                 - scoped to userId (via book ownership)
      copies/[id]/route.ts            - scoped to userId (via book ownership)
      subjects/route.ts                - scoped to userId
      subjects/[id]/route.ts          - scoped to userId
      subjects/book-map/route.ts       - scoped to userId
      books/[id]/subjects/route.ts    - scoped to userId (both sides)
      import/route.ts                  - scoped to userId
  components/
    nav.tsx                            - add <UserButton />
  lib/
    auth-helpers.ts                    - NEW: requireUserId()
    db/schema.ts                       - + user_id columns
    books/repository.ts                - + userId param on every function
    copies/repository.ts               - + userId param, ownership checks
    subjects/repository.ts             - + userId param, ownership checks
    subjects/genres.ts                 - NEW: GENRES + seedGenresForUser()
scripts/
  seed-genres.ts                       - thin CLI wrapper over seedGenresForUser
  backfill-owner.ts                    - NEW: assign existing rows to first user
drizzle/                                - new migrations (nullable add, later NOT NULL)
tests/
  integration/
    books-repository.test.ts           - + userId
    books-api.test.ts                  - + userId, mock requireUserId
    copies-api.test.ts                 - + userId, mock requireUserId
    subjects-api.test.ts               - + userId, mock requireUserId
    search.test.ts                     - + userId, mock requireUserId
    import-api.test.ts                 - + userId, mock requireUserId
    genres.test.ts                     - NEW
    backfill-owner.test.ts             - NEW
    multi-tenant-isolation.test.ts     - NEW
  unit/
    clerk-webhook.test.ts              - NEW
```

---

### Task 1: Provision Clerk

**Files:** none (infra/dependency setup only)

**Interfaces:**
- Produces: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` env vars in both Vercel and local `.env`/`.env.local`; `@clerk/nextjs` and `svix` installed as dependencies.

- [ ] **Step 1: Install the Clerk integration via Vercel Marketplace**

Run: `vercel integration add clerk --yes --no-claim`
This is a "connectable" integration — it may open a browser step (create/link a Clerk account, create a Clerk application). If it does, tell the human partner to complete that step in their browser, then continue once they confirm it's done.

- [ ] **Step 2: Pull the auto-provisioned env vars locally**

Run: `vercel env pull .env.local --yes`
Expected: `.env.local` now contains `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Confirm with `grep -i clerk .env.local` (values redacted in any report — never print secret values).

- [ ] **Step 3: Add the Clerk routing env vars**

Add to `.env.local` (and to `.env.example` as a placeholder, no real values):
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```
Also add these two as real Vercel env vars (Production + Preview + Development) via:
```bash
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL production --value "/sign-in" --yes
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL preview --value "/sign-in" --yes
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL development --value "/sign-in" --yes
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL production --value "/sign-up" --yes
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL preview --value "/sign-up" --yes
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL development --value "/sign-up" --yes
```

- [ ] **Step 4: Install the npm packages**

```bash
npm install @clerk/nextjs svix
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: provision Clerk via Vercel Marketplace"
```

*(No automated test — this is provisioning/config, verified functionally once Task 2 wires up the provider and middleware.)*

---

### Task 2: Wire ClerkProvider, Middleware, Sign-in/Sign-up Pages, and Nav

**Files:**
- Create: `middleware.ts` (project root)
- Create: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Create: `src/lib/auth-helpers.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/nav.tsx`

**Interfaces:**
- Produces: `requireUserId(): Promise<{ userId: string; error?: undefined } | { userId?: undefined; error: NextResponse }>` — the single auth-check helper every API route in Tasks 5-8 will import and call, matching the existing `parseJsonBody`/`parseId` destructuring pattern in `src/lib/api-helpers.ts`.

- [ ] **Step 1: Write `src/lib/auth-helpers.ts`**

```ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Resolves the current Clerk session, returning a clean 401 instead of
 * letting an unauthenticated request reach repository/database code.
 */
export async function requireUserId(): Promise<
  { userId: string; error?: undefined } | { userId?: undefined; error: NextResponse }
> {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  return { userId };
}
```

- [ ] **Step 2: Write `middleware.ts` at the project root**

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

If, after Step 6's manual verification, requests aren't being intercepted (the app loads without ever redirecting to `/sign-in`), check whether this installed version of Next.js expects the file at `src/middleware.ts` instead of the project root — this project uses a `src/` directory for everything else, and Next.js's convention for middleware placement with `src/` has changed across versions. Move the file there if so, and re-verify.

- [ ] **Step 3: Write the sign-in and sign-up pages**

```tsx
// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex justify-center py-12">
      <SignIn />
    </div>
  );
}
```

```tsx
// src/app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex justify-center py-12">
      <SignUp />
    </div>
  );
}
```

- [ ] **Step 4: Wrap the root layout in `<ClerkProvider>`**

Modify `src/app/layout.tsx`: add `import { ClerkProvider } from '@clerk/nextjs';` and wrap the existing `<html>` element in `<ClerkProvider>` (per Clerk Core 3 guidance, `<ClerkProvider>` goes outside `<html>`, not inside `<body>`, unless this project later adopts Next.js Cache Components — it does not today). The file becomes:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anagnosma",
  description: "A memory aid for readers with large book collections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Nav />
            <main className="p-6">{children}</main>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 5: Add `<UserButton />` to the nav**

Modify `src/components/nav.tsx`:

```tsx
import Link from 'next/link';
import { SignedIn, UserButton } from '@clerk/nextjs';

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
          <Link href="/subjects">Subjects</Link>
        </nav>
        <div className="ml-auto">
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
```

`<SignedIn>` hides the button on `/sign-in`/`/sign-up` themselves, where there's no active session yet.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`. Open `http://localhost:3000/` in a browser — confirm it redirects to `/sign-in`. Sign up as a new user (this becomes the account the Task 11 backfill will target). Confirm you land back on `/` after signup, the nav shows a `<UserButton />` avatar, and clicking it shows a sign-out option. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add middleware.ts src/app/layout.tsx src/app/sign-in src/app/sign-up src/components/nav.tsx src/lib/auth-helpers.ts
git commit -m "feat: add Clerk auth with route protection and sign-in/sign-up pages"
```

*(No automated test — this is auth wiring/UI, verified manually per Step 6; `requireUserId` itself is exercised indirectly by every API test from Task 5 onward via mocking.)*

---

### Task 3: Schema — Add `user_id` Columns

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/000X_*.sql` (generated)

**Interfaces:**
- Produces: `books.userId` (nullable `text`), `subjects.userId` (nullable `text`), a composite unique constraint on `subjects(user_id, name)` replacing the old single-column unique on `subjects.name`.

- [ ] **Step 1: Modify `src/lib/db/schema.ts`**

```ts
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
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
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subjects = pgTable(
  'subjects',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id'),
    name: text('name').notNull(),
  },
  (t) => ({
    userNameUnique: unique('subjects_user_id_name_unique').on(t.userId, t.name),
  }),
);

export const bookSubjects = pgTable(
  'book_subjects',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.bookId, t.subjectId] }),
  }),
);
```

- [ ] **Step 2: Generate the migration**

Run: `npx drizzle-kit generate --name add_user_id_columns`
Expected: succeeds non-interactively (this is a pure addition — new nullable column, new unique constraint, dropped old unique constraint — not a rename, so it shouldn't hit drizzle-kit's interactive rename-detection prompt). If it does prompt interactively and fails with "Interactive prompts require a TTY," hand-write the migration SQL instead, following the pattern of `drizzle/0001_rename_tags_to_subjects.sql` (hand-written migration + hand-written `meta/000X_snapshot.json`) already established in this repo.

- [ ] **Step 3: Review the generated SQL**

Run: `cat drizzle/000X_add_user_id_columns.sql`
Expected: `ALTER TABLE "books" ADD COLUMN "user_id" text;`, `ALTER TABLE "subjects" ADD COLUMN "user_id" text;`, `ALTER TABLE "subjects" DROP CONSTRAINT "subjects_name_unique";` (or similarly named), `ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_name_unique" UNIQUE("user_id","name");`.

- [ ] **Step 4: Apply to both databases**

```bash
npm run db:migrate
npm run db:migrate:test
```

- [ ] **Step 5: Verify**

Run a quick check against the test DB confirming both tables now have a `user_id` column and `subjects` no longer has a bare unique constraint on `name` alone:
```bash
npx dotenv -e .env.test -- node -e "require('postgres')(process.env.DATABASE_URL)\`select column_name from information_schema.columns where table_name='books' and column_name='user_id'\`.then(r=>{console.log(r); process.exit(0)})"
```
Expected: one row returned confirming the column exists.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat: add nullable user_id to books and subjects, composite unique on subjects"
```

---

### Task 4: Shared Genre List + Per-User Seeding Function

**Files:**
- Create: `src/lib/subjects/genres.ts`
- Modify: `scripts/seed-genres.ts`
- Test: `tests/integration/genres.test.ts`

**Interfaces:**
- Produces: `GENRES: string[]` (the 25 curated genre names), `seedGenresForUser(userId: string): Promise<number>` (returns count of newly-created subjects; idempotent — re-running for the same user creates 0 more). Both the CLI script and the Task 9 webhook import from here.

- [ ] **Step 1: Write failing integration test**

```ts
// tests/integration/genres.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { subjects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GENRES, seedGenresForUser } from '@/lib/subjects/genres';

const USER_ID = 'user_genres_test';

beforeEach(async () => {
  await db.delete(subjects).where(eq(subjects.userId, USER_ID));
});

describe('seedGenresForUser', () => {
  it('creates all 25 curated genres for a new user', async () => {
    const created = await seedGenresForUser(USER_ID);
    expect(created).toBe(GENRES.length);
    const rows = await db.select().from(subjects).where(eq(subjects.userId, USER_ID));
    expect(rows.map((r) => r.name).sort()).toEqual([...GENRES].sort());
  });

  it('is idempotent — running it again for the same user creates nothing new', async () => {
    await seedGenresForUser(USER_ID);
    const createdSecondTime = await seedGenresForUser(USER_ID);
    expect(createdSecondTime).toBe(0);
    const rows = await db.select().from(subjects).where(eq(subjects.userId, USER_ID));
    expect(rows).toHaveLength(GENRES.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/genres.test.ts`
Expected: FAIL — `@/lib/subjects/genres` doesn't exist yet.

- [ ] **Step 3: Write `src/lib/subjects/genres.ts`**

```ts
import { db } from '@/lib/db';
import { subjects } from '@/lib/db/schema';

// A curated genre/category list for personal book collections, based on BISAC
// Subject Headings (the industry-standard classification used by publishers
// and booksellers) narrowed to the categories most useful for tagging a
// personal library rather than the full ~4000-code BISAC list.
export const GENRES = [
  'Romance',
  'Action & Adventure',
  'Contemporary Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery & Thriller',
  'Horror',
  'Historical Fiction',
  'Literary Fiction',
  'Young Adult',
  'Classic Fiction',
  'Short Stories',
  'Graphic Novels & Comics',
  'Poetry',
  'Biography & Memoir',
  'History',
  'Science & Nature',
  'Self-Help',
  'Business & Economics',
  'True Crime',
  'Philosophy',
  'Religion & Spirituality',
  'Travel',
  'Cooking',
  'Humor',
];

export async function seedGenresForUser(userId: string): Promise<number> {
  const inserted = await db
    .insert(subjects)
    .values(GENRES.map((name) => ({ name, userId })))
    .onConflictDoNothing({ target: [subjects.userId, subjects.name] })
    .returning({ name: subjects.name });
  return inserted.length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/genres.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Rewrite `scripts/seed-genres.ts` as a thin CLI wrapper**

```ts
import { seedGenresForUser } from '@/lib/subjects/genres';

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: tsx scripts/seed-genres.ts <clerk-user-id>');
    process.exit(1);
  }
  const created = await seedGenresForUser(userId);
  console.log(`Seeded ${created} genre subject(s) for user ${userId}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

Update the `db:seed`/`db:seed:test` npm scripts in `package.json` to note they now require a user ID argument — e.g. change:
```json
"db:seed": "dotenv -e .env -- tsx scripts/seed-genres.ts",
```
to (documenting the required arg via a comment isn't possible in JSON, so leave the script as-is and note in the commit message that it's now invoked as `npm run db:seed -- <clerk-user-id>`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/subjects/genres.ts scripts/seed-genres.ts
git commit -m "feat: extract shared genre list, add per-user seeding function"
```

---

### Task 5: Scope Books to `userId`

**Files:**
- Modify: `src/lib/books/repository.ts`
- Modify: `src/app/api/books/route.ts`
- Modify: `src/app/api/books/[id]/route.ts`
- Modify: `tests/integration/books-repository.test.ts`
- Modify: `tests/integration/books-api.test.ts`

**Interfaces:**
- Consumes: `requireUserId()` from `@/lib/auth-helpers` (Task 2).
- Produces: `createBook(userId, input)`, `getBook(userId, id)`, `listBooks(userId, filters?)`, `updateBook(userId, id, input)`, `deleteBook(userId, id)` — every books-repository function now takes `userId` as its first argument. Tasks 6-8 depend on this signature.

- [ ] **Step 1: Update `tests/integration/books-repository.test.ts`**

Replace the whole file:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';
import { createBook, getBook, listBooks, updateBook, deleteBook } from '@/lib/books/repository';

const USER_A = 'user_test_a';
const USER_B = 'user_test_b';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('books repository', () => {
  it('creates a book with its first copy', async () => {
    const created = await createBook(USER_A, {
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'paperback',
    });
    expect(created.title).toBe('Dune');
    expect(created.copies).toHaveLength(1);
    expect(created.copies[0].format).toBe('paperback');
  });

  it('gets a book by id with its copies', async () => {
    const created = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'hardcover' });
    const fetched = await getBook(USER_A, created.id);
    expect(fetched?.title).toBe('Dune');
    expect(fetched?.copies).toHaveLength(1);
  });

  it('returns undefined for a missing book', async () => {
    const fetched = await getBook(USER_A, 999999);
    expect(fetched).toBeUndefined();
  });

  it('lists all books for that user', async () => {
    await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook(USER_A, { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const list = await listBooks(USER_A);
    expect(list.map((b) => b.title).sort()).toEqual(['Dune', 'Foundation']);
  });

  it('updates a book', async () => {
    const created = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const updated = await updateBook(USER_A, created.id, { title: 'Dune (Deluxe)' });
    expect(updated?.title).toBe('Dune (Deluxe)');
  });

  it('deletes a book and its copies', async () => {
    const created = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await deleteBook(USER_A, created.id);
    expect(await getBook(USER_A, created.id)).toBeUndefined();
  });

  it('creates multiple books with empty isbn without unique constraint violation', async () => {
    const book1 = await createBook(USER_A, { title: 'Book One', author: 'Author One', isbn: '', format: 'paperback' });
    const book2 = await createBook(USER_A, { title: 'Book Two', author: 'Author Two', isbn: '', format: 'hardcover' });
    expect(book1.isbn).toBeNull();
    expect(book2.isbn).toBeNull();
  });

  it('updates multiple books with empty isbn without unique constraint violation', async () => {
    const book1 = await createBook(USER_A, { title: 'Book One', author: 'Author One', isbn: '978-0-123456-78-9', format: 'paperback' });
    const book2 = await createBook(USER_A, { title: 'Book Two', author: 'Author Two', isbn: '978-0-987654-32-1', format: 'hardcover' });
    const updated1 = await updateBook(USER_A, book1.id, { isbn: '' });
    const updated2 = await updateBook(USER_A, book2.id, { isbn: '' });
    expect(updated1?.isbn).toBeNull();
    expect(updated2?.isbn).toBeNull();
  });

  it('does not return, update, or delete another user\'s book', async () => {
    const created = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    expect(await getBook(USER_B, created.id)).toBeUndefined();
    expect(await updateBook(USER_B, created.id, { title: 'Hacked' })).toBeUndefined();
    await deleteBook(USER_B, created.id);
    expect(await getBook(USER_A, created.id)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/books-repository.test.ts`
Expected: FAIL — current repository functions don't accept a `userId` argument, so calls resolve to wrong values or the `USER_A`/`USER_B` isolation test fails.

- [ ] **Step 3: Rewrite `src/lib/books/repository.ts`**

```ts
import { eq, and, or, ilike, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, copies, bookSubjects } from '@/lib/db/schema';

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

export async function createBook(userId: string, input: NewBookInput): Promise<BookWithCopies> {
  const { format, ...bookFields } = input;
  const isbn = input.isbn?.trim() || undefined;
  return db.transaction(async (tx) => {
    const [book] = await tx.insert(books).values({ ...bookFields, isbn, userId }).returning();
    const [copy] = await tx
      .insert(copies)
      .values({ bookId: book.id, format })
      .returning();
    return { ...book, copies: [copy] };
  });
}

export async function getBook(userId: string, id: number): Promise<BookWithCopies | undefined> {
  const [book] = await db.select().from(books).where(and(eq(books.id, id), eq(books.userId, userId)));
  if (!book) return undefined;
  const bookCopies = await db.select().from(copies).where(eq(copies.bookId, id));
  return { ...book, copies: bookCopies };
}

export type BookFilters = {
  q?: string;
  format?: string;
  subjectId?: number;
};

export async function listBooks(userId: string, filters: BookFilters = {}): Promise<BookWithCopies[]> {
  let bookIds: number[] | undefined;

  if (filters.subjectId) {
    const rows = await db
      .select({ bookId: bookSubjects.bookId })
      .from(bookSubjects)
      .where(eq(bookSubjects.subjectId, filters.subjectId));
    bookIds = rows.map((r) => r.bookId);
  }

  const bookConditions = [
    eq(books.userId, userId),
    filters.q ? or(ilike(books.title, `%${filters.q}%`), ilike(books.author, `%${filters.q}%`)) : undefined,
    bookIds ? inArray(books.id, bookIds.length ? bookIds : [-1]) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const allBooks = await db
    .select()
    .from(books)
    .where(and(...bookConditions));

  const copyConditions = [
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
    .filter((book) => (filters.format ? book.copies.length > 0 : true));
}

export async function updateBook(
  userId: string,
  id: number,
  input: Partial<Omit<NewBookInput, 'format'>>,
): Promise<BookWithCopies | undefined> {
  type NormalizedInput = Omit<Partial<Omit<NewBookInput, 'format'>>, 'isbn'> & { isbn?: string | null };
  const normalizedInput: NormalizedInput = { ...input };
  if (input.isbn !== undefined) {
    normalizedInput.isbn = input.isbn?.trim() || null;
  }
  const [updated] = await db
    .update(books)
    .set(normalizedInput)
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .returning();
  if (!updated) return undefined;
  return getBook(userId, id);
}

export async function deleteBook(userId: string, id: number): Promise<void> {
  await db.delete(books).where(and(eq(books.id, id), eq(books.userId, userId)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/books-repository.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Update `tests/integration/books-api.test.ts`**

Add a mock at the top of the file (before the route imports) and thread `userId` expectations through:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

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

- [ ] **Step 6: Update the two API route files**

```ts
// src/app/api/books/route.ts
import { NextResponse } from 'next/server';
import { createBook, listBooks, type NewBookInput } from '@/lib/books/repository';
import { parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;
  const format = url.searchParams.get('format') ?? undefined;
  const subjectIdParam = url.searchParams.get('subjectId');
  const books = await listBooks(userId, { q, format, subjectId: subjectIdParam ? Number(subjectIdParam) : undefined });
  return NextResponse.json(books);
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } = await parseJsonBody<Partial<NewBookInput>>(request);
  if (error) return error;
  if (!body.title || !body.author || !body.format) {
    return NextResponse.json(
      { error: 'title, author, and format are required' },
      { status: 400 },
    );
  }
  const book = await createBook(userId, body as NewBookInput);
  return NextResponse.json(book, { status: 201 });
}
```

```ts
// src/app/api/books/[id]/route.ts
import { NextResponse } from 'next/server';
import { deleteBook, getBook, updateBook, type NewBookInput } from '@/lib/books/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const book = await getBook(userId, bookId);
  if (!book) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(book);
}

export async function PATCH(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<Partial<Omit<NewBookInput, 'format'>>>(request);
  if (error) return error;
  const updated = await updateBook(userId, bookId, body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  await deleteBook(userId, bookId);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- tests/integration/books-api.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 8: Commit**

```bash
git add src/lib/books/repository.ts src/app/api/books tests/integration/books-repository.test.ts tests/integration/books-api.test.ts
git commit -m "feat: scope books repository and API routes to the signed-in user"
```

---

### Task 6: Scope Copies to `userId` (via Book Ownership)

**Files:**
- Modify: `src/lib/copies/repository.ts`
- Modify: `src/app/api/copies/route.ts`
- Modify: `src/app/api/copies/[id]/route.ts`
- Modify: `tests/integration/copies-api.test.ts`

**Interfaces:**
- Consumes: `createBook(userId, input)` from Task 5.
- Produces: `createCopy(userId, input): Promise<Copy | undefined>` (undefined if the target book isn't the caller's), `updateCopy(userId, id, input): Promise<Copy | undefined>`, `deleteCopy(userId, id): Promise<boolean>` (found-and-deleted vs not-found/not-owned).

- [ ] **Step 1: Update `tests/integration/copies-api.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { createBook } from '@/lib/books/repository';
import { POST } from '@/app/api/copies/route';
import { PATCH, DELETE } from '@/app/api/copies/[id]/route';

beforeEach(async () => {
  await db.delete(copies);
  await db.delete(books);
});

describe('copies API', () => {
  it('POST adds a second copy to an existing book', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
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

  it('POST returns 404 for a book belonging to another user', async () => {
    const book = await createBook('user_test_b', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const res = await POST(
      new Request('http://localhost/api/copies', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.id, format: 'ebook' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('PATCH updates copy notes', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await PATCH(
      new Request(`http://localhost/api/copies/${copyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Great world-building.' }),
      }),
      { params: Promise.resolve({ id: String(copyId) }) },
    );
    const body = await res.json();
    expect(body.notes).toBe('Great world-building.');
  });

  it('DELETE removes a copy without deleting the book', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await DELETE(new Request(`http://localhost/api/copies/${copyId}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(copyId) }),
    });
    expect(res.status).toBe(204);
  });

  it('DELETE returns 404 for a copy belonging to another user\'s book', async () => {
    const book = await createBook('user_test_b', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const copyId = book.copies[0].id;
    const res = await DELETE(new Request(`http://localhost/api/copies/${copyId}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(copyId) }),
    });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/copies-api.test.ts`
Expected: FAIL — current `createCopy`/`updateCopy`/`deleteCopy` don't accept or check `userId`.

- [ ] **Step 3: Rewrite `src/lib/copies/repository.ts`**

```ts
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

export type NewCopyInput = {
  bookId: number;
  format: string;
  notes?: string;
};

export async function createCopy(userId: string, input: NewCopyInput) {
  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, input.bookId), eq(books.userId, userId)));
  if (!book) return undefined;
  const [copy] = await db.insert(copies).values(input).returning();
  return copy;
}

async function copyBelongsToUser(userId: string, copyId: number): Promise<boolean> {
  const [row] = await db
    .select({ copyId: copies.id })
    .from(copies)
    .innerJoin(books, eq(books.id, copies.bookId))
    .where(and(eq(copies.id, copyId), eq(books.userId, userId)));
  return !!row;
}

export async function updateCopy(userId: string, id: number, input: Partial<Omit<NewCopyInput, 'bookId'>>) {
  if (!(await copyBelongsToUser(userId, id))) return undefined;
  const [updated] = await db
    .update(copies)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(copies.id, id))
    .returning();
  return updated;
}

export async function deleteCopy(userId: string, id: number): Promise<boolean> {
  if (!(await copyBelongsToUser(userId, id))) return false;
  await db.delete(copies).where(eq(copies.id, id));
  return true;
}
```

- [ ] **Step 4: Update the two API route files**

```ts
// src/app/api/copies/route.ts
import { NextResponse } from 'next/server';
import { createCopy, type NewCopyInput } from '@/lib/copies/repository';
import { parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } = await parseJsonBody<Partial<NewCopyInput>>(request);
  if (error) return error;
  if (!body.bookId || !body.format) {
    return NextResponse.json({ error: 'bookId and format are required' }, { status: 400 });
  }
  const copy = await createCopy(userId, body as NewCopyInput);
  if (!copy) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(copy, { status: 201 });
}
```

```ts
// src/app/api/copies/[id]/route.ts
import { NextResponse } from 'next/server';
import { deleteCopy, updateCopy, type NewCopyInput } from '@/lib/copies/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const copyId = parseId(id);
  if (copyId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<Partial<Omit<NewCopyInput, 'bookId'>>>(request);
  if (error) return error;
  const updated = await updateCopy(userId, copyId, body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const copyId = parseId(id);
  if (copyId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const found = await deleteCopy(userId, copyId);
  if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/integration/copies-api.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/copies/repository.ts src/app/api/copies tests/integration/copies-api.test.ts
git commit -m "feat: scope copies repository and API routes to the signed-in user via book ownership"
```

---

### Task 7: Scope Subjects to `userId`

**Files:**
- Modify: `src/lib/subjects/repository.ts`
- Modify: `src/app/api/subjects/route.ts`
- Modify: `src/app/api/subjects/[id]/route.ts`
- Modify: `src/app/api/subjects/book-map/route.ts`
- Modify: `src/app/api/books/[id]/subjects/route.ts`
- Modify: `tests/integration/subjects-api.test.ts`
- Modify: `tests/integration/search.test.ts`

**Interfaces:**
- Consumes: `createBook(userId, input)` from Task 5.
- Produces: `createSubject(userId, name)`, `listSubjectsWithCounts(userId)`, `renameSubject(userId, id, name)`, `deleteSubject(userId, id): Promise<boolean>`, `assignSubject(userId, bookId, subjectId): Promise<boolean>`, `removeSubject(userId, bookId, subjectId): Promise<boolean>`, `listSubjectIdsForBook(userId, bookId): Promise<number[]>`, `listAllBookSubjectIds(userId): Promise<Record<number, number[]>>`.

- [ ] **Step 1: Update `tests/integration/subjects-api.test.ts`**

```ts
// tests/integration/subjects-api.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, subjects, bookSubjects } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

import { createBook } from '@/lib/books/repository';
import { GET, POST } from '@/app/api/subjects/route';
import { PATCH, DELETE } from '@/app/api/subjects/[id]/route';
import { GET as BOOK_SUBJECTS, POST as ASSIGN, DELETE as UNASSIGN } from '@/app/api/books/[id]/subjects/route';

type SubjectWithCount = { id: number; name: string; bookCount: number };

beforeEach(async () => {
  await db.delete(bookSubjects);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(subjects);
});

describe('subjects API', () => {
  it('POST creates a subject', async () => {
    const res = await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }));
    expect(res.status).toBe(201);
    expect((await res.json()).name).toBe('sci-fi');
  });

  it('assigns a subject to a book and counts it in GET /api/subjects', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const list: SubjectWithCount[] = await (await GET()).json();
    expect(list.find((s) => s.id === subject.id)?.bookCount).toBe(1);
  });

  it('a book can be assigned more than one subject', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const scifi = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'Science Fiction' }) }))).json();
    const fantasy = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'Fantasy' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: scifi.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: fantasy.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const assigned = await (
      await BOOK_SUBJECTS(new Request(`http://localhost/api/books/${book.id}/subjects`), { params: Promise.resolve({ id: String(book.id) }) })
    ).json();
    expect(assigned.sort()).toEqual([scifi.id, fantasy.id].sort());
  });

  it('GET /api/books/:id/subjects returns assigned subject ids so the UI can distinguish assigned vs unassigned', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const before = await (
      await BOOK_SUBJECTS(new Request(`http://localhost/api/books/${book.id}/subjects`), { params: Promise.resolve({ id: String(book.id) }) })
    ).json();
    expect(before).toEqual([]);

    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const after = await (
      await BOOK_SUBJECTS(new Request(`http://localhost/api/books/${book.id}/subjects`), { params: Promise.resolve({ id: String(book.id) }) })
    ).json();
    expect(after).toEqual([subject.id]);
  });

  it('removes a subject from a book', async () => {
    const book = await createBook('user_test_a', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    await ASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    await UNASSIGN(
      new Request(`http://localhost/api/books/${book.id}/subjects?subjectId=${subject.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: String(book.id) }) },
    );
    const list: SubjectWithCount[] = await (await GET()).json();
    expect(list.find((s) => s.id === subject.id)?.bookCount).toBe(0);
  });

  it('renames a subject', async () => {
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await PATCH(
      new Request(`http://localhost/api/subjects/${subject.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'science-fiction' }) }),
      { params: Promise.resolve({ id: String(subject.id) }) },
    );
    expect((await res.json()).name).toBe('science-fiction');
  });

  it('deletes a subject', async () => {
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await DELETE(new Request(`http://localhost/api/subjects/${subject.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: String(subject.id) }),
    });
    expect(res.status).toBe(204);
  });

  it('cannot assign another user\'s book to your own subject', async () => {
    const otherUsersBook = await createBook('user_test_b', { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subject = await (await POST(new Request('http://localhost/api/subjects', { method: 'POST', body: JSON.stringify({ name: 'sci-fi' }) }))).json();
    const res = await ASSIGN(
      new Request(`http://localhost/api/books/${otherUsersBook.id}/subjects`, { method: 'POST', body: JSON.stringify({ subjectId: subject.id }) }),
      { params: Promise.resolve({ id: String(otherUsersBook.id) }) },
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Update `tests/integration/search.test.ts`**

Update the "filters by subject" test to use the new `createSubject`/`assignSubject` signatures:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, subjects, bookSubjects } from '@/lib/db/schema';
import { createBook } from '@/lib/books/repository';
import { createSubject, assignSubject } from '@/lib/subjects/repository';
import { GET } from '@/app/api/books/route';

const USER_ID = 'user_test_a';

beforeEach(async () => {
  await db.delete(bookSubjects);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(subjects);
});

describe('book search/filter', () => {
  it('filters by title/author text', async () => {
    await createBook(USER_ID, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook(USER_ID, { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const res = await GET(new Request('http://localhost/api/books?q=dune'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });

  it('filters by format', async () => {
    await createBook(USER_ID, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook(USER_ID, { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const res = await GET(new Request('http://localhost/api/books?format=ebook'));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Foundation');
  });

  it('filters by subject', async () => {
    const dune = await createBook(USER_ID, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    await createBook(USER_ID, { title: 'Foundation', author: 'Isaac Asimov', format: 'ebook' });
    const subject = await createSubject(USER_ID, 'sci-fi');
    await assignSubject(USER_ID, dune.id, subject.id);
    const res = await GET(new Request(`http://localhost/api/books?subjectId=${subject.id}`));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Dune');
  });
});
```

Note: this file must add `vi.mock('@/lib/auth-helpers', () => ({ requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }) }));` before the `GET` import, same as the other API test files — add the `vi` import from `vitest` and the mock block at the top, matching the pattern in Step 1.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/integration/subjects-api.test.ts tests/integration/search.test.ts`
Expected: FAIL — current subjects-repository functions don't accept `userId`.

- [ ] **Step 4: Rewrite `src/lib/subjects/repository.ts`**

```ts
import { eq, and, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, subjects, bookSubjects } from '@/lib/db/schema';

export async function createSubject(userId: string, name: string) {
  const [subject] = await db.insert(subjects).values({ userId, name }).returning();
  return subject;
}

export async function listSubjectsWithCounts(userId: string) {
  const rows = await db
    .select({ id: subjects.id, name: subjects.name, bookCount: count(bookSubjects.bookId) })
    .from(subjects)
    .leftJoin(bookSubjects, eq(bookSubjects.subjectId, subjects.id))
    .where(eq(subjects.userId, userId))
    .groupBy(subjects.id, subjects.name);
  return rows.map((r) => ({ ...r, bookCount: Number(r.bookCount) }));
}

export async function renameSubject(userId: string, id: number, name: string) {
  const [updated] = await db
    .update(subjects)
    .set({ name })
    .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
    .returning();
  return updated;
}

export async function deleteSubject(userId: string, id: number): Promise<boolean> {
  const deleted = await db
    .delete(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
    .returning({ id: subjects.id });
  return deleted.length > 0;
}

async function bookAndSubjectBelongToUser(userId: string, bookId: number, subjectId: number): Promise<boolean> {
  const [book] = await db.select({ id: books.id }).from(books).where(and(eq(books.id, bookId), eq(books.userId, userId)));
  if (!book) return false;
  const [subject] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)));
  return !!subject;
}

export async function assignSubject(userId: string, bookId: number, subjectId: number): Promise<boolean> {
  if (!(await bookAndSubjectBelongToUser(userId, bookId, subjectId))) return false;
  await db.insert(bookSubjects).values({ bookId, subjectId }).onConflictDoNothing();
  return true;
}

export async function removeSubject(userId: string, bookId: number, subjectId: number): Promise<boolean> {
  if (!(await bookAndSubjectBelongToUser(userId, bookId, subjectId))) return false;
  await db.delete(bookSubjects).where(and(eq(bookSubjects.bookId, bookId), eq(bookSubjects.subjectId, subjectId)));
  return true;
}

export async function listSubjectIdsForBook(userId: string, bookId: number): Promise<number[]> {
  const [book] = await db.select({ id: books.id }).from(books).where(and(eq(books.id, bookId), eq(books.userId, userId)));
  if (!book) return [];
  const rows = await db.select({ subjectId: bookSubjects.subjectId }).from(bookSubjects).where(eq(bookSubjects.bookId, bookId));
  return rows.map((r) => r.subjectId);
}

// A book can belong to more than one subject. Returns every book->subject
// association for this user's books in one flat query so a "grouped by
// subject" view can section an already-loaded book list client-side
// without an N+1 fetch per subject.
export async function listAllBookSubjectIds(userId: string): Promise<Record<number, number[]>> {
  const rows = await db
    .select({ bookId: bookSubjects.bookId, subjectId: bookSubjects.subjectId })
    .from(bookSubjects)
    .innerJoin(books, eq(books.id, bookSubjects.bookId))
    .where(eq(books.userId, userId));
  const map: Record<number, number[]> = {};
  for (const row of rows) {
    (map[row.bookId] ??= []).push(row.subjectId);
  }
  return map;
}
```

- [ ] **Step 5: Update the four API route files**

```ts
// src/app/api/subjects/route.ts
import { NextResponse } from 'next/server';
import { createSubject, listSubjectsWithCounts } from '@/lib/subjects/repository';
import { parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

export async function GET() {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  return NextResponse.json(await listSubjectsWithCounts(userId));
}

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } = await parseJsonBody<{ name?: string }>(request);
  if (error) return error;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const subject = await createSubject(userId, body.name);
  return NextResponse.json(subject, { status: 201 });
}
```

```ts
// src/app/api/subjects/[id]/route.ts
import { NextResponse } from 'next/server';
import { deleteSubject, renameSubject } from '@/lib/subjects/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const subjectId = parseId(id);
  if (subjectId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<{ name?: string }>(request);
  if (error) return error;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const updated = await renameSubject(userId, subjectId, body.name);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const subjectId = parseId(id);
  if (subjectId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const found = await deleteSubject(userId, subjectId);
  if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

```ts
// src/app/api/subjects/book-map/route.ts
import { NextResponse } from 'next/server';
import { listAllBookSubjectIds } from '@/lib/subjects/repository';
import { requireUserId } from '@/lib/auth-helpers';

export async function GET() {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  return NextResponse.json(await listAllBookSubjectIds(userId));
}
```

```ts
// src/app/api/books/[id]/subjects/route.ts
import { NextResponse } from 'next/server';
import { assignSubject, listSubjectIdsForBook, removeSubject } from '@/lib/subjects/repository';
import { parseId, parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const subjectIds = await listSubjectIdsForBook(userId, bookId);
  return NextResponse.json(subjectIds);
}

export async function POST(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const { data: body, error } = await parseJsonBody<{ subjectId?: string | number }>(request);
  if (error) return error;
  const subjectId = parseId(String(body.subjectId ?? ''));
  if (subjectId == null) return NextResponse.json({ error: 'invalid subjectId' }, { status: 400 });
  const assigned = await assignSubject(userId, bookId, subjectId);
  if (!assigned) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { id } = await params;
  const bookId = parseId(id);
  if (bookId == null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const subjectIdParam = new URL(request.url).searchParams.get('subjectId') ?? '';
  const subjectId = parseId(subjectIdParam);
  if (subjectId == null) return NextResponse.json({ error: 'invalid subjectId' }, { status: 400 });
  const removed = await removeSubject(userId, bookId, subjectId);
  if (!removed) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/integration/subjects-api.test.ts tests/integration/search.test.ts`
Expected: PASS (9 + 3 = 12 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/subjects/repository.ts src/app/api/subjects src/app/api/books/[id]/subjects tests/integration/subjects-api.test.ts tests/integration/search.test.ts
git commit -m "feat: scope subjects repository and API routes to the signed-in user"
```

---

### Task 8: Scope CSV Import to `userId`

**Files:**
- Modify: `src/app/api/import/route.ts`
- Modify: `tests/integration/import-api.test.ts`

**Interfaces:**
- Consumes: `createBook(userId, input)` (Task 5), `updateCopy(userId, id, input)` (Task 6), `listBooks(userId)` (Task 5).

- [ ] **Step 1: Update `tests/integration/import-api.test.ts`**

Add the same `vi.mock('@/lib/auth-helpers', ...)` block used in Tasks 5-7 before the route import. Everything else in this test file's assertions is unaffected (the import logic itself didn't change, only which user's data it operates on):

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { books, copies } from '@/lib/db/schema';

vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: 'user_test_a' }),
}));

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
    const stored = await listBooks('user_test_a');
    expect(stored).toHaveLength(1);
  });
});
```

*(If this project's actual current `import-api.test.ts` covers additional cases from the ISBN-duplicate fix wave earlier in the project, keep those cases too — just add the mock block and change any `listBooks()` call to `listBooks('user_test_a')` throughout the file, following the same pattern shown here.)*

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/import-api.test.ts`
Expected: FAIL — route doesn't call `requireUserId()` or pass `userId` yet.

- [ ] **Step 3: Update `src/app/api/import/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { runImport, type ImportRow } from '@/lib/csv/import';
import { createBook, listBooks } from '@/lib/books/repository';
import { updateCopy } from '@/lib/copies/repository';
import type { ExistingBook } from '@/lib/books/duplicates';
import { parseJsonBody } from '@/lib/api-helpers';
import { requireUserId } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;
  const { data: body, error } = await parseJsonBody<{ rows?: ImportRow[] }>(request);
  if (error) return error;
  const rows: ImportRow[] = body.rows ?? [];
  const existingBooks = await listBooks(userId);
  const existing: ExistingBook[] = existingBooks.map((b) => ({
    id: b.id,
    isbn: b.isbn,
    title: b.title,
    author: b.author,
  }));
  const result = await runImport(rows, existing, async (row) => {
    const pageCount = row.pageCount ? Number(row.pageCount) : undefined;
    const book = await createBook(userId, {
      title: row.title,
      author: row.author,
      format: row.format || 'paperback',
      isbn: row.isbn,
      publisher: row.publisher || undefined,
      pageCount: pageCount != null && !Number.isNaN(pageCount) ? pageCount : undefined,
    });

    if (row.notes && book.copies[0]) {
      await updateCopy(userId, book.copies[0].id, { notes: row.notes });
    }

    return book;
  });
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/import-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/import/route.ts tests/integration/import-api.test.ts
git commit -m "feat: scope CSV import to the signed-in user"
```

---

### Task 9: Clerk Webhook — Auto-Seed New User's Genres

**Files:**
- Create: `src/app/api/webhooks/clerk/route.ts`
- Test: `tests/unit/clerk-webhook.test.ts`

**Interfaces:**
- Consumes: `seedGenresForUser(userId)` from `@/lib/subjects/genres` (Task 4).
- Produces: `POST /api/webhooks/clerk` — verifies the Clerk webhook signature via `svix`, and on a `user.created` event, seeds that user's 25 genre subjects.

- [ ] **Step 1: Write failing unit test**

```ts
// tests/unit/clerk-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVerify = vi.fn();
vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({ verify: mockVerify })),
}));

const mockSeedGenresForUser = vi.fn();
vi.mock('@/lib/subjects/genres', () => ({
  seedGenresForUser: mockSeedGenresForUser,
}));

import { POST } from '@/app/api/webhooks/clerk/route';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = 'whsec_test';
});

function req(body: unknown) {
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'svix-id': 'msg_1',
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,test',
    },
  });
}

describe('Clerk webhook', () => {
  it('seeds genres for a new user on user.created', async () => {
    mockVerify.mockReturnValue({ type: 'user.created', data: { id: 'user_abc123' } });
    const res = await POST(req({ type: 'user.created', data: { id: 'user_abc123' } }));
    expect(res.status).toBe(200);
    expect(mockSeedGenresForUser).toHaveBeenCalledWith('user_abc123');
  });

  it('ignores non-user.created events', async () => {
    mockVerify.mockReturnValue({ type: 'user.updated', data: { id: 'user_abc123' } });
    const res = await POST(req({ type: 'user.updated', data: { id: 'user_abc123' } }));
    expect(res.status).toBe(200);
    expect(mockSeedGenresForUser).not.toHaveBeenCalled();
  });

  it('rejects a request with an invalid signature', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const res = await POST(req({ type: 'user.created', data: { id: 'user_abc123' } }));
    expect(res.status).toBe(400);
  });

  it('rejects a request missing svix headers', async () => {
    const res = await POST(new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/clerk-webhook.test.ts`
Expected: FAIL — route doesn't exist.

- [ ] **Step 3: Write `src/app/api/webhooks/clerk/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { seedGenresForUser } from '@/lib/subjects/genres';

type ClerkUserCreatedEvent = { type: string; data: { id: string } };

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 });
  }

  const payload = await request.text();
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing svix headers' }, { status: 400 });
  }

  const wh = new Webhook(secret);
  let event: ClerkUserCreatedEvent;
  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserCreatedEvent;
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.type === 'user.created') {
    await seedGenresForUser(event.data.id);
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/clerk-webhook.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Register the webhook with Clerk and add its signing secret**

This webhook must be registered in the Clerk dashboard (Configure → Webhooks → Add Endpoint) pointing at `https://<your-deployed-domain>/api/webhooks/clerk`, subscribed to the `user.created` event. Clerk's local-dev webhook delivery requires either a tunneling tool (e.g. `ngrok http 3000`, then register the tunnel's URL) or testing this end-to-end against a deployed Preview URL instead of `localhost` — flag this to the human partner and let them choose which they'd prefer for manual end-to-end verification.

Once registered, Clerk shows a **Signing Secret** (`whsec_...`) — add it as an env var:
```bash
vercel env add CLERK_WEBHOOK_SIGNING_SECRET production --yes
vercel env add CLERK_WEBHOOK_SIGNING_SECRET preview --yes
vercel env add CLERK_WEBHOOK_SIGNING_SECRET development --yes
```
(paste the real secret when prompted for each, then `vercel env pull .env.local --yes` locally).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/webhooks tests/unit/clerk-webhook.test.ts
git commit -m "feat: add Clerk webhook to auto-seed a new user's genre subjects"
```

---

### Task 10: Cross-User Isolation Tests

**Files:**
- Test: `tests/integration/multi-tenant-isolation.test.ts`

**Interfaces:**
- Consumes: every `userId`-scoped repository function from Tasks 5-7.

This task adds no new production code — it's a dedicated proof, at the repository layer (the real security boundary; API routes just forward whatever `requireUserId()` returns), that no function lets one user read, modify, or delete another user's data.

- [ ] **Step 1: Write the test file**

```ts
// tests/integration/multi-tenant-isolation.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { books, copies, subjects, bookSubjects } from '@/lib/db/schema';
import { createBook, getBook, updateBook, deleteBook } from '@/lib/books/repository';
import { createCopy, updateCopy, deleteCopy } from '@/lib/copies/repository';
import {
  createSubject,
  renameSubject,
  deleteSubject,
  assignSubject,
  removeSubject,
  listSubjectIdsForBook,
} from '@/lib/subjects/repository';

const USER_A = 'user_test_a';
const USER_B = 'user_test_b';

beforeEach(async () => {
  await db.delete(bookSubjects);
  await db.delete(copies);
  await db.delete(books);
  await db.delete(subjects);
});

describe('multi-tenant isolation', () => {
  it("user B cannot read, update, or delete user A's book", async () => {
    const book = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    expect(await getBook(USER_B, book.id)).toBeUndefined();
    expect(await updateBook(USER_B, book.id, { title: 'Hacked' })).toBeUndefined();
    await deleteBook(USER_B, book.id);
    expect(await getBook(USER_A, book.id)).toBeDefined();
  });

  it("user B cannot create, update, or delete a copy on user A's book", async () => {
    const book = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    expect(await createCopy(USER_B, { bookId: book.id, format: 'ebook' })).toBeUndefined();
    const copyId = book.copies[0].id;
    expect(await updateCopy(USER_B, copyId, { notes: 'hacked' })).toBeUndefined();
    expect(await deleteCopy(USER_B, copyId)).toBe(false);
  });

  it("user B cannot rename or delete user A's subject", async () => {
    const subject = await createSubject(USER_A, 'Sci-Fi');
    expect(await renameSubject(USER_B, subject.id, 'Hacked')).toBeUndefined();
    expect(await deleteSubject(USER_B, subject.id)).toBe(false);
  });

  it("user B cannot assign or remove subjects on user A's book, with either user's subject", async () => {
    const book = await createBook(USER_A, { title: 'Dune', author: 'Frank Herbert', format: 'paperback' });
    const subjectA = await createSubject(USER_A, 'Sci-Fi');
    const subjectB = await createSubject(USER_B, 'Sci-Fi');

    expect(await assignSubject(USER_B, book.id, subjectA.id)).toBe(false);
    expect(await assignSubject(USER_B, book.id, subjectB.id)).toBe(false);
    expect(await listSubjectIdsForBook(USER_B, book.id)).toEqual([]);

    expect(await assignSubject(USER_A, book.id, subjectA.id)).toBe(true);
    expect(await listSubjectIdsForBook(USER_A, book.id)).toEqual([subjectA.id]);
    expect(await removeSubject(USER_B, book.id, subjectA.id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- tests/integration/multi-tenant-isolation.test.ts`
Expected: PASS (4 tests). If any fail, it means Tasks 5-7's ownership checks have a gap — fix the repository function in question, don't weaken this test.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: all tests across the project pass.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/multi-tenant-isolation.test.ts
git commit -m "test: prove cross-user data isolation across books, copies, and subjects"
```

---

### Task 11: Backfill Existing Data + Tighten `user_id` to `NOT NULL`

**Files:**
- Create: `scripts/backfill-owner.ts`
- Test: `tests/integration/backfill-owner.test.ts`
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/000X_*.sql` (generated)

**Interfaces:**
- Produces: `backfillOwner(userId: string): Promise<{ books: number; subjects: number }>` — assigns every currently-ownerless book and subject to the given user ID.

- [ ] **Step 1: Write failing integration test**

```ts
// tests/integration/backfill-owner.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { isNull, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, subjects } from '@/lib/db/schema';
import { backfillOwner } from '../../scripts/backfill-owner';

const OWNER = 'user_backfill_test';

beforeEach(async () => {
  await db.delete(books).where(eq(books.userId, OWNER));
  await db.delete(subjects).where(eq(subjects.userId, OWNER));
  // Simulate pre-multi-tenant rows: insert with a null user_id directly.
  await db.insert(books).values({ title: 'Orphan Book', author: 'Nobody', userId: null as unknown as string });
  await db.insert(subjects).values({ name: 'Orphan Subject', userId: null as unknown as string });
});

describe('backfillOwner', () => {
  it('assigns every ownerless book and subject to the given user', async () => {
    const result = await backfillOwner(OWNER);
    expect(result.books).toBeGreaterThanOrEqual(1);
    expect(result.subjects).toBeGreaterThanOrEqual(1);
    const remainingOrphanBooks = await db.select().from(books).where(isNull(books.userId));
    const remainingOrphanSubjects = await db.select().from(subjects).where(isNull(subjects.userId));
    expect(remainingOrphanBooks).toHaveLength(0);
    expect(remainingOrphanSubjects).toHaveLength(0);
  });

  it('is a no-op the second time (nothing left to backfill)', async () => {
    await backfillOwner(OWNER);
    const result = await backfillOwner(OWNER);
    expect(result.books).toBe(0);
    expect(result.subjects).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/backfill-owner.test.ts`
Expected: FAIL — `scripts/backfill-owner.ts` doesn't exist.

- [ ] **Step 3: Write `scripts/backfill-owner.ts`**

```ts
import { isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, subjects } from '@/lib/db/schema';

export async function backfillOwner(userId: string): Promise<{ books: number; subjects: number }> {
  const updatedBooks = await db.update(books).set({ userId }).where(isNull(books.userId)).returning({ id: books.id });
  const updatedSubjects = await db.update(subjects).set({ userId }).where(isNull(subjects.userId)).returning({ id: subjects.id });
  return { books: updatedBooks.length, subjects: updatedSubjects.length };
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: tsx scripts/backfill-owner.ts <clerk-user-id>');
    process.exit(1);
  }
  const result = await backfillOwner(userId);
  console.log(`Assigned ${result.books} book(s) and ${result.subjects} subject(s) to user ${userId}.`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/backfill-owner.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit the script**

```bash
git add scripts/backfill-owner.ts tests/integration/backfill-owner.test.ts
git commit -m "feat: add backfill script to assign ownerless rows to a user"
```

- [ ] **Step 6: Manual step — run the real backfill against the dev database**

This step requires the real Clerk user ID from the human partner who signed up in Task 2, Step 6. Ask them for it (it's visible in the Clerk dashboard under Users, or loggable via `currentUser()` in a temporary debug page) if it wasn't already captured. Then run:
```bash
npm run db:seed -- <that-real-clerk-user-id>
npx dotenv -e .env -- npx tsx scripts/backfill-owner.ts <that-real-clerk-user-id>
```
Expected output: `Assigned 56 book(s) and 25 subject(s) to user <id>.` (or whatever the current real counts are — verify against `SELECT count(*) FROM books WHERE user_id IS NULL` returning 0 afterward).

- [ ] **Step 7: Tighten `user_id` to `NOT NULL` in the schema**

Modify `src/lib/db/schema.ts`: change `userId: text('user_id')` to `userId: text('user_id').notNull()` on both `books` and `subjects`.

- [ ] **Step 8: Generate and apply the tightening migration to the test DB**

```bash
npx drizzle-kit generate --name tighten_user_id_not_null
npm run db:migrate:test
```
Expected: succeeds immediately against the test DB, since every test in this project already creates rows with a real `userId` value from Task 5 onward — there are no null rows there to violate the new constraint.

- [ ] **Step 9: Apply the same migration to the dev database — only after Step 6 is confirmed complete**

```bash
npm run db:migrate
```
If this fails with a not-null constraint violation, it means Step 6's backfill didn't actually reach every row — re-run Step 6 before retrying.

- [ ] **Step 10: Run the full test suite one more time**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat: tighten books.user_id and subjects.user_id to NOT NULL after backfill"
```

---

## Self-Review Notes

**Spec coverage check:**
- Clerk auth, hosted UI, middleware protection — Tasks 1-2.
- `user_id` on books/subjects, composite unique on subjects — Task 3.
- Per-user genre auto-seed on signup — Tasks 4, 9.
- Books/copies/subjects scoping with 404-not-403 semantics — Tasks 5-7.
- CSV import scoping — Task 8.
- Existing-data preservation via backfill — Task 11.
- Isolation testing — Task 10.
- No roles/permissions — honored throughout (no role checks anywhere in the plan).

**Placeholder scan:** No TBD/TODO markers. The two genuinely deferred items (webhook local-dev delivery mechanism, exact middleware file location) are called out as explicit verification steps with concrete fallback actions, not vague instructions.

**Type consistency check:** `requireUserId()`'s return shape (`{ userId, error? } | { userId?, error }`) is defined once in Task 2 and used identically in every route across Tasks 5-9. Repository function signatures (`userId` always the first parameter) are consistent from Task 5 onward. `deleteCopy`/`deleteSubject`/`assignSubject`/`removeSubject` all return `boolean` (found-and-acted vs not-found-or-not-owned) consistently, matching how their API routes check the result for a 404.
