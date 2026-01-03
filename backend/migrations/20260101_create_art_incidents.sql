-- ========================================================================
-- MIGRACIÓN: Sistema de Gestión de Incidentes ART
-- ========================================================================
-- Módulo para registro y gestión de incidentes/accidentes laborales
-- que deben reportarse a la ART (Aseguradora de Riesgos del Trabajo)
--
-- Normativa: Ley 24.557 - Riesgos del Trabajo (Argentina)
-- Autoridad: SRT (Superintendencia de Riesgos del Trabajo)
--
-- Fecha: 1 de Enero de 2026
-- ========================================================================

-- ========================================================================
-- TABLA: art_incidents
-- ========================================================================
CREATE TABLE IF NOT EXISTS art_incidents (
    -- ID principal
    id SERIAL PRIMARY KEY,

    -- Información básica
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reported_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Clasificación del incidente
    incident_type VARCHAR(50) NOT NULL CHECK (
        incident_type IN (
            'accident',
            'in_itinere',
            'occupational_disease',
            'near_miss',
            'unsafe_condition',
            'unsafe_act'
        )
    ),

    severity VARCHAR(20) NOT NULL CHECK (
        severity IN ('fatal', 'serious', 'moderate', 'minor', 'no_injury')
    ),

    requires_art_notification BOOLEAN DEFAULT true,
    requires_srt_notification BOOLEAN DEFAULT false,

    -- Detalles del incidente
    incident_date TIMESTAMP NOT NULL,
    location VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    immediate_cause TEXT,
    root_cause TEXT,

    -- Lesiones y atención médica
    injury_type VARCHAR(30) DEFAULT 'none' CHECK (
        injury_type IN (
            'none', 'contusion', 'cut', 'fracture', 'burn', 'sprain',
            'amputation', 'intoxication', 'respiratory', 'multiple', 'other'
        )
    ),

    body_part_affected VARCHAR(200),
    medical_attention_required BOOLEAN DEFAULT false,
    medical_facility VARCHAR(200),
    medical_record_id INTEGER REFERENCES medical_records(id) ON DELETE SET NULL,
    hospitalization_required BOOLEAN DEFAULT false,
    days_off_work INTEGER DEFAULT 0,

    -- Reportes y notificaciones
    art_notified BOOLEAN DEFAULT false,
    art_notification_date TIMESTAMP,
    art_case_number VARCHAR(100),

    srt_notified BOOLEAN DEFAULT false,
    srt_notification_date TIMESTAMP,
    srt_case_number VARCHAR(100),

    -- Investigación
    investigation_status VARCHAR(20) DEFAULT 'pending' CHECK (
        investigation_status IN ('pending', 'in_progress', 'completed', 'closed')
    ),

    investigation_assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    investigation_findings TEXT,
    corrective_actions JSONB DEFAULT '[]'::jsonb,
    preventive_actions JSONB DEFAULT '[]'::jsonb,

    -- Testigos y evidencia
    witnesses JSONB DEFAULT '[]'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,

    -- Costos
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    cost_breakdown JSONB,

    -- Workflow
    status VARCHAR(20) DEFAULT 'draft' CHECK (
        status IN (
            'draft', 'reported', 'under_review', 'art_pending',
            'in_treatment', 'resolved', 'closed'
        )
    ),

    closed_date TIMESTAMP,
    closed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================================================
-- ÍNDICES OPTIMIZADOS
-- ========================================================================
CREATE INDEX idx_art_incidents_incident_number ON art_incidents(incident_number);
CREATE INDEX idx_art_incidents_company_id ON art_incidents(company_id);
CREATE INDEX idx_art_incidents_employee_id ON art_incidents(employee_id);
CREATE INDEX idx_art_incidents_incident_date ON art_incidents(incident_date DESC);
CREATE INDEX idx_art_incidents_incident_type ON art_incidents(incident_type);
CREATE INDEX idx_art_incidents_severity ON art_incidents(severity);
CREATE INDEX idx_art_incidents_status ON art_incidents(status);
CREATE INDEX idx_art_incidents_art_notified ON art_incidents(art_notified);
CREATE INDEX idx_art_incidents_srt_notified ON art_incidents(srt_notified);
CREATE INDEX idx_art_incidents_investigation_status ON art_incidents(investigation_status);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX idx_art_incidents_company_status ON art_incidents(company_id, status);
CREATE INDEX idx_art_incidents_company_date ON art_incidents(company_id, incident_date DESC);

-- ========================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ========================================================================
CREATE OR REPLACE FUNCTION update_art_incident_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_art_incident_timestamp
BEFORE UPDATE ON art_incidents
FOR EACH ROW
EXECUTE FUNCTION update_art_incident_timestamp();

-- ========================================================================
-- FUNCIÓN: Generar número de incidente
-- ========================================================================
-- Formato: ART-{company_id}-{sequence}-{year}
-- Ejemplo: ART-1-00042-2026
CREATE OR REPLACE FUNCTION generate_art_incident_number(p_company_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_incident_number TEXT;
BEGIN
    -- Obtener año actual
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Obtener siguiente secuencia para la empresa en el año
    SELECT COALESCE(MAX(
        CAST(
            SPLIT_PART(incident_number, '-', 3) AS INTEGER
        )
    ), 0) + 1
    INTO v_sequence
    FROM art_incidents
    WHERE company_id = p_company_id
      AND incident_number LIKE 'ART-' || p_company_id || '-%';

    -- Generar número de incidente
    v_incident_number := 'ART-' || p_company_id || '-' ||
                         LPAD(v_sequence::TEXT, 5, '0') || '-' || v_year;

    RETURN v_incident_number;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- FUNCIÓN: Auto-notificar a ART según severidad
-- ========================================================================
CREATE OR REPLACE FUNCTION auto_notify_art_if_required()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-marcar para notificar ART si es accidente moderado o superior
    IF NEW.severity IN ('serious', 'fatal') THEN
        NEW.requires_art_notification := true;
    END IF;

    -- Auto-marcar para notificar SRT si es fatal
    IF NEW.severity = 'fatal' THEN
        NEW.requires_srt_notification := true;
    END IF;

    -- Cambiar estado a 'reported' cuando se crea
    IF TG_OP = 'INSERT' AND NEW.status = 'draft' THEN
        NEW.status := 'reported';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_notify_art
BEFORE INSERT OR UPDATE ON art_incidents
FOR EACH ROW
EXECUTE FUNCTION auto_notify_art_if_required();

-- ========================================================================
-- FUNCIÓN: Validar días de baja laboral
-- ========================================================================
CREATE OR REPLACE FUNCTION validate_days_off_work()
RETURNS TRIGGER AS $$
BEGIN
    -- Si hay días de baja, marcar que requirió atención médica
    IF NEW.days_off_work > 0 THEN
        NEW.medical_attention_required := true;
    END IF;

    -- Si hay más de 15 días de baja, marcar para notificar ART
    IF NEW.days_off_work > 15 THEN
        NEW.requires_art_notification := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_days_off_work
BEFORE INSERT OR UPDATE ON art_incidents
FOR EACH ROW
EXECUTE FUNCTION validate_days_off_work();

-- ========================================================================
-- VISTAS HELPER
-- ========================================================================

-- Vista: Incidentes activos
CREATE OR REPLACE VIEW active_art_incidents AS
SELECT
    ai.*,
    c.name AS company_name,
    u.firstName || ' ' || u.lastName AS employee_name,
    r.firstName || ' ' || r.lastName AS reporter_name
FROM art_incidents ai
LEFT JOIN companies c ON ai.company_id = c.id
LEFT JOIN users u ON ai.employee_id = u.user_id
LEFT JOIN users r ON ai.reported_by = r.user_id
WHERE ai.status NOT IN ('resolved', 'closed')
ORDER BY ai.incident_date DESC;

-- Vista: Incidentes graves pendientes de notificar
CREATE OR REPLACE VIEW pending_art_notifications AS
SELECT
    ai.*,
    c.name AS company_name,
    u.firstName || ' ' || u.lastName AS employee_name,
    EXTRACT(DAY FROM (NOW() - ai.incident_date)) AS days_since_incident
FROM art_incidents ai
LEFT JOIN companies c ON ai.company_id = c.id
LEFT JOIN users u ON ai.employee_id = u.user_id
WHERE ai.requires_art_notification = true
  AND ai.art_notified = false
  AND ai.severity IN ('serious', 'fatal')
ORDER BY ai.incident_date ASC;

-- Vista: Estadísticas de incidentes por empresa
CREATE OR REPLACE VIEW art_incident_stats_by_company AS
SELECT
    company_id,
    COUNT(*) AS total_incidents,
    COUNT(CASE WHEN severity = 'fatal' THEN 1 END) AS fatal_incidents,
    COUNT(CASE WHEN severity = 'serious' THEN 1 END) AS serious_incidents,
    COUNT(CASE WHEN severity = 'moderate' THEN 1 END) AS moderate_incidents,
    COUNT(CASE WHEN art_notified THEN 1 END) AS art_notified_count,
    COUNT(CASE WHEN srt_notified THEN 1 END) AS srt_notified_count,
    SUM(days_off_work) AS total_days_off_work,
    COALESCE(SUM(actual_cost), SUM(estimated_cost), 0) AS total_cost,
    COUNT(CASE WHEN status IN ('draft', 'reported', 'under_review') THEN 1 END) AS open_incidents,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closed_incidents
FROM art_incidents
GROUP BY company_id;

-- ========================================================================
-- FUNCIÓN: Obtener estadísticas de incidentes por empresa
-- ========================================================================
CREATE OR REPLACE FUNCTION get_art_incident_stats(p_company_id INTEGER)
RETURNS TABLE (
    total_incidents INTEGER,
    fatal_incidents INTEGER,
    serious_incidents INTEGER,
    moderate_incidents INTEGER,
    total_days_off_work BIGINT,
    total_cost NUMERIC,
    avg_investigation_time_days NUMERIC,
    incidents_this_month INTEGER,
    incidents_this_year INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_incidents,
        COUNT(CASE WHEN severity = 'fatal' THEN 1 END)::INTEGER AS fatal_incidents,
        COUNT(CASE WHEN severity = 'serious' THEN 1 END)::INTEGER AS serious_incidents,
        COUNT(CASE WHEN severity = 'moderate' THEN 1 END)::INTEGER AS moderate_incidents,
        SUM(days_off_work) AS total_days_off_work,
        COALESCE(SUM(actual_cost), SUM(estimated_cost), 0) AS total_cost,
        AVG(EXTRACT(DAY FROM (closed_date - created_at))) AS avg_investigation_time_days,
        COUNT(CASE WHEN incident_date >= DATE_TRUNC('month', NOW()) THEN 1 END)::INTEGER AS incidents_this_month,
        COUNT(CASE WHEN incident_date >= DATE_TRUNC('year', NOW()) THEN 1 END)::INTEGER AS incidents_this_year
    FROM art_incidents
    WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- FUNCIÓN: Obtener incidentes por empleado
-- ========================================================================
CREATE OR REPLACE FUNCTION get_employee_incident_history(p_employee_id INTEGER)
RETURNS TABLE (
    incident_id INTEGER,
    incident_number TEXT,
    incident_date TIMESTAMP,
    incident_type TEXT,
    severity TEXT,
    status TEXT,
    days_off_work INTEGER,
    art_notified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ai.id,
        ai.incident_number,
        ai.incident_date,
        ai.incident_type::TEXT,
        ai.severity::TEXT,
        ai.status::TEXT,
        ai.days_off_work,
        ai.art_notified
    FROM art_incidents ai
    WHERE ai.employee_id = p_employee_id
    ORDER BY ai.incident_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- COMENTARIOS EN LA TABLA
-- ========================================================================
COMMENT ON TABLE art_incidents IS 'Registro de incidentes/accidentes laborales que deben reportarse a la ART';
COMMENT ON COLUMN art_incidents.incident_number IS 'Número único de incidente (formato: ART-{company_id}-{seq}-{year})';
COMMENT ON COLUMN art_incidents.incident_type IS 'Tipo de incidente: accident, in_itinere, occupational_disease, near_miss, unsafe_condition, unsafe_act';
COMMENT ON COLUMN art_incidents.severity IS 'Severidad: fatal, serious, moderate, minor, no_injury';
COMMENT ON COLUMN art_incidents.requires_art_notification IS 'Si requiere notificación a la ART';
COMMENT ON COLUMN art_incidents.requires_srt_notification IS 'Si requiere notificación a la SRT (casos graves/fatales)';
COMMENT ON COLUMN art_incidents.art_notified IS 'Si se notificó a la ART';
COMMENT ON COLUMN art_incidents.srt_notified IS 'Si se notificó a la SRT';
COMMENT ON COLUMN art_incidents.investigation_status IS 'Estado de la investigación: pending, in_progress, completed, closed';
COMMENT ON COLUMN art_incidents.status IS 'Estado del incidente: draft, reported, under_review, art_pending, in_treatment, resolved, closed';

-- ========================================================================
-- FIN DE MIGRACIÓN
-- ========================================================================
