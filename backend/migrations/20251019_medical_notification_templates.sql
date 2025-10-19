-- ===========================================================================
-- TEMPLATES Y WORKFLOWS PARA MÓDULO MÉDICO
-- Fecha: 2025-10-19
-- ===========================================================================

-- ============ TEMPLATES DE NOTIFICACIONES MÉDICAS ============

-- 1. TEMPLATE: Certificado médico enviado para revisión
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
  'medical',
  'medical_certificate_review',
  'Revisión de Certificado Médico',
  '🏥 Certificado médico: {{employee_name}} - {{requested_days}} días',
  'El empleado {{employee_name}} ({{employee_id}}) del departamento {{department}} ha enviado un certificado médico solicitando {{requested_days}} días de ausencia.

📅 Período: {{start_date}} a {{end_date}}
🩺 Síntomas: {{symptoms}}
🏥 Centro médico: {{medical_center}}
👨‍⚕️ Médico tratante: {{attending_physician}}
📋 Diagnóstico: {{diagnosis}}
📆 Fecha de emisión: {{issue_date}}

Visitó médico: {{has_visited_doctor}}

Por favor, revise el certificado y determine si la ausencia está justificada.',
  'Certificado médico: {{employee_name}} - {{requested_days}} días',
  '["employee_name", "employee_id", "department", "requested_days", "start_date", "end_date", "symptoms", "has_visited_doctor", "medical_center", "attending_physician", "diagnosis", "issue_date"]'::jsonb,
  false,
  true,
  NOW(),
  NOW()
);

-- 2. TEMPLATE: Respuesta a certificado médico
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
  'medical',
  'medical_certificate_response',
  'Respuesta a Certificado Médico',
  '📋 Respuesta a su certificado médico: {{status}}',
  'Su solicitud de certificado médico ha sido {{status}}.

📅 Período solicitado: {{start_date}} a {{end_date}}
📊 Días solicitados: {{requested_days}}
✅ Días aprobados: {{approved_days}}

👨‍⚕️ Revisado por: {{auditor_name}}
📆 Fecha de revisión: {{audit_date}}

📝 Observaciones:
{{auditor_response}}

Esta decisión ha sido registrada en su historial médico.',
  'Certificado {{status}}: {{approved_days}} días',
  '["employee_name", "employee_id", "status", "status_color", "requested_days", "approved_days", "auditor_name", "auditor_response", "audit_date", "start_date", "end_date"]'::jsonb,
  true,
  true,
  NOW(),
  NOW()
);

-- 3. TEMPLATE: Solicitud de foto médica
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
  'medical',
  'medical_photo_request',
  'Solicitud de Foto Médica',
  '📷 Solicitud de foto médica: {{body_part}}',
  'El personal médico le ha solicitado que envíe una foto médica.

📍 Parte del cuerpo: {{body_part}}
🔍 Tipo: {{photo_type_text}}
👨‍⚕️ Solicitado por: {{doctor_name}}

📝 Motivo:
{{request_reason}}

Por favor, ingrese al sistema y suba la foto solicitada lo antes posible.',
  'Foto médica requerida: {{body_part}}',
  '["body_part", "body_part_detail", "photo_type", "photo_type_text", "request_reason", "request_instructions", "is_required", "doctor_name"]'::jsonb,
  false,
  true,
  NOW(),
  NOW()
);

-- 4. TEMPLATE: Foto médica subida
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
  'medical',
  'medical_photo_uploaded',
  'Foto Médica Recibida',
  '📷 Foto médica recibida: {{employee_name}} - {{body_part}}',
  'El empleado {{employee_name}} ha subido la foto médica solicitada.

📍 Parte del cuerpo: {{body_part}}
🔍 Tipo: {{photo_type_text}}
📆 Fecha de la foto: {{photo_date}}

Por favor, revise la foto y proporcione su evaluación médica.',
  'Foto recibida: {{employee_name}} - {{body_part}}',
  '["employee_name", "employee_id", "body_part", "photo_type", "photo_type_text", "photo_date", "employee_notes"]'::jsonb,
  false,
  true,
  NOW(),
  NOW()
);

-- 5. TEMPLATE: Estudio médico subido
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
  'medical',
  'medical_study_uploaded',
  'Estudio Médico Recibido',
  '🔬 Estudio médico recibido: {{employee_name}} - {{study_name}}',
  'El empleado {{employee_name}} ({{employee_id}}) del departamento {{department}} ha subido un estudio médico.

🔬 Estudio: {{study_name}}
📋 Tipo: {{study_type}}
🏥 Institución: {{institution}}
📆 Fecha del estudio: {{study_date}}

Por favor, revise el estudio y actualice el historial médico del empleado.',
  'Estudio recibido: {{employee_name}} - {{study_name}}',
  '["employee_name", "employee_id", "department", "study_name", "study_type", "institution", "study_date", "certificate_id", "findings"]'::jsonb,
  false,
  true,
  NOW(),
  NOW()
);

-- ============ WORKFLOWS PARA MÓDULO MÉDICO ============

-- WORKFLOW: Revisión de certificados médicos
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
  'medical',
  'medical_certificate_review',
  'Revisión de Certificados Médicos',
  'Workflow de aprobación para certificados médicos enviados por empleados',
  '[
    {
      "step": 1,
      "role": "medical",
      "action_label": "Revisar y Aprobar/Rechazar",
      "timeout_minutes": 2880,
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
      "timeout_minutes": 4320,
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
WHERE module = 'medical'
ORDER BY template_key;

-- Verificar workflows creados
SELECT
  module,
  workflow_key,
  workflow_name,
  is_active,
  jsonb_array_length(steps) as num_steps
FROM notification_workflows
WHERE module = 'medical'
ORDER BY workflow_key;

-- ===========================================================================
-- FIN DE MIGRACIÓN
-- ===========================================================================
