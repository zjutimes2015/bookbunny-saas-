CREATE TABLE "domain_metrics_history" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domain_metrics_history" ADD CONSTRAINT "domain_metrics_history_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_metrics_history_domain_id_idx" ON "domain_metrics_history" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "domain_metrics_history_created_at_idx" ON "domain_metrics_history" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "domain_history" DROP COLUMN "traffic";