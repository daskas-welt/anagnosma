import { describe, it, expect } from 'vitest';
import { isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, subjects } from '@/lib/db/schema';
import { backfillOwner } from '../../scripts/backfill-owner';

const OWNER = 'user_backfill_test';

// NOTE: books.user_id and subjects.user_id are now NOT NULL (tightened in
// this same task, after the one-time real backfill against the dev DB
// completed). That means the "orphan row with a null user_id" scenario this
// test originally simulated can no longer exist at the database level — the
// column itself now enforces it. Inserting a row with userId: null is
// rejected with a 23502 not-null-violation before backfillOwner ever runs.
//
// backfillOwner() is kept as historical/audit tooling (it performed the real
// migration of the 56 pre-existing books / 25 pre-existing subjects to the
// first real user), but going forward it can only ever find zero orphans.
// This test documents and locks in that invariant instead of simulating a
// state the schema no longer permits.
describe('backfillOwner', () => {
  it('is always a no-op now that user_id is NOT NULL (no orphan rows can exist)', async () => {
    const result = await backfillOwner(OWNER);
    expect(result.books).toBe(0);
    expect(result.subjects).toBe(0);

    const orphanBooks = await db
      .select()
      .from(books)
      .where(isNull(books.userId));
    const orphanSubjects = await db
      .select()
      .from(subjects)
      .where(isNull(subjects.userId));
    expect(orphanBooks).toHaveLength(0);
    expect(orphanSubjects).toHaveLength(0);
  });
});
