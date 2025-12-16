-- ============================================================================
-- MIGRACIÓN: Constraint UNIQUE para UNA plantilla activa por sucursal
-- ============================================================================
-- Garantiza que cada sucursal tenga SOLO UNA plantilla de banco de horas activa
-- Multi-tenant: por empresa (company_id) y sucursal (branch_id)
--
-- Reglas:
-- - Cada sucursal puede tener MAX 1 plantilla con is_current_version = true
-- - branch_id = NULL significa plantilla global de empresa (fallback)
-- - Solo puede haber 1 plantilla global por empresa
-- ============================================================================

-- 1. Primero verificar si hay conflictos (múltiples plantillas activas)
DO $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM (
        SELECT company_id, branch_id, COUNT(*) as cnt
        FROM hour_bank_templates
        WHERE is_current_version = true AND is_enabled = true
        GROUP BY company_id, branch_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF conflict_count > 0 THEN
        RAISE NOTICE '⚠️  Hay % combinaciones con múltiples plantillas activas. Se mantendrá la más reciente.', conflict_count;

        -- Desactivar plantillas duplicadas, mantener solo la más reciente
        UPDATE hour_bank_templates t
        SET is_current_version = false
        WHERE id NOT IN (
            SELECT DISTINCT ON (company_id, COALESCE(branch_id, -1)) id
            FROM hour_bank_templates
            WHERE is_current_version = true AND is_enabled = true
            ORDER BY company_id, COALESCE(branch_id, -1), created_at DESC
        )
        AND is_current_version = true
        AND is_enabled = true;

        RAISE NOTICE '✅ Plantillas duplicadas desactivadas';
    ELSE
        RAISE NOTICE '✅ No hay conflictos de plantillas';
    END IF;
END $$;

-- 2. Crear índice UNIQUE parcial para garantizar una sola plantilla activa
-- Usamos COALESCE para manejar branch_id NULL (plantilla global)
DROP INDEX IF EXISTS idx_unique_active_template_per_branch;

CREATE UNIQUE INDEX idx_unique_active_template_per_branch
ON hour_bank_templates (company_id, COALESCE(branch_id, -1))
WHERE is_current_version = true AND is_enabled = true;

COMMENT ON INDEX idx_unique_active_template_per_branch IS
'Garantiza UNA SOLA plantilla activa por empresa+sucursal. branch_id=-1 representa plantilla global';

-- 3. Crear función para validar antes de insertar/actualizar
CREATE OR REPLACE FUNCTION check_unique_active_template()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo validar si estamos activando una plantilla
    IF NEW.is_current_version = true AND NEW.is_enabled = true THEN
        -- Verificar si ya existe otra plantilla activa para esta empresa+sucursal
        IF EXISTS (
            SELECT 1 FROM hour_bank_templates
            WHERE company_id = NEW.company_id
              AND COALESCE(branch_id, -1) = COALESCE(NEW.branch_id, -1)
              AND is_current_version = true
              AND is_enabled = true
              AND id != COALESCE(NEW.id, -1)
        ) THEN
            RAISE EXCEPTION 'Ya existe una plantilla activa para esta sucursal. Desactive la existente primero.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger
DROP TRIGGER IF EXISTS trg_check_unique_active_template ON hour_bank_templates;

CREATE TRIGGER trg_check_unique_active_template
BEFORE INSERT OR UPDATE ON hour_bank_templates
FOR EACH ROW
EXECUTE FUNCTION check_unique_active_template();

-- 5. Crear función helper para obtener plantilla aplicable
CREATE OR REPLACE FUNCTION get_applicable_hour_bank_template(
    p_company_id INTEGER,
    p_branch_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    template_id INTEGER,
    template_name VARCHAR,
    branch_id INTEGER,
    is_branch_specific BOOLEAN,
    conversion_rate_normal NUMERIC,
    conversion_rate_weekend NUMERIC,
    conversion_rate_holiday NUMERIC,
    max_accumulation_hours NUMERIC,
    expiration_months INTEGER,
    employee_choice_enabled BOOLEAN,
    requires_supervisor_approval BOOLEAN,
    requires_hr_approval BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id as template_id,
        t.template_name,
        t.branch_id,
        (t.branch_id IS NOT NULL) as is_branch_specific,
        t.conversion_rate_normal,
        t.conversion_rate_weekend,
        t.conversion_rate_holiday,
        t.max_accumulation_hours,
        t.expiration_months,
        t.employee_choice_enabled,
        t.requires_supervisor_approval,
        t.requires_hr_approval
    FROM hour_bank_templates t
    WHERE t.company_id = p_company_id
      AND t.is_current_version = true
      AND t.is_enabled = true
      AND (t.branch_id = p_branch_id OR t.branch_id IS NULL)
    ORDER BY
        -- Priorizar plantilla específica de sucursal
        CASE WHEN t.branch_id = p_branch_id THEN 0 ELSE 1 END,
        t.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_applicable_hour_bank_template IS
'Retorna la plantilla aplicable para una empresa+sucursal. Prioriza plantilla específica de sucursal sobre global.';

-- 6. Verificación final
DO $$
DECLARE
    idx_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_unique_active_template_per_branch'
    ) INTO idx_exists;

    IF idx_exists THEN
        RAISE NOTICE '✅ MIGRACIÓN COMPLETADA: Constraint UNIQUE para plantilla por sucursal';
        RAISE NOTICE '   - Solo 1 plantilla activa por empresa+sucursal';
        RAISE NOTICE '   - Trigger de validación activo';
        RAISE NOTICE '   - Función helper get_applicable_hour_bank_template() disponible';
    ELSE
        RAISE WARNING '❌ Error: El índice no se creó correctamente';
    END IF;
END $$;
