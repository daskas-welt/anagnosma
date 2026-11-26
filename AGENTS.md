# Agent Instructions

## Commands

- Install dependencies with `npm install`; `package-lock.json` is the lockfile.
- Run the app with `npm run dev` at `http://localhost:3000`.
- Run checks with `npm run lint`, `npm run format:check`, `npx tsc --noEmit`,
  and `npm test`. Use `npm run build` for production verification.
- Run one test file with
  `npx dotenv -e .env.test -- vitest run <path-to-test>`.
- `npm test` loads `.env.test`. Integration tests mutate the database and run
  serially; use a disposable test database. Run `npm run db:migrate:test`
  before integration tests against a new database.

## Database and Environment

- Runtime database access requires `DATABASE_URL`. Next.js loads development
  values from `.env.local`; `db:generate` and `db:migrate` read
  `DATABASE_URL` from the ambient environment. Test migration uses `.env.test`.
- Generate migrations with `npm run db:generate`, review SQL in `drizzle/`,
  then apply with `npm run db:migrate`.
- Seed scripts require a Clerk user ID. `db:seed` loads `.env` (not checked in);
  seed development data with
  `npx dotenv -e .env.local -- tsx scripts/seed-genres.ts <clerk-user-id>`.
- Use `.env.example` and `.env.test.example` for required variables. Never
  print, commit, or copy secrets from environment files or `.clerk/.tmp/`.

## Architecture

- Next.js routes are in `src/app`; shared server/client code is in `src/lib`;
  UI components are in `src/components`. The `@/*` alias maps to `src/*`.
- Clerk route protection is configured in `src/proxy.ts`. Public routes are
  `/sign-in`, `/sign-up`, `/releases`, and `/api/webhooks`. API handlers must
  use `requireUserId`; keep reads and writes scoped to that user through the
  repository layer.
- Drizzle/Postgres setup is in `src/lib/db/index.ts`; schema is in
  `src/lib/db/schema.ts`. The Clerk webhook at `/api/webhooks/clerk` seeds
  subjects for new users.
- ISBN metadata comes from Open Library (`src/lib/isbn-lookup/client.ts`).
  When adding a cover source, update the remote host allowlist in
  `next.config.ts`; uploaded covers use Vercel Blob.
