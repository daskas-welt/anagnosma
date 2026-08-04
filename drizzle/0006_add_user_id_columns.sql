ALTER TABLE "subjects" DROP CONSTRAINT "subjects_name_unique";--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_name_unique" UNIQUE("user_id","name");