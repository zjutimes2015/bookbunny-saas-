CREATE TABLE "domain_history" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"domain_rating" integer,
	"ah_rank" integer,
	"traffic" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domain_history" ADD CONSTRAINT "domain_history_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_history_domain_id_idx" ON "domain_history" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "domain_history_created_at_idx" ON "domain_history" USING btree ("created_at");