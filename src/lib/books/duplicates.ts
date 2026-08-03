export type DuplicateCandidate = { isbn?: string; title: string; author: string };
export type ExistingBook = { id: number; isbn: string | null; title: string; author: string };
export type DuplicateMatch = { id: number; reason: 'isbn' | 'title-author' };

export function findDuplicate(
  candidate: DuplicateCandidate,
  existing: ExistingBook[],
): DuplicateMatch | null {
  if (candidate.isbn) {
    const isbnMatch = existing.find((b) => b.isbn === candidate.isbn);
    if (isbnMatch) return { id: isbnMatch.id, reason: 'isbn' };
  }
  const normalizedTitle = candidate.title.trim().toLowerCase();
  const normalizedAuthor = candidate.author.trim().toLowerCase();
  const titleAuthorMatch = existing.find(
    (b) => b.title.trim().toLowerCase() === normalizedTitle && b.author.trim().toLowerCase() === normalizedAuthor,
  );
  if (titleAuthorMatch) return { id: titleAuthorMatch.id, reason: 'title-author' };
  return null;
}
