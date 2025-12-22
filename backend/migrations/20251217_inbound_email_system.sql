-- ============================================================================
-- SISTEMA DE EMAILS ENTRANTES (INBOUND EMAIL)
-- ============================================================================
-- Procesa respuestas de emails y las vincula con threads de notificaciones
-- Compatible con: SendGrid, Mailgun, Postmark, Amazon SES
-- Fecha: 2025-12-17
-- ============================================================================

-- 1. Tabla de emails entrantes (log de todos los emails recibidos)
CREATE TABLE IF NOT EXISTS email_inbound_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificadores del email
    message_id VARCHAR(500),                    -- Message-ID del email entrante
    in_reply_to VARCHAR(500),                   -- In-Reply-To header (referencia al email original)
    references_header TEXT,                     -- References header (cadena de emails)

    -- Datos del remitente
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),

    -- Datos del destinatario
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    cc_emails JSONB DEFAULT '[]',

    -- Contenido
    subject VARCHAR(1000),
    body_text TEXT,
    body_html TEXT,
    attachments JSONB DEFAULT '[]',             -- [{filename, size, content_type, url}]

    -- Headers raw para debugging
    raw_headers JSONB DEFAULT '{}',

    -- Vinculación con sistema de notificaciones
    linked_notification_id UUID,                -- Notificación original a la que responde
    linked_thread_id UUID,                      -- Thread/conversación
    linked_group_id UUID,                       -- Grupo de notificaciones (inbox)
    linked_company_id INTEGER,                  -- Empresa detectada
    linked_user_id INTEGER,                     -- Usuario detectado (si es interno)

    -- Estado de procesamiento
    processing_status VARCHAR(50) DEFAULT 'PENDING',
    -- PENDING, PROCESSING, LINKED, ORPHAN, SPAM, ERROR
    processing_error TEXT,
    processed_at TIMESTAMP,

    -- Resultado
    created_message_id UUID,                    -- ID del mensaje creado en el thread
    response_sent BOOLEAN DEFAULT false,
    response_sent_at TIMESTAMP,

    -- Proveedor de email (para debugging)
    email_provider VARCHAR(50),                 -- sendgrid, mailgun, postmark, ses, manual
    provider_event_id VARCHAR(255),

    -- Metadata
    spam_score DECIMAL(5,2),
    is_auto_reply BOOLEAN DEFAULT false,
    detected_language VARCHAR(10),

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_inbound_message_id ON email_inbound_log(message_id);
CREATE INDEX IF NOT EXISTS idx_inbound_in_reply_to ON email_inbound_log(in_reply_to);
CREATE INDEX IF NOT EXISTS idx_inbound_from_email ON email_inbound_log(from_email);
CREATE INDEX IF NOT EXISTS idx_inbound_to_email ON email_inbound_log(to_email);
CREATE INDEX IF NOT EXISTS idx_inbound_status ON email_inbound_log(processing_status);
CREATE INDEX IF NOT EXISTS idx_inbound_linked_thread ON email_inbound_log(linked_thread_id);
CREATE INDEX IF NOT EXISTS idx_inbound_linked_notification ON email_inbound_log(linked_notification_id);
CREATE INDEX IF NOT EXISTS idx_inbound_created_at ON email_inbound_log(created_at DESC);

-- 2. Tabla de mapeo email -> entidad (para resolver respuestas)
CREATE TABLE IF NOT EXISTS email_thread_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Email enviado
    outbound_message_id VARCHAR(500) UNIQUE NOT NULL,  -- Message-ID del email que enviamos

    -- Vinculación
    notification_id UUID,
    thread_id UUID,
    group_id UUID,                              -- notification_groups.id
    company_id INTEGER,

    -- Contexto
    entity_type VARCHAR(50),                    -- contract_renewal, budget, support, etc.
    entity_id VARCHAR(100),                     -- ID de la entidad relacionada

    -- Destinatario original
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    recipient_type VARCHAR(50),                 -- vendor, company, employee, external

    -- Estado
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,                       -- Opcional: expiración del mapeo

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mapping_outbound_id ON email_thread_mapping(outbound_message_id);
CREATE INDEX IF NOT EXISTS idx_mapping_notification ON email_thread_mapping(notification_id);
CREATE INDEX IF NOT EXISTS idx_mapping_thread ON email_thread_mapping(thread_id);
CREATE INDEX IF NOT EXISTS idx_mapping_group ON email_thread_mapping(group_id);
CREATE INDEX IF NOT EXISTS idx_mapping_recipient ON email_thread_mapping(recipient_email);

-- 3. Agregar columnas a email_logs para tracking de respuestas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'email_logs' AND column_name = 'tracking_id') THEN
        ALTER TABLE email_logs ADD COLUMN tracking_id UUID DEFAULT gen_random_uuid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'email_logs' AND column_name = 'reply_to_address') THEN
        ALTER TABLE email_logs ADD COLUMN reply_to_address VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'email_logs' AND column_name = 'expects_reply') THEN
        ALTER TABLE email_logs ADD COLUMN expects_reply BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'email_logs' AND column_name = 'reply_received') THEN
        ALTER TABLE email_logs ADD COLUMN reply_received BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'email_logs' AND column_name = 'reply_received_at') THEN
        ALTER TABLE email_logs ADD COLUMN reply_received_at TIMESTAMP;
    END IF;
END $$;

-- 4. Función para buscar thread por Message-ID o In-Reply-To
CREATE OR REPLACE FUNCTION find_thread_by_email_reference(p_message_id VARCHAR, p_in_reply_to VARCHAR)
RETURNS TABLE(
    notification_id UUID,
    thread_id UUID,
    group_id UUID,
    company_id INTEGER,
    entity_type VARCHAR,
    entity_id VARCHAR,
    recipient_type VARCHAR
) AS $$
BEGIN
    -- Primero buscar por In-Reply-To (más específico)
    IF p_in_reply_to IS NOT NULL AND p_in_reply_to != '' THEN
        RETURN QUERY
        SELECT
            m.notification_id,
            m.thread_id,
            m.group_id,
            m.company_id,
            m.entity_type,
            m.entity_id,
            m.recipient_type
        FROM email_thread_mapping m
        WHERE m.outbound_message_id = p_in_reply_to
          AND m.is_active = true
        LIMIT 1;

        IF FOUND THEN RETURN; END IF;
    END IF;

    -- Si no se encontró, buscar en email_logs por message_id
    IF p_in_reply_to IS NOT NULL THEN
        RETURN QUERY
        SELECT
            el.notification_id::UUID,
            NULL::UUID as thread_id,
            NULL::UUID as group_id,
            el.company_id,
            el.category as entity_type,
            el.notification_id::VARCHAR as entity_id,
            el.recipient_type
        FROM email_logs el
        WHERE el.message_id = p_in_reply_to
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para procesar email entrante y crear mensaje en thread
CREATE OR REPLACE FUNCTION process_inbound_email_to_thread(
    p_inbound_id UUID,
    p_group_id UUID,
    p_from_email VARCHAR,
    p_from_name VARCHAR,
    p_subject VARCHAR,
    p_body_text TEXT,
    p_company_id INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
    v_sequence INTEGER;
    v_sender_type VARCHAR := 'external';
    v_sender_id INTEGER;
    v_sender_name VARCHAR;
BEGIN
    -- Intentar identificar si el remitente es un usuario del sistema
    SELECT user_id, COALESCE(first_name || ' ' || last_name, username) INTO v_sender_id, v_sender_name
    FROM users
    WHERE email = p_from_email AND company_id = p_company_id
    LIMIT 1;

    IF v_sender_id IS NOT NULL THEN
        v_sender_type := 'employee';
    ELSE
        v_sender_name := COALESCE(p_from_name, p_from_email);
    END IF;

    -- Obtener siguiente número de secuencia
    SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_sequence
    FROM notification_messages
    WHERE group_id = p_group_id;

    -- Crear mensaje en el thread
    INSERT INTO notification_messages (
        id,
        group_id,
        sequence_number,
        sender_type,
        sender_id,
        sender_name,
        recipient_type,
        recipient_id,
        recipient_name,
        message_type,
        subject,
        content,
        source_channel,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_group_id,
        v_sequence,
        v_sender_type,
        v_sender_id,
        v_sender_name,
        'system',
        NULL,
        'Sistema',
        'reply',
        p_subject,
        p_body_text,
        'email_inbound',
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_message_id;

    -- Actualizar grupo con última actividad
    UPDATE notification_groups
    SET updated_at = CURRENT_TIMESTAMP,
        status = CASE WHEN status = 'closed' THEN 'reopened' ELSE status END
    WHERE id = p_group_id;

    -- Actualizar el log de inbound
    UPDATE email_inbound_log
    SET processing_status = 'LINKED',
        created_message_id = v_message_id,
        processed_at = CURRENT_TIMESTAMP
    WHERE id = p_inbound_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Vista para emails pendientes de procesar
CREATE OR REPLACE VIEW v_pending_inbound_emails AS
SELECT
    eil.*,
    CASE
        WHEN eil.linked_thread_id IS NOT NULL THEN 'has_thread'
        WHEN eil.linked_notification_id IS NOT NULL THEN 'has_notification'
        WHEN eil.in_reply_to IS NOT NULL THEN 'has_reference'
        ELSE 'no_reference'
    END as linkage_status
FROM email_inbound_log eil
WHERE eil.processing_status = 'PENDING'
ORDER BY eil.created_at ASC;

-- Comentarios
COMMENT ON TABLE email_inbound_log IS 'Log de todos los emails entrantes recibidos vía webhook';
COMMENT ON TABLE email_thread_mapping IS 'Mapeo entre Message-ID de emails enviados y threads de notificaciones';
COMMENT ON FUNCTION find_thread_by_email_reference IS 'Busca el thread correspondiente a una respuesta de email';
COMMENT ON FUNCTION process_inbound_email_to_thread IS 'Procesa un email entrante y crea mensaje en el thread';

SELECT 'Migración completada: Sistema de emails entrantes' as resultado;
