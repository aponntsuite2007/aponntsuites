-- ============================================================================
-- Migration: Make Quote seller_id OPTIONAL
-- Date: 2026-02-01
-- Description: Allow quotes to be created without a seller (direct sales by managers/admins)
-- ============================================================================

-- 1. Make seller_id nullable (for direct sales without commission)
ALTER TABLE quotes ALTER COLUMN seller_id DROP NOT NULL;

-- 2. Add seller assignment tracking
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS seller_assigned_at TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS seller_assigned_by INTEGER REFERENCES aponnt_staff(staff_id);

-- 3. Add origin tracking (where did this quote come from?)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_type VARCHAR(30) DEFAULT 'manual';
COMMENT ON COLUMN quotes.origin_type IS 'Source: marketing_lead, sales_lead, direct, referral, partner, manual';

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_detail JSONB;
COMMENT ON COLUMN quotes.origin_detail IS 'JSON with origin metadata (campaign, source_url, lead_email, etc.)';

-- 4. Add reference to sales_leads (for dual-system flexibility)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sales_lead_id UUID;

-- Add foreign key if sales_leads table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_leads') THEN
        ALTER TABLE quotes ADD CONSTRAINT fk_quotes_sales_lead
            FOREIGN KEY (sales_lead_id) REFERENCES sales_leads(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_quotes_origin_type ON quotes(origin_type);
CREATE INDEX IF NOT EXISTS idx_quotes_sales_lead_id ON quotes(sales_lead_id) WHERE sales_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_seller_assigned_at ON quotes(seller_assigned_at) WHERE seller_assigned_at IS NOT NULL;

-- 6. Update existing quotes without seller to have origin_type = 'legacy'
UPDATE quotes SET origin_type = 'legacy' WHERE origin_type IS NULL AND created_at < '2026-02-01';

COMMENT ON TABLE quotes IS 'Presupuestos - seller_id es OPCIONAL (NULL = venta directa sin comision)';
