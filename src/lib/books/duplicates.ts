import { canonicalizeIsbn } from '@/lib/isbn';

export type DuplicateCandidate = {
  isbn?: string;
  title: string;
  author: string;
};
export type ExistingBook = {
  id: number;
  isbn: string | null;
  title: string;
  author: string;
  collection?: 'catalog' | 'wishlist';
};
export type DuplicateMatch = { id: number; reason: 'isbn' | 'title-author' };

export function findDuplicate(
  candidate: DuplicateCandidate,
  existing: ExistingBook[],
): DuplicateMatch | null {
  const candidateIsbn = canonicalizeIsbn(candidate.isbn);
  if (candidateIsbn) {
    const isbnMatch = existing.find(
      (book) => canonicalizeIsbn(book.isbn) === candidateIsbn,
    );
    if (isbnMatch) return { id: isbnMatch.id, reason: 'isbn' };
  }
  const normalizedTitle = candidate.title.trim().toLowerCase();
  const normalizedAuthor = candidate.author.trim().toLowerCase();
  const titleAuthorMatch = existing.find(
    (b) =>
      b.title.trim().toLowerCase() === normalizedTitle &&
      b.author.trim().toLowerCase() === normalizedAuthor,
  );
  if (titleAuthorMatch)
    return { id: titleAuthorMatch.id, reason: 'title-author' };
  return null;
}
