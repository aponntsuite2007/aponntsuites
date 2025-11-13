-- ============================================================================
-- MIGRACIÓN: Campos de Periodicidad para Exámenes Médicos Ocupacionales
-- Fecha: 2025-10-31
-- Descripción: Agrega campos para configurar la frecuencia de exámenes médicos
--              y calcular automáticamente next_exam_date según la periodicidad
-- ============================================================================

-- Agregar campo de frecuencia de examen médico
ALTER TABLE user_medical_exams
ADD COLUMN IF NOT EXISTS exam_frequency VARCHAR(50)
CHECK (exam_frequency IN ('mensual', 'trimestral', 'semestral', 'anual', 'bienal', 'personalizado'));

-- Agregar campo para meses personalizados (usado cuando exam_frequency = 'personalizado')
ALTER TABLE user_medical_exams
ADD COLUMN IF NOT EXISTS frequency_months INTEGER
CHECK (frequency_months > 0 AND frequency_months <= 120);

-- Agregar campo para auto-calcular próximo examen
ALTER TABLE user_medical_exams
ADD COLUMN IF NOT EXISTS auto_calculate_next_exam BOOLEAN DEFAULT true;

-- Comentarios de los nuevos campos
COMMENT ON COLUMN user_medical_exams.exam_frequency IS 'Frecuencia configurada del examen médico (ej: anual, semestral)';
COMMENT ON COLUMN user_medical_exams.frequency_months IS 'Número de meses personalizado cuando exam_frequency = personalizado';
COMMENT ON COLUMN user_medical_exams.auto_calculate_next_exam IS 'Si debe calcular automáticamente next_exam_date desde exam_date + frecuencia';

-- ============================================================================
-- FUNCIÓN: Calcular automáticamente next_exam_date según periodicidad
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_medical_exam_date(
    p_exam_date DATE,
    p_frequency VARCHAR(50),
    p_custom_months INTEGER DEFAULT NULL
) RETURNS DATE AS $$
DECLARE
    v_months INTEGER;
BEGIN
    -- Determinar número de meses según frecuencia
    CASE p_frequency
        WHEN 'mensual' THEN v_months := 1;
        WHEN 'trimestral' THEN v_months := 3;
        WHEN 'semestral' THEN v_months := 6;
        WHEN 'anual' THEN v_months := 12;
        WHEN 'bienal' THEN v_months := 24;
        WHEN 'personalizado' THEN v_months := COALESCE(p_custom_months, 12);
        ELSE v_months := 12; -- Default: anual
    END CASE;

    -- Calcular fecha sumando los meses
    RETURN p_exam_date + (v_months || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_next_medical_exam_date IS 'Calcula la fecha del próximo examen médico según la periodicidad configurada';

-- ============================================================================
-- TRIGGER: Auto-calcular next_exam_date al insertar/actualizar
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_calculate_next_medical_exam()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo calcular si auto_calculate_next_exam está activado
    IF NEW.auto_calculate_next_exam = true AND NEW.exam_date IS NOT NULL AND NEW.exam_frequency IS NOT NULL THEN
        NEW.next_exam_date := calculate_next_medical_exam_date(
            NEW.exam_date,
            NEW.exam_frequency,
            NEW.frequency_months
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para INSERT
DROP TRIGGER IF EXISTS auto_calculate_next_exam_insert ON user_medical_exams;
CREATE TRIGGER auto_calculate_next_exam_insert
    BEFORE INSERT ON user_medical_exams
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_next_medical_exam();

-- Crear trigger para UPDATE
DROP TRIGGER IF EXISTS auto_calculate_next_exam_update ON user_medical_exams;
CREATE TRIGGER auto_calculate_next_exam_update
    BEFORE UPDATE OF exam_date, exam_frequency, frequency_months, auto_calculate_next_exam ON user_medical_exams
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_next_medical_exam();

-- ============================================================================
-- FUNCIÓN: Obtener exámenes médicos próximos a vencer
-- ============================================================================

CREATE OR REPLACE FUNCTION get_users_with_expiring_medical_exams(days_threshold INTEGER DEFAULT 30)
RETURNS TABLE (
    id INTEGER,
    user_id UUID,
    company_id INTEGER,
    usuario VARCHAR,
    firstName VARCHAR,
    lastName VARCHAR,
    email VARCHAR,
    role VARCHAR,
    exam_type VARCHAR,
    exam_date DATE,
    next_exam_date DATE,
    exam_frequency VARCHAR,
    days_until_expiration NUMERIC,
    medical_center VARCHAR,
    examining_doctor VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ume.id,
        ume.user_id,
        ume.company_id,
        u.usuario,
        u."firstName",
        u."lastName",
        u.email,
        u.role,
        ume.exam_type,
        ume.exam_date,
        ume.next_exam_date,
        ume.exam_frequency,
        DATE_PART('day', ume.next_exam_date::timestamp - NOW()) AS days_until_expiration,
        ume.medical_center,
        ume.examining_doctor
    FROM user_medical_exams ume
    INNER JOIN users u ON ume.user_id = u.user_id
    WHERE ume.next_exam_date IS NOT NULL
        AND ume.next_exam_date <= (CURRENT_DATE + (days_threshold || ' days')::INTERVAL)
        AND ume.next_exam_date > CURRENT_DATE
        AND u."isActive" = true
    ORDER BY ume.next_exam_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_users_with_expiring_medical_exams IS 'Obtiene usuarios con exámenes médicos próximos a vencer dentro de N días';

-- ============================================================================
-- VALORES POR DEFECTO para registros existentes
-- ============================================================================

-- Configurar frecuencia anual para exámenes periódicos existentes
UPDATE user_medical_exams
SET exam_frequency = 'anual',
    auto_calculate_next_exam = false -- No recalcular automáticamente para datos históricos
WHERE exam_type = 'periodico'
    AND exam_frequency IS NULL;

-- Configurar frecuencia única para exámenes preocupacionales y de retiro
UPDATE user_medical_exams
SET exam_frequency = NULL,
    auto_calculate_next_exam = false
WHERE exam_type IN ('preocupacional', 'retiro')
    AND exam_frequency IS NOT NULL;

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_medical_exams_next_date ON user_medical_exams(next_exam_date) WHERE next_exam_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medical_exams_frequency ON user_medical_exams(exam_frequency);
CREATE INDEX IF NOT EXISTS idx_medical_exams_user_active ON user_medical_exams(user_id) WHERE next_exam_date IS NOT NULL;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- NOTAS:
-- 1. Los exámenes preocupacionales y de retiro NO tienen periodicidad (son únicos)
-- 2. Los exámenes periódicos pueden configurarse con frecuencia anual, semestral, etc.
-- 3. El campo next_exam_date se calcula automáticamente con triggers
-- 4. El scheduler verificará diariamente exámenes próximos a vencer (30 días)
