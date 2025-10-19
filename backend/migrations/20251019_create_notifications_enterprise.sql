-- =========================================================================
-- MIGRACIÓN: Sistema de Notificaciones Enterprise
-- Fecha: 2025-10-19
-- Descripción: Crea tablas para sistema unificado de notificaciones,
--              workflows, templates y trazabilidad completa
-- =========================================================================

-- =========================================================================
-- 1. TABLA PRINCIPAL: notifications (reemplaza access_notifications)
-- =========================================================================

CREATE TABLE IF NOT EXISTS notifications (
  -- Identificación
  id BIGSERIAL PRIMARY KEY,
  uuid UUID UNIQUE DEFAULT gen_random_uuid(),

  -- Multi-tenant
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Clasificación
  module VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'info',
  notification_type VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',

  -- Destinatarios (múltiples estrategias)
  recipient_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  recipient_role VARCHAR(50),
  recipient_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  recipient_shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
  recipient_custom_list JSONB DEFAULT '[]',
  is_broadcast BOOLEAN DEFAULT false,

  -- Contenido
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  short_message VARCHAR(140),
  email_body TEXT,

  -- Contexto (entidades relacionadas)
  related_entity_type VARCHAR(50),
  related_entity_id BIGINT,
  related_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  related_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  related_kiosk_id INTEGER REFERENCES kiosks(id) ON DELETE SET NULL,
  related_attendance_id BIGINT REFERENCES attendances(id) ON DELETE SET NULL,

  -- Metadata contextual
  metadata JSONB DEFAULT '{}',

  -- Estado de lectura
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  read_by UUID REFERENCES users(user_id) ON DELETE SET NULL,

  -- Workflow de acción
  requires_action BOOLEAN DEFAULT false,
  action_status VARCHAR(50) DEFAULT 'pending',
  action_type VARCHAR(50),
  action_deadline TIMESTAMP,
  action_taken_at TIMESTAMP,
  action_taken_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action_response TEXT,
  action_options JSONB DEFAULT '[]',

  -- Escalamiento
  escalation_level INTEGER DEFAULT 0,
  escalated_from_notification_id BIGINT REFERENCES notifications(id) ON DELETE SET NULL,
  escalated_to_notification_id BIGINT REFERENCES notifications(id) ON DELETE SET NULL,
  escalation_reason VARCHAR(255),

  -- Canales de envío
  sent_via_app BOOLEAN DEFAULT true,
  sent_via_email BOOLEAN DEFAULT false,
  sent_via_whatsapp BOOLEAN DEFAULT false,
  sent_via_sms BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  whatsapp_sent_at TIMESTAMP,
  sms_sent_at TIMESTAMP,

  -- Recordatorios
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0,

  -- Expiración
  expires_at TIMESTAMP,

  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,

  -- Soft delete
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(user_id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, is_read, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_company_module ON notifications(company_id, module, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_priority ON notifications(priority, action_deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_action_status ON notifications(action_status, requires_action) WHERE requires_action = true AND deleted_at IS NULL;
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_escalation ON notifications(escalation_level, escalated_from_notification_id) WHERE escalation_level > 0;
CREATE INDEX idx_notifications_deadline ON notifications(action_deadline) WHERE action_deadline IS NOT NULL AND action_status = 'pending';
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Índice GIN para búsqueda en metadata
CREATE INDEX idx_notifications_metadata_gin ON notifications USING GIN (metadata);

-- =========================================================================
-- 2. TABLA: notification_workflows (definición de cadenas de aprobación)
-- =========================================================================

CREATE TABLE IF NOT EXISTS notification_workflows (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE, -- NULL = workflow global

  -- Identificación
  workflow_key VARCHAR(100) NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  module VARCHAR(50) NOT NULL,
  description TEXT,

  -- Configuración
  is_active BOOLEAN DEFAULT true,

  -- Pasos del workflow (array ordenado)
  steps JSONB NOT NULL DEFAULT '[]',

  -- Condiciones de activación
  activation_conditions JSONB DEFAULT '{}',

  -- Acciones automáticas
  on_approval_actions JSONB DEFAULT '[]',
  on_rejection_actions JSONB DEFAULT '[]',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, workflow_key)
);

CREATE INDEX idx_workflows_company_module ON notification_workflows(company_id, module, is_active);

-- =========================================================================
-- 3. TABLA: notification_actions_log (historial de acciones)
-- =========================================================================

CREATE TABLE IF NOT EXISTS notification_actions_log (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Acción
  action VARCHAR(50) NOT NULL,
  action_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action_at TIMESTAMP DEFAULT NOW(),

  -- Contexto
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Auditoría web
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_notification_actions_notification ON notification_actions_log(notification_id, action_at DESC);
CREATE INDEX idx_notification_actions_user ON notification_actions_log(action_by, action_at DESC);
CREATE INDEX idx_notification_actions_company ON notification_actions_log(company_id, action_at DESC);

-- =========================================================================
-- 4. TABLA: notification_templates (plantillas reutilizables)
-- =========================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE, -- NULL = global

  template_key VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  module VARCHAR(50) NOT NULL,

  -- Contenido con placeholders
  title_template VARCHAR(255),
  message_template TEXT,
  short_message_template VARCHAR(140),
  email_template TEXT,

  -- Variables disponibles
  available_variables JSONB DEFAULT '[]',

  -- Configuración de canales por defecto
  default_send_email BOOLEAN DEFAULT false,
  default_send_whatsapp BOOLEAN DEFAULT false,
  default_send_sms BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, template_key)
);

CREATE INDEX idx_notification_templates_module ON notification_templates(module, is_active);

-- =========================================================================
-- 5. TABLA: user_notification_preferences (preferencias por usuario)
-- =========================================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Preferencias por módulo
  module VARCHAR(50) NOT NULL,

  -- Canales preferidos
  receive_app BOOLEAN DEFAULT true,
  receive_email BOOLEAN DEFAULT true,
  receive_whatsapp BOOLEAN DEFAULT false,
  receive_sms BOOLEAN DEFAULT false,

  -- Horarios (no molestar)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_days JSONB DEFAULT '[]', -- [0, 6] = Domingo y Sábado

  -- Resúmenes
  daily_digest BOOLEAN DEFAULT false,
  digest_time TIME DEFAULT '08:00',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, company_id, module)
);

CREATE INDEX idx_user_notification_prefs ON user_notification_preferences(user_id, module);

-- =========================================================================
-- 6. FUNCIÓN: Actualizar updated_at automáticamente
-- =========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_workflows_updated_at BEFORE UPDATE ON notification_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 7. DATOS SEMILLA: Templates básicos
-- =========================================================================

-- Template: Llegada tarde requiere aprobación
INSERT INTO notification_templates (company_id, template_key, template_name, module, title_template, message_template, short_message_template, default_send_email, available_variables) VALUES
(NULL, 'attendance_late_arrival_approval', 'Llegada tarde - Aprobación requerida', 'attendance',
 '⏰ {{employee_name}} llegó {{minutes_late}} min tarde',
 'El empleado {{employee_name}} ({{employee_id}}) del departamento {{department}} llegó {{minutes_late}} minutos tarde al turno {{shift_name}} (tolerancia: {{tolerance_minutes}} min).\n\n📍 Kiosk: {{kiosk_name}}\n🕐 Hora ingreso: {{check_in_time}}\n⏱️ Hora esperada: {{expected_time}}\n\n¿Aprobar la asistencia?',
 '{{employee_name}} llegó {{minutes_late}} min tarde. ¿Aprobar?',
 true,
 '["employee_name", "employee_id", "department", "minutes_late", "shift_name", "tolerance_minutes", "kiosk_name", "check_in_time", "expected_time"]');

-- Template: Supervisor aprobó
INSERT INTO notification_templates (company_id, template_key, template_name, module, title_template, message_template, default_send_email, available_variables) VALUES
(NULL, 'attendance_supervisor_approved', 'Llegada tarde aprobada por supervisor', 'attendance',
 '✅ Supervisor aprobó tu llegada tarde',
 'Tu llegada tarde del {{date}} fue APROBADA por {{supervisor_name}}.\n\n📝 Notas: {{supervisor_notes}}',
 false,
 '["date", "supervisor_name", "supervisor_notes"]');

-- Template: RRHH debe revisar
INSERT INTO notification_templates (company_id, template_key, template_name, module, title_template, message_template, default_send_email, available_variables) VALUES
(NULL, 'attendance_requires_rrhh', 'RRHH - Revisión requerida', 'attendance',
 '👥 RRHH: Revisar llegada tarde de {{employee_name}}',
 'El supervisor {{supervisor_name}} APROBÓ la llegada tarde de {{employee_name}} ({{minutes_late}} min).\n\nRevisión final de RRHH requerida.\n\n📝 Notas supervisor: {{supervisor_notes}}',
 true,
 '["employee_name", "supervisor_name", "minutes_late", "supervisor_notes"]');

-- =========================================================================
-- 8. DATOS SEMILLA: Workflow de asistencia (llegadas tarde)
-- =========================================================================

INSERT INTO notification_workflows (company_id, workflow_key, workflow_name, module, description, steps, activation_conditions, on_approval_actions, on_rejection_actions) VALUES
(NULL, 'attendance_late_arrival_approval', 'Aprobación de llegada tarde', 'attendance',
 'Workflow para aprobar llegadas fuera de tolerancia: Supervisor → RRHH → Decisión final',
 '[
   {
     "step": 1,
     "name": "Aprobación Supervisor",
     "approver_field": "supervisor_id",
     "timeout_minutes": 30,
     "escalate_on_timeout": true,
     "required": true,
     "parallel": false
   },
   {
     "step": 2,
     "name": "Aprobación RRHH",
     "approver_role": "rrhh",
     "timeout_minutes": 120,
     "escalate_on_timeout": false,
     "required": true,
     "parallel": false
   }
 ]'::jsonb,
 '{
   "requires_authorization": true
 }'::jsonb,
 '["update_attendance_final_approved", "notify_employee_approved", "grant_access"]'::jsonb,
 '["update_attendance_final_rejected", "notify_employee_rejected", "deny_access"]'::jsonb
);

-- =========================================================================
-- 9. MIGRAR DATOS EXISTENTES (si existe access_notifications)
-- =========================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_notifications') THEN

    INSERT INTO notifications (
      company_id,
      module,
      category,
      notification_type,
      priority,
      recipient_user_id,
      title,
      message,
      related_user_id,
      related_visitor_id,
      related_kiosk_id,
      related_attendance_id,
      metadata,
      is_read,
      read_at,
      requires_action,
      action_status,
      action_type,
      action_response,
      action_taken_at,
      action_taken_by,
      expires_at,
      created_at,
      updated_at
    )
    SELECT
      company_id,
      CASE
        WHEN notification_type LIKE 'visitor_%' THEN 'visitors'
        WHEN notification_type LIKE 'employee_%' THEN 'attendance'
        WHEN notification_type LIKE 'kiosk_%' THEN 'system'
        ELSE 'general'
      END as module,
      CASE
        WHEN priority IN ('high', 'critical') THEN 'alert'
        WHEN action_taken = false AND notification_type LIKE '%authorization%' THEN 'approval_request'
        ELSE 'info'
      END as category,
      notification_type,
      priority,
      recipient_user_id,
      title,
      message,
      related_user_id,
      NULL, -- related_visitor_id (crear columna en notifications si necesario)
      related_kiosk_id,
      related_attendance_id,
      metadata,
      is_read,
      read_at,
      CASE WHEN action_taken = false AND notification_type LIKE '%authorization%' THEN true ELSE false END,
      CASE
        WHEN action_taken = true THEN action_type
        WHEN action_taken = false THEN 'pending'
        ELSE NULL
      END,
      action_type,
      action_notes,
      action_taken_at,
      action_taken_by,
      expires_at,
      created_at,
      updated_at
    FROM access_notifications
    WHERE deleted_at IS NULL;

    -- Renombrar tabla vieja (no borrar por seguridad)
    ALTER TABLE access_notifications RENAME TO access_notifications_old_backup;

    RAISE NOTICE 'Datos migrados de access_notifications a notifications';
  END IF;
END $$;

-- =========================================================================
-- FIN DE MIGRACIÓN
-- =========================================================================

-- Comentario en tablas
COMMENT ON TABLE notifications IS 'Sistema unificado de notificaciones enterprise con workflows, trazabilidad y multi-canal';
COMMENT ON TABLE notification_workflows IS 'Definición de cadenas de aprobación y workflows automáticos';
COMMENT ON TABLE notification_actions_log IS 'Historial completo de todas las acciones sobre notificaciones';
COMMENT ON TABLE notification_templates IS 'Plantillas reutilizables con placeholders para notificaciones';
COMMENT ON TABLE user_notification_preferences IS 'Preferencias de notificaciones por usuario y módulo';
