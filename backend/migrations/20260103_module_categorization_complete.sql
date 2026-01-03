-- =====================================================
-- MIGRACIÓN: Categorización Completa de Módulos
-- =====================================================
-- Fecha: 2026-01-03
-- Descripción:
--   Define CLARAMENTE qué módulos van en cada panel
--   y cuáles son solo técnicos (visibles solo en Ingeniería)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AGREGAR METADATA DE VISIBILIDAD
-- =====================================================

COMMENT ON COLUMN system_modules.available_in IS
'Panel donde aparece el módulo:
  - company: Solo panel-empresa (módulos comerciales)
  - admin: Solo panel-administrativo (herramientas admin)
  - asociados: Solo panel-asociados (partners/proveedores)
  - both: Panel-empresa Y panel-administrativo
  - engineering-only: Solo visible en Dashboard de Ingeniería (módulos técnicos)';

COMMENT ON COLUMN system_modules.module_type IS
'Tipo de módulo:
  - standalone: Módulo independiente (tarjeta visible)
  - container: Módulo contenedor con submódulos
  - submodule: Submódulo de un container
  - android-apk: App Android complementaria (NO tarjeta)
  - ios-apk: App iOS complementaria (NO tarjeta)
  - web-widget: Widget embebible (NO tarjeta)
  - api-integration: Solo API, sin UI (NO tarjeta)
  - technical: Componente técnico (routes/services/models - NO tarjeta)';

COMMENT ON COLUMN system_modules.is_core IS
'Módulos CORE (básicos):
  - true: Incluido en licencia base, siempre visible
  - false: Opcional, se contrata por separado';

COMMENT ON COLUMN system_modules.category IS
'Categoría funcional:
  - rrhh: Recursos Humanos
  - operations: Operaciones
  - admin: Administración del sistema
  - medical: Salud ocupacional
  - legal: Legal/compliance
  - commercial: Comercial
  - technical: Componente técnico';

-- =====================================================
-- 2. ACTUALIZAR MÓDULOS ADMINISTRATIVOS
-- =====================================================

-- Configurador de Módulos → SOLO admin
UPDATE system_modules
SET
  available_in = 'admin',
  category = 'admin',
  metadata = metadata || '{"visibility": {"scope": "administrative", "showAsCard": true, "panel": "admin"}}'::jsonb
WHERE module_key = 'configurador-modulos';

-- Auditor Dashboard → SOLO admin
UPDATE system_modules
SET
  available_in = 'admin',
  category = 'admin',
  metadata = metadata || '{"visibility": {"scope": "administrative", "showAsCard": true, "panel": "admin"}}'::jsonb
WHERE module_key = 'auditor';

-- Engineering Dashboard → SOLO admin
UPDATE system_modules
SET
  available_in = 'admin',
  category = 'admin',
  metadata = metadata || '{"visibility": {"scope": "administrative", "showAsCard": true, "panel": "admin"}}'::jsonb
WHERE module_key = 'engineering-dashboard';

-- Auto-Healing Dashboard → SOLO admin
UPDATE system_modules
SET
  available_in = 'admin',
  category = 'admin',
  metadata = metadata || '{"visibility": {"scope": "administrative", "showAsCard": true, "panel": "admin"}}'::jsonb
WHERE module_key = 'auto-healing-dashboard';

-- Testing Metrics Dashboard → SOLO admin
UPDATE system_modules
SET
  available_in = 'admin',
  category = 'admin',
  metadata = metadata || '{"visibility": {"scope": "administrative", "showAsCard": true, "panel": "admin"}}'::jsonb
WHERE module_key = 'testing-metrics-dashboard';

-- =====================================================
-- 3. ACTUALIZAR APKs (NO deben aparecer como tarjetas)
-- =====================================================

UPDATE system_modules
SET
  module_type = 'android-apk',
  parent_module_key = 'kiosks',
  metadata = metadata || '{"visibility": {"scope": "commercial", "showAsCard": false, "panel": "none"}}'::jsonb
WHERE module_key = 'kiosks-apk';

-- =====================================================
-- 4. ACTUALIZAR MÓDULOS COMERCIALES CORE
-- =====================================================

UPDATE system_modules
SET
  available_in = 'company',
  is_core = true,
  metadata = metadata || '{"visibility": {"scope": "commercial", "showAsCard": true, "panel": "company"}, "commercial": {"type": "core", "standalone": true}}'::jsonb
WHERE module_key IN (
  'users',
  'companies',
  'attendance',
  'departments',
  'dashboard'
) AND is_active = true;

-- =====================================================
-- 5. ACTUALIZAR MÓDULOS COMERCIALES OPCIONALES
-- =====================================================

UPDATE system_modules
SET
  available_in = 'company',
  is_core = false,
  metadata = metadata || '{"visibility": {"scope": "commercial", "showAsCard": true, "panel": "company"}, "commercial": {"type": "optional", "standalone": true}}'::jsonb
WHERE module_key IN (
  'medical',
  'vacation-management',
  'sanctions',
  'training-management',
  'job-postings',
  'payroll-liquidation',
  'hour-bank',
  'visitors',
  'biometric-consent',
  'procedures',
  'notifications',
  'kiosks',
  'employee-360'
) AND is_active = true;

-- =====================================================
-- 6. CREAR VISTA: v_modules_by_panel
-- =====================================================

DROP VIEW IF EXISTS v_modules_by_panel CASCADE;

CREATE OR REPLACE VIEW v_modules_by_panel AS
SELECT
  module_key,
  name,
  description,
  icon,
  color,
  category,
  module_type,
  available_in,
  is_core,
  is_active,

  -- Panel de destino
  CASE
    WHEN available_in = 'admin' THEN 'panel-administrativo'
    WHEN available_in = 'company' THEN 'panel-empresa'
    WHEN available_in = 'asociados' THEN 'panel-asociados'
    WHEN available_in = 'both' AND category = 'admin' THEN 'panel-administrativo'
    WHEN available_in = 'both' THEN 'panel-empresa'
    WHEN available_in = 'engineering-only' THEN 'engineering-dashboard'
    ELSE 'unknown'
  END AS target_panel,

  -- Tipo comercial
  CASE
    WHEN module_type IN ('android-apk', 'ios-apk', 'web-widget', 'api-integration') THEN 'apk-complementaria'
    WHEN is_core = true THEN 'core'
    WHEN is_core = false AND module_type IN ('standalone', 'container') THEN 'opcional'
    WHEN category = 'admin' THEN 'administrativo'
    WHEN module_type = 'technical' THEN 'tecnico'
    ELSE 'otro'
  END AS commercial_type,

  -- ¿Se muestra como tarjeta?
  CASE
    WHEN parent_module_key IS NOT NULL THEN false
    WHEN module_type IN ('android-apk', 'ios-apk', 'web-widget', 'api-integration', 'technical') THEN false
    WHEN metadata->>'showAsCard' = 'false' THEN false
    WHEN metadata->>'hideFromDashboard' = 'true' THEN false
    ELSE true
  END AS show_as_card,

  metadata,
  display_order

FROM system_modules
WHERE is_active = true
  AND module_key != 'dashboard'
ORDER BY target_panel, display_order, name;

COMMENT ON VIEW v_modules_by_panel IS
'Vista que categoriza TODOS los módulos según su panel de destino:
- panel-empresa: Módulos comerciales (core + opcionales)
- panel-administrativo: Herramientas administrativas
- panel-asociados: Panel de partners
- engineering-dashboard: Solo módulos técnicos

commercial_type:
  - core: Incluido en licencia base
  - opcional: Se contrata por separado
  - apk-complementaria: App Android/iOS (no tarjeta)
  - administrativo: Herramienta admin
  - tecnico: Solo visible en Ingeniería

show_as_card:
  - true: Aparece como tarjeta en el panel
  - false: No aparece (APK, submódulo, técnico, etc.)';

-- =====================================================
-- 7. FUNCIÓN: get_panel_modules
-- =====================================================

CREATE OR REPLACE FUNCTION get_panel_modules(
  p_panel_name VARCHAR,
  p_company_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  module_key VARCHAR,
  name VARCHAR,
  description TEXT,
  icon VARCHAR,
  color VARCHAR,
  category VARCHAR,
  commercial_type VARCHAR,
  is_active BOOLEAN,
  base_price NUMERIC,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vm.module_key,
    vm.name,
    vm.description,
    vm.icon,
    vm.color,
    vm.category,
    vm.commercial_type,
    CASE
      WHEN p_company_id IS NULL THEN true
      ELSE COALESCE(cm.is_active, false)
    END AS is_active,
    sm.base_price,
    vm.metadata
  FROM v_modules_by_panel vm
  INNER JOIN system_modules sm ON sm.module_key = vm.module_key
  LEFT JOIN company_modules cm ON (
    cm.company_id = p_company_id
    AND cm.system_module_id = sm.id
    AND cm.activo = true
  )
  WHERE vm.target_panel = p_panel_name
    AND vm.show_as_card = true
    AND vm.is_active = true
    -- Si es company panel, mostrar core + contratados
    AND (
      p_company_id IS NULL
      OR vm.is_core = true
      OR cm.is_active = true
    )
  ORDER BY vm.display_order, vm.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_panel_modules IS
'Obtiene SOLO los módulos que deben aparecer en un panel específico.

Uso:
  -- Panel empresa (todos los módulos disponibles)
  SELECT * FROM get_panel_modules(''panel-empresa'');

  -- Panel empresa para compañía específica (solo core + contratados)
  SELECT * FROM get_panel_modules(''panel-empresa'', 11);

  -- Panel administrativo
  SELECT * FROM get_panel_modules(''panel-administrativo'');

  -- Panel asociados
  SELECT * FROM get_panel_modules(''panel-asociados'');';

-- =====================================================
-- 8. VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
  v_company_count INTEGER;
  v_admin_count INTEGER;
  v_apk_count INTEGER;
  v_technical_count INTEGER;
BEGIN
  -- Contar módulos por panel
  SELECT COUNT(*) INTO v_company_count
  FROM v_modules_by_panel
  WHERE target_panel = 'panel-empresa' AND show_as_card = true;

  SELECT COUNT(*) INTO v_admin_count
  FROM v_modules_by_panel
  WHERE target_panel = 'panel-administrativo' AND show_as_card = true;

  SELECT COUNT(*) INTO v_apk_count
  FROM v_modules_by_panel
  WHERE commercial_type = 'apk-complementaria';

  SELECT COUNT(*) INTO v_technical_count
  FROM v_modules_by_panel
  WHERE commercial_type = 'tecnico';

  RAISE NOTICE '✅ Categorización completa:';
  RAISE NOTICE '   📊 Panel Empresa: % módulos', v_company_count;
  RAISE NOTICE '   🔧 Panel Administrativo: % módulos', v_admin_count;
  RAISE NOTICE '   📱 APKs complementarias: % módulos', v_apk_count;
  RAISE NOTICE '   ⚙️  Módulos técnicos: % módulos', v_technical_count;

  -- Verificar configurador-modulos
  IF EXISTS(SELECT 1 FROM v_modules_by_panel WHERE module_key = 'configurador-modulos' AND target_panel = 'panel-administrativo') THEN
    RAISE NOTICE '✅ configurador-modulos correctamente en panel-administrativo';
  ELSE
    RAISE WARNING '❌ configurador-modulos NO está en panel-administrativo';
  END IF;

  -- Verificar kiosks-apk
  IF EXISTS(SELECT 1 FROM v_modules_by_panel WHERE module_key = 'kiosks-apk' AND show_as_card = false) THEN
    RAISE NOTICE '✅ kiosks-apk correctamente marcado como NO tarjeta';
  ELSE
    RAISE WARNING '❌ kiosks-apk aparece como tarjeta (ERROR)';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================

/*
📋 CÓMO AGREGAR MÓDULOS POR CATEGORÍA:

1️⃣  MÓDULO COMERCIAL CORE (panel-empresa):
   INSERT INTO system_modules (
     module_key, name, available_in, is_core, module_type
   ) VALUES (
     'mi-modulo', 'Mi Módulo', 'company', true, 'standalone'
   );

2️⃣  MÓDULO COMERCIAL OPCIONAL (panel-empresa):
   INSERT INTO system_modules (
     module_key, name, available_in, is_core, module_type
   ) VALUES (
     'mi-modulo', 'Mi Módulo', 'company', false, 'standalone'
   );

3️⃣  MÓDULO ADMINISTRATIVO (panel-administrativo):
   INSERT INTO system_modules (
     module_key, name, available_in, category, module_type
   ) VALUES (
     'mi-admin-tool', 'Admin Tool', 'admin', 'admin', 'standalone'
   );

4️⃣  APK COMPLEMENTARIA (NO tarjeta):
   INSERT INTO system_modules (
     module_key, name, module_type, parent_module_key, available_in
   ) VALUES (
     'mi-modulo-apk', 'Mi App Android', 'android-apk', 'mi-modulo', 'company'
   );

5️⃣  MÓDULO TÉCNICO (solo Ingeniería):
   -- Estos NO se agregan a system_modules
   -- El Brain los detecta automáticamente de los archivos .js
   -- Aparecen solo en engineering-metadata.js

📊 VER MÓDULOS POR PANEL:

-- Panel empresa (todos disponibles)
SELECT * FROM get_panel_modules('panel-empresa');

-- Panel empresa para compañía 11 (solo core + contratados)
SELECT * FROM get_panel_modules('panel-empresa', 11);

-- Panel administrativo
SELECT * FROM get_panel_modules('panel-administrativo');

-- Ver distribución completa
SELECT target_panel, commercial_type, COUNT(*) as total
FROM v_modules_by_panel
WHERE show_as_card = true
GROUP BY target_panel, commercial_type
ORDER BY target_panel, commercial_type;
*/
