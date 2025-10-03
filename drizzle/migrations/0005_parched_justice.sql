ALTER TABLE "budgets" RENAME COLUMN "max_amount" TO "total_quota";--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "available_quota" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "due_amount" real DEFAULT 0;