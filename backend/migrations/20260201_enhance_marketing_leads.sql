-- ============================================================================
-- Migration: Enhance Marketing Leads for Pipeline Integration
-- Date: 2026-02-01
-- Description: Add seller assignment, follow-up reminders, and conversion tracking
-- ============================================================================

-- 1. Add seller assignment (OPTIONAL - for tracking who's working the lead)
-- NOTE: partners.id is UUID, so assigned_seller_id must be UUID
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS assigned_seller_id UUID;

-- Add FK if partners table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partners') THEN
        ALTER TABLE marketing_leads ADD CONSTRAINT fk_marketing_leads_seller
            FOREIGN KEY (assigned_seller_id) REFERENCES partners(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;
COMMENT ON COLUMN marketing_leads.assigned_seller_id IS 'Partner/seller assigned to this lead (for commission tracking when converted)';

-- 2. Add follow-up reminders
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;
COMMENT ON COLUMN marketing_leads.follow_up_date IS 'Date to follow up with this lead';

-- 3. Add campaign/source tracking
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS campaign_source VARCHAR(100);
COMMENT ON COLUMN marketing_leads.campaign_source IS 'Source: ai_flyer, event, web_form, referral, cold_call, linkedin, etc.';

-- 4. Add conversion tracking
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS converted_to_quote_id INTEGER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        ALTER TABLE marketing_leads ADD CONSTRAINT fk_marketing_leads_quote
            FOREIGN KEY (converted_to_quote_id) REFERENCES quotes(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;
COMMENT ON COLUMN marketing_leads.converted_to_quote_id IS 'Quote created from this lead (tracks conversion)';

-- 5. Add interaction counter
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0;
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP;
COMMENT ON COLUMN marketing_leads.interaction_count IS 'Number of recorded interactions with this lead';

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_marketing_leads_seller ON marketing_leads(assigned_seller_id) WHERE assigned_seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_leads_follow_up ON marketing_leads(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_leads_converted ON marketing_leads(converted_to_quote_id) WHERE converted_to_quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign ON marketing_leads(campaign_source) WHERE campaign_source IS NOT NULL;

-- 7. Set default campaign_source for existing leads from flyer sends
UPDATE marketing_leads SET campaign_source = 'ai_flyer'
WHERE campaign_source IS NULL AND flyer_sent_at IS NOT NULL;
