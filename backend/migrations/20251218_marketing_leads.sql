-- ============================================================================
-- MARKETING LEADS - Sistema de captación y envío de flyers
-- ============================================================================
-- Permite al staff de APONNT registrar posibles clientes y enviarles
-- el flyer "Preguntale a tu IA" por email o WhatsApp
-- ============================================================================

-- Tabla principal de leads de marketing
CREATE TABLE IF NOT EXISTS marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos del lead (obligatorios)
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'es', -- es, en, pt, it, de, fr

    -- Datos opcionales
    company_name VARCHAR(255),
    industry VARCHAR(100), -- rubro
    phone VARCHAR(50),
    whatsapp VARCHAR(50),

    -- Datos de origen
    source VARCHAR(50) DEFAULT 'manual', -- manual, web_form, referral, event
    notes TEXT,

    -- Staff que lo registró
    created_by_staff_id UUID,
    created_by_staff_name VARCHAR(255),

    -- Estado del lead
    status VARCHAR(30) DEFAULT 'new', -- new, contacted, interested, not_interested, converted

    -- Historial de envíos
    flyer_sent_at TIMESTAMP,
    flyer_sent_via VARCHAR(20), -- email, whatsapp
    flyer_opened_at TIMESTAMP,

    -- Seguimiento
    last_contact_at TIMESTAMP,
    next_followup_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_marketing_leads_email ON marketing_leads(email);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON marketing_leads(status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at ON marketing_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_staff ON marketing_leads(created_by_staff_id);

-- Historial de comunicaciones con leads
CREATE TABLE IF NOT EXISTS marketing_lead_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,

    -- Tipo de comunicación
    comm_type VARCHAR(30) NOT NULL, -- flyer_sent, email, whatsapp, call, meeting
    channel VARCHAR(20), -- email, whatsapp, phone

    -- Contenido
    subject VARCHAR(255),
    message TEXT,
    flyer_type VARCHAR(50), -- ask_your_ai, promo, custom

    -- Resultado
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, opened, clicked, bounced, failed

    -- Staff
    sent_by_staff_id UUID,
    sent_by_staff_name VARCHAR(255),

    -- Timestamps
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_comms_lead_id ON marketing_lead_communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_comms_type ON marketing_lead_communications(comm_type);

-- Vista para estadísticas de marketing
CREATE OR REPLACE VIEW marketing_stats AS
SELECT
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'new') as new_leads,
    COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
    COUNT(*) FILTER (WHERE status = 'interested') as interested,
    COUNT(*) FILTER (WHERE status = 'converted') as converted,
    COUNT(*) FILTER (WHERE flyer_sent_at IS NOT NULL) as flyers_sent,
    COUNT(*) FILTER (WHERE flyer_sent_via = 'email') as sent_by_email,
    COUNT(*) FILTER (WHERE flyer_sent_via = 'whatsapp') as sent_by_whatsapp,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as leads_last_7_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as leads_last_30_days
FROM marketing_leads;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_marketing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_marketing_leads_updated_at ON marketing_leads;
CREATE TRIGGER trigger_marketing_leads_updated_at
    BEFORE UPDATE ON marketing_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_leads_updated_at();

-- Comentarios
COMMENT ON TABLE marketing_leads IS 'Leads de marketing para envío de flyers y seguimiento comercial';
COMMENT ON TABLE marketing_lead_communications IS 'Historial de comunicaciones con cada lead';
COMMENT ON VIEW marketing_stats IS 'Estadísticas agregadas de marketing';
