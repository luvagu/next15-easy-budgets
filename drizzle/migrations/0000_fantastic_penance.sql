CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"total_quota" real NOT NULL,
	"bg_color" text NOT NULL,
	"expenses_total" real DEFAULT 0,
	"available_quota" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerkUserId" text NOT NULL,
	"name" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates_cache" (
	"currency_code" text PRIMARY KEY NOT NULL,
	"rate_to_usd" real NOT NULL,
	"last_fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_categories.user_name_unique" UNIQUE("clerk_user_id","name")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"unit" text NOT NULL,
	"base_cost_usd" real NOT NULL,
	"profit_margin_pct" real NOT NULL,
	"base_sale_price_usd" real NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"combo_qty_threshold" integer,
	"combo_price_usd" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items.user_name_brand_unique" UNIQUE("clerk_user_id","name","brand")
);
--> statement-breakpoint
CREATE TABLE "sale_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"item_id" uuid,
	"qty" integer NOT NULL,
	"refunded_qty" integer DEFAULT 0 NOT NULL,
	"snapshot_unit_cost_usd" real NOT NULL,
	"snapshot_sale_price_usd" real NOT NULL,
	"line_total_usd" real NOT NULL,
	"line_profit_usd" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" serial NOT NULL,
	"clerk_user_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"subtotal_usd" real NOT NULL,
	"delivery_charge_usd" real DEFAULT 0 NOT NULL,
	"discount_type" text,
	"discount_amount_usd" real DEFAULT 0 NOT NULL,
	"total_amount_usd" real NOT NULL,
	"loan_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_parent_id_budgets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_parent_id_loans_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budgets.clerk_user_id_index" ON "budgets" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "expenses.parent_id_index" ON "expenses" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "installments.parent_id_index" ON "installments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "loans.clerk_user_id_index" ON "loans" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "todos.clerk_user_id_index" ON "todos" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX "inventory_categories.clerk_user_id_index" ON "inventory_categories" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "inventory_items.clerk_user_id_index" ON "inventory_items" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "inventory_items.category_id_index" ON "inventory_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sale_line_items.invoice_id_index" ON "sale_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "sale_line_items.item_id_index" ON "sale_line_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "sales_invoices.clerk_user_id_index" ON "sales_invoices" USING btree ("clerk_user_id");