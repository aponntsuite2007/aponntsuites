-- ============================================================================
-- SALES ORCHESTRATION BRAIN - Complete Database Schema
-- Sistema de orquestación inteligente de ventas
-- ============================================================================
-- Fecha: 2025-12-17
-- Descripción: Tablas para gestión completa del ciclo de ventas:
--   - Agenda de reuniones
--   - Asistentes y contactos
--   - Encuestas de interés por módulo
--   - Generación de pitch personalizado
--   - Feedback post-reunión
--   - Satisfacción del cliente
-- ============================================================================

-- ===========================================
-- 1. TIPOS ENUMERADOS
-- ===========================================

-- Tipo de empresa/industria
DO $$ BEGIN
    CREATE TYPE industry_type AS ENUM (
        'industria',
        'gobierno',
        'universidad',
        'salud',
        'retail',
        'servicios',
        'tecnologia',
        'finanzas',
        'construccion',
        'logistica',
        'educacion',
        'ong',
        'otro'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estado de la reunión
DO $$ BEGIN
    CREATE TYPE meeting_status AS ENUM (
        'draft',           -- Borrador, aún no confirmada
        'scheduled',       -- Agendada, pendiente de envío de encuesta
        'survey_sent',     -- Encuesta enviada a participantes
        'survey_completed', -- Todas las respuestas recibidas
        'pitch_ready',     -- Pitch generado, listo para reunión
        'reminder_sent',   -- Recordatorio enviado (24h antes)
        'in_progress',     -- Reunión en curso
        'completed',       -- Reunión finalizada
        'feedback_pending', -- Esperando feedback del vendedor
        'closed',          -- Ciclo completo cerrado
        'cancelled',       -- Cancelada
        'rescheduled'      -- Reprogramada
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Nivel de interés en módulo
DO $$ BEGIN
    CREATE TYPE interest_level AS ENUM (
        'none',        -- No interesa
        'low',         -- Poco interés
        'medium',      -- Interés moderado
        'high',        -- Muy interesado
        'critical'     -- Necesidad urgente
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de enfoque deseado
DO $$ BEGIN
    CREATE TYPE meeting_focus AS ENUM (
        'technical',    -- Enfoque técnico (IT, desarrolladores)
        'business',     -- Enfoque negocio (gerentes, directores)
        'strategic',    -- Enfoque estratégico (C-level)
        'operational',  -- Enfoque operativo (usuarios finales)
        'mixed'         -- Mixto
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 2. TABLA PRINCIPAL: REUNIONES DE VENTA
-- ===========================================

CREATE TABLE IF NOT EXISTS sales_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos del prospecto/empresa
    prospect_company_name VARCHAR(255) NOT NULL,
    prospect_company_type industry_type DEFAULT 'otro',
    prospect_country VARCHAR(100) DEFAULT 'Argentina',
    prospect_province VARCHAR(100),
    prospect_city VARCHAR(100),
    prospect_employee_count INTEGER,  -- Cantidad aproximada de empleados
    prospect_phone VARCHAR(50),
    prospect_email VARCHAR(255),
    prospect_website VARCHAR(255),
    prospect_notes TEXT,              -- Notas adicionales del prospecto

    -- Datos de la reunión
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    meeting_timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
    meeting_duration_minutes INTEGER DEFAULT 60,  -- Tiempo disponible del cliente
    meeting_location VARCHAR(255),                -- Lugar o "Virtual"
    meeting_platform VARCHAR(100),                -- Zoom, Meet, Teams, Presencial
    meeting_link VARCHAR(500),                    -- Link si es virtual

    -- Asignación
    assigned_vendor_id UUID NOT NULL,             -- Staff de APONNT asignado
    created_by_id UUID NOT NULL,                  -- Quien creó la reunión
    supervisor_id UUID,                           -- Supervisor inmediato (auto-detectado)

    -- Estado y control
    status meeting_status DEFAULT 'draft',

    -- Configuración de notificaciones
    send_reminder_24h BOOLEAN DEFAULT true,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,

    -- Encuesta
    survey_token UUID DEFAULT gen_random_uuid(),  -- Token único para acceder a encuesta
    survey_sent_at TIMESTAMP WITH TIME ZONE,
    survey_deadline TIMESTAMP WITH TIME ZONE,     -- Fecha límite para responder

    -- Pitch generado
    pitch_generated_at TIMESTAMP WITH TIME ZONE,
    pitch_data JSONB,                             -- Datos del pitch generado por Brain
    vendor_pitch_data JSONB,                      -- Pitch consolidado para vendedor

    -- Ejecución de reunión
    meeting_started_at TIMESTAMP WITH TIME ZONE,
    meeting_ended_at TIMESTAMP WITH TIME ZONE,
    welcome_message_sent_at TIMESTAMP WITH TIME ZONE,

    -- Post-reunión
    feedback_submitted_at TIMESTAMP WITH TIME ZONE,
    feedback_data JSONB,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_type VARCHAR(50),                   -- 'marketing', 'new_meeting', 'quote', etc.
    quote_requested BOOLEAN DEFAULT false,
    quote_modules JSONB,                          -- Módulos para presupuesto

    -- Satisfacción cliente
    satisfaction_sent_at TIMESTAMP WITH TIME ZONE,
    satisfaction_data JSONB,

    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_assigned_vendor FOREIGN KEY (assigned_vendor_id)
        REFERENCES aponnt_staff(staff_id) ON DELETE RESTRICT,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by_id)
        REFERENCES aponnt_staff(staff_id) ON DELETE RESTRICT
);

-- Índices para reuniones
CREATE INDEX IF NOT EXISTS idx_sales_meetings_status ON sales_meetings(status);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_vendor ON sales_meetings(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_date ON sales_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_survey_token ON sales_meetings(survey_token);

-- ===========================================
-- 3. ASISTENTES A LA REUNIÓN
-- ===========================================

CREATE TABLE IF NOT EXISTS sales_meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL,

    -- Datos del asistente
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    job_title VARCHAR(150),           -- Cargo en la empresa
    department VARCHAR(100),          -- Área/departamento
    is_decision_maker BOOLEAN DEFAULT false,  -- ¿Es quien decide?

    -- Preferencias (de la encuesta)
    preferred_focus meeting_focus DEFAULT 'mixed',
    wants_reminder BOOLEAN DEFAULT true,

    -- Estado de encuesta
    survey_token UUID DEFAULT gen_random_uuid(),  -- Token individual
    survey_sent_at TIMESTAMP WITH TIME ZONE,
    survey_opened_at TIMESTAMP WITH TIME ZONE,
    survey_completed_at TIMESTAMP WITH TIME ZONE,

    -- Pitch personalizado para este asistente
    personal_pitch_data JSONB,

    -- Post-reunión
    satisfaction_sent_at TIMESTAMP WITH TIME ZONE,
    satisfaction_completed_at TIMESTAMP WITH TIME ZONE,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    satisfaction_feedback TEXT,
    vendor_rating INTEGER CHECK (vendor_rating BETWEEN 1 AND 5),
    has_questions BOOLEAN DEFAULT false,
    needs_followup BOOLEAN DEFAULT false,
    followup_notes TEXT,

    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id)
        REFERENCES sales_meetings(id) ON DELETE CASCADE
);

-- Índices para asistentes
CREATE INDEX IF NOT EXISTS idx_attendees_meeting ON sales_meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON sales_meeting_attendees(email);
CREATE INDEX IF NOT EXISTS idx_attendees_survey_token ON sales_meeting_attendees(survey_token);

-- ===========================================
-- 4. INTERÉS EN MÓDULOS (por asistente)
-- ===========================================

CREATE TABLE IF NOT EXISTS sales_meeting_module_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL,
    attendee_id UUID NOT NULL,

    -- Módulo
    module_key VARCHAR(100) NOT NULL,   -- Key del módulo en el registry
    module_name VARCHAR(255),           -- Nombre friendly (cache)

    -- Interés
    interest_level interest_level DEFAULT 'none',
    priority_order INTEGER,             -- Orden de prioridad dado por el cliente
    notes TEXT,                         -- Notas del cliente sobre este módulo

    -- Para el pitch
    include_in_pitch BOOLEAN DEFAULT true,
    pitch_depth VARCHAR(20) DEFAULT 'standard',  -- 'brief', 'standard', 'detailed'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mi_meeting FOREIGN KEY (meeting_id)
        REFERENCES sales_meetings(id) ON DELETE CASCADE,
    CONSTRAINT fk_mi_attendee FOREIGN KEY (attendee_id)
        REFERENCES sales_meeting_attendees(id) ON DELETE CASCADE,
    CONSTRAINT uq_attendee_module UNIQUE (attendee_id, module_key)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_module_interests_meeting ON sales_meeting_module_interests(meeting_id);
CREATE INDEX IF NOT EXISTS idx_module_interests_attendee ON sales_meeting_module_interests(attendee_id);
CREATE INDEX IF NOT EXISTS idx_module_interests_module ON sales_meeting_module_interests(module_key);

-- ===========================================
-- 5. HISTORIAL DE COMUNICACIONES
-- ===========================================

CREATE TABLE IF NOT EXISTS sales_meeting_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL,
    attendee_id UUID,                   -- NULL si es comunicación general

    -- Tipo de comunicación
    comm_type VARCHAR(50) NOT NULL,     -- 'survey_invite', 'reminder', 'welcome', 'thankyou', 'satisfaction'
    channel VARCHAR(20) NOT NULL,       -- 'email', 'whatsapp', 'sms'

    -- Contenido
    subject VARCHAR(500),
    body TEXT,
    template_used VARCHAR(100),

    -- Estado
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced BOOLEAN DEFAULT false,
    bounce_reason VARCHAR(255),

    -- Metadatos
    external_id VARCHAR(255),           -- ID del proveedor de email
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comm_meeting FOREIGN KEY (meeting_id)
        REFERENCES sales_meetings(id) ON DELETE CASCADE,
    CONSTRAINT fk_comm_attendee FOREIGN KEY (attendee_id)
        REFERENCES sales_meeting_attendees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_communications_meeting ON sales_meeting_communications(meeting_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON sales_meeting_communications(comm_type);

-- ===========================================
-- 6. MÓDULOS DEL SISTEMA (para encuesta)
-- Descripción breve de cada módulo para mostrar a prospectos
-- ===========================================

CREATE TABLE IF NOT EXISTS sales_module_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key VARCHAR(100) UNIQUE NOT NULL,

    -- Descripciones para venta
    short_description VARCHAR(100) NOT NULL,     -- 5-6 palabras máximo
    sales_pitch TEXT,                            -- Descripción comercial más larga
    key_benefits JSONB,                          -- Array de beneficios clave

    -- Visual
    icon VARCHAR(50),
    color VARCHAR(20),
    screenshot_url VARCHAR(500),                 -- URL de miniatura del módulo
    demo_video_url VARCHAR(500),

    -- Categorización para venta
    target_audience JSONB,                       -- ['rrhh', 'it', 'gerencia', etc.]
    industry_relevance JSONB,                    -- Relevancia por industria
    company_size_min INTEGER,                    -- Tamaño mínimo recomendado
    company_size_max INTEGER,                    -- Tamaño máximo recomendado

    -- Pricing info (para presupuestos)
    base_price DECIMAL(10,2),
    price_per_user DECIMAL(10,2),
    is_addon BOOLEAN DEFAULT false,
    requires_modules JSONB,                      -- Módulos prerequisito

    -- Control
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 100,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 7. TEMPLATES DE PITCH
-- ===========================================

CREATE TABLE IF NOT EXISTS sales_pitch_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(255) NOT NULL,

    -- Contenido
    template_type VARCHAR(50) NOT NULL,          -- 'module_card', 'intro', 'closing', 'dependency_graph'
    html_template TEXT,
    css_styles TEXT,

    -- Para diferentes audiencias
    target_focus meeting_focus,

    -- Control
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 8. VISTAS Y FUNCIONES ÚTILES
-- ===========================================

-- Vista: Reuniones con resumen de asistentes
CREATE OR REPLACE VIEW v_sales_meetings_summary AS
SELECT
    m.*,
    CONCAT(v.first_name, ' ', v.last_name) as vendor_name,
    v.email as vendor_email,
    COUNT(DISTINCT a.id) as attendee_count,
    COUNT(DISTINCT CASE WHEN a.survey_completed_at IS NOT NULL THEN a.id END) as surveys_completed,
    ARRAY_AGG(DISTINCT mi.module_key) FILTER (WHERE mi.interest_level IN ('high', 'critical')) as high_interest_modules
FROM sales_meetings m
LEFT JOIN aponnt_staff v ON m.assigned_vendor_id = v.staff_id
LEFT JOIN sales_meeting_attendees a ON m.id = a.meeting_id
LEFT JOIN sales_meeting_module_interests mi ON a.id = mi.attendee_id
GROUP BY m.id, v.first_name, v.last_name, v.email;

-- Función: Obtener módulos de interés consolidados para una reunión
CREATE OR REPLACE FUNCTION get_meeting_consolidated_interests(p_meeting_id UUID)
RETURNS TABLE (
    module_key VARCHAR,
    module_name VARCHAR,
    interested_attendees TEXT[],
    max_interest_level interest_level,
    total_interested INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mi.module_key,
        mi.module_name,
        ARRAY_AGG(a.full_name ORDER BY mi.interest_level DESC) as interested_attendees,
        MAX(mi.interest_level) as max_interest_level,
        COUNT(*)::INTEGER as total_interested
    FROM sales_meeting_module_interests mi
    JOIN sales_meeting_attendees a ON mi.attendee_id = a.id
    WHERE mi.meeting_id = p_meeting_id
      AND mi.interest_level IN ('medium', 'high', 'critical')
    GROUP BY mi.module_key, mi.module_name
    ORDER BY
        CASE MAX(mi.interest_level)
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
        END,
        COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Función: Verificar si todas las encuestas están completas
CREATE OR REPLACE FUNCTION check_meeting_surveys_complete(p_meeting_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
BEGIN
    SELECT
        COUNT(*),
        COUNT(CASE WHEN survey_completed_at IS NOT NULL THEN 1 END)
    INTO v_total, v_completed
    FROM sales_meeting_attendees
    WHERE meeting_id = p_meeting_id;

    RETURN v_total > 0 AND v_total = v_completed;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Actualizar estado cuando todas las encuestas están completas
CREATE OR REPLACE FUNCTION trg_check_survey_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.survey_completed_at IS NOT NULL AND OLD.survey_completed_at IS NULL THEN
        IF check_meeting_surveys_complete(NEW.meeting_id) THEN
            UPDATE sales_meetings
            SET status = 'survey_completed', updated_at = NOW()
            WHERE id = NEW.meeting_id AND status = 'survey_sent';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendee_survey_complete ON sales_meeting_attendees;
CREATE TRIGGER trg_attendee_survey_complete
    AFTER UPDATE ON sales_meeting_attendees
    FOR EACH ROW
    EXECUTE FUNCTION trg_check_survey_completion();

-- ===========================================
-- 9. DATOS INICIALES: Descripciones de módulos para venta
-- ===========================================

INSERT INTO sales_module_descriptions (module_key, short_description, sales_pitch, icon, color, display_order, target_audience, key_benefits) VALUES
-- Core
('auth', 'Acceso seguro con múltiples roles', 'Sistema de autenticación empresarial con SSO, 2FA y gestión granular de permisos', 'fa-shield-alt', '#f59e0b', 1, '["it", "gerencia"]', '["Seguridad enterprise", "Single Sign-On", "Auditoría completa"]'),

('users', 'Gestión completa de empleados', 'Administración centralizada de usuarios, perfiles, roles y permisos con historial completo', 'fa-users', '#3b82f6', 2, '["rrhh", "gerencia"]', '["Perfiles 360°", "Historial laboral", "Documentación digital"]'),

('attendance', 'Control biométrico de asistencia', 'Registro de entrada/salida con huella, facial o PIN. Reportes automáticos y alertas', 'fa-fingerprint', '#22c55e', 3, '["rrhh", "operaciones"]', '["Múltiples biométricos", "Alertas automáticas", "Reportes en tiempo real"]'),

('shifts', 'Planificación inteligente de turnos', 'Creación y asignación de turnos rotativos, fijos o flexibles con detección de conflictos', 'fa-calendar-alt', '#8b5cf6', 4, '["rrhh", "operaciones"]', '["Turnos rotativos", "Detección de conflictos", "Plantillas reutilizables"]'),

('departments', 'Organigrama y estructura empresarial', 'Gestión de departamentos, jerarquías y centros de costo con visualización interactiva', 'fa-sitemap', '#ec4899', 5, '["rrhh", "gerencia"]', '["Organigrama visual", "Centros de costo", "Múltiples sucursales"]'),

-- RRHH
('vacations', 'Solicitudes y aprobaciones de vacaciones', 'Flujo completo de solicitud, aprobación y calendario de vacaciones con saldos automáticos', 'fa-umbrella-beach', '#06b6d4', 10, '["rrhh", "empleados"]', '["Flujo de aprobación", "Calendario visual", "Saldos automáticos"]'),

('medical-leave', 'Gestión de licencias médicas', 'Registro de licencias con adjuntos, seguimiento médico y alertas de vencimiento', 'fa-notes-medical', '#ef4444', 11, '["rrhh", "salud"]', '["Adjuntos digitales", "Seguimiento médico", "Alertas automáticas"]'),

('overtime', 'Control de horas extra autorizadas', 'Solicitud, aprobación y liquidación de horas extra con integración a nómina', 'fa-clock', '#f97316', 12, '["rrhh", "finanzas"]', '["Pre-autorización", "Cálculo automático", "Integración nómina"]'),

('sanctions', 'Gestión de sanciones y workflow', 'Proceso completo de sanciones con workflow de aprobación y registro histórico', 'fa-gavel', '#dc2626', 13, '["rrhh", "legal"]', '["Workflow configurable", "Historial completo", "Notificaciones"]'),

('payroll', 'Liquidación de sueldos integrada', 'Cálculo automático de haberes con conceptos configurables e integración contable', 'fa-money-bill-wave', '#16a34a', 14, '["rrhh", "finanzas"]', '["Cálculo automático", "Conceptos flexibles", "Exportación contable"]'),

-- Operaciones
('kiosks', 'Terminales biométricas de fichaje', 'Configuración y monitoreo de dispositivos de registro con alertas de conectividad', 'fa-tablet-alt', '#6366f1', 20, '["it", "operaciones"]', '["Multi-dispositivo", "Monitoreo 24/7", "Modo offline"]'),

('reports', 'Reportes y analytics avanzados', 'Generación de reportes personalizados con gráficos interactivos y exportación múltiple', 'fa-chart-bar', '#0ea5e9', 21, '["gerencia", "rrhh"]', '["Dashboards en vivo", "Exportación Excel/PDF", "Programación automática"]'),

('notifications', 'Sistema de alertas inteligentes', 'Notificaciones por email, push y SMS con reglas configurables y escalamiento', 'fa-bell', '#eab308', 22, '["todos"]', '["Multi-canal", "Reglas flexibles", "Escalamiento automático"]'),

-- Bienestar
('employee-360', 'Vista integral del empleado', 'Dashboard personal con métricas, objetivos, feedback y desarrollo profesional', 'fa-user-circle', '#8b5cf6', 30, '["rrhh", "empleados"]', '["Métricas personales", "Objetivos OKR", "Feedback continuo"]'),

('wellness', 'Programas de bienestar laboral', 'Gestión de programas de salud, encuestas de clima y métricas de bienestar', 'fa-heart', '#ec4899', 31, '["rrhh", "salud"]', '["Encuestas de clima", "Programas de salud", "Métricas de bienestar"]'),

-- Avanzado
('ai-assistant', 'Asistente IA contextual', 'Chatbot inteligente con conocimiento del sistema que responde consultas y ejecuta acciones', 'fa-robot', '#7c3aed', 40, '["todos"]', '["Respuestas contextuales", "Ejecución de acciones", "Aprendizaje continuo"]'),

('documents', 'Gestión documental centralizada', 'Repositorio de documentos con versionado, vencimientos y firma digital', 'fa-folder-open', '#0891b2', 41, '["rrhh", "legal"]', '["Vencimientos automáticos", "Firma digital", "Versionado"]'),

('hour-bank', 'Banco de horas flexibles', 'Acumulación y uso de horas con políticas configurables y aprobaciones', 'fa-piggy-bank', '#059669', 42, '["rrhh", "empleados"]', '["Acumulación flexible", "Políticas por grupo", "Aprobación workflow"]'),

('predictive', 'Analítica predictiva de RRHH', 'Predicción de rotación, ausentismo y necesidades de contratación con ML', 'fa-brain', '#7c3aed', 43, '["gerencia", "rrhh"]', '["Predicción de rotación", "Alertas tempranas", "Recomendaciones IA"]')

ON CONFLICT (module_key) DO UPDATE SET
    short_description = EXCLUDED.short_description,
    sales_pitch = EXCLUDED.sales_pitch,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order,
    target_audience = EXCLUDED.target_audience,
    key_benefits = EXCLUDED.key_benefits,
    updated_at = NOW();

-- ===========================================
-- 10. PERMISOS
-- ===========================================

-- Grants para el usuario de la aplicación (ajustar según necesidad)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

COMMENT ON TABLE sales_meetings IS 'Reuniones de venta con prospectos - Sales Orchestration Brain';
COMMENT ON TABLE sales_meeting_attendees IS 'Asistentes a reuniones de venta con sus preferencias y encuestas';
COMMENT ON TABLE sales_meeting_module_interests IS 'Interés de cada asistente en módulos específicos del sistema';
COMMENT ON TABLE sales_meeting_communications IS 'Historial de comunicaciones enviadas (emails, recordatorios, etc.)';
COMMENT ON TABLE sales_module_descriptions IS 'Descripciones comerciales de módulos para mostrar en encuestas y pitches';
COMMENT ON TABLE sales_pitch_templates IS 'Templates HTML para generar pitches visuales';

SELECT 'Sales Orchestration Brain schema created successfully' as result;
