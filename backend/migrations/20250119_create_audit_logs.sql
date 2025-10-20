/**
 * MIGRATION: Create audit_logs table
 *
 * Sistema de Auditoría y Auto-Diagnóstico
 *
 * Tabla para registrar TODAS las ejecuciones de auditoría:
 * - Tests de endpoints
 * - Tests de base de datos
 * - Tests de integración
 * - Auto-healing attempts
 * - Errores detectados
 *
 * @created 2025-01-19
 * @version 1.0.0
 */

-- ═══════════════════════════════════════════════════════════
-- CREAR TABLA audit_logs
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  -- IDENTIFICACIÓN
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL, -- Agrupa todos los tests de una ejecución

  -- MULTI-TENANT
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

  -- CONTEXTO DE EJECUCIÓN
  environment VARCHAR(20) DEFAULT 'local' CHECK (environment IN ('local', 'render', 'production')),
  triggered_by VARCHAR(20) DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'scheduled', 'auto-healing', 'deploy-hook')),

  -- TIPO DE TEST
  test_type VARCHAR(30) NOT NULL CHECK (test_type IN (
    'endpoint',
    'database',
    'relation',
    'integration',
    'e2e',
    'performance',
    'security',
    'stress',
    'console-error',
    'render-logs'
  )),

  test_name VARCHAR(255) NOT NULL,
  module_name VARCHAR(100),
  description TEXT,

  -- ENDPOINT TEST (si aplica)
  endpoint VARCHAR(500),
  http_method VARCHAR(10),
  request_body JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  response_body JSONB,

  -- ERRORES
  error_type VARCHAR(100),
  error_message TEXT,
  error_stack TEXT,
  error_file VARCHAR(500),
  error_line INTEGER,
  error_column INTEGER,
  error_context JSONB, -- { variables, state, surrounding_code }

  -- AUTO-HEALING
  fix_attempted BOOLEAN DEFAULT FALSE,
  fix_strategy VARCHAR(50), -- 'auto-fix' | 'suggestion' | 'manual'
  fix_applied BOOLEAN DEFAULT FALSE,
  fix_code TEXT, -- Código del fix aplicado o sugerido
  fix_result JSONB, -- { success, changes, backup_path, error }
  fix_rollback_available BOOLEAN DEFAULT FALSE,
  suggestions JSONB, -- [{ type, description, code, safe }]

  -- ESTADO Y TIEMPOS
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'warning', 'skipped', 'fixed')),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- METADATA
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════

-- Búsqueda por execution_id (muy frecuente)
CREATE INDEX idx_audit_logs_execution_id ON audit_logs(execution_id);

-- Multi-tenant filtering
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);

-- Búsqueda por módulo
CREATE INDEX idx_audit_logs_module_name ON audit_logs(module_name);

-- Búsqueda por tipo de test
CREATE INDEX idx_audit_logs_test_type ON audit_logs(test_type);

-- Búsqueda por status
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- Búsqueda por fecha (para cleanup y reportes)
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Búsqueda compuesta: ejecuciones recientes por empresa
CREATE INDEX idx_audit_logs_company_recent ON audit_logs(company_id, created_at DESC);

-- Búsqueda de errores que requieren atención
CREATE INDEX idx_audit_logs_failed ON audit_logs(status, fix_attempted) WHERE status = 'failed';

-- ═══════════════════════════════════════════════════════════
-- TRIGGER PARA updated_at
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_logs_updated_at
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_logs_updated_at();

-- ═══════════════════════════════════════════════════════════
-- COMENTARIOS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE audit_logs IS 'Registro completo de auditorías y auto-healing del sistema';
COMMENT ON COLUMN audit_logs.execution_id IS 'UUID que agrupa todos los tests de una ejecución';
COMMENT ON COLUMN audit_logs.company_id IS 'NULL = test global, NOT NULL = test específico de empresa';
COMMENT ON COLUMN audit_logs.test_type IS 'Tipo de test ejecutado (endpoint, database, integration, etc.)';
COMMENT ON COLUMN audit_logs.error_context IS 'JSONB con contexto del error: variables, state, código circundante';
COMMENT ON COLUMN audit_logs.fix_strategy IS 'auto-fix (safe errors) | suggestion (critical errors) | manual';
COMMENT ON COLUMN audit_logs.suggestions IS 'Array JSONB con sugerencias de fixes si no se auto-repara';

-- ═══════════════════════════════════════════════════════════
-- FUNCIÓN HELPER: Obtener resumen de ejecución
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_execution_summary(exec_id UUID)
RETURNS TABLE (
  execution_id UUID,
  total_tests BIGINT,
  passed BIGINT,
  failed BIGINT,
  warnings BIGINT,
  fixed BIGINT,
  duration_seconds INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  modules_tested TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    exec_id,
    COUNT(*)::BIGINT as total_tests,
    COUNT(*) FILTER (WHERE status = 'passed')::BIGINT as passed,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed,
    COUNT(*) FILTER (WHERE status = 'warning')::BIGINT as warnings,
    COUNT(*) FILTER (WHERE status = 'fixed')::BIGINT as fixed,
    EXTRACT(EPOCH FROM (MAX(al.completed_at) - MIN(al.started_at)))::INTEGER as duration_seconds,
    MIN(al.started_at) as started_at,
    MAX(al.completed_at) as completed_at,
    ARRAY_AGG(DISTINCT al.module_name) FILTER (WHERE al.module_name IS NOT NULL) as modules_tested
  FROM audit_logs al
  WHERE al.execution_id = exec_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_execution_summary IS 'Obtiene resumen completo de una ejecución de auditoría';

-- ═══════════════════════════════════════════════════════════
-- FUNCIÓN HELPER: Obtener health score de un módulo
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_module_health(mod_name VARCHAR, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  module_name VARCHAR,
  total_tests BIGINT,
  pass_rate NUMERIC,
  avg_response_time_ms NUMERIC,
  recent_failures BIGINT,
  last_test TIMESTAMP,
  health_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE status IN ('passed', 'fixed'))::NUMERIC as passed,
      AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_time,
      COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days')::BIGINT as recent_fails,
      MAX(created_at) as last_test
    FROM audit_logs
    WHERE module_name = mod_name
      AND created_at > NOW() - (days_back || ' days')::INTERVAL
  )
  SELECT
    mod_name,
    s.total,
    ROUND((s.passed / NULLIF(s.total, 0)) * 100, 2) as pass_rate,
    ROUND(s.avg_time, 2) as avg_response_time,
    s.recent_fails,
    s.last_test,
    CASE
      WHEN s.total = 0 THEN 0
      WHEN s.recent_fails > 5 THEN 0
      WHEN s.passed / s.total >= 0.95 THEN 100
      WHEN s.passed / s.total >= 0.85 THEN 75
      WHEN s.passed / s.total >= 0.70 THEN 50
      ELSE 25
    END::INTEGER as health_score
  FROM stats s;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_module_health IS 'Calcula health score (0-100) de un módulo basado en tests recientes';

-- ═══════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Tabla audit_logs creada exitosamente';
  RAISE NOTICE '✅ 8 índices creados para performance óptimo';
  RAISE NOTICE '✅ Trigger updated_at configurado';
  RAISE NOTICE '✅ Funciones helper: get_execution_summary, get_module_health';
  RAISE NOTICE '🔍 Sistema de Auditoría y Auto-Diagnóstico LISTO';
END $$;
