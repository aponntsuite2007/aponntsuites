-- ═══════════════════════════════════════════════════════════════════════════════
-- DATOS INICIALES - SISTEMA DE NOTIFICACIONES V2.0
-- Fecha: 2025-10-16
-- Descripción: Datos iniciales para tipos de participantes, módulos, request types,
--              compliance rules, proactive rules, y flujos de notificación
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TIPOS DE PARTICIPANTES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO notification_participant_types (type_code, name, description, requires_action, is_decisor, is_informative, can_forward, creates_deadline) VALUES
('initiator', 'Solicitante', 'Usuario que inicia la solicitud', false, false, false, false, false),
('acceptor', 'Aceptador', 'Usuario que debe aceptar/rechazar una solicitud', true, true, false, false, true),
('approver', 'Aprobador', 'Usuario con poder de aprobación/rechazo', true, true, false, true, true),
('reviewer', 'Revisor', 'Usuario que revisa pero no decide', true, false, false, true, true),
('informed', 'Informado', 'Usuario que solo recibe información de status', false, false, true, false, false),
('system', 'Sistema Automático', 'Validaciones y acciones automáticas del sistema', false, false, false, false, false),
('external', 'Entidad Externa', 'Organizaciones externas (ART, obras sociales, etc.)', false, false, true, false, false);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. MÓDULOS DEL SISTEMA (Core y Premium)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO system_modules (module_code, module_name, description, category, is_core, requires_license, depends_on_modules, optional_for_modules, version) VALUES

-- MÓDULOS CORE (siempre activos, no requieren licencia)
('users', 'Gestión de Usuarios', 'Gestión de usuarios, roles y permisos', 'core', true, false, '[]', '[]', '1.0'),
('auth', 'Autenticación', 'Sistema de autenticación y autorización', 'core', true, false, '[]', '[]', '1.0'),
('attendance', 'Control de Asistencia', 'Registro de entradas/salidas y asistencia', 'core', true, false, '["users"]', '[]', '1.0'),
('notifications', 'Sistema de Notificaciones', 'Centro de notificaciones y alertas', 'core', true, false, '["users"]', '[]', '2.0'),

-- MÓDULOS PREMIUM (requieren licencia)
('shifts', 'Gestión de Turnos', 'Administración de turnos y horarios', 'premium', false, true, '["users", "attendance"]', '[]', '1.0'),
('departments', 'Gestión de Departamentos', 'Organización por departamentos y áreas', 'premium', false, true, '["users"]', '[]', '1.0'),
('shift_compatibility', 'Matriz de Compatibilidad', 'Validación de compatibilidad de tareas entre empleados', 'premium', false, true, '["users", "shifts"]', '["shift_swap"]', '1.0'),
('art_integration', 'Integración con ART', 'Comunicación con aseguradoras de riesgos del trabajo', 'integration', false, true, '["users", "attendance"]', '["shift_swap", "incident_reports"]', '1.0'),
('medical', 'Gestión Médica', 'Historias clínicas y controles médicos', 'premium', false, true, '["users"]', '["medical_leave"]', '1.0'),
('visitors', 'Control de Visitas', 'Registro y control de visitantes', 'premium', false, true, '["users"]', '[]', '1.0'),
('payroll', 'Liquidación de Sueldos', 'Nómina y liquidaciones', 'premium', false, true, '["users", "attendance"]', '["overtime_request"]', '1.0'),
('biometric_advanced', 'Biometría Avanzada', 'Funcionalidades avanzadas de reconocimiento biométrico', 'premium', false, true, '["users", "attendance"]', '[]', '1.0'),
('compliance_dashboard', 'Dashboard de Compliance', 'Panel de cumplimiento legal en tiempo real', 'premium', false, true, '["users", "attendance"]', '[]', '1.0'),
('sla_tracking', 'SLA y Métricas', 'Tracking de tiempos de respuesta y rankings', 'premium', false, true, '["notifications"]', '[]', '1.0'),
('cost_center', 'Centro de Costos', 'Control de costos laborales en tiempo real', 'premium', false, true, '["users", "attendance"]', '[]', '1.0'),
('proactive_notifications', 'Notificaciones Proactivas', 'Sistema de detección preventiva de problemas', 'premium', false, true, '["notifications"]', '[]', '1.0'),
('reports_advanced', 'Reportes Avanzados', 'Reportes y análisis avanzados', 'premium', false, true, '["users"]', '[]', '1.0'),
('calendar_sync', 'Sincronización de Calendarios', 'Integración con Google Calendar y Outlook', 'integration', false, true, '["users", "notifications"]', '[]', '1.0');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. TIPOS DE SOLICITUD ESTRUCTURADA
-- ═══════════════════════════════════════════════════════════════════════════════

-- VACACIONES
INSERT INTO request_types (code, category, display_name_es, display_name_en, display_name_pt, legal_term, description, approval_chain, form_fields, validation_rules, email_subject_template, icon, color) VALUES
('vacation_request', 'time_off',
 'Solicitud de Vacaciones Anuales',
 'Annual Vacation Request',
 'Solicitação de Férias Anuais',
 'VACACIONES ANUALES ART. 150 LCT',
 'Solicitud formal de vacaciones con aprobación escalonada',
 '[{"role": "supervisor", "deadline_hours": 48}, {"role": "rrhh", "deadline_hours": 24}]',
 '[
    {"name": "vacation_type", "type": "select", "required": true, "label": "Tipo de vacaciones", "options": ["Vacaciones anuales", "Vacaciones proporcionales"]},
    {"name": "start_date", "type": "date", "required": true, "label": "Fecha inicio"},
    {"name": "end_date", "type": "date", "required": true, "label": "Fecha fin"},
    {"name": "reason", "type": "textarea", "required": false, "label": "Observaciones"}
 ]',
 '{"min_notice_days": 15, "requires_balance_check": true, "max_consecutive_days": 21}',
 '[SOLICITUD PENDIENTE] Vacaciones - {{employee_name}}',
 '🏖️', '#007bff');

-- LICENCIA MÉDICA
INSERT INTO request_types (code, category, display_name_es, display_name_en, display_name_pt, legal_term, description, approval_chain, form_fields, validation_rules, email_subject_template, icon, color) VALUES
('medical_leave', 'medical',
 'Solicitud de Licencia por Enfermedad',
 'Medical Leave Request',
 'Solicitação de Licença Médica',
 'LICENCIA POR ENFERMEDAD ART. 208 LCT',
 'Licencia por enfermedad con certificado médico obligatorio',
 '[{"role": "rrhh", "deadline_hours": 24}, {"role": "medical", "deadline_hours": 48}]',
 '[
    {"name": "start_date", "type": "date", "required": true, "label": "Fecha inicio"},
    {"name": "estimated_days", "type": "number", "required": true, "label": "Días estimados"},
    {"name": "medical_certificate", "type": "file", "required": true, "label": "Certificado médico"},
    {"name": "symptoms", "type": "textarea", "required": false, "label": "Síntomas"}
 ]',
 '{"requires_medical_certificate": true, "auto_notify_medical": true}',
 '[URGENTE] Licencia Médica - {{employee_name}}',
 '🏥', '#dc3545');

-- PERMISO POR AUSENCIA
INSERT INTO request_types (code, category, display_name_es, display_name_en, display_name_pt, legal_term, description, approval_chain, form_fields, validation_rules, email_subject_template, icon, color) VALUES
('absence_permission', 'time_off',
 'Permiso por Ausencia',
 'Absence Permission',
 'Permissão de Ausência',
 'PERMISO ESPECIAL',
 'Permiso especial por horas o días con motivo justificado',
 '[{"role": "supervisor", "deadline_hours": 24}]',
 '[
    {"name": "date", "type": "date", "required": true, "label": "Fecha"},
    {"name": "time_from", "type": "time", "required": true, "label": "Desde"},
    {"name": "time_to", "type": "time", "required": true, "label": "Hasta"},
    {"name": "reason", "type": "select", "required": true, "label": "Motivo", "options": ["Trámite personal", "Emergencia familiar", "Cita médica", "Otro"]},
    {"name": "reason_detail", "type": "textarea", "required": true, "label": "Detalle"}
 ]',
 '{"min_notice_hours": 4}',
 '[SOLICITUD] Permiso Ausencia - {{employee_name}} - {{date}}',
 '⏰', '#ffc107');

-- MODIFICACIÓN DE ASISTENCIA
INSERT INTO request_types (code, category, display_name_es, display_name_en, display_name_pt, legal_term, description, approval_chain, form_fields, validation_rules, email_subject_template, icon, color) VALUES
('attendance_modification', 'schedule',
 'Solicitud de Modificación de Registro',
 'Attendance Record Modification',
 'Solicitação de Modificação de Registro',
 'RECTIFICACIÓN DE ASISTENCIA',
 'Solicitud de corrección de registro de entrada/salida',
 '[{"role": "supervisor", "deadline_hours": 48}, {"role": "rrhh", "deadline_hours": 24}]',
 '[
    {"name": "date", "type": "date", "required": true, "label": "Fecha del registro"},
    {"name": "record_type", "type": "select", "required": true, "label": "Tipo", "options": ["Entrada", "Salida", "Entrada almuerzo", "Salida almuerzo"]},
    {"name": "current_time", "type": "time", "required": false, "label": "Hora registrada", "readonly": true},
    {"name": "correct_time", "type": "time", "required": true, "label": "Hora correcta"},
    {"name": "reason", "type": "textarea", "required": true, "label": "Motivo de la modificación"}
 ]',
 '{"max_days_back": 7, "requires_justification": true}',
 '[SOLICITUD] Modificación Asistencia - {{employee_name}} - {{date}}',
 '📝', '#17a2b8');

-- CAMBIO DE TURNO ENTRE EMPLEADOS
INSERT INTO request_types (code, category, display_name_es, display_name_en, display_name_pt, legal_term, description, approval_chain, form_fields, validation_rules, email_subject_template, icon, color) VALUES
('shift_swap_request', 'schedule',
 'Solicitud de Cambio de Turno',
 'Shift Swap Request',
 'Solicitação de Troca de Turno',
 'CAMBIO DE TURNO',
 'Intercambio de turno con otro empleado con validaciones y aprobaciones',
 '[{"role": "target_employee", "deadline_hours": 24}, {"role": "supervisor", "deadline_hours": 48}, {"role": "rrhh", "deadline_hours": 24}]',
 '[
    {"name": "target_employee_id", "type": "employee_select", "required": true, "label": "Empleado con quien cambiar"},
    {"name": "swap_date", "type": "date", "required": true, "label": "Fecha del cambio"},
    {"name": "reason", "type": "textarea", "required": true, "label": "Motivo del cambio"}
 ]',
 '{"min_notice_hours": 48, "requires_target_acceptance": true, "check_compatibility": true, "check_rest_period": true}',
 '[SOLICITUD] Cambio de Turno - {{employee_name}} con {{target_name}} - {{date}}',
 '🔄', '#6f42c1');

-- CAMBIO DE TURNO PERMANENTE
INSERT INTO request_types (code, category, display_name_es, display_name_en, display_name_pt, legal_term, description, approval_chain, form_fields, validation_rules, email_subject_template, icon, color) VALUES
('shift_change', 'schedule',
 'Solicitud de Cambio de Turno Permanente',
 'Permanent Shift Change Request',
 'Solicitação de Mudança Permanente de Turno',
 'CAMBIO DE TURNO',
 'Cambio permanente o temporal de turno asignado',
 '[{"role": "supervisor", "deadline_hours": 72}, {"role": "rrhh", "deadline_hours": 24}]',
 '[
    {"name": "current_shift", "type": "select", "required": true, "label": "Turno actual", "options_from": "shifts"},
    {"name": "requested_shift", "type": "select", "required": true, "label": "Turno solicitado", "options_from": "shifts"},
    {"name": "effective_date", "type": "date", "required": true, "label": "Fecha de cambio"},
    {"name": "is_permanent", "type": "radio", "required": true, "label": "Tipo", "options": ["Permanente", "Temporal"]},
    {"name": "reason", "type": "textarea", "required": true, "label": "Motivo"}
 ]',
 '{"min_notice_days": 7, "check_shift_availability": true}',
 '[SOLICITUD] Cambio de Turno - {{employee_name}}',
 '🔄', '#6610f2');

-- HORAS EXTRA
INSERT INTO request_types (code, category, display_name_es, display_name_en, display_name_pt, legal_term, description, approval_chain, form_fields, validation_rules, email_subject_template, icon, color) VALUES
('overtime_request', 'schedule',
 'Solicitud de Horas Extraordinarias',
 'Overtime Request',
 'Solicitação de Horas Extras',
 'HORAS EXTRAORDINARIAS ART. 201 LCT',
 'Solicitud de autorización de horas extra',
 '[{"role": "supervisor", "deadline_hours": 24}]',
 '[
    {"name": "date", "type": "date", "required": true, "label": "Fecha"},
    {"name": "hours", "type": "number", "required": true, "label": "Cantidad de horas", "min": 1, "max": 4},
    {"name": "justification", "type": "textarea", "required": true, "label": "Justificación"},
    {"name": "task_description", "type": "textarea", "required": true, "label": "Descripción de tareas"}
 ]',
 '{"max_monthly_hours": 30, "requires_supervisor_pre_approval": true}',
 '[SOLICITUD] Horas Extra - {{employee_name}} - {{date}}',
 '⏳', '#fd7e14');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. REGLAS DE COMPLIANCE LEGAL (Legislación Argentina)
-- ═══════════════════════════════════════════════════════════════════════════════

-- REMOVIDO: fine_amount_min, fine_amount_max (no mostrar montos)
INSERT INTO compliance_rules (rule_code, legal_reference, rule_type, severity, check_frequency, validation_query) VALUES
('rest_period_12h', 'Art. 197 LCT - Descanso entre jornadas', 'rest_period', 'critical', 'realtime',
 'SELECT employee_id FROM attendance_records WHERE exit_time IS NOT NULL AND (next_entry_time - exit_time) < INTERVAL ''12 hours'''),

('rest_period_weekly', 'Art. 204 LCT - Descanso semanal', 'rest_period', 'critical', 'weekly',
 'SELECT employee_id FROM attendance_records GROUP BY employee_id, WEEK(date) HAVING COUNT(DISTINCT date) = 7'),

('overtime_limit_monthly', 'Art. 201 LCT - Horas extraordinarias', 'overtime_limit', 'warning', 'daily',
 'SELECT employee_id FROM overtime_hours WHERE MONTH(date) = MONTH(CURRENT_DATE) GROUP BY employee_id HAVING SUM(hours) > 30'),

('vacation_expiry', 'Art. 153 LCT - Vencimiento de vacaciones', 'vacation_expiry', 'warning', 'weekly',
 'SELECT employee_id FROM vacation_balances WHERE expiry_date < CURRENT_DATE + INTERVAL ''60 days'' AND balance > 0'),

('medical_certificate', 'Art. 209 LCT - Certificado médico obligatorio', 'documentation', 'critical', 'daily',
 'SELECT employee_id FROM medical_leaves WHERE start_date < CURRENT_DATE AND certificate_file IS NULL'),

('max_working_hours', 'Art. 196 LCT - Jornada máxima', 'working_hours', 'critical', 'daily',
 'SELECT employee_id FROM attendance_records WHERE worked_hours > 9 AND date = CURRENT_DATE');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. REGLAS PROACTIVAS (Ejemplos por empresa - se pueden personalizar)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Nota: Estos INSERTs requieren company_id real, se agregarán dinámicamente por empresa
-- Aquí dejamos ejemplos comentados:

/*
-- EJEMPLO: Alerta de vacaciones próximas a vencer
INSERT INTO proactive_rules (company_id, rule_name, rule_type, trigger_condition, trigger_threshold, auto_action, notification_recipients, priority, check_frequency) VALUES
(1, 'Vacaciones próximas a vencer', 'vacation_expiry',
 'SELECT employee_id FROM vacation_balances WHERE expiry_date < CURRENT_DATE + INTERVAL ''45 days'' AND balance > 0',
 '{"days_until_expiry": 45}',
 'create_notification',
 '["employee", "rrhh"]',
 'medium',
 'weekly');

-- EJEMPLO: Empleado cerca del límite de horas extra
INSERT INTO proactive_rules (company_id, rule_name, rule_type, trigger_condition, trigger_threshold, auto_action, notification_recipients, priority, check_frequency) VALUES
(1, 'Límite de horas extra alcanzado', 'overtime_limit',
 'SELECT employee_id FROM overtime_hours WHERE MONTH(date) = MONTH(CURRENT_DATE) GROUP BY employee_id HAVING SUM(hours) >= 28',
 '{"percentage": 90, "monthly_limit": 30}',
 'send_alert',
 '["supervisor", "rrhh"]',
 'high',
 'daily');

-- EJEMPLO: Violación de período de descanso inminente
INSERT INTO proactive_rules (company_id, rule_name, rule_type, trigger_condition, trigger_threshold, auto_action, notification_recipients, priority, check_frequency) VALUES
(1, 'Riesgo de violación de descanso', 'rest_violation',
 'SELECT a1.employee_id FROM attendance_records a1 JOIN shift_assignments sa ON a1.employee_id = sa.employee_id WHERE a1.exit_time IS NOT NULL AND sa.start_time - a1.exit_time < INTERVAL ''12 hours''',
 '{"minimum_hours": 12}',
 'block_action',
 '["system", "rrhh"]',
 'critical',
 'realtime');
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. FLUJOS DE NOTIFICACIÓN - CAMBIO DE TURNO COMPLETO
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO notification_flow_templates (request_type_code, flow_name, description, flow_steps, optional_modules) VALUES
('shift_swap_request', 'Flujo completo de cambio de turno entre empleados',
 'Incluye validaciones de plazo, aceptación del compañero, compatibilidad de tareas, aprobación supervisor y RRHH con análisis de costos',
 '[
    {
        "step": 1,
        "name": "Solicitud inicial",
        "participant_type": "initiator",
        "role": "employee",
        "action": "submit_request",
        "validations": ["check_minimum_notice_period"],
        "on_validation_fail": "reject_with_reason",
        "on_validation_pass": "next_step"
    },
    {
        "step": 2,
        "name": "Aceptación del empleado destinatario",
        "participant_type": "acceptor",
        "role": "target_employee",
        "selection_criteria": "request.target_employee_id",
        "requires_action": true,
        "can_approve": true,
        "can_reject": true,
        "default_deadline_hours": 24,
        "notification_subject": "Solicitud de cambio de turno",
        "notification_body": "{{initiator_name}} solicita cambiar su turno del {{date}} contigo. ¿Aceptas?",
        "on_approve": "next_step",
        "on_reject": "end_chain_notify_all",
        "on_timeout": "auto_reject"
    },
    {
        "step": 3,
        "name": "Validación de compatibilidad (módulo opcional)",
        "participant_type": "system",
        "action": "validate_compatibility",
        "module_code": "shift_compatibility",
        "validation_function": "checkTaskCompatibility",
        "validation_params": ["initiator_tasks", "target_tasks"],
        "if_module_inactive": "skip_to_next_step",
        "if_module_active": {
            "on_compatible": "next_step",
            "on_incompatible": "reject_and_notify_reason"
        }
    },
    {
        "step": 4,
        "name": "Aprobación del superior inmediato",
        "participant_type": "approver",
        "role": "immediate_supervisor",
        "selection_criteria": "initiator.supervisor_id",
        "requires_action": true,
        "can_approve": true,
        "can_reject": true,
        "default_deadline_hours": 48,
        "context_enrichment": ["show_team_coverage", "show_pending_tasks"],
        "notification_subject": "Aprobación de cambio de turno",
        "on_approve": "next_step",
        "on_reject": "end_chain_notify_all"
    },
    {
        "step": 5,
        "name": "Aprobación de RRHH con análisis de costos",
        "participant_type": "approver",
        "role": "rrhh",
        "selection_criteria": "department_rrhh",
        "requires_action": true,
        "can_approve": true,
        "can_reject": true,
        "default_deadline_hours": 24,
        "context_enrichment": [
            "calculate_overtime_cost",
            "check_rest_period_compliance",
            "calculate_additional_costs",
            "check_labor_law_compliance"
        ],
        "warnings": [
            {
                "condition": "generates_overtime",
                "message": "⚠️ ADVERTENCIA: Este cambio genera horas extra para {{target_name}}",
                "severity": "high"
            },
            {
                "condition": "violates_rest_period",
                "message": "❌ BLOQUEO: Este cambio viola el período legal de descanso entre jornadas ({{hours}}h < 12h legal)",
                "severity": "critical",
                "auto_reject": true
            }
        ],
        "notification_subject": "Aprobación final RRHH - Cambio de turno",
        "on_approve": "execute_actions",
        "on_reject": "end_chain_notify_all"
    },
    {
        "step": 6,
        "name": "Ejecución de cambios en el sistema",
        "participant_type": "system",
        "actions": [
            {"action": "update_shift_assignments"},
            {"action": "update_kiosk_permissions"},
            {"action": "notify_art_if_module_active", "module_code": "art_integration"},
            {"action": "sync_calendar_if_module_active", "module_code": "calendar_sync"},
            {"action": "log_audit_trail"}
        ],
        "on_complete": "next_step"
    },
    {
        "step": 7,
        "name": "Notificación final a todos los involucrados",
        "participant_type": "informed",
        "recipients": [
            {"type": "employee", "id": "{{initiator_id}}"},
            {"type": "employee", "id": "{{target_id}}"},
            {"type": "supervisor", "id": "{{supervisor_id}}"},
            {"type": "rrhh", "id": "{{rrhh_id}}"}
        ],
        "notification_subject": "✅ Cambio de turno aprobado",
        "notification_body": "El cambio de turno del {{swap_date}} entre {{initiator_name}} y {{target_name}} ha sido aprobado y registrado en el sistema.",
        "requires_action": false,
        "on_complete": "close_chain"
    }
 ]',
 '{
    "shift_compatibility": {
        "name": "Matriz de Compatibilidad de Tareas",
        "if_active": "validate_in_step_3",
        "if_inactive": "skip_step_3"
    },
    "art_integration": {
        "name": "Integración con ART",
        "if_active": "notify_art_in_step_6",
        "if_inactive": "skip_art_notification"
    },
    "calendar_sync": {
        "name": "Sincronización de Calendarios",
        "if_active": "sync_calendars_in_step_6",
        "if_inactive": "skip_calendar_sync"
    }
 }');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. FLUJO SIMPLIFICADO - SOLICITUD DE VACACIONES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO notification_flow_templates (request_type_code, flow_name, description, flow_steps, optional_modules) VALUES
('vacation_request', 'Flujo de solicitud de vacaciones con validaciones',
 'Valida balance de días, aprobación de supervisor y RRHH',
 '[
    {
        "step": 1,
        "name": "Solicitud inicial",
        "participant_type": "initiator",
        "role": "employee",
        "action": "submit_request",
        "validations": ["check_minimum_notice_days", "check_vacation_balance"],
        "on_validation_fail": "reject_with_reason",
        "on_validation_pass": "next_step"
    },
    {
        "step": 2,
        "name": "Aprobación del supervisor",
        "participant_type": "approver",
        "role": "supervisor",
        "default_deadline_hours": 48,
        "context_enrichment": ["show_team_coverage", "show_vacation_balance"],
        "on_approve": "next_step",
        "on_reject": "end_chain_notify_all"
    },
    {
        "step": 3,
        "name": "Aprobación de RRHH",
        "participant_type": "approver",
        "role": "rrhh",
        "default_deadline_hours": 24,
        "context_enrichment": ["show_company_calendar", "check_blackout_dates"],
        "on_approve": "execute_actions",
        "on_reject": "end_chain_notify_all"
    },
    {
        "step": 4,
        "name": "Ejecución de acciones",
        "participant_type": "system",
        "actions": [
            {"action": "deduct_vacation_balance"},
            {"action": "block_attendance_dates"},
            {"action": "sync_calendar_if_module_active", "module_code": "calendar_sync"}
        ],
        "on_complete": "next_step"
    },
    {
        "step": 5,
        "name": "Notificación final",
        "participant_type": "informed",
        "recipients": [
            {"type": "employee", "id": "{{initiator_id}}"},
            {"type": "supervisor", "id": "{{supervisor_id}}"},
            {"type": "rrhh", "id": "{{rrhh_id}}"}
        ],
        "notification_subject": "✅ Vacaciones aprobadas",
        "on_complete": "close_chain"
    }
 ]',
 '{
    "calendar_sync": {
        "name": "Sincronización de Calendarios",
        "if_active": "sync_calendar_in_step_4",
        "if_inactive": "skip"
    }
 }');

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE DATOS INICIALES
-- ═══════════════════════════════════════════════════════════════════════════════
