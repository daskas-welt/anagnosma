import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Check, Sparkles } from 'lucide-react';
import { releases } from '@/lib/releases/data';

export const metadata: Metadata = {
  title: 'Releases | Anagnosma',
  description: 'See what is new in Anagnosma.',
};

function formatReleaseDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function ReleasesPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-12 py-4 sm:py-8">
      <header className="max-w-2xl space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-sm font-medium text-muted-foreground">
          <Sparkles aria-hidden="true" className="size-4 text-foreground" />
          Product updates
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            What&apos;s new in Anagnosma
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            A running record of the features, improvements, and thoughtful
            details added to your personal library.
          </p>
        </div>
      </header>

      <section aria-label="Release history" className="relative space-y-8">
        <div
          aria-hidden="true"
          className="absolute bottom-8 left-5 top-8 hidden w-px bg-border sm:block"
        />
        {releases.map((release, index) => (
          <article key={release.version} className="relative sm:pl-14">
            <div
              aria-hidden="true"
              className="absolute left-0 top-8 hidden size-10 items-center justify-center rounded-full border bg-background sm:flex"
            >
              <span className="size-2.5 rounded-full bg-foreground" />
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold tracking-wide text-background">
                      v{release.version}
                    </span>
                    {index === 0 ? (
                      <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                        Latest
                      </span>
                    ) : null}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {release.title}
                  </h2>
                </div>
                <div className="inline-flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays aria-hidden="true" className="size-4" />
                  <time dateTime={release.releasedAt}>
                    {formatReleaseDate(release.releasedAt)}
                  </time>
                </div>
              </div>

              <p className="mt-6 max-w-2xl leading-7 text-muted-foreground">
                {release.summary}
              </p>

              <ul className="mt-6 grid gap-3 border-t pt-6 text-sm sm:grid-cols-2">
                {release.changes.map((change) => (
                  <li key={change} className="flex gap-3 leading-6">
                    <Check
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-muted-foreground"
                    />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Back to catalog
        </Link>
      </footer>
    </article>
  );
}
