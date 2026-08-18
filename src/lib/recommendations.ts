import { listBooks } from '@/lib/books/repository';
import {
  searchGoogleBooks,
  searchOpenLibrary,
  type OpenLibrarySearchResult,
} from '@/lib/isbn-lookup/client';
import { listSubjectsWithCounts } from '@/lib/subjects/repository';
import { canonicalizeIsbn } from '@/lib/isbn';

const SUBJECT_RESULT_LIMIT = 12;
const RECOMMENDATION_LIMIT = 12;
const SUBJECT_RECOMMENDATION_LIMIT = 4;

const LOCAL_FALLBACK_BOOKS: Array<
  OpenLibrarySearchResult & { subjects: string[] }
> = [
  {
    title: 'The Night Circus',
    author: 'Erin Morgenstern',
    isbn: '9780307744432',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780307744432-M.jpg',
    publishYear: 2011,
    subjects: ['fantasy', 'romance', 'contemporary fiction'],
  },
  {
    title: 'The Left Hand of Darkness',
    author: 'Ursula K. Le Guin',
    isbn: '9780441478125',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780441478125-M.jpg',
    publishYear: 1969,
    subjects: ['science fiction', 'literary fiction'],
  },
  {
    title: 'The Name of the Wind',
    author: 'Patrick Rothfuss',
    isbn: '9780756404741',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780756404741-M.jpg',
    publishYear: 2007,
    subjects: ['fantasy', 'action & adventure'],
  },
  {
    title: 'The Thursday Murder Club',
    author: 'Richard Osman',
    publishYear: 2020,
    subjects: ['mystery & thriller', 'humor'],
  },
  {
    title: 'The Haunting of Hill House',
    author: 'Shirley Jackson',
    isbn: '9780143039983',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780143039983-M.jpg',
    publishYear: 1959,
    subjects: ['horror', 'classic fiction'],
  },
  {
    title: 'The Shadow of the Wind',
    author: 'Carlos Ruiz Zafón',
    isbn: '9780143034902',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780143034902-M.jpg',
    publishYear: 2001,
    subjects: ['historical fiction', 'mystery & thriller', 'literary fiction'],
  },
  {
    title: 'The Song of Achilles',
    author: 'Madeline Miller',
    isbn: '9780062060624',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780062060624-M.jpg',
    publishYear: 2011,
    subjects: ['historical fiction', 'romance', 'literary fiction'],
  },
  {
    title: 'Educated',
    author: 'Tara Westover',
    isbn: '9780399590504',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780399590504-M.jpg',
    publishYear: 2018,
    subjects: ['biography & memoir', 'self-help'],
  },
  {
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    isbn: '9780553380163',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780553380163-M.jpg',
    publishYear: 1988,
    subjects: ['science & nature', 'history'],
  },
  {
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    isbn: '9780374533557',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780374533557-M.jpg',
    publishYear: 2011,
    subjects: ['philosophy', 'self-help', 'business & economics'],
  },
  {
    title: 'The Art of War',
    author: 'Sun Tzu',
    isbn: '9781590302255',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9781590302255-M.jpg',
    publishYear: -500,
    subjects: ['history', 'philosophy', 'business & economics'],
  },
  {
    title: 'The Complete Poems',
    author: 'Emily Dickinson',
    publishYear: 1890,
    subjects: ['poetry', 'classic fiction'],
  },
  {
    title: 'Persepolis',
    author: 'Marjane Satrapi',
    isbn: '9780375714573',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780375714573-M.jpg',
    publishYear: 2000,
    subjects: ['graphic novels & comics', 'biography & memoir', 'history'],
  },
  {
    title: 'Kitchen Confidential',
    author: 'Anthony Bourdain',
    publishYear: 2000,
    subjects: ['cooking', 'biography & memoir', 'humor'],
  },
  {
    title: 'The Geography of Bliss',
    author: 'Eric Weiner',
    publishYear: 2008,
    subjects: ['travel', 'philosophy', 'humor'],
  },
  {
    title: 'Station Eleven',
    author: 'Emily St. John Mandel',
    publishYear: 2014,
    subjects: ['science fiction', 'literary fiction', 'action & adventure'],
  },
  {
    title: 'The Invisible Life of Addie LaRue',
    author: 'V. E. Schwab',
    publishYear: 2020,
    subjects: ['fantasy', 'romance', 'historical fiction'],
  },
  {
    title: 'The Seven Husbands of Evelyn Hugo',
    author: 'Taylor Jenkins Reid',
    publishYear: 2017,
    subjects: ['romance', 'contemporary fiction', 'historical fiction'],
  },
  {
    title: 'The City & the City',
    author: 'China Miéville',
    publishYear: 2009,
    subjects: ['mystery & thriller', 'science fiction', 'literary fiction'],
  },
  {
    title: 'The Immortal Life of Henrietta Lacks',
    author: 'Rebecca Skloot',
    publishYear: 2010,
    subjects: ['biography & memoir', 'history', 'science & nature'],
  },
  {
    title: 'Salt, Fat, Acid, Heat',
    author: 'Samin Nosrat',
    publishYear: 2017,
    subjects: ['cooking', 'science & nature'],
  },
  {
    title: 'Into the Wild',
    author: 'Jon Krakauer',
    publishYear: 1996,
    subjects: ['travel', 'biography & memoir', 'true crime'],
  },
  {
    title: 'The Body Keeps the Score',
    author: 'Bessel van der Kolk',
    publishYear: 2014,
    subjects: ['self-help', 'science & nature'],
  },
  {
    title: 'The Book Thief',
    author: 'Markus Zusak',
    isbn: '9780375842207',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780375842207-M.jpg',
    publishYear: 2005,
    subjects: ['historical fiction', 'literary fiction'],
  },
  {
    title: 'Circe',
    author: 'Madeline Miller',
    isbn: '9780316556347',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780316556347-M.jpg',
    publishYear: 2018,
    subjects: ['fantasy', 'historical fiction'],
  },
  {
    title: 'Cloud Atlas',
    author: 'David Mitchell',
    isbn: '9780375507250',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780375507250-M.jpg',
    publishYear: 2004,
    subjects: ['literary fiction', 'science fiction'],
  },
  {
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    isbn: '9780593135204',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg',
    publishYear: 2021,
    subjects: ['science fiction', 'science & nature'],
  },
  {
    title: 'The Martian',
    author: 'Andy Weir',
    isbn: '9780804139021',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780804139021-M.jpg',
    publishYear: 2014,
    subjects: ['science fiction', 'action & adventure'],
  },
  {
    title: 'Klara and the Sun',
    author: 'Kazuo Ishiguro',
    isbn: '9780593396561',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780593396561-M.jpg',
    publishYear: 2021,
    subjects: ['science fiction', 'literary fiction'],
  },
  {
    title: 'The Overstory',
    author: 'Richard Powers',
    isbn: '9780393635522',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780393635522-M.jpg',
    publishYear: 2018,
    subjects: ['literary fiction', 'science & nature'],
  },
  {
    title: 'The Lincoln Highway',
    author: 'Amor Towles',
    isbn: '9780735222359',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780735222359-M.jpg',
    publishYear: 2021,
    subjects: ['historical fiction', 'action & adventure'],
  },
  {
    title: 'The Dutch House',
    author: 'Ann Patchett',
    isbn: '9780062963673',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780062963673-M.jpg',
    publishYear: 2019,
    subjects: ['literary fiction', 'contemporary fiction'],
  },
  {
    title: 'The Midnight Library',
    author: 'Matt Haig',
    isbn: '9780525559474',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780525559474-M.jpg',
    publishYear: 2020,
    subjects: ['contemporary fiction', 'fantasy'],
  },
  {
    title: 'The Vanishing Half',
    author: 'Brit Bennett',
    isbn: '9780525536291',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780525536291-M.jpg',
    publishYear: 2020,
    subjects: ['contemporary fiction', 'historical fiction'],
  },
  {
    title: 'Homegoing',
    author: 'Yaa Gyasi',
    isbn: '9781101971062',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9781101971062-M.jpg',
    publishYear: 2016,
    subjects: ['historical fiction', 'literary fiction'],
  },
  {
    title: 'The Underground Railroad',
    author: 'Colson Whitehead',
    isbn: '9780345804327',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780345804327-M.jpg',
    publishYear: 2016,
    subjects: ['historical fiction', 'action & adventure'],
  },
  {
    title: 'The Namesake',
    author: 'Jhumpa Lahiri',
    isbn: '9780618485222',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780618485222-M.jpg',
    publishYear: 2003,
    subjects: ['contemporary fiction', 'literary fiction'],
  },
  {
    title: 'The Ocean at the End of the Lane',
    author: 'Neil Gaiman',
    isbn: '9780062459367',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780062459367-M.jpg',
    publishYear: 2013,
    subjects: ['fantasy', 'contemporary fiction'],
  },
  {
    title: 'The Invisible Man',
    author: 'H. G. Wells',
    isbn: '9780451528834',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780451528834-M.jpg',
    publishYear: 1897,
    subjects: ['science fiction', 'classic fiction'],
  },
  {
    title: 'Frankenstein',
    author: 'Mary Shelley',
    isbn: '9780486282114',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780486282114-M.jpg',
    publishYear: 1818,
    subjects: ['horror', 'classic fiction', 'science fiction'],
  },
  {
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    isbn: '9780141439570',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780141439570-M.jpg',
    publishYear: 1890,
    subjects: ['classic fiction', 'literary fiction'],
  },
  {
    title: 'The Count of Monte Cristo',
    author: 'Alexandre Dumas',
    isbn: '9780140449266',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780140449266-M.jpg',
    publishYear: 1844,
    subjects: ['classic fiction', 'action & adventure'],
  },
  {
    title: 'A Gentleman in Moscow',
    author: 'Amor Towles',
    isbn: '9780143110439',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780143110439-M.jpg',
    publishYear: 2016,
    subjects: ['historical fiction', 'literary fiction'],
  },
];

export type Recommendation = OpenLibrarySearchResult & {
  key: string;
  subjectIds: number[];
  subjectNames: string[];
};

export type RecommendationGroup = {
  subjectId: number;
  subjectName: string;
  books: Recommendation[];
};

export type RecommendationResponse = {
  all: Recommendation[];
  bySubject: RecommendationGroup[];
};

type Subject = { id: number; name: string };

type RecommendationOptions = {
  subjectId?: number;
  page?: number;
  excludeKeys?: string[];
};

function recommendationKey(book: OpenLibrarySearchResult): string {
  const isbn = canonicalizeIsbn(book.isbn);
  if (isbn) return `isbn:${isbn}`;
  return `title:${book.title.trim().toLocaleLowerCase()}|author:${book.author.trim().toLocaleLowerCase()}`;
}

function bookKey(book: {
  isbn?: string | null;
  title: string;
  author: string;
}) {
  const isbn = canonicalizeIsbn(book.isbn);
  if (isbn) return `isbn:${isbn}`;
  return `title:${book.title.trim().toLocaleLowerCase()}|author:${book.author.trim().toLocaleLowerCase()}`;
}

export function buildRecommendationResponse(
  subjectResults: Array<{ subject: Subject; books: OpenLibrarySearchResult[] }>,
  excludedBooks: Array<{ isbn?: string | null; title: string; author: string }>,
  fallbackBooks: OpenLibrarySearchResult[] = [],
  page = 1,
  additionalExcludedKeys: string[] = [],
): RecommendationResponse {
  const excluded = new Set([
    ...excludedBooks.map(bookKey),
    ...additionalExcludedKeys,
  ]);
  const recommendations = new Map<string, Recommendation>();

  for (const { subject, books } of subjectResults) {
    for (const book of books) {
      const key = recommendationKey(book);
      if (excluded.has(key)) continue;
      const existing = recommendations.get(key);
      if (existing) {
        if (!existing.subjectIds.includes(subject.id))
          existing.subjectIds.push(subject.id);
        if (!existing.subjectNames.includes(subject.name))
          existing.subjectNames.push(subject.name);
        continue;
      }
      recommendations.set(key, {
        ...book,
        key,
        subjectIds: [subject.id],
        subjectNames: [subject.name],
      });
    }
  }

  for (const book of fallbackBooks) {
    const key = recommendationKey(book);
    if (excluded.has(key) || recommendations.has(key)) continue;
    recommendations.set(key, {
      ...book,
      key,
      subjectIds: [],
      subjectNames:
        'subjects' in book && Array.isArray(book.subjects)
          ? book.subjects.filter(
              (subject): subject is string => typeof subject === 'string',
            )
          : [],
    });
  }

  const bySubject = subjectResults.map(({ subject }) => ({
    subjectId: subject.id,
    subjectName: subject.name,
    books: [...recommendations.values()]
      .filter((book) => book.subjectIds.includes(subject.id))
      .slice(0, SUBJECT_RECOMMENDATION_LIMIT),
  }));

  const allCandidates: Recommendation[] = [];
  for (let index = 0; index < recommendations.size; index += 1) {
    let added = false;
    for (const { subject } of subjectResults) {
      const candidate = [...recommendations.values()].filter((book) =>
        book.subjectIds.includes(subject.id),
      )[index];
      if (
        candidate &&
        !allCandidates.some((book) => book.key === candidate.key)
      ) {
        allCandidates.push(candidate);
        added = true;
      }
    }
    if (!added) break;
  }

  if (allCandidates.length < recommendations.size) {
    for (const book of recommendations.values()) {
      if (!allCandidates.some((item) => item.key === book.key))
        allCandidates.push(book);
    }
  }

  allCandidates.sort((left, right) => {
    const scoreDifference =
      recommendationScore(right) - recommendationScore(left);
    if (scoreDifference !== 0) return scoreDifference;
    return right.subjectIds.length - left.subjectIds.length;
  });

  const offset =
    allCandidates.length > RECOMMENDATION_LIMIT
      ? ((page - 1) * RECOMMENDATION_LIMIT) % allCandidates.length
      : 0;
  const all = Array.from(
    { length: Math.min(RECOMMENDATION_LIMIT, allCandidates.length) },
    (_, index) => allCandidates[(offset + index) % allCandidates.length],
  );

  return { all, bySubject };
}

function fallbackQueries(books: Array<{ author: string }>): string[] {
  const authors = [
    ...new Set(
      books.flatMap((book) =>
        book.author.split(',').map((author) => author.trim()),
      ),
    ),
  ]
    .filter(Boolean)
    .slice(0, 3);
  return authors.length
    ? authors.map((author) => `author:${author}`)
    : ['fiction'];
}

function buildSubjectQuery(
  subjectName: string,
  books: Array<{ title: string; author: string }>,
): string {
  const contextTerms = [
    ...new Set(
      books.flatMap((book) => [book.author.trim(), book.title.trim()]),
    ),
  ]
    .filter(Boolean)
    .slice(0, 3);
  return [`subject:${subjectName}`, ...contextTerms].join(' ');
}

export function mergeProviderResults(
  googleBooks: OpenLibrarySearchResult[],
  openLibraryBooks: OpenLibrarySearchResult[],
): OpenLibrarySearchResult[] {
  const mixed = new Map<string, OpenLibrarySearchResult>();

  for (const book of [...googleBooks, ...openLibraryBooks]) {
    const key = recommendationKey(book);
    const existing = mixed.get(key);
    if (!existing) {
      mixed.set(key, book);
      continue;
    }
    mixed.set(key, {
      ...existing,
      isbn: existing.isbn ?? book.isbn,
      author: existing.author || book.author,
      coverUrl: existing.coverUrl ?? book.coverUrl,
      publisher: existing.publisher ?? book.publisher,
      publishYear: existing.publishYear ?? book.publishYear,
      pageCount: existing.pageCount ?? book.pageCount,
      description: existing.description ?? book.description,
      averageRating: existing.averageRating ?? book.averageRating,
      ratingsCount: existing.ratingsCount ?? book.ratingsCount,
    });
  }

  return [...mixed.values()].sort((left, right) => {
    const leftScore = recommendationScore(left);
    const rightScore = recommendationScore(right);
    return rightScore - leftScore;
  });
}

function recommendationScore(book: OpenLibrarySearchResult): number {
  if (book.averageRating === undefined) return -1;
  return book.averageRating * 4 + Math.log10((book.ratingsCount ?? 0) + 1);
}

async function searchAcrossProviders(
  query: string,
  fetchImpl: typeof fetch,
  options: { limit?: number; page?: number },
): Promise<OpenLibrarySearchResult[]> {
  const [googleBooks, openLibraryBooks] = await Promise.all([
    searchGoogleBooks(query, fetchImpl, options),
    searchOpenLibrary(query, fetchImpl, options),
  ]);
  return mergeProviderResults(googleBooks, openLibraryBooks);
}

function rotateBooks<T>(books: T[], page: number): T[] {
  if (books.length < 2) return books;
  const offset = ((page - 1) * 3) % books.length;
  return [...books.slice(offset), ...books.slice(0, offset)];
}

function localFallbackForSubject(subjectName: string, page: number) {
  const normalized = subjectName.toLocaleLowerCase();
  return rotateBooks(
    LOCAL_FALLBACK_BOOKS.filter((book) =>
      book.subjects.some(
        (subject) =>
          normalized.includes(subject) || subject.includes(normalized),
      ),
    ),
    page,
  ).slice(0, SUBJECT_RESULT_LIMIT);
}

function localFallbackForSubjects(subjects: Subject[], page: number) {
  return subjects.map((subject) => ({
    subject,
    books: localFallbackForSubject(subject.name, page),
  }));
}

export async function getRecommendations(
  userId: string,
  fetchImpl: typeof fetch = fetch,
  options: RecommendationOptions = {},
): Promise<RecommendationResponse> {
  const page = options.page ?? 1;
  const [catalog, wishlist, subjectsWithCounts] = await Promise.all([
    listBooks(userId),
    listBooks(userId, { wishlist: true }),
    listSubjectsWithCounts(userId),
  ]);
  const subjectsWithBooks = subjectsWithCounts.filter(
    (subject) => subject.bookCount > 0,
  );
  const subjects = (
    subjectsWithBooks.length ? subjectsWithBooks : subjectsWithCounts
  )
    .map(({ id, name }) => ({ id, name }))
    .filter((subject) =>
      options.subjectId === undefined ? true : subject.id === options.subjectId,
    );
  const excludedBooks = [...catalog, ...wishlist];
  const contextBooks = [...catalog, ...wishlist];

  const subjectResults = await Promise.all(
    subjects.map(async (subject) => ({
      subject,
      books: await searchAcrossProviders(
        buildSubjectQuery(subject.name, contextBooks),
        fetchImpl,
        {
          limit: SUBJECT_RESULT_LIMIT,
          page: options.page,
        },
      ),
    })),
  );

  const fallbackBooks = subjects.length
    ? []
    : (
        await Promise.all(
          fallbackQueries(contextBooks).map((query) =>
            searchAcrossProviders(query, fetchImpl, {
              limit: SUBJECT_RESULT_LIMIT,
              page: options.page,
            }),
          ),
        )
      ).flat();

  const response = buildRecommendationResponse(
    subjectResults,
    excludedBooks,
    fallbackBooks,
    page,
    options.excludeKeys,
  );
  if (response.all.length >= RECOMMENDATION_LIMIT) return response;

  const localResponse = buildRecommendationResponse(
    [...subjectResults, ...localFallbackForSubjects(subjects, page)],
    excludedBooks,
    rotateBooks(LOCAL_FALLBACK_BOOKS, page),
    page,
    options.excludeKeys,
  );
  const refillQueries = [
    ...subjects.map((subject) => buildSubjectQuery(subject.name, contextBooks)),
    'fiction',
    ...fallbackQueries(contextBooks),
  ];
  const refillBooks = (
    await Promise.all(
      refillQueries.flatMap((query) =>
        [page + 1, page + 2, page + 3, page + 4, page + 5].map((refillPage) =>
          searchAcrossProviders(query, fetchImpl, {
            limit: RECOMMENDATION_LIMIT,
            page: refillPage,
          }),
        ),
      ),
    )
  ).flat();

  return buildRecommendationResponse(
    subjectResults,
    excludedBooks,
    [...refillBooks, ...rotateBooks(LOCAL_FALLBACK_BOOKS, page)],
    page,
    options.excludeKeys,
  );
}
