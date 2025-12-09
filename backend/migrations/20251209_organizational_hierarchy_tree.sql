-- ============================================================================
-- ORGANIZATIONAL HIERARCHY TREE - SISTEMA DE ORGANIGRAMA JERARQUICO
-- ============================================================================
-- Migración: 20251209_organizational_hierarchy_tree.sql
-- Descripción: Agrega campos para construir árbol jerárquico completo
--              que servirá como SSOT para escalamiento de notificaciones,
--              permisos y visualización de organigrama.
--
-- Ejemplo de estructura:
--   Nivel 0, Rama 0: CEO/Director General
--   Nivel 1, Rama 1: Gerente Administrativo
--   Nivel 1, Rama 2: Gerente de Producción
--   Nivel 1, Rama 3: Gerente Comercial
--   Nivel 2, Rama 1: Jefe de RRHH (reporta a Gerente Administrativo)
--   Nivel 2, Rama 2: Jefe de Planta (reporta a Gerente de Producción)
--
-- Fecha: 2025-12-09
-- ============================================================================

-- 1. Agregar columna hierarchy_level (nivel en el árbol, 0 = más alto)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizational_positions'
        AND column_name = 'hierarchy_level'
    ) THEN
        ALTER TABLE organizational_positions
        ADD COLUMN hierarchy_level INTEGER NOT NULL DEFAULT 99;

        COMMENT ON COLUMN organizational_positions.hierarchy_level IS
            'Nivel jerárquico en el organigrama (0=CEO/Director, 1=Gerentes, 2=Jefes, 3=Supervisores, 4+=Operativos)';
    END IF;
END $$;

-- 2. Agregar columna branch_code (código de rama para distinguir áreas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizational_positions'
        AND column_name = 'branch_code'
    ) THEN
        ALTER TABLE organizational_positions
        ADD COLUMN branch_code VARCHAR(50);

        COMMENT ON COLUMN organizational_positions.branch_code IS
            'Código de rama para identificar el área/departamento en el organigrama (ej: ADM, PROD, COM, RRHH)';
    END IF;
END $$;

-- 3. Agregar columna branch_order (orden dentro de la rama)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizational_positions'
        AND column_name = 'branch_order'
    ) THEN
        ALTER TABLE organizational_positions
        ADD COLUMN branch_order INTEGER DEFAULT 0;

        COMMENT ON COLUMN organizational_positions.branch_order IS
            'Orden de visualización dentro de posiciones del mismo nivel y rama';
    END IF;
END $$;

-- 4. Agregar columna full_path (ruta completa en el árbol para queries rápidas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizational_positions'
        AND column_name = 'full_path'
    ) THEN
        ALTER TABLE organizational_positions
        ADD COLUMN full_path TEXT;

        COMMENT ON COLUMN organizational_positions.full_path IS
            'Ruta completa de IDs desde raíz (ej: 1.5.12.45) para queries de descendientes';
    END IF;
END $$;

-- 5. Agregar columna is_escalation_point (punto de escalamiento para notificaciones)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizational_positions'
        AND column_name = 'is_escalation_point'
    ) THEN
        ALTER TABLE organizational_positions
        ADD COLUMN is_escalation_point BOOLEAN DEFAULT false;

        COMMENT ON COLUMN organizational_positions.is_escalation_point IS
            'Indica si esta posición es un punto de escalamiento para aprobaciones';
    END IF;
END $$;

-- 6. Agregar columna can_approve_permissions (puede aprobar permisos)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizational_positions'
        AND column_name = 'can_approve_permissions'
    ) THEN
        ALTER TABLE organizational_positions
        ADD COLUMN can_approve_permissions BOOLEAN DEFAULT false;

        COMMENT ON COLUMN organizational_positions.can_approve_permissions IS
            'Indica si esta posición puede aprobar permisos de ingreso/ausencia';
    END IF;
END $$;

-- 7. Agregar columna max_approval_days (días máximos que puede aprobar)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizational_positions'
        AND column_name = 'max_approval_days'
    ) THEN
        ALTER TABLE organizational_positions
        ADD COLUMN max_approval_days INTEGER DEFAULT 0;

        COMMENT ON COLUMN organizational_positions.max_approval_days IS
            'Máximo de días de ausencia que esta posición puede aprobar sin escalar';
    END IF;
END $$;

-- 8. Agregar columna color_hex (color para visualización en organigrama)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizational_positions'
        AND column_name = 'color_hex'
    ) THEN
        ALTER TABLE organizational_positions
        ADD COLUMN color_hex VARCHAR(7) DEFAULT '#3B82F6';

        COMMENT ON COLUMN organizational_positions.color_hex IS
            'Color hexadecimal para visualización en organigrama';
    END IF;
END $$;

-- 9. Crear índices para consultas jerárquicas eficientes
CREATE INDEX IF NOT EXISTS idx_org_positions_hierarchy_level
    ON organizational_positions(company_id, hierarchy_level);

CREATE INDEX IF NOT EXISTS idx_org_positions_branch
    ON organizational_positions(company_id, branch_code);

CREATE INDEX IF NOT EXISTS idx_org_positions_full_path
    ON organizational_positions(company_id, full_path);

CREATE INDEX IF NOT EXISTS idx_org_positions_escalation
    ON organizational_positions(company_id, is_escalation_point)
    WHERE is_escalation_point = true;

-- ============================================================================
-- FUNCIONES PARA GESTIÓN JERÁRQUICA
-- ============================================================================

-- 10. Función: Obtener todos los ancestros (cadena de escalamiento)
CREATE OR REPLACE FUNCTION get_position_ancestors(p_position_id INTEGER)
RETURNS TABLE (
    position_id INTEGER,
    position_name VARCHAR(100),
    position_code VARCHAR(30),
    hierarchy_level INTEGER,
    branch_code VARCHAR(50),
    can_approve_permissions BOOLEAN,
    max_approval_days INTEGER,
    level_distance INTEGER
) AS $$
DECLARE
    v_current_id INTEGER := p_position_id;
    v_parent_id INTEGER;
    v_level INTEGER := 0;
BEGIN
    -- Subir por el árbol hasta llegar a la raíz
    WHILE v_current_id IS NOT NULL LOOP
        -- Obtener el padre de la posición actual
        SELECT op.parent_position_id INTO v_parent_id
        FROM organizational_positions op
        WHERE op.id = v_current_id;

        IF v_parent_id IS NOT NULL THEN
            v_level := v_level + 1;

            RETURN QUERY
            SELECT
                op.id,
                op.position_name,
                op.position_code,
                op.hierarchy_level,
                op.branch_code,
                op.can_approve_permissions,
                op.max_approval_days,
                v_level
            FROM organizational_positions op
            WHERE op.id = v_parent_id;
        END IF;

        v_current_id := v_parent_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 11. Función: Obtener todos los descendientes de una posición
CREATE OR REPLACE FUNCTION get_position_descendants(p_position_id INTEGER)
RETURNS TABLE (
    position_id INTEGER,
    position_name VARCHAR(100),
    position_code VARCHAR(30),
    hierarchy_level INTEGER,
    branch_code VARCHAR(50),
    parent_position_id INTEGER,
    level_depth INTEGER
) AS $$
WITH RECURSIVE position_tree AS (
    -- Caso base: hijos directos
    SELECT
        op.id,
        op.position_name,
        op.position_code,
        op.hierarchy_level,
        op.branch_code,
        op.parent_position_id,
        1 AS level_depth
    FROM organizational_positions op
    WHERE op.parent_position_id = p_position_id
    AND op.is_active = true

    UNION ALL

    -- Caso recursivo: hijos de los hijos
    SELECT
        op.id,
        op.position_name,
        op.position_code,
        op.hierarchy_level,
        op.branch_code,
        op.parent_position_id,
        pt.level_depth + 1
    FROM organizational_positions op
    INNER JOIN position_tree pt ON op.parent_position_id = pt.id
    WHERE op.is_active = true
)
SELECT * FROM position_tree ORDER BY level_depth, branch_code, position_name;
$$ LANGUAGE sql;

-- 12. Función: Obtener árbol completo de la empresa
CREATE OR REPLACE FUNCTION get_company_org_tree(p_company_id INTEGER)
RETURNS TABLE (
    position_id INTEGER,
    position_name VARCHAR(100),
    position_code VARCHAR(30),
    hierarchy_level INTEGER,
    branch_code VARCHAR(50),
    parent_position_id INTEGER,
    full_path TEXT,
    employee_count BIGINT,
    is_escalation_point BOOLEAN,
    can_approve_permissions BOOLEAN,
    color_hex VARCHAR(7),
    tree_depth INTEGER
) AS $$
WITH RECURSIVE org_tree AS (
    -- Raíces (posiciones sin padre o nivel 0)
    SELECT
        op.id,
        op.position_name,
        op.position_code,
        op.hierarchy_level,
        op.branch_code,
        op.parent_position_id,
        op.id::TEXT AS calculated_path,
        0 AS tree_depth
    FROM organizational_positions op
    WHERE op.company_id = p_company_id
    AND op.is_active = true
    AND (op.parent_position_id IS NULL OR op.hierarchy_level = 0)

    UNION ALL

    -- Hijos
    SELECT
        op.id,
        op.position_name,
        op.position_code,
        op.hierarchy_level,
        op.branch_code,
        op.parent_position_id,
        ot.calculated_path || '.' || op.id::TEXT,
        ot.tree_depth + 1
    FROM organizational_positions op
    INNER JOIN org_tree ot ON op.parent_position_id = ot.id
    WHERE op.company_id = p_company_id
    AND op.is_active = true
)
SELECT
    ot.id AS position_id,
    ot.position_name,
    ot.position_code,
    ot.hierarchy_level,
    ot.branch_code,
    ot.parent_position_id,
    ot.calculated_path AS full_path,
    COALESCE(emp.cnt, 0) AS employee_count,
    op.is_escalation_point,
    op.can_approve_permissions,
    op.color_hex,
    ot.tree_depth
FROM org_tree ot
LEFT JOIN organizational_positions op ON ot.id = op.id
LEFT JOIN (
    SELECT organizational_position_id, COUNT(*) as cnt
    FROM users
    WHERE is_active = true
    GROUP BY organizational_position_id
) emp ON ot.id = emp.organizational_position_id
ORDER BY ot.tree_depth, ot.hierarchy_level, ot.branch_code, ot.position_name;
$$ LANGUAGE sql;

-- 13. Función: Encontrar aprobador para un empleado
CREATE OR REPLACE FUNCTION find_approver_for_employee(
    p_user_id INTEGER,
    p_days_requested INTEGER DEFAULT 1
)
RETURNS TABLE (
    approver_position_id INTEGER,
    approver_position_name VARCHAR(100),
    approver_user_id INTEGER,
    approver_name TEXT,
    approver_email VARCHAR(255),
    escalation_level INTEGER
) AS $$
DECLARE
    v_employee_position_id INTEGER;
    v_current_position_id INTEGER;
    v_escalation_level INTEGER := 0;
    v_found BOOLEAN := false;
BEGIN
    -- Obtener posición del empleado
    SELECT organizational_position_id INTO v_employee_position_id
    FROM users
    WHERE id = p_user_id;

    IF v_employee_position_id IS NULL THEN
        RETURN;
    END IF;

    v_current_position_id := v_employee_position_id;

    -- Buscar hacia arriba en la jerarquía
    FOR rec IN (
        SELECT * FROM get_position_ancestors(v_employee_position_id)
    ) LOOP
        v_escalation_level := v_escalation_level + 1;

        -- Verificar si puede aprobar la cantidad de días solicitados
        IF rec.can_approve_permissions = true AND
           (rec.max_approval_days >= p_days_requested OR rec.max_approval_days = 0) THEN

            -- Buscar usuarios en esta posición
            RETURN QUERY
            SELECT
                rec.position_id,
                rec.position_name,
                u.id,
                CONCAT(u.first_name, ' ', u.last_name),
                u.email,
                v_escalation_level
            FROM users u
            WHERE u.organizational_position_id = rec.position_id
            AND u.is_active = true
            LIMIT 1;

            v_found := true;
            EXIT;
        END IF;
    END LOOP;

    -- Si no encontramos aprobador específico, retornar el nivel más alto
    IF NOT v_found THEN
        RETURN QUERY
        SELECT
            op.id,
            op.position_name,
            u.id,
            CONCAT(u.first_name, ' ', u.last_name),
            u.email,
            99 -- Nivel máximo
        FROM organizational_positions op
        LEFT JOIN users u ON u.organizational_position_id = op.id AND u.is_active = true
        WHERE op.company_id = (SELECT company_id FROM users WHERE id = p_user_id)
        AND op.hierarchy_level = 0
        AND op.is_active = true
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 14. Función: Actualizar full_path de todas las posiciones de una empresa
CREATE OR REPLACE FUNCTION update_company_position_paths(p_company_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    WITH RECURSIVE path_calc AS (
        -- Raíces
        SELECT
            id,
            id::TEXT AS new_path
        FROM organizational_positions
        WHERE company_id = p_company_id
        AND (parent_position_id IS NULL OR hierarchy_level = 0)
        AND is_active = true

        UNION ALL

        -- Hijos
        SELECT
            op.id,
            pc.new_path || '.' || op.id::TEXT
        FROM organizational_positions op
        INNER JOIN path_calc pc ON op.parent_position_id = pc.id
        WHERE op.company_id = p_company_id
        AND op.is_active = true
    )
    UPDATE organizational_positions op
    SET full_path = pc.new_path
    FROM path_calc pc
    WHERE op.id = pc.id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- 15. Vista: Organigrama con empleados
CREATE OR REPLACE VIEW vw_organizational_chart AS
SELECT
    op.company_id,
    op.id AS position_id,
    op.position_code,
    op.position_name,
    op.description,
    op.hierarchy_level,
    op.branch_code,
    op.branch_order,
    op.parent_position_id,
    parent.position_name AS parent_position_name,
    op.full_path,
    op.is_escalation_point,
    op.can_approve_permissions,
    op.max_approval_days,
    op.color_hex,
    op.department_id,
    d.name AS department_name,
    COUNT(u.id) AS employee_count,
    ARRAY_AGG(
        CASE WHEN u.id IS NOT NULL
        THEN jsonb_build_object(
            'id', u.id,
            'name', CONCAT(u.first_name, ' ', u.last_name),
            'email', u.email,
            'photo_url', u.photo_url
        )
        ELSE NULL END
    ) FILTER (WHERE u.id IS NOT NULL) AS employees
FROM organizational_positions op
LEFT JOIN organizational_positions parent ON op.parent_position_id = parent.id
LEFT JOIN departments d ON op.department_id = d.id
LEFT JOIN users u ON u.organizational_position_id = op.id AND u.is_active = true
WHERE op.is_active = true
GROUP BY
    op.company_id, op.id, op.position_code, op.position_name, op.description,
    op.hierarchy_level, op.branch_code, op.branch_order, op.parent_position_id,
    parent.position_name, op.full_path, op.is_escalation_point,
    op.can_approve_permissions, op.max_approval_days, op.color_hex,
    op.department_id, d.name
ORDER BY op.hierarchy_level, op.branch_code, op.branch_order;

-- ============================================================================
-- DATOS DE EJEMPLO (solo si no existen posiciones con hierarchy_level)
-- ============================================================================

-- Actualizar posiciones existentes que no tienen hierarchy_level configurado
UPDATE organizational_positions
SET hierarchy_level = CASE
    WHEN level_order >= 5 THEN 0  -- Director
    WHEN level_order = 4 THEN 1   -- Gerente
    WHEN level_order = 3 THEN 2   -- Jefe/Supervisor
    WHEN level_order = 2 THEN 3   -- Técnico/Analista
    ELSE 4                         -- Operativo
END
WHERE hierarchy_level = 99 OR hierarchy_level IS NULL;

-- Actualizar branch_code basado en departamento si está vacío
UPDATE organizational_positions op
SET branch_code = UPPER(LEFT(REGEXP_REPLACE(d.name, '[^a-zA-Z]', '', 'g'), 4))
FROM departments d
WHERE op.department_id = d.id
AND (op.branch_code IS NULL OR op.branch_code = '');

-- Configurar posiciones de nivel 0-2 como puntos de escalamiento
UPDATE organizational_positions
SET
    is_escalation_point = true,
    can_approve_permissions = true,
    max_approval_days = CASE
        WHEN hierarchy_level = 0 THEN 0  -- Sin límite
        WHEN hierarchy_level = 1 THEN 30 -- Hasta 30 días
        WHEN hierarchy_level = 2 THEN 5  -- Hasta 5 días
        ELSE 0
    END
WHERE hierarchy_level <= 2;

-- Asignar colores por nivel
UPDATE organizational_positions
SET color_hex = CASE hierarchy_level
    WHEN 0 THEN '#1E3A8A'  -- Azul oscuro (Director)
    WHEN 1 THEN '#3B82F6'  -- Azul (Gerente)
    WHEN 2 THEN '#10B981'  -- Verde (Jefe)
    WHEN 3 THEN '#F59E0B'  -- Naranja (Técnico)
    ELSE '#6B7280'          -- Gris (Operativo)
END
WHERE color_hex = '#3B82F6' OR color_hex IS NULL;

-- Ejecutar actualización de paths
SELECT update_company_position_paths(company_id)
FROM (SELECT DISTINCT company_id FROM organizational_positions WHERE is_active = true) sub;

-- ============================================================================
-- REGISTRO DE MIGRACIÓN
-- ============================================================================
INSERT INTO migrations_log (migration_name, executed_at, description)
VALUES (
    '20251209_organizational_hierarchy_tree',
    NOW(),
    'Agrega campos hierarchy_level, branch_code y funciones para organigrama jerárquico SSOT'
) ON CONFLICT DO NOTHING;

-- Verificar resultado
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'organizational_positions'
    AND column_name IN ('hierarchy_level', 'branch_code', 'full_path', 'is_escalation_point');

    RAISE NOTICE '✅ Migración completada: % nuevas columnas agregadas a organizational_positions', v_count;
END $$;
