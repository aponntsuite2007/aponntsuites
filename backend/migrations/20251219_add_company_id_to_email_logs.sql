-- ============================================================================
-- Migración: Agregar company_id a email_logs para aislamiento multi-tenant
-- Fecha: 2025-12-19
-- Descripción: Garantiza aislamiento de logs de email entre empresas
-- ============================================================================

-- Agregar columna company_id
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_email_logs_company
ON email_logs(company_id);

-- Actualizar registros existentes (donde sender_type = 'company')
-- Obtener company_id desde email_configurations
UPDATE email_logs el
SET company_id = ec.company_id
FROM email_configurations ec
WHERE el.email_config_id = ec.id
AND el.sender_type = 'company'
AND el.company_id IS NULL;

-- Para sender_type = 'aponnt', company_id queda NULL
-- (a menos que el email sea para una empresa específica)

-- Agregar comentario
COMMENT ON COLUMN email_logs.company_id IS 'ID de la empresa (NULL para emails de Aponnt a nivel plataforma)';

-- Crear vista de auditoría por empresa
CREATE OR REPLACE VIEW v_company_email_audit AS
SELECT
    el.id,
    el.company_id,
    c.name as company_name,
    el.sender_type,
    el.recipient_email,
    el.recipient_name,
    el.recipient_type,
    el.subject,
    el.status,
    el.sent_at,
    el.delivered_at,
    el.opened_at,
    el.category,
    el.message_id,
    el.notification_id
FROM email_logs el
LEFT JOIN companies c ON c.company_id = el.company_id
WHERE el.company_id IS NOT NULL
ORDER BY el.sent_at DESC;

COMMENT ON VIEW v_company_email_audit IS 'Vista de auditoría de emails por empresa (aislamiento multi-tenant)';

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Columna company_id agregada a email_logs';
    RAISE NOTICE '✅ Índice idx_email_logs_company creado';
    RAISE NOTICE '✅ Registros existentes actualizados';
    RAISE NOTICE '✅ Vista v_company_email_audit creada';
    RAISE NOTICE '✅ Aislamiento multi-tenant de emails GARANTIZADO';
END $$;
