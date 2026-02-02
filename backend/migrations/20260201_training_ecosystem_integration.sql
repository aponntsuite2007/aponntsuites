-- ============================================================================
-- MIGRACIÓN: Ecosistema de Capacitaciones - Integraciones Multi-Módulo
-- ============================================================================
-- Fecha: 2026-02-01
-- Descripción: Agrega columnas para tracking de origen de capacitaciones
--              desde módulos afluentes (HSE, Medical, ART, Procedures, Risk)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MODIFICAR TABLA training_assignments - Agregar tracking de origen
-- ============================================================================

-- Columna para identificar el módulo que generó la asignación
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS source_module VARCHAR(50);

COMMENT ON COLUMN training_assignments.source_module IS
  'Módulo que generó la asignación: manual, hse, medical, art, procedures, risk_intelligence, onboarding';

-- Columna para el tipo de entidad origen
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS source_entity_type VARCHAR(50);

COMMENT ON COLUMN training_assignments.source_entity_type IS
  'Tipo de entidad origen: hse_case, hse_violation, medical_exam, art_accident, procedure, risk_alert';

-- Columna para el ID de la entidad origen
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS source_entity_id INTEGER;

COMMENT ON COLUMN training_assignments.source_entity_id IS
  'ID de la entidad que generó la asignación';

-- Flag para distinguir asignaciones automáticas vs manuales
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false;

COMMENT ON COLUMN training_assignments.auto_assigned IS
  'true si fue asignada automáticamente por el sistema';

-- Razón de la asignación (para auditoría)
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS assignment_reason TEXT;

COMMENT ON COLUMN training_assignments.assignment_reason IS
  'Descripción de por qué se asignó esta capacitación';

-- Prioridad de la asignación
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

COMMENT ON COLUMN training_assignments.priority IS
  'Prioridad: critical, high, normal, low';

-- Índice para queries por origen
CREATE INDEX IF NOT EXISTS idx_training_assignments_source
ON training_assignments(source_module, source_entity_type, source_entity_id);

-- Índice para auto-asignaciones
CREATE INDEX IF NOT EXISTS idx_training_assignments_auto
ON training_assignments(auto_assigned) WHERE auto_assigned = true;

-- ============================================================================
-- 2. MODIFICAR TABLA trainings - Agregar requisitos y vinculaciones
-- ============================================================================

-- Requiere certificado médico vigente
ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS requires_medical_clearance BOOLEAN DEFAULT false;

COMMENT ON COLUMN trainings.requires_medical_clearance IS
  'Si true, valida certificado médico vigente antes de permitir inscripción';

-- Tipos de examen médico requeridos
ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS required_medical_exams TEXT[];

COMMENT ON COLUMN trainings.required_medical_exams IS
  'Array de tipos de examen requeridos: audiometry, visual, physical, psychological';

-- Vinculación con procedimientos
ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS linked_procedure_ids INTEGER[];

COMMENT ON COLUMN trainings.linked_procedure_ids IS
  'IDs de procedimientos que requieren esta capacitación';

-- Códigos de violación HSE que disparan esta capacitación
ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS hse_violation_codes TEXT[];

COMMENT ON COLUMN trainings.hse_violation_codes IS
  'Códigos de violación HSE que auto-asignan esta capacitación';

-- Categorías de riesgo asociadas
ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS risk_categories TEXT[];

COMMENT ON COLUMN trainings.risk_categories IS
  'Categorías de Risk Intelligence que priorizan esta capacitación';

-- Nivel de riesgo del training (para validar aptitud médica)
ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';

COMMENT ON COLUMN trainings.risk_level IS
  'Nivel de riesgo: low, medium, high, critical - afecta validación médica';

-- ============================================================================
-- 3. CREAR TABLA training_integration_log - Auditoría de integraciones
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_integration_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- Origen
    source_module VARCHAR(50) NOT NULL,
    source_entity_type VARCHAR(50) NOT NULL,
    source_entity_id INTEGER NOT NULL,

    -- Acción
    action VARCHAR(50) NOT NULL, -- 'auto_assign', 'block', 'prioritize', 'notify'

    -- Resultado
    training_id INTEGER,
    assignment_id INTEGER,
    user_id INTEGER,

    -- Detalles
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',

    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER
);

COMMENT ON TABLE training_integration_log IS
  'Log de todas las acciones de integración entre módulos y capacitaciones';

CREATE INDEX IF NOT EXISTS idx_training_integration_log_source
ON training_integration_log(source_module, source_entity_type, source_entity_id);

CREATE INDEX IF NOT EXISTS idx_training_integration_log_company
ON training_integration_log(company_id, created_at DESC);

-- ============================================================================
-- 4. CREAR TABLA training_eligibility_rules - Reglas de elegibilidad
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_eligibility_rules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    training_id INTEGER NOT NULL,

    -- Tipo de regla
    rule_type VARCHAR(50) NOT NULL, -- 'medical_clearance', 'certification', 'prerequisite', 'time_restriction'

    -- Configuración de la regla
    rule_config JSONB NOT NULL,
    /*
    Ejemplos de rule_config:

    medical_clearance: {
        "exam_types": ["physical", "audiometry"],
        "max_age_days": 365,
        "block_if_expired": true
    }

    prerequisite: {
        "required_training_ids": [1, 2, 3],
        "min_score": 70
    }

    time_restriction: {
        "min_days_since_hire": 30,
        "max_days_since_last_training": 365
    }
    */

    -- Estado
    is_active BOOLEAN DEFAULT true,
    error_message TEXT, -- Mensaje a mostrar si no cumple

    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE training_eligibility_rules IS
  'Reglas de elegibilidad para inscribirse en capacitaciones';

CREATE INDEX IF NOT EXISTS idx_training_eligibility_rules_training
ON training_eligibility_rules(training_id, is_active);

-- ============================================================================
-- 5. FUNCIONES HELPER
-- ============================================================================

-- Función para obtener estadísticas de asignaciones por origen
CREATE OR REPLACE FUNCTION get_training_assignments_by_source(p_company_id INTEGER)
RETURNS TABLE (
    source_module VARCHAR(50),
    total_assignments BIGINT,
    completed BIGINT,
    in_progress BIGINT,
    pending BIGINT,
    auto_assigned_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ta.source_module, 'manual') as source_module,
        COUNT(*) as total_assignments,
        COUNT(*) FILTER (WHERE ta.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE ta.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE ta.status = 'assigned' OR ta.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE ta.auto_assigned = true) as auto_assigned_count
    FROM training_assignments ta
    WHERE ta.company_id = p_company_id
    GROUP BY COALESCE(ta.source_module, 'manual')
    ORDER BY total_assignments DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar elegibilidad médica
CREATE OR REPLACE FUNCTION check_medical_eligibility(
    p_user_id INTEGER,
    p_training_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_training RECORD;
    v_latest_exam RECORD;
    v_result JSONB;
BEGIN
    -- Obtener training
    SELECT * INTO v_training FROM trainings WHERE id = p_training_id;

    IF NOT v_training.requires_medical_clearance THEN
        RETURN jsonb_build_object('eligible', true, 'reason', 'No requiere certificado médico');
    END IF;

    -- Buscar último examen médico válido
    SELECT * INTO v_latest_exam
    FROM user_medical_exams
    WHERE user_id = p_user_id
      AND result = 'apto'
      AND next_exam_date > NOW()
    ORDER BY exam_date DESC
    LIMIT 1;

    IF v_latest_exam IS NULL THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'No tiene certificado médico vigente',
            'required_action', 'medical_exam'
        );
    END IF;

    RETURN jsonb_build_object(
        'eligible', true,
        'reason', 'Certificado médico vigente',
        'exam_date', v_latest_exam.exam_date,
        'valid_until', v_latest_exam.next_exam_date
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. VALORES POR DEFECTO PARA REGISTROS EXISTENTES
-- ============================================================================

-- Marcar asignaciones existentes como manuales
UPDATE training_assignments
SET source_module = 'manual',
    auto_assigned = false
WHERE source_module IS NULL;

COMMIT;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
/*
TABLAS MODIFICADAS:
- training_assignments: +6 columnas (source_module, source_entity_type, source_entity_id, auto_assigned, assignment_reason, priority)
- trainings: +6 columnas (requires_medical_clearance, required_medical_exams, linked_procedure_ids, hse_violation_codes, risk_categories, risk_level)

TABLAS NUEVAS:
- training_integration_log: Auditoría de integraciones
- training_eligibility_rules: Reglas de elegibilidad

FUNCIONES NUEVAS:
- get_training_assignments_by_source(): Estadísticas por origen
- check_medical_eligibility(): Validación de aptitud médica
*/
