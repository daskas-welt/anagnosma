# Bug Assessment: CSV ISBN Normalization

- **Slug**: csv-isbn-normalization
- **Created**: 2026-11-26
- **Source**: Conversation bug review
- **Verdict**: valid
- **Severity**: medium

## Report

CSV duplicate matching trims ISBN values but compares their textual forms
directly. Equivalent valid ISBNs with different hyphenation are not recognized
as duplicates.

## Symptom

If two rows represent the same valid ISBN using different separators, the
second row is sent to the database. The repository canonicalizes the ISBN, so
the unique constraint rejects the second row and the import reports a failure
instead of a duplicate.

## Reproduction

1. Import a CSV containing ISBN `978-0-441-01359-3`.
2. Include another row with ISBN `9780441013593`.
3. Observe the second row reported as a failure rather than a duplicate.

## Suspected Code Paths

- `src/lib/csv/import.ts:80-88` — trims but does not canonicalize ISBN before
  duplicate matching.
- `src/lib/books/duplicates.ts:15-21` — compares ISBN strings literally.
- `src/lib/books/repository.ts:41-48` — canonicalizes ISBN when creating a book.
- `src/lib/db/schema.ts:29-31` — enforces a per-user unique ISBN.

## Root Cause Hypothesis

The duplicate matcher and the write path use different ISBN representations.
Confidence: high; a pure import reproduction reports a uniqueness failure for
the second row.

## Proposed Remediation

**Preferred**: Canonicalize valid ISBNs before matching, pass the canonical
value to the create callback, and add canonical values to the in-batch working
set. Keep non-ISBN catalog identifiers trimmed and intact as the existing
`canonicalizeIsbn` helper does.

**Files likely to change**:
- `src/lib/csv/import.ts`
- `src/lib/books/duplicates.ts`
- `tests/unit/csv-import.test.ts`

**Tests to add or update**:
- Separator variants of the same valid ISBN are detected within a CSV batch.
- A separator variant matching an existing book is skipped as a duplicate.
- The second duplicate does not invoke the create callback or produce a
  failure.

## Risks & Considerations

- ISBN-10 to ISBN-13 conversion is outside this fix; canonicalization here
  removes separators and validates the existing supported forms.
- Preserve duplicate detection for invalid/non-ISBN catalog identifiers.

## Open Questions

- None.
