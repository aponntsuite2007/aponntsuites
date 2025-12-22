-- ============================================================================
-- MIGRACIÓN: Sistema de Tracking de Visitas y Encuestas para Leads
-- Fecha: 2025-12-19
-- Autor: Claude Code
-- ============================================================================

-- 1. Agregar campos de tracking a marketing_leads
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS page_visited_at TIMESTAMPTZ;
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS page_visit_count INTEGER DEFAULT 0;
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS demo_accessed_at TIMESTAMPTZ;
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS survey_sent_at TIMESTAMPTZ;
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS survey_completed_at TIMESTAMPTZ;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_marketing_leads_tracking_token ON marketing_leads(tracking_token);

-- 2. Crear tabla de encuestas de leads
CREATE TABLE IF NOT EXISTS marketing_lead_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,

    -- Token único para responder la encuesta
    survey_token UUID DEFAULT gen_random_uuid() UNIQUE,

    -- Respuestas con emojis (1-5 estrellas o emojis específicos)
    rating_overall INTEGER CHECK (rating_overall BETWEEN 1 AND 5),        -- ⭐ Calificación general
    rating_design INTEGER CHECK (rating_design BETWEEN 1 AND 5),          -- 🎨 Diseño
    rating_clarity INTEGER CHECK (rating_clarity BETWEEN 1 AND 5),        -- 📖 Claridad de info
    rating_interest INTEGER CHECK (rating_interest BETWEEN 1 AND 5),      -- 💡 Interés en el producto

    -- Pregunta de intención
    contact_preference VARCHAR(50),  -- 'email', 'whatsapp', 'call', 'demo', 'not_now'

    -- Feedback abierto
    feedback_text TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lead_surveys_lead_id ON marketing_lead_surveys(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_surveys_token ON marketing_lead_surveys(survey_token);
CREATE INDEX IF NOT EXISTS idx_lead_surveys_status ON marketing_lead_surveys(status);

-- 3. Crear tabla de tracking de eventos
CREATE TABLE IF NOT EXISTS marketing_lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,

    -- Tipo de evento
    event_type VARCHAR(50) NOT NULL,  -- 'flyer_sent', 'page_visit', 'demo_access', 'survey_sent', 'survey_completed'

    -- Detalles del evento
    event_data JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON marketing_lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON marketing_lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created ON marketing_lead_events(created_at DESC);

-- 4. Vista para análisis de leads
CREATE OR REPLACE VIEW marketing_lead_analytics AS
SELECT
    ml.id,
    ml.full_name,
    ml.email,
    ml.company_name,
    ml.status,
    ml.flyer_sent_at,
    ml.page_visited_at,
    ml.page_visit_count,
    ml.demo_accessed_at,
    ml.survey_sent_at,
    ml.survey_completed_at,
    mls.rating_overall,
    mls.rating_interest,
    mls.contact_preference,
    CASE
        WHEN ml.survey_completed_at IS NOT NULL THEN 'survey_completed'
        WHEN ml.demo_accessed_at IS NOT NULL THEN 'demo_accessed'
        WHEN ml.page_visited_at IS NOT NULL THEN 'page_visited'
        WHEN ml.flyer_sent_at IS NOT NULL THEN 'flyer_sent'
        ELSE 'new'
    END as funnel_stage,
    (SELECT COUNT(*) FROM marketing_lead_events WHERE lead_id = ml.id) as total_events
FROM marketing_leads ml
LEFT JOIN marketing_lead_surveys mls ON ml.id = mls.lead_id AND mls.status = 'completed';

COMMENT ON TABLE marketing_lead_surveys IS 'Encuestas de satisfacción enviadas a leads después de visitar la página';
COMMENT ON TABLE marketing_lead_events IS 'Log de eventos para tracking del funnel de leads';
