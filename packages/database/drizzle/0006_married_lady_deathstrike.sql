ALTER TABLE "approvals" ADD COLUMN "slack_team_id" varchar(64);--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "slack_channel_id" varchar(64);--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "slack_message_ts" varchar(64);