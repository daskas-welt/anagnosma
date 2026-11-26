# Bug Verification: Vercel Cover Upload Limit

- **Slug**: vercel-cover-upload-limit
- **Tested**: 2026-11-26
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The route now issues an authenticated Blob client-upload token with an 8 MB
limit, and both UI upload paths use the direct upload helper. Unit coverage
passes, but the original production-only 4.5 MB Vercel rejection was not
reproduced against a deployed project.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Client size boundary | `npx vitest run tests/unit/cover-upload-client.test.ts` | pass | Accepts 8 MB; rejects larger files before upload |
| Token/auth/path constraints | `npx vitest run tests/unit/upload-route.test.ts` | pass | Auth required for token generation; callback delegated to SDK |
| Unit suite | `npx vitest run tests/unit` | pass | 13 files, 76 tests |
| Type-check | `npx tsc --noEmit` | pass | No output |
| Lint | `npm run lint` | pass | Zero errors; one existing warning in recommendations |
| Live Vercel upload | Not run | not-run | No deployed Blob environment was used |
| Production build | `npm run build` | pass | Next.js production build completed |

## Output Excerpts

- `Test Files 13 passed (13)`
- `Tests 76 passed (76)`
- `Checked 122 files ... No fixes applied.`

## Residual Risks

- The end-to-end signed upload and Vercel callback still need confirmation in a
  deployed environment.

## Recommendation

Verify one upload near the 8 MB limit in a Vercel deployment before marking
this bug fully verified.
