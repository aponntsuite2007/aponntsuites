-- ===========================================================================
-- TEMPLATES Y WORKFLOWS PARA MÓDULO DE VACACIONES
-- Fecha: 2025-10-19
-- ===========================================================================

-- ============ TEMPLATES DE NOTIFICACIONES DE VACACIONES ============

-- 1. TEMPLATE: Solicitud de vacaciones para aprobación
INSERT INTO notification_templates (
  module,
  template_key,
  template_name,
  title_template,
  message_template,
  short_message_template,
  available_variables,
  default_send_email,
  is_active,
  created_at,
  updated_at
) VALUES (
  'vacation',
  'vacation_request_approval',
  'Aprobación de Solicitud de Vacaciones',
  '🏖️ Solicitud de vacaciones: {{employee_name}} - {{total_days}} días',
  'El empleado {{employee_name}} ({{employee_id}}) del departamento {{department}} ha solicitado {{license_type}}.

📅 Período solicitado: {{start_date}} a {{end_date}}
📊 Total de días: {{total_days}}
📋 Tipo: {{request_type}}

📝 Motivo:
{{reason}}

📆 Fecha de solicitud: {{request_date}}

Por favor, revise la solicitud y apruebe o rechace según la disponibilidad y políticas de la empresa.',
  'Solicitud vacaciones: {{employee_name}} - {{total_days}} días',
  '["employee_name", "employee_id", "department", "total_days", "start_date", "end_date", "request_type", "license_type", "reason", "request_date"]'::jsonb,
  false,
  true,
  NOW(),
  NOW()
);

-- 2. TEMPLATE: Respuesta a solicitud de vacaciones
INSERT INTO notification_templates (
  module,
  template_key,
  template_name,
  title_template,
  message_template,
  short_message_template,
  available_variables,
  default_send_email,
  is_active,
  created_at,
  updated_at
) VALUES (
  'vacation',
  'vacation_request_response',
  'Respuesta a Solicitud de Vacaciones',
  '🏖️ Su solicitud de vacaciones ha sido {{status}}',
  'Su solicitud de vacaciones ha sido {{status}}.

📅 Período solicitado: {{start_date}} a {{end_date}}
📊 Total de días: {{total_days}}

👤 Aprobado por: {{approver_name}}
📆 Fecha de decisión: {{approval_date}}

📝 Comentarios:
{{approval_comments}}

Esta decisión ha sido registrada en el sistema de gestión de vacaciones.',
  'Vacaciones {{status}}: {{total_days}} días',
  '["employee_name", "employee_id", "status", "status_color", "total_days", "start_date", "end_date", "approver_name", "approval_comments", "approval_date"]'::jsonb,
  true,
  true,
  NOW(),
  NOW()
);

-- 3. TEMPLATE: Recordatorio de días de vacaciones pendientes
INSERT INTO notification_templates (
  module,
  template_key,
  template_name,
  title_template,
  message_template,
  short_message_template,
  available_variables,
  default_send_email,
  is_active,
  created_at,
  updated_at
) VALUES (
  'vacation',
  'vacation_days_reminder',
  'Recordatorio de Días de Vacaciones Pendientes',
  '📅 Recordatorio: Tiene {{remaining_days}} días de vacaciones pendientes',
  'Estimado/a {{employee_name}},

Le recordamos que tiene días de vacaciones pendientes de utilizar:

📊 Total asignado: {{total_days}} días
✅ Días utilizados: {{used_days}} días
⏳ Días restantes: {{remaining_days}} días

📆 Año: {{current_year}}

Le sugerimos planificar sus vacaciones con anticipación para aprovechar sus días de descanso.',
  'Tiene {{remaining_days}} días de vacaciones pendientes',
  '["employee_name", "employee_id", "total_days", "used_days", "remaining_days", "current_year"]'::jsonb,
  true,
  true,
  NOW(),
  NOW()
);

-- ============ WORKFLOWS PARA MÓDULO DE VACACIONES ============

-- WORKFLOW: Aprobación de solicitudes de vacaciones
-- Nivel 1: Supervisor (24 horas)
-- Nivel 2: RRHH (48 horas si supervisor no responde)
INSERT INTO notification_workflows (
  module,
  workflow_key,
  workflow_name,
  description,
  steps,
  is_active,
  created_at,
  updated_at
) VALUES (
  'vacation',
  'vacation_request_approval',
  'Aprobación de Solicitudes de Vacaciones',
  'Workflow de aprobación para solicitudes de vacaciones de empleados',
  '[
    {
      "step": 1,
      "role": "supervisor",
      "action_label": "Revisar y Aprobar/Rechazar",
      "timeout_minutes": 1440,
      "timeout_action": "escalate",
      "can_approve": true,
      "can_reject": true,
      "approval_action": "final_approve",
      "rejection_action": "final_reject"
    },
    {
      "step": 2,
      "role": "rrhh",
      "action_label": "Revisar y Decidir",
      "timeout_minutes": 2880,
      "timeout_action": "auto_approve",
      "can_approve": true,
      "can_reject": true,
      "approval_action": "final_approve",
      "rejection_action": "final_reject"
    }
  ]'::jsonb,
  true,
  NOW(),
  NOW()
);

-- WORKFLOW: Aprobación de licencias extraordinarias
-- Nivel 1: Supervisor (12 horas)
-- Nivel 2: RRHH (24 horas)
-- Nivel 3: Gerencia (48 horas si es más de 5 días)
INSERT INTO notification_workflows (
  module,
  workflow_key,
  workflow_name,
  description,
  steps,
  is_active,
  created_at,
  updated_at
) VALUES (
  'vacation',
  'extraordinary_license_approval',
  'Aprobación de Licencias Extraordinarias',
  'Workflow de aprobación para licencias extraordinarias (matrimonio, fallecimiento, etc.)',
  '[
    {
      "step": 1,
      "role": "supervisor",
      "action_label": "Revisar y Aprobar/Rechazar",
      "timeout_minutes": 720,
      "timeout_action": "escalate",
      "can_approve": true,
      "can_reject": true,
      "approval_action": "escalate",
      "rejection_action": "final_reject"
    },
    {
      "step": 2,
      "role": "rrhh",
      "action_label": "Verificar Documentación y Aprobar/Rechazar",
      "timeout_minutes": 1440,
      "timeout_action": "escalate",
      "can_approve": true,
      "can_reject": true,
      "approval_action": "final_approve",
      "rejection_action": "final_reject"
    },
    {
      "step": 3,
      "role": "manager",
      "action_label": "Aprobación Final",
      "timeout_minutes": 2880,
      "timeout_action": "auto_reject",
      "can_approve": true,
      "can_reject": true,
      "approval_action": "final_approve",
      "rejection_action": "final_reject"
    }
  ]'::jsonb,
  true,
  NOW(),
  NOW()
);

-- ===========================================================================
-- VALIDACIÓN
-- ===========================================================================

-- Verificar templates creados
SELECT
  module,
  template_key,
  template_name,
  is_active
FROM notification_templates
WHERE module = 'vacation'
ORDER BY template_key;

-- Verificar workflows creados
SELECT
  module,
  workflow_key,
  workflow_name,
  is_active,
  jsonb_array_length(steps) as num_steps
FROM notification_workflows
WHERE module = 'vacation'
ORDER BY workflow_key;

-- ===========================================================================
-- FIN DE MIGRACIÓN
-- ===========================================================================
