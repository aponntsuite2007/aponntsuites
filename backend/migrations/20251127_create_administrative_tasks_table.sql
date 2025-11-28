-- ============================================================================
-- TABLA: administrative_tasks (Tareas Administrativas)
-- Workflow: altaEmpresa - FASE 3 (Supervisión Administrativa)
-- Descripción: Queue de tareas que requieren aprobación de admin Aponnt
-- Use Case: Facturas que requieren_supervision_factura = TRUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS administrative_tasks (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(100), -- ONBOARDING-{UUID} o ADMIN-{UUID}

  -- Tipo de tarea
  task_type VARCHAR(100) NOT NULL,
  -- FACTURA_SUPERVISION, CONTRACT_REVIEW, PAYMENT_VERIFICATION, etc.

  task_category VARCHAR(50) NOT NULL DEFAULT 'ONBOARDING',
  -- ONBOARDING, BILLING, COMPLIANCE, SUPPORT, OTHER

  -- Prioridad
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  -- CRITICAL, HIGH, NORMAL, LOW

  -- Relaciones
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
  related_entity_type VARCHAR(50), -- 'invoice', 'contract', 'budget', etc.
  related_entity_id UUID, -- ID de la factura, contrato, etc.

  -- Descripción de la tarea
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT, -- Instrucciones específicas para el admin

  -- Datos adjuntos (contexto)
  context_data JSONB, -- Datos adicionales relevantes para la tarea
  attachments JSONB, -- Array de { file_url, file_name, file_type }

  -- Asignación
  assigned_to UUID REFERENCES aponnt_staff(staff_id) ON DELETE SET NULL,
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES aponnt_staff(staff_id) ON DELETE SET NULL,

  -- Fechas límite
  due_date DATE,
  escalation_date DATE, -- Fecha para escalar si no se resuelve

  -- Estado de la tarea
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  -- PENDING, ASSIGNED, IN_PROGRESS, WAITING_INFO, APPROVED, REJECTED, CANCELLED, COMPLETED

  -- Respuesta/Resolución
  resolution VARCHAR(50), -- APPROVED, REJECTED, CANCELLED, INFO_PROVIDED
  resolution_notes TEXT,
  resolved_by UUID REFERENCES aponnt_staff(staff_id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,

  -- Notificaciones
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMP,

  -- Metadata
  source VARCHAR(50) DEFAULT 'SYSTEM', -- SYSTEM, MANUAL, API
  created_by UUID REFERENCES aponnt_staff(staff_id),

  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_task_status CHECK (status IN (
    'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_INFO',
    'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'
  )),
  CONSTRAINT valid_priority CHECK (priority IN ('CRITICAL', 'HIGH', 'NORMAL', 'LOW')),
  CONSTRAINT valid_resolution CHECK (
    (resolution IS NULL AND resolved_at IS NULL) OR
    (resolution IN ('APPROVED', 'REJECTED', 'CANCELLED', 'INFO_PROVIDED') AND resolved_at IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_admin_tasks_status ON administrative_tasks(status);
CREATE INDEX idx_admin_tasks_priority ON administrative_tasks(priority);
CREATE INDEX idx_admin_tasks_assigned_to ON administrative_tasks(assigned_to);
CREATE INDEX idx_admin_tasks_company ON administrative_tasks(company_id);
CREATE INDEX idx_admin_tasks_trace_id ON administrative_tasks(trace_id);
CREATE INDEX idx_admin_tasks_task_type ON administrative_tasks(task_type);
CREATE INDEX idx_admin_tasks_due_date ON administrative_tasks(due_date) WHERE status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS');
CREATE INDEX idx_admin_tasks_created_at ON administrative_tasks(created_at DESC);

-- Índice compuesto para queue de tareas pendientes
CREATE INDEX idx_admin_tasks_queue ON administrative_tasks(status, priority DESC, created_at ASC)
  WHERE status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_admin_tasks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_tasks_updated_at
  BEFORE UPDATE ON administrative_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_tasks_timestamp();

-- Función para obtener tareas pendientes de un admin
CREATE OR REPLACE FUNCTION get_pending_tasks_for_admin(
  p_admin_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  task_id UUID,
  task_type VARCHAR,
  title VARCHAR,
  priority VARCHAR,
  due_date DATE,
  created_at TIMESTAMP,
  days_pending INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    administrative_tasks.task_type,
    administrative_tasks.title,
    administrative_tasks.priority,
    administrative_tasks.due_date,
    administrative_tasks.created_at,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - administrative_tasks.created_at))::INTEGER AS days_pending
  FROM administrative_tasks
  WHERE
    status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
    AND (p_admin_id IS NULL OR assigned_to = p_admin_id OR assigned_to IS NULL)
  ORDER BY
    CASE administrative_tasks.priority
      WHEN 'CRITICAL' THEN 1
      WHEN 'HIGH' THEN 2
      WHEN 'NORMAL' THEN 3
      WHEN 'LOW' THEN 4
    END,
    administrative_tasks.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Función para escalar tareas vencidas
CREATE OR REPLACE FUNCTION escalate_overdue_tasks()
RETURNS TABLE(escalated_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Cambiar prioridad a CRITICAL para tareas vencidas
  UPDATE administrative_tasks
  SET
    priority = 'CRITICAL',
    reminder_count = reminder_count + 1,
    last_reminder_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE
    status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
    AND due_date < CURRENT_DATE
    AND priority != 'CRITICAL';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  escalated_count := v_count;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para auto-asignar tareas a admin disponible
CREATE OR REPLACE FUNCTION auto_assign_task_to_available_admin(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Buscar admin con menos tareas asignadas activas
  SELECT id INTO v_admin_id
  FROM aponnt_staff
  WHERE
    role IN ('admin', 'super_admin')
    AND is_active = true
  ORDER BY (
    SELECT COUNT(*)
    FROM administrative_tasks
    WHERE assigned_to = aponnt_staff.id
      AND status IN ('ASSIGNED', 'IN_PROGRESS')
  ) ASC
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    UPDATE administrative_tasks
    SET
      assigned_to = v_admin_id,
      assigned_at = CURRENT_TIMESTAMP,
      status = 'ASSIGNED',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = p_task_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Vista para dashboard de tareas administrativas
CREATE OR REPLACE VIEW vw_admin_tasks_dashboard AS
SELECT
  at.id,
  at.task_type,
  at.title,
  at.priority,
  at.status,
  at.due_date,
  at.created_at,
  c.name AS company_name,
  c.slug AS company_slug,
  CONCAT(asf.first_name, ' ', asf.last_name) AS assigned_to_name,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - at.created_at))::INTEGER AS days_pending,
  CASE
    WHEN at.due_date IS NOT NULL AND at.due_date < CURRENT_DATE THEN true
    ELSE false
  END AS is_overdue
FROM administrative_tasks at
LEFT JOIN companies c ON at.company_id = c.company_id
LEFT JOIN aponnt_staff asf ON at.assigned_to = asf.staff_id
WHERE at.status NOT IN ('COMPLETED', 'CANCELLED');

-- Comentarios de documentación
COMMENT ON TABLE administrative_tasks IS 'Queue de tareas administrativas para supervisión (Workflow altaEmpresa - FASE 3)';
COMMENT ON COLUMN administrative_tasks.task_type IS 'Tipo: FACTURA_SUPERVISION, CONTRACT_REVIEW, PAYMENT_VERIFICATION, etc.';
COMMENT ON COLUMN administrative_tasks.priority IS 'Prioridad: CRITICAL, HIGH, NORMAL, LOW';
COMMENT ON COLUMN administrative_tasks.status IS 'Estado: PENDING, ASSIGNED, IN_PROGRESS, APPROVED, REJECTED, COMPLETED';
COMMENT ON COLUMN administrative_tasks.resolution IS 'Resolución: APPROVED, REJECTED, CANCELLED, INFO_PROVIDED';

-- Grant permisos
-- GRANT SELECT, INSERT, UPDATE ON administrative_tasks TO attendance_system_user;
-- GRANT SELECT ON vw_admin_tasks_dashboard TO attendance_system_user;
