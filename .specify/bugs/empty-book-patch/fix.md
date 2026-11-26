# Bug Fix: Empty Book Patch

- **Slug**: empty-book-patch
- **Fixed**: 2026-11-26
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The book PATCH route now rejects empty and unsupported-field-only bodies with
HTTP 400 before calling Drizzle.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/app/api/books/[id]/route.ts` | modified | Requires at least one recognized book field |
| `tests/unit/book-patch-validation.test.ts` | added | Covers empty and mass-assignment-only bodies |

## Tests Added or Updated

- `tests/unit/book-patch-validation.test.ts` — asserts both body shapes return
  400 with `no book fields to update`.

## Local Verification

- `npx vitest run tests/unit/book-patch-validation.test.ts` → pass (2 tests).
- `npx vitest run tests/unit` → 13 files, 76 tests passed.
- `npx tsc --noEmit` → pass.
- `npm run format:check` → pass.
- `npm run build` → pass.

## Deviations from Assessment

None.

## Follow-ups

- None.
