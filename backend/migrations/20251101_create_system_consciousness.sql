-- ========================================================================
-- MIGRACIÓN: Sistema de Conciencia del Sistema (System Consciousness)
-- ========================================================================
-- Fecha: 2025-11-01
-- Versión: 1.0.0
-- Objetivo: Crear infraestructura de "Sistema Consciente" en BD
--           Metadatos dinámicos + Registry de módulos + Log de eventos
-- ========================================================================

BEGIN;

-- ========================================================================
-- TABLA 1: system_metadata
-- Metadatos del sistema que pueden cambiar dinámicamente
-- ========================================================================

CREATE TABLE IF NOT EXISTS system_metadata (
    metadata_id SERIAL PRIMARY KEY,
    metadata_key VARCHAR(100) UNIQUE NOT NULL,
    metadata_value JSONB NOT NULL,
    metadata_type VARCHAR(50) NOT NULL, -- 'config', 'limit', 'feature_flag', 'module_info'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_metadata_key ON system_metadata(metadata_key);
CREATE INDEX IF NOT EXISTS idx_system_metadata_type ON system_metadata(metadata_type);
CREATE INDEX IF NOT EXISTS idx_system_metadata_active ON system_metadata(is_active);

-- Comentarios
COMMENT ON TABLE system_metadata IS 'Metadatos del sistema para auto-conciencia y configuración dinámica';
COMMENT ON COLUMN system_metadata.metadata_key IS 'Clave única del metadato (e.g. system_version, max_employees_basic)';
COMMENT ON COLUMN system_metadata.metadata_value IS 'Valor en formato JSON para flexibilidad';
COMMENT ON COLUMN system_metadata.metadata_type IS 'Tipo de metadato: config, limit, feature_flag, module_info';

-- ========================================================================
-- TABLA 2: system_modules_registry
-- Registry de módulos con dependencias (complementa system_modules existente)
-- ========================================================================

CREATE TABLE IF NOT EXISTS system_modules_registry (
    registry_id SERIAL PRIMARY KEY,
    module_key VARCHAR(100) UNIQUE NOT NULL,
    module_name VARCHAR(255) NOT NULL,
    module_category VARCHAR(50) NOT NULL, -- 'core', 'optional', 'admin_tool'
    pricing DECIMAL(10,2) DEFAULT 0.00,
    dependencies JSONB DEFAULT '[]', -- ["users", "departments"]
    optional_dependencies JSONB DEFAULT '[]',
    provides_to JSONB DEFAULT '[]', -- Qué módulos dependen de este
    integrates_with JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}', -- { "max_users": 100, "max_storage_mb": 5000 }
    features JSONB DEFAULT '[]', -- Lista de features del módulo
    description TEXT,
    icon VARCHAR(50),
    version VARCHAR(20) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_modules_registry_key ON system_modules_registry(module_key);
CREATE INDEX IF NOT EXISTS idx_modules_registry_category ON system_modules_registry(module_category);
CREATE INDEX IF NOT EXISTS idx_modules_registry_active ON system_modules_registry(is_active);

-- Índices GIN para búsquedas en JSONB
CREATE INDEX IF NOT EXISTS idx_modules_registry_dependencies ON system_modules_registry USING GIN (dependencies);
CREATE INDEX IF NOT EXISTS idx_modules_registry_provides_to ON system_modules_registry USING GIN (provides_to);

COMMENT ON TABLE system_modules_registry IS 'Registry centralizado de módulos con dependencias y límites';
COMMENT ON COLUMN system_modules_registry.module_key IS 'Identificador único del módulo (e.g. users, attendance)';
COMMENT ON COLUMN system_modules_registry.dependencies IS 'Array JSON de módulos requeridos para funcionar';
COMMENT ON COLUMN system_modules_registry.provides_to IS 'Array JSON de módulos que dependen de este';

-- ========================================================================
-- TABLA 3: system_consciousness_log
-- Log de eventos del sistema consciente
-- ========================================================================

CREATE TABLE IF NOT EXISTS system_consciousness_log (
    log_id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'module_loaded', 'limit_checked', 'dependency_validated', 'config_changed'
    module_key VARCHAR(100),
    company_id INTEGER,
    event_data JSONB,
    result VARCHAR(20) NOT NULL, -- 'success', 'failure', 'warning'
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_consciousness_log_type ON system_consciousness_log(event_type);
CREATE INDEX IF NOT EXISTS idx_consciousness_log_module ON system_consciousness_log(module_key);
CREATE INDEX IF NOT EXISTS idx_consciousness_log_company ON system_consciousness_log(company_id);
CREATE INDEX IF NOT EXISTS idx_consciousness_log_created ON system_consciousness_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consciousness_log_result ON system_consciousness_log(result);

COMMENT ON TABLE system_consciousness_log IS 'Log de eventos del sistema de auto-conciencia';
COMMENT ON COLUMN system_consciousness_log.event_type IS 'Tipo de evento: module_loaded, limit_checked, dependency_validated, config_changed';

-- ========================================================================
-- FUNCIÓN 1: Verificar si módulo puede funcionar
-- ========================================================================

DROP FUNCTION IF EXISTS can_module_work(VARCHAR, TEXT[]);
CREATE OR REPLACE FUNCTION can_module_work(p_module_key VARCHAR, p_active_modules TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    v_dependencies JSONB;
    v_dep TEXT;
BEGIN
    -- Obtener dependencias del módulo
    SELECT dependencies INTO v_dependencies
    FROM system_modules_registry
    WHERE module_key = p_module_key AND is_active = TRUE;

    -- Si no existe el módulo o no tiene dependencias, retornar TRUE
    IF v_dependencies IS NULL OR jsonb_array_length(v_dependencies) = 0 THEN
        RETURN TRUE;
    END IF;

    -- Verificar cada dependencia
    FOR v_dep IN SELECT jsonb_array_elements_text(v_dependencies) LOOP
        IF NOT (v_dep = ANY(p_active_modules)) THEN
            -- Log de fallo
            INSERT INTO system_consciousness_log (event_type, module_key, event_data, result, message)
            VALUES (
                'dependency_validated',
                p_module_key,
                jsonb_build_object('missing_dependency', v_dep, 'active_modules', p_active_modules),
                'failure',
                format('Módulo %s requiere %s que no está activo', p_module_key, v_dep)
            );
            RETURN FALSE;
        END IF;
    END LOOP;

    -- Log de éxito
    INSERT INTO system_consciousness_log (event_type, module_key, result, message)
    VALUES (
        'dependency_validated',
        p_module_key,
        'success',
        format('Módulo %s tiene todas sus dependencias activas', p_module_key)
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_module_work IS 'Verifica si un módulo puede funcionar verificando que todas sus dependencias estén activas';

-- ========================================================================
-- FUNCIÓN 2: Obtener contexto completo del sistema para una empresa
-- ========================================================================

DROP FUNCTION IF EXISTS get_system_context(INTEGER);
CREATE OR REPLACE FUNCTION get_system_context(p_company_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_context JSON;
BEGIN
    SELECT json_build_object(
        'company', (
            SELECT json_build_object(
                'company_id', id,
                'name', name,
                'license_type', license_type,
                'max_employees', max_employees,
                'max_storage_mb', max_storage_mb,
                'active_modules', active_modules
            )
            FROM companies WHERE id = p_company_id
        ),
        'modules_info', (
            SELECT json_agg(
                json_build_object(
                    'module_key', module_key,
                    'module_name', module_name,
                    'category', module_category,
                    'dependencies', dependencies,
                    'limits', limits,
                    'pricing', pricing
                )
            )
            FROM system_modules_registry smr
            WHERE smr.is_active = TRUE
            AND EXISTS (
                SELECT 1 FROM companies c
                WHERE c.id = p_company_id
                AND smr.module_key = ANY(c.active_modules)
            )
        ),
        'system_limits', (
            SELECT json_object_agg(metadata_key, metadata_value)
            FROM system_metadata
            WHERE metadata_type = 'limit' AND is_active = TRUE
        ),
        'system_config', (
            SELECT json_object_agg(metadata_key, metadata_value)
            FROM system_metadata
            WHERE metadata_type = 'config' AND is_active = TRUE
        )
    ) INTO v_context;

    -- Log de consulta
    INSERT INTO system_consciousness_log (event_type, company_id, result, message)
    VALUES (
        'context_retrieved',
        p_company_id,
        'success',
        format('Contexto completo obtenido para empresa %s', p_company_id)
    );

    RETURN v_context;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_system_context IS 'Obtiene contexto completo del sistema para una empresa específica';

-- ========================================================================
-- FUNCIÓN 3: Analizar impacto de desactivar un módulo
-- ========================================================================

DROP FUNCTION IF EXISTS analyze_deactivation_impact(VARCHAR);
CREATE OR REPLACE FUNCTION analyze_deactivation_impact(p_module_key VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_impact JSON;
    v_affected_modules JSONB;
BEGIN
    -- Buscar módulos que dependen de este
    SELECT json_agg(
        json_build_object(
            'module_key', module_key,
            'module_name', module_name,
            'category', module_category,
            'dependencies', dependencies
        )
    )
    INTO v_impact
    FROM system_modules_registry
    WHERE dependencies @> to_jsonb(ARRAY[p_module_key])
    AND is_active = TRUE;

    -- Log del análisis
    INSERT INTO system_consciousness_log (event_type, module_key, event_data, result, message)
    VALUES (
        'impact_analysis',
        p_module_key,
        json_build_object('affected_modules', v_impact),
        'success',
        format('Análisis de impacto completado para módulo %s', p_module_key)
    );

    RETURN json_build_object(
        'module', p_module_key,
        'affected_modules', COALESCE(v_impact, '[]'::json),
        'impact_level', CASE
            WHEN v_impact IS NULL THEN 'low'
            WHEN json_array_length(v_impact) > 5 THEN 'high'
            WHEN json_array_length(v_impact) > 2 THEN 'medium'
            ELSE 'low'
        END
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION analyze_deactivation_impact IS 'Analiza el impacto de desactivar un módulo (qué otros módulos se afectarían)';

-- ========================================================================
-- FUNCIÓN 4: Obtener estadísticas del sistema
-- ========================================================================

DROP FUNCTION IF EXISTS get_system_stats();
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'total_modules', (SELECT COUNT(*) FROM system_modules_registry WHERE is_active = TRUE),
        'core_modules', (SELECT COUNT(*) FROM system_modules_registry WHERE module_category = 'core' AND is_active = TRUE),
        'optional_modules', (SELECT COUNT(*) FROM system_modules_registry WHERE module_category = 'optional' AND is_active = TRUE),
        'admin_tools', (SELECT COUNT(*) FROM system_modules_registry WHERE module_category = 'admin_tool' AND is_active = TRUE),
        'total_metadata', (SELECT COUNT(*) FROM system_metadata WHERE is_active = TRUE),
        'total_events', (SELECT COUNT(*) FROM system_consciousness_log),
        'events_last_24h', (SELECT COUNT(*) FROM system_consciousness_log WHERE created_at > NOW() - INTERVAL '24 hours'),
        'last_event', (SELECT json_build_object('type', event_type, 'result', result, 'message', message, 'created_at', created_at) FROM system_consciousness_log ORDER BY created_at DESC LIMIT 1)
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_system_stats IS 'Obtiene estadísticas generales del sistema consciente';

-- ========================================================================
-- DATOS INICIALES: Metadatos del Sistema
-- ========================================================================

INSERT INTO system_metadata (metadata_key, metadata_value, metadata_type, description) VALUES
-- CONFIGURACIÓN GENERAL
('system_version', '"8.0.0"', 'config', 'Versión actual del sistema'),
('system_name', '"Sistema de Asistencia Biométrico"', 'config', 'Nombre del sistema'),
('system_timezone', '"America/Argentina/Buenos_Aires"', 'config', 'Timezone por defecto del sistema'),
('email_verification_expiration_hours', '48', 'config', 'Horas de expiración de tokens de verificación de email'),
('consent_version_format', '"X.Y"', 'config', 'Formato de versionamiento de consentimientos'),
('ai_confidence_threshold', '0.7', 'config', 'Threshold de confidence para AI auto-resolve'),
('sla_warning_hours', '{"red": 1, "amber": 4, "green": 999}', 'config', 'Tiempos de warning SLA por prioridad'),

-- LÍMITES POR TIPO DE LICENCIA
('max_employees_basic', '50', 'limit', 'Máximo empleados en licencia básica'),
('max_employees_professional', '150', 'limit', 'Máximo empleados en licencia profesional'),
('max_employees_enterprise', '999999', 'limit', 'Máximo empleados en licencia enterprise (ilimitado)'),
('max_storage_mb_basic', '1024', 'limit', 'Máximo storage MB en licencia básica (1 GB)'),
('max_storage_mb_professional', '5120', 'limit', 'Máximo storage MB en licencia profesional (5 GB)'),
('max_storage_mb_enterprise', '51200', 'limit', 'Máximo storage MB en licencia enterprise (50 GB)'),
('max_api_calls_per_minute_basic', '60', 'limit', 'Máximo de llamadas API por minuto (licencia básica)'),
('max_api_calls_per_minute_professional', '300', 'limit', 'Máximo de llamadas API por minuto (licencia profesional)'),
('max_api_calls_per_minute_enterprise', '1000', 'limit', 'Máximo de llamadas API por minuto (licencia enterprise)'),

-- FEATURE FLAGS
('enable_ai_assistant', 'true', 'feature_flag', 'Habilitar módulo de Asistente IA'),
('enable_facial_biometric', 'true', 'feature_flag', 'Habilitar reconocimiento facial'),
('enable_email_verification', 'true', 'feature_flag', 'Habilitar verificación de email'),
('enable_audit_system', 'true', 'feature_flag', 'Habilitar sistema de auditoría'),
('enable_consent_management', 'true', 'feature_flag', 'Habilitar gestión de consentimientos')
ON CONFLICT (metadata_key) DO NOTHING;

-- ========================================================================
-- DATOS INICIALES: Registry de Módulos
-- ========================================================================

INSERT INTO system_modules_registry (module_key, module_name, module_category, pricing, dependencies, description, icon, version) VALUES
-- MÓDULOS CORE (Incluidos en licencia básica)
('users', 'Usuarios', 'core', 2.50, '[]', 'Gestión de empleados y perfiles de usuario', '👥', '1.0.0'),
('departments', 'Departamentos', 'core', 5.00, '[]', 'Configuración y gestión de departamentos y ubicaciones', '🏢', '1.0.0'),
('kiosks', 'Kioscos', 'core', 0.00, '[]', 'Gestión de kioscos biométricos', '📟', '1.0.0'),
('shifts', 'Turnos', 'core', 8.00, '["departments"]', 'Gestión de horarios y jornadas laborales', '🕐', '1.0.0'),
('attendance', 'Asistencia', 'core', 30.00, '["users", "shifts"]', 'Control de ingresos, salidas y asistencia', '📋', '1.0.0'),
('facial-biometric', 'Biometría Analítica', 'core', 25.00, '["users"]', 'Reconocimiento facial para autenticación', '🎭', '1.0.0'),
('settings', 'Configuración', 'core', 3.00, '[]', 'Configuración de servidor APK + Datos empresa', '⚙️', '1.0.0'),
('support', 'Soporte Técnico', 'core', 5.00, '[]', 'Sistema de tickets y asistencia (sin IA)', '🎫', '1.0.0'),

-- MÓDULOS OPCIONALES (Se contratan por separado)
('visitors', 'Visitantes', 'optional', 0.00, '[]', 'Gestión de visitantes', '👥', '1.0.0'),
('ai-assistant', 'Asistente IA', 'optional', 15.00, '["support"]', 'Upgrade de Soporte con Ollama + Llama 3.1 (respuestas automáticas)', '🤖', '1.0.0'),
('inbox', 'Bandeja Notificaciones', 'optional', 7.00, '[]', 'Sistema de notificaciones enterprise con workflows', '📬', '1.0.0'),
('medical-dashboard', 'Médico', 'optional', 20.00, '["users"]', 'Gestión de información médica de empleados', '👩‍⚕️', '1.0.0'),
('art-management', 'ART', 'optional', 18.00, '["medical-dashboard"]', 'Administración de Aseguradoras de Riesgos del Trabajo', '🏥', '1.0.0'),
('legal-dashboard', 'Legal', 'optional', 15.00, '[]', 'Gestión de aspectos legales y normativos', '⚖️', '1.0.0'),
('compliance-dashboard', 'Compliance Legal', 'optional', 0.00, '["legal-dashboard"]', 'Sistema de compliance legal con auditoría', '⚖️', '1.0.0'),
('payroll-liquidation', 'Liquidación', 'optional', 22.00, '["users", "attendance"]', 'Cálculo y gestión de nóminas y liquidaciones', '💰', '1.0.0'),
('employee-map', 'Mapa Empleados', 'optional', 12.00, '["users"]', 'Ubicación y seguimiento en tiempo real', '🗺️', '1.0.0'),
('training-management', 'Capacitaciones', 'optional', 14.00, '["users"]', 'Administración de cursos y entrenamientos', '📚', '1.0.0'),
('job-postings', 'Postulaciones', 'optional', 9.00, '[]', 'Gestión de ofertas de trabajo y candidatos', '💼', '1.0.0'),
('sanctions-management', 'Gestión de Sanciones', 'optional', 1800.00, '["users"]', 'Sistema completo de gestión disciplinaria', '⚖️', '1.0.0'),
('vacation-management', 'Gestión de Vacaciones', 'optional', 2200.00, '["users", "attendance"]', 'Sistema integral de gestión de vacaciones', '🏖️', '1.0.0'),
('document-management', 'Documentos', 'optional', 10.00, '["users"]', 'Gestión de documentos médicos (solicitudes + archivos)', '📄', '1.0.0'),

-- HERRAMIENTAS ADMIN (Solo para staff de Aponnt)
('companies', 'Empresas', 'admin_tool', 0.00, '[]', 'Gestión de empresas clientes', '🏢', '1.0.0'),
('partners', 'Asociados', 'admin_tool', 0.00, '[]', 'Gestión de partners/asociados', '🤝', '1.0.0'),
('consent-management', 'Consentimientos', 'admin_tool', 0.00, '[]', 'Gestión centralizada de consentimientos', '📜', '1.0.0'),
('audit-system', 'Auditor', 'admin_tool', 0.00, '[]', 'Sistema de auditoría y auto-diagnóstico', '🔍', '1.0.0'),
('email-verification', 'Verificación Email', 'admin_tool', 0.00, '[]', 'Sistema de verificación de correos electrónicos', '📧', '1.0.0')
ON CONFLICT (module_key) DO NOTHING;

-- ========================================================================
-- ACTUALIZAR provides_to (dependencias inversas)
-- ========================================================================

UPDATE system_modules_registry SET provides_to = '["shifts", "attendance"]' WHERE module_key = 'users';
UPDATE system_modules_registry SET provides_to = '["shifts"]' WHERE module_key = 'departments';
UPDATE system_modules_registry SET provides_to = '["attendance"]' WHERE module_key = 'shifts';
UPDATE system_modules_registry SET provides_to = '["ai-assistant"]' WHERE module_key = 'support';
UPDATE system_modules_registry SET provides_to = '["art-management"]' WHERE module_key = 'medical-dashboard';
UPDATE system_modules_registry SET provides_to = '["compliance-dashboard"]' WHERE module_key = 'legal-dashboard';

-- ========================================================================
-- LOG INICIAL
-- ========================================================================

INSERT INTO system_consciousness_log (event_type, result, message, event_data) VALUES
('system_initialized', 'success', 'Sistema Consciente inicializado exitosamente',
 json_build_object('version', '8.0.0', 'date', NOW(), 'migration', '20251101_create_system_consciousness')
);

-- ========================================================================
-- COMMIT
-- ========================================================================

COMMIT;

-- ========================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ========================================================================

DO $$
DECLARE
    v_metadata_count INTEGER;
    v_modules_count INTEGER;
    v_logs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_metadata_count FROM system_metadata;
    SELECT COUNT(*) INTO v_modules_count FROM system_modules_registry;
    SELECT COUNT(*) INTO v_logs_count FROM system_consciousness_log;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Metadatos creados: %', v_metadata_count;
    RAISE NOTICE 'Módulos registrados: %', v_modules_count;
    RAISE NOTICE 'Logs iniciales: %', v_logs_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Funciones creadas:';
    RAISE NOTICE '  - can_module_work(module_key, active_modules[])';
    RAISE NOTICE '  - get_system_context(company_id)';
    RAISE NOTICE '  - analyze_deactivation_impact(module_key)';
    RAISE NOTICE '  - get_system_stats()';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Prueba las funciones:';
    RAISE NOTICE '  SELECT get_system_stats();';
    RAISE NOTICE '  SELECT get_system_context(1);';
    RAISE NOTICE '  SELECT can_module_work(''attendance'', ARRAY[''users'', ''shifts'']);';
    RAISE NOTICE '  SELECT analyze_deactivation_impact(''users'');';
    RAISE NOTICE '========================================';
END $$;
