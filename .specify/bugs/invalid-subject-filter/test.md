# Bug Verification: Invalid Subject Filter

- **Slug**: invalid-subject-filter
- **Tested**: 2026-11-26
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Both list endpoints return 400 for invalid subject IDs and do not call the
repository. A valid positive subject ID continues to be forwarded to the
correct collection query.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Subject filter tests | `npx vitest run tests/unit/subject-filter-validation.test.ts` | pass | 11 invalid/valid cases across both endpoints |
| Unit suite | `npx vitest run tests/unit` | pass | 13 files, 76 tests |
| Type-check | `npx tsc --noEmit` | pass | No output |
| Format | `npm run format:check` | pass | 122 files checked |
| Production build | `npm run build` | pass | Next.js production build completed |

## Output Excerpts

- `Test Files 13 passed (13)`
- `Tests 76 passed (76)`

## Residual Risks

- Database integration tests were not run because `.env.test` is absent and
  integration tests mutate their configured database.

## Recommendation

Close this bug; invalid query values no longer silently broaden the result set.
