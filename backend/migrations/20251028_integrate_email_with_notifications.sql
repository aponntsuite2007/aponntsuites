-- ============================================================================
-- INTEGRACIÓN TOTAL: SISTEMA DE EMAILS + SISTEMA DE NOTIFICACIONES
-- ============================================================================
-- Autor: Sistema Biométrico Aponnt
-- Fecha: 2025-10-28
-- Descripción: Integra el sistema de emails multicapa con el sistema de
--              notificaciones enterprise existente. CADA notificación que
--              tenga sent_via_email = true automáticamente enviará un email
--              respetando las preferencias del usuario.
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar columna email_log_id a notifications
-- ============================================================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS email_log_id BIGINT REFERENCES email_logs(id);

CREATE INDEX IF NOT EXISTS idx_notifications_email_log ON notifications(email_log_id);

COMMENT ON COLUMN notifications.email_log_id IS 'FK a email_logs - vincula notificación con email enviado';

-- ============================================================================
-- PASO 2: Agregar notification_id a email_logs (ya existe pero agregar índice)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_logs_notification ON email_logs(notification_id);

-- ============================================================================
-- PASO 3: Sincronizar user_notification_preferences con user_emails
-- ============================================================================

-- Agregar columnas de preferencias de email a user_notification_preferences
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS email_format VARCHAR(20) DEFAULT 'html',
ADD COLUMN IF NOT EXISTS email_frequency VARCHAR(20) DEFAULT 'instant',
ADD COLUMN IF NOT EXISTS email_language VARCHAR(10) DEFAULT 'es';

ALTER TABLE user_notification_preferences
ADD CONSTRAINT chk_email_format
CHECK (email_format IN ('html', 'text'));

ALTER TABLE user_notification_preferences
ADD CONSTRAINT chk_email_frequency
CHECK (email_frequency IN ('instant', 'daily_digest', 'weekly_digest'));

COMMENT ON COLUMN user_notification_preferences.email_format IS 'Formato de emails: html o text';
COMMENT ON COLUMN user_notification_preferences.email_frequency IS 'Frecuencia de envío: instant, daily_digest, weekly_digest';

-- ============================================================================
-- PASO 4: Tabla de mapeo de módulos a tipos de email
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_email_mapping (
    id SERIAL PRIMARY KEY,

    -- Módulo y tipo de notificación
    module VARCHAR(50) NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    category VARCHAR(50),

    -- Mapeo a tipo de email en user_emails
    email_type VARCHAR(50) NOT NULL,

    -- Si requiere verificación de preferencias
    requires_preference_check BOOLEAN DEFAULT true,
    user_emails_preference_field VARCHAR(100),

    -- Prioridad del email
    email_priority VARCHAR(20) DEFAULT 'normal',

    -- Template por defecto
    default_template_key VARCHAR(100),

    -- Si debe enviarse aunque el usuario no tenga preferencia activada
    force_send BOOLEAN DEFAULT false,

    -- Activo
    is_active BOOLEAN DEFAULT true,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_notification_email_mapping UNIQUE(module, notification_type)
);

CREATE INDEX idx_notification_email_mapping_module ON notification_email_mapping(module);
CREATE INDEX idx_notification_email_mapping_type ON notification_email_mapping(notification_type);

COMMENT ON TABLE notification_email_mapping IS 'Mapeo entre notificaciones y tipos de email para verificar preferencias';

-- ============================================================================
-- PASO 5: Datos iniciales - Mapeo de notificaciones a emails
-- ============================================================================

INSERT INTO notification_email_mapping (module, notification_type, category, email_type, user_emails_preference_field, email_priority, default_template_key)
VALUES
    -- Asistencia
    ('attendance', 'late_arrival', 'alert', 'attendance', 'receive_attendance_alerts', 'high', 'late_arrival_alert'),
    ('attendance', 'early_departure', 'alert', 'attendance', 'receive_attendance_alerts', 'high', 'early_departure_alert'),
    ('attendance', 'absence', 'alert', 'attendance', 'receive_attendance_alerts', 'high', 'absence_alert'),
    ('attendance', 'missing_checkout', 'warning', 'attendance', 'receive_attendance_alerts', 'normal', 'missing_checkout_reminder'),

    -- Vacaciones
    ('vacation', 'request_submitted', 'info', 'vacation', 'receive_vacation_updates', 'normal', 'vacation_request_submitted'),
    ('vacation', 'request_approved', 'success', 'vacation', 'receive_vacation_updates', 'normal', 'vacation_approved'),
    ('vacation', 'request_rejected', 'error', 'vacation', 'receive_vacation_updates', 'normal', 'vacation_rejected'),
    ('vacation', 'balance_updated', 'info', 'vacation', 'receive_vacation_updates', 'low', 'vacation_balance_updated'),

    -- Turnos
    ('shifts', 'shift_assigned', 'info', 'shifts', 'receive_shifts_changes', 'normal', 'shift_assigned'),
    ('shifts', 'shift_changed', 'warning', 'shifts', 'receive_shifts_changes', 'high', 'shift_changed'),
    ('shifts', 'shift_swap_request', 'info', 'shifts', 'receive_shifts_changes', 'normal', 'shift_swap_request'),
    ('shifts', 'shift_swap_approved', 'success', 'shifts', 'receive_shifts_changes', 'normal', 'shift_swap_approved'),

    -- Médico
    ('medical', 'appointment_scheduled', 'info', 'medical', 'receive_medical_notifications', 'normal', 'medical_appointment_scheduled'),
    ('medical', 'appointment_reminder', 'warning', 'medical', 'receive_medical_notifications', 'high', 'medical_appointment_reminder'),
    ('medical', 'certificate_uploaded', 'success', 'medical', 'receive_medical_notifications', 'normal', 'medical_certificate_uploaded'),
    ('medical', 'certificate_expiring', 'warning', 'medical', 'receive_medical_notifications', 'high', 'medical_certificate_expiring'),

    -- Nómina
    ('payroll', 'payslip_available', 'info', 'payroll', 'receive_payroll_notifications', 'normal', 'payslip_available'),
    ('payroll', 'bonus_received', 'success', 'payroll', 'receive_payroll_notifications', 'normal', 'bonus_received'),
    ('payroll', 'deduction_applied', 'warning', 'payroll', 'receive_payroll_notifications', 'normal', 'deduction_applied'),

    -- Legal
    ('legal', 'warning_issued', 'warning', 'legal', 'receive_legal_notices', 'high', 'legal_warning_issued'),
    ('legal', 'suspension_notice', 'error', 'legal', 'receive_legal_notices', 'high', 'legal_suspension_notice'),
    ('legal', 'termination_notice', 'error', 'legal', 'receive_legal_notices', 'high', 'legal_termination_notice'),

    -- Sistema
    ('system', 'password_reset', 'info', 'system', 'receive_system_notifications', 'high', 'password_reset'),

    -- Soporte Tickets (para empleados)
    ('support', 'ticket_created', 'info', 'system', 'receive_system_notifications', 'normal', 'support_ticket_created'),
    ('support', 'ticket_status_changed', 'info', 'system', 'receive_system_notifications', 'normal', 'support_ticket_status_changed'),
    ('support', 'ticket_resolved', 'success', 'system', 'receive_system_notifications', 'normal', 'support_ticket_resolved'),
    ('support', 'ticket_closed', 'info', 'system', 'receive_system_notifications', 'low', 'support_ticket_closed'),
    ('support', 'ticket_new_message', 'info', 'system', 'receive_system_notifications', 'normal', 'support_ticket_new_message'),

    -- Soporte Tickets (para vendors/soporte)
    ('support_vendor', 'ticket_assigned', 'warning', 'support', 'receive_ticket_assignments', 'high', 'vendor_ticket_assigned'),
    ('support_vendor', 'ticket_sla_warning', 'error', 'support', 'receive_priority_alerts', 'high', 'vendor_ticket_sla_warning'),
    ('support_vendor', 'ticket_escalated', 'error', 'support', 'receive_priority_alerts', 'high', 'vendor_ticket_escalated'),
    ('support_vendor', 'customer_response', 'info', 'support', 'receive_ticket_assignments', 'normal', 'vendor_customer_response'),

    -- Soporte Escalamiento (para supervisores)
    ('support_supervisor', 'ticket_escalated_to_you', 'error', 'support', 'receive_priority_alerts', 'high', 'supervisor_ticket_escalated'),
    ('support_supervisor', 'escalation_resolved', 'success', 'support', 'receive_ticket_assignments', 'normal', 'supervisor_escalation_resolved'),
    ('system', 'account_locked', 'warning', 'system', 'receive_system_notifications', 'high', 'account_locked'),
    ('system', 'profile_updated', 'info', 'system', 'receive_system_notifications', 'low', 'profile_updated'),
    ('system', 'biometric_registered', 'success', 'system', 'receive_system_notifications', 'normal', 'biometric_registered')
ON CONFLICT (module, notification_type) DO NOTHING;

-- ============================================================================
-- PASO 6: Función para enviar email automático al crear notificación
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_send_email_on_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_mapping RECORD;
    v_user_email RECORD;
    v_company_config RECORD;
    v_should_send BOOLEAN := false;
    v_email_body TEXT;
    v_email_subject TEXT;
BEGIN
    -- Solo procesar si sent_via_email = true
    IF NOT NEW.sent_via_email THEN
        RETURN NEW;
    END IF;

    -- Solo procesar si es una notificación nueva (INSERT)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Si ya tiene email_sent_at, no enviar de nuevo
    IF NEW.email_sent_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Obtener mapeo de notificación a email
    SELECT * INTO v_mapping
    FROM notification_email_mapping
    WHERE module = NEW.module
    AND notification_type = NEW.notification_type
    AND is_active = true
    LIMIT 1;

    -- Si no hay mapeo, no enviar email
    IF NOT FOUND THEN
        RAISE NOTICE 'No se encontró mapeo de email para módulo: %, tipo: %', NEW.module, NEW.notification_type;
        RETURN NEW;
    END IF;

    -- Si no hay recipient_user_id, no enviar email individual
    IF NEW.recipient_user_id IS NULL AND NOT NEW.is_broadcast THEN
        RAISE NOTICE 'Notificación sin recipient_user_id, saltando envío de email';
        RETURN NEW;
    END IF;

    -- Obtener email del usuario
    SELECT * INTO v_user_email
    FROM user_emails
    WHERE user_id = NEW.recipient_user_id
    AND is_active = true
    AND is_primary = true
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No se encontró email activo para user_id: %', NEW.recipient_user_id;
        RETURN NEW;
    END IF;

    -- Verificar preferencias del usuario
    IF v_mapping.requires_preference_check THEN
        EXECUTE format('SELECT %I FROM user_emails WHERE user_id = $1 AND is_primary = true',
                      v_mapping.user_emails_preference_field)
        INTO v_should_send
        USING NEW.recipient_user_id;

        IF NOT v_should_send AND NOT v_mapping.force_send THEN
            RAISE NOTICE 'Usuario tiene desactivada preferencia: %', v_mapping.user_emails_preference_field;
            RETURN NEW;
        END IF;
    END IF;

    -- Obtener configuración de email de la empresa
    SELECT * INTO v_company_config
    FROM email_configurations
    WHERE company_id = NEW.company_id
    AND is_active = true
    AND is_verified = true
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No se encontró configuración de email para company_id: %', NEW.company_id;
        RETURN NEW;
    END IF;

    -- Preparar cuerpo del email
    IF NEW.email_body IS NOT NULL THEN
        v_email_body := NEW.email_body;
    ELSE
        -- Usar template si está configurado
        v_email_body := NEW.message;
    END IF;

    -- Preparar subject
    v_email_subject := NEW.title;

    -- Insertar en cola de envío de emails (tabla temporal o directamente en email_logs)
    INSERT INTO email_logs (
        sender_type,
        sender_id,
        email_config_id,
        recipient_email,
        recipient_name,
        recipient_type,
        recipient_id,
        subject,
        body_html,
        body_text,
        notification_id,
        category,
        priority,
        status,
        created_at
    ) VALUES (
        'company',
        NEW.company_id::TEXT,
        v_company_config.id,
        v_user_email.email,
        (SELECT CONCAT("firstName", ' ', "lastName") FROM users WHERE user_id = NEW.recipient_user_id),
        'employee',
        NEW.recipient_user_id::TEXT,
        v_email_subject,
        v_email_body,
        v_email_body, -- body_text = body_html por ahora
        NEW.id,
        v_mapping.email_type,
        v_mapping.email_priority,
        'pending', -- Será procesado por worker async
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO NEW.email_log_id;

    -- Marcar que el email fue enviado (timestamp se actualizará cuando worker procese)
    -- NEW.email_sent_at = CURRENT_TIMESTAMP; -- Se actualizará cuando se procese realmente

    RAISE NOTICE '✉️ Email encolado para notificación ID: %, email_log_id: %', NEW.id, NEW.email_log_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_send_email_on_notification ON notifications;
CREATE TRIGGER trigger_send_email_on_notification
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_send_email_on_notification();

COMMENT ON FUNCTION trigger_send_email_on_notification IS 'Envía email automáticamente cuando se crea una notificación con sent_via_email = true';

-- ============================================================================
-- PASO 7: Worker para procesar emails pendientes (función helper)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_pending_email_notifications()
RETURNS TABLE (
    processed_count INTEGER,
    success_count INTEGER,
    failed_count INTEGER
) AS $$
DECLARE
    v_processed INTEGER := 0;
    v_success INTEGER := 0;
    v_failed INTEGER := 0;
    v_email RECORD;
BEGIN
    -- Obtener emails pendientes (máximo 100 por ejecución)
    FOR v_email IN
        SELECT el.*, n.id as notification_id
        FROM email_logs el
        LEFT JOIN notifications n ON n.email_log_id = el.id
        WHERE el.status = 'pending'
        AND el.notification_id IS NOT NULL
        ORDER BY el.created_at ASC
        LIMIT 100
    LOOP
        v_processed := v_processed + 1;

        -- Aquí el EmailService procesará el envío real
        -- Por ahora solo marcamos como "queued" para que el worker de Node.js lo procese

        UPDATE email_logs
        SET status = 'queued',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_email.id;

        v_success := v_success + 1;
    END LOOP;

    RETURN QUERY SELECT v_processed, v_success, v_failed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_pending_email_notifications IS 'Procesa emails pendientes y los marca como queued para el worker de Node.js';

-- ============================================================================
-- PASO 8: Función para obtener estadísticas de notificaciones con emails
-- ============================================================================

CREATE OR REPLACE FUNCTION get_notification_email_stats(p_company_id INTEGER)
RETURNS TABLE (
    total_notifications BIGINT,
    notifications_with_email BIGINT,
    emails_sent BIGINT,
    emails_pending BIGINT,
    emails_failed BIGINT,
    email_delivery_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE sent_via_email = true) as notifications_with_email,
        COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL) as emails_sent,
        COUNT(el.id) FILTER (WHERE el.status = 'pending') as emails_pending,
        COUNT(el.id) FILTER (WHERE el.status = 'failed') as emails_failed,
        ROUND(
            (COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL)::DECIMAL /
             NULLIF(COUNT(*) FILTER (WHERE sent_via_email = true), 0)) * 100,
            2
        ) as email_delivery_rate
    FROM notifications n
    LEFT JOIN email_logs el ON el.notification_id = n.id
    WHERE n.company_id = p_company_id
    AND n.created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 9: Vista consolidada de notificaciones + emails
-- ============================================================================

CREATE OR REPLACE VIEW v_notifications_with_email_status AS
SELECT
    n.id as notification_id,
    n.uuid as notification_uuid,
    n.company_id,
    n.module,
    n.notification_type,
    n.category,
    n.priority,
    n.title,
    n.message,
    n.recipient_user_id,
    (SELECT CONCAT("firstName", ' ', "lastName") FROM users WHERE user_id = n.recipient_user_id) as recipient_name,
    n.sent_via_email,
    n.email_sent_at,
    el.id as email_log_id,
    el.recipient_email,
    el.status as email_status,
    el.sent_at as email_actual_sent_at,
    el.delivered_at as email_delivered_at,
    el.opened_at as email_opened_at,
    el.error_message as email_error,
    n.is_read as notification_read,
    n.read_at as notification_read_at,
    n.created_at as notification_created_at
FROM notifications n
LEFT JOIN email_logs el ON el.notification_id = n.id
ORDER BY n.created_at DESC;

COMMENT ON VIEW v_notifications_with_email_status IS 'Vista consolidada de notificaciones con estado de sus emails';

-- ============================================================================
-- PASO 10: Índices de performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_sent_via_email ON notifications(sent_via_email) WHERE sent_via_email = true;
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending ON notifications(email_sent_at) WHERE sent_via_email = true AND email_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_pending ON email_logs(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_logs_notification_status ON email_logs(notification_id, status);

-- ============================================================================
-- PASO 11: Función para re-enviar email de notificación fallida
-- ============================================================================

CREATE OR REPLACE FUNCTION retry_notification_email(p_notification_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_email_log_id BIGINT;
BEGIN
    -- Obtener email_log_id de la notificación
    SELECT email_log_id INTO v_email_log_id
    FROM notifications
    WHERE id = p_notification_id;

    IF v_email_log_id IS NULL THEN
        RAISE EXCEPTION 'Notificación % no tiene email asociado', p_notification_id;
    END IF;

    -- Marcar email como pending para re-intentar
    UPDATE email_logs
    SET status = 'pending',
        retry_count = retry_count + 1,
        updated_at = CURRENT_TIMESTAMP,
        next_retry_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
    WHERE id = v_email_log_id
    AND retry_count < max_retries;

    -- Resetear timestamp de email en notificación
    UPDATE notifications
    SET email_sent_at = NULL
    WHERE id = p_notification_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION retry_notification_email IS 'Re-intenta enviar email de una notificación fallida';

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TRIGGER trigger_send_email_on_notification ON notifications IS
'Trigger automático: Cuando se crea una notificación con sent_via_email=true,
automáticamente encola un email respetando las preferencias del usuario.
El email será procesado de forma asíncrona por el EmailService de Node.js.';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Integración Email + Notificaciones completada';
    RAISE NOTICE '📧 Trigger automático: Notificaciones → Emails';
    RAISE NOTICE '🔄 Worker: process_pending_email_notifications()';
    RAISE NOTICE '📊 Vista: v_notifications_with_email_status';
    RAISE NOTICE '🔁 Retry: retry_notification_email(notification_id)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 IMPORTANTE: El EmailService de Node.js debe ejecutar';
    RAISE NOTICE '   un worker periódico que procese emails con status=queued';
END $$;
