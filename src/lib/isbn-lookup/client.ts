import { normalizeIsbn } from '@/lib/isbn';

export type BookMetadata = {
  isbn: string;
  title: string;
  author: string;
  coverUrl?: string;
  publisher?: string;
  publishYear?: number;
  pageCount?: number;
  description?: string;
  averageRating?: number;
  ratingsCount?: number;
};

export type OpenLibrarySearchResult = Omit<BookMetadata, 'isbn'> & {
  isbn?: string;
};

export type BookSearchResult = OpenLibrarySearchResult;

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
  first_sentence?: string[] | string;
  ratings_average?: number;
  ratings_count?: number;
};

export async function lookupByIsbn(
  isbn: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BookMetadata | null> {
  const normalizedIsbn = normalizeIsbn(isbn);
  if (!normalizedIsbn) return null;

  try {
    const res = await fetchImpl(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(normalizedIsbn)}&format=json&jscmd=data`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const info: OpenLibraryBook | undefined = data[`ISBN:${normalizedIsbn}`];
    if (!info) return null;

    const publishYearMatch = info.publish_date?.match(/\d{4}/);
    const publishYear = publishYearMatch
      ? Number(publishYearMatch[0])
      : undefined;
    const notes =
      typeof info.notes === 'string' ? info.notes : info.notes?.value;

    return {
      isbn: normalizedIsbn,
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
  options: { limit?: number; page?: number } = {},
): Promise<OpenLibrarySearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(options.limit ?? 8),
      page: String(options.page ?? 1),
      fields:
        'title,author_name,isbn,publisher,first_publish_year,number_of_pages_median,cover_i,first_sentence,ratings_average,ratings_count',
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetchImpl(
        `https://openlibrary.org/search.json?${params.toString()}`,
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeout);
    }
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
          ...(doc.ratings_average !== undefined
            ? { averageRating: doc.ratings_average }
            : {}),
          ...(doc.ratings_count !== undefined
            ? { ratingsCount: doc.ratings_count }
            : {}),
          ...(doc.first_sentence
            ? {
                description: Array.isArray(doc.first_sentence)
                  ? doc.first_sentence[0]
                  : doc.first_sentence,
              }
            : {}),
        };
      });
  } catch {
    return [];
  }
}

type GoogleBook = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    publisher?: string;
    pageCount?: number;
    description?: string;
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: Array<{
      type?: string;
      identifier?: string;
    }>;
  };
};

export async function searchGoogleBooks(
  query: string,
  fetchImpl: typeof fetch = fetch,
  options: { limit?: number; page?: number } = {},
): Promise<BookSearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(options.limit ?? 8, 40)),
      startIndex: String(((options.page ?? 1) - 1) * (options.limit ?? 8)),
      printType: 'books',
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetchImpl(
        `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return [];
    const data = await res.json();
    const items: GoogleBook[] = data.items ?? [];
    return items.flatMap((item) => {
      const info = item.volumeInfo;
      if (!info?.title) return [];
      const identifier =
        info.industryIdentifiers?.find((value) => value.type === 'ISBN_13') ??
        info.industryIdentifiers?.[0];
      const publishYear = info.publishedDate?.match(/\d{4}/)?.[0];
      return [
        {
          isbn: identifier?.identifier,
          title: info.title,
          author: (info.authors ?? []).join(', '),
          coverUrl: (
            info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail
          )?.replace(/^http:/, 'https:'),
          publisher: info.publisher,
          publishYear: publishYear ? Number(publishYear) : undefined,
          pageCount: info.pageCount,
          ...(info.averageRating !== undefined
            ? { averageRating: info.averageRating }
            : {}),
          ...(info.ratingsCount !== undefined
            ? { ratingsCount: info.ratingsCount }
            : {}),
          ...(info.description ? { description: info.description } : {}),
        },
      ];
    });
  } catch {
    return [];
  }
}
