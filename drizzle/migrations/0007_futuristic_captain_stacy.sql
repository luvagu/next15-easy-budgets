ALTER TABLE "expenses" RENAME COLUMN "budget_id" TO "parent_id";--> statement-breakpoint
ALTER TABLE "installments" RENAME COLUMN "loan_id" TO "parent_id";--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_budget_id_budgets_id_fk";
--> statement-breakpoint
ALTER TABLE "installments" DROP CONSTRAINT "installments_loan_id_loans_id_fk";
--> statement-breakpoint
DROP INDEX "expenses.budget_id_index";--> statement-breakpoint
DROP INDEX "installments.loan_id_index";--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_parent_id_budgets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_parent_id_loans_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses.parent_id_index" ON "expenses" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "installments.parent_id_index" ON "installments" USING btree ("parent_id");