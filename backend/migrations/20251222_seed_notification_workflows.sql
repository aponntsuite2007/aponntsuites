/**
 * ============================================================================
 * SEED: 78 Procesos de Notificación Clasificados
 * ============================================================================
 *
 * Clasificación basada en procesos.txt:
 * - SCOPE='aponnt' (Panel Administrativo): 56 procesos globales
 * - SCOPE='company' (Panel Empresa): 22 procesos multi-tenant
 *
 * Configuración inicial:
 * - Todos con channels=["email"] (se expandirá a WhatsApp/SMS después)
 * - Templates pendientes de creación
 * - Workflows básicos (se enriquecerán con respuestas después)
 *
 * ============================================================================
 */

-- ============================================================================
-- SCOPE='aponnt' - PROCESOS GLOBALES DE APONNT (56 procesos)
-- ============================================================================

-- 🎫 SOPORTE (8 procesos) - APONNT
INSERT INTO notification_workflows (process_key, process_name, module, description, scope, channels, priority, requires_response, metadata) VALUES

('support_ticket_created', 'Ticket de soporte creado', 'support', 'Notificación cuando se crea un nuevo ticket de soporte', 'aponnt', '["email"]', 'high', false, '{"flow": "Usuario empresa → Aponnt"}'),
('support_ticket_assigned', 'Ticket asignado a técnico', 'support', 'Notificación cuando un ticket es asignado a un técnico', 'aponnt', '["email"]', 'medium', false, '{"flow": "Interno Aponnt"}'),
('support_ticket_updated', 'Ticket actualizado', 'support', 'Notificación cuando hay una actualización en el ticket', 'aponnt', '["email"]', 'medium', false, '{"flow": "Aponnt → Usuario empresa"}'),
('support_ticket_resolved', 'Ticket resuelto', 'support', 'Notificación cuando un ticket es resuelto', 'aponnt', '["email"]', 'medium', true, '{"flow": "Aponnt → Usuario empresa", "response_type": "satisfaction"}'),
('support_ticket_closed', 'Ticket cerrado', 'support', 'Notificación cuando un ticket es cerrado', 'aponnt', '["email"]', 'low', false, '{"flow": "Aponnt → Usuario empresa"}'),
('support_ticket_escalated', 'Ticket escalado', 'support', 'Notificación cuando un ticket escala a supervisor/gerente', 'aponnt', '["email"]', 'critical', false, '{"flow": "Interno Aponnt (a supervisor)"}'),
('support_sla_warning', 'Advertencia SLA próximo a vencer', 'support', 'Alerta cuando el SLA está por vencerse', 'aponnt', '["email"]', 'high', false, '{"flow": "Interno Aponnt"}'),
('support_sla_breached', 'SLA vencido', 'support', 'Alerta crítica cuando el SLA se venció', 'aponnt', '["email"]', 'critical', false, '{"flow": "Interno Aponnt"}'),

-- 🏥 MÉDICO (6 procesos) - APONNT (via Partners)
('medical_exam_requested', 'Solicitud de examen médico', 'medical', 'Notificación al médico cuando se solicita un examen', 'aponnt', '["email"]', 'high', true, '{"flow": "Empresa → Partner (médico)", "response_type": "schedule"}'),
('medical_exam_scheduled', 'Examen médico programado', 'medical', 'Notificación cuando se programa un examen', 'aponnt', '["email"]', 'medium', false, '{"flow": "Partner → Empleado empresa"}'),
('medical_results_received', 'Resultados médicos recibidos', 'medical', 'Notificación cuando el médico sube resultados', 'aponnt', '["email"]', 'high', false, '{"flow": "Partner → RRHH empresa"}'),
('medical_aptitude_approved', 'Apto médico aprobado', 'medical', 'Notificación cuando se aprueba el apto médico', 'aponnt', '["email"]', 'medium', false, '{"flow": "RRHH empresa → Empleado"}'),
('medical_aptitude_rejected', 'Apto médico rechazado', 'medical', 'Notificación cuando se rechaza el apto médico', 'aponnt', '["email"]', 'high', false, '{"flow": "RRHH empresa → Empleado"}'),
('medical_aptitude_expiring', 'Vencimiento de apto próximo', 'medical', 'Recordatorio de vencimiento de apto médico', 'aponnt', '["email"]', 'medium', false, '{"flow": "RRHH empresa → Empleado"}'),

-- ⚖️ LEGAL (4 procesos) - APONNT (via Partners)
('legal_request_created', 'Solicitud de asesoría legal', 'legal', 'Notificación al abogado cuando se solicita asesoría', 'aponnt', '["email"]', 'high', true, '{"flow": "Empresa → Partner (abogado)", "response_type": "schedule"}'),
('legal_contract_review', 'Contrato para revisión', 'legal', 'Notificación cuando se envía contrato para revisar', 'aponnt', '["email"]', 'medium', true, '{"flow": "Empresa → Partner (abogado)", "response_type": "schedule"}'),
('legal_opinion_received', 'Dictamen legal recibido', 'legal', 'Notificación cuando se recibe dictamen legal', 'aponnt', '["email"]', 'medium', false, '{"flow": "Partner → Empresa"}'),
('legal_lawsuit_notified', 'Demanda laboral notificada', 'legal', 'Alerta crítica de demanda laboral', 'aponnt', '["email"]', 'critical', false, '{"flow": "Partner → Empresa + Aponnt"}'),

-- 🦺 HSE (5 procesos) - APONNT (via Partners)
('hse_inspection_requested', 'Solicitud de inspección HSE', 'hse', 'Notificación al inspector cuando se solicita inspección', 'aponnt', '["email"]', 'high', true, '{"flow": "Empresa → Partner (inspector)", "response_type": "schedule"}'),
('hse_inspection_scheduled', 'Inspección HSE programada', 'hse', 'Notificación cuando se programa inspección', 'aponnt', '["email"]', 'medium', false, '{"flow": "Partner → Empresa"}'),
('hse_report_received', 'Informe de HSE recibido', 'hse', 'Notificación cuando se recibe informe HSE', 'aponnt', '["email"]', 'medium', false, '{"flow": "Partner → Empresa"}'),
('hse_non_conformity', 'No conformidad detectada', 'hse', 'Alerta de no conformidad en inspección', 'aponnt', '["email"]', 'high', true, '{"flow": "RRHH empresa → Responsable área", "response_type": "action_plan"}'),
('hse_certification_approved', 'Certificación HSE aprobada', 'hse', 'Notificación de certificación aprobada', 'aponnt', '["email"]', 'medium', false, '{"flow": "Partner → Empresa"}'),

-- 💼 COMERCIAL (5 procesos) - APONNT
('commercial_lead_assigned', 'Nuevo lead asignado', 'commercial', 'Notificación cuando se asigna un lead a vendedor', 'aponnt', '["email"]', 'medium', false, '{"flow": "Interno Aponnt (a vendedor)"}'),
('commercial_meeting_scheduled', 'Reunión programada', 'commercial', 'Notificación de reunión comercial programada', 'aponnt', '["email"]', 'medium', true, '{"flow": "Aponnt → Empresa (prospecto)", "response_type": "confirm"}'),
('commercial_budget_created', 'Presupuesto creado', 'commercial', 'Notificación cuando se genera presupuesto', 'aponnt', '["email"]', 'high', true, '{"flow": "Aponnt → Empresa", "response_type": "accept_reject"}'),
('commercial_budget_accepted', 'Presupuesto aceptado', 'commercial', 'Notificación cuando cliente acepta presupuesto', 'aponnt', '["email"]', 'high', false, '{"flow": "Empresa → Aponnt"}'),
('commercial_contract_signed', 'Contrato firmado', 'commercial', 'Notificación cuando se firma contrato', 'aponnt', '["email"]', 'high', false, '{"flow": "Aponnt → Empresa"}'),

-- 🎓 ONBOARDING (2 procesos) - APONNT
('onboarding_company_activated', 'Empresa activada', 'onboarding', 'Email de bienvenida con credenciales', 'aponnt', '["email"]', 'high', false, '{"flow": "Aponnt → Nueva empresa"}'),
('onboarding_welcome', 'Email de bienvenida', 'onboarding', 'Email inicial de bienvenida a la plataforma', 'aponnt', '["email"]', 'high', false, '{"flow": "Aponnt → Nueva empresa"}'),

-- 💰 FACTURACIÓN/BILLING (6 procesos) - APONNT
('billing_invoice_generated', 'Factura generada', 'billing', 'Notificación cuando se genera factura', 'aponnt', '["email"]', 'high', false, '{"flow": "Aponnt → Empresa"}'),
('billing_payment_confirmed', 'Pago confirmado', 'billing', 'Notificación cuando se confirma pago', 'aponnt', '["email"]', 'medium', false, '{"flow": "Aponnt → Empresa"}'),
('billing_payment_failed', 'Pago fallido', 'billing', 'Alerta cuando falla un pago', 'aponnt', '["email"]', 'high', true, '{"flow": "Aponnt → Empresa", "response_type": "retry_payment"}'),
('billing_renewal_reminder_30d', 'Recordatorio renovación 30 días', 'billing', 'Recordatorio de renovación a 30 días', 'aponnt', '["email"]', 'medium', false, '{"flow": "Aponnt → Empresa"}'),
('billing_renewal_reminder_7d', 'Recordatorio renovación 7 días', 'billing', 'Recordatorio de renovación a 7 días', 'aponnt', '["email"]', 'high', false, '{"flow": "Aponnt → Empresa"}'),
('billing_commission_paid', 'Comisión pagada a vendedor', 'billing', 'Notificación de pago de comisión', 'aponnt', '["email"]', 'medium', false, '{"flow": "Interno Aponnt (a vendedor)"}'),

-- 👥 STAFF INTERNO APONNT (3 procesos) - APONNT
('staff_internal_communication', 'Comunicación interna staff', 'staff', 'Comunicaciones internas del staff Aponnt', 'aponnt', '["email"]', 'medium', false, '{"flow": "Interno Aponnt"}'),
('staff_training_assigned', 'Capacitación asignada', 'staff', 'Notificación de capacitación asignada', 'aponnt', '["email"]', 'medium', false, '{"flow": "Interno Aponnt"}'),
('staff_evaluation', 'Evaluación de desempeño', 'staff', 'Notificación de evaluación', 'aponnt', '["email"]', 'medium', true, '{"flow": "Interno Aponnt", "response_type": "self_assessment"}'),

-- ⚙️ INGENIERÍA (4 procesos) - APONNT
('engineering_deploy', 'Deploy realizado', 'engineering', 'Notificación de deploy a producción', 'aponnt', '["email"]', 'high', false, '{"flow": "Sistema → DevOps Aponnt"}'),
('engineering_error_production', 'Error en producción', 'engineering', 'Alerta de error en producción', 'aponnt', '["email"]', 'critical', false, '{"flow": "Sistema → DevOps Aponnt"}'),
('engineering_pr_review', 'PR para revisión', 'engineering', 'Notificación de Pull Request', 'aponnt', '["email"]', 'medium', false, '{"flow": "Interno Aponnt (dev team)"}'),
('engineering_ci_failed', 'Test fallido en CI/CD', 'engineering', 'Notificación de test fallido', 'aponnt', '["email"]', 'high', false, '{"flow": "Sistema → Dev Aponnt"}'),

-- 📢 PLATAFORMA/BROADCASTS (3 procesos) - APONNT
('platform_announcement', 'Anuncio de plataforma', 'platform', 'Anuncio general a todas las empresas', 'aponnt', '["email"]', 'medium', false, '{"flow": "Aponnt → Todas las empresas"}'),
('platform_maintenance', 'Mantenimiento programado', 'platform', 'Notificación de mantenimiento', 'aponnt', '["email"]', 'high', false, '{"flow": "Aponnt → Todas las empresas"}'),
('platform_new_feature', 'Nueva funcionalidad', 'platform', 'Anuncio de nueva funcionalidad', 'aponnt', '["email"]', 'low', false, '{"flow": "Aponnt → Todas las empresas"}'),

-- 🔒 SEGURIDAD (3 procesos) - APONNT
('security_password_reset', 'Reset de contraseña', 'security', 'Email de reset de contraseña', 'aponnt', '["email"]', 'high', false, '{"flow": "Sistema → Usuario (empresa o Aponnt)"}'),
('security_login_new_device', 'Login desde nuevo dispositivo', 'security', 'Notificación de login desde dispositivo nuevo', 'aponnt', '["email"]', 'high', true, '{"flow": "Sistema → Usuario (empresa o Aponnt)", "response_type": "confirm_device"}'),
('security_suspicious_activity', 'Actividad sospechosa', 'security', 'Alerta de actividad sospechosa', 'aponnt', '["email"]', 'critical', true, '{"flow": "Sistema → Admins (empresa o Aponnt)", "response_type": "confirm_block"}'),

-- 🚨 ALERTAS CRÍTICAS (3 procesos) - APONNT
('alert_system_error', 'Error crítico del sistema', 'alerts', 'Alerta de error crítico', 'aponnt', '["email"]', 'critical', false, '{"flow": "Sistema → DevOps Aponnt"}'),
('alert_service_suspended', 'Servicio suspendido', 'alerts', 'Alerta de servicio suspendido', 'aponnt', '["email"]', 'critical', false, '{"flow": "Aponnt → Empresa"}'),
('alert_limit_reached', 'Límite alcanzado', 'alerts', 'Alerta de límite de usuarios/recursos', 'aponnt', '["email"]', 'high', true, '{"flow": "Sistema → Admin empresa", "response_type": "upgrade"}')
ON CONFLICT (process_key, scope, company_id) DO NOTHING;

-- ============================================================================
-- SCOPE='company' - PROCESOS MULTI-TENANT DE EMPRESAS (22 procesos)
-- ============================================================================

-- NOTA: Estos procesos se crean SIN company_id porque son TEMPLATES
--       Cada empresa puede clonarlos y customizarlos
--       El sistema los replicará automáticamente al crear una empresa

-- 📅 ASISTENCIA (5 procesos) - EMPRESA
INSERT INTO notification_workflows (process_key, process_name, module, description, scope, channels, priority, requires_response, metadata) VALUES

('attendance_late_arrival', 'Llegada tardía', 'attendance', 'Notificación de llegada tardía', 'company', '["email"]', 'medium', true, '{"flow": "RRHH empresa → Empleado", "response_type": "justification"}'),
('attendance_absence', 'Ausencia no justificada', 'attendance', 'Notificación de ausencia', 'company', '["email"]', 'high', true, '{"flow": "RRHH empresa → Empleado", "response_type": "justification"}'),
('attendance_justification_approved', 'Justificativo aprobado', 'attendance', 'Notificación de justificativo aprobado', 'company', '["email"]', 'low', false, '{"flow": "RRHH empresa → Empleado"}'),
('attendance_justification_rejected', 'Justificativo rechazado', 'attendance', 'Notificación de justificativo rechazado', 'company', '["email"]', 'medium', true, '{"flow": "RRHH empresa → Empleado", "response_type": "appeal"}'),
('attendance_monthly_report', 'Reporte mensual de asistencia', 'attendance', 'Reporte ejecutivo mensual', 'company', '["email"]', 'low', false, '{"flow": "RRHH empresa → Gerencia"}'),

-- 🏖️ VACACIONES (5 procesos) - EMPRESA
('vacation_request_created', 'Solicitud de vacaciones', 'vacation', 'Notificación de nueva solicitud de vacaciones', 'company', '["email"]', 'medium', true, '{"flow": "Empleado → RRHH empresa", "response_type": "approve_reject"}'),
('vacation_approved', 'Vacaciones aprobadas', 'vacation', 'Notificación de vacaciones aprobadas', 'company', '["email"]', 'medium', true, '{"flow": "RRHH empresa → Empleado", "response_type": "confirm"}'),
('vacation_rejected', 'Vacaciones rechazadas', 'vacation', 'Notificación de vacaciones rechazadas', 'company', '["email"]', 'medium', false, '{"flow": "RRHH empresa → Empleado"}'),
('vacation_reminder_pre', 'Recordatorio pre-vacaciones', 'vacation', 'Recordatorio antes de inicio de vacaciones', 'company', '["email"]', 'low', false, '{"flow": "RRHH empresa → Empleado"}'),
('vacation_reminder_post', 'Recordatorio post-vacaciones', 'vacation', 'Recordatorio de regreso de vacaciones', 'company', '["email"]', 'low', false, '{"flow": "RRHH empresa → Empleado"}'),

-- 💵 LIQUIDACIONES/PAYROLL (4 procesos) - EMPRESA
('payroll_liquidation_generated', 'Liquidación generada', 'payroll', 'Notificación de liquidación generada', 'company', '["email"]', 'high', true, '{"flow": "RRHH empresa → Empleado", "response_type": "confirm_receipt"}'),
('payroll_receipt', 'Recibo de sueldo', 'payroll', 'Envío de recibo de sueldo', 'company', '["email"]', 'high', true, '{"flow": "RRHH empresa → Empleado", "response_type": "confirm_receipt"}'),
('payroll_error', 'Error en liquidación', 'payroll', 'Notificación de error en liquidación', 'company', '["email"]', 'high', true, '{"flow": "Sistema → RRHH empresa", "response_type": "review_fix"}'),
('payroll_monthly_report', 'Reporte ejecutivo nómina', 'payroll', 'Reporte mensual de nómina para gerencia', 'company', '["email"]', 'medium', false, '{"flow": "RRHH empresa → Gerencia"}'),

-- 🎓 TRAINING (4 procesos) - EMPRESA
('training_course_assigned', 'Curso asignado', 'training', 'Notificación de curso de capacitación asignado', 'company', '["email"]', 'medium', true, '{"flow": "RRHH empresa → Empleado", "response_type": "confirm_enrollment"}'),
('training_deadline_reminder', 'Recordatorio deadline capacitación', 'training', 'Recordatorio de fecha límite para completar capacitación', 'company', '["email"]', 'high', false, '{"flow": "RRHH empresa → Empleado"}'),
('training_completed', 'Capacitación completada', 'training', 'Notificación de capacitación completada', 'company', '["email"]', 'low', false, '{"flow": "Sistema → RRHH empresa"}'),
('training_certificate_issued', 'Certificado emitido', 'training', 'Notificación de certificado de capacitación emitido', 'company', '["email"]', 'medium', false, '{"flow": "RRHH empresa → Empleado"}')
ON CONFLICT (process_key, scope, company_id) DO NOTHING;

-- 📊 PERFORMANCE REVIEWS (3 procesos) - EMPRESA
INSERT INTO notification_workflows (process_key, process_name, module, description, scope, channels, priority, requires_response, metadata) VALUES

('performance_review_scheduled', 'Evaluación programada', 'performance', 'Notificación de evaluación de desempeño programada', 'company', '["email"]', 'medium', true, '{"flow": "RRHH empresa → Empleado", "response_type": "confirm"}'),
('performance_review_completed', 'Evaluación completada', 'performance', 'Notificación de evaluación de desempeño completada', 'company', '["email"]', 'low', false, '{"flow": "Sistema → RRHH empresa"}'),
('performance_feedback_requested', 'Feedback solicitado', 'performance', 'Solicitud de feedback de desempeño', 'company', '["email"]', 'medium', true, '{"flow": "RRHH → Supervisor", "response_type": "submit_feedback"}')
ON CONFLICT (process_key, scope, company_id) DO NOTHING;

-- 📂 DOCUMENTS / DMS (3 procesos) - EMPRESA
INSERT INTO notification_workflows (process_key, process_name, module, description, scope, channels, priority, requires_response, metadata) VALUES

('document_expiring', 'Documento por vencer', 'documents', 'Notificación de documento próximo a vencer', 'company', '["email"]', 'high', true, '{"flow": "RRHH empresa → Empleado", "response_type": "renew"}'),
('document_approval_required', 'Documento requiere aprobación', 'documents', 'Notificación de documento que requiere aprobación', 'company', '["email"]', 'high', true, '{"flow": "Empleado → RRHH empresa", "response_type": "approve_reject"}'),
('document_shared', 'Documento compartido', 'documents', 'Notificación de documento compartido', 'company', '["email"]', 'low', false, '{"flow": "Usuario → Usuario"}')
ON CONFLICT (process_key, scope, company_id) DO NOTHING;

-- 📋 PROCEDURES (2 procesos) - EMPRESA
INSERT INTO notification_workflows (process_key, process_name, module, description, scope, channels, priority, requires_response, metadata) VALUES

('procedure_new_version', 'Nueva versión de procedimiento', 'procedures', 'Notificación de nueva versión de procedimiento disponible', 'company', '["email"]', 'medium', true, '{"flow": "RRHH empresa → Todos", "response_type": "acknowledge"}'),
('procedure_acknowledgment_required', 'Acuse requerido', 'procedures', 'Notificación de acuse de recibo de procedimiento requerido', 'company', '["email"]', 'high', true, '{"flow": "RRHH empresa → Empleado", "response_type": "acknowledge"}')
ON CONFLICT (process_key, scope, company_id) DO NOTHING;

-- ============================================================================
-- ESTADÍSTICAS FINALES
-- ============================================================================

-- Verificar carga de procesos
DO $$
DECLARE
    total_aponnt INT;
    total_company INT;
    total_general INT;
    r RECORD;
BEGIN
    SELECT COUNT(*) INTO total_aponnt FROM notification_workflows WHERE scope = 'aponnt';
    SELECT COUNT(*) INTO total_company FROM notification_workflows WHERE scope = 'company';
    total_general := total_aponnt + total_company;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SEED COMPLETADO - Notification Workflows';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total de procesos cargados: %', total_general;
    RAISE NOTICE '  • Scope APONNT (global): %', total_aponnt;
    RAISE NOTICE '  • Scope COMPANY (multi-tenant): %', total_company;
    RAISE NOTICE '';
    RAISE NOTICE 'Módulos por scope:';

    FOR r IN (
        SELECT scope, module, COUNT(*) as total
        FROM notification_workflows
        GROUP BY scope, module
        ORDER BY scope, module
    ) LOOP
        RAISE NOTICE '  [%] % → % procesos', r.scope, r.module, r.total;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Procesos que requieren respuesta:';

    FOR r IN (
        SELECT scope, COUNT(*) as total
        FROM notification_workflows
        WHERE requires_response = TRUE
        GROUP BY scope
    ) LOOP
        RAISE NOTICE '  [%] → % procesos con respuesta automática', r.scope, r.total;
    END LOOP;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIN DE SEED
-- ============================================================================
