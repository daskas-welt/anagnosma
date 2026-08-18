export type Release = {
  version: string;
  releasedAt: string;
  title: string;
  summary: string;
  changes: readonly string[];
};

export const releases = [
  {
    version: '0.2.0',
    releasedAt: '2026-08-19',
    title: 'A better next read',
    summary:
      'Recommendations now help you discover popular books from the subjects, catalog, and wishlist you already care about.',
    changes: [
      'Recommend books using Google Books and Open Library, preferring Google Books descriptions and metadata when both sources match.',
      'Rank recommendations by rating quality and rating volume to surface popular, well-reviewed books first.',
      'Keep at least 12 recommendations available with provider refill attempts and a curated fallback library.',
      'Refresh recommendations explicitly while preserving the current set when revisiting the page.',
      'Choose to display 6, 12, 18, or 24 recommendations.',
      'Show ISBNs, publishers, page counts, ratings, descriptions, and subjects when available.',
      'Align recommendation cards with catalog and wishlist grids across responsive layouts.',
    ],
  },
  {
    version: '0.1.0',
    releasedAt: '2026-08-09',
    title: 'The first shelf',
    summary:
      'The first release of Anagnosma provides a complete foundation for managing a personal book catalog and wishlist.',
    changes: [
      'Manage books, copies, subjects, notes, covers, publishers, publication years, page counts, and other metadata.',
      'Search the catalog and wishlist, filter books by subject, and switch between grid, carousel, table, and subject views.',
      'Maintain a separate wishlist for books to purchase and read, with the same browsing tools as the catalog.',
      'Add wishlist books without requiring a physical copy, while keeping wishlist and owned catalog ISBNs separate.',
      'Import CSV files from Anagnosma, Goodreads, LibraryThing, or other sources with automatic column matching and preview.',
      'Export Catalog and Wishlist books as CSV, Excel, Word, or PDF documents with collection, version, and export-date metadata.',
      'Scan ISBNs on mobile devices and small screens, then look up book details from Open Library.',
      'Create, rename, search, and delete subjects with book usage counts.',
      'Detect duplicate ISBNs during book creation and import to help protect the collection from duplicate entries.',
      'Seed sample catalog and wishlist books to help new users explore the application.',
      'Provide responsive layouts for desktop and mobile screens, with light and dark theme support.',
      'Keep catalog and wishlist data isolated per signed-in user.',
    ],
  },
] as const satisfies readonly Release[];
