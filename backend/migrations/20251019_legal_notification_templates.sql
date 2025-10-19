-- ===========================================================================
-- TEMPLATES Y WORKFLOWS PARA MÓDULO LEGAL
-- Fecha: 2025-10-19
-- ===========================================================================

-- ============ TEMPLATES DE NOTIFICACIONES LEGALES ============

-- 1. TEMPLATE: Comunicación legal recibida
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
  'legal',
  'legal_communication_received',
  'Comunicación Legal Fehaciente Recibida',
  '⚖️ Comunicación Legal: {{communication_type}} - {{reference_number}}',
  'Ha recibido una comunicación legal fehaciente:

📋 Tipo: {{communication_type}}
📁 Categoría: {{communication_category}}
⚠️ Severidad: {{severity}}
📄 Referencia: {{reference_number}}

📝 Asunto:
{{subject}}

📖 Descripción:
{{description}}

⚖️ Base Legal:
{{legal_basis}}

🔔 Requiere Respuesta: {{requires_response}}
⏰ Plazo de Respuesta: {{response_deadline}}

IMPORTANTE: Esta es una comunicación legal fehaciente. Debe revisar el documento completo en el sistema y, si corresponde, proporcionar una respuesta dentro del plazo establecido.',
  'Comunicación Legal: {{communication_type}}',
  '["employee_name", "employee_id", "department", "communication_type", "communication_category", "severity", "subject", "description", "reference_number", "legal_basis", "requires_response", "response_deadline"]'::jsonb,
  true,
  true,
  NOW(),
  NOW()
);

-- 2. TEMPLATE: Cambio de estado de comunicación legal
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
  'legal',
  'legal_communication_status_change',
  'Actualización de Comunicación Legal',
  '⚖️ Actualización: {{communication_type}} - {{status}}',
  'El estado de su comunicación legal ha sido actualizado:

📋 Tipo: {{communication_type}}
📄 Referencia: {{reference_number}}
📝 Asunto: {{subject}}

🔄 Estado Actual: {{status}}
📆 Fecha de actualización: {{update_date}}

📝 Notas:
{{notes}}

Puede revisar los detalles completos de la comunicación en el sistema.',
  'Comunicación {{status}}: {{reference_number}}',
  '["employee_name", "employee_id", "communication_type", "reference_number", "subject", "status", "status_color", "notes", "update_date"]'::jsonb,
  true,
  true,
  NOW(),
  NOW()
);

-- 3. TEMPLATE: Recordatorio de respuesta pendiente
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
  'legal',
  'legal_communication_response_reminder',
  'Recordatorio de Respuesta a Comunicación Legal',
  '⚠️ Recordatorio: Respuesta pendiente - {{reference_number}}',
  'Le recordamos que tiene una comunicación legal pendiente de respuesta:

📋 Tipo: {{communication_type}}
📄 Referencia: {{reference_number}}
📝 Asunto: {{subject}}

⏰ Plazo de respuesta: {{response_deadline}}
📅 Días restantes: {{days_remaining}}

URGENTE: Es importante que proporcione su respuesta dentro del plazo establecido para evitar acciones legales adicionales.

Por favor, ingrese al sistema y complete su respuesta lo antes posible.',
  'Recordatorio: {{days_remaining}} días para responder',
  '["employee_name", "employee_id", "communication_type", "reference_number", "subject", "response_deadline", "days_remaining", "sent_date"]'::jsonb,
  true,
  true,
  NOW(),
  NOW()
);

-- 4. TEMPLATE: Comunicación legal vencida sin respuesta
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
  'legal',
  'legal_communication_expired',
  'Comunicación Legal Vencida Sin Respuesta',
  '🚨 VENCIDO: Respuesta no recibida - {{reference_number}}',
  'El plazo para responder a la siguiente comunicación legal ha vencido:

📋 Tipo: {{communication_type}}
📄 Referencia: {{reference_number}}
📝 Asunto: {{subject}}

⏰ Plazo de respuesta: {{response_deadline}}
📅 Fecha de vencimiento: {{expiration_date}}

🚨 IMPORTANTE: El plazo para responder ha vencido. La empresa puede tomar acciones adicionales según corresponda.

Por favor, contacte al departamento legal de inmediato para evaluar la situación.',
  'Comunicación vencida: {{reference_number}}',
  '["employee_name", "employee_id", "communication_type", "reference_number", "subject", "response_deadline", "expiration_date", "sent_date"]'::jsonb,
  true,
  true,
  NOW(),
  NOW()
);

-- ============ WORKFLOWS PARA MÓDULO LEGAL ============

-- WORKFLOW: Seguimiento de comunicaciones legales con respuesta requerida
-- Nivel 1: Empleado debe responder (5 días hábiles)
-- Nivel 2: Recordatorio (2 días antes del vencimiento)
-- Nivel 3: Escalamiento a RRHH/Legal (si vence sin respuesta)
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
  'legal',
  'legal_communication_response_tracking',
  'Seguimiento de Respuesta a Comunicación Legal',
  'Workflow para rastrear respuestas a comunicaciones legales fehacientes que requieren acción del empleado',
  '[
    {
      "step": 1,
      "role": "employee",
      "action_label": "Responder Comunicación",
      "timeout_minutes": 4320,
      "timeout_action": "remind",
      "can_complete": true,
      "completion_action": "mark_responded"
    },
    {
      "step": 2,
      "role": "employee",
      "action_label": "Recordatorio - Responder Comunicación",
      "timeout_minutes": 1440,
      "timeout_action": "escalate",
      "can_complete": true,
      "completion_action": "mark_responded"
    },
    {
      "step": 3,
      "role": "rrhh",
      "action_label": "Seguimiento de Comunicación Vencida",
      "timeout_minutes": 2880,
      "timeout_action": "mark_expired",
      "can_approve": false,
      "can_reject": false
    }
  ]'::jsonb,
  true,
  NOW(),
  NOW()
);

-- WORKFLOW: Comunicaciones legales informativas (sin respuesta requerida)
-- Solo notificación directa, sin seguimiento
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
  'legal',
  'legal_communication_informative',
  'Comunicación Legal Informativa',
  'Workflow simple para comunicaciones legales que no requieren respuesta',
  '[
    {
      "step": 1,
      "role": "employee",
      "action_label": "Lectura Confirmada",
      "timeout_minutes": null,
      "timeout_action": null,
      "can_complete": true,
      "completion_action": "mark_read"
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
WHERE module = 'legal'
ORDER BY template_key;

-- Verificar workflows creados
SELECT
  module,
  workflow_key,
  workflow_name,
  is_active,
  jsonb_array_length(steps) as num_steps
FROM notification_workflows
WHERE module = 'legal'
ORDER BY workflow_key;

-- ===========================================================================
-- FIN DE MIGRACIÓN
-- ===========================================================================
