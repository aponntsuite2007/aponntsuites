-- ============================================================================
-- MIGRACIÓN: Extender unified_notifications para flujo comercial APONNT ↔ Empresa
-- Fecha: 2025-12-16
-- Propósito: Convertir unified_notifications en SSOT de TODAS las notificaciones
--            incluyendo el flujo de comercialización (alta empresa, presupuestos, etc.)
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR COLUMNAS PARA FLUJO COMERCIAL EXTERNO
-- ============================================================================

-- Dirección del mensaje (para comunicaciones empresa ↔ aponnt)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_notifications' AND column_name = 'direction') THEN
        ALTER TABLE unified_notifications ADD COLUMN direction VARCHAR(20) DEFAULT 'internal';
        COMMENT ON COLUMN unified_notifications.direction IS 'Dirección: internal (dentro de empresa), inbound (de APONNT a empresa), outbound (de empresa a APONNT)';
        RAISE NOTICE 'Columna direction agregada';
    END IF;
END $$;

-- Email externo del destinatario (cuando no es usuario del sistema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_notifications' AND column_name = 'external_email') THEN
        ALTER TABLE unified_notifications ADD COLUMN external_email VARCHAR(255);
        COMMENT ON COLUMN unified_notifications.external_email IS 'Email externo para notificaciones a no-usuarios (ej: contacto de empresa prospect)';
        RAISE NOTICE 'Columna external_email agregada';
    END IF;
END $$;

-- Nombre externo del destinatario
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_notifications' AND column_name = 'external_name') THEN
        ALTER TABLE unified_notifications ADD COLUMN external_name VARCHAR(255);
        COMMENT ON COLUMN unified_notifications.external_name IS 'Nombre del contacto externo';
        RAISE NOTICE 'Columna external_name agregada';
    END IF;
END $$;

-- Trace ID para vincular con workflow de onboarding
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_notifications' AND column_name = 'trace_id') THEN
        ALTER TABLE unified_notifications ADD COLUMN trace_id VARCHAR(100);
        COMMENT ON COLUMN unified_notifications.trace_id IS 'ID de rastreo para vincular con workflows (ej: ONBOARDING-uuid)';
        RAISE NOTICE 'Columna trace_id agregada';
    END IF;
END $$;

-- ID del vendedor de APONNT relacionado (UUID porque aponnt_staff.staff_id es UUID)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_notifications' AND column_name = 'vendor_id') THEN
        ALTER TABLE unified_notifications ADD COLUMN vendor_id UUID;
        COMMENT ON COLUMN unified_notifications.vendor_id IS 'ID del vendedor APONNT relacionado (para comisiones y seguimiento)';
        RAISE NOTICE 'Columna vendor_id agregada';
    END IF;
END $$;

-- Departamento APONNT destino (para enrutamiento interno)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_notifications' AND column_name = 'aponnt_department') THEN
        ALTER TABLE unified_notifications ADD COLUMN aponnt_department VARCHAR(50);
        COMMENT ON COLUMN unified_notifications.aponnt_department IS 'Departamento APONNT: sales, support, billing, legal, management';
        RAISE NOTICE 'Columna aponnt_department agregada';
    END IF;
END $$;

-- Flag para identificar notificaciones del flujo comercial
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_notifications' AND column_name = 'is_commercial') THEN
        ALTER TABLE unified_notifications ADD COLUMN is_commercial BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN unified_notifications.is_commercial IS 'True si es parte del flujo comercial APONNT ↔ Empresa';
        RAISE NOTICE 'Columna is_commercial agregada';
    END IF;
END $$;

-- Respuesta requerida (deadline específico para comercial)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_notifications' AND column_name = 'response_required_by') THEN
        ALTER TABLE unified_notifications ADD COLUMN response_required_by TIMESTAMP;
        COMMENT ON COLUMN unified_notifications.response_required_by IS 'Fecha límite para respuesta en flujo comercial';
        RAISE NOTICE 'Columna response_required_by agregada';
    END IF;
END $$;

-- ============================================================================
-- 2. AGREGAR COLUMNAS A notification_threads PARA FLUJO COMERCIAL
-- ============================================================================

-- Tipo de flujo comercial
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_threads' AND column_name = 'commercial_flow') THEN
        ALTER TABLE notification_threads ADD COLUMN commercial_flow VARCHAR(50);
        COMMENT ON COLUMN notification_threads.commercial_flow IS 'Tipo de flujo comercial: onboarding, support, billing, renewal, upsell';
        RAISE NOTICE 'Columna commercial_flow agregada a notification_threads';
    END IF;
END $$;

-- Trace ID en threads
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_threads' AND column_name = 'trace_id') THEN
        ALTER TABLE notification_threads ADD COLUMN trace_id VARCHAR(100);
        COMMENT ON COLUMN notification_threads.trace_id IS 'ID de rastreo para vincular con workflows';
        RAISE NOTICE 'Columna trace_id agregada a notification_threads';
    END IF;
END $$;

-- Vendor ID en threads (UUID)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_threads' AND column_name = 'vendor_id') THEN
        ALTER TABLE notification_threads ADD COLUMN vendor_id UUID;
        COMMENT ON COLUMN notification_threads.vendor_id IS 'ID del vendedor APONNT asignado';
        RAISE NOTICE 'Columna vendor_id agregada a notification_threads';
    END IF;
END $$;

-- Email externo del cliente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_threads' AND column_name = 'external_email') THEN
        ALTER TABLE notification_threads ADD COLUMN external_email VARCHAR(255);
        COMMENT ON COLUMN notification_threads.external_email IS 'Email del contacto externo para el thread';
        RAISE NOTICE 'Columna external_email agregada a notification_threads';
    END IF;
END $$;

-- ============================================================================
-- 3. NUEVOS ÍNDICES PARA FLUJO COMERCIAL
-- ============================================================================

-- Índice para búsqueda por dirección
CREATE INDEX IF NOT EXISTS idx_unified_notif_direction
    ON unified_notifications(direction, company_id, created_at DESC)
    WHERE direction IN ('inbound', 'outbound');

-- Índice para notificaciones comerciales
CREATE INDEX IF NOT EXISTS idx_unified_notif_commercial
    ON unified_notifications(is_commercial, company_id, created_at DESC)
    WHERE is_commercial = TRUE;

-- Índice para trace_id (vincular con workflows)
CREATE INDEX IF NOT EXISTS idx_unified_notif_trace
    ON unified_notifications(trace_id)
    WHERE trace_id IS NOT NULL;

-- Índice para vendor_id
CREATE INDEX IF NOT EXISTS idx_unified_notif_vendor
    ON unified_notifications(vendor_id, created_at DESC)
    WHERE vendor_id IS NOT NULL;

-- Índice para departamento APONNT
CREATE INDEX IF NOT EXISTS idx_unified_notif_aponnt_dept
    ON unified_notifications(aponnt_department, created_at DESC)
    WHERE aponnt_department IS NOT NULL;

-- Índice en threads para commercial_flow
CREATE INDEX IF NOT EXISTS idx_notif_threads_commercial
    ON notification_threads(commercial_flow, company_id)
    WHERE commercial_flow IS NOT NULL;

-- ============================================================================
-- 4. VISTA PARA NOTIFICACIONES COMERCIALES (APONNT ↔ EMPRESA)
-- ============================================================================

DROP VIEW IF EXISTS v_commercial_notifications;
CREATE VIEW v_commercial_notifications AS
SELECT
    n.id,
    n.thread_id,
    n.company_id,
    c.name as company_name,
    c.contact_email as company_email,
    n.direction,
    n.origin_type,
    n.origin_name,
    n.recipient_type,
    n.recipient_name,
    n.external_email,
    n.external_name,
    n.category,
    n.module,
    n.notification_type,
    n.priority,
    n.title,
    n.message,
    n.short_message,
    n.trace_id,
    n.vendor_id,
    CONCAT(s.first_name, ' ', s.last_name) as vendor_name,
    s.email as vendor_email,
    n.aponnt_department,
    n.is_read,
    n.read_at,
    n.requires_action,
    n.action_status,
    n.action_deadline,
    n.response_required_by,
    n.channels,
    n.sent_via_email,
    n.email_sent_at,
    n.metadata,
    n.related_entity_type,
    n.related_entity_id,
    n.created_at,
    n.updated_at
FROM unified_notifications n
LEFT JOIN companies c ON n.company_id = c.company_id
LEFT JOIN aponnt_staff s ON n.vendor_id = s.staff_id
WHERE n.is_commercial = TRUE
  AND n.deleted_at IS NULL
ORDER BY n.created_at DESC;

COMMENT ON VIEW v_commercial_notifications IS 'Vista de notificaciones del flujo comercial APONNT ↔ Empresa';

-- ============================================================================
-- 5. VISTA PARA DASHBOARD DE VENDEDOR (Panel Administrativo)
-- ============================================================================

DROP VIEW IF EXISTS v_vendor_notifications;
CREATE VIEW v_vendor_notifications AS
SELECT
    n.id,
    n.thread_id,
    n.company_id,
    c.name as company_name,
    n.direction,
    CASE
        WHEN n.direction = 'outbound' THEN 'Mensaje de empresa'
        WHEN n.direction = 'inbound' THEN 'Enviado por ti'
        ELSE 'Interno'
    END as direction_label,
    n.notification_type,
    n.priority,
    n.title,
    n.message,
    n.trace_id,
    n.vendor_id,
    n.is_read,
    n.requires_action,
    n.action_status,
    n.response_required_by,
    n.metadata->>'phase' as workflow_phase,
    n.metadata->>'budget_code' as budget_code,
    n.metadata->>'contract_code' as contract_code,
    n.metadata->>'invoice_number' as invoice_number,
    n.created_at,
    -- Contadores
    (SELECT COUNT(*) FROM unified_notifications sub
     WHERE sub.thread_id = n.thread_id AND sub.is_read = FALSE) as unread_in_thread
FROM unified_notifications n
LEFT JOIN companies c ON n.company_id = c.company_id
WHERE n.is_commercial = TRUE
  AND n.vendor_id IS NOT NULL
  AND n.deleted_at IS NULL
ORDER BY n.created_at DESC;

COMMENT ON VIEW v_vendor_notifications IS 'Vista de notificaciones para vendedores en panel-administrativo';

-- ============================================================================
-- 6. FUNCIÓN PARA CREAR NOTIFICACIÓN COMERCIAL
-- ============================================================================

CREATE OR REPLACE FUNCTION create_commercial_notification(
    p_company_id INTEGER,
    p_direction VARCHAR(20),
    p_origin_type VARCHAR(50),
    p_origin_name VARCHAR(255),
    p_recipient_type VARCHAR(50),
    p_recipient_name VARCHAR(255),
    p_title VARCHAR(255),
    p_message TEXT,
    p_notification_type VARCHAR(100),
    p_module VARCHAR(50) DEFAULT 'onboarding',
    p_priority VARCHAR(20) DEFAULT 'medium',
    p_trace_id VARCHAR(100) DEFAULT NULL,
    p_vendor_id UUID DEFAULT NULL,
    p_external_email VARCHAR(255) DEFAULT NULL,
    p_aponnt_department VARCHAR(50) DEFAULT NULL,
    p_thread_id UUID DEFAULT NULL,
    p_requires_action BOOLEAN DEFAULT FALSE,
    p_action_type VARCHAR(50) DEFAULT NULL,
    p_response_required_by TIMESTAMP DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_thread_id UUID;
    v_sequence INTEGER;
BEGIN
    -- Determinar thread_id
    IF p_thread_id IS NOT NULL THEN
        v_thread_id := p_thread_id;
        -- Obtener siguiente secuencia
        SELECT COALESCE(MAX(sequence_in_thread), 0) + 1 INTO v_sequence
        FROM unified_notifications WHERE thread_id = v_thread_id;
    ELSE
        v_thread_id := gen_random_uuid();
        v_sequence := 1;
    END IF;

    -- Insertar notificación
    INSERT INTO unified_notifications (
        company_id,
        thread_id,
        sequence_in_thread,
        direction,
        origin_type,
        origin_name,
        recipient_type,
        recipient_name,
        external_email,
        title,
        message,
        short_message,
        notification_type,
        module,
        category,
        priority,
        trace_id,
        vendor_id,
        aponnt_department,
        is_commercial,
        requires_action,
        action_type,
        action_status,
        response_required_by,
        metadata,
        channels,
        created_at
    ) VALUES (
        p_company_id,
        v_thread_id,
        v_sequence,
        p_direction,
        p_origin_type,
        p_origin_name,
        p_recipient_type,
        p_recipient_name,
        p_external_email,
        p_title,
        p_message,
        LEFT(p_message, 280),
        p_notification_type,
        p_module,
        'commercial',
        p_priority,
        p_trace_id,
        p_vendor_id,
        p_aponnt_department,
        TRUE,
        p_requires_action,
        p_action_type,
        CASE WHEN p_requires_action THEN 'pending' ELSE NULL END,
        p_response_required_by,
        p_metadata,
        '["app", "email"]'::jsonb,
        NOW()
    ) RETURNING id INTO v_notification_id;

    -- Si es nuevo thread, crear entrada en notification_threads
    IF p_thread_id IS NULL THEN
        INSERT INTO notification_threads (
            id,
            company_id,
            subject,
            category,
            module,
            thread_type,
            initiator_type,
            initiator_name,
            status,
            priority,
            message_count,
            commercial_flow,
            trace_id,
            vendor_id,
            external_email,
            created_at,
            last_message_at
        ) VALUES (
            v_thread_id,
            p_company_id,
            p_title,
            'commercial',
            p_module,
            CASE
                WHEN p_notification_type LIKE 'budget%' THEN 'quote'
                WHEN p_notification_type LIKE 'contract%' THEN 'contract'
                WHEN p_notification_type LIKE 'invoice%' THEN 'invoice'
                ELSE 'communication'
            END,
            p_origin_type,
            p_origin_name,
            'open',
            p_priority,
            1,
            'onboarding',
            p_trace_id,
            p_vendor_id,
            p_external_email,
            NOW(),
            NOW()
        );
    ELSE
        -- Actualizar thread existente
        UPDATE notification_threads
        SET message_count = message_count + 1,
            last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = v_thread_id;
    END IF;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_commercial_notification IS 'Crea una notificación comercial en el SSOT unificado';

-- ============================================================================
-- 7. FUNCIÓN PARA OBTENER HISTORIAL COMERCIAL DE EMPRESA
-- ============================================================================

CREATE OR REPLACE FUNCTION get_company_commercial_history(
    p_company_id INTEGER,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    notification_id UUID,
    thread_id UUID,
    direction VARCHAR(20),
    notification_type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    priority VARCHAR(20),
    trace_id VARCHAR(100),
    vendor_name VARCHAR(255),
    is_read BOOLEAN,
    requires_action BOOLEAN,
    action_status VARCHAR(50),
    created_at TIMESTAMP,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id as notification_id,
        n.thread_id,
        n.direction,
        n.notification_type,
        n.title,
        n.message,
        n.priority,
        n.trace_id,
        CONCAT(s.first_name, ' ', s.last_name)::VARCHAR(255) as vendor_name,
        n.is_read,
        n.requires_action,
        n.action_status,
        n.created_at,
        n.metadata
    FROM unified_notifications n
    LEFT JOIN aponnt_staff s ON n.vendor_id = s.staff_id
    WHERE n.company_id = p_company_id
      AND n.is_commercial = TRUE
      AND n.deleted_at IS NULL
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGER PARA ACTUALIZAR CONTADORES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_thread_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        UPDATE notification_threads
        SET unread_count = GREATEST(0, unread_count - 1),
            updated_at = NOW()
        WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'INSERT' AND NEW.is_read = FALSE THEN
        UPDATE notification_threads
        SET unread_count = unread_count + 1,
            updated_at = NOW()
        WHERE id = NEW.thread_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_thread_unread ON unified_notifications;
CREATE TRIGGER trg_update_thread_unread
AFTER INSERT OR UPDATE OF is_read ON unified_notifications
FOR EACH ROW
WHEN (NEW.thread_id IS NOT NULL)
EXECUTE FUNCTION update_thread_unread_count();

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'unified_notifications'
    AND column_name IN ('direction', 'external_email', 'trace_id', 'vendor_id', 'is_commercial');

    IF col_count = 5 THEN
        RAISE NOTICE '✅ Migración completada: 5 columnas comerciales agregadas a unified_notifications';
    ELSE
        RAISE NOTICE '⚠️ Migración parcial: % de 5 columnas agregadas', col_count;
    END IF;
END $$;

SELECT 'Migración 20251216_extend_unified_notifications_commercial completada' as status;
