-- =====================================================
-- MIGRACIÓN: Sistema de Autorización Kiosk-Department
-- Fecha: 2025-10-09
-- Descripción: Implementa autorización bidireccional entre
--              kiosks y departamentos para control de acceso
-- =====================================================

-- 1. Agregar kiosk por defecto a departments
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS default_kiosk_id INTEGER REFERENCES kiosks(id) ON DELETE SET NULL;

-- Índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_departments_default_kiosk ON departments(default_kiosk_id);

-- 2. Agregar departamentos autorizados a kiosks
ALTER TABLE kiosks
ADD COLUMN IF NOT EXISTS authorized_departments JSONB DEFAULT '[]';

-- Índice GIN para búsquedas rápidas en JSONB
CREATE INDEX IF NOT EXISTS idx_kiosks_authorized_departments ON kiosks USING GIN (authorized_departments);

-- 3. Comentarios
COMMENT ON COLUMN departments.default_kiosk_id IS 'Kiosk por defecto donde este departamento debe marcar asistencia';
COMMENT ON COLUMN kiosks.authorized_departments IS 'Array de department_id que pueden usar este kiosk además de su kiosk por defecto. Ejemplo: [1, 2, 5]';

-- 4. Función helper para verificar si un usuario puede usar un kiosk
CREATE OR REPLACE FUNCTION can_user_use_kiosk_v2(
    p_user_id UUID,
    p_kiosk_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_use_all_kiosks BOOLEAN;
    v_department_id INTEGER;
    v_default_kiosk_id INTEGER;
    v_authorized_depts JSONB;
BEGIN
    -- Obtener datos del usuario
    SELECT
        COALESCE(can_use_all_kiosks, false),
        "departmentId"
    INTO v_can_use_all_kiosks, v_department_id
    FROM users
    WHERE user_id = p_user_id;

    -- Si el usuario puede usar todos los kiosks
    IF v_can_use_all_kiosks = true THEN
        RETURN true;
    END IF;

    -- Si el usuario no tiene departamento, no puede usar kiosks específicos
    IF v_department_id IS NULL THEN
        RETURN false;
    END IF;

    -- Obtener kiosk por defecto del departamento
    SELECT default_kiosk_id
    INTO v_default_kiosk_id
    FROM departments
    WHERE id = v_department_id;

    -- Si el kiosk es el por defecto del departamento
    IF v_default_kiosk_id = p_kiosk_id THEN
        RETURN true;
    END IF;

    -- Verificar si el departamento está en la lista autorizada del kiosk
    SELECT authorized_departments
    INTO v_authorized_depts
    FROM kiosks
    WHERE id = p_kiosk_id;

    -- Verificar si el department_id está en el array JSONB
    IF v_authorized_depts @> to_jsonb(v_department_id) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_user_use_kiosk_v2 IS 'Verifica si un usuario puede usar un kiosk específico basado en: can_use_all_kiosks, default_kiosk_id del departamento, o authorized_departments del kiosk';

-- 5. Vista helper para ver autorizaciones
CREATE OR REPLACE VIEW kiosk_department_authorizations AS
SELECT
    k.id as kiosk_id,
    k.name as kiosk_name,
    k.company_id,
    -- Departamento por defecto (si este kiosk es el default de algún departamento)
    json_agg(DISTINCT jsonb_build_object(
        'department_id', d.id,
        'department_name', d.name,
        'type', 'default'
    )) FILTER (WHERE d.default_kiosk_id = k.id) as default_departments,
    -- Departamentos autorizados extra
    k.authorized_departments as extra_authorized_departments
FROM kiosks k
LEFT JOIN departments d ON d.default_kiosk_id = k.id OR d.company_id = k.company_id
WHERE k.is_active = true
GROUP BY k.id, k.name, k.company_id, k.authorized_departments;

COMMENT ON VIEW kiosk_department_authorizations IS 'Vista helper que muestra qué departamentos pueden usar cada kiosk';
