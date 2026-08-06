import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { SocialLinks } from '@/components/social-links';

export const metadata: Metadata = {
  title: 'Developer | Anagnosma',
  description:
    'Learn more about Andreas Daskalopoulos, the developer of Anagnosma.',
};

export default function DeveloperPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Anagnosma</p>
        <h1 className="text-3xl font-semibold tracking-tight">Developer</h1>
      </header>

      <section className="border-t pt-6">
        <div className="w-fit max-w-full rounded-xl border bg-muted/20 p-4 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Image
              src="/andreas-profile.jpg"
              alt="Andreas Daskalopoulos"
              width={160}
              height={160}
              priority
              className="size-24 shrink-0 rounded-full object-cover ring-4 ring-muted sm:size-28"
            />
            <div className="min-w-0 space-y-2 sm:pt-1">
              <p className="text-muted-foreground">
                Anagnosma is developed by Andreas Daskalopoulos.
              </p>
              <SocialLinks
                showLabels
                className="flex flex-col items-start gap-1.5"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 text-muted-foreground">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Background</h2>
          <p>
            I have been working as a software engineer for over 20 years,
            currently as a Senior Software Engineer at Yodiwo. My career has
            taken me through several companies - Velti, Citrix, Bytemobile, and
            others - where I have worked across different tech stacks and
            domains.
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Technical focus
          </h2>
          <p>
            I studied Mechanical Engineering, but I was always a software
            enthusiast. I later earned an MSc in Computation from UMIST in the
            UK. My technical work spans .NET/C#, JavaScript/TypeScript, React,
            Android, Node.js, and databases (SQL, MongoDB). I am fluent in Greek
            and English.
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Beyond code</h2>
          <p>
            My favorite music artist is Aphex Twin, my favorite movie is Dune
            (well… I am not entirely sure). As for my preferred book, it would
            be JRR Tolkien&apos;s masterpiece, The Silmarillion. As a personal
            motto, I live by the words &quot;Bilbo Baggins lives!&quot;
          </p>
        </div>
        <a
          className="inline-flex items-center gap-1 text-foreground underline underline-offset-4"
          href="mailto:mcaibad2@gmail.com"
        >
          Contact Andreas
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
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
