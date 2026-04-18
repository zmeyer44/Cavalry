ALTER TABLE "skill_versions" ALTER COLUMN "published_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_versions" ADD COLUMN "source_registry_id" text;--> statement-breakpoint
ALTER TABLE "skill_versions" ADD COLUMN "upstream_ref" text;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "source_registry_id" text;--> statement-breakpoint
ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_source_registry_id_registries_id_fk" FOREIGN KEY ("source_registry_id") REFERENCES "public"."registries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_source_registry_id_registries_id_fk" FOREIGN KEY ("source_registry_id") REFERENCES "public"."registries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skills_source_registry_idx" ON "skills" USING btree ("source_registry_id");