import { and, eq } from 'drizzle-orm';
import { createBook, deleteBook, listBooks } from '@/lib/books/repository';
import { db } from '@/lib/db';
import { catalogPreferences } from '@/lib/db/schema';

const SAMPLE_WISHLIST_BOOKS = [
  [
    'The Name of the Wind',
    'Patrick Rothfuss',
    2007,
    '9780756404741',
    'DAW Books',
    662,
  ],
  ['Dune', 'Frank Herbert', 1965, '9780441172719', 'Ace', 688],
  [
    'The Left Hand of Darkness',
    'Ursula K. Le Guin',
    1969,
    '9780441478125',
    'Ace',
    304,
  ],
  [
    'The Dispossessed',
    'Ursula K. Le Guin',
    1974,
    '9780061054884',
    'Harper Perennial Modern Classics',
    387,
  ],
  ['The Midnight Library', 'Matt Haig', 2020, '9780525559474', 'Viking', 304],
  [
    'The Ocean at the End of the Lane',
    'Neil Gaiman',
    2013,
    '9780062459367',
    'William Morrow',
    256,
  ],
  [
    'The Three-Body Problem',
    'Cixin Liu',
    2014,
    '9780765382030',
    'Tor Books',
    416,
  ],
  [
    'The Master and Margarita',
    'Mikhail Bulgakov',
    1967,
    '9780679760801',
    'Vintage',
    384,
  ],
  [
    'Invisible Cities',
    'Italo Calvino',
    1972,
    '9780156453806',
    'Mariner Books',
    176,
  ],
  [
    'The Remains of the Day',
    'Kazuo Ishiguro',
    1989,
    '9780679732761',
    'Vintage',
    258,
  ],
] as const;

const REPLACED_WISHLIST_SAMPLE_ISBN = '9781455563927';

export async function claimSampleWishlistSeed(
  userId: string,
): Promise<boolean> {
  const [created] = await db
    .insert(catalogPreferences)
    .values({ userId, sampleWishlistSeeded: true })
    .onConflictDoNothing()
    .returning({ userId: catalogPreferences.userId });
  if (created) return true;

  const [claimed] = await db
    .update(catalogPreferences)
    .set({ sampleWishlistSeeded: true })
    .where(
      and(
        eq(catalogPreferences.userId, userId),
        eq(catalogPreferences.sampleWishlistSeeded, false),
      ),
    )
    .returning({ userId: catalogPreferences.userId });
  return Boolean(claimed);
}

export async function seedSampleWishlist(userId: string) {
  const existingBooks = await listBooks(userId, { wishlist: true });
  const replacedSample = existingBooks.find(
    (book) => book.isSample && book.isbn === REPLACED_WISHLIST_SAMPLE_ISBN,
  );
  if (replacedSample) {
    await deleteBook(userId, replacedSample.id);
    await createBook(
      userId,
      {
        title: 'The Ocean at the End of the Lane',
        author: 'Neil Gaiman',
        isbn: '9780062459367',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780062459367-M.jpg',
        publisher: 'William Morrow',
        publishYear: 2013,
        pageCount: 256,
      },
      { isSample: true, isWishlist: true },
    );
    return;
  }

  if (!(await claimSampleWishlistSeed(userId))) return;
  if (existingBooks.length > 0) return;

  for (const [
    title,
    author,
    publishYear,
    isbn,
    publisher,
    pageCount,
  ] of SAMPLE_WISHLIST_BOOKS) {
    await createBook(
      userId,
      {
        title,
        author,
        isbn,
        coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
        publisher,
        publishYear,
        pageCount,
      },
      { isSample: true, isWishlist: true },
    );
  }
}
