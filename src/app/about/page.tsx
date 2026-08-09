import Link from 'next/link';

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Anagnosma</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Your personal library, organized
        </h1>
        <p className="text-lg text-muted-foreground">
          Anagnosma helps you keep track of the books you own, the books you
          want to read, and the details that make your library yours.
        </p>
      </header>

      <section className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Catalog and wishlist</h2>
          <p className="text-muted-foreground">
            Manage books, copies, notes, covers, publishers, publication years,
            page counts, and other metadata in your personal catalog.
          </p>
          <p className="text-muted-foreground">
            Keep a separate wishlist for books you want to purchase or read,
            without requiring a physical copy.
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Browse and organize</h2>
          <p className="text-muted-foreground">
            Search your books, filter them by subject, and switch between grid,
            carousel, table, and subject views.
          </p>
          <p className="text-muted-foreground">
            Create, rename, search, and remove subjects while keeping track of
            how many books use each one.
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Import and export</h2>
          <p className="text-muted-foreground">
            Import Anagnosma, Goodreads, LibraryThing, or other CSV files with
            automatic column matching, validation, and preview.
          </p>
          <p className="text-muted-foreground">
            Export Catalog and Wishlist books as CSV, Excel, Word, or PDF with
            collection and export metadata included.
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Built for your library</h2>
          <p className="text-muted-foreground">
            Scan ISBNs on mobile devices and look up book details from Open
            Library. Sample books help new users explore the app.
          </p>
          <p className="text-muted-foreground">
            Your catalog and wishlist are tied to your signed-in account and
            kept separate from other users.
          </p>
        </div>
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
