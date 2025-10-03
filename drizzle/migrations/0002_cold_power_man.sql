ALTER TABLE "budgets" ALTER COLUMN "max_amount" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "amount" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "installments" ALTER COLUMN "amount" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "total_amount" SET DATA TYPE real;