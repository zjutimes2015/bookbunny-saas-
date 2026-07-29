CREATE TABLE "domain" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"domain_rating" integer,
	"ah_rank" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domain_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"og_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_url_idx" ON "domain" USING btree ("url");--> statement-breakpoint
CREATE INDEX "product_user_id_idx" ON "product" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_domain_id_idx" ON "product" USING btree ("domain_id");