'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RecommendationCard } from '@/components/recommendation-card';
import type {
  Recommendation,
  RecommendationResponse,
} from '@/lib/recommendations';

const RECOMMENDATION_COUNT = 12;
const RECOMMENDATION_COUNTS = [6, 12, 18, 24] as const;

function readRecommendationCount() {
  if (typeof window === 'undefined') return RECOMMENDATION_COUNT;
  const stored = Number(
    window.sessionStorage.getItem('anagnosma:recommendation-count'),
  );
  return RECOMMENDATION_COUNTS.includes(
    stored as (typeof RECOMMENDATION_COUNTS)[number],
  )
    ? stored
    : RECOMMENDATION_COUNT;
}

function readCachedRecommendations(
  key: string,
  recommendationCount: number,
): RecommendationResponse | null {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    const data = JSON.parse(cached) as RecommendationResponse;
    return Array.isArray(data.all) && data.all.length >= recommendationCount
      ? data
      : null;
  } catch {
    return null;
  }
}

function cacheRecommendations(key: string, data: RecommendationResponse) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage can be unavailable or full; recommendations still work in memory.
  }
}

async function fetchRecommendationSet(
  page: number,
  excludedKeys: string[],
  recommendationCount: number,
): Promise<RecommendationResponse> {
  const collected: Recommendation[] = [];
  const displayed = new Set<string>();
  let latestData: RecommendationResponse | null = null;

  async function collectPages(blockedKeys: string[], startPage: number) {
    let nextPage = startPage;
    const blocked = new Set(blockedKeys);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (blocked.size > 0) params.set('exclude', [...blocked].join(','));

      const response = await fetch(
        `/api/recommendations?${params.toString()}`,
        {
          cache: 'no-store',
        },
      );
      if (!response.ok) throw new Error('recommendations request failed');

      const nextData: RecommendationResponse = await response.json();
      latestData = nextData;
      const countBefore = collected.length;
      for (const book of nextData.all) {
        if (blocked.has(book.key) || displayed.has(book.key)) continue;
        displayed.add(book.key);
        collected.push(book);
        if (collected.length === recommendationCount) return;
      }
      if (collected.length === countBefore) return;
      nextPage = (nextPage % 5) + 1;
    }
  }

  // Refreshes prefer a new set, but reusing a provider result is better than
  // rendering fewer cards when the sources overlap.
  await collectPages(excludedKeys, page);
  if (collected.length < recommendationCount) {
    await collectPages([], page + 1);
  }

  const responseData = latestData as RecommendationResponse | null;
  if (responseData === null) throw new Error('recommendations request failed');
  return {
    all: collected.slice(0, recommendationCount),
    bySubject: responseData.bySubject,
  };
}

export function RecommendationsPage() {
  const { isLoaded, user } = useUser();
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [recommendationCount, setRecommendationCount] = useState(
    readRecommendationCount,
  );
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const recommendationPage = useRef(0);
  const previousRecommendationKeys = useRef<string[]>([]);
  const storageKey = user
    ? `anagnosma:recommendations:${user.id}:${recommendationCount}`
    : null;

  const refresh = useCallback(async () => {
    if (!storageKey) return;
    setLoading(true);
    recommendationPage.current = (recommendationPage.current % 5) + 1;
    try {
      const nextData = await fetchRecommendationSet(
        recommendationPage.current,
        previousRecommendationKeys.current,
        recommendationCount,
      );
      previousRecommendationKeys.current = nextData.all.map((book) => book.key);
      setData(nextData);
      setSavedKeys(new Set());
      cacheRecommendations(storageKey, nextData);
    } catch {
      toast.error('Could not load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [recommendationCount, storageKey]);

  useEffect(() => {
    if (!isLoaded || !storageKey) return;

    const timer = window.setTimeout(() => {
      const cachedData = readCachedRecommendations(
        storageKey,
        recommendationCount,
      );
      if (cachedData) {
        recommendationPage.current = 1;
        previousRecommendationKeys.current = cachedData.all.map(
          (book) => book.key,
        );
        setData(cachedData);
        setLoading(false);
        return;
      }

      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoaded, recommendationCount, refresh, storageKey]);

  async function saveToWishlist(book: Recommendation) {
    setSavingKey(book.key);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not save recommendation');
      }
      const savedBook: { id: number } = await response.json();
      await Promise.all(
        book.subjectIds.map((subjectId) =>
          fetch(`/api/books/${savedBook.id}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId }),
          }),
        ),
      );
      setSavedKeys((current) => new Set(current).add(book.key));
      toast.success(`Added "${book.title}" to your wishlist.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save recommendation.',
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recommendations
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4" />
            Discover your next read. Fresh suggestions shaped by your subjects,
            catalog, and wishlist.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Show
            <select
              value={recommendationCount}
              onChange={(event) => {
                const count = Number(event.target.value);
                setRecommendationCount(count);
                window.sessionStorage.setItem(
                  'anagnosma:recommendation-count',
                  String(count),
                );
              }}
              disabled={loading}
              className="h-11 rounded-md border bg-background px-2 text-foreground sm:h-8"
            >
              {RECOMMENDATION_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
            books
          </label>
          <Button
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
            className="min-h-11 cursor-pointer disabled:cursor-not-allowed sm:min-h-8"
          >
            <RefreshCw className={loading ? 'animate-spin' : undefined} />
            Refresh recommendations
          </Button>
        </div>
      </div>

      {loading ? (
        <p
          role="status"
          className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground"
        >
          Finding books for you...
        </p>
      ) : data && data.all.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="font-medium">No new recommendations yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add more books or subjects to help us find something new.
          </p>
        </div>
      ) : data ? (
        <section aria-label="Book recommendations" className="space-y-4">
          <RecommendationGrid
            books={data.all}
            savedKeys={savedKeys}
            savingKey={savingKey}
            onSave={saveToWishlist}
          />
        </section>
      ) : null}
    </div>
  );
}

function RecommendationGrid({
  books,
  savedKeys,
  savingKey,
  onSave,
}: {
  books: Recommendation[];
  savedKeys: Set<string>;
  savingKey: string | null;
  onSave: (book: Recommendation) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      {books.map((book) => (
        <RecommendationCard
          key={book.key}
          book={book}
          saved={savedKeys.has(book.key)}
          saving={savingKey === book.key}
          onSave={() => onSave(book)}
        />
      ))}
    </div>
  );
}
