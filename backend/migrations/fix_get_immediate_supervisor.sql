-- Fix get_immediate_supervisor function (departments doesn't have manager_id)
CREATE OR REPLACE FUNCTION get_immediate_supervisor(
    p_company_id INTEGER,
    p_user_id UUID
) RETURNS TABLE (
    supervisor_id UUID,
    supervisor_name TEXT,
    supervisor_email VARCHAR
) AS $$
DECLARE
    v_supervisor RECORD;
BEGIN
    -- Buscar supervisor/admin de la empresa
    SELECT
        u.user_id,
        u."firstName" || ' ' || u."lastName" as sup_name,
        u.email as sup_email
    INTO v_supervisor
    FROM users u
    WHERE u.company_id = p_company_id
    AND u.role IN ('admin', 'supervisor', 'rrhh')
    AND u.user_id != p_user_id
    AND (u."isActive" = true)
    ORDER BY
        CASE u.role
            WHEN 'supervisor' THEN 1
            WHEN 'rrhh' THEN 2
            WHEN 'admin' THEN 3
        END
    LIMIT 1;

    IF v_supervisor IS NOT NULL THEN
        RETURN QUERY SELECT v_supervisor.user_id, v_supervisor.sup_name, v_supervisor.sup_email;
    END IF;
END;
$$ LANGUAGE plpgsql;
