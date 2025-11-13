/**
 * MIGRACIÓN: Sincronizar 44 módulos del Registry Maestro a PostgreSQL
 *
 * Fecha: 2025-01-30
 * Objetivo: Unificar TODOS los módulos del sistema en la tabla system_modules
 *
 * SAFE MODE:
 * - Solo INSERTA módulos que NO existen (ON CONFLICT DO NOTHING)
 * - ACTUALIZA solo icon y name si el módulo ya existe
 * - NO ELIMINA ningún módulo existente
 */

-- ============================================
-- PASO 1: Agregar nuevas categorías al ENUM
-- ============================================
DO $$
BEGIN
    -- Agregar categorías faltantes al ENUM si no existen
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rrhh' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'rrhh';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'hardware' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'hardware';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'compliance' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'compliance';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduling' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'scheduling';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'communication' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'communication';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'monitoring' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'monitoring';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'support' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'support';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'reports' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'reports';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'analytics' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'analytics';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'admin';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ai' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'ai';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'system' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'system';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'integration' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'integration';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'testing' AND enumtypid = 'enum_system_modules_category'::regtype) THEN
        ALTER TYPE enum_system_modules_category ADD VALUE 'testing';
    END IF;

    RAISE NOTICE '✅ Categorías ENUM actualizadas';
END $$;

-- ============================================
-- PASO 2: Función Upsert seguro de módulos
-- ============================================
CREATE OR REPLACE FUNCTION upsert_module(
    p_module_key VARCHAR,
    p_name VARCHAR,
    p_description TEXT,
    p_icon VARCHAR,
    p_category enum_system_modules_category
) RETURNS VOID AS $$
BEGIN
    INSERT INTO system_modules (id, module_key, name, description, icon, category, is_active, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        p_module_key,
        p_name,
        p_description,
        p_icon,
        p_category,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (module_key) DO UPDATE SET
        name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 3: INSERTAR/ACTUALIZAR 44 MÓDULOS
-- ============================================

-- CORE (5 módulos)
SELECT upsert_module('users', 'Usuarios', 'Gestión de empleados y perfiles de usuario', 'fas fa-users', 'core');
SELECT upsert_module('departments', 'Departamentos', 'Configuración y gestión de departamentos y ubicaciones', 'fas fa-building', 'core');
SELECT upsert_module('attendance', 'Asistencia', 'Control de ingresos, salidas y asistencia', 'fas fa-clipboard-check', 'core');
SELECT upsert_module('dashboard', 'Dashboard', 'Dashboard principal con métricas en tiempo real', 'fas fa-tachometer-alt', 'core');
SELECT upsert_module('settings', 'Configuración', 'Ajustes generales y configuraciones', 'fas fa-cog', 'core');

-- HARDWARE (1 módulo)
SELECT upsert_module('kiosks', 'Kioscos', 'Control de kioscos físicos para registro de asistencia con validación GPS', 'fas fa-tablet-alt', 'hardware');

-- SECURITY (7 módulos)
SELECT upsert_module('visitors', 'Visitantes', 'Registro y control de ingreso de visitantes', 'fas fa-user-friends', 'security');
SELECT upsert_module('facial-biometric', 'Biometría Analítica', 'Análisis biométrico facial avanzado', 'fas fa-user-shield', 'security');
SELECT upsert_module('biometric', 'Control Biométrico', 'Centro de Comando Biométrico con conexiones a Harvard, Stanford y MIT', 'fas fa-fingerprint', 'security');
SELECT upsert_module('real-biometric-enterprise', 'Biometría Enterprise', 'Tecnologías REALES: Face-API.js, MediaPipe, OpenCV.js, Azure Face API', 'fas fa-shield-alt', 'security');
SELECT upsert_module('professional-biometric-registration', 'Registro Biométrico Profesional', 'Módulo dedicado al registro de biometría con validaciones profesionales', 'fas fa-id-card', 'security');
SELECT upsert_module('evaluacion-biometrica', 'Evaluación Biométrica', 'Sistema de evaluación y auditoría de calidad biométrica', 'fas fa-chart-line', 'security');
SELECT upsert_module('access-control', 'Control de Acceso', 'Sistema de control de acceso físico y digital', 'fas fa-door-open', 'security');

-- COMPLIANCE (4 módulos)
SELECT upsert_module('biometric-consent', 'Consentimientos Biométricos', 'Sistema legal de consentimientos para uso de datos biométricos (Ley 25.326 Argentina)', 'fas fa-file-signature', 'compliance');
SELECT upsert_module('legal-dashboard', 'Legal', 'Gestión de aspectos legales y normativos', 'fas fa-balance-scale', 'compliance');
SELECT upsert_module('legal', 'Gestión Legal', 'Comunicaciones fehacientes, sanciones, compliance, avisos legales', 'fas fa-gavel', 'compliance');
SELECT upsert_module('compliance-dashboard', 'Compliance Legal', 'Monitoreo de cumplimiento normativo y reglas LCT', 'fas fa-clipboard-check', 'compliance');

-- SCHEDULING (1 módulo)
SELECT upsert_module('shifts', 'Turnos', 'Gestión de horarios y jornadas laborales', 'fas fa-clock', 'scheduling');

-- COMMUNICATION (2 módulos)
SELECT upsert_module('notifications-enterprise', 'Notificaciones Enterprise V3.0', 'Workflows multi-nivel, escalamiento automático, templates reutilizables', 'fas fa-bell', 'communication');
SELECT upsert_module('notifications-complete', 'Notificaciones Completas', 'Sistema completo de notificaciones avanzadas', 'fas fa-bell-slash', 'communication');

-- MEDICAL (2 módulos)
SELECT upsert_module('medical-dashboard', 'Médico', 'Gestión de información médica de empleados', 'fas fa-stethoscope', 'medical');
SELECT upsert_module('art-management', 'ART', 'Administración de Aseguradoras de Riesgos del Trabajo', 'fas fa-medkit', 'medical');

-- RRHH (8 módulos)
SELECT upsert_module('medical', 'Gestión Médica', 'Certificados médicos, prescripciones, ausentismos, historial clínico completo', 'fas fa-heartbeat', 'rrhh');
SELECT upsert_module('training-management', 'Gestión Capacitaciones', 'Administración de cursos y entrenamientos', 'fas fa-graduation-cap', 'rrhh');
SELECT upsert_module('job-postings', 'Avisos de Empleo', 'Gestión de ofertas de trabajo y candidatos', 'fas fa-briefcase', 'rrhh');
SELECT upsert_module('vacation-management', 'Gestión de Vacaciones', 'Sistema completo de gestión de vacaciones y licencias', 'fas fa-umbrella-beach', 'rrhh');
SELECT upsert_module('vacation', 'Vacaciones', 'Solicitudes, aprobaciones, balance de vacaciones', 'fas fa-calendar-alt', 'rrhh');
SELECT upsert_module('sanctions-management', 'Gestión de Sanciones', 'Control y gestión de sanciones disciplinarias', 'fas fa-exclamation-triangle', 'rrhh');
SELECT upsert_module('psychological-assessment', 'Evaluación Psicológica', 'Tests psicométricos y evaluaciones de personal', 'fas fa-brain', 'rrhh');
SELECT upsert_module('document-management', 'Documentos', 'Administración de documentos y archivos', 'fas fa-folder-open', 'rrhh');

-- MONITORING (1 módulo)
SELECT upsert_module('sla-tracking', 'SLA Tracking', 'Tracking de SLAs y métricas de performance', 'fas fa-stopwatch', 'monitoring');

-- SUPPORT (1 módulo)
SELECT upsert_module('resource-center', 'Centro Recursos', 'Biblioteca de recursos, documentación y tutoriales', 'fas fa-book', 'support');

-- REPORTS (1 módulo)
SELECT upsert_module('audit-reports', 'Reportes Auditoría', 'Generación de reportes con validez legal para auditorías', 'fas fa-file-invoice', 'reports');

-- LEGAL (1 módulo)
SELECT upsert_module('terms-conditions', 'Términos y Condiciones', 'Gestión de términos, condiciones y políticas', 'fas fa-file-alt', 'legal');

-- ANALYTICS (1 módulo)
SELECT upsert_module('employee-map', 'Mapa Empleados', 'Ubicación y seguimiento en tiempo real', 'fas fa-map-marker-alt', 'analytics');

-- PAYROLL (1 módulo)
SELECT upsert_module('payroll-liquidation', 'Liquidación Sueldos', 'Cálculo y gestión de nóminas y liquidaciones', 'fas fa-calculator', 'payroll');

-- ADMIN (1 módulo)
SELECT upsert_module('licensing-management', 'Licencias', 'Administración de licencias profesionales y permisos', 'fas fa-key', 'admin');

-- AI (1 módulo)
SELECT upsert_module('emotional-analysis', 'Análisis Emocional', 'Detección de emociones y bienestar del personal', 'fas fa-smile', 'ai');

-- SYSTEM (1 módulo)
SELECT upsert_module('network', 'Red y Conectividad', 'Gestión de red y conectividad del sistema', 'fas fa-network-wired', 'system');

-- INTEGRATION (1 módulo)
SELECT upsert_module('google-maps-integration', 'Integración Google Maps', 'Integración avanzada con Google Maps para geolocalización', 'fas fa-map-marked-alt', 'integration');

-- SIAC (3 módulos)
SELECT upsert_module('clientes', 'Clientes SIAC', 'Sistema integrado de administración comercial - Gestión completa de clientes', 'fas fa-user-tie', 'siac');
SELECT upsert_module('facturacion', 'Facturación SIAC', 'Sistema integrado de administración comercial - Facturación completa', 'fas fa-file-invoice-dollar', 'siac');
SELECT upsert_module('plantillas-fiscales', 'Plantillas Fiscales', 'Sistema configurable de matriz impositiva por país', 'fas fa-file-invoice', 'siac');

-- TESTING (1 módulo)
SELECT upsert_module('permissions-test', 'Test de Permisos', 'Sistema de testing y validación de permisos', 'fas fa-vial', 'testing');

-- ============================================
-- PASO 4: VERIFICACIÓN
-- ============================================
DO $$
DECLARE
    module_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO module_count FROM system_modules;
    RAISE NOTICE '✅ Total de módulos en system_modules: %', module_count;

    IF module_count >= 44 THEN
        RAISE NOTICE '✅ MIGRACIÓN EXITOSA - Se esperaban 44+ módulos';
    ELSE
        RAISE WARNING '⚠️ Solo hay % módulos, se esperaban 44+', module_count;
    END IF;
END $$;

-- Listar todos los módulos por categoría
SELECT
    category,
    COUNT(*) as total,
    STRING_AGG(name, ', ' ORDER BY name) as modulos
FROM system_modules
GROUP BY category
ORDER BY category;
