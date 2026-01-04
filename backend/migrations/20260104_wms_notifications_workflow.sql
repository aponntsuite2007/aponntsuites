-- ============================================================================
-- WMS NOTIFICATIONS WORKFLOW
-- Sistema de notificaciones para solicitudes de material y reservas
-- ============================================================================

-- 1. FUNCION: Encolar notificacion WMS
CREATE OR REPLACE FUNCTION wms_queue_notification(
    p_company_id INTEGER,
    p_notification_type VARCHAR(50),
    p_entity_type VARCHAR(30),
    p_entity_id INTEGER,
    p_recipient_user_id UUID,
    p_recipient_role VARCHAR(30),
    p_title VARCHAR(200),
    p_message TEXT,
    p_action_url VARCHAR(500),
    p_priority VARCHAR(10) DEFAULT 'normal'
) RETURNS INTEGER AS $$
DECLARE
    v_notification_id INTEGER;
BEGIN
    INSERT INTO wms_notification_queue (
        company_id, notification_type, entity_type, entity_id,
        recipient_user_id, recipient_role, title, message,
        action_url, priority, status, created_at
    ) VALUES (
        p_company_id, p_notification_type, p_entity_type, p_entity_id,
        p_recipient_user_id, p_recipient_role, p_title, p_message,
        p_action_url, p_priority, 'pending', NOW()
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER: Al crear solicitud de material -> notificar responsable del almacen
CREATE OR REPLACE FUNCTION wms_notify_material_request_created() RETURNS TRIGGER AS $$
DECLARE
    v_manager RECORD;
    v_requester_email VARCHAR(200);
BEGIN
    -- Obtener email del solicitante
    SELECT email INTO v_requester_email FROM users WHERE user_id = NEW.requested_by;

    -- Buscar responsables del almacen
    FOR v_manager IN
        SELECT ws.user_id, u.email
        FROM wms_warehouse_staff ws
        JOIN users u ON ws.user_id = u.user_id
        WHERE ws.warehouse_id = NEW.source_warehouse_id
          AND ws.can_approve_requests = true
          AND ws.is_active = true
    LOOP
        PERFORM wms_queue_notification(
            NEW.company_id,
            'MATERIAL_REQUEST_CREATED',
            'MATERIAL_REQUEST',
            NEW.id,
            v_manager.user_id,
            'warehouse_manager',
            'Nueva Solicitud de Material: ' || NEW.request_number,
            'El usuario ' || COALESCE(v_requester_email, 'desconocido') ||
            ' ha creado la solicitud ' || NEW.request_number ||
            ' con fecha requerida ' || TO_CHAR(NEW.required_date, 'DD/MM/YYYY') ||
            '. Prioridad: ' || COALESCE(NEW.priority, 'normal'),
            '/warehouse-management?tab=requests&id=' || NEW.id,
            CASE WHEN NEW.priority = 'urgent' THEN 'high' ELSE 'normal' END
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_material_request_created ON wms_material_requests;
CREATE TRIGGER trg_material_request_created
    AFTER INSERT ON wms_material_requests
    FOR EACH ROW
    WHEN (NEW.status = 'submitted')
    EXECUTE FUNCTION wms_notify_material_request_created();

-- 3. TRIGGER: Al aprobar/rechazar solicitud -> notificar solicitante
CREATE OR REPLACE FUNCTION wms_notify_material_request_status_change() RETURNS TRIGGER AS $$
DECLARE
    v_title VARCHAR(200);
    v_message TEXT;
BEGIN
    IF OLD.status != NEW.status THEN
        IF NEW.status = 'approved' THEN
            v_title := 'Solicitud Aprobada: ' || NEW.request_number;
            v_message := 'Tu solicitud de material ' || NEW.request_number ||
                        ' ha sido APROBADA. ' ||
                        CASE WHEN NEW.reservation_status = 'fully_reserved'
                             THEN 'Todo el material ha sido reservado.'
                             WHEN NEW.reservation_status = 'partially_reserved'
                             THEN 'Parte del material ha sido reservado, el resto esta pendiente.'
                             ELSE 'La reserva esta pendiente.'
                        END;
        ELSIF NEW.status = 'rejected' THEN
            v_title := 'Solicitud Rechazada: ' || NEW.request_number;
            v_message := 'Tu solicitud de material ' || NEW.request_number ||
                        ' ha sido RECHAZADA. Motivo: ' || COALESCE(NEW.approval_notes, 'No especificado');
        ELSIF NEW.status = 'prepared' THEN
            v_title := 'Material Preparado: ' || NEW.request_number;
            v_message := 'El material de tu solicitud ' || NEW.request_number ||
                        ' esta listo para ser retirado/entregado.';
        ELSIF NEW.status = 'dispatched' THEN
            v_title := 'Material Despachado: ' || NEW.request_number;
            v_message := 'El material de tu solicitud ' || NEW.request_number ||
                        ' ha sido despachado.';
        ELSIF NEW.status = 'delivered' THEN
            v_title := 'Material Entregado: ' || NEW.request_number;
            v_message := 'El material de tu solicitud ' || NEW.request_number ||
                        ' ha sido entregado. La solicitud esta completa.';
        ELSE
            RETURN NEW;
        END IF;

        -- Notificar al solicitante
        PERFORM wms_queue_notification(
            NEW.company_id,
            'MATERIAL_REQUEST_STATUS_CHANGE',
            'MATERIAL_REQUEST',
            NEW.id,
            NEW.requested_by,
            NULL,
            v_title,
            v_message,
            '/warehouse-management?tab=my-requests&id=' || NEW.id,
            CASE WHEN NEW.status = 'rejected' THEN 'high' ELSE 'normal' END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_material_request_status_change ON wms_material_requests;
CREATE TRIGGER trg_material_request_status_change
    AFTER UPDATE ON wms_material_requests
    FOR EACH ROW
    EXECUTE FUNCTION wms_notify_material_request_status_change();

-- 4. FUNCION: Notificar solicitudes con fecha de entrega hoy (para job diario)
CREATE OR REPLACE FUNCTION wms_notify_due_requests() RETURNS INTEGER AS $$
DECLARE
    v_request RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_request IN
        SELECT mr.*, u.email as requester_email, w.name as warehouse_name
        FROM wms_material_requests mr
        JOIN users u ON mr.requested_by = u.user_id
        JOIN wms_warehouses w ON mr.source_warehouse_id = w.id
        WHERE mr.required_date = CURRENT_DATE
          AND mr.status IN ('approved', 'reserved')
    LOOP
        -- Notificar al responsable del almacen
        PERFORM wms_queue_notification(
            v_request.company_id,
            'MATERIAL_REQUEST_DUE_TODAY',
            'MATERIAL_REQUEST',
            v_request.id,
            NULL,
            'warehouse_manager',
            'Entrega Programada Hoy: ' || v_request.request_number,
            'La solicitud ' || v_request.request_number || ' de ' || v_request.requester_email ||
            ' tiene entrega programada para HOY. Almacen: ' || v_request.warehouse_name,
            '/warehouse-management?tab=requests&id=' || v_request.id,
            'high'
        );

        -- Notificar al solicitante
        PERFORM wms_queue_notification(
            v_request.company_id,
            'MATERIAL_REQUEST_DUE_TODAY',
            'MATERIAL_REQUEST',
            v_request.id,
            v_request.requested_by,
            NULL,
            'Tu Solicitud Vence Hoy: ' || v_request.request_number,
            'Tu solicitud de material ' || v_request.request_number ||
            ' esta programada para entregarse HOY.',
            '/warehouse-management?tab=my-requests&id=' || v_request.id,
            'high'
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCION: Notificar cuando se recibe material reservado (para integracion con recepciones)
CREATE OR REPLACE FUNCTION wms_notify_reserved_material_received(
    p_product_id INTEGER,
    p_warehouse_id INTEGER,
    p_quantity_received DECIMAL
) RETURNS INTEGER AS $$
DECLARE
    v_request RECORD;
    v_notified INTEGER := 0;
BEGIN
    -- Buscar solicitudes pendientes que esperan este material
    FOR v_request IN
        SELECT
            mr.id,
            mr.company_id,
            mr.request_number,
            mr.requested_by,
            mrl.requested_quantity,
            mrl.reserved_quantity,
            mrl.pending_po_quantity,
            p.internal_code,
            p.description
        FROM wms_material_request_lines mrl
        JOIN wms_material_requests mr ON mrl.request_id = mr.id
        JOIN wms_products p ON mrl.product_id = p.id
        WHERE mrl.product_id = p_product_id
          AND mr.source_warehouse_id = p_warehouse_id
          AND mr.status IN ('approved', 'submitted')
          AND mrl.pending_po_quantity > 0
    LOOP
        PERFORM wms_queue_notification(
            v_request.company_id,
            'RESERVED_MATERIAL_RECEIVED',
            'MATERIAL_REQUEST',
            v_request.id,
            v_request.requested_by,
            NULL,
            'Material Recibido: ' || v_request.internal_code,
            'Se ha recibido stock del producto ' || v_request.description ||
            ' (' || v_request.internal_code || ') que estaba pendiente para tu solicitud ' ||
            v_request.request_number || '. Cantidad recibida: ' || p_quantity_received,
            '/warehouse-management?tab=my-requests&id=' || v_request.id,
            'normal'
        );

        v_notified := v_notified + 1;
    END LOOP;

    RETURN v_notified;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNCION: Procesar cola de notificaciones y enviar al sistema central
CREATE OR REPLACE FUNCTION wms_get_pending_notifications(
    p_company_id INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
    id INTEGER,
    company_id INTEGER,
    notification_type VARCHAR(50),
    entity_type VARCHAR(30),
    entity_id INTEGER,
    recipient_user_id UUID,
    recipient_role VARCHAR(30),
    title VARCHAR(200),
    message TEXT,
    action_url VARCHAR(500),
    priority VARCHAR(10),
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        nq.id,
        nq.company_id,
        nq.notification_type,
        nq.entity_type,
        nq.entity_id,
        nq.recipient_user_id,
        nq.recipient_role,
        nq.title,
        nq.message,
        nq.action_url,
        nq.priority,
        nq.created_at
    FROM wms_notification_queue nq
    WHERE nq.status = 'pending'
      AND (p_company_id IS NULL OR nq.company_id = p_company_id)
    ORDER BY
        CASE nq.priority
            WHEN 'urgent' THEN 0
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
        END,
        nq.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCION: Marcar notificacion como enviada
CREATE OR REPLACE FUNCTION wms_mark_notification_sent(
    p_notification_id INTEGER,
    p_central_notification_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE wms_notification_queue
    SET status = 'sent',
        sent_at = NOW(),
        central_notification_id = p_central_notification_id
    WHERE id = p_notification_id
      AND status = 'pending';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. Vista de solicitudes con alerta de vencimiento
CREATE OR REPLACE VIEW v_wms_requests_due_alerts AS
SELECT
    mr.*,
    u.email as requester_email,
    w.name as warehouse_name,
    CASE
        WHEN mr.required_date < CURRENT_DATE THEN 'VENCIDA'
        WHEN mr.required_date = CURRENT_DATE THEN 'HOY'
        WHEN mr.required_date = CURRENT_DATE + 1 THEN 'MANANA'
        WHEN mr.required_date <= CURRENT_DATE + 3 THEN 'PROXIMA'
        ELSE 'NORMAL'
    END as urgency_status,
    mr.required_date - CURRENT_DATE as days_until_due
FROM wms_material_requests mr
JOIN users u ON mr.requested_by = u.user_id
JOIN wms_warehouses w ON mr.source_warehouse_id = w.id
WHERE mr.status IN ('submitted', 'approved', 'reserved', 'prepared')
ORDER BY mr.required_date ASC;

-- 9. Indice para busqueda eficiente de notificaciones pendientes
CREATE INDEX IF NOT EXISTS idx_wms_notif_pending ON wms_notification_queue(status, priority, created_at)
WHERE status = 'pending';

COMMENT ON FUNCTION wms_queue_notification IS 'Encola una notificacion WMS para ser enviada al sistema central';
COMMENT ON FUNCTION wms_notify_due_requests IS 'Ejecutar diariamente para notificar solicitudes con fecha de entrega hoy';
COMMENT ON FUNCTION wms_notify_reserved_material_received IS 'Llamar cuando se recibe material que tiene solicitudes pendientes';
