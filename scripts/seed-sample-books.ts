import { createBook } from '@/lib/books/repository';
import { updateCopy } from '@/lib/copies/repository';
import { createSubject, assignSubject, listSubjectsWithCounts } from '@/lib/subjects/repository';
import { lookupByIsbn } from '@/lib/isbn-lookup/client';
import { FORMATS } from '@/lib/formats';

// Two well-known books per seeded genre subject, spanning all 25 subjects.
const SEED_BOOKS: { title: string; author: string; subject: string }[] = [
  { title: 'Pride and Prejudice', author: 'Jane Austen', subject: 'Romance' },
  { title: 'The Notebook', author: 'Nicholas Sparks', subject: 'Romance' },
  { title: 'The Count of Monte Cristo', author: 'Alexandre Dumas', subject: 'Action & Adventure' },
  { title: 'Treasure Island', author: 'Robert Louis Stevenson', subject: 'Action & Adventure' },
  { title: 'Where the Crawdads Sing', author: 'Delia Owens', subject: 'Contemporary Fiction' },
  { title: 'The Kite Runner', author: 'Khaled Hosseini', subject: 'Contemporary Fiction' },
  { title: '1984', author: 'George Orwell', subject: 'Science Fiction' },
  { title: 'Brave New World', author: 'Aldous Huxley', subject: 'Science Fiction' },
  { title: 'The Name of the Wind', author: 'Patrick Rothfuss', subject: 'Fantasy' },
  { title: 'A Game of Thrones', author: 'George R.R. Martin', subject: 'Fantasy' },
  { title: 'Gone Girl', author: 'Gillian Flynn', subject: 'Mystery & Thriller' },
  { title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', subject: 'Mystery & Thriller' },
  { title: 'It', author: 'Stephen King', subject: 'Horror' },
  { title: 'Dracula', author: 'Bram Stoker', subject: 'Horror' },
  { title: 'All the Light We Cannot See', author: 'Anthony Doerr', subject: 'Historical Fiction' },
  { title: 'The Book Thief', author: 'Markus Zusak', subject: 'Historical Fiction' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', subject: 'Literary Fiction' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', subject: 'Literary Fiction' },
  { title: 'The Hunger Games', author: 'Suzanne Collins', subject: 'Young Adult' },
  { title: 'The Fault in Our Stars', author: 'John Green', subject: 'Young Adult' },
  { title: 'Moby-Dick', author: 'Herman Melville', subject: 'Classic Fiction' },
  { title: 'War and Peace', author: 'Leo Tolstoy', subject: 'Classic Fiction' },
  { title: 'Dubliners', author: 'James Joyce', subject: 'Short Stories' },
  { title: 'Nine Stories', author: 'J.D. Salinger', subject: 'Short Stories' },
  { title: 'Watchmen', author: 'Alan Moore', subject: 'Graphic Novels & Comics' },
  { title: 'Maus', author: 'Art Spiegelman', subject: 'Graphic Novels & Comics' },
  { title: 'Leaves of Grass', author: 'Walt Whitman', subject: 'Poetry' },
  { title: 'The Waste Land', author: 'T.S. Eliot', subject: 'Poetry' },
  { title: 'Educated', author: 'Tara Westover', subject: 'Biography & Memoir' },
  { title: 'Long Walk to Freedom', author: 'Nelson Mandela', subject: 'Biography & Memoir' },
  { title: 'Sapiens', author: 'Yuval Noah Harari', subject: 'History' },
  { title: 'Guns, Germs, and Steel', author: 'Jared Diamond', subject: 'History' },
  { title: 'A Brief History of Time', author: 'Stephen Hawking', subject: 'Science & Nature' },
  { title: 'The Selfish Gene', author: 'Richard Dawkins', subject: 'Science & Nature' },
  { title: 'Atomic Habits', author: 'James Clear', subject: 'Self-Help' },
  { title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', subject: 'Self-Help' },
  { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', subject: 'Business & Economics' },
  { title: 'The Lean Startup', author: 'Eric Ries', subject: 'Business & Economics' },
  { title: 'In Cold Blood', author: 'Truman Capote', subject: 'True Crime' },
  { title: 'The Devil in the White City', author: 'Erik Larson', subject: 'True Crime' },
  { title: 'Meditations', author: 'Marcus Aurelius', subject: 'Philosophy' },
  { title: 'Thus Spoke Zarathustra', author: 'Friedrich Nietzsche', subject: 'Philosophy' },
  { title: 'The Power of Now', author: 'Eckhart Tolle', subject: 'Religion & Spirituality' },
  { title: "Man's Search for Meaning", author: 'Viktor Frankl', subject: 'Religion & Spirituality' },
  { title: 'Into the Wild', author: 'Jon Krakauer', subject: 'Travel' },
  { title: 'A Walk in the Woods', author: 'Bill Bryson', subject: 'Travel' },
  { title: 'Salt, Fat, Acid, Heat', author: 'Samin Nosrat', subject: 'Cooking' },
  { title: 'The Joy of Cooking', author: 'Irma S. Rombauer', subject: 'Cooking' },
  { title: 'Bossypants', author: 'Tina Fey', subject: 'Humor' },
  { title: 'Is Everyone Hanging Out Without Me?', author: 'Mindy Kaling', subject: 'Humor' },
];

const SAMPLE_NOTES = [
  'A great read, would recommend.',
  'Picked this up secondhand — nice condition.',
  'On the to-reread pile.',
  'Borrowed by a friend once, got it back.',
  'Signed copy from a bookstore event.',
];

async function findIsbn(title: string, author: string): Promise<string | null> {
  const q = encodeURIComponent(`${title} ${author}`);
  const res = await fetch(`https://openlibrary.org/search.json?q=${q}&fields=title,isbn&limit=5`);
  if (!res.ok) return null;
  const data = await res.json();
  for (const doc of data.docs ?? []) {
    if (doc.title?.toLowerCase() === title.toLowerCase() && doc.isbn?.length) {
      return doc.isbn[0];
    }
  }
  return data.docs?.[0]?.isbn?.[0] ?? null;
}

async function main() {
  const userId = 'seed_user';
  const existingSubjects = await listSubjectsWithCounts(userId);
  const subjectIdByName = new Map(existingSubjects.map((s) => [s.name, s.id]));

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < SEED_BOOKS.length; i++) {
    const entry = SEED_BOOKS[i];
    try {
      const isbn = await findIsbn(entry.title, entry.author);
      const meta = isbn ? await lookupByIsbn(isbn) : null;

      const format = FORMATS[i % FORMATS.length].value;
      const book = await createBook(userId, {
        title: entry.title,
        author: entry.author,
        format,
        isbn: meta?.isbn ?? isbn ?? undefined,
        publisher: meta?.publisher,
        publishYear: meta?.publishYear,
        pageCount: meta?.pageCount,
        coverUrl: meta?.coverUrl,
        description: meta?.description,
      });

      if (book.copies[0]) {
        await updateCopy(userId, book.copies[0].id, { notes: SAMPLE_NOTES[i % SAMPLE_NOTES.length] });
      }

      let subjectId = subjectIdByName.get(entry.subject);
      if (!subjectId) {
        const created = await createSubject(userId, entry.subject);
        subjectId = created.id;
        subjectIdByName.set(entry.subject, subjectId);
      }
      await assignSubject(userId, book.id, subjectId);

      created++;
      console.log(`[${i + 1}/${SEED_BOOKS.length}] Created "${entry.title}" (${entry.subject})`);
    } catch (err) {
      skipped++;
      console.error(`[${i + 1}/${SEED_BOOKS.length}] Skipped "${entry.title}":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
