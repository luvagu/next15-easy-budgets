ALTER TABLE "sales_invoices" ADD COLUMN "discount_type" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "discount_amount_usd" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "status" text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "cancelled_at" timestamp with time zone;