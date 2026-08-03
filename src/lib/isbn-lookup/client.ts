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

type OpenLibraryAuthor = { name: string };
type OpenLibraryPublisher = { name: string };
type OpenLibraryBook = {
  title: string;
  authors?: OpenLibraryAuthor[];
  publishers?: OpenLibraryPublisher[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
  notes?: string | { value: string };
};

export async function lookupByIsbn(
  isbn: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BookMetadata | null> {
  try {
    const res = await fetchImpl(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const info: OpenLibraryBook | undefined = data[`ISBN:${isbn}`];
    if (!info) return null;

    const publishYearMatch = info.publish_date?.match(/\d{4}/);
    const publishYear = publishYearMatch ? Number(publishYearMatch[0]) : undefined;
    const notes = typeof info.notes === 'string' ? info.notes : info.notes?.value;

    return {
      isbn,
      title: info.title,
      author: (info.authors ?? []).map((a) => a.name).join(', '),
      coverUrl: info.cover?.medium ?? info.cover?.large ?? info.cover?.small,
      publisher: info.publishers?.[0]?.name,
      publishYear: Number.isNaN(publishYear) ? undefined : publishYear,
      pageCount: info.number_of_pages,
      description: notes,
    };
  } catch {
    return null;
  }
}
