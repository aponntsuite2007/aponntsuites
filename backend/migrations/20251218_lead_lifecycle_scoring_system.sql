-- ============================================================================
-- LEAD LIFECYCLE & SCORING SYSTEM - Enterprise Grade
-- Sistema de categorización y scoring de leads de primera categoría
-- ============================================================================
-- Fecha: 2025-12-18
-- Basado en: Salesforce, HubSpot, BANT Framework, MEDDIC
--
-- Estructura:
--   1. Lifecycle Stages (Lead → MQL → SQL → Opportunity → Customer)
--   2. Temperature (Hot, Warm, Cold, Dead)
--   3. BANT Scoring (Budget, Authority, Need, Timeline)
--   4. Behavioral Scoring (engagement activities)
--   5. Automatic Score Decay (inactivity penalties)
--   6. Disqualification Tracking
-- ============================================================================

-- ===========================================
-- 1. TIPOS ENUMERADOS
-- ===========================================

-- Lifecycle Stage (etapa en el funnel)
DO $$ BEGIN
    CREATE TYPE lead_lifecycle_stage AS ENUM (
        'subscriber',      -- Solo suscrito a newsletter/marketing
        'lead',            -- Mostró interés inicial (descargó algo, visitó web)
        'mql',             -- Marketing Qualified Lead - cumple criterios de marketing
        'sal',             -- Sales Accepted Lead - ventas aceptó trabajarlo
        'sql',             -- Sales Qualified Lead - ventas confirmó que es viable
        'opportunity',     -- En proceso activo de venta
        'customer',        -- Cerrado ganado
        'evangelist',      -- Cliente feliz que refiere
        'disqualified',    -- Descalificado (no es fit)
        'lost'             -- Perdido (eligió competencia o no decision)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Temperatura del lead (qué tan "caliente" está)
DO $$ BEGIN
    CREATE TYPE lead_temperature AS ENUM (
        'hot',             -- Score 80-100, listo para comprar
        'warm',            -- Score 40-79, interesado pero no urgente
        'cold',            -- Score 1-39, bajo engagement
        'dead'             -- Score 0 o inactivo 90+ días
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fuente del lead
DO $$ BEGIN
    CREATE TYPE lead_source AS ENUM (
        'website_organic',     -- Llegó por búsqueda orgánica
        'website_paid',        -- Llegó por ads (Google, Meta)
        'referral_customer',   -- Referido por cliente actual
        'referral_partner',    -- Referido por partner
        'cold_outreach',       -- Prospección en frío (vendedor)
        'event_trade_show',    -- Feria/evento presencial
        'event_webinar',       -- Webinar
        'linkedin',            -- LinkedIn
        'whatsapp',            -- WhatsApp directo
        'ai_flyer',            -- Nuestro flyer "Preguntale a tu IA"
        'demo_request',        -- Pidió demo directamente
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Razón de descalificación
DO $$ BEGIN
    CREATE TYPE disqualification_reason AS ENUM (
        'budget_too_low',          -- No tiene presupuesto
        'not_decision_maker',      -- No es quien decide
        'no_need',                 -- No tiene el problema que resolvemos
        'bad_timing',              -- Timing incorrecto (muy adelante)
        'competitor_chosen',       -- Eligió competencia
        'company_too_small',       -- Empresa muy chica (<10 empleados)
        'company_too_large',       -- Empresa muy grande (necesitan enterprise)
        'wrong_industry',          -- Industria que no atendemos
        'geographic_limitation',   -- Fuera de zona geográfica
        'unresponsive',            -- No responde después de X intentos
        'fake_spam',               -- Datos falsos o spam
        'duplicate',               -- Lead duplicado
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de actividad para scoring
DO $$ BEGIN
    CREATE TYPE lead_activity_type AS ENUM (
        -- Actividades positivas
        'email_opened',            -- Abrió email (+2)
        'email_clicked',           -- Click en link de email (+5)
        'website_visit',           -- Visitó website (+3)
        'page_view_pricing',       -- Vio página de precios (+10)
        'page_view_demo',          -- Vio página de demo (+8)
        'resource_download',       -- Descargó recurso (+10)
        'webinar_registered',      -- Se registró a webinar (+15)
        'webinar_attended',        -- Asistió a webinar (+25)
        'demo_requested',          -- Pidió demo (+30)
        'demo_attended',           -- Asistió a demo (+40)
        'survey_completed',        -- Completó encuesta de interés (+20)
        'meeting_scheduled',       -- Agendó reunión (+35)
        'meeting_attended',        -- Asistió a reunión (+50)
        'quote_requested',         -- Pidió presupuesto (+60)
        'trial_started',           -- Inició trial (+40)
        'referred_someone',        -- Refirió a alguien (+30)

        -- Actividades negativas
        'email_bounced',           -- Email rebotó (-20)
        'email_unsubscribed',      -- Se desuscribió (-50)
        'meeting_no_show',         -- No asistió a reunión (-30)
        'negative_feedback',       -- Feedback negativo (-15)
        'complaint',               -- Queja (-25)

        -- Decay por inactividad (automático)
        'inactivity_30_days',      -- 30 días sin actividad (-10)
        'inactivity_60_days',      -- 60 días sin actividad (-20)
        'inactivity_90_days'       -- 90 días sin actividad (-30)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 2. TABLA PRINCIPAL: LEADS
-- ===========================================

CREATE TABLE IF NOT EXISTS sales_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos de la empresa prospecto
    company_name VARCHAR(255) NOT NULL,
    company_industry industry_type DEFAULT 'otro',
    company_size VARCHAR(50),                      -- '1-10', '11-50', '51-200', '201-500', '500+'
    company_employee_count INTEGER,
    company_country VARCHAR(100) DEFAULT 'Argentina',
    company_province VARCHAR(100),
    company_city VARCHAR(100),
    company_website VARCHAR(255),
    company_linkedin VARCHAR(255),

    -- Contacto principal
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    contact_whatsapp VARCHAR(50),
    contact_job_title VARCHAR(150),
    contact_department VARCHAR(100),
    contact_is_decision_maker BOOLEAN DEFAULT false,
    contact_linkedin VARCHAR(255),

    -- Contactos adicionales (JSONB para flexibilidad)
    additional_contacts JSONB DEFAULT '[]'::jsonb,
    -- Formato: [{"name": "...", "email": "...", "role": "...", "is_decision_maker": true}]

    -- Origen y atribución
    lead_source lead_source DEFAULT 'other',
    lead_source_detail VARCHAR(255),              -- Detalle (ej: "Google Ads Campaign X")
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    referrer_url VARCHAR(500),
    landing_page VARCHAR(500),

    -- Asignación
    assigned_vendor_id UUID,                       -- Vendedor asignado
    assigned_at TIMESTAMP WITH TIME ZONE,
    previous_vendor_id UUID,                       -- Para tracking de reasignaciones

    -- LIFECYCLE STAGE (etapa actual)
    lifecycle_stage lead_lifecycle_stage DEFAULT 'lead',
    lifecycle_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lifecycle_history JSONB DEFAULT '[]'::jsonb,   -- Historial de cambios de etapa
    -- Formato: [{"stage": "mql", "changed_at": "...", "changed_by": "...", "reason": "..."}]

    -- TEMPERATURE (qué tan caliente)
    temperature lead_temperature DEFAULT 'cold',
    temperature_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- SCORING
    total_score INTEGER DEFAULT 0,                 -- Score total calculado

    -- BANT Score (cada uno 0-25, total 0-100)
    bant_budget INTEGER DEFAULT 0 CHECK (bant_budget BETWEEN 0 AND 25),
    bant_authority INTEGER DEFAULT 0 CHECK (bant_authority BETWEEN 0 AND 25),
    bant_need INTEGER DEFAULT 0 CHECK (bant_need BETWEEN 0 AND 25),
    bant_timeline INTEGER DEFAULT 0 CHECK (bant_timeline BETWEEN 0 AND 25),
    bant_notes JSONB DEFAULT '{}'::jsonb,          -- Notas por cada criterio BANT
    bant_last_updated TIMESTAMP WITH TIME ZONE,

    -- Behavioral Score (acumulado por actividades)
    behavioral_score INTEGER DEFAULT 0,

    -- Engagement metrics
    emails_sent INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    website_visits INTEGER DEFAULT 0,
    last_website_visit TIMESTAMP WITH TIME ZONE,
    meetings_scheduled INTEGER DEFAULT 0,
    meetings_attended INTEGER DEFAULT 0,
    meetings_no_show INTEGER DEFAULT 0,

    -- Interés en módulos
    interested_modules JSONB DEFAULT '[]'::jsonb,  -- Array de module_keys
    primary_interest VARCHAR(100),                 -- Módulo de mayor interés

    -- Timing
    expected_decision_date DATE,                   -- Cuándo planean decidir
    budget_available_date DATE,                    -- Cuándo tienen presupuesto
    contract_end_current_vendor DATE,              -- Cuándo termina contrato actual

    -- Competencia
    current_vendor VARCHAR(255),                   -- Software actual
    competitors_evaluating JSONB DEFAULT '[]'::jsonb, -- Otros vendors evaluando

    -- Disqualification
    is_disqualified BOOLEAN DEFAULT false,
    disqualification_reason disqualification_reason,
    disqualification_notes TEXT,
    disqualified_at TIMESTAMP WITH TIME ZONE,
    disqualified_by UUID,
    can_reactivate BOOLEAN DEFAULT true,           -- Si se puede reactivar en el futuro
    reactivate_after DATE,                         -- Fecha sugerida para recontacto

    -- Conversión
    converted_to_opportunity_at TIMESTAMP WITH TIME ZONE,
    opportunity_id UUID,                           -- Referencia a opportunity (si existe)
    converted_to_customer_at TIMESTAMP WITH TIME ZONE,
    customer_company_id INTEGER,                   -- Referencia a companies (si convirtió)

    -- Tracking de actividad
    first_activity_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    days_since_last_activity INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - COALESCE(last_activity_at, created_at)))
    ) STORED,

    -- Notas y seguimiento
    notes TEXT,
    next_action VARCHAR(255),
    next_action_date DATE,

    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    -- Constraints
    CONSTRAINT fk_assigned_vendor FOREIGN KEY (assigned_vendor_id)
        REFERENCES aponnt_staff(staff_id) ON DELETE SET NULL
);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_lifecycle ON sales_leads(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON sales_leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_score ON sales_leads(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_vendor ON sales_leads(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON sales_leads(contact_email);
CREATE INDEX IF NOT EXISTS idx_leads_company ON sales_leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_source ON sales_leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON sales_leads(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_leads_disqualified ON sales_leads(is_disqualified) WHERE is_disqualified = false;

-- ===========================================
-- 3. ACTIVIDADES DEL LEAD (para scoring)
-- ===========================================

CREATE TABLE IF NOT EXISTS sales_lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,

    -- Actividad
    activity_type lead_activity_type NOT NULL,
    activity_description VARCHAR(500),

    -- Scoring
    score_change INTEGER NOT NULL,                 -- Puede ser positivo o negativo
    score_before INTEGER,
    score_after INTEGER,

    -- Contexto
    related_email_id VARCHAR(255),                 -- ID de email si aplica
    related_meeting_id UUID,                       -- ID de reunión si aplica
    related_url VARCHAR(500),                      -- URL visitada si aplica
    ip_address INET,
    user_agent TEXT,

    -- Metadatos
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,                               -- NULL si es automático

    CONSTRAINT fk_lead FOREIGN KEY (lead_id)
        REFERENCES sales_leads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON sales_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON sales_lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_date ON sales_lead_activities(created_at);

-- ===========================================
-- 4. CONFIGURACIÓN DE SCORING
-- ===========================================

CREATE TABLE IF NOT EXISTS lead_scoring_config (
    id SERIAL PRIMARY KEY,

    activity_type lead_activity_type NOT NULL UNIQUE,
    score_value INTEGER NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto
INSERT INTO lead_scoring_config (activity_type, score_value, description) VALUES
    -- Actividades positivas
    ('email_opened', 2, 'Abrió un email de marketing/ventas'),
    ('email_clicked', 5, 'Hizo click en un link del email'),
    ('website_visit', 3, 'Visitó el website'),
    ('page_view_pricing', 10, 'Vio página de precios - alta intención'),
    ('page_view_demo', 8, 'Vio página de demo'),
    ('resource_download', 10, 'Descargó un recurso (PDF, guía, etc)'),
    ('webinar_registered', 15, 'Se registró a un webinar'),
    ('webinar_attended', 25, 'Asistió al webinar'),
    ('demo_requested', 30, 'Solicitó una demo'),
    ('demo_attended', 40, 'Asistió a la demo'),
    ('survey_completed', 20, 'Completó encuesta de interés'),
    ('meeting_scheduled', 35, 'Agendó reunión con ventas'),
    ('meeting_attended', 50, 'Asistió a la reunión'),
    ('quote_requested', 60, 'Solicitó presupuesto'),
    ('trial_started', 40, 'Inició período de prueba'),
    ('referred_someone', 30, 'Refirió a otra empresa'),

    -- Actividades negativas
    ('email_bounced', -20, 'Email rebotó - dato incorrecto'),
    ('email_unsubscribed', -50, 'Se desuscribió de emails'),
    ('meeting_no_show', -30, 'No asistió a reunión agendada'),
    ('negative_feedback', -15, 'Dio feedback negativo'),
    ('complaint', -25, 'Presentó queja'),

    -- Decay por inactividad
    ('inactivity_30_days', -10, '30 días sin interacción'),
    ('inactivity_60_days', -20, '60 días sin interacción'),
    ('inactivity_90_days', -30, '90 días sin interacción - mover a Cold')
ON CONFLICT (activity_type) DO NOTHING;

-- ===========================================
-- 5. REGLAS DE CALIFICACIÓN MQL/SQL
-- ===========================================

CREATE TABLE IF NOT EXISTS lead_qualification_rules (
    id SERIAL PRIMARY KEY,

    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(20) NOT NULL,               -- 'mql', 'sql', 'hot', 'warm', 'cold'

    -- Criterios (todos deben cumplirse)
    min_score INTEGER,
    min_bant_total INTEGER,                        -- Suma de los 4 BANT
    min_bant_individual INTEGER,                   -- Mínimo en cada BANT
    required_activities JSONB,                     -- ["demo_requested", "meeting_attended"]
    min_engagement_days INTEGER,                   -- Días desde primera actividad
    must_have_decision_maker BOOLEAN DEFAULT false,
    must_have_budget_date BOOLEAN DEFAULT false,
    must_have_timeline BOOLEAN DEFAULT false,

    -- Acción
    auto_transition BOOLEAN DEFAULT false,        -- Si aplica automáticamente
    notification_required BOOLEAN DEFAULT true,

    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,                    -- Mayor prioridad = evalúa primero

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reglas por defecto
INSERT INTO lead_qualification_rules (rule_name, rule_type, min_score, min_bant_total, required_activities, auto_transition, priority) VALUES
    ('MQL Básico', 'mql', 30, NULL, NULL, true, 10),
    ('MQL con Demo', 'mql', 20, NULL, '["demo_requested"]', true, 20),
    ('SQL Calificado', 'sql', 60, 50, '["meeting_attended"]', false, 30),
    ('SQL Urgente', 'sql', 50, 60, '["quote_requested"]', false, 40),
    ('Hot Lead', 'hot', 80, 70, NULL, true, 50),
    ('Warm Lead', 'warm', 40, NULL, NULL, true, 5),
    ('Cold Lead', 'cold', 0, NULL, NULL, true, 1)
ON CONFLICT DO NOTHING;

-- ===========================================
-- 6. FUNCIONES DE SCORING Y LIFECYCLE
-- ===========================================

-- Función: Registrar actividad y actualizar score
CREATE OR REPLACE FUNCTION record_lead_activity(
    p_lead_id UUID,
    p_activity_type lead_activity_type,
    p_description VARCHAR(500) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_created_by UUID DEFAULT NULL
) RETURNS TABLE(new_score INTEGER, new_temperature lead_temperature) AS $$
DECLARE
    v_score_change INTEGER;
    v_current_score INTEGER;
    v_new_score INTEGER;
    v_new_temp lead_temperature;
BEGIN
    -- Obtener valor de score para esta actividad
    SELECT score_value INTO v_score_change
    FROM lead_scoring_config
    WHERE activity_type = p_activity_type AND is_active = true;

    IF v_score_change IS NULL THEN
        v_score_change := 0;
    END IF;

    -- Obtener score actual
    SELECT total_score INTO v_current_score FROM sales_leads WHERE id = p_lead_id;

    -- Calcular nuevo score (mínimo 0)
    v_new_score := GREATEST(0, COALESCE(v_current_score, 0) + v_score_change);

    -- Insertar actividad
    INSERT INTO sales_lead_activities (
        lead_id, activity_type, activity_description, score_change,
        score_before, score_after, metadata, created_by
    ) VALUES (
        p_lead_id, p_activity_type, p_description, v_score_change,
        v_current_score, v_new_score, p_metadata, p_created_by
    );

    -- Determinar nueva temperatura
    v_new_temp := CASE
        WHEN v_new_score >= 80 THEN 'hot'::lead_temperature
        WHEN v_new_score >= 40 THEN 'warm'::lead_temperature
        WHEN v_new_score > 0 THEN 'cold'::lead_temperature
        ELSE 'dead'::lead_temperature
    END;

    -- Actualizar lead
    UPDATE sales_leads SET
        total_score = v_new_score,
        behavioral_score = behavioral_score + v_score_change,
        temperature = v_new_temp,
        temperature_changed_at = CASE
            WHEN temperature != v_new_temp THEN CURRENT_TIMESTAMP
            ELSE temperature_changed_at
        END,
        last_activity_at = CURRENT_TIMESTAMP,
        first_activity_at = COALESCE(first_activity_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP,
        -- Actualizar contadores específicos
        emails_opened = emails_opened + CASE WHEN p_activity_type = 'email_opened' THEN 1 ELSE 0 END,
        emails_clicked = emails_clicked + CASE WHEN p_activity_type = 'email_clicked' THEN 1 ELSE 0 END,
        website_visits = website_visits + CASE WHEN p_activity_type = 'website_visit' THEN 1 ELSE 0 END,
        meetings_scheduled = meetings_scheduled + CASE WHEN p_activity_type = 'meeting_scheduled' THEN 1 ELSE 0 END,
        meetings_attended = meetings_attended + CASE WHEN p_activity_type = 'meeting_attended' THEN 1 ELSE 0 END,
        meetings_no_show = meetings_no_show + CASE WHEN p_activity_type = 'meeting_no_show' THEN 1 ELSE 0 END
    WHERE id = p_lead_id;

    RETURN QUERY SELECT v_new_score, v_new_temp;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar BANT score
CREATE OR REPLACE FUNCTION update_lead_bant(
    p_lead_id UUID,
    p_budget INTEGER DEFAULT NULL,
    p_authority INTEGER DEFAULT NULL,
    p_need INTEGER DEFAULT NULL,
    p_timeline INTEGER DEFAULT NULL,
    p_notes JSONB DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
    v_new_temp lead_temperature;
BEGIN
    UPDATE sales_leads SET
        bant_budget = COALESCE(p_budget, bant_budget),
        bant_authority = COALESCE(p_authority, bant_authority),
        bant_need = COALESCE(p_need, bant_need),
        bant_timeline = COALESCE(p_timeline, bant_timeline),
        bant_notes = COALESCE(p_notes, bant_notes),
        bant_last_updated = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_lead_id;

    -- Recalcular total score (BANT + behavioral)
    SELECT
        bant_budget + bant_authority + bant_need + bant_timeline + behavioral_score,
        CASE
            WHEN bant_budget + bant_authority + bant_need + bant_timeline + behavioral_score >= 80 THEN 'hot'
            WHEN bant_budget + bant_authority + bant_need + bant_timeline + behavioral_score >= 40 THEN 'warm'
            WHEN bant_budget + bant_authority + bant_need + bant_timeline + behavioral_score > 0 THEN 'cold'
            ELSE 'dead'
        END::lead_temperature
    INTO v_total, v_new_temp
    FROM sales_leads WHERE id = p_lead_id;

    UPDATE sales_leads SET
        total_score = v_total,
        temperature = v_new_temp,
        temperature_changed_at = CASE
            WHEN temperature != v_new_temp THEN CURRENT_TIMESTAMP
            ELSE temperature_changed_at
        END
    WHERE id = p_lead_id;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Función: Cambiar lifecycle stage
CREATE OR REPLACE FUNCTION change_lead_lifecycle(
    p_lead_id UUID,
    p_new_stage lead_lifecycle_stage,
    p_reason VARCHAR(255) DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_stage lead_lifecycle_stage;
    v_history JSONB;
BEGIN
    SELECT lifecycle_stage, lifecycle_history INTO v_current_stage, v_history
    FROM sales_leads WHERE id = p_lead_id;

    IF v_current_stage = p_new_stage THEN
        RETURN FALSE;
    END IF;

    -- Agregar al historial
    v_history := v_history || jsonb_build_object(
        'from_stage', v_current_stage,
        'to_stage', p_new_stage,
        'changed_at', CURRENT_TIMESTAMP,
        'changed_by', p_changed_by,
        'reason', p_reason
    );

    UPDATE sales_leads SET
        lifecycle_stage = p_new_stage,
        lifecycle_changed_at = CURRENT_TIMESTAMP,
        lifecycle_history = v_history,
        updated_at = CURRENT_TIMESTAMP,
        -- Si es disqualified, marcar
        is_disqualified = (p_new_stage = 'disqualified'),
        disqualified_at = CASE WHEN p_new_stage = 'disqualified' THEN CURRENT_TIMESTAMP ELSE NULL END,
        disqualified_by = CASE WHEN p_new_stage = 'disqualified' THEN p_changed_by ELSE NULL END,
        -- Si convierte a opportunity
        converted_to_opportunity_at = CASE WHEN p_new_stage = 'opportunity' THEN CURRENT_TIMESTAMP ELSE converted_to_opportunity_at END,
        -- Si convierte a customer
        converted_to_customer_at = CASE WHEN p_new_stage = 'customer' THEN CURRENT_TIMESTAMP ELSE converted_to_customer_at END
    WHERE id = p_lead_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función: Descalificar lead
CREATE OR REPLACE FUNCTION disqualify_lead(
    p_lead_id UUID,
    p_reason disqualification_reason,
    p_notes TEXT DEFAULT NULL,
    p_can_reactivate BOOLEAN DEFAULT true,
    p_reactivate_after DATE DEFAULT NULL,
    p_disqualified_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE sales_leads SET
        lifecycle_stage = 'disqualified',
        lifecycle_changed_at = CURRENT_TIMESTAMP,
        is_disqualified = true,
        disqualification_reason = p_reason,
        disqualification_notes = p_notes,
        disqualified_at = CURRENT_TIMESTAMP,
        disqualified_by = p_disqualified_by,
        can_reactivate = p_can_reactivate,
        reactivate_after = p_reactivate_after,
        temperature = 'dead',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_lead_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Función: Aplicar decay por inactividad (ejecutar diariamente)
CREATE OR REPLACE FUNCTION apply_lead_inactivity_decay() RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Leads con 30+ días de inactividad (que no hayan recibido este decay ya)
    WITH inactive_30 AS (
        SELECT id FROM sales_leads
        WHERE days_since_last_activity >= 30
        AND days_since_last_activity < 60
        AND is_disqualified = false
        AND NOT EXISTS (
            SELECT 1 FROM sales_lead_activities
            WHERE lead_id = sales_leads.id
            AND activity_type = 'inactivity_30_days'
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '35 days'
        )
    )
    INSERT INTO sales_lead_activities (lead_id, activity_type, score_change, activity_description)
    SELECT id, 'inactivity_30_days', -10, 'Decay automático: 30 días sin actividad'
    FROM inactive_30;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Leads con 60+ días de inactividad
    WITH inactive_60 AS (
        SELECT id FROM sales_leads
        WHERE days_since_last_activity >= 60
        AND days_since_last_activity < 90
        AND is_disqualified = false
        AND NOT EXISTS (
            SELECT 1 FROM sales_lead_activities
            WHERE lead_id = sales_leads.id
            AND activity_type = 'inactivity_60_days'
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '65 days'
        )
    )
    INSERT INTO sales_lead_activities (lead_id, activity_type, score_change, activity_description)
    SELECT id, 'inactivity_60_days', -20, 'Decay automático: 60 días sin actividad'
    FROM inactive_60;

    -- Leads con 90+ días de inactividad (mover a Cold/Dead)
    WITH inactive_90 AS (
        SELECT id FROM sales_leads
        WHERE days_since_last_activity >= 90
        AND is_disqualified = false
        AND NOT EXISTS (
            SELECT 1 FROM sales_lead_activities
            WHERE lead_id = sales_leads.id
            AND activity_type = 'inactivity_90_days'
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '95 days'
        )
    )
    INSERT INTO sales_lead_activities (lead_id, activity_type, score_change, activity_description)
    SELECT id, 'inactivity_90_days', -30, 'Decay automático: 90 días sin actividad - requiere revisión'
    FROM inactive_90;

    -- Actualizar scores
    UPDATE sales_leads SET
        behavioral_score = GREATEST(0, behavioral_score + COALESCE((
            SELECT SUM(score_change) FROM sales_lead_activities
            WHERE lead_id = sales_leads.id
            AND activity_type IN ('inactivity_30_days', 'inactivity_60_days', 'inactivity_90_days')
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
        ), 0)),
        total_score = GREATEST(0, total_score + COALESCE((
            SELECT SUM(score_change) FROM sales_lead_activities
            WHERE lead_id = sales_leads.id
            AND activity_type IN ('inactivity_30_days', 'inactivity_60_days', 'inactivity_90_days')
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
        ), 0))
    WHERE days_since_last_activity >= 30
    AND is_disqualified = false;

    -- Actualizar temperaturas
    UPDATE sales_leads SET
        temperature = CASE
            WHEN total_score >= 80 THEN 'hot'
            WHEN total_score >= 40 THEN 'warm'
            WHEN total_score > 0 THEN 'cold'
            ELSE 'dead'
        END::lead_temperature
    WHERE is_disqualified = false;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 7. VISTAS ÚTILES
-- ===========================================

-- Vista: Leads activos con métricas
CREATE OR REPLACE VIEW v_active_leads AS
SELECT
    l.*,
    l.bant_budget + l.bant_authority + l.bant_need + l.bant_timeline AS bant_total,
    CASE
        WHEN l.bant_budget >= 15 AND l.bant_authority >= 15 AND l.bant_need >= 15 THEN true
        ELSE false
    END AS bant_qualified,
    s.full_name AS vendor_name,
    s.email AS vendor_email,
    (SELECT COUNT(*) FROM sales_lead_activities WHERE lead_id = l.id) AS total_activities,
    (SELECT MAX(created_at) FROM sales_lead_activities WHERE lead_id = l.id) AS last_activity_date
FROM sales_leads l
LEFT JOIN aponnt_staff s ON l.assigned_vendor_id = s.staff_id
WHERE l.is_disqualified = false;

-- Vista: Pipeline por etapa
CREATE OR REPLACE VIEW v_lead_pipeline AS
SELECT
    lifecycle_stage,
    temperature,
    COUNT(*) AS lead_count,
    AVG(total_score)::INTEGER AS avg_score,
    AVG(bant_budget + bant_authority + bant_need + bant_timeline)::INTEGER AS avg_bant,
    COUNT(*) FILTER (WHERE temperature = 'hot') AS hot_count,
    COUNT(*) FILTER (WHERE temperature = 'warm') AS warm_count,
    COUNT(*) FILTER (WHERE temperature = 'cold') AS cold_count
FROM sales_leads
WHERE is_disqualified = false
GROUP BY lifecycle_stage, temperature
ORDER BY
    CASE lifecycle_stage
        WHEN 'subscriber' THEN 1
        WHEN 'lead' THEN 2
        WHEN 'mql' THEN 3
        WHEN 'sal' THEN 4
        WHEN 'sql' THEN 5
        WHEN 'opportunity' THEN 6
        WHEN 'customer' THEN 7
        ELSE 10
    END;

-- Vista: Leads por vendedor
CREATE OR REPLACE VIEW v_leads_by_vendor AS
SELECT
    s.staff_id,
    s.full_name AS vendor_name,
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE l.lifecycle_stage = 'mql') AS mql_count,
    COUNT(*) FILTER (WHERE l.lifecycle_stage = 'sql') AS sql_count,
    COUNT(*) FILTER (WHERE l.lifecycle_stage = 'opportunity') AS opportunity_count,
    COUNT(*) FILTER (WHERE l.lifecycle_stage = 'customer') AS customer_count,
    COUNT(*) FILTER (WHERE l.temperature = 'hot') AS hot_leads,
    AVG(l.total_score)::INTEGER AS avg_score
FROM sales_leads l
JOIN aponnt_staff s ON l.assigned_vendor_id = s.staff_id
WHERE l.is_disqualified = false
GROUP BY s.staff_id, s.full_name;

-- Vista: Leads para recontacto (inactivos que se pueden reactivar)
CREATE OR REPLACE VIEW v_leads_to_reactivate AS
SELECT *
FROM sales_leads
WHERE is_disqualified = true
AND can_reactivate = true
AND (reactivate_after IS NULL OR reactivate_after <= CURRENT_DATE);

-- ===========================================
-- 8. TRIGGERS
-- ===========================================

-- Trigger: Actualizar updated_at
CREATE OR REPLACE FUNCTION update_lead_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_updated ON sales_leads;
CREATE TRIGGER trg_lead_updated
    BEFORE UPDATE ON sales_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_timestamp();

-- ===========================================
-- 9. COMENTARIOS
-- ===========================================

COMMENT ON TABLE sales_leads IS 'Leads del sistema de ventas con scoring y lifecycle management';
COMMENT ON TABLE sales_lead_activities IS 'Actividades de los leads para calcular scoring behavioral';
COMMENT ON TABLE lead_scoring_config IS 'Configuración de puntos por tipo de actividad';
COMMENT ON TABLE lead_qualification_rules IS 'Reglas para calificar leads como MQL/SQL';

COMMENT ON COLUMN sales_leads.lifecycle_stage IS 'Etapa actual: subscriber→lead→mql→sal→sql→opportunity→customer';
COMMENT ON COLUMN sales_leads.temperature IS 'Temperatura: hot(80+), warm(40-79), cold(1-39), dead(0)';
COMMENT ON COLUMN sales_leads.total_score IS 'Score total = BANT (0-100) + Behavioral';
COMMENT ON COLUMN sales_leads.bant_budget IS 'Budget score 0-25: ¿Tiene presupuesto?';
COMMENT ON COLUMN sales_leads.bant_authority IS 'Authority score 0-25: ¿Es decisor?';
COMMENT ON COLUMN sales_leads.bant_need IS 'Need score 0-25: ¿Tiene el problema que resolvemos?';
COMMENT ON COLUMN sales_leads.bant_timeline IS 'Timeline score 0-25: ¿Cuándo quiere comprar?';

-- ===========================================
-- FIN DE MIGRACIÓN
-- ===========================================
