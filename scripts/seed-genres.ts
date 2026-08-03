import { db } from '@/lib/db';
import { subjects } from '@/lib/db/schema';

// A curated genre/category list for personal book collections, based on BISAC
// Subject Headings (the industry-standard classification used by publishers
// and booksellers) narrowed to the categories most useful for tagging a
// personal library rather than the full ~4000-code BISAC list.
const GENRES = [
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

async function main() {
  const inserted = await db
    .insert(subjects)
    .values(GENRES.map((name) => ({ name })))
    .onConflictDoNothing({ target: subjects.name })
    .returning({ name: subjects.name });

  const skipped = GENRES.length - inserted.length;
  console.log(`Seeded ${inserted.length} genre subject(s).${skipped ? ` Skipped ${skipped} already present.` : ''}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
