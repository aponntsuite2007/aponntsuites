-- ============================================================================
-- MANUAL DE PROCEDIMIENTOS - Agregar campo owners (propietarios/creadores)
-- Sistema de Control Documental de Instructivos y Procedimientos
--
-- Este campo almacena un arreglo de propietarios/creadores del documento
-- que se va actualizando automáticamente cuando diferentes usuarios
-- modifican el procedimiento.
--
-- Estructura JSON:
-- [
--   {
--     "user_id": "uuid",
--     "employee_id": "EMP-001",
--     "name": "Juan Pérez",
--     "department": "Producción",
--     "sector": "Líneas de producción",
--     "action": "created" | "modified",
--     "timestamp": "2025-12-07T10:30:00Z"
--   }
-- ]
--
-- @version 1.1.0
-- @date 2025-12-07
-- ============================================================================

-- 1. Agregar campo owners a la tabla procedures
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS owners JSONB DEFAULT '[]'::jsonb;

-- 2. Agregar campo expiry_date (fecha de caducidad explícita)
-- Ya existe obsolete_date, pero este es para fecha de caducidad programada
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 3. Agregar comentarios
COMMENT ON COLUMN procedures.owners IS 'Lista de propietarios/creadores del documento en orden cronológico';
COMMENT ON COLUMN procedures.expiry_date IS 'Fecha de caducidad programada del documento';

-- 4. Crear índice GIN para búsqueda eficiente en owners
CREATE INDEX IF NOT EXISTS idx_procedures_owners ON procedures USING GIN (owners);

-- 5. Función para agregar un propietario a un procedimiento
CREATE OR REPLACE FUNCTION add_procedure_owner(
    p_procedure_id UUID,
    p_user_id UUID,
    p_action VARCHAR DEFAULT 'modified'
)
RETURNS JSONB AS $$
DECLARE
    v_user_info RECORD;
    v_new_owner JSONB;
    v_current_owners JSONB;
BEGIN
    -- Obtener información del usuario
    SELECT
        u.user_id,
        u."employeeId" as employee_id,
        u."firstName" || ' ' || u."lastName" as name,
        COALESCE(d.name, 'Sin departamento') as department,
        COALESCE(s.name, 'Sin sector') as sector
    INTO v_user_info
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN sectors s ON u.sector_id = s.id
    WHERE u.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Crear objeto del nuevo propietario
    v_new_owner := jsonb_build_object(
        'user_id', v_user_info.user_id,
        'employee_id', v_user_info.employee_id,
        'name', v_user_info.name,
        'department', v_user_info.department,
        'sector', v_user_info.sector,
        'action', p_action,
        'timestamp', NOW()
    );

    -- Obtener owners actuales
    SELECT COALESCE(owners, '[]'::jsonb) INTO v_current_owners
    FROM procedures WHERE id = p_procedure_id;

    -- Verificar si el usuario ya está en la lista (evitar duplicados consecutivos)
    IF v_current_owners IS NOT NULL AND jsonb_array_length(v_current_owners) > 0 THEN
        -- Si el último owner es el mismo usuario, no duplicar
        IF (v_current_owners->-1->>'user_id')::UUID = p_user_id THEN
            RETURN v_current_owners;
        END IF;
    END IF;

    -- Agregar nuevo propietario
    v_current_owners := v_current_owners || jsonb_build_array(v_new_owner);

    -- Actualizar procedimiento
    UPDATE procedures
    SET owners = v_current_owners,
        updated_at = NOW()
    WHERE id = p_procedure_id;

    RETURN v_current_owners;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para agregar automáticamente al creador como primer propietario
CREATE OR REPLACE FUNCTION trigger_add_initial_owner()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si es nuevo registro y tiene created_by
    IF TG_OP = 'INSERT' AND NEW.created_by IS NOT NULL THEN
        PERFORM add_procedure_owner(NEW.id, NEW.created_by, 'created');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe y recrear
DROP TRIGGER IF EXISTS trg_procedure_initial_owner ON procedures;

CREATE TRIGGER trg_procedure_initial_owner
    AFTER INSERT ON procedures
    FOR EACH ROW
    EXECUTE FUNCTION trigger_add_initial_owner();

-- 7. Actualizar procedimientos existentes para que tengan el creador como propietario inicial
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT id, created_by
        FROM procedures
        WHERE created_by IS NOT NULL
          AND (owners IS NULL OR owners = '[]'::jsonb)
    LOOP
        PERFORM add_procedure_owner(rec.id, rec.created_by, 'created');
    END LOOP;
END $$;

-- ============================================================================
-- RESULTADO ESPERADO:
-- - Campo owners JSONB agregado a procedures
-- - Campo expiry_date agregado
-- - Función add_procedure_owner para agregar propietarios
-- - Trigger para agregar automáticamente al creador
-- ============================================================================
