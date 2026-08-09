ALTER TABLE "books" DROP CONSTRAINT "books_user_id_isbn_unique";--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "is_wishlist" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_preferences" ADD COLUMN "sample_wishlist_seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_isbn_wishlist_unique" UNIQUE("user_id","isbn","is_wishlist");