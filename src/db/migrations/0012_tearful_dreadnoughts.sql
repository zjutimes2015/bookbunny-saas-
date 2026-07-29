CREATE TABLE "product_deal" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"deal_type" text NOT NULL,
	"deal_name" text NOT NULL,
	"price" integer NOT NULL,
	"original_price" integer,
	"discount" text,
	"coupon_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_deal_unique" UNIQUE("product_id","deal_type")
);
--> statement-breakpoint
ALTER TABLE "product_deal" ADD CONSTRAINT "product_deal_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_deal_product_id_idx" ON "product_deal" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_deal_deal_type_idx" ON "product_deal" USING btree ("deal_type");