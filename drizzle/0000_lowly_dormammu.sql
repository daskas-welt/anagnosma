CREATE TABLE "book_tags" (
	"book_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "book_tags_book_id_tag_id_pk" PRIMARY KEY("book_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"isbn" text,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"cover_url" text,
	"publisher" text,
	"publish_year" integer,
	"page_count" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "books_isbn_unique" UNIQUE("isbn")
);
--> statement-breakpoint
CREATE TABLE "copies" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"format" text NOT NULL,
	"condition" text,
	"purchase_price" numeric,
	"purchase_date" date,
	"shelf_location" text,
	"status" text DEFAULT 'to-read' NOT NULL,
	"progress_page" integer,
	"rating" integer,
	"notes" text,
	"date_started" date,
	"date_finished" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "book_tags" ADD CONSTRAINT "book_tags_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_tags" ADD CONSTRAINT "book_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copies" ADD CONSTRAINT "copies_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;