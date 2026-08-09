import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';

export const books = pgTable(
  'books',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    isbn: text('isbn'),
    title: text('title').notNull(),
    author: text('author').notNull(),
    coverUrl: text('cover_url'),
    publisher: text('publisher'),
    publishYear: integer('publish_year'),
    pageCount: integer('page_count'),
    description: text('description'),
    isSample: boolean('is_sample').notNull().default(false),
    isWishlist: boolean('is_wishlist').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdIsbnUnique: unique('books_user_id_isbn_wishlist_unique').on(
      t.userId,
      t.isbn,
      t.isWishlist,
    ),
  }),
);

export const copies = pgTable('copies', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  format: text('format').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const catalogPreferences = pgTable('catalog_preferences', {
  userId: text('user_id').primaryKey(),
  sampleCatalogSeeded: boolean('sample_catalog_seeded')
    .notNull()
    .default(false),
  sampleWishlistSeeded: boolean('sample_wishlist_seeded')
    .notNull()
    .default(false),
});

export const subjects = pgTable(
  'subjects',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
  },
  (t) => ({
    userNameUnique: unique('subjects_user_id_name_unique').on(t.userId, t.name),
  }),
);

export const bookSubjects = pgTable(
  'book_subjects',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.bookId, t.subjectId] }),
  }),
);
