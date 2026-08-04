import Link from 'next/link';
import { Show, UserButton } from '@clerk/nextjs';

export function Nav() {
  return (
    <header className="border-b">
      <div className="flex items-center gap-6 px-6 py-3">
        <Link href="/" className="text-lg font-semibold">
          📚 Anagnosma
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/">Catalog</Link>
          <Link href="/import">Import</Link>
          <Link href="/subjects">Subjects</Link>
        </nav>
        <div className="ml-auto">
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
