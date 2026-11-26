# Bug Assessment: Empty Book Patch

- **Slug**: empty-book-patch
- **Created**: 2026-11-26
- **Source**: Conversation bug review
- **Verdict**: valid
- **Severity**: medium

## Report

An empty JSON object sent to the book PATCH route reaches Drizzle as an empty
update set and throws `No values to set`.

## Symptom

An authenticated client sending `PATCH /api/books/:id` with `{}` receives an
unhandled 500 instead of a clear client error or a no-op response.

## Reproduction

1. Authenticate as a user with a book in the catalog.
2. Send `PATCH /api/books/<id>` with JSON body `{}`.
3. Observe Drizzle throw while building the empty update.

## Suspected Code Paths

- `src/app/api/books/[id]/route.ts:25-37` — passes the parsed body to the
  repository without checking for mutable fields.
- `src/lib/books/repository.ts:176-200` — builds an empty patch and calls
  `.set(patch)`.

## Root Cause Hypothesis

The route accepts empty or unknown-only objects; the repository's whitelist
then produces an empty update, which Drizzle rejects. Confidence: high; direct
reproduction returns `No values to set`.

## Proposed Remediation

**Preferred**: Validate that the request contains at least one supported book
field before calling `updateBook`. Return 400 for empty and unknown-only
patches. Preserve existing nullable-field clearing behavior.

**Files likely to change**:
- `src/app/api/books/[id]/route.ts`
- A focused unit test for the PATCH route.

**Tests to add or update**:
- Empty `{}` and unknown-only bodies return 400 without calling the repository.
- A supported patch field continues to reach the repository.

## Risks & Considerations

- Do not reject supported optional fields set to `null`; those clear values by
  design.
- No database migration is required.

## Open Questions

- None.
