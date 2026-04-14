ALTER TABLE "sale_line_items" DROP CONSTRAINT "sale_line_items_item_id_inventory_items_id_fk";
--> statement-breakpoint
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;