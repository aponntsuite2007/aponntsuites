/**
 * MÓDULO DE SOPORTE - EXTENSIÓN: SLA, Escalamiento y Asistente Dual
 *
 * NUEVAS CARACTERÍSTICAS:
 * - Sistema de SLA con 3 niveles (Standard, Pro, Premium)
 * - Escalamiento automático a supervisores
 * - Jerarquía vendor → supervisor
 * - Asistente IA dual (fallback sin IA vs comercial con IA)
 * - Intento de resolución por asistente antes de escalar
 *
 * @version 1.1.0
 * @date 2025-01-23
 */

-- ============================================================================
-- TABLA 6: support_sla_plans - Planes de SLA contratables
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_sla_plans (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name VARCHAR(100) UNIQUE NOT NULL, -- 'standard', 'pro', 'premium'
  display_name VARCHAR(200) NOT NULL,

  -- Tiempos de respuesta y resolución (en horas)
  first_response_hours INTEGER NOT NULL, -- Tiempo máximo para primera respuesta
  resolution_hours INTEGER NOT NULL, -- Tiempo máximo para resolución completa

  -- Escalamiento automático
  escalation_hours INTEGER NOT NULL, -- Tiempo sin respuesta para escalar a supervisor

  -- Precio mensual
  price_monthly DECIMAL(10, 2) DEFAULT 0.00,

  -- Features del plan
  has_ai_assistant BOOLEAN DEFAULT false, -- ¿Incluye asistente IA comercial?
  priority_level INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=medium, 4=low

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at
CREATE TRIGGER update_support_sla_plans_updated_at
  BEFORE UPDATE ON support_sla_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE support_sla_plans IS 'Planes de SLA contratables por las empresas';
COMMENT ON COLUMN support_sla_plans.first_response_hours IS 'Tiempo máximo para primera respuesta del soporte';
COMMENT ON COLUMN support_sla_plans.resolution_hours IS 'Tiempo máximo para resolver el ticket completamente';
COMMENT ON COLUMN support_sla_plans.escalation_hours IS 'Tiempo sin respuesta para escalar automáticamente a supervisor';
COMMENT ON COLUMN support_sla_plans.has_ai_assistant IS 'Si incluye asistente IA comercial (con Ollama) o solo fallback';

-- ============================================================================
-- TABLA 7: support_vendor_supervisors - Jerarquía vendor-supervisor
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_vendor_supervisors (
  assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Vendedor
  vendor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Supervisor asignado
  supervisor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Fechas
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(vendor_id, supervisor_id)
);

CREATE INDEX idx_support_vendor_supervisors_vendor ON support_vendor_supervisors(vendor_id);
CREATE INDEX idx_support_vendor_supervisors_supervisor ON support_vendor_supervisors(supervisor_id);
CREATE INDEX idx_support_vendor_supervisors_active ON support_vendor_supervisors(is_active);

COMMENT ON TABLE support_vendor_supervisors IS 'Jerarquía de supervisores asignados a cada vendedor';
COMMENT ON COLUMN support_vendor_supervisors.supervisor_id IS 'Supervisor que recibe tickets escalados del vendedor';

-- ============================================================================
-- TABLA 8: support_escalations - Log de escalamientos
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_escalations (
  escalation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,

  -- Escalamiento
  escalated_from_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Vendedor original
  escalated_to_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Supervisor
  escalation_reason VARCHAR(100) NOT NULL, -- 'sla_timeout', 'manual_escalation', 'no_response'

  -- Tiempos
  escalated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Notas
  escalation_notes TEXT,
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_escalations_ticket ON support_escalations(ticket_id);
CREATE INDEX idx_support_escalations_from ON support_escalations(escalated_from_user_id);
CREATE INDEX idx_support_escalations_to ON support_escalations(escalated_to_user_id);
CREATE INDEX idx_support_escalations_created_at ON support_escalations(escalated_at DESC);

COMMENT ON TABLE support_escalations IS 'Log de todos los escalamientos de tickets a supervisores';
COMMENT ON COLUMN support_escalations.escalation_reason IS 'Razón: sla_timeout, manual_escalation, no_response';

-- ============================================================================
-- TABLA 9: support_assistant_attempts - Intentos del asistente IA
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_assistant_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,

  -- Tipo de asistente usado
  assistant_type VARCHAR(50) NOT NULL, -- 'fallback' (sin IA) o 'ai_powered' (con Ollama)

  -- Pregunta/problema del usuario
  user_question TEXT NOT NULL,

  -- Respuesta del asistente
  assistant_response TEXT NOT NULL,
  confidence_score DECIMAL(3, 2), -- 0.00 a 1.00 (solo para ai_powered)

  -- ¿El usuario aceptó la respuesta?
  user_satisfied BOOLEAN, -- true=resolvió, false=escalar a soporte, null=sin responder
  user_feedback TEXT,

  -- Tiempos
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_assistant_attempts_ticket ON support_assistant_attempts(ticket_id);
CREATE INDEX idx_support_assistant_attempts_type ON support_assistant_attempts(assistant_type);
CREATE INDEX idx_support_assistant_attempts_satisfied ON support_assistant_attempts(user_satisfied);
CREATE INDEX idx_support_assistant_attempts_created_at ON support_assistant_attempts(attempted_at DESC);

COMMENT ON TABLE support_assistant_attempts IS 'Log de intentos del asistente IA para resolver antes de escalar a soporte';
COMMENT ON COLUMN support_assistant_attempts.assistant_type IS 'fallback (sin IA) o ai_powered (con Ollama)';
COMMENT ON COLUMN support_assistant_attempts.user_satisfied IS 'true=resolvió, false=escalar, null=sin responder';

-- ============================================================================
-- MODIFICAR TABLA companies - Agregar plan de SLA
-- ============================================================================
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS support_sla_plan_id UUID REFERENCES support_sla_plans(plan_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_support_sla_plan ON companies(support_sla_plan_id);

COMMENT ON COLUMN companies.support_sla_plan_id IS 'Plan de SLA de soporte contratado por la empresa';

-- ============================================================================
-- MODIFICAR TABLA support_tickets - Agregar campos de SLA y asistente
-- ============================================================================
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS sla_first_response_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_resolution_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_escalation_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalated_to_supervisor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assistant_attempted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assistant_resolved BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_escalation_deadline ON support_tickets(sla_escalation_deadline);
CREATE INDEX IF NOT EXISTS idx_support_tickets_escalated_to_supervisor ON support_tickets(escalated_to_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assistant_attempted ON support_tickets(assistant_attempted);

COMMENT ON COLUMN support_tickets.sla_first_response_deadline IS 'Deadline para primera respuesta según SLA';
COMMENT ON COLUMN support_tickets.sla_resolution_deadline IS 'Deadline para resolución completa según SLA';
COMMENT ON COLUMN support_tickets.sla_escalation_deadline IS 'Deadline para escalar automáticamente si no hay respuesta';
COMMENT ON COLUMN support_tickets.assistant_attempted IS 'Si el asistente IA intentó resolver el ticket';
COMMENT ON COLUMN support_tickets.assistant_resolved IS 'Si el asistente IA logró resolver sin escalar';

-- ============================================================================
-- DATOS INICIALES: Planes de SLA
-- ============================================================================

-- Plan 1: Standard (incluido gratis)
INSERT INTO support_sla_plans (
  plan_name, display_name,
  first_response_hours, resolution_hours, escalation_hours,
  price_monthly, has_ai_assistant, priority_level, is_active
) VALUES (
  'standard', 'Soporte Standard (Incluido)',
  24, 72, 8, -- Respuesta en 24h, resolución en 72h, escalar después de 8h
  0.00, false, 3, true
) ON CONFLICT (plan_name) DO NOTHING;

-- Plan 2: Pro
INSERT INTO support_sla_plans (
  plan_name, display_name,
  first_response_hours, resolution_hours, escalation_hours,
  price_monthly, has_ai_assistant, priority_level, is_active
) VALUES (
  'pro', 'Soporte Pro',
  8, 24, 4, -- Respuesta en 8h, resolución en 24h, escalar después de 4h
  29.99, true, 2, true
) ON CONFLICT (plan_name) DO NOTHING;

-- Plan 3: Premium
INSERT INTO support_sla_plans (
  plan_name, display_name,
  first_response_hours, resolution_hours, escalation_hours,
  price_monthly, has_ai_assistant, priority_level, is_active
) VALUES (
  'premium', 'Soporte Premium',
  2, 8, 2, -- Respuesta en 2h, resolución en 8h, escalar después de 2h
  79.99, true, 1, true
) ON CONFLICT (plan_name) DO NOTHING;

-- ============================================================================
-- FUNCIONES HELPER ADICIONALES
-- ============================================================================

/**
 * Calcular deadlines de SLA al crear ticket
 */
CREATE OR REPLACE FUNCTION calculate_sla_deadlines(
  p_company_id INTEGER,
  p_created_at TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
  first_response_deadline TIMESTAMP WITH TIME ZONE,
  resolution_deadline TIMESTAMP WITH TIME ZONE,
  escalation_deadline TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_plan support_sla_plans%ROWTYPE;
BEGIN
  -- Obtener plan de SLA de la empresa
  SELECT sp.* INTO v_plan
  FROM companies c
  INNER JOIN support_sla_plans sp ON c.support_sla_plan_id = sp.plan_id
  WHERE c.company_id = p_company_id;

  -- Si no tiene plan, usar standard por defecto
  IF NOT FOUND THEN
    SELECT * INTO v_plan FROM support_sla_plans WHERE plan_name = 'standard';
  END IF;

  -- Calcular deadlines
  RETURN QUERY SELECT
    p_created_at + (v_plan.first_response_hours || ' hours')::INTERVAL,
    p_created_at + (v_plan.resolution_hours || ' hours')::INTERVAL,
    p_created_at + (v_plan.escalation_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

/**
 * Obtener supervisor de un vendedor
 */
CREATE OR REPLACE FUNCTION get_vendor_supervisor(p_vendor_id UUID)
RETURNS UUID AS $$
DECLARE
  v_supervisor_id UUID;
BEGIN
  SELECT supervisor_id INTO v_supervisor_id
  FROM support_vendor_supervisors
  WHERE vendor_id = p_vendor_id
    AND is_active = true
  ORDER BY assigned_at DESC
  LIMIT 1;

  RETURN v_supervisor_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Escalar automáticamente tickets que superaron deadline de escalamiento
 */
CREATE OR REPLACE FUNCTION auto_escalate_tickets()
RETURNS TABLE (
  ticket_id UUID,
  ticket_number VARCHAR(50),
  vendor_id UUID,
  supervisor_id UUID,
  escalation_reason VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.ticket_id,
    st.ticket_number,
    st.assigned_to_vendor_id as vendor_id,
    get_vendor_supervisor(st.assigned_to_vendor_id) as supervisor_id,
    'sla_timeout'::VARCHAR(100) as escalation_reason
  FROM support_tickets st
  WHERE st.status IN ('open', 'in_progress')
    AND st.sla_escalation_deadline < CURRENT_TIMESTAMP
    AND st.first_response_at IS NULL -- No ha habido respuesta
    AND st.escalated_to_supervisor_id IS NULL -- No escalado previamente
    AND get_vendor_supervisor(st.assigned_to_vendor_id) IS NOT NULL; -- Tiene supervisor
END;
$$ LANGUAGE plpgsql;

/**
 * Obtener tipo de asistente según plan de empresa
 */
CREATE OR REPLACE FUNCTION get_company_assistant_type(p_company_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_has_ai BOOLEAN;
BEGIN
  SELECT sp.has_ai_assistant INTO v_has_ai
  FROM companies c
  INNER JOIN support_sla_plans sp ON c.support_sla_plan_id = sp.plan_id
  WHERE c.company_id = p_company_id;

  -- Si no tiene plan o no tiene IA, usar fallback
  IF NOT FOUND OR v_has_ai = false THEN
    RETURN 'fallback';
  ELSE
    RETURN 'ai_powered';
  END IF;
END;
$$ LANGUAGE plpgsql;

/**
 * Trigger para calcular deadlines automáticamente al crear ticket
 */
CREATE OR REPLACE FUNCTION set_ticket_sla_deadlines()
RETURNS TRIGGER AS $$
DECLARE
  v_deadlines RECORD;
BEGIN
  -- Calcular deadlines según plan de SLA
  SELECT * INTO v_deadlines
  FROM calculate_sla_deadlines(NEW.company_id, NEW.created_at);

  NEW.sla_first_response_deadline := v_deadlines.first_response_deadline;
  NEW.sla_resolution_deadline := v_deadlines.resolution_deadline;
  NEW.sla_escalation_deadline := v_deadlines.escalation_deadline;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_sla_deadlines
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_sla_deadlines();

-- ============================================================================
-- ASIGNAR PLAN STANDARD A EMPRESAS EXISTENTES
-- ============================================================================
UPDATE companies
SET support_sla_plan_id = (SELECT plan_id FROM support_sla_plans WHERE plan_name = 'standard')
WHERE support_sla_plan_id IS NULL;

COMMENT ON FUNCTION calculate_sla_deadlines IS 'Calcula los 3 deadlines de SLA según el plan de la empresa';
COMMENT ON FUNCTION get_vendor_supervisor IS 'Obtiene el supervisor asignado de un vendedor';
COMMENT ON FUNCTION auto_escalate_tickets IS 'Retorna todos los tickets que deben escalarse automáticamente por timeout';
COMMENT ON FUNCTION get_company_assistant_type IS 'Retorna fallback o ai_powered según plan contratado';
