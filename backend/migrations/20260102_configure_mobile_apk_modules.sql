-- =====================================================
-- MIGRACIÓN: Configuración de Módulos APK Android
-- =====================================================
-- Fecha: 2026-01-02
-- Descripción:
--   - Configura correctamente los módulos tipo APK Android
--   - Establece relaciones parent-child entre módulos core y sus APKs
--   - Permite que el Brain entienda las dependencias
--   - Las APKs NO se muestran como tarjetas en panel-empresa
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AMPLIAR module_type PARA INCLUIR APKs
-- =====================================================

-- Eliminar el CHECK constraint actual
ALTER TABLE system_modules
DROP CONSTRAINT IF EXISTS chk_module_type;

-- Agregar el nuevo CHECK constraint con tipos de APKs
ALTER TABLE system_modules
ADD CONSTRAINT chk_module_type
CHECK (module_type IN (
    'standalone',      -- Módulo independiente normal
    'container',       -- Módulo contenedor (ej: Medical)
    'submodule',       -- Submódulo de un container
    'android-apk',     -- APK Android complementaria
    'ios-apk',         -- APK iOS complementaria (futuro)
    'web-widget',      -- Widget embebible (futuro)
    'api-integration'  -- Integración API pura (futuro)
));

-- =====================================================
-- 2. CONFIGURAR kiosks-apk CORRECTAMENTE
-- =====================================================

UPDATE system_modules
SET
    -- Tipo correcto: es una APK Android
    module_type = 'android-apk',

    -- Parent: depende del módulo Kiosks
    parent_module_key = 'kiosks',

    -- Solo disponible en mobile
    available_in = 'mobile',

    -- NO es core (es complementaria)
    is_core = false,

    -- Descripción clara
    description = 'Aplicación Android complementaria para terminales de fichaje biométrico. Convierte tablets/smartphones en kioscos de registro de asistencia.',

    -- Icon consistente
    icon = '📱',

    -- Color consistente con Kiosks
    color = '#16A085',

    -- Features específicas de APK
    features = jsonb_build_array(
        'Interfaz táctil optimizada para tablets',
        'Registro de asistencia con huella dactilar',
        'Modo kiosko (bloquea dispositivo)',
        'Funciona offline con sincronización posterior',
        'Captura foto de empleado en cada fichaje',
        'Notificaciones push en tiempo real',
        'Configuración remota desde panel web',
        'Soporte para lectores USB externos'
    ),

    -- Requirements: necesita el módulo Kiosks
    requirements = jsonb_build_array('kiosks'),

    -- Metadata técnico
    metadata = jsonb_build_object(
        'platform', 'android',
        'min_android_version', '8.0',
        'apk_package', 'com.aponnt.kiosk',
        'download_url', '/downloads/aponnt-kiosk.apk',
        'version_code', '100',
        'permissions', jsonb_build_array(
            'CAMERA',
            'FINGERPRINT',
            'INTERNET',
            'ACCESS_NETWORK_STATE',
            'WAKE_LOCK',
            'DISABLE_KEYGUARD'
        ),
        'hardware_requirements', jsonb_build_array(
            'fingerprint_sensor',
            'camera',
            'touchscreen'
        )
    ),

    -- Integración con módulo padre
    integrates_with = jsonb_build_array('kiosks'),
    provides_to = jsonb_build_array('kiosks'),

    updated_at = NOW()

WHERE module_key = 'kiosks-apk';

-- =====================================================
-- 3. ASEGURAR QUE KIOSKS SEA CONTAINER
-- =====================================================

UPDATE system_modules
SET
    -- Kiosks es un container (tiene APK child)
    module_type = 'container',

    -- Bundled modules incluye su APK
    bundled_modules = CASE
        WHEN bundled_modules ? 'kiosks-apk' THEN bundled_modules
        ELSE bundled_modules || '["kiosks-apk"]'::jsonb
    END,

    updated_at = NOW()

WHERE module_key = 'kiosks';

-- =====================================================
-- 4. CREAR VISTA PARA MÓDULOS COMERCIALIZABLES
-- =====================================================

CREATE OR REPLACE VIEW v_commercializable_modules AS
SELECT
    sm.*,
    CASE
        WHEN module_type IN ('android-apk', 'ios-apk', 'web-widget') THEN false
        ELSE true
    END AS is_commercializable,
    CASE
        WHEN parent_module_key IS NOT NULL THEN
            (SELECT name FROM system_modules WHERE module_key = sm.parent_module_key)
        ELSE NULL
    END AS parent_module_name
FROM system_modules sm
WHERE is_active = true;

COMMENT ON VIEW v_commercializable_modules IS
'Vista de módulos activos con flag is_commercializable. Las APKs y widgets NO son comercializables independientemente.';

-- =====================================================
-- 5. FUNCIÓN HELPER PARA EL BRAIN
-- =====================================================

CREATE OR REPLACE FUNCTION get_module_with_dependencies(p_module_key VARCHAR)
RETURNS TABLE (
    module_key VARCHAR,
    name VARCHAR,
    module_type VARCHAR,
    parent_module_key VARCHAR,
    child_modules JSONB,
    all_requirements JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sm.module_key,
        sm.name,
        sm.module_type,
        sm.parent_module_key,
        -- Child modules (ej: APKs del módulo)
        (
            SELECT jsonb_agg(jsonb_build_object(
                'module_key', child.module_key,
                'name', child.name,
                'module_type', child.module_type,
                'available_in', child.available_in
            ))
            FROM system_modules child
            WHERE child.parent_module_key = sm.module_key
            AND child.is_active = true
        ) AS child_modules,
        -- Requirements completos (recursivos)
        sm.requirements AS all_requirements
    FROM system_modules sm
    WHERE sm.module_key = p_module_key
    AND sm.is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_module_with_dependencies IS
'Función para el Brain: retorna un módulo con todos sus child modules (APKs, widgets) y dependencias.';

-- =====================================================
-- 6. ÍNDICES PARA OPTIMIZAR QUERIES
-- =====================================================

-- Índice para buscar APKs por parent
CREATE INDEX IF NOT EXISTS idx_apk_modules
ON system_modules(parent_module_key)
WHERE module_type IN ('android-apk', 'ios-apk');

-- Índice para módulos comercializables
CREATE INDEX IF NOT EXISTS idx_commercializable_modules
ON system_modules(is_active, module_type)
WHERE is_active = true
AND module_type NOT IN ('android-apk', 'ios-apk', 'web-widget');

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    v_kiosks_apk_count INTEGER;
    v_kiosks_type VARCHAR;
BEGIN
    -- Verificar que kiosks-apk está correctamente configurada
    SELECT COUNT(*) INTO v_kiosks_apk_count
    FROM system_modules
    WHERE module_key = 'kiosks-apk'
    AND module_type = 'android-apk'
    AND parent_module_key = 'kiosks'
    AND available_in = 'mobile';

    IF v_kiosks_apk_count = 0 THEN
        RAISE EXCEPTION 'ERROR: kiosks-apk no se configuró correctamente';
    END IF;

    -- Verificar que kiosks es container
    SELECT module_type INTO v_kiosks_type
    FROM system_modules
    WHERE module_key = 'kiosks';

    IF v_kiosks_type != 'container' THEN
        RAISE WARNING 'ADVERTENCIA: kiosks debería ser tipo container';
    END IF;

    RAISE NOTICE '✅ Migración exitosa: kiosks-apk configurada como Android APK complementaria de kiosks';
    RAISE NOTICE '✅ Vista v_commercializable_modules creada';
    RAISE NOTICE '✅ Función get_module_with_dependencies() disponible para Brain';
END $$;

COMMIT;

-- =====================================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- =====================================================

/*
1. PANEL-EMPRESA.HTML:
   - Filtrar módulos donde module_type IN ('android-apk', 'ios-apk')
   - O usar vista: SELECT * FROM v_commercializable_modules WHERE is_commercializable = true

2. BRAIN (modules-registry.json):
   - Actualizar módulo 'kiosks' para incluir:
     "mobileApps": [
       {
         "module_key": "kiosks-apk",
         "platform": "android",
         "relationship": "companion_app"
       }
     ]

3. CONFIGURADOR DE MÓDULOS:
   - Al activar 'kiosks', mostrar opción de descargar APK
   - Link: /downloads/aponnt-kiosk.apk

4. DOCUMENTACIÓN:
   - Las APKs NO aparecen como tarjetas independientes
   - Se acceden desde el módulo padre (ej: Kiosks → Descargar APK)
*/
