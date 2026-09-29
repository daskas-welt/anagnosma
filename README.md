# Anagnosma

Anagnosma is a personal book-library manager for organizing, browsing, and discovering the books you own.

## Features

- Manage books, copies, subjects, notes, covers, and metadata.
- Search, sort, filter, and browse a personal catalog.
- Import catalog data from CSV.
- Export catalog data to CSV, Excel, Word, or PDF.
- Use Clerk for authentication and Neon Postgres for catalog storage.
- Responsive layouts for desktop and mobile screens.

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and provide the required database and Clerk values. Apply database migrations with:

```bash
npx dotenv -e .env.local -- drizzle-kit migrate
```

## Checks

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npm test
```

## Privacy Note

Clerk handles authentication and Neon hosts catalog data. Catalog records are associated with the authenticated account. For privacy questions or account/data deletion requests, contact `mcaibad2@gmail.com`.

## Supporting Anagnosma

Anagnosma is a personal project, and running it isn't free — hosting and third-party services (Vercel, Neon Postgres, Clerk, and Vercel Blob) come with recurring costs. If you'd like to help cover them:

- [GitHub Sponsors](https://github.com/sponsors/daskas-welt)

Support is entirely optional — thank you!

## Developer

Anagnosma is developed by [Andreas Daskalopoulos](https://daskas-welt.github.io/).

- Source code: [github.com/daskas-welt/anagnosma](https://github.com/daskas-welt/anagnosma)
- Website: [daskas-welt.github.io](https://daskas-welt.github.io/)
- Contact: [mcaibad2@gmail.com](mailto:mcaibad2@gmail.com)

## License

Licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0). Because Anagnosma is a network application, anyone who runs a modified version and offers it to users over a network must make the corresponding source available.
