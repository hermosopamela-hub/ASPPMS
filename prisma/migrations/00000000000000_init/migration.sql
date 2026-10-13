-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "department" TEXT NOT NULL DEFAULT '',
    "avatar_url" TEXT,
    "password_hash" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "password_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "supplier_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "payment_terms" TEXT NOT NULL DEFAULT 'Net 30',
    "lead_time_days" INTEGER NOT NULL DEFAULT 7,
    "contract_start_date" DATE,
    "contract_end_date" DATE,
    "overall_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_tier" TEXT NOT NULL DEFAULT 'SATISFACTORY',
    "delivery_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responsiveness_score" DOUBLE PRECISION NOT NULL DEFAULT 85,
    "compliance_score" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "total_orders_count" INTEGER NOT NULL DEFAULT 0,
    "total_spend" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL DEFAULT '',
    "uom" TEXT NOT NULL,
    "standard_price" DECIMAL(14,2) NOT NULL,
    "current_price" DECIMAL(14,2) NOT NULL,
    "previous_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "price_change_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "preferred_supplier_id" TEXT,
    "preferred_supplier_name" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "min_order_qty" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_transactions" (
    "id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "po_date" DATE NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "total_amount" DECIMAL(16,2) NOT NULL,
    "requested_delivery_date" DATE NOT NULL,
    "actual_delivery_date" DATE,
    "delivery_status" TEXT NOT NULL DEFAULT 'PENDING',
    "delay_days" INTEGER NOT NULL DEFAULT 0,
    "quality_status" TEXT NOT NULL DEFAULT 'PENDING',
    "received_quantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "accepted_quantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rejected_quantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rejection_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "buyer_staff" TEXT NOT NULL DEFAULT '',
    "receiving_date" DATE,
    "remarks" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "recorded_date" DATE NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "previous_price" DECIMAL(14,2) NOT NULL,
    "price_diff" DECIMAL(14,2) NOT NULL,
    "price_change_pct" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "classification" TEXT NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'Unit',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "supplier_id" TEXT,
    "supplier_name" TEXT,
    "material_id" TEXT,
    "material_name" TEXT,
    "description" TEXT NOT NULL,
    "trigger_metric" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assigned_user" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_imports" (
    "id" TEXT NOT NULL,
    "dataset_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "valid_rows" INTEGER NOT NULL,
    "imported_rows" INTEGER NOT NULL,
    "error_rows" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "imported_by" TEXT NOT NULL,
    "errors" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ip_address" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "company_name" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "thresholds" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplier_code_key" ON "suppliers"("supplier_code");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "materials_material_code_key" ON "materials"("material_code");

-- CreateIndex
CREATE INDEX "materials_category_idx" ON "materials"("category");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_transactions_po_number_key" ON "purchase_transactions"("po_number");

-- CreateIndex
CREATE INDEX "purchase_transactions_supplier_id_po_date_idx" ON "purchase_transactions"("supplier_id", "po_date");

-- CreateIndex
CREATE INDEX "purchase_transactions_material_id_po_date_idx" ON "purchase_transactions"("material_id", "po_date");

-- CreateIndex
CREATE INDEX "purchase_transactions_po_date_idx" ON "purchase_transactions"("po_date");

-- CreateIndex
CREATE INDEX "price_history_material_id_recorded_date_idx" ON "price_history"("material_id", "recorded_date");

-- CreateIndex
CREATE INDEX "price_history_supplier_id_idx" ON "price_history"("supplier_id");

-- CreateIndex
CREATE INDEX "price_history_po_number_idx" ON "price_history"("po_number");

-- CreateIndex
CREATE INDEX "alerts_status_severity_idx" ON "alerts"("status", "severity");

-- CreateIndex
CREATE INDEX "alerts_created_at_idx" ON "alerts"("created_at");

-- CreateIndex
CREATE INDEX "data_imports_created_at_idx" ON "data_imports"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_preferred_supplier_id_fkey" FOREIGN KEY ("preferred_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_transactions" ADD CONSTRAINT "purchase_transactions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_transactions" ADD CONSTRAINT "purchase_transactions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Rules Prisma cannot express (written by hand, as in IOVDIP).
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('PURCHASING_MANAGER','PURCHASING_ASSISTANT_MANAGER','PURCHASING_ANALYST','ADMIN'));
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("status" IN ('ACTIVE','INACTIVE','SUSPENDED'));
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_status_check" CHECK ("status" IN ('ACTIVE','INACTIVE','PROBATION','SUSPENDED'));
ALTER TABLE "purchase_transactions" ADD CONSTRAINT "purchase_quantity_check" CHECK ("quantity" > 0 AND "unit_price" >= 0);
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_severity_check" CHECK ("severity" IN ('CRITICAL','HIGH','MEDIUM','LOW'));
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_status_check" CHECK ("status" IN ('NEW','ACKNOWLEDGED','INVESTIGATING','RESOLVED','DISMISSED'));
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_single_row" CHECK ("id" = 1);
