import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Book covers come from the ISBN lookup (see src/lib/isbn-lookup/client.ts), which
    // serves thumbnails from Open Library's free, keyless cover API. books.google.com
    // stays allowlisted for any pre-existing records with a Google-hosted cover URL.
    // next/image hard-errors on unconfigured remote hosts, so this must stay in sync
    // with any future cover sources.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
      {
        protocol: 'http',
        hostname: 'books.google.com',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
    ],
  },
};

export default nextConfig;
