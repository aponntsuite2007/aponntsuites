-- ==============================================================================
-- MIGRACIÓN: Agregar campos de anteojos a medical records
-- ==============================================================================
-- Descripción: Agrega campos para gestionar el uso de anteojos en registros
--              médicos de empleados, permitiendo validación biométrica inteligente
-- Fecha: 2025-01-31
-- Autor: Sistema Biométrico Enterprise
-- ==============================================================================

BEGIN;

-- 1. Crear ENUM para tipos de anteojos si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'glasses_type_enum') THEN
        CREATE TYPE glasses_type_enum AS ENUM (
            'reading',      -- Lectura/cerca
            'distance',     -- Distancia/lejos
            'bifocals',     -- Bifocales
            'progressive',  -- Progresivas
            'other'         -- Otro tipo
        );
    END IF;
END$$;

-- 2. Agregar columnas a employee_medical_records
ALTER TABLE employee_medical_records
    ADD COLUMN IF NOT EXISTS uses_glasses BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS glasses_type glasses_type_enum,
    ADD COLUMN IF NOT EXISTS glasses_permanent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS glasses_notes TEXT;

-- 3. Agregar comentarios a las columnas
COMMENT ON COLUMN employee_medical_records.uses_glasses IS 'Si el empleado usa anteojos';
COMMENT ON COLUMN employee_medical_records.glasses_type IS 'Tipo de anteojos que usa (reading/distance/bifocals/progressive/other)';
COMMENT ON COLUMN employee_medical_records.glasses_permanent IS 'Si usa anteojos permanentemente o solo ocasionalmente';
COMMENT ON COLUMN employee_medical_records.glasses_notes IS 'Notas adicionales sobre uso de anteojos (prescripción, razón médica, etc.)';

-- 4. Crear índice para búsquedas rápidas por uso de anteojos
CREATE INDEX IF NOT EXISTS idx_medical_records_uses_glasses
    ON employee_medical_records (uses_glasses);

-- 5. Crear función helper para obtener info de anteojos de un usuario
CREATE OR REPLACE FUNCTION get_user_glasses_info(p_user_id UUID)
RETURNS TABLE (
    uses_glasses BOOLEAN,
    glasses_type glasses_type_enum,
    glasses_permanent BOOLEAN,
    glasses_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        emr.uses_glasses,
        emr.glasses_type,
        emr.glasses_permanent,
        emr.glasses_notes
    FROM employee_medical_records emr
    WHERE emr."userId" = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_glasses_info(UUID) IS 'Obtiene información sobre el uso de anteojos de un empleado específico';

-- 6. Crear función para validar si el usuario debe tener anteojos en captura biométrica
CREATE OR REPLACE FUNCTION should_validate_glasses(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_uses_glasses BOOLEAN;
    v_glasses_permanent BOOLEAN;
BEGIN
    SELECT uses_glasses, glasses_permanent
    INTO v_uses_glasses, v_glasses_permanent
    FROM employee_medical_records
    WHERE "userId" = p_user_id;

    -- Si no tiene registro médico, no validar
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Solo validar si usa anteojos permanentemente
    RETURN (v_uses_glasses = true AND v_glasses_permanent = true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION should_validate_glasses(UUID) IS 'Determina si se debe validar el uso de anteojos en captura biométrica para un usuario específico';

-- 7. Log de migración
INSERT INTO schema_migrations (version, name, executed_at)
VALUES (
    '20250131_add_glasses_fields',
    'Add glasses fields to medical records',
    NOW()
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ==============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ==============================================================================

-- Verificar columnas agregadas
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employee_medical_records'
    AND column_name IN ('uses_glasses', 'glasses_type', 'glasses_permanent', 'glasses_notes');

-- Verificar funciones creadas
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN ('get_user_glasses_info', 'should_validate_glasses')
    AND routine_schema = 'public';

COMMENT ON TABLE employee_medical_records IS 'Registros médicos de empleados con información completa de salud ocupacional, incluyendo uso de anteojos para validación biométrica';
