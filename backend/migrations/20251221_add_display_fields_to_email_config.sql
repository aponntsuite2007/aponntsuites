-- ============================================================================
-- MIGRACIÓN: Agregar campos de visualización a aponnt_email_config
-- Fecha: 2025-12-21
-- Descripción: Agregar icon, color, description para hacer dinámico EMAIL_INFO
-- ============================================================================

-- 1. Agregar columnas
ALTER TABLE aponnt_email_config
ADD COLUMN IF NOT EXISTS icon VARCHAR(10),
ADD COLUMN IF NOT EXISTS color VARCHAR(7),
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Actualizar registros existentes con valores del EMAIL_INFO hardcodeado

UPDATE aponnt_email_config SET
    icon = '💼',
    color = '#2563eb',
    description = 'Ventas, leads, reuniones comerciales'
WHERE email_type = 'commercial';

UPDATE aponnt_email_config SET
    icon = '🤝',
    color = '#7c3aed',
    description = 'Partners externos (médicos, legales, HSE)'
WHERE email_type = 'partners';

UPDATE aponnt_email_config SET
    icon = '👥',
    color = '#059669',
    description = 'Staff interno de Aponnt'
WHERE email_type = 'staff';

UPDATE aponnt_email_config SET
    icon = '🎫',
    color = '#dc2626',
    description = 'Tickets de soporte, coordinación'
WHERE email_type IN ('support', 'support_coordinator');

UPDATE aponnt_email_config SET
    icon = '⚙️',
    color = '#6b7280',
    description = 'Ingeniería, DevOps, deploy, alertas técnicas'
WHERE email_type = 'engineering';

UPDATE aponnt_email_config SET
    icon = '👔',
    color = '#9333ea',
    description = 'Comunicaciones ejecutivas, reportes gerenciales'
WHERE email_type = 'executive';

UPDATE aponnt_email_config SET
    icon = '🏢',
    color = '#0284c7',
    description = 'Comunicaciones institucionales, anuncios corporativos'
WHERE email_type = 'institutional';

UPDATE aponnt_email_config SET
    icon = '💰',
    color = '#16a34a',
    description = 'Facturación, pagos, recordatorios de vencimiento'
WHERE email_type = 'billing';

UPDATE aponnt_email_config SET
    icon = '🎓',
    color = '#ea580c',
    description = 'Onboarding de nuevas empresas, bienvenida'
WHERE email_type = 'onboarding';

UPDATE aponnt_email_config SET
    icon = '📧',
    color = '#8b5cf6',
    description = 'Notificaciones transaccionales automáticas del sistema'
WHERE email_type = 'transactional';

UPDATE aponnt_email_config SET
    icon = '🚨',
    color = '#ef4444',
    description = 'Escalamientos, alertas críticas, problemas urgentes'
WHERE email_type = 'escalation';

UPDATE aponnt_email_config SET
    icon = '📣',
    color = '#f59e0b',
    description = 'Marketing, campañas, newsletters'
WHERE email_type = 'marketing';

UPDATE aponnt_email_config SET
    icon = '👥',
    color = '#10b981',
    description = 'Asociados y colaboradores externos'
WHERE email_type = 'associates';

-- 3. Verificar resultado
DO $$
DECLARE
    total_with_info INT;
    total_without_info INT;
    r RECORD;
BEGIN
    SELECT COUNT(*) INTO total_with_info
    FROM aponnt_email_config
    WHERE icon IS NOT NULL AND color IS NOT NULL AND description IS NOT NULL;

    SELECT COUNT(*) INTO total_without_info
    FROM aponnt_email_config
    WHERE icon IS NULL OR color IS NULL OR description IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA - Email Config Display Fields';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total de email types con info completa: %', total_with_info;
    RAISE NOTICE 'Total sin info: %', total_without_info;
    RAISE NOTICE '';

    IF total_without_info > 0 THEN
        RAISE NOTICE 'Email types sin icon/color/description:';
        FOR r IN (
            SELECT email_type, from_name
            FROM aponnt_email_config
            WHERE icon IS NULL OR color IS NULL OR description IS NULL
        ) LOOP
            RAISE NOTICE '  - % (%)', r.email_type, r.from_name;
        END LOOP;
        RAISE NOTICE '';
    END IF;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
END $$;
