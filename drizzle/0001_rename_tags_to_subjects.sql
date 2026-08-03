ALTER TABLE "tags" RENAME TO "subjects";--> statement-breakpoint
ALTER TABLE "book_tags" RENAME TO "book_subjects";--> statement-breakpoint
ALTER TABLE "book_subjects" RENAME COLUMN "tag_id" TO "subject_id";--> statement-breakpoint
ALTER TABLE "subjects" RENAME CONSTRAINT "tags_name_unique" TO "subjects_name_unique";--> statement-breakpoint
ALTER TABLE "book_subjects" RENAME CONSTRAINT "book_tags_book_id_books_id_fk" TO "book_subjects_book_id_books_id_fk";--> statement-breakpoint
ALTER TABLE "book_subjects" RENAME CONSTRAINT "book_tags_tag_id_tags_id_fk" TO "book_subjects_subject_id_subjects_id_fk";--> statement-breakpoint
ALTER TABLE "book_subjects" RENAME CONSTRAINT "book_tags_book_id_tag_id_pk" TO "book_subjects_book_id_subject_id_pk";
