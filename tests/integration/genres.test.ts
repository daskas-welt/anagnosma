import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { subjects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GENRES, seedGenresForUser } from '@/lib/subjects/genres';

const USER_ID = 'user_genres_test';

beforeEach(async () => {
  await db.delete(subjects).where(eq(subjects.userId, USER_ID));
});

describe('seedGenresForUser', () => {
  it('creates all 25 curated genres for a new user', async () => {
    const created = await seedGenresForUser(USER_ID);
    expect(created).toBe(GENRES.length);
    const rows = await db.select().from(subjects).where(eq(subjects.userId, USER_ID));
    expect(rows.map((r) => r.name).sort()).toEqual([...GENRES].sort());
  });

  it('is idempotent — running it again for the same user creates nothing new', async () => {
    await seedGenresForUser(USER_ID);
    const createdSecondTime = await seedGenresForUser(USER_ID);
    expect(createdSecondTime).toBe(0);
    const rows = await db.select().from(subjects).where(eq(subjects.userId, USER_ID));
    expect(rows).toHaveLength(GENRES.length);
  });
});
