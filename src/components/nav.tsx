import Link from 'next/link';
import { Show, UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';

export function Nav() {
  return (
    <header className="border-b">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-3">
        <Link href="/" className="shrink-0 text-lg font-semibold">
          📚 Anagnosma
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto sm:gap-4">
          <Link
            href="/"
            className="flex min-h-11 shrink-0 items-center px-2 sm:min-h-8 sm:px-0"
          >
            Catalog
          </Link>
          <Link
            href="/import"
            className="flex min-h-11 shrink-0 items-center px-2 sm:min-h-8 sm:px-0"
          >
            Import
          </Link>
          <Link
            href="/subjects"
            className="flex min-h-11 shrink-0 items-center px-2 sm:min-h-8 sm:px-0"
          >
            Subjects
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
