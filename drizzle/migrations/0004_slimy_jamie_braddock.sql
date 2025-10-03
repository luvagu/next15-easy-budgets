ALTER TABLE "budgets" ALTER COLUMN "expenses_total" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "expenses_total" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "installmens_total" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "installmens_total" DROP NOT NULL;