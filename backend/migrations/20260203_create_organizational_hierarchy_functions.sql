-- ============================================================================
-- MIGRACIÓN: Funciones PostgreSQL para Jerarquía Organizacional
-- ============================================================================
-- Fecha: 2025-02-03
-- Descripción: Crea funciones necesarias para el sistema de escalamiento
--              y organigrama que usa el módulo de notificaciones
-- NOTA: Tabla users usa user_id (UUID) y columnas camelCase (firstName, lastName)
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN: get_company_org_tree
-- Obtiene el árbol organizacional completo de una empresa
-- ============================================================================
CREATE OR REPLACE FUNCTION get_company_org_tree(p_company_id INTEGER)
RETURNS TABLE (
    position_id INTEGER,
    position_name VARCHAR(255),
    position_code VARCHAR(50),
    parent_position_id INTEGER,
    hierarchy_level INTEGER,
    branch_code VARCHAR(50),
    branch_order INTEGER,
    full_path TEXT,
    color_hex VARCHAR(7),
    can_approve_permissions BOOLEAN,
    max_approval_days INTEGER,
    is_escalation_point BOOLEAN,
    employee_count BIGINT,
    employees JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH position_employees AS (
        SELECT
            u.organizational_position_id,
            COUNT(*) as emp_count,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', u.user_id,
                        'name', u."firstName" || ' ' || u."lastName",
                        'email', u.email
                    )
                ) FILTER (WHERE u.user_id IS NOT NULL),
                '[]'::jsonb
            ) as emp_list
        FROM users u
        WHERE u.company_id = p_company_id
          AND u.is_active = true
          AND u.organizational_position_id IS NOT NULL
        GROUP BY u.organizational_position_id
    )
    SELECT
        op.id as position_id,
        op.position_name,
        op.position_code,
        op.parent_position_id,
        op.hierarchy_level,
        op.branch_code,
        op.branch_order,
        op.full_path,
        op.color_hex,
        op.can_approve_permissions,
        op.max_approval_days,
        op.is_escalation_point,
        COALESCE(pe.emp_count, 0) as employee_count,
        COALESCE(pe.emp_list, '[]'::jsonb) as employees
    FROM organizational_positions op
    LEFT JOIN position_employees pe ON pe.organizational_position_id = op.id
    WHERE op.company_id = p_company_id
      AND op.is_active = true
    ORDER BY op.hierarchy_level ASC, op.branch_code ASC, op.branch_order ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_company_org_tree IS 'Obtiene el árbol jerárquico completo de una empresa con empleados por posición';


-- ============================================================================
-- 2. FUNCIÓN: find_approver_for_employee
-- Encuentra la cadena de aprobadores para un empleado
-- ============================================================================
CREATE OR REPLACE FUNCTION find_approver_for_employee(
    p_user_id UUID,
    p_days_requested INTEGER DEFAULT 1
)
RETURNS TABLE (
    approver_id UUID,
    approver_name TEXT,
    approver_email VARCHAR(255),
    position_id INTEGER,
    position_name VARCHAR(255),
    hierarchy_level INTEGER,
    can_approve BOOLEAN,
    max_approval_days INTEGER,
    is_escalation_point BOOLEAN,
    escalation_order INTEGER
) AS $$
DECLARE
    v_user_position_id INTEGER;
    v_company_id INTEGER;
    v_current_parent_id INTEGER;
    v_order INTEGER := 0;
BEGIN
    -- Obtener posición y empresa del usuario
    SELECT u.organizational_position_id, u.company_id
    INTO v_user_position_id, v_company_id
    FROM users u
    WHERE u.user_id = p_user_id AND u.is_active = true;

    IF v_user_position_id IS NULL THEN
        RETURN; -- Usuario sin posición asignada
    END IF;

    -- Obtener el parent_position_id inicial
    SELECT op.parent_position_id
    INTO v_current_parent_id
    FROM organizational_positions op
    WHERE op.id = v_user_position_id;

    -- Recorrer la jerarquía hacia arriba
    WHILE v_current_parent_id IS NOT NULL LOOP
        v_order := v_order + 1;

        RETURN QUERY
        SELECT
            u.user_id as approver_id,
            (u."firstName" || ' ' || u."lastName")::TEXT as approver_name,
            u.email as approver_email,
            op.id as position_id,
            op.position_name,
            op.hierarchy_level,
            op.can_approve_permissions as can_approve,
            op.max_approval_days,
            op.is_escalation_point,
            v_order as escalation_order
        FROM organizational_positions op
        LEFT JOIN users u ON u.organizational_position_id = op.id AND u.is_active = true
        WHERE op.id = v_current_parent_id
          AND op.is_active = true
          AND op.can_approve_permissions = true
          AND (op.max_approval_days = 0 OR op.max_approval_days >= p_days_requested)
        LIMIT 1;

        -- Obtener siguiente nivel
        SELECT op.parent_position_id
        INTO v_current_parent_id
        FROM organizational_positions op
        WHERE op.id = v_current_parent_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_approver_for_employee IS 'Encuentra la cadena de escalamiento/aprobación para un empleado';


-- ============================================================================
-- 3. FUNCIÓN: get_position_ancestors
-- Obtiene todos los ancestros de una posición (hacia arriba en el árbol)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_position_ancestors(p_position_id INTEGER)
RETURNS TABLE (
    position_id INTEGER,
    position_name VARCHAR(255),
    position_code VARCHAR(50),
    parent_position_id INTEGER,
    hierarchy_level INTEGER,
    branch_code VARCHAR(50),
    can_approve_permissions BOOLEAN,
    max_approval_days INTEGER,
    distance_from_position INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE ancestors AS (
        -- Base case: posición inicial (no la incluimos, buscamos sus ancestros)
        SELECT
            op.parent_position_id as current_id,
            1 as distance
        FROM organizational_positions op
        WHERE op.id = p_position_id

        UNION ALL

        -- Recursive case: subir al siguiente nivel
        SELECT
            op.parent_position_id as current_id,
            a.distance + 1
        FROM ancestors a
        JOIN organizational_positions op ON op.id = a.current_id
        WHERE op.parent_position_id IS NOT NULL
    )
    SELECT
        op.id as position_id,
        op.position_name,
        op.position_code,
        op.parent_position_id,
        op.hierarchy_level,
        op.branch_code,
        op.can_approve_permissions,
        op.max_approval_days,
        a.distance as distance_from_position
    FROM ancestors a
    JOIN organizational_positions op ON op.id = a.current_id
    WHERE op.is_active = true
    ORDER BY a.distance ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_position_ancestors IS 'Obtiene ancestros de una posición ordenados por cercanía';


-- ============================================================================
-- 4. FUNCIÓN: get_position_descendants
-- Obtiene todos los descendientes de una posición (hacia abajo en el árbol)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_position_descendants(p_position_id INTEGER)
RETURNS TABLE (
    position_id INTEGER,
    position_name VARCHAR(255),
    position_code VARCHAR(50),
    parent_position_id INTEGER,
    hierarchy_level INTEGER,
    branch_code VARCHAR(50),
    employee_count BIGINT,
    distance_from_position INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE descendants AS (
        -- Base case: hijos directos de la posición
        SELECT
            op.id as current_id,
            1 as distance
        FROM organizational_positions op
        WHERE op.parent_position_id = p_position_id
          AND op.is_active = true

        UNION ALL

        -- Recursive case: bajar al siguiente nivel
        SELECT
            op.id as current_id,
            d.distance + 1
        FROM descendants d
        JOIN organizational_positions op ON op.parent_position_id = d.current_id
        WHERE op.is_active = true
    )
    SELECT
        op.id as position_id,
        op.position_name,
        op.position_code,
        op.parent_position_id,
        op.hierarchy_level,
        op.branch_code,
        (SELECT COUNT(*) FROM users u WHERE u.organizational_position_id = op.id AND u.is_active = true) as employee_count,
        d.distance as distance_from_position
    FROM descendants d
    JOIN organizational_positions op ON op.id = d.current_id
    ORDER BY d.distance ASC, op.hierarchy_level ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_position_descendants IS 'Obtiene descendientes de una posición ordenados por cercanía';


-- ============================================================================
-- 5. FUNCIÓN: update_company_position_paths
-- Actualiza los full_path de todas las posiciones de una empresa
-- ============================================================================
CREATE OR REPLACE FUNCTION update_company_position_paths(p_company_id INTEGER)
RETURNS void AS $$
BEGIN
    -- Actualizar full_path para cada posición usando CTE recursivo
    WITH RECURSIVE position_paths AS (
        -- Base case: posiciones raíz (sin padre)
        SELECT
            id,
            id::TEXT as path
        FROM organizational_positions
        WHERE company_id = p_company_id
          AND parent_position_id IS NULL
          AND is_active = true

        UNION ALL

        -- Recursive case: posiciones con padre
        SELECT
            op.id,
            pp.path || '.' || op.id::TEXT
        FROM organizational_positions op
        JOIN position_paths pp ON op.parent_position_id = pp.id
        WHERE op.company_id = p_company_id
          AND op.is_active = true
    )
    UPDATE organizational_positions op
    SET full_path = pp.path,
        updated_at = NOW()
    FROM position_paths pp
    WHERE op.id = pp.id
      AND op.company_id = p_company_id;

    -- También actualizar branch_code basado en la jerarquía si está vacío
    UPDATE organizational_positions
    SET branch_code = COALESCE(branch_code, 'B' || hierarchy_level || '-' || id),
        updated_at = NOW()
    WHERE company_id = p_company_id
      AND branch_code IS NULL
      AND is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_company_position_paths IS 'Actualiza los paths completos de todas las posiciones de una empresa';


-- ============================================================================
-- 6. FUNCIÓN AUXILIAR: get_employee_supervisor
-- Obtiene el supervisor inmediato de un empleado (más simple que la cadena completa)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_employee_supervisor(p_user_id UUID)
RETURNS TABLE (
    supervisor_id UUID,
    supervisor_name TEXT,
    supervisor_email VARCHAR(255),
    supervisor_position_id INTEGER,
    supervisor_position_name VARCHAR(255),
    supervisor_hierarchy_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sup.user_id as supervisor_id,
        (sup."firstName" || ' ' || sup."lastName")::TEXT as supervisor_name,
        sup.email as supervisor_email,
        parent_pos.id as supervisor_position_id,
        parent_pos.position_name as supervisor_position_name,
        parent_pos.hierarchy_level as supervisor_hierarchy_level
    FROM users u
    JOIN organizational_positions user_pos ON u.organizational_position_id = user_pos.id
    JOIN organizational_positions parent_pos ON user_pos.parent_position_id = parent_pos.id
    LEFT JOIN users sup ON sup.organizational_position_id = parent_pos.id AND sup.is_active = true
    WHERE u.user_id = p_user_id
      AND u.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_employee_supervisor IS 'Obtiene el supervisor inmediato de un empleado';


-- ============================================================================
-- 7. FUNCIÓN: get_escalation_chain_for_notification
-- Cadena de escalamiento optimizada para el sistema de notificaciones
-- (usada cuando el kiosk detecta llegada tarde, etc.)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_escalation_chain_for_notification(
    p_user_id UUID,
    p_notification_type VARCHAR(50) DEFAULT 'LATE_ARRIVAL'
)
RETURNS TABLE (
    notify_user_id UUID,
    notify_user_name TEXT,
    notify_user_email VARCHAR(255),
    notify_position_name VARCHAR(255),
    notify_hierarchy_level INTEGER,
    notification_priority INTEGER,
    should_email BOOLEAN,
    should_push BOOLEAN
) AS $$
DECLARE
    v_user_position_id INTEGER;
    v_company_id INTEGER;
BEGIN
    -- Obtener posición y empresa del usuario
    SELECT u.organizational_position_id, u.company_id
    INTO v_user_position_id, v_company_id
    FROM users u
    WHERE u.user_id = p_user_id AND u.is_active = true;

    IF v_user_position_id IS NULL THEN
        RETURN; -- Usuario sin posición asignada
    END IF;

    RETURN QUERY
    WITH RECURSIVE escalation AS (
        -- Base case: posición padre del usuario
        SELECT
            op.id as pos_id,
            op.parent_position_id,
            op.is_escalation_point,
            1 as priority
        FROM organizational_positions op
        WHERE op.id = (
            SELECT parent_position_id
            FROM organizational_positions
            WHERE id = v_user_position_id
        )

        UNION ALL

        -- Recursive case: subir hasta encontrar punto de escalamiento o llegar al tope
        SELECT
            op.id as pos_id,
            op.parent_position_id,
            op.is_escalation_point,
            e.priority + 1
        FROM escalation e
        JOIN organizational_positions op ON op.id = e.parent_position_id
        WHERE e.parent_position_id IS NOT NULL
          AND e.is_escalation_point = false  -- Seguir subiendo si no es punto de escalamiento
          AND e.priority < 10  -- Límite de seguridad
    )
    SELECT DISTINCT ON (u.user_id)
        u.user_id as notify_user_id,
        (u."firstName" || ' ' || u."lastName")::TEXT as notify_user_name,
        u.email as notify_user_email,
        op.position_name as notify_position_name,
        op.hierarchy_level as notify_hierarchy_level,
        e.priority as notification_priority,
        true as should_email,  -- Por defecto enviar email
        CASE
            WHEN p_notification_type IN ('LATE_ARRIVAL', 'NO_SHOW', 'EMERGENCY') THEN true
            ELSE false
        END as should_push
    FROM escalation e
    JOIN organizational_positions op ON op.id = e.pos_id
    JOIN users u ON u.organizational_position_id = op.id AND u.is_active = true
    WHERE op.is_active = true
    ORDER BY u.user_id, e.priority ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_escalation_chain_for_notification IS 'Obtiene la cadena de notificación para eventos del kiosk (llegadas tarde, etc.)';


-- ============================================================================
-- VERIFICACIÓN: Mostrar funciones creadas
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Funciones de jerarquía organizacional creadas/actualizadas:';
    RAISE NOTICE '   - get_company_org_tree(company_id)';
    RAISE NOTICE '   - find_approver_for_employee(user_id UUID, days)';
    RAISE NOTICE '   - get_position_ancestors(position_id)';
    RAISE NOTICE '   - get_position_descendants(position_id)';
    RAISE NOTICE '   - update_company_position_paths(company_id)';
    RAISE NOTICE '   - get_employee_supervisor(user_id UUID)';
    RAISE NOTICE '   - get_escalation_chain_for_notification(user_id UUID, type)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ NOTA: Tabla users usa user_id (UUID) y columnas camelCase';
END;
$$;
