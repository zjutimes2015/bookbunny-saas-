ALTER TABLE "domain_history" RENAME TO "domain_dr_history";--> statement-breakpoint
ALTER TABLE "domain_metrics_history" RENAME TO "domain_traffic_history";--> statement-breakpoint
ALTER TABLE "domain_dr_history" DROP CONSTRAINT "domain_history_domain_id_domain_id_fk";
--> statement-breakpoint
ALTER TABLE "domain_traffic_history" DROP CONSTRAINT "domain_metrics_history_domain_id_domain_id_fk";
--> statement-breakpoint
DROP INDEX "domain_history_domain_id_idx";--> statement-breakpoint
DROP INDEX "domain_history_created_at_idx";--> statement-breakpoint
DROP INDEX "domain_metrics_history_domain_id_idx";--> statement-breakpoint
DROP INDEX "domain_metrics_history_created_at_idx";--> statement-breakpoint
ALTER TABLE "domain_dr_history" ADD CONSTRAINT "domain_dr_history_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_traffic_history" ADD CONSTRAINT "domain_traffic_history_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_dr_history_domain_id_idx" ON "domain_dr_history" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "domain_dr_history_created_at_idx" ON "domain_dr_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "domain_traffic_history_domain_id_idx" ON "domain_traffic_history" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "domain_traffic_history_created_at_idx" ON "domain_traffic_history" USING btree ("created_at");