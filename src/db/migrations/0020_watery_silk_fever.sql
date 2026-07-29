-- Add domain column as nullable first
ALTER TABLE "domain_dr_history" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "domain_traffic_history" ADD COLUMN "domain" text;--> statement-breakpoint
-- Update existing records with domain URL from domain table
UPDATE "domain_dr_history" 
SET "domain" = (SELECT "url" FROM "domain" WHERE "domain"."id" = "domain_dr_history"."domain_id")
WHERE "domain" IS NULL;--> statement-breakpoint
UPDATE "domain_traffic_history" 
SET "domain" = (SELECT "url" FROM "domain" WHERE "domain"."id" = "domain_traffic_history"."domain_id")
WHERE "domain" IS NULL;--> statement-breakpoint
-- Set NOT NULL constraint after data is populated
ALTER TABLE "domain_dr_history" ALTER COLUMN "domain" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "domain_traffic_history" ALTER COLUMN "domain" SET NOT NULL;--> statement-breakpoint
-- Create indexes for optimized queries
CREATE INDEX "domain_dr_history_domain_idx" ON "domain_dr_history" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "domain_traffic_history_domain_idx" ON "domain_traffic_history" USING btree ("domain");