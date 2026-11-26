# Bug Fix: Invalid Subject Filter

- **Slug**: invalid-subject-filter
- **Fixed**: 2026-11-26
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The books and wishlist endpoints now reject malformed, non-positive, and
out-of-range `subjectId` query values with HTTP 400. `listBooks` also tests
whether the filter was supplied rather than relying on truthiness.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/app/api/books/route.ts` | modified | Validates present subject IDs |
| `src/app/api/wishlist/route.ts` | modified | Applies the same validation |
| `src/lib/books/repository.ts` | modified | Applies a supplied subject filter even if its value is zero |
| `tests/unit/subject-filter-validation.test.ts` | added | Covers invalid values and valid filter forwarding |

## Tests Added or Updated

- `tests/unit/subject-filter-validation.test.ts` — checks `abc`, empty, zero,
  negative, and values above the PostgreSQL serial integer range on both
  endpoints; confirms valid positive IDs are forwarded.

## Local Verification

- `npx vitest run tests/unit/subject-filter-validation.test.ts` → pass (11 tests).
- `npx vitest run tests/unit` → 13 files, 76 tests passed.
- `npx tsc --noEmit` → pass.
- `npm run format:check` → pass.
- `npm run build` → pass.

## Deviations from Assessment

None.

## Follow-ups

- None.
