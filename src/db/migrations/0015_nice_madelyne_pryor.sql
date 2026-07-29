CREATE TABLE "deal_event" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deal_event_type_unique" UNIQUE("type")
);
--> statement-breakpoint
ALTER TABLE "product_deal" DROP CONSTRAINT "product_deal_unique";--> statement-breakpoint
DROP INDEX "product_deal_deal_type_idx";--> statement-breakpoint
ALTER TABLE "product_deal" ADD COLUMN "deal_event_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "deal_event_type_idx" ON "deal_event" USING btree ("type");--> statement-breakpoint
CREATE INDEX "deal_event_status_idx" ON "deal_event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deal_event_created_at_idx" ON "deal_event" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "product_deal" ADD CONSTRAINT "product_deal_deal_event_id_deal_event_id_fk" FOREIGN KEY ("deal_event_id") REFERENCES "public"."deal_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_deal_deal_event_id_idx" ON "product_deal" USING btree ("deal_event_id");--> statement-breakpoint
ALTER TABLE "product_deal" DROP COLUMN "deal_type";--> statement-breakpoint
ALTER TABLE "product_deal" DROP COLUMN "deal_name";--> statement-breakpoint
ALTER TABLE "product_deal" ADD CONSTRAINT "product_deal_unique" UNIQUE("product_id","deal_event_id");