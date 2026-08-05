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

- `DATABASE_URL` is required at runtime; `.env` is for development and `.env.test` is for tests.
- Generate migrations with `npm run db:generate`, review the resulting `drizzle/` SQL, then apply with `npm run db:migrate`.
- Apply migrations to the test database with `npm run db:migrate:test` before integration tests against a new database.
- Seed development data with `npm run db:seed`; test data with `npm run db:seed:test`.
- Integration tests mutate the database and run serially (`fileParallelism: false`); never point `.env.test` at a database that must be preserved.

## Architecture

- The application entrypoints are under `src/app`; shared server/client code is under `src/lib` and UI components under `src/components`.
- Use the `@/*` alias for imports from `src/*`.
- Database access is Drizzle over `postgres` in `src/lib/db/index.ts`; schema changes belong in `src/lib/db/schema.ts` plus a reviewed Drizzle migration.
- Clerk protection is configured in `src/proxy.ts`, not `middleware.ts`; only `/sign-in`, `/sign-up`, and `/api/webhooks` are public.
- API routes use `requireUserId` and must preserve per-user isolation; the Clerk webhook at `/api/webhooks/clerk` seeds subjects for new users.
- Book metadata comes from Open Library in `src/lib/isbn-lookup/client.ts`; cover hosts must remain allowlisted in `next.config.ts` when adding a new source.

## Environment

- Start from `.env.example` and `.env.test.example`; required auth variables include Clerk keys, sign-in/sign-up paths, and the webhook signing secret.
- Do not print, commit, or copy values from `.env` or `.clerk/.tmp/`; treat them as credentials.

## OpenCode

- `opencode.json` enables the local shadcn MCP server through `npx shadcn@latest mcp`.

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If a deployment URL returns a Vercel Deployment Protection 401/403, retry the same URL with `vercel curl <url>`; don't disable protection or manage bypass secrets manually
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
