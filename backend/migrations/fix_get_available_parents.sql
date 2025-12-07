-- Fix: Ambiguous column reference in get_available_parents
CREATE OR REPLACE FUNCTION get_available_parents(
    p_company_id INTEGER,
    p_document_type VARCHAR(20),
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    code VARCHAR(50),
    title VARCHAR(255),
    type VARCHAR(20),
    full_path TEXT
) AS $$
DECLARE
    v_parent_level INTEGER;
BEGIN
    -- Determinar nivel del padre requerido
    v_parent_level := CASE p_document_type
        WHEN 'manual' THEN 1        -- Padre debe ser politica
        WHEN 'procedimiento' THEN 2 -- Padre debe ser manual
        WHEN 'instructivo' THEN 3   -- Padre debe ser procedimiento
        ELSE NULL                    -- Politica no tiene padre
    END;

    -- Si es politica, no hay padres disponibles
    IF v_parent_level IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.code,
        p.title,
        p.type,
        COALESCE(
            (SELECT pp.code || ' > ' || p.code FROM procedures pp WHERE pp.id = p.parent_id),
            p.code::TEXT
        ) as full_path
    FROM procedures p
    WHERE p.company_id = p_company_id
      AND p.hierarchy_level = v_parent_level
      AND p.status IN ('draft', 'pending_review', 'approved', 'published')
      AND (p_exclude_id IS NULL OR p.id != p_exclude_id)
    ORDER BY p.code;
END;
$$ LANGUAGE plpgsql;
