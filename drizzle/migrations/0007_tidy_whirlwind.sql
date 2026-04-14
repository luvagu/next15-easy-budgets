ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_category_id_inventory_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE restrict ON UPDATE no action;