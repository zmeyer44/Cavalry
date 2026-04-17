CREATE TABLE "slack_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"team_id" varchar(64) NOT NULL,
	"team_name" varchar(255) NOT NULL,
	"bot_token" text NOT NULL,
	"bot_user_id" varchar(64),
	"default_channel_id" varchar(64),
	"installed_by" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slack_integrations" ADD CONSTRAINT "slack_integrations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_integrations" ADD CONSTRAINT "slack_integrations_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "slack_integrations_org_team_idx" ON "slack_integrations" USING btree ("org_id","team_id");--> statement-breakpoint
CREATE INDEX "slack_integrations_org_idx" ON "slack_integrations" USING btree ("org_id");