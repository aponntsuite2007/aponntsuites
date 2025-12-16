-- ============================================================================
-- MIGRACIÓN: Sistema de Destinatarios de Notificaciones por Departamento
-- Fecha: 2025-12-16
-- Descripción: Permite definir quién recibe notificaciones cuando se envían
--              a un departamento como entidad (ej: "RRHH", "Legal", etc.)
-- ============================================================================

-- 1. Agregar campo para destinatarios de notificaciones en departments
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS notification_recipients JSONB DEFAULT '[]'::jsonb;

-- 2. Agregar campo para el jefe/responsable del departamento
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES users(user_id);

-- 3. Agregar índice para búsqueda rápida por nombre de departamento (normalizado)
CREATE INDEX IF NOT EXISTS idx_departments_name_lower ON departments (LOWER(name));

-- 4. Comentarios para documentación
COMMENT ON COLUMN departments.notification_recipients IS
'JSON array de user_ids que reciben notificaciones enviadas al departamento.
Formato: [{"user_id": "uuid", "role": "primary"}, {"user_id": "uuid", "role": "backup"}]
Si está vacío, usa manager_user_id como fallback.';

COMMENT ON COLUMN departments.manager_user_id IS
'Usuario responsable/jefe del departamento. Recibe notificaciones si notification_recipients está vacío.';

-- 5. Crear tabla de aliases para departamentos (para mapear "RRHH" -> "Recursos Humanos")
CREATE TABLE IF NOT EXISTS department_aliases (
    id SERIAL PRIMARY KEY,
    alias VARCHAR(100) NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alias, company_id)
);

COMMENT ON TABLE department_aliases IS
'Aliases para departamentos. Permite mapear "RRHH" a "Recursos Humanos", etc.';

-- 6. Crear función para resolver destinatarios de un departamento
CREATE OR REPLACE FUNCTION resolve_department_notification_recipients(
    p_company_id INTEGER,
    p_department_name VARCHAR(100)
) RETURNS TABLE(user_id UUID, role VARCHAR(50)) AS $$
DECLARE
    v_department_id INTEGER;
    v_manager_id UUID;
    v_recipients JSONB;
BEGIN
    -- Buscar departamento por nombre o alias
    SELECT d.id, d.manager_user_id, d.notification_recipients
    INTO v_department_id, v_manager_id, v_recipients
    FROM departments d
    LEFT JOIN department_aliases da ON da.department_id = d.id AND da.company_id = p_company_id
    WHERE d.company_id = p_company_id
      AND d.is_active = true
      AND (
          LOWER(d.name) = LOWER(p_department_name)
          OR LOWER(da.alias) = LOWER(p_department_name)
      )
    LIMIT 1;

    -- Si no se encuentra departamento
    IF v_department_id IS NULL THEN
        RETURN;
    END IF;

    -- Si hay recipients configurados, retornarlos
    IF v_recipients IS NOT NULL AND jsonb_array_length(v_recipients) > 0 THEN
        RETURN QUERY
        SELECT
            (r->>'user_id')::UUID as user_id,
            COALESCE(r->>'role', 'member')::VARCHAR(50) as role
        FROM jsonb_array_elements(v_recipients) r;
        RETURN;
    END IF;

    -- Fallback: retornar manager del departamento
    IF v_manager_id IS NOT NULL THEN
        RETURN QUERY SELECT v_manager_id, 'manager'::VARCHAR(50);
        RETURN;
    END IF;

    -- Último fallback: buscar admins de la empresa
    RETURN QUERY
    SELECT u.user_id, 'admin_fallback'::VARCHAR(50) as role
    FROM users u
    WHERE u.company_id = p_company_id
      AND u.role IN ('admin', 'manager')
      AND u.is_active = true
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- 7. Insertar aliases comunes para RRHH (por empresa existente)
INSERT INTO department_aliases (alias, department_id, company_id)
SELECT 'RRHH', d.id, d.company_id
FROM departments d
WHERE LOWER(d.name) LIKE '%recursos%humanos%'
   OR LOWER(d.name) LIKE '%human%resources%'
ON CONFLICT (alias, company_id) DO NOTHING;

INSERT INTO department_aliases (alias, department_id, company_id)
SELECT 'HR', d.id, d.company_id
FROM departments d
WHERE LOWER(d.name) LIKE '%recursos%humanos%'
   OR LOWER(d.name) LIKE '%human%resources%'
ON CONFLICT (alias, company_id) DO NOTHING;

-- 8. Log de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Migración department_notification_recipients completada';
    RAISE NOTICE '   - Campo notification_recipients agregado a departments';
    RAISE NOTICE '   - Campo manager_user_id agregado a departments';
    RAISE NOTICE '   - Tabla department_aliases creada';
    RAISE NOTICE '   - Función resolve_department_notification_recipients creada';
END $$;
