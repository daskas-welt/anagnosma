import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Book covers come from the Google Books ISBN lookup (see src/lib/google-books/client.ts),
    // which serves thumbnail images from books.google.com. next/image hard-errors on
    // unconfigured remote hosts, so this must stay in sync with any future cover sources.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
      {
        protocol: 'http',
        hostname: 'books.google.com',
      },
    ],
  },
};

export default nextConfig;
