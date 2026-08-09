'use client';

import Link from 'next/link';
import { Show, UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

export function Nav() {
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'Catalog' },
    { href: '/import', label: 'Import' },
    { href: '/subjects', label: 'Subjects' },
    { href: '/wishlist', label: 'Wishlist' },
  ];

  return (
    <header className="border-b">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-3">
        <Link href="/" className="shrink-0 text-lg font-semibold">
          📚 Anagnosma
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto sm:gap-4">
          {navItems.map(({ href, label }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 shrink-0 items-center rounded-md px-3 transition-colors sm:min-h-8 sm:px-2 ${
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            );
          })}
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
