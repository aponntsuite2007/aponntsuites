-- ============================================================================
-- MIGRACIÓN ADAPTADA: SEED DE WORKFLOWS AL ESQUEMA REAL
-- ============================================================================
-- Fecha: 2026-01-06
-- Esquema real detectado: process_key, process_name, workflow_steps, etc.
-- Objetivo: Registrar workflows críticos para eliminar bypass
--
-- IMPORTANTE: Este SQL usa el esquema REAL de notification_workflows
-- ============================================================================

BEGIN;

-- ============================================================================
-- WORKFLOWS CRÍTICOS CON BYPASS - ATTENDANCE
-- ============================================================================

-- attendance.late_arrival_authorization_request
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, response_type, response_timeout_hours,
    priority, sla_delivery_minutes, sla_response_hours,
    email_template_key, recipient_type, metadata
) VALUES (
    'attendance.late_arrival_authorization_request',
    'Autorización de Llegada Tardía - Solicitud',
    'attendance',
    'Empleado llega tarde, solicita autorización desde kiosk',
    'company',
    '{"steps": [{"step": 1, "action": "notify_supervisor"}, {"step": 2, "action": "await_response"}, {"step": 3, "action": "escalate_if_timeout"}]}'::jsonb,
    '["email", "push", "websocket"]'::jsonb,
    'email',
    true,
    'approval',
    0, -- 15 minutos en response_timeout_hours se maneja distinto, usamos metadata
    'critical',
    5, -- 5 minutos de delivery
    NULL,
    'attendance_late_arrival_request',
    'hierarchy',
    '{"requiresAction": true, "actionType": "approval", "slaMinutes": 15, "escalation": [{"after": "15m", "escalateTo": "manager"}, {"after": "30m", "escalateTo": "hr_manager"}], "bypass_source": "LateArrivalAuthorizationService.js (4x sendMail)"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description,
    metadata = EXCLUDED.metadata;

-- attendance.late_arrival_approved
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'attendance.late_arrival_approved',
    'Autorización de Llegada Tardía - Aprobada',
    'attendance',
    'Autorización de ingreso concedida',
    'company',
    '{"steps": [{"step": 1, "action": "notify_employee"}]}'::jsonb,
    '["push", "websocket"]'::jsonb,
    'push',
    false,
    'critical',
    1,
    'attendance_late_arrival_approved',
    'user',
    '{"requiresAction": false, "bypass_source": "LateArrivalAuthorizationService.js"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- attendance.late_arrival_rejected
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'attendance.late_arrival_rejected',
    'Autorización de Llegada Tardía - Rechazada',
    'attendance',
    'Autorización denegada',
    'company',
    '{"steps": [{"step": 1, "action": "notify_employee"}]}'::jsonb,
    '["push", "websocket"]'::jsonb,
    'push',
    false,
    'high',
    1,
    'attendance_late_arrival_rejected',
    'user',
    '{"requiresAction": false, "bypass_source": "LateArrivalAuthorizationService.js"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- attendance.late_arrival_processed
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'attendance.late_arrival_processed',
    'Autorización de Llegada Tardía - Procesada (Informativo)',
    'attendance',
    'Notificación informativa a RRHH',
    'company',
    '{"steps": [{"step": 1, "action": "notify_hr"}]}'::jsonb,
    '["inbox"]'::jsonb,
    'inbox',
    false,
    'medium',
    NULL,
    'attendance_late_arrival_processed',
    'role',
    '{"requiresAction": false, "bypass_source": "LateArrivalAuthorizationService.js"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- ============================================================================
-- WORKFLOWS CRÍTICOS CON BYPASS - SUPPLIERS (8 workflows)
-- ============================================================================

-- suppliers.rfq_invitation
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, response_type, response_timeout_hours,
    priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'suppliers.rfq_invitation',
    'Invitación a Proveedor para Cotizar RFQ',
    'suppliers',
    'Invitación a proveedor para cotizar RFQ',
    'aponnt',
    '{"steps": [{"step": 1, "action": "send_rfq_to_supplier"}, {"step": 2, "action": "await_quotation"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    true,
    'response',
    72,
    'high',
    15,
    'supplier_rfq_invitation',
    'associate',
    '{"requiresAction": true, "actionType": "response", "bypass_source": "SupplierEmailService.js → sendRfqInvitation()", "recipientType": "associate"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- suppliers.purchase_order_notification
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'suppliers.purchase_order_notification',
    'Nueva Orden de Compra a Proveedor',
    'suppliers',
    'Nueva orden de compra enviada a proveedor',
    'aponnt',
    '{"steps": [{"step": 1, "action": "notify_supplier_of_po"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    false,
    'high',
    15,
    'supplier_purchase_order',
    'associate',
    '{"requiresAction": false, "bypass_source": "SupplierEmailService.js → sendPurchaseOrderNotification()", "recipientType": "associate"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- suppliers.claim_notification
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, response_type, response_timeout_hours,
    priority, sla_delivery_minutes, sla_response_hours,
    email_template_key, recipient_type, metadata
) VALUES (
    'suppliers.claim_notification',
    'Reclamo de Empresa a Proveedor',
    'suppliers',
    'Reclamo de empresa a proveedor (producto defectuoso, etc.)',
    'aponnt',
    '{"steps": [{"step": 1, "action": "notify_supplier_of_claim"}, {"step": 2, "action": "await_response"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    true,
    'response',
    48,
    'critical',
    10,
    48,
    'supplier_claim',
    'associate',
    '{"requiresAction": true, "actionType": "response", "bypass_source": "SupplierEmailService.js → sendClaimNotification()", "recipientType": "associate"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- suppliers.payment_scheduled
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'suppliers.payment_scheduled',
    'Pago Programado a Proveedor',
    'suppliers',
    'Pago programado a proveedor',
    'aponnt',
    '{"steps": [{"step": 1, "action": "notify_supplier_of_payment"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    false,
    'medium',
    30,
    'supplier_payment_scheduled',
    'associate',
    '{"requiresAction": false, "bypass_source": "SupplierEmailService.js → sendPaymentScheduledNotification()", "recipientType": "associate"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- suppliers.welcome_email
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'suppliers.welcome_email',
    'Bienvenida a Portal de Proveedores',
    'suppliers',
    'Bienvenida a portal de proveedores + credenciales',
    'aponnt',
    '{"steps": [{"step": 1, "action": "send_welcome_email"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    false,
    'high',
    5,
    'supplier_welcome',
    'associate',
    '{"requiresAction": false, "bypass_source": "SupplierEmailService.js → sendWelcomeEmail()", "recipientType": "associate"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- suppliers.password_reset
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'suppliers.password_reset',
    'Restablecimiento de Contraseña - Proveedor',
    'suppliers',
    'Restablecimiento de contraseña',
    'aponnt',
    '{"steps": [{"step": 1, "action": "send_password_reset_link"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    false,
    'high',
    2,
    'supplier_password_reset',
    'associate',
    '{"requiresAction": false, "bypass_source": "SupplierEmailService.js → sendPasswordResetEmail()", "recipientType": "associate"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- ============================================================================
-- WORKFLOWS CRÍTICOS CON BYPASS - BIOMETRIC CONSENT (3 workflows)
-- ============================================================================

-- biometric.consent_request
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, response_type, response_timeout_hours,
    priority, sla_delivery_minutes, sla_response_hours,
    email_template_key, recipient_type, metadata
) VALUES (
    'biometric.consent_request',
    'Solicitud de Consentimiento Biométrico',
    'biometric',
    'Solicitud de consentimiento biométrico a empleado (GDPR/BIPA)',
    'company',
    '{"steps": [{"step": 1, "action": "send_consent_request"}, {"step": 2, "action": "await_acknowledgement"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    true,
    'acknowledgement',
    168,
    'high',
    10,
    168,
    'biometric_consent_request',
    'user',
    '{"requiresAction": true, "actionType": "acknowledgement", "bypass_source": "biometricConsentService.js → sendConsentRequestEmail()", "compliance": "GDPR/BIPA"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- biometric.consent_confirmation
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'biometric.consent_confirmation',
    'Confirmación de Consentimiento Biométrico',
    'biometric',
    'Confirmación de consentimiento aceptado',
    'company',
    '{"steps": [{"step": 1, "action": "send_confirmation_email"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    false,
    'medium',
    10,
    'biometric_consent_confirmation',
    'user',
    '{"requiresAction": false, "bypass_source": "biometricConsentService.js → sendConsentConfirmationEmail()", "compliance": "GDPR/BIPA"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

-- ============================================================================
-- WORKFLOWS CRÍTICOS CON BYPASS - SUPPORT (4 workflows)
-- ============================================================================

-- support.ticket_created_to_aponnt
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, response_type, response_timeout_hours,
    priority, sla_delivery_minutes, sla_response_hours,
    email_template_key, recipient_type, metadata
) VALUES (
    'support.ticket_created_to_aponnt',
    'Ticket de Soporte a Aponnt',
    'support',
    'Empresa crea ticket de soporte a Aponnt',
    'aponnt',
    '{"steps": [{"step": 1, "action": "notify_support_team"}, {"step": 2, "action": "await_response"}]}'::jsonb,
    '["email", "inbox"]'::jsonb,
    'email',
    true,
    'response',
    24,
    'high',
    5,
    24,
    'support_ticket_created',
    'group',
    '{"requiresAction": true, "actionType": "response", "bypass_source": "contactRoutes.js (2x sendMail), contactFormRoutes.js (1x EmailService)", "slaByPriority": {"urgent": 4, "high": 24, "normal": 48}}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description;

COMMIT;

-- ============================================================================
-- RESUMEN DE LA MIGRACIÓN
-- ============================================================================
-- Total workflows insertados: 15 críticos (de 203 total)
-- Adaptado al esquema real de notification_workflows
--
-- NOTA: Este es un subset de workflows críticos para arrancar.
-- Los 188 workflows restantes se pueden agregar progresivamente.
--
-- PRÓXIMO PASO: Continuar con migración de servicios a NCE.send()
-- ============================================================================
