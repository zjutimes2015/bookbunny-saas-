CREATE TABLE "directory" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"og_image" text,
	"source" text NOT NULL,
	"product_id" text,
	"status" text NOT NULL,
	"rejected_reason" text,
	"pricing" text,
	"category" text,
	"dofollow" boolean NOT NULL,
	"account" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_directory" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"directory_id" text NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_directory_unique" UNIQUE("product_id","directory_id")
);
--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "traffic" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "directory" ADD CONSTRAINT "directory_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory" ADD CONSTRAINT "directory_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_directory" ADD CONSTRAINT "product_directory_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_directory" ADD CONSTRAINT "product_directory_directory_id_directory_id_fk" FOREIGN KEY ("directory_id") REFERENCES "public"."directory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "directory_domain_id_idx" ON "directory" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "directory_product_id_idx" ON "directory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "directory_url_idx" ON "directory" USING btree ("url");--> statement-breakpoint
CREATE INDEX "directory_source_idx" ON "directory" USING btree ("source");--> statement-breakpoint
CREATE INDEX "directory_status_idx" ON "directory" USING btree ("status");--> statement-breakpoint
CREATE INDEX "directory_category_idx" ON "directory" USING btree ("category");--> statement-breakpoint
CREATE INDEX "directory_pricing_idx" ON "directory" USING btree ("pricing");--> statement-breakpoint
CREATE INDEX "directory_dofollow_idx" ON "directory" USING btree ("dofollow");--> statement-breakpoint
CREATE INDEX "directory_account_idx" ON "directory" USING btree ("account");--> statement-breakpoint
CREATE INDEX "product_directory_product_id_idx" ON "product_directory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_directory_directory_id_idx" ON "product_directory" USING btree ("directory_id");--> statement-breakpoint
CREATE INDEX "product_directory_status_idx" ON "product_directory" USING btree ("status");