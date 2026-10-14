-- Raw ERP (SAP) purchase order lines, kept exactly as exported. One row per (purchasing document, item).
-- IF NOT EXISTS: a developer database may already have the table from the old scripts/create_erp_table.js.

CREATE TABLE IF NOT EXISTS "erp_purchase_orders" (
    "id" TEXT NOT NULL,
    "erp_legacy_po" TEXT,
    "purchasing_document" TEXT NOT NULL,
    "tax_code" TEXT,
    "gross_unit_price" DECIMAL(14,2),
    "net_price" DECIMAL(14,2),
    "material_code" TEXT,
    "order_quantity" DECIMAL(14,2),
    "order_unit" TEXT,
    "purchasing_doc_type" TEXT,
    "purch_organization" TEXT,
    "item_category" TEXT,
    "item" INTEGER NOT NULL,
    "purch_doc_category" TEXT,
    "purchasing_group" TEXT,
    "document_date" DATE,
    "supplier_text" TEXT,
    "short_text" TEXT,
    "material_group" TEXT,
    "acct_assignment_cat" TEXT,
    "plant" TEXT,
    "storage_location" TEXT,
    "quantity_in_sku" DECIMAL(14,2),
    "stockkeeping_unit" TEXT,
    "created_by" TEXT,
    "currency" TEXT,
    "price_unit" DECIMAL(14,2),
    "target_quantity" DECIMAL(14,2),
    "open_target_quantity" DECIMAL(14,2),
    "still_to_be_delivered_qty" DECIMAL(14,2),
    "still_to_be_delivered_value" DECIMAL(14,2),
    "still_to_be_invoiced_qty" DECIMAL(14,2),
    "still_to_be_invoiced_val" DECIMAL(14,2),
    "no_of_positions" INTEGER,
    "source_file" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_purchase_orders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "erp_purchase_orders" ADD COLUMN IF NOT EXISTS "source_file" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "erp_purchase_orders_purchasing_document_item_key" ON "erp_purchase_orders"("purchasing_document", "item");
CREATE INDEX IF NOT EXISTS "erp_purchase_orders_purchasing_document_idx" ON "erp_purchase_orders"("purchasing_document");
CREATE INDEX IF NOT EXISTS "erp_purchase_orders_material_code_idx" ON "erp_purchase_orders"("material_code");
