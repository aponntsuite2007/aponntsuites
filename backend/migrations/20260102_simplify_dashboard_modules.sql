-- =====================================================
-- MIGRACIÓN: Simplificar Sistema de Módulos Dashboard
-- =====================================================
-- Fecha: 2026-01-02
-- Descripción:
--   - Crear vista SSOT para módulos del dashboard
--   - Reglas claras y simples
--   - Eliminar complejidad innecesaria
-- =====================================================

BEGIN;

-- =====================================================
-- VISTA: v_dashboard_modules
-- Single Source of Truth para módulos del dashboard
-- =====================================================

CREATE OR REPLACE VIEW v_dashboard_modules AS
SELECT
    sm.module_key,
    sm.name,
    sm.description,
    sm.icon,
    sm.color,
    sm.category,
    sm.module_type,
    sm.parent_module_key,
    sm.available_in,
    sm.is_core,
    sm.display_order,
    sm.requirements,
    sm.features,
    sm.metadata,
    sm.base_price,
    sm.integrates_with,
    sm.provides_to,
    sm.bundled_modules,

    -- Flag si es comercializable independientemente
    CASE
        WHEN module_type IN ('android-apk', 'ios-apk', 'web-widget', 'api-integration') THEN false
        WHEN parent_module_key IS NOT NULL THEN false
        ELSE true
    END AS is_commercializable,

    -- Nombre del módulo padre si aplica
    CASE
        WHEN parent_module_key IS NOT NULL THEN
            (SELECT name FROM system_modules WHERE module_key = sm.parent_module_key)
        ELSE NULL
    END AS parent_module_name

FROM system_modules sm
WHERE
    -- REGLA 1: Módulo activo
    sm.is_active = true

    -- REGLA 2: NO es submódulo
    AND sm.parent_module_key IS NULL

    -- REGLA 3: NO es APK/widget/integración
    AND sm.module_type NOT IN ('android-apk', 'ios-apk', 'web-widget', 'api-integration')

    -- REGLA 4: NO tiene hideFromDashboard
    AND (sm.metadata IS NULL OR sm.metadata->>'hideFromDashboard' IS DISTINCT FROM 'true')

    -- REGLA 5: NO es dashboard (caso especial)
    AND sm.module_key != 'dashboard'

ORDER BY
    sm.display_order,
    sm.name;

COMMENT ON VIEW v_dashboard_modules IS
'✅ SSOT - Single Source of Truth para módulos del dashboard.
REGLAS SIMPLES:
1. is_active = true
2. parent_module_key IS NULL (no es submódulo)
3. module_type NOT IN (android-apk, ios-apk, web-widget, api-integration)
4. metadata->>hideFromDashboard != true
5. module_key != dashboard

Para AGREGAR un módulo al dashboard:
  → INSERT INTO system_modules con is_active=true

Para QUITAR un módulo del dashboard:
  → UPDATE system_modules SET is_active=false
  → O SET metadata = {..., "hideFromDashboard": true}

NO necesitas tocar código, filtros, ni JSON.';

-- =====================================================
-- FUNCIÓN HELPER: get_company_dashboard_modules
-- Módulos del dashboard para una empresa específica
-- =====================================================

CREATE OR REPLACE FUNCTION get_company_dashboard_modules(p_company_id INTEGER)
RETURNS TABLE (
    module_key VARCHAR,
    name VARCHAR,
    description TEXT,
    icon VARCHAR,
    color VARCHAR,
    category VARCHAR,
    module_type VARCHAR,
    is_core BOOLEAN,
    is_active BOOLEAN,
    base_price DECIMAL,
    features JSONB,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dm.module_key,
        dm.name,
        dm.description,
        dm.icon,
        dm.color,
        dm.category,
        dm.module_type,
        dm.is_core,
        COALESCE(cm.is_active, false) AS is_active,
        dm.base_price,
        dm.features,
        dm.metadata
    FROM v_dashboard_modules dm
    LEFT JOIN system_modules sm ON sm.module_key = dm.module_key
    LEFT JOIN company_modules cm ON (
        cm.company_id = p_company_id
        AND cm.system_module_id = sm.id
        AND cm.activo = true
    )
    -- Mostrar core modules siempre, o los que empresa tiene activos
    WHERE dm.is_core = true
       OR (cm.is_active IS NOT NULL AND cm.is_active = true)
    ORDER BY dm.display_order, dm.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_company_dashboard_modules IS
'Retorna SOLO los módulos que debe ver una empresa específica:
- Todos los core modules (siempre visibles)
- Módulos que la empresa tiene activos en company_modules
Ya viene filtrado por v_dashboard_modules (no APKs, no submódulos, etc.)';

-- =====================================================
-- ÍNDICE PARA OPTIMIZAR
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_system_modules_dashboard
ON system_modules(is_active, parent_module_key, module_type)
WHERE is_active = true
  AND parent_module_key IS NULL
  AND module_type NOT IN ('android-apk', 'ios-apk', 'web-widget', 'api-integration');

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
    v_dashboard_count INTEGER;
    v_kiosks_apk_visible BOOLEAN;
BEGIN
    -- Contar módulos en vista
    SELECT COUNT(*) INTO v_dashboard_count
    FROM v_dashboard_modules;

    RAISE NOTICE '✅ Vista v_dashboard_modules creada: % módulos visibles', v_dashboard_count;

    -- Verificar que kiosks-apk NO esté visible
    SELECT EXISTS(
        SELECT 1 FROM v_dashboard_modules
        WHERE module_key = 'kiosks-apk'
    ) INTO v_kiosks_apk_visible;

    IF v_kiosks_apk_visible THEN
        RAISE WARNING '❌ ERROR: kiosks-apk aparece en vista (no debería)';
    ELSE
        RAISE NOTICE '✅ kiosks-apk correctamente excluido de vista';
    END IF;

    -- Verificar que kiosks SÍ esté visible
    IF NOT EXISTS(SELECT 1 FROM v_dashboard_modules WHERE module_key = 'kiosks') THEN
        RAISE WARNING '⚠️ ADVERTENCIA: kiosks no aparece en vista';
    ELSE
        RAISE NOTICE '✅ kiosks correctamente incluido en vista';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================

/*
📋 CÓMO USAR ESTO:

1. AGREGAR MÓDULO AL DASHBOARD:
   INSERT INTO system_modules (
       module_key, name, module_type, is_active, ...
   ) VALUES (
       'mi-modulo', 'Mi Módulo', 'standalone', true, ...
   );
   ✅ Aparecerá automáticamente en v_dashboard_modules

2. QUITAR MÓDULO DEL DASHBOARD:
   UPDATE system_modules
   SET is_active = false
   WHERE module_key = 'mi-modulo';
   ✅ Desaparecerá automáticamente de v_dashboard_modules

3. OCULTAR TEMPORALMENTE (sin desactivar):
   UPDATE system_modules
   SET metadata = metadata || '{"hideFromDashboard": true}'::jsonb
   WHERE module_key = 'mi-modulo';
   ✅ No aparece en dashboard pero sigue activo

4. EN EL BACKEND:
   // Obtener módulos para una empresa
   const modules = await sequelize.query(
       'SELECT * FROM get_company_dashboard_modules(:companyId)',
       { replacements: { companyId: 11 }, type: QueryTypes.SELECT }
   );

5. VERIFICAR QUÉ MÓDULOS APARECEN:
   SELECT module_key, name, category, is_commercializable
   FROM v_dashboard_modules
   ORDER BY category, name;

NO necesitas:
❌ Editar modulesRoutes.js
❌ Editar modules-registry.json
❌ Agregar filtros manuales
❌ Reiniciar servidor (para ver cambios en BD)

SOLO necesitas:
✅ INSERT/UPDATE en system_modules
✅ Refrescar navegador
*/
