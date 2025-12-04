-- ============================================================================
-- TRIGGER: Sincronizar companies.active_modules desde company_modules
-- ============================================================================
-- SSOT: company_modules es la UNICA fuente de verdad
-- Este trigger mantiene companies.active_modules sincronizado por compatibilidad
-- ============================================================================

-- Funcion que sincroniza active_modules desde company_modules
CREATE OR REPLACE FUNCTION sync_active_modules_from_company_modules()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar active_modules de la empresa afectada
    UPDATE companies
    SET active_modules = (
        SELECT COALESCE(jsonb_agg(sm.module_key), '[]'::jsonb)
        FROM company_modules cm
        INNER JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = COALESCE(NEW.company_id, OLD.company_id)
          AND cm.activo = true
    )
    WHERE company_id = COALESCE(NEW.company_id, OLD.company_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para INSERT, UPDATE, DELETE en company_modules
DROP TRIGGER IF EXISTS trg_sync_active_modules ON company_modules;
CREATE TRIGGER trg_sync_active_modules
AFTER INSERT OR UPDATE OR DELETE ON company_modules
FOR EACH ROW
EXECUTE FUNCTION sync_active_modules_from_company_modules();

-- Sincronizacion inicial: actualizar TODAS las empresas
DO $$
DECLARE
    comp_id INTEGER;
BEGIN
    FOR comp_id IN SELECT DISTINCT company_id FROM company_modules LOOP
        UPDATE companies
        SET active_modules = (
            SELECT COALESCE(jsonb_agg(sm.module_key), '[]'::jsonb)
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = comp_id
              AND cm.activo = true
        )
        WHERE company_id = comp_id;
    END LOOP;
    RAISE NOTICE 'Sincronizacion inicial completada';
END $$;
