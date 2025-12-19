-- ============================================================================
-- Migración: Sistema de Políticas de Email Parametrizable
-- Fecha: 2025-12-19
-- Descripción: Permite configurar qué email de Aponnt se usa para cada tipo
--              de notificación (escalamientos, partners, etc.)
-- ============================================================================

-- Tabla de políticas de email (parametrizable desde módulo Ingeniería)
CREATE TABLE IF NOT EXISTS email_policies (
    id SERIAL PRIMARY KEY,

    -- Identificador de la política
    policy_key VARCHAR(100) NOT NULL UNIQUE,
    policy_name VARCHAR(255) NOT NULL,
    policy_description TEXT,

    -- Configuración de email
    email_type VARCHAR(50) NOT NULL, -- 'transactional', 'support', 'partners', 'billing', 'marketing'
    email_address VARCHAR(255), -- Email de Aponnt a usar (NULL = usar default de aponnt_email_config)

    -- Aplicabilidad
    applies_to VARCHAR(50) NOT NULL, -- 'aponnt', 'companies', 'partners', 'all'
    notification_category VARCHAR(100), -- Categoría de notificación
    notification_type VARCHAR(100), -- Tipo específico de notificación

    -- Configuración de comportamiento
    send_copy_to_aponnt BOOLEAN DEFAULT FALSE,
    copy_email VARCHAR(255), -- Email adicional para copias

    -- Metadatos
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Prioridad para resolver conflictos (mayor = más prioridad)

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'system',

    -- Constraints
    CHECK (email_type IN ('transactional', 'support', 'partners', 'billing', 'marketing', 'escalation')),
    CHECK (applies_to IN ('aponnt', 'companies', 'partners', 'employees', 'all'))
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_email_policies_key ON email_policies(policy_key);
CREATE INDEX IF NOT EXISTS idx_email_policies_type ON email_policies(email_type);
CREATE INDEX IF NOT EXISTS idx_email_policies_applies ON email_policies(applies_to);
CREATE INDEX IF NOT EXISTS idx_email_policies_category ON email_policies(notification_category);
CREATE INDEX IF NOT EXISTS idx_email_policies_active ON email_policies(is_active);

-- Función para obtener política de email
CREATE OR REPLACE FUNCTION get_email_policy(
    p_notification_category VARCHAR,
    p_notification_type VARCHAR DEFAULT NULL,
    p_applies_to VARCHAR DEFAULT 'all'
) RETURNS TABLE (
    policy_key VARCHAR,
    email_type VARCHAR,
    email_address VARCHAR,
    send_copy_to_aponnt BOOLEAN,
    copy_email VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ep.policy_key,
        ep.email_type,
        ep.email_address,
        ep.send_copy_to_aponnt,
        ep.copy_email
    FROM email_policies ep
    WHERE ep.is_active = TRUE
      AND (ep.notification_category = p_notification_category OR ep.notification_category IS NULL)
      AND (ep.notification_type = p_notification_type OR ep.notification_type IS NULL OR p_notification_type IS NULL)
      AND (ep.applies_to = p_applies_to OR ep.applies_to = 'all')
    ORDER BY
        -- Más específico primero
        CASE WHEN ep.notification_type IS NOT NULL THEN 3
             WHEN ep.notification_category IS NOT NULL THEN 2
             ELSE 1
        END DESC,
        ep.priority DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Seed de políticas iniciales
INSERT INTO email_policies (
    policy_key, policy_name, policy_description,
    email_type, email_address, applies_to,
    notification_category, notification_type,
    send_copy_to_aponnt, priority
) VALUES
-- Políticas de escalamiento
(
    'escalation_level1',
    'Escalamiento Nivel 1 (Supervisor)',
    'Primer nivel de escalamiento dentro de la empresa',
    'transactional',
    NULL, -- Usa email de la empresa
    'companies',
    'escalation',
    NULL,
    FALSE,
    100
),
(
    'escalation_level2_internal',
    'Escalamiento Nivel 2 Interno (Coordinador/RRHH)',
    'Segundo nivel de escalamiento interno',
    'transactional',
    NULL, -- Usa email de la empresa
    'companies',
    'escalation',
    NULL,
    FALSE,
    90
),
(
    'escalation_level3',
    'Escalamiento Nivel 3 (Gerente General)',
    'Escalamiento al nivel más alto de la empresa',
    'escalation',
    NULL, -- Usa email de la empresa
    'companies',
    'escalation',
    NULL,
    TRUE, -- Copia a Aponnt para tracking
    80
),

-- Políticas de partners (asociados)
(
    'partner_medical',
    'Notificaciones a Partners Médicos',
    'Comunicaciones con asociados médicos externos',
    'partners',
    'asociados@aponnt.com',
    'partners',
    'medical',
    NULL,
    TRUE,
    70
),
(
    'partner_legal',
    'Notificaciones a Partners Legales',
    'Comunicaciones con asociados legales/jurídicos externos',
    'partners',
    'asociados@aponnt.com',
    'partners',
    'legal',
    NULL,
    TRUE,
    70
),
(
    'partner_hse',
    'Notificaciones a Partners HSE',
    'Comunicaciones con asociados de seguridad e higiene externos',
    'partners',
    'asociados@aponnt.com',
    'partners',
    'hse',
    NULL,
    TRUE,
    70
),
(
    'partner_coordinator_escalation',
    'Escalamiento a Coordinadores de Partners',
    'Escalamiento cuando partner no responde → coordinador interno',
    'escalation',
    'asociados@aponnt.com',
    'partners',
    'escalation',
    'partner_coordinator',
    TRUE,
    75
),

-- Políticas de soporte Aponnt
(
    'aponnt_support',
    'Soporte Técnico Aponnt',
    'Comunicaciones de soporte técnico desde Aponnt',
    'support',
    'soporte@aponnt.com',
    'aponnt',
    'support',
    NULL,
    FALSE,
    50
),
(
    'aponnt_billing',
    'Facturación y Cobranzas Aponnt',
    'Notificaciones de facturación y pagos',
    'billing',
    'facturacion@aponnt.com',
    'aponnt',
    'billing',
    NULL,
    FALSE,
    50
),
(
    'aponnt_onboarding',
    'Alta de Empresa (Onboarding)',
    'Proceso de alta de nueva empresa',
    'transactional',
    'bienvenida@aponnt.com',
    'companies',
    'onboarding',
    NULL,
    TRUE,
    60
),

-- Política default (fallback)
(
    'default_transactional',
    'Transaccional Default',
    'Política por defecto para emails transaccionales',
    'transactional',
    NULL,
    'all',
    NULL,
    NULL,
    FALSE,
    0
)
ON CONFLICT (policy_key) DO UPDATE SET
    policy_name = EXCLUDED.policy_name,
    policy_description = EXCLUDED.policy_description,
    email_type = EXCLUDED.email_type,
    email_address = EXCLUDED.email_address,
    applies_to = EXCLUDED.applies_to,
    notification_category = EXCLUDED.notification_category,
    notification_type = EXCLUDED.notification_type,
    send_copy_to_aponnt = EXCLUDED.send_copy_to_aponnt,
    priority = EXCLUDED.priority,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Actualizar aponnt_email_config con campos de seguridad
-- ============================================================================

-- Hacer smtp_password nullable (para configurar después desde panel)
ALTER TABLE aponnt_email_config
ALTER COLUMN smtp_password DROP NOT NULL;

-- Actualizar CHECK constraint para permitir nuevos tipos de email
ALTER TABLE aponnt_email_config
DROP CONSTRAINT IF EXISTS chk_aponnt_config_type;

ALTER TABLE aponnt_email_config
ADD CONSTRAINT chk_aponnt_config_type CHECK (
    config_type IN (
        'transactional', 'marketing', 'support', 'billing', 'institutional',
        'support_coordinator', 'commercial', 'engineering', 'associates',
        -- Nuevos tipos agregados
        'partners', 'staff', 'executive', 'onboarding', 'escalation'
    )
);

-- Agregar columnas de seguridad si no existen
ALTER TABLE aponnt_email_config
ADD COLUMN IF NOT EXISTS app_password TEXT,
ADD COLUMN IF NOT EXISTS recovery_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS backup_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS test_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comentarios en nuevas columnas
COMMENT ON COLUMN aponnt_email_config.smtp_password IS 'Contraseña SMTP (encriptada)';
COMMENT ON COLUMN aponnt_email_config.app_password IS 'Clave de aplicación Gmail (encriptada)';
COMMENT ON COLUMN aponnt_email_config.recovery_phone IS 'Teléfono de recuperación';
COMMENT ON COLUMN aponnt_email_config.backup_email IS 'Email de respaldo';
COMMENT ON COLUMN aponnt_email_config.last_test_at IS 'Última prueba de conexión';
COMMENT ON COLUMN aponnt_email_config.test_status IS 'Estado de última prueba (success/failed)';

-- Insertar/actualizar TODOS los emails de Aponnt
INSERT INTO aponnt_email_config (
    config_type, from_email, from_name, smtp_user,
    smtp_host, smtp_port, smtp_secure
) VALUES
-- 1. Comercial - Ventas y leads
(
    'commercial',
    'aponntcomercial@gmail.com',
    'Aponnt Comercial',
    'aponntcomercial@gmail.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 2. Partners/Asociados - Médicos, legales, HSE
(
    'partners',
    'aponntasociados@gmail.com',
    'Aponnt Asociados',
    'aponntasociados@gmail.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 3. Staff interno - Comunicaciones internas Aponnt
(
    'staff',
    'aponntstaff@gmail.com',
    'Aponnt Staff',
    'aponntstaff@gmail.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 4. Soporte - Empresas con soporte
(
    'support',
    'aponntcoordinacionsoporte@gmail.com',
    'Aponnt Coordinación Soporte',
    'aponntcoordinacionsoporte@gmail.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 5. Ingeniería - Desarrollo y técnico
(
    'engineering',
    'aponntingenieria@gmail.com',
    'Aponnt Ingeniería',
    'aponntingenieria@gmail.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 6. Suite ejecutiva - Nivel jerárquico (jefes/gerentes)
(
    'executive',
    'aponntsuite@gmail.com',
    'Aponnt Suite Ejecutiva',
    'aponntsuite@gmail.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 7. Institucional - Público (NO en notificaciones)
(
    'institutional',
    'aponnt@gmail.com',
    'Aponnt',
    'aponnt@gmail.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 8. Facturación - Billing y cobranzas
(
    'billing',
    'facturacion@aponnt.com',
    'Aponnt Facturación',
    'facturacion@aponnt.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 9. Onboarding - Alta de empresas
(
    'onboarding',
    'bienvenida@aponnt.com',
    'Aponnt Bienvenida',
    'bienvenida@aponnt.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 10. Transaccional - Default
(
    'transactional',
    'notificaciones@aponnt.com',
    'Aponnt Notificaciones',
    'notificaciones@aponnt.com',
    'smtp.gmail.com',
    587,
    FALSE
),
-- 11. Escalamiento - Para escalamientos críticos
(
    'escalation',
    'escalamientos@aponnt.com',
    'Aponnt Escalamientos',
    'escalamientos@aponnt.com',
    'smtp.gmail.com',
    587,
    FALSE
)
ON CONFLICT (config_type) DO UPDATE SET
    from_email = EXCLUDED.from_email,
    from_name = EXCLUDED.from_name,
    smtp_user = EXCLUDED.smtp_user,
    smtp_host = EXCLUDED.smtp_host,
    smtp_port = EXCLUDED.smtp_port,
    smtp_secure = EXCLUDED.smtp_secure;

-- Comentarios
COMMENT ON TABLE email_policies IS 'Políticas parametrizables de email (configurables desde módulo Ingeniería)';
COMMENT ON COLUMN email_policies.policy_key IS 'Identificador único de la política';
COMMENT ON COLUMN email_policies.email_type IS 'Tipo de email a usar (mapeado a aponnt_email_config)';
COMMENT ON COLUMN email_policies.email_address IS 'Email específico (si NULL, usa default de aponnt_email_config)';
COMMENT ON COLUMN email_policies.applies_to IS 'A quién aplica la política (aponnt/companies/partners/all)';
COMMENT ON COLUMN email_policies.notification_category IS 'Categoría de notificación (escalation/medical/legal/etc)';
COMMENT ON COLUMN email_policies.priority IS 'Prioridad para resolver conflictos (mayor = más prioridad)';

COMMENT ON FUNCTION get_email_policy IS 'Resuelve qué política de email usar según categoría y tipo de notificación';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_email_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_email_policies_updated_at ON email_policies;

CREATE TRIGGER trigger_update_email_policies_updated_at
    BEFORE UPDATE ON email_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_email_policies_updated_at();

-- Verificación
DO $$
DECLARE
    policy_count INTEGER;
    aponnt_config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count FROM email_policies WHERE is_active = TRUE;
    SELECT COUNT(*) INTO aponnt_config_count FROM aponnt_email_config;

    RAISE NOTICE '✅ Tabla email_policies creada';
    RAISE NOTICE '✅ % políticas de email activas', policy_count;
    RAISE NOTICE '✅ Función get_email_policy() creada';
    RAISE NOTICE '✅ % emails de Aponnt configurados en aponnt_email_config', aponnt_config_count;
    RAISE NOTICE '✅ Campos de seguridad agregados (smtp_password, app_password, recovery_phone, backup_email)';
    RAISE NOTICE '✅ Sistema de políticas de email PARAMETRIZABLE implementado';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Emails de Aponnt registrados:';
    RAISE NOTICE '   1. aponntcomercial@gmail.com → Comercial (ventas, leads)';
    RAISE NOTICE '   2. aponntasociados@gmail.com → Partners (médicos, legales, HSE)';
    RAISE NOTICE '   3. aponntstaff@gmail.com → Staff interno';
    RAISE NOTICE '   4. aponntcoordinacionsoporte@gmail.com → Soporte a empresas';
    RAISE NOTICE '   5. aponntingenieria@gmail.com → Ingeniería y desarrollo';
    RAISE NOTICE '   6. aponntsuite@gmail.com → Suite ejecutiva (jefes/gerentes)';
    RAISE NOTICE '   7. aponnt@gmail.com → Institucional público';
    RAISE NOTICE '   8. facturacion@aponnt.com → Facturación y cobranzas';
    RAISE NOTICE '   9. bienvenida@aponnt.com → Onboarding empresas';
    RAISE NOTICE '   10. notificaciones@aponnt.com → Transaccional default';
    RAISE NOTICE '   11. escalamientos@aponnt.com → Escalamientos críticos';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 IMPORTANTE: Configurar credenciales en módulo Ingeniería (solo GG/SUPERADMIN)';
    RAISE NOTICE '🎯 Próximo paso: Panel de configuración en panel-administrativo.html';
END $$;
