CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"total_quota" real NOT NULL,
	"bg_color" text NOT NULL,
	"expenses_total" real DEFAULT 0,
	"available_quota" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"total_debt" real NOT NULL,
	"bg_color" text NOT NULL,
	"is_against" boolean NOT NULL,
	"installmens_total" real DEFAULT 0,
	"due_amount" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_parent_id_budgets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_parent_id_loans_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budgets.clerk_user_id_index" ON "budgets" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "expenses.parent_id_index" ON "expenses" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "installments.parent_id_index" ON "installments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "loans.clerk_user_id_index" ON "loans" USING btree ("clerk_user_id");