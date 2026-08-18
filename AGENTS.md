# Agent Instructions

## Commands

- Install with `npm install`; `package-lock.json` is the repository lockfile.
- Run the app with `npm run dev` and open `http://localhost:3000`.
- Run lint with `npm run lint`.
- Format with `npm run format`; verify formatting with `npm run format:check`.
- Run type checking with `npx tsc --noEmit`; there is no package-script alias.
- Run all tests with `npm test`; this loads `.env.test` and uses the configured test database.
- Run one test file with `npx dotenv -e .env.test -- vitest run tests/unit/isbn-lookup-client.test.ts` (replace the path as needed).
- Run a production verification with `npm run build`.

## Database

- `DATABASE_URL` is required at runtime; the dev config lives in `.env.local` (Next.js loads it), while `.env.test` drives tests.
- Env files are inconsistent per script — only `db:migrate`/`db:generate` run bare `drizzle-kit` (reads `DATABASE_URL` from the ambient environment), while `db:migrate:test`, `db:seed`, and `db:seed:test` wrap with `dotenv -e`. There is no checked-in `.env`; `npm run db:seed` targets `.env`, so it can fail unless you create one.
- Generate migrations with `npm run db:generate`, review the SQL in `drizzle/`, then apply with `npm run db:migrate`.
- Apply migrations to the test database with `npm run db:migrate:test` before integration tests against a new database.
- The seed scripts call `scripts/seed-genres.ts`, which requires a Clerk user ID argument: `npx dotenv -e .env.local -- tsx scripts/seed-genres.ts <clerk-user-id>`.
- Integration tests mutate the database and run serially (`fileParallelism: false` in `vitest.config.ts`); never point `.env.test` at a database that must be preserved.

## Architecture

- The application entrypoints are under `src/app`; shared server/client code is under `src/lib` and UI components under `src/components`.
- Use the `@/*` alias for imports from `src/*`.
- Database access is Drizzle over `postgres` in `src/lib/db/index.ts`; schema changes belong in `src/lib/db/schema.ts` plus a reviewed Drizzle migration.
- Clerk protection is configured in `src/proxy.ts`, not `middleware.ts`; public routes are `/sign-in`, `/sign-up`, `/releases`, and `/api/webhooks`.
- API routes use `requireUserId` and must preserve per-user isolation; the Clerk webhook at `/api/webhooks/clerk` seeds subjects for new users.
- Book metadata comes from Open Library in `src/lib/isbn-lookup/client.ts`; cover hosts must remain allowlisted in `next.config.ts` when adding a new source.

## Environment

- Start from `.env.example` and `.env.test.example`; required auth variables include Clerk keys, sign-in/sign-up paths, and the webhook signing secret.
- Do not print, commit, or copy values from `.env` or `.clerk/.tmp/`; treat them as credentials.

## OpenCode

- `opencode.json` enables the local shadcn MCP server through `npx shadcn@latest mcp`.

## Deploy

- The app deploys to Vercel. User-uploaded covers go to Vercel Blob via `src/app/api/upload/route.ts`; the Blob host is allowlisted in `next.config.ts`.
