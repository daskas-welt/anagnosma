export type Release = {
  version: string;
  releasedAt: string;
  title: string;
  summary: string;
  changes: readonly string[];
};

export const releases = [
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
