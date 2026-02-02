-- ============================================================================
-- Migration: Add Lead References to Contracts
-- Date: 2026-02-01
-- Description: Track which lead generated each contract for full traceability
-- ============================================================================

-- 1. Add marketing_lead reference
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS marketing_lead_id UUID;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_leads') THEN
        ALTER TABLE contracts ADD CONSTRAINT fk_contracts_marketing_lead
            FOREIGN KEY (marketing_lead_id) REFERENCES marketing_leads(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN contracts.marketing_lead_id IS 'Marketing lead that originated this contract';

-- 2. Add sales_lead reference
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS sales_lead_id UUID;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_leads') THEN
        ALTER TABLE contracts ADD CONSTRAINT fk_contracts_sales_lead
            FOREIGN KEY (sales_lead_id) REFERENCES sales_leads(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN contracts.sales_lead_id IS 'Sales lead that originated this contract';

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_contracts_marketing_lead ON contracts(marketing_lead_id) WHERE marketing_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_sales_lead ON contracts(sales_lead_id) WHERE sales_lead_id IS NOT NULL;

-- 4. Backfill marketing_lead_id from quotes where possible
UPDATE contracts c
SET marketing_lead_id = q.lead_id
FROM quotes q
WHERE c.quote_id = q.id
  AND q.lead_id IS NOT NULL
  AND c.marketing_lead_id IS NULL;
