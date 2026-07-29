ALTER TABLE "product" ADD COLUMN "private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "product_private_idx" ON "product" USING btree ("private");