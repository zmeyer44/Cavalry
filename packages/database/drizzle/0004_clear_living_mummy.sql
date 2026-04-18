CREATE TABLE "audit_webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"webhook_id" text NOT NULL,
	"event_id" text NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"response_status" integer,
	"response_body" text,
	"error_message" text,
	"scheduled_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"format" varchar(20) DEFAULT 'generic' NOT NULL,
	"action_filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_delivery_at" timestamp,
	"last_success_at" timestamp,
	"last_failure_at" timestamp,
	"last_failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_webhook_deliveries" ADD CONSTRAINT "audit_webhook_deliveries_webhook_id_audit_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."audit_webhooks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_webhook_deliveries" ADD CONSTRAINT "audit_webhook_deliveries_event_id_audit_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."audit_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_webhooks" ADD CONSTRAINT "audit_webhooks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_webhook_deliveries_webhook_idx" ON "audit_webhook_deliveries" USING btree ("webhook_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "audit_webhook_deliveries_status_idx" ON "audit_webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_webhooks_org_name_idx" ON "audit_webhooks" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "audit_webhooks_org_idx" ON "audit_webhooks" USING btree ("org_id");