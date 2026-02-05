-- ============================================================================
-- MIGRACIÓN: Convertir iconos FontAwesome a Emojis
-- Fecha: 2026-02-05
-- Descripción: Actualiza iconos de módulos comerciales para que sean emojis
--              en lugar de clases FontAwesome (fas fa-xxx)
-- ============================================================================

-- Iconos que estaban como FontAwesome o NULL
UPDATE system_modules SET icon = '🔏', updated_at = NOW() WHERE module_key = 'biometric-consent';
UPDATE system_modules SET icon = '📁', updated_at = NOW() WHERE module_key = 'dms-dashboard';
UPDATE system_modules SET icon = '🤝', updated_at = NOW() WHERE module_key = 'associate-marketplace';
UPDATE system_modules SET icon = '🧊', updated_at = NOW() WHERE module_key = 'hours-cube-dashboard';
UPDATE system_modules SET icon = '🏭', updated_at = NOW() WHERE module_key = 'warehouse-management';
UPDATE system_modules SET icon = '🛒', updated_at = NOW() WHERE module_key = 'procurement-management';
UPDATE system_modules SET icon = '🎫', updated_at = NOW() WHERE module_key = 'user-support';
UPDATE system_modules SET icon = '💼', updated_at = NOW() WHERE module_key = 'positions-management';
UPDATE system_modules SET icon = '📝', updated_at = NOW() WHERE module_key = 'my-procedures';

-- Verificación
DO $$
DECLARE
    problemas INTEGER;
BEGIN
    SELECT COUNT(*) INTO problemas
    FROM system_modules
    WHERE is_active = true
    AND (icon IS NULL OR icon LIKE '%fa-%');

    IF problemas > 0 THEN
        RAISE NOTICE '⚠️ Aún hay % módulos con iconos problemáticos', problemas;
    ELSE
        RAISE NOTICE '✅ Todos los iconos son emojis';
    END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
