import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { Nav } from '@/components/nav';
import { SocialLinks } from '@/components/social-links';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Anagnosma',
  description:
    'Anagnosma is a personal book-library manager for organizing, browsing, and discovering the books you own.',
  authors: [
    {
      name: 'Andreas Daskalopoulos',
      url: 'https://daskas-welt.github.io/',
    },
  ],
  creator: 'Andreas Daskalopoulos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Nav />
            <main className="flex-1 p-6">{children}</main>
            <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <span>© 2026 Andreas Daskalopoulos</span>
                <Link className="underline underline-offset-4" href="/about">
                  About
                </Link>
                <Link className="underline underline-offset-4" href="/releases">
                  Releases
                </Link>
                <Link
                  className="underline underline-offset-4"
                  href="/developer"
                >
                  Developer
                </Link>
                <Link className="underline underline-offset-4" href="/privacy">
                  Privacy Policy
                </Link>
                <Link className="underline underline-offset-4" href="/terms">
                  Terms of Service
                </Link>
                <SocialLinks />
              </div>
            </footer>
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
