export type BookMetadata = {
  isbn: string;
  title: string;
  author: string;
  coverUrl?: string;
  publisher?: string;
  publishYear?: number;
  pageCount?: number;
  description?: string;
};

export async function lookupByIsbn(
  isbn: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BookMetadata | null> {
  const res = await fetchImpl(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.totalItems || !data.items?.length) return null;
  const info = data.items[0].volumeInfo;
  const publishYear = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : undefined;
  return {
    isbn,
    title: info.title,
    author: (info.authors ?? []).join(', '),
    coverUrl: info.imageLinks?.thumbnail,
    publisher: info.publisher,
    publishYear: Number.isNaN(publishYear) ? undefined : publishYear,
    pageCount: info.pageCount,
    description: info.description,
  };
}
