# Anagnosma — Book Catalog MVP Design Spec

Source investigation: `book-app-investigation.md`

## Scope

This spec covers the **first sub-project**: the core cataloging loop. It is
scoped deliberately narrow — a single-user book catalog with fast entry,
search/filter/tags, reading status/progress, and CSV import.

**Explicitly out of scope for this spec** (deferred to a phase 2 spec, once
the core catalog is validated):
- Reread reminders
- Wishlist + price alerts
- "Next up" recommendation queue
- Purchase blocker
- Collaborative filtering / recommendations
- Multi-user accounts and auth
- Valuation/insurance reporting
- Multi-location shelf analytics beyond a single free-text location field

## Architecture

- **Next.js (App Router) + TypeScript** — single deployable app; UI and API
  routes live together.
- **Postgres** (Neon or Supabase) as the database.
- **Drizzle ORM** + `drizzle-kit` for schema definition and migrations.
- **Deployed on Vercel.**
- **No user auth in v1** (single-user by design). If deployed somewhere
  publicly reachable, gate access with a lightweight password check in
  Next.js middleware (one env var, checked via a signed cookie after a login
  form). This is intentionally throwaway — it gets replaced by real
  multi-user auth in the phase 2 spec, not extended.

## Data Model

Two-table split (book vs. copy) instead of one flat table, so the app can
represent owning multiple copies/editions of the same title without
duplicating shared metadata, and so duplicate-purchase detection and future
valuation features have a clean foundation.

```
books
  id            serial primary key
  isbn          text, unique nullable
  title         text not null
  author        text not null
  cover_url     text nullable
  publisher     text nullable
  publish_year  integer nullable
  page_count    integer nullable
  description   text nullable
  created_at    timestamp default now()

copies
  id              serial primary key
  book_id         integer not null references books(id) on delete cascade
  format          text not null   -- hardcover | paperback | ebook | audiobook
  condition       text nullable
  purchase_price  numeric nullable
  purchase_date   date nullable
  shelf_location  text nullable
  status          text not null default 'to-read'  -- to-read | reading | read | dnf
  progress_page   integer nullable
  rating          integer nullable  -- 1-5
  notes           text nullable
  date_started    date nullable
  date_finished   date nullable
  created_at      timestamp default now()
  updated_at      timestamp default now()

tags
  id    serial primary key
  name  text not null unique

book_tags
  book_id  integer not null references books(id) on delete cascade
  tag_id   integer not null references tags(id) on delete cascade
  primary key (book_id, tag_id)
```

Tags apply at the book level (genre-like classification), not per-copy.
Reading status, progress, rating, and notes are per-copy, since a reread of
a second physical copy is conceptually a distinct reading experience.

## Features in Scope (v1)

1. **Add book by ISBN** — manual ISBN entry (no camera/barcode scanning in
   v1) auto-fills title/author/cover/publisher/etc. via the Google Books
   API, creating a `book` row plus its first `copy`.
2. **Add book manually** — when ISBN lookup fails or isn't available.
3. **Edit/delete** books and copies.
4. **Search/filter** the catalog by title, author, tag, status, and format.
5. **Tag management** — create, assign, remove, rename, delete; tag list
   view shows book counts per tag and filters the catalog when clicked.
6. **Per-copy reading state** — status, page progress, 1-5 star rating,
   free-text notes.
7. **CSV import** — bulk import from a Goodreads/LibraryThing-style export:
   - Upload CSV, map columns to book/copy fields (with smart defaults for
     recognized Goodreads/LibraryThing headers).
   - Preview first few mapped rows before committing.
   - Import runs row-by-row; invalid rows are skipped, not fatal to the
     batch.
   - Result summary: success count, plus failed rows with reasons.
8. **Duplicate warning** — when adding/importing a book whose ISBN or
   title+author already exists in the catalog, warn but do not block (the
   user may genuinely own more than one copy).

## UX / UI

**Navigation:** simple top nav — logo, `Catalog | Import | Tags` links, a
persistent **+ Add Book** button, and an always-visible search bar. Below
that, a view toggle (grid/list) and filter dropdowns (status, tag, format).

```
+--------------------------------------------------+
| 📚 Anagnosma   [Catalog] [Import] [Tags]  [+ Add Book] |
|  🔍 Search...                                      |
+--------------------------------------------------+
|  [Grid/List toggle]           Filter: Status ▾ Tag ▾ |
+--------------------------------------------------+
```

**Catalog view:** toggle between two layouts, grid as the default:

- *Grid* — cover-art thumbnails with title/author/rating/status beneath.
  Good for browsing, mimics a bookshelf.
- *Dense list/table* — sortable columns (title, author, status, rating,
  tags, shelf). Better for scanning/sorting a large collection (500–20k
  books).

**Add-book flow:** the persistent "+ Add Book" button opens a modal with an
auto-focused ISBN field. Typing an ISBN triggers Google Books auto-fill;
the user confirms/edits fields and saves. On save, the modal clears and
refocuses the ISBN field for the next entry — no page navigation between
books, to minimize friction during a cataloging session. If the ISBN isn't
found, the same modal falls back to manual entry fields.

**Book detail:** clicking a cover/row opens a detail view (side panel)
showing full book metadata, its copies (format, condition, price, shelf
location), with per-copy status/progress/rating/notes editable inline, and
tag management for the book.

**CSV import:** dedicated `/import` page — upload CSV, map columns to
book/copy fields, preview first few rows, run import, then show a result
summary (success count + failed rows with reasons).

**Tags page:** list of tags with book counts; rename/delete; clicking a tag
filters the catalog.

### Component mapping (shadcn/ui + Tailwind)

| Feature | Components |
|---|---|
| Add-book modal | `Dialog` (or `Drawer` for a mobile-friendly bottom sheet) |
| ISBN/metadata form | `Form` + `Input` + `Label` (react-hook-form + zod validation) |
| Catalog grid/list toggle | `Tabs` for the toggle; `Card` for grid items; `Table` for list view |
| Filters | `Select` / `DropdownMenu` |
| Search bar | `Input` with search icon (upgrade to `Command` later for autocomplete) |
| Tags page | `Badge` for tag chips; `Table` for the tag list with counts |
| CSV import | native file `Input`, `Table` for row preview, `Progress` for import progress, `Alert` for per-row errors |
| Book detail view | `Sheet` (side panel), with `Tabs` separating metadata / copies / notes |
| Save/error feedback | `Sonner` (toast) |
| Star rating | custom component — `lucide-react` `Star` icons, click/hover to set value (no shadcn primitive for this) |
| Theme | `next-themes` for dark mode (near-free with shadcn's CSS-variable theming) |

## Error Handling

- **ISBN lookup failure** (not found, rate-limited, network error) — fall
  back to the manual entry form, pre-filled with just the ISBN the user
  typed.
- **CSV import** — validated row-by-row; a bad row is skipped and reported
  with a reason, not treated as an all-or-nothing failure.
- **Duplicate ISBN/title** on add or import — warn, don't block.

## Testing

- **Unit tests** for CSV parsing/column-mapping logic and duplicate-detection
  logic (pure functions, fast to test in isolation).
- **Integration tests** for API routes (book/copy CRUD, search/filter)
  against a test Postgres instance.
- **Manual/exploratory testing** for the ISBN auto-fill flow against the
  real Google Books API, since response shapes and edge cases (missing
  fields, multiple editions) matter more than can be usefully mocked.
