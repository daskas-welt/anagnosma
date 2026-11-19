# Anagnosma Constitution

Anagnosma is a personal book-library manager built with Next.js (App Router),
TypeScript, Drizzle over Neon Postgres, Clerk authentication, and Vercel
hosting. This constitution records the rules the repository already depends on
and the standards new work must meet. It applies to humans and coding agents
alike.

## Core Principles

### I. Per-User Data Isolation (NON-NEGOTIABLE)

Catalog data belongs to exactly one Clerk user. Every user-owned table MUST
carry a `user_id` column, every repository function that reads or writes
user-owned rows MUST accept `userId` as its first argument and scope every
query by it, and every route or server action MUST resolve identity through
`requireUserId()` before touching repository code. Cross-user references MUST
be rejected: a copy, subject, or book-subject link may only be created or
mutated when its parent row belongs to the same `userId`, and a lookup that
does not match MUST read as "not found" rather than revealing that another
user's row exists. New tables and queries require coverage in
`tests/integration/multi-tenant-isolation.test.ts` or a sibling test file.
Rationale: a single catalog leak is a total privacy failure, so isolation is
enforced in depth — database constraint, repository scope, and test.

### II. Layered Server Boundaries

Route handlers are thin HTTP adapters: authenticate, parse, validate, delegate,
respond. All SQL lives in `src/lib/<domain>/repository.ts` modules accessed
through Drizzle; components, route handlers, and pages MUST NOT import
`@/lib/db` directly. Domain logic that is not a query lives in `src/lib`, not in
`src/app`. Schema changes belong in `src/lib/db/schema.ts` plus a reviewed
Drizzle migration in `drizzle/`, and generated SQL MUST be read before it is
applied. Rationale: keeping persistence in one layer makes isolation and
auditing reviewable.

### III. Typed and Validated Edges

All code MUST pass `npx tsc --noEmit` with the repository's `strict` settings.
Untrusted input — request bodies, URL parameters, numeric route ids, CSV rows,
and third-party API responses — MUST be validated at the boundary before it
reaches a repository. Route handlers MUST return the established shapes:
`{ error: string }` bodies with 400 for malformed input, 401 for missing
identity, and 409 for constraint conflicts. Raw database or upstream error text
MUST NOT reach clients; constraint violations are translated (see
`isUniqueViolation`). Shared edge helpers live in `src/lib/api-helpers.ts` and
routes MUST NOT re-implement them.

### IV. Test-Backed Changes

Behavior changes MUST ship with tests that fail without the change. Pure logic
(lib helpers, parsers, CSV handling, ISBN normalization, formatting) belongs in
`tests/unit`; anything touching the database or a route handler belongs in
`tests/integration`. Integration tests run serially against the configured test
database, MUST set up and clean up their own rows, and MUST NOT depend on seeded
production data. `npm test` MUST pass before merge, and a bug fix MUST include a
regression test that reproduces the original failure.

### V. Automated Quality Gates

Biome owns formatting and ESLint owns lint; contributors MUST NOT hand-format
around either tool. `npm run lint`, `npm run format:check`, `npx tsc --noEmit`,
`npm test`, and `npm run build` MUST pass for any change that touches source.
New runtime dependencies MUST be justified by a feature need and recorded in
`package.json` and `package-lock.json`; adding a dependency for a few lines of
code is not acceptable. Rationale: one machine-checkable definition of "green"
keeps reviews about design instead of style.

## Security, Secrets & External Services

- Secrets (Clerk keys, database URLs, webhook signing secrets, Blob tokens) live
  only in untracked environment files. They MUST NOT be committed, printed,
  copied into documentation, or passed to an agent as context; examples belong
  in `.env.example` and `.env.test.example`.
- Clerk protection is configured in `src/proxy.ts`. Adding a public route
  requires an explicit, reviewed entry in the public-route matcher, and API
  routes outside the webhook remain authenticated by default.
- Webhook handlers MUST verify signatures before trusting a payload and MUST be
  idempotent for repeated deliveries.
- External services (Open Library, Vercel Blob, Clerk, Neon) are reached only
  through adapters under `src/lib` so callers can be tested without network
  access. Remote image hosts MUST be allowlisted in `next.config.ts`; a new
  cover source without an allowlist entry is a defect.
- Data collection stays minimal: store what the catalog features need, and keep
  account and data deletion paths working when the schema changes.

## Development Workflow & Review

- Work happens on a branch and lands through a reviewable diff. A change MUST
  NOT mix unrelated refactors with behavior changes.
- Every migration MUST be generated with `npm run db:generate`, reviewed for
  destructive operations, and applied with `npm run db:migrate` before
  dependent integration tests run (`npm run db:migrate:test` for the test
  database).
- Schema, route-contract, environment, and deployment changes MUST update
  `AGENTS.md` and/or `README.md` in the same change.
- Because Anagnosma is AGPL-3.0 and offered over a network, changes MUST remain
  license-compatible and MUST NOT leave users of a modified deployment without
  the corresponding source.
- Reviews verify each principle above, and a reviewer MUST be able to point to
  the code, test, or command that satisfies it.

## Governance

This constitution supersedes ad-hoc practice. Amendments require a written
proposal in the change that edits this file, stating the principle affected, the
motivation, and any migration needed for existing code. Versioning follows
semantic versioning: MAJOR for removed or redefined principles, MINOR for new
principles or materially expanded guidance, PATCH for clarifications that do not
change obligations. Each amendment MUST update the version line and the
`Last Amended` date.

Compliance is reviewed in every pull request. An unresolved violation blocks
merge unless it is recorded as an explicit, time-boxed exception with an owner.
Where this document and `AGENTS.md` overlap, `AGENTS.md` carries the operational
commands and this document carries the obligations.

**Version**: 1.0.0 | **Ratified**: 2026-11-20 | **Last Amended**: 2026-11-20
