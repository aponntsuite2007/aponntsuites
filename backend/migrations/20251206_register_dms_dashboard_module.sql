/**
 * MIGRACIÓN: Registrar DMS Dashboard como módulo CORE + Limpiar módulo antiguo
 *
 * Fecha: 2025-12-06
 *
 * Este módulo es CORE porque:
 * - Es la FUENTE ÚNICA DE VERDAD DOCUMENTAL del sistema
 * - Todas las empresas lo necesitan para gestión de documentos
 * - Integra con TODOS los módulos que manejan documentos
 *
 * NO es comercial separado - viene incluido en el sistema base.
 *
 * LIMPIEZA:
 * - Elimina módulo antiguo 'document-management' (era parte del médico viejo)
 * - Reemplaza referencias en active_modules de empresas
 */

-- ============================================
-- PASO 0: LIMPIAR MÓDULO ANTIGUO
-- ============================================
DO $$
DECLARE
    v_deleted INTEGER;
    v_updated INTEGER;
BEGIN
    -- Eliminar de system_modules
    DELETE FROM system_modules WHERE module_key = 'document-management';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- Quitar de active_modules de empresas
    UPDATE companies
    SET active_modules = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(active_modules) AS elem
        WHERE elem::text != '"document-management"'
    )
    WHERE active_modules ? 'document-management';
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RAISE NOTICE '🗑️ Módulo antiguo document-management eliminado (% registros, % empresas actualizadas)', v_deleted, v_updated;
END $$;

-- ============================================
-- PASO 1: Agregar módulo DMS Dashboard
-- ============================================

-- Usar función upsert si existe
DO $$
BEGIN
    -- Verificar si existe la función upsert_module
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'upsert_module') THEN
        -- Usar la función existente
        PERFORM upsert_module(
            'dms-dashboard',
            'Gestión Documental (DMS)',
            'Sistema de Gestión Documental - Fuente Única de Verdad para todos los documentos del sistema',
            'fas fa-folder-open',
            'core'::enum_system_modules_category
        );
        RAISE NOTICE '✅ Módulo dms-dashboard registrado via upsert_module()';
    ELSE
        -- Insert directo si no existe la función
        INSERT INTO system_modules (
            id,
            module_key,
            name,
            description,
            icon,
            category,
            is_active,
            is_core,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'dms-dashboard',
            'Gestión Documental (DMS)',
            'Sistema de Gestión Documental - Fuente Única de Verdad para todos los documentos del sistema',
            'fas fa-folder-open',
            'core',
            true,
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (module_key) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            icon = EXCLUDED.icon,
            category = EXCLUDED.category,
            is_core = true,
            updated_at = NOW();
        RAISE NOTICE '✅ Módulo dms-dashboard registrado via INSERT directo';
    END IF;
END $$;

-- ============================================
-- PASO 2: Activar para TODAS las empresas
-- ============================================

-- Agregar dms-dashboard a active_modules de todas las empresas
UPDATE companies
SET
    active_modules = CASE
        WHEN active_modules IS NULL THEN '["dms-dashboard"]'::jsonb
        WHEN NOT (active_modules ? 'dms-dashboard') THEN active_modules || '["dms-dashboard"]'::jsonb
        ELSE active_modules
    END,
    updated_at = NOW()
WHERE is_active = true;

-- ============================================
-- PASO 3: Crear vista rápida para verificación
-- ============================================

-- Verificar que se registró correctamente
DO $$
DECLARE
    v_count INTEGER;
    v_companies INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM system_modules WHERE module_key = 'dms-dashboard';
    SELECT COUNT(*) INTO v_companies FROM companies WHERE active_modules ? 'dms-dashboard';

    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE ' DMS DASHBOARD - REGISTRO COMPLETADO';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE ' ✅ Módulo en system_modules: %', v_count;
    RAISE NOTICE ' ✅ Empresas con DMS activo: %', v_companies;
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
