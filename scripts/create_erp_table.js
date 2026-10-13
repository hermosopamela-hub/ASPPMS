try { process.loadEnvFile(); } catch {}
const { Client } = require('pg');

const sql = `
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "erp_purchase_orders_purchasing_document_idx" ON "erp_purchase_orders"("purchasing_document");
CREATE INDEX IF NOT EXISTS "erp_purchase_orders_material_code_idx" ON "erp_purchase_orders"("material_code");
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log('erp_purchase_orders table created or already exists.');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Error creating table:', err);
  process.exit(1);
});
