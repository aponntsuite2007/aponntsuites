/**
 * ============================================================================
 * MIGRACIÓN: Sistema de Mapeo Procesos → Emails
 * ============================================================================
 *
 * Permite asignar cada proceso/tipo de notificación del sistema
 * a un email específico configurado en aponnt_email_config
 *
 * REGLA DE NEGOCIO:
 * - Cada proceso debe tener UN email asignado
 * - Un email puede gestionar MÚLTIPLES procesos
 * - Solo emails con test_status = 'success' pueden ser asignados
 *
 * ============================================================================
 */

-- ============================================================================
-- TABLA: email_process_mapping
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_process_mapping (
    id SERIAL PRIMARY KEY,

    -- Identificador único del proceso
    process_key VARCHAR(100) NOT NULL UNIQUE,

    -- Nombre legible del proceso
    process_name VARCHAR(255) NOT NULL,

    -- Categoría/módulo del proceso
    module VARCHAR(50) NOT NULL,
    -- Valores: 'support', 'medical', 'legal', 'hse', 'commercial',
    --          'attendance', 'vacation', 'payroll', 'staff', 'engineering', etc.

    -- Descripción del proceso
    description TEXT,

    -- Email type asignado (FK a aponnt_email_config)
    email_type VARCHAR(50),
    -- Valores: 'commercial', 'partners', 'staff', 'support', 'engineering',
    --          'executive', 'institutional', 'billing', 'onboarding',
    --          'transactional', 'escalation'

    -- Prioridad del proceso
    priority VARCHAR(20) DEFAULT 'medium',
    -- Valores: 'low', 'medium', 'high', 'critical'

    -- Si el proceso está activo
    is_active BOOLEAN DEFAULT TRUE,

    -- Si requiere email obligatorio
    requires_email BOOLEAN DEFAULT TRUE,

    -- Metadata adicional
    metadata JSONB DEFAULT '{}',

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    -- Constraints
    CONSTRAINT fk_email_type
        FOREIGN KEY (email_type)
        REFERENCES aponnt_email_config(email_type)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- Índices para búsqueda rápida
CREATE INDEX idx_email_process_mapping_module ON email_process_mapping(module);
CREATE INDEX idx_email_process_mapping_email_type ON email_process_mapping(email_type);
CREATE INDEX idx_email_process_mapping_process_key ON email_process_mapping(process_key);
CREATE INDEX idx_email_process_mapping_is_active ON email_process_mapping(is_active);

-- ============================================================================
-- FUNCIÓN: Validar que el email esté probado antes de asignar
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_email_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se está asignando un email
    IF NEW.email_type IS NOT NULL THEN
        -- Verificar que el email existe y está probado
        IF NOT EXISTS (
            SELECT 1 FROM aponnt_email_config
            WHERE email_type = NEW.email_type
            AND is_active = TRUE
            AND test_status = 'success'
        ) THEN
            RAISE EXCEPTION 'No se puede asignar el email %. Debe estar activo y probado exitosamente.', NEW.email_type;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_email_assignment
    BEFORE INSERT OR UPDATE ON email_process_mapping
    FOR EACH ROW
    EXECUTE FUNCTION validate_email_assignment();

-- ============================================================================
-- FUNCIÓN: Actualizar timestamp automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_email_process_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_email_process_mapping_timestamp
    BEFORE UPDATE ON email_process_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_email_process_mapping_timestamp();

-- ============================================================================
-- DATOS INICIALES: Procesos del sistema
-- ============================================================================

INSERT INTO email_process_mapping (process_key, process_name, module, description, email_type, priority, requires_email) VALUES

-- ============================================================================
-- MÓDULO: SOPORTE
-- ============================================================================
-- NOTA: email_type = NULL inicialmente. El usuario debe asignarlos desde el panel administrativo
('support_ticket_created', 'Ticket de soporte creado', 'support', 'Notificación cuando se crea un nuevo ticket de soporte', NULL, 'high', TRUE),
('support_ticket_assigned', 'Ticket asignado a técnico', 'support', 'Notificación cuando un ticket es asignado', NULL, 'medium', TRUE),
('support_ticket_updated', 'Ticket actualizado', 'support', 'Notificación cuando hay una actualización en el ticket', NULL, 'medium', TRUE),
('support_ticket_resolved', 'Ticket resuelto', 'support', 'Notificación cuando un ticket es resuelto', NULL, 'medium', TRUE),
('support_ticket_closed', 'Ticket cerrado', 'support', 'Notificación cuando un ticket es cerrado', NULL, 'low', TRUE),
('support_ticket_escalated', 'Ticket escalado', 'support', 'Notificación cuando un ticket escala a supervisor/gerente', NULL, 'critical', TRUE),
('support_sla_warning', 'Advertencia SLA próximo a vencer', 'support', 'Alerta cuando el SLA está por vencerse', NULL, 'high', TRUE),
('support_sla_breached', 'SLA vencido', 'support', 'Alerta crítica cuando el SLA se venció', NULL, 'critical', TRUE),

-- ============================================================================
-- MÓDULO: MÉDICO (PARTNERS)
-- ============================================================================
('medical_exam_requested', 'Solicitud de examen médico', 'medical', 'Notificación al médico cuando se solicita un examen', NULL, 'high', TRUE),
('medical_exam_scheduled', 'Examen médico programado', 'medical', 'Notificación cuando se programa un examen', NULL, 'medium', TRUE),
('medical_results_received', 'Resultados médicos recibidos', 'medical', 'Notificación cuando el médico sube resultados', NULL, 'high', TRUE),
('medical_aptitude_approved', 'Apto médico aprobado', 'medical', 'Notificación cuando se aprueba el apto médico', NULL, 'medium', TRUE),
('medical_aptitude_rejected', 'Apto médico rechazado', 'medical', 'Notificación cuando se rechaza el apto médico', NULL, 'high', TRUE),
('medical_aptitude_expiring', 'Vencimiento de apto próximo', 'medical', 'Recordatorio de vencimiento de apto médico', NULL, 'medium', TRUE),

-- ============================================================================
-- MÓDULO: LEGAL (PARTNERS)
-- ============================================================================
('legal_request_created', 'Solicitud de asesoría legal', 'legal', 'Notificación al abogado cuando se solicita asesoría', NULL, 'high', TRUE),
('legal_contract_review', 'Contrato para revisión', 'legal', 'Notificación cuando se envía contrato para revisar', NULL, 'medium', TRUE),
('legal_opinion_received', 'Dictamen legal recibido', 'legal', 'Notificación cuando se recibe dictamen legal', NULL, 'medium', TRUE),
('legal_lawsuit_notified', 'Demanda laboral notificada', 'legal', 'Alerta crítica de demanda laboral', NULL, 'critical', TRUE),

-- ============================================================================
-- MÓDULO: HSE (PARTNERS)
-- ============================================================================
('hse_inspection_requested', 'Solicitud de inspección HSE', 'hse', 'Notificación al inspector cuando se solicita inspección', NULL, 'high', TRUE),
('hse_inspection_scheduled', 'Inspección HSE programada', 'hse', 'Notificación cuando se programa inspección', NULL, 'medium', TRUE),
('hse_report_received', 'Informe de HSE recibido', 'hse', 'Notificación cuando se recibe informe HSE', NULL, 'medium', TRUE),
('hse_non_conformity', 'No conformidad detectada', 'hse', 'Alerta de no conformidad en inspección', NULL, 'high', TRUE),
('hse_certification_approved', 'Certificación HSE aprobada', 'hse', 'Notificación de certificación aprobada', NULL, 'medium', TRUE),

-- ============================================================================
-- MÓDULO: COMERCIAL (APONNT → EMPRESAS)
-- ============================================================================
('commercial_lead_assigned', 'Nuevo lead asignado', 'commercial', 'Notificación cuando se asigna un lead a vendedor', NULL, 'medium', TRUE),
('commercial_meeting_scheduled', 'Reunión programada', 'commercial', 'Notificación de reunión comercial programada', NULL, 'medium', TRUE),
('commercial_budget_created', 'Presupuesto creado', 'commercial', 'Notificación cuando se genera presupuesto', NULL, 'high', TRUE),
('commercial_budget_accepted', 'Presupuesto aceptado', 'commercial', 'Notificación cuando cliente acepta presupuesto', NULL, 'high', TRUE),
('commercial_contract_signed', 'Contrato firmado', 'commercial', 'Notificación cuando se firma contrato', NULL, 'high', TRUE),

-- ============================================================================
-- MÓDULO: ONBOARDING (ALTA DE EMPRESAS)
-- ============================================================================
('onboarding_company_activated', 'Empresa activada', 'onboarding', 'Email de bienvenida con credenciales', NULL, 'high', TRUE),
('onboarding_welcome', 'Email de bienvenida', 'onboarding', 'Email inicial de bienvenida a la plataforma', NULL, 'high', TRUE),

-- ============================================================================
-- MÓDULO: FACTURACIÓN (BILLING)
-- ============================================================================
('billing_invoice_generated', 'Factura generada', 'billing', 'Notificación cuando se genera factura', NULL, 'high', TRUE),
('billing_payment_confirmed', 'Pago confirmado', 'billing', 'Notificación cuando se confirma pago', NULL, 'medium', TRUE),
('billing_payment_failed', 'Pago fallido', 'billing', 'Alerta cuando falla un pago', NULL, 'high', TRUE),
('billing_renewal_reminder_30d', 'Recordatorio renovación 30 días', 'billing', 'Recordatorio de renovación a 30 días', NULL, 'medium', TRUE),
('billing_renewal_reminder_7d', 'Recordatorio renovación 7 días', 'billing', 'Recordatorio de renovación a 7 días', NULL, 'high', TRUE),
('billing_commission_paid', 'Comisión pagada a vendedor', 'billing', 'Notificación de pago de comisión', NULL, 'medium', TRUE),

-- ============================================================================
-- MÓDULO: ASISTENCIA
-- ============================================================================
('attendance_late_arrival', 'Llegada tardía', 'attendance', 'Notificación de llegada tardía', NULL, 'medium', TRUE),
('attendance_absence', 'Ausencia no justificada', 'attendance', 'Notificación de ausencia', NULL, 'high', TRUE),
('attendance_justification_approved', 'Justificativo aprobado', 'attendance', 'Notificación de justificativo aprobado', NULL, 'low', TRUE),
('attendance_justification_rejected', 'Justificativo rechazado', 'attendance', 'Notificación de justificativo rechazado', NULL, 'medium', TRUE),
('attendance_monthly_report', 'Reporte mensual de asistencia', 'attendance', 'Reporte ejecutivo mensual', NULL, 'low', FALSE),

-- ============================================================================
-- MÓDULO: VACACIONES
-- ============================================================================
('vacation_request_created', 'Solicitud de vacaciones', 'vacation', 'Notificación de nueva solicitud de vacaciones', NULL, 'medium', TRUE),
('vacation_approved', 'Vacaciones aprobadas', 'vacation', 'Notificación de vacaciones aprobadas', NULL, 'medium', TRUE),
('vacation_rejected', 'Vacaciones rechazadas', 'vacation', 'Notificación de vacaciones rechazadas', NULL, 'medium', TRUE),
('vacation_reminder_pre', 'Recordatorio pre-vacaciones', 'vacation', 'Recordatorio antes de inicio de vacaciones', NULL, 'low', TRUE),
('vacation_reminder_post', 'Recordatorio post-vacaciones', 'vacation', 'Recordatorio de regreso de vacaciones', NULL, 'low', TRUE),

-- ============================================================================
-- MÓDULO: LIQUIDACIONES (PAYROLL)
-- ============================================================================
('payroll_liquidation_generated', 'Liquidación generada', 'payroll', 'Notificación de liquidación generada', NULL, 'high', TRUE),
('payroll_receipt', 'Recibo de sueldo', 'payroll', 'Envío de recibo de sueldo', NULL, 'high', TRUE),
('payroll_error', 'Error en liquidación', 'payroll', 'Notificación de error en liquidación', NULL, 'high', TRUE),
('payroll_monthly_report', 'Reporte ejecutivo nómina', 'payroll', 'Reporte mensual de nómina para gerencia', NULL, 'medium', FALSE),

-- ============================================================================
-- MÓDULO: STAFF INTERNO APONNT
-- ============================================================================
('staff_internal_communication', 'Comunicación interna staff', 'staff', 'Comunicaciones internas del staff Aponnt', NULL, 'medium', TRUE),
('staff_training_assigned', 'Capacitación asignada', 'staff', 'Notificación de capacitación asignada', NULL, 'medium', TRUE),
('staff_evaluation', 'Evaluación de desempeño', 'staff', 'Notificación de evaluación', NULL, 'medium', TRUE),

-- ============================================================================
-- MÓDULO: INGENIERÍA
-- ============================================================================
('engineering_deploy', 'Deploy realizado', 'engineering', 'Notificación de deploy a producción', NULL, 'high', TRUE),
('engineering_error_production', 'Error en producción', 'engineering', 'Alerta de error en producción', NULL, 'critical', TRUE),
('engineering_pr_review', 'PR para revisión', 'engineering', 'Notificación de Pull Request', NULL, 'medium', TRUE),
('engineering_ci_failed', 'Test fallido en CI/CD', 'engineering', 'Notificación de test fallido', NULL, 'high', TRUE),

-- ============================================================================
-- MÓDULO: PLATAFORMA (BROADCASTS)
-- ============================================================================
('platform_announcement', 'Anuncio de plataforma', 'platform', 'Anuncio general a todas las empresas', NULL, 'medium', TRUE),
('platform_maintenance', 'Mantenimiento programado', 'platform', 'Notificación de mantenimiento', NULL, 'high', TRUE),
('platform_new_feature', 'Nueva funcionalidad', 'platform', 'Anuncio de nueva funcionalidad', NULL, 'low', TRUE),

-- ============================================================================
-- MÓDULO: SEGURIDAD
-- ============================================================================
('security_password_reset', 'Reset de contraseña', 'security', 'Email de reset de contraseña', NULL, 'high', TRUE),
('security_login_new_device', 'Login desde nuevo dispositivo', 'security', 'Notificación de login desde dispositivo nuevo', NULL, 'high', TRUE),
('security_suspicious_activity', 'Actividad sospechosa', 'security', 'Alerta de actividad sospechosa', NULL, 'critical', TRUE),

-- ============================================================================
-- MÓDULO: ALERTAS CRÍTICAS
-- ============================================================================
('alert_system_error', 'Error crítico del sistema', 'alerts', 'Alerta de error crítico', NULL, 'critical', TRUE),
('alert_service_suspended', 'Servicio suspendido', 'alerts', 'Alerta de servicio suspendido', NULL, 'critical', TRUE),
('alert_limit_reached', 'Límite alcanzado', 'alerts', 'Alerta de límite de usuarios/recursos', NULL, 'high', TRUE)

ON CONFLICT (process_key) DO NOTHING;

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE email_process_mapping IS 'Mapeo de procesos del sistema a emails configurados en aponnt_email_config';
COMMENT ON COLUMN email_process_mapping.process_key IS 'Identificador único del proceso (usado en el código)';
COMMENT ON COLUMN email_process_mapping.email_type IS 'Email type asignado (FK a aponnt_email_config.email_type)';
COMMENT ON COLUMN email_process_mapping.requires_email IS 'Si TRUE, el proceso DEBE tener un email asignado para funcionar';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
