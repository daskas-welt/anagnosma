import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Anagnosma</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="text-muted-foreground">Last updated: August 6, 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Using Anagnosma</h2>
        <p className="text-muted-foreground">
          Anagnosma provides tools for organizing and browsing your personal
          book catalog. You are responsible for the information you add and for
          keeping your account secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Service availability</h2>
        <p className="text-muted-foreground">
          The service is provided as available and may change or be unavailable
          from time to time. We may suspend access when necessary to protect the
          service or its users.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-muted-foreground">
          Questions about these terms can be sent to mcaibad2@gmail.com.
        </p>
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
