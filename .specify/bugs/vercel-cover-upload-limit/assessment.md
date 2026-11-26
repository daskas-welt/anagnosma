# Bug Assessment: Vercel Cover Upload Limit

- **Slug**: vercel-cover-upload-limit
- **Created**: 2026-11-26
- **Source**: Conversation bug review
- **Verdict**: valid
- **Severity**: medium

## Report

The upload route advertises an 8 MB cover limit and streams files through a
Vercel Function, whose request body limit is 4.5 MB.

## Symptom

On Vercel, cover files larger than 4.5 MB and up to the route's advertised
8 MB limit are rejected with a platform 413 before the route can upload them.
The client has no matching size check.

## Reproduction

1. Deploy the app to Vercel.
2. Select a supported cover image larger than 4.5 MB but no larger than 8 MB.
3. Upload it from either book-cover form.
4. Observe that Vercel rejects the request before `/api/upload` handles it.

## Suspected Code Paths

- `src/app/api/upload/route.ts:4-19` — declares and checks an 8 MB server-upload
  limit.
- `src/components/add-book-modal.tsx` — sends the file body through `/api/upload`.
- `src/components/book-detail-sheet.tsx` — sends the file body through the same
  server route.
- `src/proxy.ts` — Clerk middleware currently protects the upload route.

## Root Cause Hypothesis

The browser sends the entire file as the request body to a Vercel Function.
Vercel rejects bodies over 4.5 MB before application code executes. Confidence:
high; this matches Vercel's documented function payload limit.

## Proposed Remediation

**Preferred**: Use `@vercel/blob/client` uploads from both cover forms and
`handleUpload` to issue authenticated tokens restricted to the `covers/` path,
image content types, and an 8 MB maximum. Allow the signed Blob completion
callback through Clerk middleware; keep token generation authenticated in the
route handler. Check the file size client-side for a clear error.

**Alternatives**:
- Lower the supported limit to 4.5 MB and reject larger files in the UI. This
  is simpler but reduces the current advertised limit.

**Files likely to change**:
- `src/app/api/upload/route.ts`
- `src/proxy.ts`
- `src/components/add-book-modal.tsx`
- `src/components/book-detail-sheet.tsx`
- A shared cover-upload helper and focused unit tests.

**Tests to add or update**:
- Verify token generation requires an authenticated user and constrains uploads
  to the cover path, image types, and 8 MB.
- Verify both UI paths reject files above 8 MB and use the client upload flow.

## Risks & Considerations

- `/api/upload` must be reachable for Blob callbacks, which are authenticated
  by the Blob SDK signature rather than a Clerk browser session.
- Local Blob completion callbacks are not delivered without a public callback
  URL; token generation and the client upload path remain testable locally.

## Open Questions

- None. The user selected preserving the 8 MB allowance with client uploads.
