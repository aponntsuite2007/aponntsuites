-- ============================================================================
-- MIGRACIÓN: Racionalización de Módulos Comerciales
-- Fecha: 2026-02-01
-- Descripción:
--   1. Marcar kiosks como CORE
--   2. Agregar APK Kiosk, Web Kiosk, APK Empleado como productos CORE
--   3. Agregar Marketplace como módulo OPCIONAL
--   4. Limpiar módulos que no son comerciales (internos Aponnt)
-- ============================================================================

-- ============================================================================
-- PASO 1: Actualizar kiosks como CORE
-- ============================================================================
UPDATE system_modules
SET is_core = true,
    updated_at = NOW()
WHERE module_key = 'kiosks';

-- ============================================================================
-- PASO 2: Agregar APKs y Web Kiosk como productos CORE
-- ============================================================================

-- APK Kiosk
INSERT INTO system_modules (
    id, module_key, name, icon, category, is_core, base_price,
    description, features, requirements, available_in, version,
    display_order, is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'apk-kiosk',
    'APK Kiosk',
    '📱',
    'core',
    true,
    0.00,
    'Aplicación Android para terminales de fichaje biométrico. Incluida en el paquete base.',
    '["Fichaje biométrico facial", "Modo offline", "Sincronización automática", "Multi-empresa"]',
    '[]',
    'mobile',
    '2.0.0',
    100,
    true,
    NOW(),
    NOW()
) ON CONFLICT (module_key) DO UPDATE SET
    is_core = true,
    category = 'core',
    description = EXCLUDED.description,
    updated_at = NOW();

-- Web Kiosk
INSERT INTO system_modules (
    id, module_key, name, icon, category, is_core, base_price,
    description, features, requirements, available_in, version,
    display_order, is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'web-kiosk',
    'Web Kiosk',
    '🖥️',
    'core',
    true,
    0.00,
    'Versión web del kiosko para navegadores. Ideal para tablets y PCs. Incluida en el paquete base.',
    '["Fichaje biométrico facial", "Compatible con cualquier navegador", "Sin instalación", "Responsive"]',
    '[]',
    'web',
    '2.0.0',
    101,
    true,
    NOW(),
    NOW()
) ON CONFLICT (module_key) DO UPDATE SET
    is_core = true,
    category = 'core',
    description = EXCLUDED.description,
    updated_at = NOW();

-- APK Empleado
INSERT INTO system_modules (
    id, module_key, name, icon, category, is_core, base_price,
    description, features, requirements, available_in, version,
    display_order, is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'apk-employee',
    'APK Empleado',
    '👤',
    'core',
    true,
    0.00,
    'Aplicación móvil para empleados. Consulta de recibos, vacaciones, notificaciones y más. Incluida en el paquete base.',
    '["Consulta de recibos de sueldo", "Solicitud de vacaciones", "Notificaciones push", "Fichaje remoto (si habilitado)"]',
    '[]',
    'mobile',
    '2.0.0',
    102,
    true,
    NOW(),
    NOW()
) ON CONFLICT (module_key) DO UPDATE SET
    is_core = true,
    category = 'core',
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- PASO 3: Agregar Marketplace como módulo OPCIONAL
-- ============================================================================
INSERT INTO system_modules (
    id, module_key, name, icon, category, is_core, base_price,
    description, features, requirements, available_in, version,
    display_order, is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'marketplace',
    'Marketplace',
    '🛒',
    'additional',
    false,
    50.00,
    'Marketplace de servicios y productos para empleados. Beneficios corporativos, descuentos y más.',
    '["Catálogo de beneficios", "Descuentos corporativos", "Integración con proveedores", "Reportes de uso"]',
    '[]',
    'panel-empresa',
    '1.0.0',
    50,
    true,
    NOW(),
    NOW()
) ON CONFLICT (module_key) DO UPDATE SET
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    updated_at = NOW();

-- ============================================================================
-- PASO 4: Actualizar vista v_modules_by_panel para incluir APKs
-- ============================================================================

-- Insertar en module_panel_config para que aparezcan como tarjetas
INSERT INTO module_panel_config (
    id, module_key, target_panel, show_as_card, show_in_menu,
    card_title, card_icon, display_order, is_active, created_at, updated_at
) VALUES
    (gen_random_uuid(), 'apk-kiosk', 'panel-empresa', true, false, 'APK Kiosk', '📱', 100, true, NOW(), NOW()),
    (gen_random_uuid(), 'web-kiosk', 'panel-empresa', true, false, 'Web Kiosk', '🖥️', 101, true, NOW(), NOW()),
    (gen_random_uuid(), 'apk-employee', 'panel-empresa', true, false, 'APK Empleado', '👤', 102, true, NOW(), NOW()),
    (gen_random_uuid(), 'marketplace', 'panel-empresa', true, true, 'Marketplace', '🛒', 50, true, NOW(), NOW())
ON CONFLICT (module_key, target_panel) DO UPDATE SET
    show_as_card = true,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- ============================================================================
-- PASO 5: Verificación
-- ============================================================================
DO $$
DECLARE
    core_count INTEGER;
    optional_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO core_count FROM system_modules WHERE is_core = true AND is_active = true;
    SELECT COUNT(*) INTO optional_count FROM system_modules WHERE is_core = false AND is_active = true;
    SELECT COUNT(*) INTO total_count FROM system_modules WHERE is_active = true;

    RAISE NOTICE '=== RESUMEN MIGRACIÓN ===';
    RAISE NOTICE 'Módulos CORE: %', core_count;
    RAISE NOTICE 'Módulos OPCIONALES: %', optional_count;
    RAISE NOTICE 'Total activos: %', total_count;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
