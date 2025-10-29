/**
 * TESTING TICKETS SYSTEM - Comunicación Ollama ↔ Claude Code
 *
 * Sistema de tickets para ciclo autónomo de testing y reparación:
 * 1. Ollama detecta error → Crea ticket
 * 2. Claude Code abre sesión → Lee tickets pendientes
 * 3. Claude Code repara → Marca ticket como FIXED
 * 4. Ollama re-testea → Cierra ticket si pasa
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

-- ════════════════════════════════════════════════════════════
-- TABLA: testing_tickets
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS testing_tickets (
  -- Identificación
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,  -- TICKET-001, TICKET-002, etc.

  -- Estado del ticket
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REPAIR',
  -- Estados posibles:
  --   PENDING_REPAIR: Ollama creó ticket, esperando que Claude repare
  --   IN_REPAIR: Claude está trabajando en el fix
  --   FIXED: Claude aplicó fix, esperando re-test de Ollama
  --   RETESTING: Ollama está re-testeando
  --   CLOSED: Test pasó, ticket cerrado
  --   REOPENED: Test falló después del fix
  --   BLOCKED: No se puede reparar automáticamente

  -- Prioridad
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  -- Prioridades: critical, high, medium, low

  -- Información del error
  module_name VARCHAR(100) NOT NULL,
  error_type VARCHAR(100),  -- js_error, http_error, network_error, etc.
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_details JSONB,  -- Detalles adicionales (línea, archivo, contexto)

  -- Ubicación del error
  file_path VARCHAR(500),
  line_number INTEGER,
  function_name VARCHAR(255),

  -- Test asociado
  test_name VARCHAR(255),
  test_type VARCHAR(50),  -- frontend, backend, e2e, integration
  test_context JSONB,  -- Datos del test (company_id, user_id, etc.)

  -- Asignación
  created_by VARCHAR(100) NOT NULL DEFAULT 'ollama-auditor',
  assigned_to VARCHAR(100) DEFAULT 'claude-code',

  -- Fix aplicado
  fix_attempted BOOLEAN DEFAULT false,
  fix_strategy VARCHAR(255),  -- hybrid, safe-patterns, manual, etc.
  fix_description TEXT,
  fix_files_modified JSONB,  -- Array de archivos modificados
  fix_applied_at TIMESTAMPTZ,
  fix_applied_by VARCHAR(100),

  -- Re-testing
  retest_count INTEGER DEFAULT 0,
  retest_passed BOOLEAN,
  retest_last_at TIMESTAMPTZ,
  retest_details JSONB,

  -- Ciclo de vida
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,

  -- Métricas
  time_to_fix_minutes INTEGER,  -- Tiempo desde creación hasta fix
  time_to_close_minutes INTEGER,  -- Tiempo desde creación hasta cierre

  -- Comunicación
  last_message TEXT,  -- Último mensaje de Ollama o Claude
  conversation_log JSONB DEFAULT '[]'::jsonb  -- Historial de mensajes
);

-- ════════════════════════════════════════════════════════════
-- ÍNDICES
-- ════════════════════════════════════════════════════════════

CREATE INDEX idx_testing_tickets_status ON testing_tickets(status);
CREATE INDEX idx_testing_tickets_priority ON testing_tickets(priority);
CREATE INDEX idx_testing_tickets_module ON testing_tickets(module_name);
CREATE INDEX idx_testing_tickets_assigned ON testing_tickets(assigned_to);
CREATE INDEX idx_testing_tickets_created ON testing_tickets(created_at DESC);

-- Índice compuesto para queries frecuentes
CREATE INDEX idx_testing_tickets_pending ON testing_tickets(status, priority DESC)
  WHERE status IN ('PENDING_REPAIR', 'IN_REPAIR', 'FIXED', 'RETESTING');

-- ════════════════════════════════════════════════════════════
-- TRIGGER: Auto-update updated_at
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_testing_tickets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Calcular métricas si el ticket se cierra
  IF NEW.status = 'CLOSED' AND OLD.status != 'CLOSED' THEN
    NEW.closed_at = NOW();
    NEW.time_to_close_minutes = EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60;

    -- Si ya se aplicó fix, calcular tiempo de fix
    IF NEW.fix_applied_at IS NOT NULL THEN
      NEW.time_to_fix_minutes = EXTRACT(EPOCH FROM (NEW.fix_applied_at - NEW.created_at)) / 60;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER testing_tickets_update_timestamp
  BEFORE UPDATE ON testing_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_testing_tickets_timestamp();

-- ════════════════════════════════════════════════════════════
-- FUNCIÓN: Generar número de ticket auto-incremental
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR AS $$
DECLARE
  next_num INTEGER;
  ticket_num VARCHAR;
BEGIN
  -- Obtener el siguiente número
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 8) AS INTEGER)), 0) + 1
  INTO next_num
  FROM testing_tickets;

  -- Formatear como TICKET-001
  ticket_num := 'TICKET-' || LPAD(next_num::TEXT, 3, '0');

  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- FUNCIÓN: Obtener tickets pendientes para Claude Code
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_pending_tickets_for_claude()
RETURNS TABLE (
  ticket_number VARCHAR,
  priority VARCHAR,
  module_name VARCHAR,
  error_message TEXT,
  file_path VARCHAR,
  line_number INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.ticket_number,
    t.priority,
    t.module_name,
    t.error_message,
    t.file_path,
    t.line_number,
    t.created_at
  FROM testing_tickets t
  WHERE t.status IN ('PENDING_REPAIR', 'REOPENED')
    AND t.assigned_to = 'claude-code'
  ORDER BY
    CASE t.priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    t.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- FUNCIÓN: Obtener tickets para re-test de Ollama
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_tickets_for_retest()
RETURNS TABLE (
  ticket_number VARCHAR,
  module_name VARCHAR,
  test_name VARCHAR,
  test_type VARCHAR,
  test_context JSONB,
  fix_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.ticket_number,
    t.module_name,
    t.test_name,
    t.test_type,
    t.test_context,
    t.fix_description
  FROM testing_tickets t
  WHERE t.status = 'FIXED'
    AND t.retest_count < 3  -- Máximo 3 intentos de re-test
  ORDER BY t.priority DESC, t.updated_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- FUNCIÓN: Estadísticas del sistema de tickets
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS TABLE (
  total_tickets INTEGER,
  pending_repair INTEGER,
  in_repair INTEGER,
  fixed_pending_retest INTEGER,
  closed INTEGER,
  blocked INTEGER,
  avg_time_to_fix_minutes NUMERIC,
  avg_time_to_close_minutes NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_tickets,
    COUNT(*) FILTER (WHERE status = 'PENDING_REPAIR')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'IN_REPAIR')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'FIXED')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'CLOSED')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'BLOCKED')::INTEGER,
    ROUND(AVG(time_to_fix_minutes), 2) AS avg_time_to_fix,
    ROUND(AVG(time_to_close_minutes), 2) AS avg_time_to_close,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'CLOSED')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate
  FROM testing_tickets;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- COMENTARIOS
-- ════════════════════════════════════════════════════════════

COMMENT ON TABLE testing_tickets IS 'Sistema de tickets para ciclo autónomo Ollama ↔ Claude Code';
COMMENT ON COLUMN testing_tickets.status IS 'Estado del ticket: PENDING_REPAIR, IN_REPAIR, FIXED, RETESTING, CLOSED, REOPENED, BLOCKED';
COMMENT ON COLUMN testing_tickets.priority IS 'Prioridad del ticket: critical, high, medium, low';
COMMENT ON COLUMN testing_tickets.conversation_log IS 'Historial de mensajes entre Ollama y Claude Code';
COMMENT ON FUNCTION get_pending_tickets_for_claude() IS 'Tickets que Claude Code debe reparar al abrir sesión';
COMMENT ON FUNCTION get_tickets_for_retest() IS 'Tickets que Ollama debe re-testear después de fix';
COMMENT ON FUNCTION get_ticket_stats() IS 'Estadísticas del sistema de tickets';
