import { db } from '@/lib/db';
import { subjects } from '@/lib/db/schema';

// A curated genre/category list for personal book collections, based on BISAC
// Subject Headings (the industry-standard classification used by publishers
// and booksellers) narrowed to the categories most useful for tagging a
// personal library rather than the full ~4000-code BISAC list.
export const GENRES = [
  'Romance',
  'Action & Adventure',
  'Contemporary Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery & Thriller',
  'Horror',
  'Historical Fiction',
  'Literary Fiction',
  'Young Adult',
  'Classic Fiction',
  'Short Stories',
  'Graphic Novels & Comics',
  'Poetry',
  'Biography & Memoir',
  'History',
  'Science & Nature',
  'Self-Help',
  'Business & Economics',
  'True Crime',
  'Philosophy',
  'Religion & Spirituality',
  'Travel',
  'Cooking',
  'Humor',
];

export async function seedGenresForUser(userId: string): Promise<number> {
  const inserted = await db
    .insert(subjects)
    .values(GENRES.map((name) => ({ name, userId })))
    .onConflictDoNothing({ target: [subjects.userId, subjects.name] })
    .returning({ name: subjects.name });
  return inserted.length;
}
