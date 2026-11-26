# Bug Assessment: Invalid Subject Filter

- **Slug**: invalid-subject-filter
- **Created**: 2026-11-26
- **Source**: Conversation bug review
- **Verdict**: valid
- **Severity**: low

## Report

The books and wishlist endpoints convert `subjectId` with `Number()` but do not
reject invalid values. `NaN` is falsy in `listBooks`, so the subject condition
is skipped and the endpoint returns the unfiltered collection.

## Symptom

Requests such as `GET /api/books?subjectId=abc` or
`GET /api/wishlist?subjectId=0` silently return all of the user's books rather
than a 400 response or an empty filtered result. Values above PostgreSQL's
positive `serial` range are also invalid.

## Reproduction

1. Create at least two books for the authenticated user.
2. Request `/api/books?subjectId=abc`.
3. Observe the response includes all of the user's books.
4. Repeat with `/api/wishlist?subjectId=abc`.

## Suspected Code Paths

- `src/app/api/books/route.ts:17-26` — converts the query parameter using
  `Number()` and passes `NaN` to `listBooks`.
- `src/app/api/wishlist/route.ts:16-24` — uses the same conversion.
- `src/lib/books/repository.ts:99-115` — uses a truthiness check, which skips
  `NaN` and zero.

## Root Cause Hypothesis

Invalid query values are treated as absent filters. Confidence: high; `Number`
returns `NaN` for non-numeric values, and the repository only enters the
subject-query branch when the value is truthy.

## Proposed Remediation

**Preferred**: Parse present subject IDs as positive integers in both routes
and return 400 when parsing fails or the value is not positive. In
`listBooks`, distinguish an omitted filter from a supplied zero using an
`undefined` check rather than truthiness.

**Files likely to change**:
- `src/app/api/books/route.ts`
- `src/app/api/wishlist/route.ts`
- `src/lib/books/repository.ts`
- A focused unit test for the two route handlers.

**Tests to add or update**:
- Non-numeric, zero, negative, and empty supplied subject IDs return 400 from
  both endpoints before repository queries; values above the `serial` range
  are rejected too.
- A valid positive subject ID is passed to the repository.

## Risks & Considerations

- Keep an omitted `subjectId` distinct from a present but empty parameter.
- No database migration is required.

## Open Questions

- None.
