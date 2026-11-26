# Bug Verification: CSV ISBN Normalization

- **Slug**: csv-isbn-normalization
- **Tested**: 2026-11-26
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

CSV import now matches both in-batch and pre-existing ISBN entries after
canonicalization. Equivalent separator forms are reported as duplicates and
do not trigger a second create.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| CSV import tests | `npx vitest run tests/unit/csv-import.test.ts` | pass | Includes two separator-variant regression cases |
| Unit suite | `npx vitest run tests/unit` | pass | 13 files, 76 tests |
| Type-check | `npx tsc --noEmit` | pass | No output |
| Format | `npm run format:check` | pass | 122 files checked |
| Production build | `npm run build` | pass | Next.js production build completed |

## Output Excerpts

- `Test Files 13 passed (13)`
- `Tests 76 passed (76)`

## Residual Risks

- Integration tests against a disposable database were not run because
  `.env.test` is absent.

## Recommendation

Close this bug; the previously failing separator-variant scenarios now pass.
