-- ============================================================================
-- Migration: Create Unified Sales Pipeline View
-- Date: 2026-02-01
-- Description: Single view combining marketing_leads and sales_leads with conversion status
-- ============================================================================

-- Drop view if exists to recreate
DROP VIEW IF EXISTS v_sales_pipeline;

-- Create unified pipeline view
CREATE OR REPLACE VIEW v_sales_pipeline AS

-- Marketing Leads Pipeline
SELECT
    'marketing' AS source_system,
    ml.id::text AS lead_id,
    ml.full_name AS contact_name,
    ml.email AS contact_email,
    ml.phone AS contact_phone,
    ml.company_name,
    ml.industry,
    ml.status AS lead_status,
    ml.created_at,
    ml.updated_at,
    ml.assigned_seller_id AS seller_id,
    (p.first_name || ' ' || p.last_name) AS seller_name,
    ml.follow_up_date,
    ml.follow_up_notes,
    ml.campaign_source,
    ml.interaction_count,
    ml.flyer_sent_at,
    ml.flyer_sent_via,
    -- Quote info
    q.id AS quote_id,
    q.quote_number,
    q.status AS quote_status,
    q.total_amount AS quote_amount,
    q.has_trial,
    q.sent_date AS quote_sent_date,
    q.accepted_date AS quote_accepted_date,
    -- Contract info
    c.id AS contract_id,
    c.contract_number,
    c.status AS contract_status,
    -- Company info
    comp.company_id,
    comp.name AS company_created_name,
    comp.is_active AS company_active,
    comp.activated_at AS company_activated_at,
    -- Pipeline stage calculation
    CASE
        WHEN comp.is_active = true THEN 'active_customer'
        WHEN c.status = 'signed' OR c.status = 'active' THEN 'contract_signed'
        WHEN c.status = 'sent' THEN 'contract_pending'
        WHEN q.status = 'active' THEN 'quote_active'
        WHEN q.status = 'accepted' THEN 'quote_accepted'
        WHEN q.status = 'in_trial' THEN 'in_trial'
        WHEN q.status = 'sent' THEN 'quote_sent'
        WHEN q.id IS NOT NULL THEN 'quote_draft'
        WHEN ml.status = 'converted' THEN 'converted'
        WHEN ml.status = 'interested' THEN 'interested'
        WHEN ml.status = 'contacted' THEN 'contacted'
        WHEN ml.status = 'not_interested' THEN 'lost'
        ELSE 'new_lead'
    END AS pipeline_stage,
    -- Stage order for sorting
    CASE
        WHEN comp.is_active = true THEN 10
        WHEN c.status IN ('signed', 'active') THEN 9
        WHEN c.status = 'sent' THEN 8
        WHEN q.status = 'active' THEN 7
        WHEN q.status = 'accepted' THEN 6
        WHEN q.status = 'in_trial' THEN 5
        WHEN q.status = 'sent' THEN 4
        WHEN q.id IS NOT NULL THEN 3
        WHEN ml.status = 'interested' THEN 2
        WHEN ml.status = 'contacted' THEN 1
        ELSE 0
    END AS stage_order
FROM marketing_leads ml
LEFT JOIN partners p ON ml.assigned_seller_id = p.id
LEFT JOIN quotes q ON q.lead_id = ml.id
LEFT JOIN contracts c ON (c.marketing_lead_id = ml.id OR c.quote_id = q.id)
LEFT JOIN companies comp ON q.company_id = comp.company_id

UNION ALL

-- Sales Leads Pipeline (if sales_leads table exists)
SELECT
    'sales' AS source_system,
    sl.id::text AS lead_id,
    sl.contact_name,
    sl.contact_email,
    sl.contact_phone,
    sl.company_name,
    sl.company_industry::text AS industry,
    sl.lifecycle_stage::text AS lead_status,
    sl.created_at,
    sl.updated_at,
    NULL::uuid AS seller_id, -- sales_leads uses assigned_vendor_id (UUID to aponnt_staff)
    NULL AS seller_name, -- Would need join to aponnt_staff
    sl.next_action_date AS follow_up_date,
    sl.next_action AS follow_up_notes,
    sl.lead_source::text AS campaign_source,
    0 AS interaction_count,
    NULL::timestamp AS flyer_sent_at,
    NULL AS flyer_sent_via,
    -- Quote info
    q.id AS quote_id,
    q.quote_number,
    q.status AS quote_status,
    q.total_amount AS quote_amount,
    q.has_trial,
    q.sent_date AS quote_sent_date,
    q.accepted_date AS quote_accepted_date,
    -- Contract info
    c.id AS contract_id,
    c.contract_number,
    c.status AS contract_status,
    -- Company info
    comp.company_id,
    comp.name AS company_created_name,
    comp.is_active AS company_active,
    comp.activated_at AS company_activated_at,
    -- Pipeline stage
    CASE
        WHEN comp.is_active = true THEN 'active_customer'
        WHEN sl.lifecycle_stage = 'customer' THEN 'customer'
        WHEN sl.lifecycle_stage = 'opportunity' THEN 'opportunity'
        WHEN sl.lifecycle_stage = 'sql' THEN 'sql'
        WHEN sl.lifecycle_stage = 'sal' THEN 'sal'
        WHEN sl.lifecycle_stage = 'mql' THEN 'mql'
        WHEN sl.lifecycle_stage = 'lead' THEN 'lead'
        WHEN sl.lifecycle_stage = 'disqualified' THEN 'lost'
        WHEN sl.lifecycle_stage = 'lost' THEN 'lost'
        ELSE 'subscriber'
    END AS pipeline_stage,
    CASE
        WHEN comp.is_active = true THEN 10
        WHEN sl.lifecycle_stage = 'customer' THEN 9
        WHEN sl.lifecycle_stage = 'opportunity' THEN 7
        WHEN sl.lifecycle_stage = 'sql' THEN 6
        WHEN sl.lifecycle_stage = 'sal' THEN 5
        WHEN sl.lifecycle_stage = 'mql' THEN 4
        WHEN sl.lifecycle_stage = 'lead' THEN 2
        ELSE 0
    END AS stage_order
FROM sales_leads sl
LEFT JOIN quotes q ON q.sales_lead_id = sl.id
LEFT JOIN contracts c ON (c.sales_lead_id = sl.id OR c.quote_id = q.id)
LEFT JOIN companies comp ON sl.customer_company_id = comp.company_id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_leads')

ORDER BY stage_order DESC, created_at DESC;

-- Grant permissions
GRANT SELECT ON v_sales_pipeline TO PUBLIC;

COMMENT ON VIEW v_sales_pipeline IS 'Unified pipeline view combining marketing_leads and sales_leads with conversion status. Use pipeline_stage for filtering and stage_order for sorting.';

-- Create helper function to get pipeline summary
CREATE OR REPLACE FUNCTION get_pipeline_summary()
RETURNS TABLE (
    pipeline_stage TEXT,
    lead_count BIGINT,
    total_quote_amount NUMERIC,
    with_seller_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.pipeline_stage,
        COUNT(*)::bigint AS lead_count,
        COALESCE(SUM(v.quote_amount), 0) AS total_quote_amount,
        COUNT(v.seller_id)::bigint AS with_seller_count
    FROM v_sales_pipeline v
    GROUP BY v.pipeline_stage
    ORDER BY MAX(v.stage_order) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pipeline_summary() IS 'Returns pipeline statistics by stage';
