import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Anagnosma</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground">Last updated: August 6, 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Data we handle</h2>
        <p className="text-muted-foreground">
          Clerk handles authentication, and Neon hosts your personal catalog
          data. Anagnosma uses this information to provide your book library and
          its features.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your choices</h2>
        <p className="text-muted-foreground">
          You can request access to or deletion of your account and catalog data
          by contacting mcaibad2@gmail.com.
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
