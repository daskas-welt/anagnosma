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
      'Anagnosma launches with the essentials for building and exploring a personal book catalog.',
    changes: [
      'Manage books, copies, subjects, notes, covers, and metadata.',
      'Search, sort, filter, and browse your personal catalog.',
      'Import catalog data from CSV and export it in several formats.',
      'Scan ISBNs and look up book details from Open Library.',
      'See clearly which section of the app is currently active.',
    ],
  },
] as const satisfies readonly Release[];
