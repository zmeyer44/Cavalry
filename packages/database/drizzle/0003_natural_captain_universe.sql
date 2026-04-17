CREATE TABLE "git_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"provider" varchar(20) NOT NULL,
	"external_id" text NOT NULL,
	"account_login" varchar(255) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"installed_by" text,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suspended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"git_installation_id" text NOT NULL,
	"workspace_id" text,
	"provider" varchar(20) NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"default_branch" varchar(255) NOT NULL,
	"config_snapshot" jsonb,
	"config_commit_sha" text,
	"sync_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp,
	"last_successful_sync_at" timestamp,
	"last_sync_error" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_repo_syncs" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_repo_id" text NOT NULL,
	"trigger" varchar(20) NOT NULL,
	"trigger_ref" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"commit_sha_before" text,
	"commit_sha_after" text,
	"versions_discovered" integer DEFAULT 0 NOT NULL,
	"versions_published" integer DEFAULT 0 NOT NULL,
	"versions_skipped" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" varchar(20) NOT NULL,
	"delivery_id" text NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skill_versions" ADD COLUMN "source_kind" varchar(20) DEFAULT 'direct_publish' NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_versions" ADD COLUMN "source_ref" text;--> statement-breakpoint
ALTER TABLE "skill_versions" ADD COLUMN "source_commit_sha" text;--> statement-breakpoint
ALTER TABLE "skill_versions" ADD COLUMN "sync_id" text;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "source" varchar(20) DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "skill_repo_id" text;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "repo_path" text;--> statement-breakpoint
ALTER TABLE "git_installations" ADD CONSTRAINT "git_installations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_installations" ADD CONSTRAINT "git_installations_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_repos" ADD CONSTRAINT "skill_repos_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_repos" ADD CONSTRAINT "skill_repos_git_installation_id_git_installations_id_fk" FOREIGN KEY ("git_installation_id") REFERENCES "public"."git_installations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_repos" ADD CONSTRAINT "skill_repos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_repo_syncs" ADD CONSTRAINT "skill_repo_syncs_skill_repo_id_skill_repos_id_fk" FOREIGN KEY ("skill_repo_id") REFERENCES "public"."skill_repos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "git_installations_org_provider_external_idx" ON "git_installations" USING btree ("org_id","provider","external_id");--> statement-breakpoint
CREATE INDEX "git_installations_org_idx" ON "git_installations" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_repos_org_provider_owner_repo_idx" ON "skill_repos" USING btree ("org_id","provider","owner","repo");--> statement-breakpoint
CREATE INDEX "skill_repos_org_idx" ON "skill_repos" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "skill_repos_installation_idx" ON "skill_repos" USING btree ("git_installation_id");--> statement-breakpoint
CREATE INDEX "skill_repo_syncs_repo_started_idx" ON "skill_repo_syncs" USING btree ("skill_repo_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_provider_delivery_idx" ON "webhook_deliveries" USING btree ("provider","delivery_id");--> statement-breakpoint
ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_sync_id_skill_repo_syncs_id_fk" FOREIGN KEY ("sync_id") REFERENCES "public"."skill_repo_syncs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_skill_repo_id_skill_repos_id_fk" FOREIGN KEY ("skill_repo_id") REFERENCES "public"."skill_repos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skill_versions_sync_idx" ON "skill_versions" USING btree ("sync_id");--> statement-breakpoint
CREATE INDEX "skills_skill_repo_idx" ON "skills" USING btree ("skill_repo_id");