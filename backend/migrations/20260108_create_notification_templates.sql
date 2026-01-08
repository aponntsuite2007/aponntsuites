/**
 * Migración: Sistema de Templates Personalizables
 *
 * Permite a cada empresa personalizar los mensajes de notificación
 * por módulo y workflow, con soporte para variables dinámicas
 */

-- Tabla de templates de notificaciones
CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  workflow_key VARCHAR(100) NOT NULL,

  -- Template personalizado
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,

  -- Configuración de canales
  channels JSONB DEFAULT '["email", "inbox"]'::jsonb,
  priority VARCHAR(20) DEFAULT 'normal',

  -- Variables disponibles para este template
  available_variables JSONB DEFAULT '[]'::jsonb,

  -- Metadatos
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: Un solo template activo por empresa/módulo/workflow
  UNIQUE(company_id, module, workflow_key, is_active)
);

-- Índices
CREATE INDEX idx_notification_templates_company ON notification_templates(company_id);
CREATE INDEX idx_notification_templates_module ON notification_templates(module);
CREATE INDEX idx_notification_templates_workflow ON notification_templates(workflow_key);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);

-- Templates por defecto (GLOBALES - company_id = NULL)
INSERT INTO notification_templates (
  company_id,
  module,
  workflow_key,
  title_template,
  message_template,
  available_variables,
  channels,
  priority
) VALUES
-- VACATION
(NULL, 'vacation', 'vacation_request_created',
 'Solicitud de Vacaciones - {{employee_name}}',
 '{{employee_name}} ha solicitado {{total_days}} días de vacaciones desde {{start_date}} hasta {{end_date}}.',
 '["employee_name", "total_days", "start_date", "end_date", "request_type", "reason"]'::jsonb,
 '["email", "push", "inbox", "websocket"]'::jsonb,
 'high'),

(NULL, 'vacation', 'vacation_approved',
 'Vacaciones Aprobadas',
 'Tu solicitud de vacaciones ha sido APROBADA. Disfruta tu descanso!',
 '["employee_name", "total_days", "start_date", "end_date", "approver_name"]'::jsonb,
 '["email", "inbox", "websocket"]'::jsonb,
 'normal'),

(NULL, 'vacation', 'vacation_rejected',
 'Vacaciones Rechazadas',
 'Tu solicitud de vacaciones ha sido RECHAZADA. Motivo: {{approval_comments}}',
 '["employee_name", "total_days", "start_date", "end_date", "approver_name", "approval_comments"]'::jsonb,
 '["email", "inbox", "websocket"]'::jsonb,
 'high'),

-- ATTENDANCE
(NULL, 'attendance', 'attendance_late_arrival',
 'Llegada Tarde - {{employee_name}}',
 '{{employee_name}} llegó {{minutes_late}} minutos tarde. Hora esperada: {{expected_time}}, Hora real: {{check_in_time}}.',
 '["employee_name", "minutes_late", "check_in_time", "expected_time", "kiosk_name"]'::jsonb,
 '["email", "inbox", "websocket"]'::jsonb,
 'medium'),

(NULL, 'attendance', 'attendance_absence',
 'Ausencia Registrada - {{employee_name}}',
 'Se registró una ausencia para {{employee_name}} el {{date}}.',
 '["employee_name", "date", "absence_type", "absence_reason"]'::jsonb,
 '["email", "push", "inbox"]'::jsonb,
 'high'),

-- PAYROLL
(NULL, 'payroll', 'payroll_liquidation_generated',
 'Liquidación de Sueldo Generada - {{period}}',
 'Tu liquidación de sueldo para {{period}} está disponible. Monto total: ${{total_amount}}. Fecha de pago: {{payment_date}}.',
 '["period", "total_amount", "payment_date", "employee_name"]'::jsonb,
 '["email", "push", "inbox"]'::jsonb,
 'high'),

(NULL, 'payroll', 'payroll_receipt',
 'Recibo de Sueldo Disponible',
 'Tu recibo de sueldo para {{period}} está listo para descargar.',
 '["period", "employee_name"]'::jsonb,
 '["email", "inbox"]'::jsonb,
 'normal'),

-- STAFF
(NULL, 'staff', 'staff_training_assigned',
 'Nueva Capacitación Asignada',
 'Se te ha asignado la capacitación "{{training_name}}". Fecha de inicio: {{start_date}}.',
 '["training_name", "start_date", "duration", "instructor"]'::jsonb,
 '["email", "push", "inbox"]'::jsonb,
 'normal'),

-- HSE
(NULL, 'hse', 'hse_inspection_scheduled',
 'Inspección de EPP Programada',
 'Se ha programado una inspección de tu EPP "{{epp_name}}" para el {{inspection_date}}.',
 '["epp_name", "inspection_date", "inspector_name", "location"]'::jsonb,
 '["email", "inbox"]'::jsonb,
 'normal'),

(NULL, 'hse', 'hse_non_conformity',
 'No Conformidad Detectada en EPP',
 'Se detectó una no conformidad en tu EPP "{{epp_name}}". Estado: {{condition}}. Acción requerida: {{action_required}}.',
 '["epp_name", "condition", "action_required", "inspector_name"]'::jsonb,
 '["email", "push", "inbox", "websocket"]'::jsonb,
 'urgent'),

-- TRAINING
(NULL, 'training', 'training_enrollment',
 'Inscripción Confirmada - {{course_name}}',
 'Tu inscripción en el curso "{{course_name}}" ha sido confirmada. Inicio: {{start_date}}.',
 '["course_name", "start_date", "duration", "instructor", "location"]'::jsonb,
 '["email", "inbox"]'::jsonb,
 'normal'),

-- PERFORMANCE
(NULL, 'performance', 'performance_evaluation_created',
 'Nueva Evaluación de Desempeño',
 'Se te ha asignado una evaluación de desempeño para el período {{evaluation_period}}. Fecha límite: {{due_date}}.',
 '["evaluation_period", "due_date", "evaluator_name"]'::jsonb,
 '["email", "push", "inbox"]'::jsonb,
 'high'),

-- DOCUMENTS
(NULL, 'documents', 'documents_expiration',
 'Documento Próximo a Vencer',
 'Tu documento "{{document_name}}" vence el {{expiration_date}}. Por favor, renuévalo antes de esa fecha.',
 '["document_name", "expiration_date", "document_type", "days_until_expiration"]'::jsonb,
 '["email", "push", "inbox"]'::jsonb,
 'high'),

-- PROCEDURES
(NULL, 'procedures', 'procedures_approval',
 'Procedimiento Requiere Aprobación',
 'El procedimiento "{{procedure_name}}" requiere tu aprobación. Por favor revísalo.',
 '["procedure_name", "author_name", "created_date", "priority"]'::jsonb,
 '["email", "inbox"]'::jsonb,
 'high'),

-- COMMERCIAL
(NULL, 'commercial', 'commercial_opportunity_created',
 'Nueva Oportunidad Comercial',
 'Se creó una nueva oportunidad: "{{opportunity_name}}". Valor estimado: ${{estimated_value}}.',
 '["opportunity_name", "estimated_value", "client_name", "assigned_to"]'::jsonb,
 '["email", "inbox"]'::jsonb,
 'normal'),

-- ONBOARDING
(NULL, 'onboarding', 'onboarding_started',
 'Proceso de Inducción Iniciado',
 'Bienvenido! Tu proceso de inducción ha comenzado. Fecha de inicio: {{start_date}}.',
 '["employee_name", "start_date", "assigned_mentor", "duration"]'::jsonb,
 '["email", "inbox"]'::jsonb,
 'normal'),

-- ENGINEERING
(NULL, 'engineering', 'engineering_task_assigned',
 'Nueva Tarea Asignada',
 'Se te ha asignado la tarea "{{task_name}}". Fecha límite: {{due_date}}.',
 '["task_name", "due_date", "priority", "assigned_by"]'::jsonb,
 '["email", "inbox", "websocket"]'::jsonb,
 'normal'),

-- SECURITY
(NULL, 'security', 'security_access_granted',
 'Acceso Concedido',
 'Se te ha concedido acceso a "{{zone}}". Válido hasta: {{valid_until}}.',
 '["zone", "valid_until", "access_level", "granted_by"]'::jsonb,
 '["email", "inbox"]'::jsonb,
 'normal'),

-- PLATFORM
(NULL, 'platform', 'platform_maintenance_scheduled',
 'Mantenimiento Programado',
 'Mantenimiento programado para {{scheduled_date}}. Duración estimada: {{duration}}. Servicios afectados: {{affected_services}}.',
 '["scheduled_date", "duration", "affected_services"]'::jsonb,
 '["email", "push", "inbox"]'::jsonb,
 'high'),

-- ALERTS
(NULL, 'alerts', 'alerts_critical',
 'ALERTA CRÍTICA',
 'ALERTA: {{message}}. Requiere atención inmediata.',
 '["message", "alert_type", "severity"]'::jsonb,
 '["email", "sms", "push", "inbox", "websocket"]'::jsonb,
 'urgent');

-- Función para reemplazar variables en templates
CREATE OR REPLACE FUNCTION replace_template_variables(
  template TEXT,
  variables JSONB
) RETURNS TEXT AS $$
DECLARE
  result TEXT;
  key TEXT;
  value TEXT;
BEGIN
  result := template;

  -- Iterar sobre todas las claves en el objeto JSONB
  FOR key, value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    -- Reemplazar {{key}} con el valor
    result := REPLACE(result, '{{' || key || '}}', COALESCE(value, ''));
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para obtener template procesado
CREATE OR REPLACE FUNCTION get_processed_template(
  p_company_id INTEGER,
  p_module VARCHAR,
  p_workflow_key VARCHAR,
  p_variables JSONB
) RETURNS TABLE (
  title TEXT,
  message TEXT,
  channels JSONB,
  priority VARCHAR
) AS $$
DECLARE
  template RECORD;
BEGIN
  -- Buscar template de la empresa primero, luego global
  SELECT
    title_template,
    message_template,
    t.channels,
    t.priority
  INTO template
  FROM notification_templates t
  WHERE t.module = p_module
    AND t.workflow_key = p_workflow_key
    AND (t.company_id = p_company_id OR t.company_id IS NULL)
    AND t.is_active = true
  ORDER BY t.company_id DESC NULLS LAST  -- Priorizar empresa sobre global
  LIMIT 1;

  IF template IS NULL THEN
    -- Template no encontrado, retornar valores por defecto
    RETURN QUERY SELECT
      'Notificación'::TEXT,
      'Nueva notificación del sistema'::TEXT,
      '["email", "inbox"]'::JSONB,
      'normal'::VARCHAR;
  ELSE
    -- Procesar template con variables
    RETURN QUERY SELECT
      replace_template_variables(template.title_template, p_variables)::TEXT,
      replace_template_variables(template.message_template, p_variables)::TEXT,
      template.channels,
      template.priority;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE notification_templates IS 'Templates personalizables de notificaciones por empresa';
COMMENT ON FUNCTION replace_template_variables IS 'Reemplaza variables {{variable}} en un template con valores del JSONB';
COMMENT ON FUNCTION get_processed_template IS 'Obtiene template procesado con variables reemplazadas (prioriza empresa sobre global)';
