# Bug Fix: CSV ISBN Normalization

- **Slug**: csv-isbn-normalization
- **Fixed**: 2026-11-26
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

CSV rows now canonicalize ISBNs before duplicate matching and persistence.
Existing entries are canonicalized during matching as well, so separator
variants are handled consistently.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/csv/import.ts` | modified | Canonicalizes ISBNs before duplicate checks and stores canonical values in the working set |
| `src/lib/books/duplicates.ts` | modified | Compares canonicalized candidate and existing ISBNs |
| `tests/unit/csv-import.test.ts` | modified | Covers in-batch and existing-entry separator variants |

## Tests Added or Updated

- `tests/unit/csv-import.test.ts` — asserts separator variants skip the second
  create and report a duplicate rather than a failure.

## Local Verification

- `npx vitest run tests/unit/csv-import.test.ts` → pass.
- `npx vitest run tests/unit` → 13 files, 76 tests passed.
- `npx tsc --noEmit` → pass.
- `npm run format:check` → pass.
- `npm run build` → pass.
- `npm run lint` → zero errors; one existing warning in
  `src/lib/recommendations.ts:648`.

## Deviations from Assessment

None.

## Follow-ups

- None.
