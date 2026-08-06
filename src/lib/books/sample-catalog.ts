import { createBook, listBooks } from '@/lib/books/repository';
import { db } from '@/lib/db';
import { catalogPreferences } from '@/lib/db/schema';
import { assignSubject, getOrCreateSubject } from '@/lib/subjects/repository';

const SAMPLE_BOOKS = [
  [
    '1984',
    'George Orwell',
    1949,
    'Classic Literature',
    '9780451524935',
    'Signet Classic',
    328,
  ],
  [
    'Pride and Prejudice',
    'Jane Austen',
    1813,
    'Classic Literature',
    '9780141439518',
    'Penguin Classics',
    480,
  ],
  [
    'To Kill a Mockingbird',
    'Harper Lee',
    1960,
    'Classic Literature',
    '9780061120084',
    'Harper Perennial Modern Classics',
    336,
  ],
  [
    'One Hundred Years of Solitude',
    'Gabriel García Márquez',
    1967,
    'Literary Fiction',
    '9780060883287',
    'Harper Perennial',
    417,
  ],
  [
    'The Great Gatsby',
    'F. Scott Fitzgerald',
    1925,
    'Classic Literature',
    '9780743273565',
    'Scribner',
    180,
  ],
  [
    'The Hobbit',
    'J. R. R. Tolkien',
    1937,
    'Fantasy',
    '9780547928227',
    'Mariner Books',
    300,
  ],
  [
    'Sapiens: A Brief History of Humankind',
    'Yuval Noah Harari',
    2014,
    'History',
    '9780062316097',
    'Harper Perennial',
    464,
  ],
  [
    'Meditations',
    'Marcus Aurelius',
    180,
    'Philosophy',
    '9780140449334',
    'Penguin Classics',
    272,
  ],
  [
    'The Odyssey',
    'Homer',
    -700,
    'Classics',
    '9780140268867',
    'Penguin Classics',
    560,
  ],
  [
    'The Little Prince',
    'Antoine de Saint-Exupéry',
    1943,
    'Children’s Literature',
    '9780156012195',
    'Harvest Books',
    96,
  ],
] as const;

export async function seedSampleCatalog(userId: string) {
  const [claimed] = await db
    .insert(catalogPreferences)
    .values({ userId, sampleCatalogSeeded: true })
    .onConflictDoNothing()
    .returning();
  if (!claimed) return;
  if ((await listBooks(userId)).length > 0) return;

  for (const [
    title,
    author,
    publishYear,
    subjectName,
    isbn,
    publisher,
    pageCount,
  ] of SAMPLE_BOOKS) {
    const subject = await getOrCreateSubject(userId, subjectName);
    const book = await createBook(
      userId,
      {
        title,
        author,
        isbn,
        coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
        publisher,
        publishYear,
        pageCount,
        format: 'paperback',
      },
      { isSample: true },
    );
    if (subject) await assignSubject(userId, book.id, subject.id);
  }
}
