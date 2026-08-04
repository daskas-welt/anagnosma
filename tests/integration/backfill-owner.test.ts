import { describe, it, expect, beforeEach } from 'vitest';
import { isNull, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, subjects } from '@/lib/db/schema';
import { backfillOwner } from '../../scripts/backfill-owner';

const OWNER = 'user_backfill_test';

beforeEach(async () => {
  await db.delete(books).where(eq(books.userId, OWNER));
  await db.delete(subjects).where(eq(subjects.userId, OWNER));
  // Simulate pre-multi-tenant rows: insert with a null user_id directly.
  await db.insert(books).values({ title: 'Orphan Book', author: 'Nobody', userId: null as unknown as string });
  await db.insert(subjects).values({ name: 'Orphan Subject', userId: null as unknown as string });
});

describe('backfillOwner', () => {
  it('assigns every ownerless book and subject to the given user', async () => {
    const result = await backfillOwner(OWNER);
    expect(result.books).toBeGreaterThanOrEqual(1);
    expect(result.subjects).toBeGreaterThanOrEqual(1);
    const remainingOrphanBooks = await db.select().from(books).where(isNull(books.userId));
    const remainingOrphanSubjects = await db.select().from(subjects).where(isNull(subjects.userId));
    expect(remainingOrphanBooks).toHaveLength(0);
    expect(remainingOrphanSubjects).toHaveLength(0);
  });

  it('is a no-op the second time (nothing left to backfill)', async () => {
    await backfillOwner(OWNER);
    const result = await backfillOwner(OWNER);
    expect(result.books).toBe(0);
    expect(result.subjects).toBe(0);
  });
});
