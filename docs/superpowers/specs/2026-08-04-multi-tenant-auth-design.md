# Anagnosma — Multi-Tenant Auth Design Spec

Source: brainstorming conversation, 2026-08-04. Builds on
`docs/superpowers/specs/2026-08-02-book-catalog-mvp-design.md`, which
explicitly deferred "multi-user accounts and auth" to a phase 2 spec — this
is that spec.

## Context

Anagnosma was built single-user, no-auth (spec line 29-33 of the MVP
design): one shared catalog of books and one shared set of Subjects,
editable by anyone with access to the app. That's no longer sufficient —
Anagnosma needs real user accounts, with each user owning a fully private
book collection.

## Goals

- Each user has their own private set of books, copies, and subjects —
  no user can see or modify another user's data.
- Sign-up/sign-in is handled by a managed provider (Clerk), not
  hand-rolled password/session code.
- A brand-new user isn't dropped into an empty app with no starting point —
  their private Subjects list is auto-seeded with the same 25 curated
  genres the app ships with today.
- The 56 books and 25 subjects already in the database aren't lost — they
  become the first real user's (the app owner's) collection.

## Non-Goals (explicitly out of scope for this spec)

- Roles or permissions (admin vs. regular user). Every signed-in user has
  identical capabilities over their own data — there is no cross-user
  impact to guard against once Subjects are per-user, so no roles system
  is needed.
- Sharing/inviting other users into your collection (read-only viewers,
  household/shared catalogs, etc.).
- Any change to the CSV import, ISBN lookup, or cover-upload features
  beyond scoping their output to the acting user's `user_id`.

## Architecture

**Auth provider: Clerk**, via `@clerk/nextjs`. Chosen over a self-hosted
Auth.js/NextAuth setup because it's a native Vercel Marketplace
integration with prebuilt sign-in/sign-up UI and session middleware,
minimizing custom auth code to write and maintain.

- `<ClerkProvider>` wraps the root layout (`src/app/layout.tsx`).
- `middleware.ts` at the project root protects every route except
  `/sign-in` and `/sign-up` (Clerk's `clerkMiddleware` +
  `createRouteMatcher` for the public-route allowlist) — unauthenticated
  visitors are redirected to sign-in automatically.
- `src/app/sign-in/[[...sign-in]]/page.tsx` and
  `src/app/sign-up/[[...sign-up]]/page.tsx` render Clerk's `<SignIn />`
  and `<SignUp />` components (Clerk's catch-all route convention).
- `src/components/nav.tsx` gains a Clerk `<UserButton />` (avatar +
  sign-out menu) so a signed-in user can see who they are and log out.

## Data Model Changes

`src/lib/db/schema.ts`:

- **`books`** gains `userId: text('user_id').notNull()` (nullable during
  rollout, tightened after backfill — see Migration & Rollout below).
  Clerk user IDs are strings like `user_2abc...`, hence `text`, not
  `integer`.
- **`subjects`** gains `userId: text('user_id')` (same
  nullable-then-not-null rollout). The existing `name` unique constraint
  changes from a single-column unique (`subjects.name`) to a composite
  unique on `(user_id, name)`, so two different users can each have their
  own "Romance" without colliding.
- **`copies`** and **`book_subjects`** get no new columns. They're scoped
  transitively:
  - A copy's owner is its parent book's `user_id` (via `copies.book_id`).
  - A `book_subjects` row links a book to a subject; both must belong to
    the same `user_id`. This is enforced at the application layer (see
    API Changes), not via a DB constraint, since Drizzle/Postgres can't
    express "these two foreign-keyed rows share a third column's value"
    as a single constraint without a trigger — a trigger is unnecessary
    complexity here given the API layer already must authenticate the
    caller before touching either row.

## API Changes

Every API route under `src/app/api/books/**`, `src/app/api/copies/**`, and
`src/app/api/subjects/**`:

1. Calls Clerk's `auth()` (from `@clerk/nextjs/server`) to get the current
   `userId`. No session → `401`.
2. Passes `userId` into the corresponding repository function.

Repository changes (`src/lib/books/repository.ts`,
`src/lib/copies/repository.ts`, `src/lib/subjects/repository.ts`):

- `createBook`, `listBooks`, `updateBook`, `deleteBook`, `getBook` all gain
  a `userId` parameter and filter/scope every query by it (`WHERE user_id
  = ? AND ...`).
- Fetching, updating, or deleting a book/subject that exists but belongs
  to a different user returns **404**, not 403 — this avoids confirming
  to a caller that a given ID exists at all.
- `createCopy`/`updateCopy`/`deleteCopy` verify (via a join back to
  `books`) that the copy's parent book belongs to the requesting user
  before acting.
- `assignSubject`/`removeSubject` verify both the book and the subject
  belong to the requesting user before creating/deleting the
  `book_subjects` row.
- `listSubjectsWithCounts` scopes both the `subjects` row and the
  `book_subjects` join to the requesting user, so book-count badges only
  ever count that user's own books.

## New-User Seeding

A Clerk webhook endpoint (`src/app/api/webhooks/clerk/route.ts`) listens
for the `user.created` event (verified via `svix`, the library Clerk uses
to sign webhook payloads). On receipt, it inserts the same 25 curated
genre subjects (currently hardcoded in `scripts/seed-genres.ts`) as that
new user's private starting set — reusing the existing `GENRES` list
rather than duplicating it, by extracting it into a shared module both
the webhook and the standalone seed script import from.

## Migration & Rollout

Since there are no real signed-up users yet, rollout happens in three
steps:

1. **Add nullable `user_id`** to `books` and `subjects` (a normal Drizzle
   migration, hand-applied the same way prior migrations in this project
   were — see `drizzle/0001`-`0005` for the established pattern of
   generating + hand-reviewing + applying to both dev and test DBs).
2. **Deploy Clerk integration**, sign up as the first real user (the app
   owner), then run a one-off backfill script
   (`scripts/backfill-owner.ts`) that sets every existing book's and
   subject's `user_id` to that real Clerk user ID.
3. **Tighten `user_id` to `NOT NULL`** on both tables in a follow-up
   migration once the backfill is confirmed complete, closing the door on
   any future row slipping through without an owner.

## Testing

- Existing repository/API integration tests (`tests/integration/*.test.ts`)
  get a `userId` fixture threaded through every call.
- New tests specifically prove isolation: a request authenticated as user
  B for user A's book/subject/copy returns 404, not the data — for every
  read, update, and delete endpoint.
- The webhook handler gets a unit test mocking a `user.created` payload
  and asserting the new user ends up with exactly 25 subjects matching
  the shared `GENRES` list.

## Open Questions / Risks Flagged for the Plan

- Clerk's local-dev webhook delivery requires either a tunneling tool
  (e.g. `ngrok`) or testing against a deployed Preview URL — this needs a
  concrete answer during planning, since `localhost` can't receive
  inbound webhooks directly.
- The exact Clerk package version / Next.js App Router integration
  pattern (middleware file name/location, catch-all route conventions)
  should be double-checked against Clerk's current docs at
  implementation time, since these details drift between SDK versions.
