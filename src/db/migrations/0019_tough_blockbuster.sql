ALTER TABLE "product_deal" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "product_deal_featured_idx" ON "product_deal" USING btree ("featured");