# Bug Fix: Vercel Cover Upload Limit

- **Slug**: vercel-cover-upload-limit
- **Fixed**: 2026-11-26
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Moved cover uploads to Vercel Blob's authenticated client-upload flow. The
server now issues signed tokens capped at 8 MB and restricted to image uploads,
so file bytes no longer pass through the Vercel Function request limit.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/app/api/upload/route.ts` | modified | Handles client-token generation and signed completion callbacks |
| `src/proxy.ts` | modified | Allows Blob callbacks to reach the signature-verifying handler |
| `src/lib/cover-upload-constants.ts` | added | Shares the 8 MB upload limit |
| `src/lib/cover-upload-client.ts` | added | Client upload helper and local size/type validation |
| `src/components/add-book-modal.tsx` | modified | Uses the shared client-upload helper |
| `src/components/book-detail-sheet.tsx` | modified | Uses the shared client-upload helper |
| `tests/unit/upload-route.test.ts` | added | Covers token constraints, authentication, and path validation |
| `tests/unit/cover-upload-client.test.ts` | added | Covers client upload options and the size boundary |

## Tests Added or Updated

- `tests/unit/upload-route.test.ts` — checks authenticated token issuance is
  constrained to `covers/`, images, and 8 MB; rejects other paths; completion
  callbacks bypass Clerk auth and are delegated to the Blob SDK for signature
  verification.
- `tests/unit/cover-upload-client.test.ts` — checks the 8 MB boundary and
  rejects oversized files before requesting a token.

## Local Verification

- `npx vitest run tests/unit/upload-route.test.ts tests/unit/cover-upload-client.test.ts` → pass
- `npx vitest run tests/unit` → 13 files, 76 tests passed.
- `npx tsc --noEmit` → pass.
- `npm run format:check` → pass.
- `npm run build` → pass.
- `npm run lint` → zero errors; one existing warning in
  `src/lib/recommendations.ts:648`.

## Deviations from Assessment

None.

## Follow-ups

- Verify an 8 MB upload against a deployed Vercel environment; the local unit
  tests do not perform a real Blob upload or signed callback.
