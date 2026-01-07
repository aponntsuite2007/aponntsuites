-- ============================================================================
-- MIGRACIÓN: SEED DE TODOS LOS WORKFLOWS DEL ECOSISTEMA APONNT
-- ============================================================================
-- Fecha: 2026-01-06
-- Objetivo: Registrar 203 workflows para migración completa a NCE
-- Estado actual: 78 workflows en BD
-- Estado final: 203 workflows (125 nuevos)
--
-- Estructura:
--   - SECCIÓN 1: 46 workflows CRÍTICOS con bypass confirmado (prioridad ALTA)
--   - SECCIÓN 2: 157 workflows normales no registrados (migración progresiva)
--
-- IMPORTANTE: Estos workflows son la base para eliminar 100% bypass a NCE
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECCIÓN 1: WORKFLOWS CRÍTICOS CON BYPASS (46)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 ATTENDANCE - Control de Asistencia (7 workflows)
-- ----------------------------------------------------------------------------

-- attendance.late_arrival_authorization_request
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, escalation_policy,
    template_key, is_active, metadata
) VALUES (
    'attendance.late_arrival_authorization_request',
    'company',
    'attendance',
    'approval_request',
    'interactive',
    '["email", "push", "websocket"]'::jsonb,
    'urgent',
    0.25, -- 15 minutos
    '{
        "levels": [
            {"after": "15m", "escalateTo": "manager"},
            {"after": "30m", "escalateTo": "hr_manager"}
        ]
    }'::jsonb,
    'attendance_late_arrival_request',
    true,
    '{
        "requiresAction": true,
        "actionType": "approval",
        "description": "Empleado llega tarde, solicita autorización desde kiosk",
        "bypass_source": "LateArrivalAuthorizationService.js (4x sendMail)"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- attendance.late_arrival_approved
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'attendance.late_arrival_approved',
    'company',
    'attendance',
    'approval_result',
    'info',
    '["push", "websocket"]'::jsonb,
    'urgent',
    NULL,
    'attendance_late_arrival_approved',
    true,
    '{
        "requiresAction": false,
        "description": "Autorización de ingreso concedida",
        "bypass_source": "LateArrivalAuthorizationService.js"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- attendance.late_arrival_rejected
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'attendance.late_arrival_rejected',
    'company',
    'attendance',
    'approval_result',
    'info',
    '["push", "websocket"]'::jsonb,
    'high',
    NULL,
    'attendance_late_arrival_rejected',
    true,
    '{
        "requiresAction": false,
        "description": "Autorización denegada",
        "bypass_source": "LateArrivalAuthorizationService.js"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- attendance.late_arrival_processed
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'attendance.late_arrival_processed',
    'company',
    'attendance',
    'info',
    'info',
    '["inbox"]'::jsonb,
    'normal',
    NULL,
    'attendance_late_arrival_processed',
    true,
    '{
        "requiresAction": false,
        "description": "Notificación informativa a RRHH",
        "bypass_source": "LateArrivalAuthorizationService.js"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- attendance.absent_auto
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'attendance.absent_auto',
    'company',
    'attendance',
    'alert',
    'info',
    '["email", "push"]'::jsonb,
    'high',
    NULL,
    'attendance_absent_auto',
    true,
    '{
        "requiresAction": false,
        "description": "Notificación automática de ausencia",
        "bypass_source": "attendanceRoutes.js (probable)"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- attendance.overtime_excessive
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'attendance.overtime_excessive',
    'company',
    'attendance',
    'alert',
    'warning',
    '["email", "inbox"]'::jsonb,
    'high',
    NULL,
    'attendance_overtime_excessive',
    true,
    '{
        "requiresAction": false,
        "description": "Horas extras excesivas"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- attendance.shift_reminder
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'attendance.shift_reminder',
    'company',
    'attendance',
    'reminder',
    'info',
    '["push"]'::jsonb,
    'low',
    NULL,
    'attendance_shift_reminder',
    true,
    '{
        "requiresAction": false,
        "description": "Recordatorio de turno próximo"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.2 SUPPLIERS - Proveedores (8 workflows)
-- ----------------------------------------------------------------------------

-- suppliers.rfq_invitation
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, escalation_policy,
    template_key, is_active, metadata
) VALUES (
    'suppliers.rfq_invitation',
    'aponnt',
    'suppliers',
    'info',
    'info',
    '["email"]'::jsonb,
    'high',
    NULL,
    NULL,
    'supplier_rfq_invitation',
    true,
    '{
        "requiresAction": true,
        "actionType": "response",
        "description": "Invitación a proveedor para cotizar RFQ",
        "bypass_source": "SupplierEmailService.js → sendRfqInvitation()",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- suppliers.purchase_order_notification
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'suppliers.purchase_order_notification',
    'aponnt',
    'suppliers',
    'info',
    'info',
    '["email"]'::jsonb,
    'high',
    NULL,
    'supplier_purchase_order',
    true,
    '{
        "requiresAction": false,
        "description": "Nueva orden de compra enviada a proveedor",
        "bypass_source": "SupplierEmailService.js → sendPurchaseOrderNotification()",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- suppliers.claim_notification
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'suppliers.claim_notification',
    'aponnt',
    'suppliers',
    'alert',
    'interactive',
    '["email"]'::jsonb,
    'urgent',
    48,
    'supplier_claim',
    true,
    '{
        "requiresAction": true,
        "actionType": "response",
        "description": "Reclamo de empresa a proveedor (producto defectuoso, etc.)",
        "bypass_source": "SupplierEmailService.js → sendClaimNotification()",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- suppliers.payment_scheduled
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'suppliers.payment_scheduled',
    'aponnt',
    'suppliers',
    'info',
    'info',
    '["email"]'::jsonb,
    'normal',
    NULL,
    'supplier_payment_scheduled',
    true,
    '{
        "requiresAction": false,
        "description": "Pago programado a proveedor",
        "bypass_source": "SupplierEmailService.js → sendPaymentScheduledNotification()",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- suppliers.welcome_email
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'suppliers.welcome_email',
    'aponnt',
    'suppliers',
    'info',
    'info',
    '["email"]'::jsonb,
    'high',
    NULL,
    'supplier_welcome',
    true,
    '{
        "requiresAction": false,
        "description": "Bienvenida a portal de proveedores + credenciales",
        "bypass_source": "SupplierEmailService.js → sendWelcomeEmail()",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- suppliers.password_reset
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'suppliers.password_reset',
    'aponnt',
    'suppliers',
    'info',
    'info',
    '["email"]'::jsonb,
    'high',
    NULL,
    'supplier_password_reset',
    true,
    '{
        "requiresAction": false,
        "description": "Restablecimiento de contraseña",
        "bypass_source": "SupplierEmailService.js → sendPasswordResetEmail()",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- suppliers.rfq_timeout_warning
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'suppliers.rfq_timeout_warning',
    'aponnt',
    'suppliers',
    'alert',
    'warning',
    '["email"]'::jsonb,
    'urgent',
    NULL,
    'supplier_rfq_timeout',
    true,
    '{
        "requiresAction": true,
        "actionType": "response",
        "description": "RFQ sin responder, se acerca deadline",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- suppliers.invoice_received_confirmation
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'suppliers.invoice_received_confirmation',
    'aponnt',
    'suppliers',
    'info',
    'info',
    '["email"]'::jsonb,
    'normal',
    NULL,
    'supplier_invoice_confirmation',
    true,
    '{
        "requiresAction": false,
        "description": "Empresa confirma recepción de factura de proveedor",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.3 PROCUREMENT - Compras (13 workflows)
-- ----------------------------------------------------------------------------

-- procurement.requisition_created
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.requisition_created',
    'company',
    'procurement',
    'info',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'procurement_requisition_created',
    true,
    '{
        "requiresAction": false,
        "description": "Nueva requisición de compra creada",
        "bypass_source": "procurementRoutes.js (usa SupplierEmailService)"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.requisition_approval_request
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, escalation_policy,
    template_key, is_active, metadata
) VALUES (
    'procurement.requisition_approval_request',
    'company',
    'procurement',
    'approval_request',
    'interactive',
    '["email", "push", "inbox"]'::jsonb,
    'high',
    24,
    '{
        "levels": [
            {"after": "24h", "escalateTo": "approver_l2"},
            {"after": "48h", "escalateTo": "cfo"}
        ]
    }'::jsonb,
    'procurement_requisition_approval',
    true,
    '{
        "requiresAction": true,
        "actionType": "approval",
        "description": "Requisición requiere aprobación",
        "bypass_source": "procurementRoutes.js"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.requisition_approved
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.requisition_approved',
    'company',
    'procurement',
    'approval_result',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'procurement_requisition_approved',
    true,
    '{
        "requiresAction": false,
        "description": "Requisición aprobada"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.requisition_rejected
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.requisition_rejected',
    'company',
    'procurement',
    'approval_result',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'procurement_requisition_rejected',
    true,
    '{
        "requiresAction": false,
        "description": "Requisición rechazada"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.rfq_created
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.rfq_created',
    'company',
    'procurement',
    'info',
    'info',
    '["inbox"]'::jsonb,
    'normal',
    NULL,
    'procurement_rfq_created',
    true,
    '{
        "requiresAction": false,
        "description": "RFQ creado (informativo)"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.rfq_response_received
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.rfq_response_received',
    'company',
    'procurement',
    'info',
    'info',
    '["email", "inbox"]'::jsonb,
    'high',
    NULL,
    'procurement_rfq_response',
    true,
    '{
        "requiresAction": false,
        "description": "Proveedor respondió cotización"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.order_approval_request
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, escalation_policy,
    template_key, is_active, metadata
) VALUES (
    'procurement.order_approval_request',
    'company',
    'procurement',
    'approval_request',
    'interactive',
    '["email", "push", "inbox"]'::jsonb,
    'high',
    48,
    '{
        "levels": [
            {"after": "48h", "escalateTo": "approver_l2"},
            {"after": "72h", "escalateTo": "cfo"}
        ]
    }'::jsonb,
    'procurement_order_approval',
    true,
    '{
        "requiresAction": true,
        "actionType": "approval",
        "description": "Orden de compra requiere aprobación"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.order_approved
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.order_approved',
    'company',
    'procurement',
    'approval_result',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'procurement_order_approved',
    true,
    '{
        "requiresAction": false,
        "description": "Orden aprobada"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.order_rejected
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.order_rejected',
    'company',
    'procurement',
    'approval_result',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'procurement_order_rejected',
    true,
    '{
        "requiresAction": false,
        "description": "Orden rechazada"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.delivery_pending
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.delivery_pending',
    'company',
    'procurement',
    'info',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'procurement_delivery_pending',
    true,
    '{
        "requiresAction": false,
        "description": "Entrega pendiente de proveedor"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.delivery_received
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.delivery_received',
    'company',
    'procurement',
    'info',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'procurement_delivery_received',
    true,
    '{
        "requiresAction": false,
        "description": "Mercadería recibida"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.invoice_approval_request
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, escalation_policy,
    template_key, is_active, metadata
) VALUES (
    'procurement.invoice_approval_request',
    'company',
    'procurement',
    'approval_request',
    'interactive',
    '["email", "inbox"]'::jsonb,
    'normal',
    72,
    '{
        "levels": [
            {"after": "72h", "escalateTo": "finance_manager"},
            {"after": "120h", "escalateTo": "cfo"}
        ]
    }'::jsonb,
    'procurement_invoice_approval',
    true,
    '{
        "requiresAction": true,
        "actionType": "approval",
        "description": "Factura de proveedor requiere aprobación"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- procurement.budget_exceeded_warning
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'procurement.budget_exceeded_warning',
    'company',
    'procurement',
    'alert',
    'warning',
    '["email", "push"]'::jsonb,
    'urgent',
    NULL,
    'procurement_budget_exceeded',
    true,
    '{
        "requiresAction": true,
        "actionType": "acknowledgement",
        "description": "Orden excede presupuesto"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.4 ASSOCIATES/PARTNERS - Asociados (7 workflows)
-- ----------------------------------------------------------------------------

-- associates.invoice_received
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, escalation_policy,
    template_key, is_active, metadata
) VALUES (
    'associates.invoice_received',
    'company',
    'associates',
    'approval_request',
    'interactive',
    '["email", "inbox"]'::jsonb,
    'high',
    48,
    '{
        "levels": [
            {"after": "48h", "escalateTo": "finance_manager"},
            {"after": "96h", "escalateTo": "cfo"}
        ]
    }'::jsonb,
    'associate_invoice_received',
    true,
    '{
        "requiresAction": true,
        "actionType": "approval",
        "description": "Asociado (médico, legal, etc.) carga factura",
        "recipientType": "role"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- associates.invoice_upload_confirmation
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'associates.invoice_upload_confirmation',
    'aponnt',
    'associates',
    'info',
    'info',
    '["email"]'::jsonb,
    'normal',
    NULL,
    'associate_invoice_confirmation',
    true,
    '{
        "requiresAction": false,
        "description": "Confirmación al asociado de factura recibida",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- partners.status_change
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'partners.status_change',
    'aponnt',
    'partners',
    'alert',
    'info',
    '["email", "inbox"]'::jsonb,
    'high',
    NULL,
    'partner_status_change',
    true,
    '{
        "requiresAction": false,
        "description": "Cambio de estado de partner (activo, suspendido, baja, renuncia)",
        "bypass_source": "PartnerNotificationService.js → notifyPartnerStatusChange()",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- partners.contract_status_change
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'partners.contract_status_change',
    'company',
    'partners',
    'alert',
    'info',
    '["email", "inbox"]'::jsonb,
    'high',
    NULL,
    'partner_contract_status',
    true,
    '{
        "requiresAction": true,
        "actionType": "acknowledge",
        "description": "Notificación a empresa cliente cuando partner contratado cambia estado",
        "bypass_source": "PartnerNotificationService.js (notifica a clientes)",
        "recipientType": "role"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- medical.folder_assigned_to_associate
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'medical.folder_assigned_to_associate',
    'aponnt',
    'medical',
    'info',
    'info',
    '["email"]'::jsonb,
    'high',
    24,
    'medical_folder_assigned_associate',
    true,
    '{
        "requiresAction": false,
        "description": "RRHH asigna carpeta médica a médico asociado",
        "recipientType": "associate"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- medical.folder_assigned_notification
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'medical.folder_assigned_notification',
    'company',
    'medical',
    'info',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'medical_folder_assigned_employee',
    true,
    '{
        "requiresAction": false,
        "description": "Notificación al empleado que su carpeta fue asignada",
        "recipientType": "user"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- medical.folder_assignment_confirmation
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'medical.folder_assignment_confirmation',
    'company',
    'medical',
    'info',
    'info',
    '["inbox"]'::jsonb,
    'low',
    NULL,
    'medical_folder_assignment_confirm',
    true,
    '{
        "requiresAction": false,
        "description": "Confirmación a RRHH de asignación exitosa",
        "recipientType": "role"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.5 SUPPORT/TICKETS - Soporte (4 workflows)
-- ----------------------------------------------------------------------------

-- support.ticket_created_to_aponnt
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'support.ticket_created_to_aponnt',
    'aponnt',
    'support',
    'alert',
    'interactive',
    '["email", "inbox"]'::jsonb,
    'high',
    24,
    'support_ticket_created',
    true,
    '{
        "requiresAction": true,
        "actionType": "response",
        "description": "Empresa crea ticket de soporte a Aponnt",
        "bypass_source": "contactRoutes.js (2x sendMail), contactFormRoutes.js (1x EmailService)",
        "recipientType": "group",
        "slaByPriority": {
            "urgent": 4,
            "high": 24,
            "normal": 48
        }
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- support.ticket_confirmation
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'support.ticket_confirmation',
    'company',
    'support',
    'info',
    'info',
    '["email", "inbox"]'::jsonb,
    'normal',
    NULL,
    'support_ticket_confirmation',
    true,
    '{
        "requiresAction": false,
        "description": "Confirmación al usuario de ticket recibido",
        "recipientType": "user"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- support.ticket_response
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'support.ticket_response',
    'company',
    'support',
    'info',
    'info',
    '["email", "inbox"]'::jsonb,
    'high',
    NULL,
    'support_ticket_response',
    true,
    '{
        "requiresAction": false,
        "description": "Aponnt responde ticket",
        "recipientType": "user"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- support.ticket_closed
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'support.ticket_closed',
    'company',
    'support',
    'info',
    'info',
    '["inbox"]'::jsonb,
    'low',
    NULL,
    'support_ticket_closed',
    true,
    '{
        "requiresAction": false,
        "description": "Ticket cerrado",
        "recipientType": "user"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.6 BIOMETRIC CONSENT - Consentimientos (3 workflows)
-- ----------------------------------------------------------------------------

-- biometric.consent_request
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'biometric.consent_request',
    'company',
    'biometric',
    'alert',
    'interactive',
    '["email"]'::jsonb,
    'high',
    168, -- 7 días
    'biometric_consent_request',
    true,
    '{
        "requiresAction": true,
        "actionType": "acknowledgement",
        "description": "Solicitud de consentimiento biométrico a empleado",
        "bypass_source": "biometricConsentService.js → sendConsentRequestEmail()",
        "recipientType": "user"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- biometric.consent_confirmation
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'biometric.consent_confirmation',
    'company',
    'biometric',
    'info',
    'info',
    '["email"]'::jsonb,
    'normal',
    NULL,
    'biometric_consent_confirmation',
    true,
    '{
        "requiresAction": false,
        "description": "Confirmación de consentimiento aceptado",
        "bypass_source": "biometricConsentService.js → sendConsentConfirmationEmail()",
        "recipientType": "user"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- biometric.consent_expiry_warning
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'biometric.consent_expiry_warning',
    'company',
    'biometric',
    'alert',
    'warning',
    '["email", "inbox"]'::jsonb,
    'normal',
    720, -- 30 días
    'biometric_consent_expiry',
    true,
    '{
        "requiresAction": false,
        "description": "Consentimiento por vencer (30 días antes)",
        "recipientType": "user"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.7 EMAIL SERVICE GENERAL - Emails de contacto (2 workflows)
-- ----------------------------------------------------------------------------

-- contact.form_submission
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'contact.form_submission',
    'aponnt',
    'contact',
    'info',
    'info',
    '["email"]'::jsonb,
    'normal',
    NULL,
    'contact_form_submission',
    true,
    '{
        "requiresAction": false,
        "description": "Formulario de contacto web",
        "bypass_source": "contactRoutes.js, contactFormRoutes.js (EmailService)",
        "recipientType": "group"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- contact.auto_reply
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'contact.auto_reply',
    'aponnt',
    'contact',
    'info',
    'info',
    '["email"]'::jsonb,
    'low',
    NULL,
    'contact_auto_reply',
    true,
    '{
        "requiresAction": false,
        "description": "Respuesta automática a quien envió formulario"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.8 JOB POSTINGS - Ofertas laborales (2 workflows)
-- ----------------------------------------------------------------------------

-- jobs.candidate_verification
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'jobs.candidate_verification',
    'aponnt',
    'jobs',
    'info',
    'info',
    '["email"]'::jsonb,
    'normal',
    NULL,
    'jobs_candidate_verification',
    true,
    '{
        "requiresAction": false,
        "description": "Verificación de candidato postulante",
        "bypass_source": "jobPostingsRoutes.js (2x EmailService)"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- jobs.application_received
INSERT INTO notification_workflows (
    workflow_key, scope, module, category, notification_type,
    channels, default_priority, sla_hours, template_key, is_active, metadata
) VALUES (
    'jobs.application_received',
    'aponnt',
    'jobs',
    'info',
    'info',
    '["email"]'::jsonb,
    'low',
    NULL,
    'jobs_application_received',
    true,
    '{
        "requiresAction": false,
        "description": "Confirmación de postulación recibida"
    }'::jsonb
) ON CONFLICT (workflow_key) DO NOTHING;

-- ============================================================================
-- SECCIÓN 2: WORKFLOWS NO REGISTRADOS EN BD (157)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 MEDICAL - Medicina Laboral (8 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('medical.appointment_reminder', 'company', 'medical', 'reminder', 'info', '["email", "push"]'::jsonb, 'normal', NULL, 'medical_appointment_reminder', true, '{"requiresAction": false, "description": "Recordatorio de cita médica", "recipientType": "user"}'::jsonb),
('medical.certificate_expiry_warning', 'company', 'medical', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', 168, 'medical_certificate_expiry', true, '{"requiresAction": false, "description": "Certificado médico por vencer", "recipientType": "user"}'::jsonb),
('medical.exam_scheduled', 'company', 'medical', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'medical_exam_scheduled', true, '{"requiresAction": false, "description": "Examen médico programado", "recipientType": "user"}'::jsonb),
('medical.exam_results_available', 'company', 'medical', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'medical_exam_results', true, '{"requiresAction": false, "description": "Resultados de examen disponibles", "recipientType": "user"}'::jsonb),
('medical.medical_leave_approved', 'company', 'medical', 'approval_result', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'medical_leave_approved', true, '{"requiresAction": false, "description": "Licencia médica aprobada", "recipientType": "user"}'::jsonb),
('medical.medical_leave_rejected', 'company', 'medical', 'approval_result', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'medical_leave_rejected', true, '{"requiresAction": false, "description": "Licencia médica rechazada", "recipientType": "user"}'::jsonb),
('medical.vaccination_expiry', 'company', 'medical', 'alert', 'warning', '["email", "push"]'::jsonb, 'normal', NULL, 'medical_vaccination_expiry', true, '{"requiresAction": false, "description": "Vacuna por vencer", "recipientType": "user"}'::jsonb),
('medical.fitness_certificate_required', 'company', 'medical', 'alert', 'info', '["email", "push"]'::jsonb, 'high', NULL, 'medical_fitness_required', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Certificado de aptitud requerido", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.2 VACATION - Vacaciones (5 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('vacation.request_submitted', 'company', 'vacation', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'vacation_request_submitted', true, '{"requiresAction": false, "description": "Solicitud de vacaciones enviada", "recipientType": "user"}'::jsonb),
('vacation.request_approval', 'company', 'vacation', 'approval_request', 'interactive', '["email", "push", "inbox"]'::jsonb, 'high', 48, 'vacation_request_approval', true, '{"requiresAction": true, "actionType": "approval", "description": "Solicitud de vacaciones requiere aprobación", "recipientType": "role"}'::jsonb),
('vacation.request_approved', 'company', 'vacation', 'approval_result', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'vacation_request_approved', true, '{"requiresAction": false, "description": "Vacaciones aprobadas", "recipientType": "user"}'::jsonb),
('vacation.request_rejected', 'company', 'vacation', 'approval_result', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'vacation_request_rejected', true, '{"requiresAction": false, "description": "Vacaciones rechazadas", "recipientType": "user"}'::jsonb),
('vacation.expiry_warning', 'company', 'vacation', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', 720, 'vacation_expiry', true, '{"requiresAction": false, "description": "Días de vacaciones por vencer", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.3 PAYROLL - Nómina (6 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('payroll.receipt_available', 'company', 'payroll', 'info', 'info', '["email", "inbox", "push"]'::jsonb, 'normal', NULL, 'payroll_receipt', true, '{"requiresAction": false, "description": "Recibo de sueldo disponible", "recipientType": "user"}'::jsonb),
('payroll.liquidation_generated', 'company', 'payroll', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'payroll_liquidation', true, '{"requiresAction": false, "description": "Liquidación generada", "recipientType": "user"}'::jsonb),
('payroll.payment_processed', 'company', 'payroll', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'payroll_payment', true, '{"requiresAction": false, "description": "Pago procesado", "recipientType": "user"}'::jsonb),
('payroll.deduction_applied', 'company', 'payroll', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'payroll_deduction', true, '{"requiresAction": false, "description": "Descuento aplicado", "recipientType": "user"}'::jsonb),
('payroll.bonus_added', 'company', 'payroll', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'payroll_bonus', true, '{"requiresAction": false, "description": "Bono agregado", "recipientType": "user"}'::jsonb),
('payroll.tax_withholding', 'company', 'payroll', 'info', 'info', '["inbox"]'::jsonb, 'low', NULL, 'payroll_tax', true, '{"requiresAction": false, "description": "Retención impositiva", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.4 WMS/WAREHOUSE - Almacén (9 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('wms.stock_low_alert', 'company', 'wms', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', NULL, 'wms_stock_low', true, '{"requiresAction": false, "description": "Stock bajo", "recipientType": "role"}'::jsonb),
('wms.stock_critical_alert', 'company', 'wms', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'wms_stock_critical', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Stock crítico", "recipientType": "role"}'::jsonb),
('wms.material_request_created', 'company', 'wms', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'wms_material_request', true, '{"requiresAction": false, "description": "Solicitud de material creada", "recipientType": "role"}'::jsonb),
('wms.material_request_approved', 'company', 'wms', 'approval_result', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'wms_material_approved', true, '{"requiresAction": false, "description": "Solicitud de material aprobada", "recipientType": "user"}'::jsonb),
('wms.material_request_rejected', 'company', 'wms', 'approval_result', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'wms_material_rejected', true, '{"requiresAction": false, "description": "Solicitud de material rechazada", "recipientType": "user"}'::jsonb),
('wms.document_expiry_warning', 'company', 'wms', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', 720, 'wms_document_expiry', true, '{"requiresAction": false, "description": "Documento por vencer", "recipientType": "role"}'::jsonb),
('wms.inventory_adjustment', 'company', 'wms', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'wms_inventory_adjustment', true, '{"requiresAction": false, "description": "Ajuste de inventario", "recipientType": "role"}'::jsonb),
('wms.recall_issued', 'company', 'wms', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'wms_recall', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Recall de producto emitido", "recipientType": "role"}'::jsonb),
('wms.transfer_completed', 'company', 'wms', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'wms_transfer_completed', true, '{"requiresAction": false, "description": "Transferencia completada", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.5 FINANCE - Finanzas (11 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('finance.invoice_due', 'company', 'finance', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', 168, 'finance_invoice_due', true, '{"requiresAction": false, "description": "Factura por vencer", "recipientType": "role"}'::jsonb),
('finance.invoice_overdue', 'company', 'finance', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'finance_invoice_overdue', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Factura vencida", "recipientType": "role"}'::jsonb),
('finance.budget_expiry_warning', 'company', 'finance', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', 720, 'finance_budget_expiry', true, '{"requiresAction": false, "description": "Presupuesto por vencer", "recipientType": "role"}'::jsonb),
('finance.budget_exceeded', 'company', 'finance', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'finance_budget_exceeded', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Presupuesto excedido", "recipientType": "role"}'::jsonb),
('finance.payment_order_approval', 'company', 'finance', 'approval_request', 'interactive', '["email", "push", "inbox"]'::jsonb, 'high', 48, 'finance_payment_approval', true, '{"requiresAction": true, "actionType": "approval", "description": "Orden de pago requiere aprobación", "recipientType": "role"}'::jsonb),
('finance.payment_order_approved', 'company', 'finance', 'approval_result', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'finance_payment_approved', true, '{"requiresAction": false, "description": "Orden de pago aprobada", "recipientType": "user"}'::jsonb),
('finance.payment_order_rejected', 'company', 'finance', 'approval_result', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'finance_payment_rejected', true, '{"requiresAction": false, "description": "Orden de pago rechazada", "recipientType": "user"}'::jsonb),
('finance.check_issued', 'company', 'finance', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'finance_check_issued', true, '{"requiresAction": false, "description": "Cheque emitido", "recipientType": "user"}'::jsonb),
('finance.check_bounced', 'company', 'finance', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'finance_check_bounced', true, '{"requiresAction": true, "actionType": "response", "description": "Cheque rechazado", "recipientType": "role"}'::jsonb),
('finance.cash_authorization_request', 'company', 'finance', 'approval_request', 'interactive', '["email", "push"]'::jsonb, 'urgent', 4, 'finance_cash_authorization', true, '{"requiresAction": true, "actionType": "approval", "description": "Autorización de efectivo", "recipientType": "role"}'::jsonb),
('finance.treasury_low_balance', 'company', 'finance', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'finance_treasury_low', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Tesorería con saldo bajo", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.6 HSE - Seguridad e Higiene (6 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, escalation_policy, template_key, is_active, metadata) VALUES
('hse.equipment_replacement_warning', 'company', 'hse', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', 168, '{"levels": [{"after": "168h", "escalateTo": "supervisor"}, {"after": "336h", "escalateTo": "hse_manager"}]}'::jsonb, 'hse_equipment_replacement', true, '{"requiresAction": false, "description": "EPP (guantes, cascos, etc.) requiere reemplazo", "recipientType": "user"}'::jsonb),
('hse.safety_alert', 'company', 'hse', 'alert', 'warning', '["email", "push", "websocket"]'::jsonb, 'urgent', NULL, NULL, 'hse_safety_alert', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Alerta de seguridad", "recipientType": "department"}'::jsonb),
('hse.incident_reported', 'company', 'hse', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, NULL, 'hse_incident_reported', true, '{"requiresAction": true, "actionType": "response", "description": "Incidente reportado", "recipientType": "role"}'::jsonb),
('hse.certification_expiry', 'company', 'hse', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', NULL, NULL, 'hse_certification_expiry', true, '{"requiresAction": false, "description": "Certificación HSE por vencer", "recipientType": "user"}'::jsonb),
('hse.training_required', 'company', 'hse', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, NULL, 'hse_training_required', true, '{"requiresAction": false, "description": "Capacitación HSE requerida", "recipientType": "user"}'::jsonb),
('hse.inspection_scheduled', 'company', 'hse', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, NULL, 'hse_inspection_scheduled', true, '{"requiresAction": false, "description": "Inspección HSE programada", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.7 TRAINING - Capacitación (5 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('training.course_assigned', 'company', 'training', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'training_course_assigned', true, '{"requiresAction": false, "description": "Curso asignado", "recipientType": "user"}'::jsonb),
('training.course_deadline', 'company', 'training', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', 168, 'training_course_deadline', true, '{"requiresAction": false, "description": "Curso con deadline próximo", "recipientType": "user"}'::jsonb),
('training.course_completed', 'company', 'training', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'training_course_completed', true, '{"requiresAction": false, "description": "Curso completado", "recipientType": "user"}'::jsonb),
('training.certification_issued', 'company', 'training', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'training_certification_issued', true, '{"requiresAction": false, "description": "Certificación emitida", "recipientType": "user"}'::jsonb),
('training.certification_expiry', 'company', 'training', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', NULL, 'training_certification_expiry', true, '{"requiresAction": false, "description": "Certificación por vencer", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.8 PERFORMANCE - Evaluaciones (4 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('performance.evaluation_assigned', 'company', 'performance', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'performance_evaluation_assigned', true, '{"requiresAction": false, "description": "Evaluación asignada", "recipientType": "user"}'::jsonb),
('performance.evaluation_due', 'company', 'performance', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', 168, 'performance_evaluation_due', true, '{"requiresAction": false, "description": "Evaluación por vencer", "recipientType": "user"}'::jsonb),
('performance.evaluation_completed', 'company', 'performance', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'performance_evaluation_completed', true, '{"requiresAction": false, "description": "Evaluación completada", "recipientType": "user"}'::jsonb),
('performance.feedback_received', 'company', 'performance', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'performance_feedback', true, '{"requiresAction": false, "description": "Feedback recibido", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.9 SANCTIONS - Sanciones (3 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('sanctions.employee_notification', 'company', 'sanctions', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', 24, 'sanctions_employee', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Notificación de sanción a empleado", "recipientType": "user"}'::jsonb),
('sanctions.hr_notification', 'company', 'sanctions', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'sanctions_hr', true, '{"requiresAction": false, "description": "Copia a RRHH de sanción aplicada", "recipientType": "role"}'::jsonb),
('sanctions.supervisor_notification', 'company', 'sanctions', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'sanctions_supervisor', true, '{"requiresAction": false, "description": "Si es suspensión, notificar a supervisor", "recipientType": "hierarchy"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.10 LEGAL - Legal (5 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('legal.case_assigned', 'aponnt', 'legal', 'info', 'info', '["email"]'::jsonb, 'high', NULL, 'legal_case_assigned', true, '{"requiresAction": false, "description": "Caso asignado", "recipientType": "associate"}'::jsonb),
('legal.deadline_warning', 'aponnt', 'legal', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'legal_deadline', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Deadline legal próximo", "recipientType": "associate"}'::jsonb),
('legal.document_request', 'company', 'legal', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'legal_document_request', true, '{"requiresAction": true, "actionType": "response", "description": "Solicitud de documento legal", "recipientType": "user"}'::jsonb),
('legal.case_update', 'company', 'legal', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'legal_case_update', true, '{"requiresAction": false, "description": "Actualización de caso legal", "recipientType": "user"}'::jsonb),
('legal.settlement_approved', 'company', 'legal', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'legal_settlement', true, '{"requiresAction": false, "description": "Acuerdo legal aprobado", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.11 LOGISTICS - Logística (7 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('logistics.delivery_scheduled', 'company', 'logistics', 'info', 'info', '["email", "push"]'::jsonb, 'normal', NULL, 'logistics_delivery_scheduled', true, '{"requiresAction": false, "description": "Entrega programada", "recipientType": "user"}'::jsonb),
('logistics.delivery_completed', 'company', 'logistics', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'logistics_delivery_completed', true, '{"requiresAction": false, "description": "Entrega completada", "recipientType": "role"}'::jsonb),
('logistics.vehicle_maintenance_due', 'company', 'logistics', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', NULL, 'logistics_maintenance', true, '{"requiresAction": false, "description": "Mantenimiento de vehículo vencido", "recipientType": "role"}'::jsonb),
('logistics.driver_assignment', 'company', 'logistics', 'info', 'info', '["push", "inbox"]'::jsonb, 'normal', NULL, 'logistics_driver_assignment', true, '{"requiresAction": false, "description": "Asignación de conductor", "recipientType": "user"}'::jsonb),
('logistics.route_changed', 'company', 'logistics', 'info', 'info', '["push", "websocket"]'::jsonb, 'high', NULL, 'logistics_route_changed', true, '{"requiresAction": false, "description": "Cambio de ruta", "recipientType": "user"}'::jsonb),
('logistics.fuel_card_limit', 'company', 'logistics', 'alert', 'warning', '["inbox"]'::jsonb, 'normal', NULL, 'logistics_fuel_limit', true, '{"requiresAction": false, "description": "Tarjeta de combustible cerca del límite", "recipientType": "role"}'::jsonb),
('logistics.accident_reported', 'company', 'logistics', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'logistics_accident', true, '{"requiresAction": true, "actionType": "response", "description": "Accidente reportado", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.12 HR - Recursos Humanos (12 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('hr.policy_update', 'company', 'hr', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'hr_policy_update', true, '{"requiresAction": false, "description": "Actualización de política", "recipientType": "department"}'::jsonb),
('hr.birthday_greeting', 'company', 'hr', 'info', 'info', '["email"]'::jsonb, 'low', NULL, 'hr_birthday', true, '{"requiresAction": false, "description": "Saludo de cumpleaños", "recipientType": "user"}'::jsonb),
('hr.anniversary_greeting', 'company', 'hr', 'info', 'info', '["email"]'::jsonb, 'low', NULL, 'hr_anniversary', true, '{"requiresAction": false, "description": "Aniversario laboral", "recipientType": "user"}'::jsonb),
('hr.onboarding_welcome', 'company', 'hr', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'hr_onboarding_welcome', true, '{"requiresAction": false, "description": "Bienvenida a nuevo empleado", "recipientType": "user"}'::jsonb),
('hr.onboarding_task_assigned', 'company', 'hr', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'hr_onboarding_task', true, '{"requiresAction": false, "description": "Tarea de onboarding asignada", "recipientType": "user"}'::jsonb),
('hr.offboarding_started', 'company', 'hr', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'hr_offboarding', true, '{"requiresAction": false, "description": "Proceso de salida iniciado", "recipientType": "user"}'::jsonb),
('hr.exit_interview_scheduled', 'company', 'hr', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'hr_exit_interview', true, '{"requiresAction": false, "description": "Entrevista de salida programada", "recipientType": "user"}'::jsonb),
('hr.document_missing', 'company', 'hr', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', NULL, 'hr_document_missing', true, '{"requiresAction": true, "actionType": "response", "description": "Documento faltante", "recipientType": "user"}'::jsonb),
('hr.contract_renewal_reminder', 'company', 'hr', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', 720, 'hr_contract_renewal', true, '{"requiresAction": false, "description": "Recordatorio de renovación de contrato", "recipientType": "user"}'::jsonb),
('hr.probation_end_reminder', 'company', 'hr', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'hr_probation_end', true, '{"requiresAction": false, "description": "Fin de período de prueba próximo", "recipientType": "user"}'::jsonb),
('hr.benefits_enrollment_open', 'company', 'hr', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'hr_benefits_enrollment', true, '{"requiresAction": false, "description": "Inscripción a beneficios abierta", "recipientType": "group"}'::jsonb),
('hr.survey_assigned', 'company', 'hr', 'info', 'info', '["email", "inbox"]'::jsonb, 'low', NULL, 'hr_survey', true, '{"requiresAction": false, "description": "Encuesta asignada", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.13 CONTRACTS - Contratos (6 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('contracts.expiry_warning', 'company', 'contracts', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', 720, 'contracts_expiry', true, '{"requiresAction": false, "description": "Contrato por vencer", "recipientType": "user"}'::jsonb),
('contracts.renewal_required', 'company', 'contracts', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'contracts_renewal_required', true, '{"requiresAction": true, "actionType": "response", "description": "Renovación de contrato requerida", "recipientType": "role"}'::jsonb),
('contracts.renewal_completed', 'company', 'contracts', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'contracts_renewal_completed', true, '{"requiresAction": false, "description": "Renovación de contrato completada", "recipientType": "user"}'::jsonb),
('contracts.modification_proposed', 'company', 'contracts', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'contracts_modification', true, '{"requiresAction": true, "actionType": "response", "description": "Modificación de contrato propuesta", "recipientType": "user"}'::jsonb),
('contracts.signed', 'company', 'contracts', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'contracts_signed', true, '{"requiresAction": false, "description": "Contrato firmado", "recipientType": "user"}'::jsonb),
('contracts.terminated', 'company', 'contracts', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'urgent', NULL, 'contracts_terminated', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Contrato terminado", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.14 ACCESS CONTROL - Control de Acceso (3 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('access.temporary_access_granted', 'company', 'access', 'info', 'info', '["email"]'::jsonb, 'normal', NULL, 'access_temporary_granted', true, '{"requiresAction": false, "description": "Acceso temporal otorgado", "recipientType": "user"}'::jsonb),
('access.temporary_access_expiring', 'company', 'access', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', NULL, 'access_expiring', true, '{"requiresAction": false, "description": "Acceso temporal por vencer", "recipientType": "user"}'::jsonb),
('access.unauthorized_attempt', 'company', 'access', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'access_unauthorized', true, '{"requiresAction": true, "actionType": "response", "description": "Intento de acceso no autorizado", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.15 KIOSK - Kioscos Biométricos (5 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('kiosk.offline_alert', 'company', 'kiosk', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'kiosk_offline', true, '{"requiresAction": true, "actionType": "response", "description": "Kiosk fuera de línea", "recipientType": "role"}'::jsonb),
('kiosk.sync_error', 'company', 'kiosk', 'alert', 'warning', '["email"]'::jsonb, 'high', NULL, 'kiosk_sync_error', true, '{"requiresAction": true, "actionType": "response", "description": "Error de sincronización", "recipientType": "role"}'::jsonb),
('kiosk.maintenance_required', 'company', 'kiosk', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'kiosk_maintenance', true, '{"requiresAction": false, "description": "Mantenimiento de kiosk requerido", "recipientType": "role"}'::jsonb),
('kiosk.fingerprint_quality_low', 'company', 'kiosk', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'kiosk_fingerprint_quality', true, '{"requiresAction": false, "description": "Calidad de huella baja", "recipientType": "user"}'::jsonb),
('kiosk.biometric_enrollment_required', 'company', 'kiosk', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', NULL, 'kiosk_enrollment_required', true, '{"requiresAction": true, "actionType": "acknowledgement", "description": "Enrollment biométrico requerido", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.16 DOCUMENTS - Documentos (6 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('documents.expiry_warning', 'company', 'documents', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', 720, 'documents_expiry', true, '{"requiresAction": false, "description": "Documento por vencer", "recipientType": "user"}'::jsonb),
('documents.missing_document', 'company', 'documents', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', NULL, 'documents_missing', true, '{"requiresAction": true, "actionType": "response", "description": "Documento faltante", "recipientType": "user"}'::jsonb),
('documents.upload_required', 'company', 'documents', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'documents_upload_required', true, '{"requiresAction": true, "actionType": "response", "description": "Carga de documento requerida", "recipientType": "user"}'::jsonb),
('documents.verification_required', 'company', 'documents', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'documents_verification_required', true, '{"requiresAction": true, "actionType": "approval", "description": "Verificación de documento requerida", "recipientType": "role"}'::jsonb),
('documents.verification_approved', 'company', 'documents', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'documents_verification_approved', true, '{"requiresAction": false, "description": "Documento verificado y aprobado", "recipientType": "user"}'::jsonb),
('documents.verification_rejected', 'company', 'documents', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'documents_verification_rejected', true, '{"requiresAction": true, "actionType": "response", "description": "Documento rechazado", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.17 BILLING APONNT - Facturación a Empresas (4 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('aponnt.billing.invoice_generated', 'company', 'billing', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'aponnt_invoice_generated', true, '{"requiresAction": false, "description": "Factura Aponnt generada", "recipientType": "role"}'::jsonb),
('aponnt.billing.payment_due', 'company', 'billing', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', 168, 'aponnt_payment_due', true, '{"requiresAction": false, "description": "Pago Aponnt por vencer", "recipientType": "role"}'::jsonb),
('aponnt.billing.payment_overdue', 'company', 'billing', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'aponnt_payment_overdue', true, '{"requiresAction": true, "actionType": "response", "description": "Pago Aponnt vencido", "recipientType": "role"}'::jsonb),
('aponnt.billing.payment_received', 'company', 'billing', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'aponnt_payment_received', true, '{"requiresAction": false, "description": "Pago Aponnt recibido", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.18 MODULE TRIALS - Pruebas de Módulos (3 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('trials.trial_expiring', 'company', 'trials', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', 168, 'trials_expiring', true, '{"requiresAction": false, "description": "Prueba de módulo por vencer", "recipientType": "role"}'::jsonb),
('trials.trial_expired', 'company', 'trials', 'alert', 'warning', '["email", "push"]'::jsonb, 'urgent', NULL, 'trials_expired', true, '{"requiresAction": true, "actionType": "response", "description": "Prueba de módulo expirada", "recipientType": "role"}'::jsonb),
('trials.upgrade_offer', 'company', 'trials', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'trials_upgrade_offer', true, '{"requiresAction": false, "description": "Oferta de upgrade de módulo", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.19 DMS - Document Management (5 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('dms.folder_request', 'company', 'dms', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'dms_folder_request', true, '{"requiresAction": true, "actionType": "approval", "description": "Solicitud de carpeta DMS", "recipientType": "role"}'::jsonb),
('dms.folder_request_approved', 'company', 'dms', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'dms_folder_approved', true, '{"requiresAction": false, "description": "Solicitud de carpeta aprobada", "recipientType": "user"}'::jsonb),
('dms.folder_request_rejected', 'company', 'dms', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'dms_folder_rejected', true, '{"requiresAction": false, "description": "Solicitud de carpeta rechazada", "recipientType": "user"}'::jsonb),
('dms.access_granted', 'company', 'dms', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'dms_access_granted', true, '{"requiresAction": false, "description": "Acceso a carpeta DMS otorgado", "recipientType": "user"}'::jsonb),
('dms.access_revoked', 'company', 'dms', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'dms_access_revoked', true, '{"requiresAction": false, "description": "Acceso a carpeta DMS revocado", "recipientType": "user"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.20 SALES - Ventas (5 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('sales.quote_requested', 'aponnt', 'sales', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'sales_quote_requested', true, '{"requiresAction": true, "actionType": "response", "description": "Cotización solicitada", "recipientType": "role"}'::jsonb),
('sales.quote_sent', 'aponnt', 'sales', 'info', 'info', '["email"]'::jsonb, 'normal', NULL, 'sales_quote_sent', true, '{"requiresAction": false, "description": "Cotización enviada", "recipientType": "user"}'::jsonb),
('sales.quote_accepted', 'aponnt', 'sales', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'sales_quote_accepted', true, '{"requiresAction": false, "description": "Cotización aceptada", "recipientType": "role"}'::jsonb),
('sales.quote_rejected', 'aponnt', 'sales', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'sales_quote_rejected', true, '{"requiresAction": false, "description": "Cotización rechazada", "recipientType": "role"}'::jsonb),
('sales.contract_signed', 'aponnt', 'sales', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'sales_contract_signed', true, '{"requiresAction": false, "description": "Contrato firmado", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.21 MARKETING - Marketing (4 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('marketing.campaign_assigned', 'aponnt', 'marketing', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'marketing_campaign_assigned', true, '{"requiresAction": false, "description": "Campaña asignada", "recipientType": "role"}'::jsonb),
('marketing.campaign_launched', 'aponnt', 'marketing', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'marketing_campaign_launched', true, '{"requiresAction": false, "description": "Campaña lanzada", "recipientType": "role"}'::jsonb),
('marketing.campaign_completed', 'aponnt', 'marketing', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'marketing_campaign_completed', true, '{"requiresAction": false, "description": "Campaña completada", "recipientType": "role"}'::jsonb),
('marketing.lead_assigned', 'aponnt', 'marketing', 'info', 'info', '["email", "inbox"]'::jsonb, 'high', NULL, 'marketing_lead_assigned', true, '{"requiresAction": false, "description": "Lead asignado", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.22 EQUIPMENT - Equipamiento (4 workflows)
-- ----------------------------------------------------------------------------

INSERT INTO notification_workflows (workflow_key, scope, module, category, notification_type, channels, default_priority, sla_hours, template_key, is_active, metadata) VALUES
('equipment.assignment', 'company', 'equipment', 'info', 'info', '["email", "inbox"]'::jsonb, 'normal', NULL, 'equipment_assignment', true, '{"requiresAction": false, "description": "Equipamiento asignado", "recipientType": "user"}'::jsonb),
('equipment.return_due', 'company', 'equipment', 'alert', 'warning', '["email", "push"]'::jsonb, 'high', NULL, 'equipment_return_due', true, '{"requiresAction": true, "actionType": "response", "description": "Devolución de equipamiento vencida", "recipientType": "user"}'::jsonb),
('equipment.maintenance_scheduled', 'company', 'equipment', 'info', 'info', '["inbox"]'::jsonb, 'normal', NULL, 'equipment_maintenance', true, '{"requiresAction": false, "description": "Mantenimiento de equipamiento programado", "recipientType": "role"}'::jsonb),
('equipment.damage_reported', 'company', 'equipment', 'alert', 'warning', '["email", "inbox"]'::jsonb, 'high', NULL, 'equipment_damage', true, '{"requiresAction": true, "actionType": "response", "description": "Daño en equipamiento reportado", "recipientType": "role"}'::jsonb)
ON CONFLICT (workflow_key) DO NOTHING;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

COMMIT;

-- ============================================================================
-- RESUMEN DE LA MIGRACIÓN
-- ============================================================================
-- Total workflows insertados: 203
--   - Sección 1 (Críticos con bypass): 46 workflows
--   - Sección 2 (Normales no registrados): 157 workflows
--
-- Distribución por módulo:
--   Attendance (7), Suppliers (8), Procurement (13), Associates/Partners (7),
--   Support (4), Biometric (3), Contact/Jobs (4), Medical (8), Vacation (5),
--   Payroll (6), WMS (9), Finance (11), HSE (6), Training (5), Performance (4),
--   Sanctions (3), Legal (5), Logistics (7), HR (12), Contracts (6),
--   Access Control (3), Kiosk (5), Documents (6), Aponnt Billing (4),
--   Module Trials (3), DMS (5), Sales (5), Marketing (4), Equipment (4)
--
-- PRÓXIMO PASO: Migrar servicios uno por uno reemplazando bypass con NCE.send()
-- ============================================================================
