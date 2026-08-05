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

export type OpenLibrarySearchResult = Omit<BookMetadata, 'isbn'> & {
  isbn?: string;
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

type OpenLibrarySearchDoc = {
  title?: string;
  author_name?: string[];
  isbn?: string[];
  publisher?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
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
    const publishYear = publishYearMatch
      ? Number(publishYearMatch[0])
      : undefined;
    const notes =
      typeof info.notes === 'string' ? info.notes : info.notes?.value;

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

export async function searchOpenLibrary(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenLibrarySearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: '8',
      fields:
        'title,author_name,isbn,publisher,first_publish_year,number_of_pages_median,cover_i',
    });
    const res = await fetchImpl(
      `https://openlibrary.org/search.json?${params.toString()}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const docs: OpenLibrarySearchDoc[] = data.docs ?? [];

    return docs
      .filter((doc) => doc.title)
      .map((doc) => {
        const isbn =
          (doc.isbn ?? []).find((value) => /^97\d{11}$/.test(value)) ??
          doc.isbn?.[0];
        return {
          isbn,
          title: doc.title!,
          author: (doc.author_name ?? []).join(', '),
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined,
          publisher: doc.publisher?.[0],
          publishYear: doc.first_publish_year,
          pageCount: doc.number_of_pages_median,
        };
      });
  } catch {
    return [];
  }
}
