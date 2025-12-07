-- ============================================================================
-- MANUAL DE PROCEDIMIENTOS - Sistema de Jerarquía Documental Estricta
--
-- Jerarquía Obligatoria (evita documentos anárquicos):
--   📜 POLÍTICA (nivel 1) - Raíz, sin padre
--   └── 📕 MANUAL (nivel 2) - DEBE pertenecer a una Política
--       └── 📋 PROCEDIMIENTO (nivel 3) - DEBE pertenecer a un Manual
--           └── 📝 INSTRUCTIVO (nivel 4) - DEBE pertenecer a un Procedimiento
--
-- Reglas:
-- 1. Solo las POLÍTICAS pueden no tener padre
-- 2. Cada documento DEBE pertenecer a su nivel superior
-- 3. No se permiten documentos huérfanos/anárquicos
-- 4. El scope se hereda del padre si no se especifica
--
-- @version 1.3.0
-- @date 2025-12-07
-- ============================================================================

-- 1. ENUM para niveles jerárquicos (más estricto que el type VARCHAR)
DO $$ BEGIN
    CREATE TYPE procedure_hierarchy_level AS ENUM (
        'politica',       -- Nivel 1: Define el "qué" y "por qué"
        'manual',         -- Nivel 2: Agrupa procedimientos relacionados
        'procedimiento',  -- Nivel 3: Define el "cómo" detallado
        'instructivo'     -- Nivel 4: Pasos específicos de una tarea
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Agregar campos de jerarquía
-- parent_id: Referencia al documento padre
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES procedures(id) ON DELETE RESTRICT;

-- hierarchy_level: Nivel en la jerarquía (1-4)
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 4 CHECK (hierarchy_level BETWEEN 1 AND 4);

-- hierarchy_path: Ruta completa para navegación eficiente (ej: "/uuid1/uuid2/uuid3")
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS hierarchy_path TEXT;

-- inherit_scope: Si TRUE, hereda el scope del padre
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS inherit_scope BOOLEAN DEFAULT true;

-- 3. Mapear tipos existentes a niveles jerárquicos
UPDATE procedures SET hierarchy_level = 1 WHERE type = 'politica' AND hierarchy_level IS NULL;
UPDATE procedures SET hierarchy_level = 2 WHERE type = 'manual' AND hierarchy_level IS NULL;
UPDATE procedures SET hierarchy_level = 3 WHERE type = 'procedimiento' AND hierarchy_level IS NULL;
UPDATE procedures SET hierarchy_level = 4 WHERE type = 'instructivo' AND hierarchy_level IS NULL;

-- 4. Comentarios
COMMENT ON COLUMN procedures.parent_id IS 'ID del documento padre en la jerarquía (NULL solo para políticas)';
COMMENT ON COLUMN procedures.hierarchy_level IS 'Nivel jerárquico: 1=política, 2=manual, 3=procedimiento, 4=instructivo';
COMMENT ON COLUMN procedures.hierarchy_path IS 'Ruta materializada para queries eficientes (/uuid1/uuid2/uuid3)';
COMMENT ON COLUMN procedures.inherit_scope IS 'Si TRUE, hereda el scope del documento padre';

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_procedures_parent ON procedures(parent_id);
CREATE INDEX IF NOT EXISTS idx_procedures_hierarchy_level ON procedures(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_procedures_hierarchy_path ON procedures(hierarchy_path);

-- ============================================================================
-- FUNCIÓN: Validar jerarquía antes de INSERT/UPDATE
-- Garantiza que no se creen documentos anárquicos
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_procedure_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_type VARCHAR(20);
    v_parent_level INTEGER;
    v_parent_company INTEGER;
    v_expected_parent_level INTEGER;
    v_new_level INTEGER;
BEGIN
    -- Determinar nivel según tipo
    v_new_level := CASE NEW.type
        WHEN 'politica' THEN 1
        WHEN 'manual' THEN 2
        WHEN 'procedimiento' THEN 3
        WHEN 'instructivo' THEN 4
        ELSE 4
    END;

    -- Sincronizar hierarchy_level con type
    NEW.hierarchy_level := v_new_level;

    -- REGLA 1: Solo las POLÍTICAS pueden no tener padre
    IF v_new_level > 1 AND NEW.parent_id IS NULL THEN
        RAISE EXCEPTION 'Los documentos de tipo "%" DEBEN tener un documento padre. Solo las políticas pueden existir sin padre.', NEW.type
            USING HINT = 'Seleccione un documento padre del nivel superior.',
                  ERRCODE = 'check_violation';
    END IF;

    -- REGLA 2: Las POLÍTICAS NO pueden tener padre
    IF v_new_level = 1 AND NEW.parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Las políticas son el nivel raíz y NO pueden tener documento padre.'
            USING HINT = 'Elimine la referencia al documento padre.',
                  ERRCODE = 'check_violation';
    END IF;

    -- Si tiene padre, validar jerarquía
    IF NEW.parent_id IS NOT NULL THEN
        -- Obtener info del padre
        SELECT type, hierarchy_level, company_id
        INTO v_parent_type, v_parent_level, v_parent_company
        FROM procedures
        WHERE id = NEW.parent_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'El documento padre con ID "%" no existe.', NEW.parent_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        -- REGLA 3: El padre debe ser del nivel inmediatamente superior
        v_expected_parent_level := v_new_level - 1;
        IF v_parent_level != v_expected_parent_level THEN
            RAISE EXCEPTION 'Jerarquía inválida: Un "%" (nivel %) debe pertenecer a un documento de nivel % (%), pero el padre seleccionado es nivel %.',
                NEW.type, v_new_level, v_expected_parent_level,
                CASE v_expected_parent_level
                    WHEN 1 THEN 'política'
                    WHEN 2 THEN 'manual'
                    WHEN 3 THEN 'procedimiento'
                    ELSE 'desconocido'
                END,
                v_parent_level
                USING HINT = format('Seleccione un documento de tipo "%s" como padre.',
                    CASE v_expected_parent_level
                        WHEN 1 THEN 'política'
                        WHEN 2 THEN 'manual'
                        WHEN 3 THEN 'procedimiento'
                        ELSE 'desconocido'
                    END),
                    ERRCODE = 'check_violation';
        END IF;

        -- REGLA 4: Padre debe ser de la misma empresa
        IF v_parent_company != NEW.company_id THEN
            RAISE EXCEPTION 'El documento padre debe pertenecer a la misma empresa.'
                USING ERRCODE = 'check_violation';
        END IF;

        -- Construir hierarchy_path
        SELECT COALESCE(hierarchy_path, '') || '/' || NEW.parent_id::TEXT
        INTO NEW.hierarchy_path
        FROM procedures
        WHERE id = NEW.parent_id;
    ELSE
        -- Es una política (raíz)
        NEW.hierarchy_path := '';
    END IF;

    -- Agregar el ID propio al path (se hará en otro trigger después del INSERT)

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trg_validate_procedure_hierarchy ON procedures;
CREATE TRIGGER trg_validate_procedure_hierarchy
    BEFORE INSERT OR UPDATE ON procedures
    FOR EACH ROW
    EXECUTE FUNCTION validate_procedure_hierarchy();

-- ============================================================================
-- FUNCIÓN: Actualizar hierarchy_path después de INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_procedure_hierarchy_path()
RETURNS TRIGGER AS $$
BEGIN
    -- Agregar el propio ID al path
    UPDATE procedures
    SET hierarchy_path = COALESCE(hierarchy_path, '') || '/' || NEW.id::TEXT
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_procedure_path ON procedures;
CREATE TRIGGER trg_update_procedure_path
    AFTER INSERT ON procedures
    FOR EACH ROW
    EXECUTE FUNCTION update_procedure_hierarchy_path();

-- ============================================================================
-- FUNCIÓN: Obtener árbol de documentos (hijos de un documento)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_procedure_children(
    p_procedure_id UUID,
    p_recursive BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    code VARCHAR(50),
    title VARCHAR(255),
    type VARCHAR(20),
    hierarchy_level INTEGER,
    parent_id UUID,
    status VARCHAR(20),
    depth INTEGER
) AS $$
BEGIN
    IF p_recursive THEN
        -- Recursivo: todos los descendientes
        RETURN QUERY
        WITH RECURSIVE tree AS (
            -- Base: hijos directos
            SELECT
                p.id, p.code, p.title, p.type, p.hierarchy_level, p.parent_id, p.status,
                1 as depth
            FROM procedures p
            WHERE p.parent_id = p_procedure_id

            UNION ALL

            -- Recursivo: hijos de hijos
            SELECT
                p.id, p.code, p.title, p.type, p.hierarchy_level, p.parent_id, p.status,
                t.depth + 1
            FROM procedures p
            INNER JOIN tree t ON p.parent_id = t.id
        )
        SELECT * FROM tree ORDER BY depth, code;
    ELSE
        -- Solo hijos directos
        RETURN QUERY
        SELECT
            p.id, p.code, p.title, p.type, p.hierarchy_level, p.parent_id, p.status,
            1 as depth
        FROM procedures p
        WHERE p.parent_id = p_procedure_id
        ORDER BY p.code;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Obtener árbol ascendente (ancestros hasta la raíz)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_procedure_ancestors(p_procedure_id UUID)
RETURNS TABLE (
    id UUID,
    code VARCHAR(50),
    title VARCHAR(255),
    type VARCHAR(20),
    hierarchy_level INTEGER,
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE tree AS (
        -- Base: el documento actual
        SELECT
            p.id, p.code, p.title, p.type, p.hierarchy_level, p.parent_id,
            0 as depth
        FROM procedures p
        WHERE p.id = p_procedure_id

        UNION ALL

        -- Recursivo: padres
        SELECT
            p.id, p.code, p.title, p.type, p.hierarchy_level, p.parent_id,
            t.depth - 1
        FROM procedures p
        INNER JOIN tree t ON p.id = t.parent_id
    )
    SELECT tree.id, tree.code, tree.title, tree.type, tree.hierarchy_level, tree.depth
    FROM tree
    WHERE tree.depth < 0  -- Excluir el documento actual
    ORDER BY tree.depth;  -- Más ancestral primero
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Obtener árbol completo de documentos para una empresa
-- (estructura jerárquica para mostrar en UI)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_procedure_tree(
    p_company_id INTEGER,
    p_root_id UUID DEFAULT NULL  -- NULL = todas las políticas
)
RETURNS TABLE (
    id UUID,
    code VARCHAR(50),
    title VARCHAR(255),
    type VARCHAR(20),
    hierarchy_level INTEGER,
    parent_id UUID,
    status VARCHAR(20),
    children_count BIGINT,
    has_children BOOLEAN,
    tree_path TEXT,
    indent_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE tree AS (
        -- Base: políticas (raíces) o documento específico
        SELECT
            p.id, p.code, p.title, p.type, p.hierarchy_level, p.parent_id, p.status,
            p.code::TEXT as tree_path,
            0 as indent_level
        FROM procedures p
        WHERE p.company_id = p_company_id
          AND (
            (p_root_id IS NULL AND p.hierarchy_level = 1)
            OR p.id = p_root_id
          )

        UNION ALL

        -- Recursivo: hijos
        SELECT
            p.id, p.code, p.title, p.type, p.hierarchy_level, p.parent_id, p.status,
            t.tree_path || ' > ' || p.code,
            t.indent_level + 1
        FROM procedures p
        INNER JOIN tree t ON p.parent_id = t.id
        WHERE p.company_id = p_company_id
    )
    SELECT
        tree.id, tree.code, tree.title, tree.type, tree.hierarchy_level, tree.parent_id, tree.status,
        (SELECT COUNT(*) FROM procedures c WHERE c.parent_id = tree.id) as children_count,
        EXISTS(SELECT 1 FROM procedures c WHERE c.parent_id = tree.id) as has_children,
        tree.tree_path,
        tree.indent_level
    FROM tree
    ORDER BY tree.tree_path;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Obtener documentos padre disponibles para un tipo
-- (para selector en formulario)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_parents(
    p_company_id INTEGER,
    p_document_type VARCHAR(20),
    p_exclude_id UUID DEFAULT NULL  -- Excluir un documento (para edición)
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
        WHEN 'manual' THEN 1        -- Padre debe ser política
        WHEN 'procedimiento' THEN 2 -- Padre debe ser manual
        WHEN 'instructivo' THEN 3   -- Padre debe ser procedimiento
        ELSE NULL                    -- Política no tiene padre
    END;

    -- Si es política, no hay padres disponibles
    IF v_parent_level IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH RECURSIVE ancestors AS (
        SELECT
            p.id, p.code, p.title, p.type, p.parent_id,
            p.code::TEXT as full_path
        FROM procedures p
        WHERE p.company_id = p_company_id
          AND p.hierarchy_level = v_parent_level
          AND p.status IN ('draft', 'pending_review', 'approved', 'published')
          AND (p_exclude_id IS NULL OR p.id != p_exclude_id)

        UNION ALL

        -- Construir path hacia arriba
        SELECT
            a.id, a.code, a.title, a.type, p.parent_id,
            p.code || ' > ' || a.full_path
        FROM ancestors a
        INNER JOIN procedures p ON p.id = a.parent_id
    )
    SELECT DISTINCT ON (ancestors.id)
        ancestors.id, ancestors.code, ancestors.title, ancestors.type,
        (SELECT full_path FROM ancestors a2 WHERE a2.id = ancestors.id ORDER BY LENGTH(a2.full_path) DESC LIMIT 1)
    FROM ancestors
    ORDER BY ancestors.id, LENGTH(ancestors.full_path) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Verificar si se puede eliminar un documento
-- (no se puede si tiene hijos)
-- ============================================================================
CREATE OR REPLACE FUNCTION can_delete_procedure(p_procedure_id UUID)
RETURNS TABLE (
    can_delete BOOLEAN,
    reason TEXT,
    children_count BIGINT,
    children_preview JSONB
) AS $$
DECLARE
    v_children_count BIGINT;
    v_children_preview JSONB;
BEGIN
    -- Contar hijos
    SELECT COUNT(*) INTO v_children_count
    FROM procedures WHERE parent_id = p_procedure_id;

    -- Si tiene hijos, obtener preview
    IF v_children_count > 0 THEN
        SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'code', code,
            'title', title,
            'type', type
        ))
        INTO v_children_preview
        FROM (
            SELECT id, code, title, type
            FROM procedures
            WHERE parent_id = p_procedure_id
            ORDER BY code
            LIMIT 10
        ) sub;

        RETURN QUERY SELECT
            false,
            format('No se puede eliminar: tiene %s documento(s) hijo(s). Elimine o reasigne los hijos primero.', v_children_count),
            v_children_count,
            v_children_preview;
    ELSE
        RETURN QUERY SELECT
            true,
            'El documento puede ser eliminado.'::TEXT,
            0::BIGINT,
            '[]'::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Mover documento a otro padre (cambiar jerarquía)
-- ============================================================================
CREATE OR REPLACE FUNCTION move_procedure_to_parent(
    p_procedure_id UUID,
    p_new_parent_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    old_path TEXT,
    new_path TEXT
) AS $$
DECLARE
    v_old_path TEXT;
    v_new_path TEXT;
    v_doc_type VARCHAR(20);
    v_doc_level INTEGER;
    v_parent_level INTEGER;
    v_expected_parent_level INTEGER;
BEGIN
    -- Obtener info del documento
    SELECT hierarchy_path, type, hierarchy_level
    INTO v_old_path, v_doc_type, v_doc_level
    FROM procedures WHERE id = p_procedure_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Documento no encontrado'::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Validar que el nuevo padre sea del nivel correcto
    v_expected_parent_level := v_doc_level - 1;

    IF v_expected_parent_level < 1 THEN
        RETURN QUERY SELECT false, 'Las políticas no pueden tener padre'::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    SELECT hierarchy_level INTO v_parent_level
    FROM procedures WHERE id = p_new_parent_id;

    IF v_parent_level != v_expected_parent_level THEN
        RETURN QUERY SELECT false,
            format('El nuevo padre debe ser de nivel %s (%s)',
                v_expected_parent_level,
                CASE v_expected_parent_level
                    WHEN 1 THEN 'política'
                    WHEN 2 THEN 'manual'
                    WHEN 3 THEN 'procedimiento'
                END
            )::TEXT,
            NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Actualizar (el trigger validará y actualizará el path)
    UPDATE procedures
    SET parent_id = p_new_parent_id,
        updated_at = NOW()
    WHERE id = p_procedure_id;

    -- Obtener nuevo path
    SELECT hierarchy_path INTO v_new_path
    FROM procedures WHERE id = p_procedure_id;

    RETURN QUERY SELECT true, 'Documento movido exitosamente'::TEXT, v_old_path, v_new_path;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VISTA: Árbol completo de documentos con estadísticas
-- ============================================================================
CREATE OR REPLACE VIEW v_procedure_hierarchy AS
SELECT
    p.id,
    p.company_id,
    p.code,
    p.title,
    p.type,
    p.hierarchy_level,
    p.parent_id,
    parent.code as parent_code,
    parent.title as parent_title,
    p.status,
    p.hierarchy_path,
    (SELECT COUNT(*) FROM procedures c WHERE c.parent_id = p.id) as children_count,
    (SELECT COUNT(*) FROM get_procedure_children(p.id, true)) as descendants_count,
    CASE p.hierarchy_level
        WHEN 1 THEN '📜'
        WHEN 2 THEN '📕'
        WHEN 3 THEN '📋'
        WHEN 4 THEN '📝'
    END as icon,
    CASE p.hierarchy_level
        WHEN 1 THEN 'Política'
        WHEN 2 THEN 'Manual'
        WHEN 3 THEN 'Procedimiento'
        WHEN 4 THEN 'Instructivo'
    END as level_name,
    p.created_at,
    p.updated_at
FROM procedures p
LEFT JOIN procedures parent ON p.parent_id = parent.id;

-- ============================================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_procedures_company_level ON procedures(company_id, hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_procedures_parent_status ON procedures(parent_id, status);

-- ============================================================================
-- RESULTADO ESPERADO:
-- - Campo parent_id para jerarquía
-- - Campo hierarchy_level sincronizado con type
-- - Campo hierarchy_path para queries eficientes
-- - Trigger que valida jerarquía estricta
-- - Funciones para navegar árbol (hijos, ancestros, árbol completo)
-- - Función para obtener padres disponibles según tipo
-- - Función para verificar si se puede eliminar
-- - Función para mover documentos entre padres
-- - Vista con estadísticas de jerarquía
-- ============================================================================
