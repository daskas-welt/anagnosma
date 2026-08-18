import Link from 'next/link';

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Anagnosma</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Your personal book catalog
        </h1>
        <p className="text-lg text-muted-foreground">
          Anagnosma helps you organize, browse, and discover books across your
          catalog and wishlist.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What you can do</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Manage books, copies, subjects, notes, covers, and metadata.</li>
          <li>Search, sort, filter, and browse your personal catalog.</li>
          <li>Keep a separate wishlist for books you want to read or buy.</li>
          <li>
            Get popular recommendations shaped by your subjects, catalog, and
            wishlist using Google Books and Open Library.
          </li>
          <li>
            Refresh recommendations and choose to see 6, 12, 18, or 24 books.
          </li>
          <li>
            Import catalog data from CSV and export it in several formats.
          </li>
        </ul>
      </section>

      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
      >
        Back to catalog
      </Link>
    </article>
  );
}
