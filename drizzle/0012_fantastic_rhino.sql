ALTER TABLE "books" DROP CONSTRAINT "books_user_id_isbn_wishlist_unique";--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_isbn_unique" UNIQUE("user_id","isbn");