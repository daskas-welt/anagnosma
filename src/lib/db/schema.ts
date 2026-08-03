import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  isbn: text('isbn').unique(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  coverUrl: text('cover_url'),
  publisher: text('publisher'),
  publishYear: integer('publish_year'),
  pageCount: integer('page_count'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const copies = pgTable('copies', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  format: text('format').notNull(),
  condition: text('condition'),
  purchasePrice: numeric('purchase_price'),
  purchaseDate: date('purchase_date'),
  shelfLocation: text('shelf_location'),
  status: text('status').notNull().default('to-read'),
  progressPage: integer('progress_page'),
  rating: integer('rating'),
  notes: text('notes'),
  dateStarted: date('date_started'),
  dateFinished: date('date_finished'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const bookTags = pgTable(
  'book_tags',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.bookId, t.tagId] }),
  }),
);
