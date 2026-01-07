-- =====================================================
-- SISTEMA DE COMUNICACIONES PROVEEDOR-EMPRESA
-- Multi-tenant, bidireccional, con adjuntos
-- =====================================================
-- Fecha: 2026-01-06
-- Propósito:
--   1. Comunicación bidireccional empresa ↔ proveedor
--   2. Multi-tenant (varias empresas, varios proveedores)
--   3. Notificaciones push cuando hay mensajes nuevos
--   4. Adjuntos en mensajes
--   5. Historial completo de comunicaciones
-- =====================================================

BEGIN;

-- ============================================================================
-- TABLA: supplier_communications
-- Sistema central de mensajería multi-tenant
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_communications (
    id SERIAL PRIMARY KEY,

    -- MULTI-TENANT
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(supplier_id) ON DELETE CASCADE,

    -- CONTEXTO (a qué se refiere el mensaje)
    context_type VARCHAR(50) NOT NULL CHECK (context_type IN ('rfq', 'purchase_order', 'invoice', 'claim', 'general')),
    context_id INTEGER,  -- ID del RFQ, PO, Invoice, etc.

    -- MENSAJE
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('notification', 'message', 'alert', 'reminder')),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    -- REMITENTE
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('company', 'supplier')),
    sender_user_id UUID,  -- ID del usuario que envió (si es empresa)
    sender_name VARCHAR(100),

    -- DESTINATARIO
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('company', 'supplier')),

    -- ESTADO
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- ADJUNTOS
    has_attachments BOOLEAN DEFAULT FALSE,
    attachments_count INTEGER DEFAULT 0,

    -- METADATA
    metadata JSONB DEFAULT '{}',

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- ÍNDICES para búsqueda rápida
    CONSTRAINT valid_context CHECK (
        (context_type = 'general') OR
        (context_type != 'general' AND context_id IS NOT NULL)
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_supplier_comms_company ON supplier_communications(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_comms_supplier ON supplier_communications(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_comms_context ON supplier_communications(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_supplier_comms_unread ON supplier_communications(is_read, recipient_type);
CREATE INDEX IF NOT EXISTS idx_supplier_comms_created ON supplier_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_comms_priority ON supplier_communications(priority, is_read);

-- Índice compuesto para consultas comunes
CREATE INDEX IF NOT EXISTS idx_supplier_comms_lookup
ON supplier_communications(company_id, supplier_id, is_read, created_at DESC);

COMMENT ON TABLE supplier_communications IS 'Sistema central de mensajería multi-tenant entre empresas y proveedores';
COMMENT ON COLUMN supplier_communications.context_type IS 'Tipo de contexto: rfq, purchase_order, invoice, claim, general';
COMMENT ON COLUMN supplier_communications.sender_type IS 'Quien envía: company o supplier';
COMMENT ON COLUMN supplier_communications.recipient_type IS 'Quien recibe: company o supplier';

-- ============================================================================
-- TABLA: supplier_communication_attachments
-- Adjuntos en mensajes
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_communication_attachments (
    id SERIAL PRIMARY KEY,
    communication_id INTEGER NOT NULL REFERENCES supplier_communications(id) ON DELETE CASCADE,

    -- ARCHIVO
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- METADATA
    uploaded_by_type VARCHAR(20) NOT NULL CHECK (uploaded_by_type IN ('company', 'supplier')),
    uploaded_by_user_id UUID,

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- ÍNDICES
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 52428800)  -- Max 50 MB
);

CREATE INDEX IF NOT EXISTS idx_comm_attachments_comm ON supplier_communication_attachments(communication_id);

COMMENT ON TABLE supplier_communication_attachments IS 'Adjuntos en mensajes del sistema de comunicaciones';

-- ============================================================================
-- TABLA: supplier_notification_preferences
-- Preferencias de notificación por proveedor
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_notification_preferences (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(supplier_id) ON DELETE CASCADE,

    -- CANALES
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,

    -- TIPOS DE NOTIFICACIONES
    notify_new_rfq BOOLEAN DEFAULT TRUE,
    notify_po_approved BOOLEAN DEFAULT TRUE,
    notify_payment_confirmed BOOLEAN DEFAULT TRUE,
    notify_new_message BOOLEAN DEFAULT TRUE,
    notify_claim_update BOOLEAN DEFAULT TRUE,

    -- FRECUENCIA
    digest_frequency VARCHAR(20) DEFAULT 'realtime' CHECK (digest_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),

    -- HORARIOS
    quiet_hours_start TIME,
    quiet_hours_end TIME,

    -- TIMESTAMPS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(supplier_id)
);

COMMENT ON TABLE supplier_notification_preferences IS 'Preferencias de notificación configurables por proveedor';

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función: Obtener mensajes no leídos para un proveedor
CREATE OR REPLACE FUNCTION get_unread_supplier_messages(p_supplier_id INT)
RETURNS TABLE (
    communication_id INT,
    company_name VARCHAR(200),
    subject VARCHAR(200),
    preview TEXT,
    priority VARCHAR(20),
    created_at TIMESTAMP,
    context_type VARCHAR(50),
    has_attachments BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        c.name,
        sc.subject,
        LEFT(sc.message, 100) || '...',
        sc.priority,
        sc.created_at,
        sc.context_type,
        sc.has_attachments
    FROM supplier_communications sc
    JOIN companies c ON c.company_id = sc.company_id
    WHERE sc.supplier_id = p_supplier_id
      AND sc.recipient_type = 'supplier'
      AND sc.is_read = FALSE
    ORDER BY
        CASE sc.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
        END,
        sc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener mensajes no leídos para una empresa (de todos sus proveedores)
CREATE OR REPLACE FUNCTION get_unread_company_messages(p_company_id INT)
RETURNS TABLE (
    communication_id INT,
    supplier_name VARCHAR(200),
    subject VARCHAR(200),
    preview TEXT,
    priority VARCHAR(20),
    created_at TIMESTAMP,
    context_type VARCHAR(50),
    has_attachments BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        s.name,
        sc.subject,
        LEFT(sc.message, 100) || '...',
        sc.priority,
        sc.created_at,
        sc.context_type,
        sc.has_attachments
    FROM supplier_communications sc
    JOIN wms_suppliers s ON s.supplier_id = sc.supplier_id
    WHERE sc.company_id = p_company_id
      AND sc.recipient_type = 'company'
      AND sc.is_read = FALSE
    ORDER BY
        CASE sc.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
        END,
        sc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función: Marcar mensaje como leído
CREATE OR REPLACE FUNCTION mark_message_as_read(p_communication_id INT)
RETURNS VOID AS $$
BEGIN
    UPDATE supplier_communications
    SET is_read = TRUE,
        read_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_communication_id
      AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Función: Estadísticas de comunicación para un proveedor
CREATE OR REPLACE FUNCTION get_supplier_communication_stats(p_supplier_id INT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_messages', COUNT(*),
        'unread_messages', COUNT(*) FILTER (WHERE is_read = FALSE AND recipient_type = 'supplier'),
        'urgent_messages', COUNT(*) FILTER (WHERE priority = 'urgent' AND is_read = FALSE AND recipient_type = 'supplier'),
        'messages_sent', COUNT(*) FILTER (WHERE sender_type = 'supplier'),
        'messages_received', COUNT(*) FILTER (WHERE recipient_type = 'supplier'),
        'last_message_date', MAX(created_at),
        'avg_response_time_hours', ROUND(AVG(EXTRACT(EPOCH FROM (read_at - created_at)) / 3600)::numeric, 2)
    ) INTO result
    FROM supplier_communications
    WHERE supplier_id = p_supplier_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-actualizar updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_supplier_communication_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_supplier_communication_timestamp
    BEFORE UPDATE ON supplier_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_communication_timestamp();

-- ============================================================================
-- TRIGGER: Auto-incrementar contador de adjuntos
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_attachments_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE supplier_communications
    SET has_attachments = TRUE,
        attachments_count = attachments_count + 1
    WHERE id = NEW.communication_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_attachments_count
    AFTER INSERT ON supplier_communication_attachments
    FOR EACH ROW
    EXECUTE FUNCTION increment_attachments_count();

-- ============================================================================
-- DATOS DE PRUEBA (opcional)
-- ============================================================================

-- Insertar preferencias por defecto para proveedores existentes
INSERT INTO supplier_notification_preferences (supplier_id)
SELECT supplier_id FROM wms_suppliers
WHERE NOT EXISTS (
    SELECT 1 FROM supplier_notification_preferences
    WHERE supplier_notification_preferences.supplier_id = wms_suppliers.supplier_id
);

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Contar tablas creadas
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN (
        'supplier_communications',
        'supplier_communication_attachments',
        'supplier_notification_preferences'
    );

    -- Contar funciones creadas
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN (
        'get_unread_supplier_messages',
        'get_unread_company_messages',
        'mark_message_as_read',
        'get_supplier_communication_stats'
    );

    RAISE NOTICE '✅ Sistema de Comunicaciones Supplier-Empresa instalado';
    RAISE NOTICE '   Tablas creadas: %', table_count;
    RAISE NOTICE '   Funciones helper: %', function_count;

    IF table_count = 3 AND function_count = 4 THEN
        RAISE NOTICE '   ✅ INSTALACIÓN COMPLETA';
    ELSE
        RAISE WARNING '   ⚠️ Verificar instalación (faltan componentes)';
    END IF;
END $$;
