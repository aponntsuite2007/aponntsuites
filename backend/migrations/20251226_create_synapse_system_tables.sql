/**
 * ============================================================================
 * SYNAPSE - Sistema Completo de Testing Enterprise
 * ============================================================================
 *
 * Migración para centralizar documentación y configuración de SYNAPSE en BD
 *
 * SYNAPSE incluye:
 * - Playwright E2E (63 configs, 16 layers)
 * - Brain Integration (análisis + fixes)
 * - Sistema Nervioso (coordinación)
 * - Auto-Healing (ciclo automático)
 *
 * @version 1.0.0
 * @date 2025-12-26
 */

-- ============================================================================
-- TABLA: synapse_documentation
-- Documentación centralizada del sistema SYNAPSE
-- ============================================================================
CREATE TABLE IF NOT EXISTS synapse_documentation (
  id SERIAL PRIMARY KEY,

  -- Identificación
  doc_key VARCHAR(100) UNIQUE NOT NULL,  -- ej: 'overview', 'quickstart', 'architecture'
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,         -- 'core', 'api', 'testing', 'brain', 'deployment'

  -- Contenido
  content TEXT NOT NULL,                 -- Documentación completa (Markdown)
  summary TEXT,                          -- Resumen corto (1-2 párrafos)

  -- Metadata
  version VARCHAR(20) DEFAULT '1.0.0',
  tags TEXT[],                           -- ['testing', 'playwright', 'e2e']
  related_docs TEXT[],                   -- ['quickstart', 'api-reference']

  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_synapse_docs_category ON synapse_documentation(category);
CREATE INDEX idx_synapse_docs_tags ON synapse_documentation USING gin(tags);

COMMENT ON TABLE synapse_documentation IS 'Documentación centralizada de SYNAPSE - Sistema de Testing Enterprise';

-- ============================================================================
-- TABLA: synapse_config
-- Configuración parametrizada de SYNAPSE
-- ============================================================================
CREATE TABLE IF NOT EXISTS synapse_config (
  id SERIAL PRIMARY KEY,

  -- Identificación
  config_key VARCHAR(100) UNIQUE NOT NULL,  -- ej: 'batch.timeout', 'brain.enabled'
  config_group VARCHAR(50) NOT NULL,        -- 'batch', 'brain', 'performance', 'chaos'

  -- Valor y tipo
  value_type VARCHAR(20) NOT NULL,          -- 'string', 'number', 'boolean', 'json', 'array'
  value TEXT NOT NULL,                      -- Valor serializado
  default_value TEXT,

  -- Metadata
  description TEXT,
  validation_rules JSONB,                   -- { "min": 1000, "max": 60000 } para timeouts
  is_required BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,       -- Password, tokens, etc.

  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Índices
CREATE INDEX idx_synapse_config_group ON synapse_config(config_group);
CREATE INDEX idx_synapse_config_required ON synapse_config(is_required);

COMMENT ON TABLE synapse_config IS 'Configuración parametrizada de SYNAPSE';

-- ============================================================================
-- TABLA: synapse_test_presets
-- Presets de configuración para tests (reemplaza configs en .md)
-- ============================================================================
CREATE TABLE IF NOT EXISTS synapse_test_presets (
  id SERIAL PRIMARY KEY,

  -- Identificación
  preset_name VARCHAR(100) UNIQUE NOT NULL,  -- 'quick-smoke', 'full-regression', 'chaos-stress'
  description TEXT,

  -- Configuración del preset
  config JSONB NOT NULL,                     -- Toda la config del test
  /*
    Ejemplo:
    {
      "selectedTests": ["navigation", "crud", "performance"],
      "selectedModules": ["users", "attendance", "dashboard"],
      "brainIntegration": true,
      "chaosEnabled": true,
      "maxDuration": 30000,
      "performanceThresholds": {
        "pageLoad": 3000,
        "apiResponse": 1000
      }
    }
  */

  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,

  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100)
);

COMMENT ON TABLE synapse_test_presets IS 'Presets de configuración para tests E2E';

-- ============================================================================
-- TABLA: synapse_execution_history
-- Historial completo de ejecuciones de SYNAPSE
-- ============================================================================
CREATE TABLE IF NOT EXISTS synapse_execution_history (
  id SERIAL PRIMARY KEY,

  -- Identificación
  execution_id VARCHAR(100) UNIQUE NOT NULL,  -- ej: 'exec_1735242000000'
  execution_type VARCHAR(50) NOT NULL,        -- 'batch', 'single-module', 'auto-healing'
  preset_id INTEGER REFERENCES synapse_test_presets(id),

  -- Configuración usada
  config_snapshot JSONB NOT NULL,             -- Snapshot de config al momento de ejecución

  -- Resultados
  status VARCHAR(20) NOT NULL,                -- 'running', 'completed', 'failed', 'cancelled'
  total_modules INTEGER DEFAULT 0,
  modules_passed INTEGER DEFAULT 0,
  modules_failed INTEGER DEFAULT 0,
  total_tests INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Brain Integration
  brain_analysis JSONB,                       -- Análisis del Brain
  fixes_applied INTEGER DEFAULT 0,
  fixes_successful INTEGER DEFAULT 0,

  -- Detalles
  modules_details JSONB,                      -- Array de resultados por módulo
  error_summary TEXT,

  -- Metadata
  triggered_by VARCHAR(100),                  -- 'user:admin', 'auto-healing', 'cron'
  environment VARCHAR(50) DEFAULT 'local'     -- 'local', 'staging', 'production'
);

-- Índices
CREATE INDEX idx_synapse_exec_type ON synapse_execution_history(execution_type);
CREATE INDEX idx_synapse_exec_status ON synapse_execution_history(status);
CREATE INDEX idx_synapse_exec_started ON synapse_execution_history(started_at DESC);

COMMENT ON TABLE synapse_execution_history IS 'Historial completo de ejecuciones de SYNAPSE';

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

/**
 * Función: get_synapse_config
 * Obtener valor de configuración con fallback a default
 */
CREATE OR REPLACE FUNCTION get_synapse_config(
  p_config_key VARCHAR,
  p_fallback TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT value INTO v_value
  FROM synapse_config
  WHERE config_key = p_config_key;

  RETURN COALESCE(v_value, p_fallback);
END;
$$ LANGUAGE plpgsql;

/**
 * Función: update_synapse_config
 * Actualizar valor de configuración con auditoría
 */
CREATE OR REPLACE FUNCTION update_synapse_config(
  p_config_key VARCHAR,
  p_new_value TEXT,
  p_updated_by VARCHAR DEFAULT 'system'
)
RETURNS VOID AS $$
BEGIN
  UPDATE synapse_config
  SET
    value = p_new_value,
    updated_at = NOW(),
    updated_by = p_updated_by
  WHERE config_key = p_config_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config key % not found', p_config_key;
  END IF;
END;
$$ LANGUAGE plpgsql;

/**
 * Función: get_synapse_stats
 * Estadísticas globales de SYNAPSE
 */
CREATE OR REPLACE FUNCTION get_synapse_stats()
RETURNS TABLE(
  total_executions BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  total_modules_tested BIGINT,
  total_tests_run BIGINT,
  brain_fixes_applied BIGINT,
  last_execution_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    ROUND(
      (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100, 2
    ),
    ROUND(AVG(duration_ms), 0),
    SUM(total_modules)::BIGINT,
    SUM(total_tests)::BIGINT,
    SUM(fixes_applied)::BIGINT,
    MAX(started_at)
  FROM synapse_execution_history;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Documentación principal de SYNAPSE
INSERT INTO synapse_documentation (doc_key, title, category, content, summary, tags) VALUES
(
  'overview',
  'SYNAPSE - Sistema Completo de Testing Enterprise',
  'core',
  E'# SYNAPSE - Sistema Completo de Testing Enterprise\n\n**Versión**: 2.0.0\n**Fecha**: 2025-12-26\n\n## ¿Qué es SYNAPSE?\n\nSYNAPSE es el sistema unificado que conecta:\n\n1. **Playwright E2E Testing** (63 configs, 16 layers)\n2. **Brain Integration** (análisis automático de errores)\n3. **Sistema Nervioso** (coordinación entre componentes)\n4. **Auto-Healing** (ciclo automático: test → fix → re-test)\n\n## Componentes\n\n### Testing Core\n- ✅ **Playwright E2E**: 63 módulos con configs completos\n- ✅ **16 Layers**: chaos, SSOT, dependencies, performance, security\n- ✅ **Batch Runner**: Ejecuta todos los módulos secuencialmente\n\n### Brain Integration\n- ✅ **Brain**: Analiza errores, sugiere fixes\n- ✅ **Sistema Nervioso**: Coordina todo el ecosistema\n- ✅ **engineering-metadata.js**: Fuente única de verdad\n\n### Storage & APIs\n- ✅ **PostgreSQL**: audit_test_logs, synapse_*\n- ✅ **API REST**: /api/testing/*, /api/e2e-testing/*\n- ✅ **Frontend**: e2e-testing-control-v3-unified.js\n\n### Auto-Healing\n- ✅ **Ciclo automático**: Repara errores detectados\n- ✅ **Dashboard**: Interfaz de control\n\n## Uso\n\n### Comandos\n```bash\n# Batch completo (todos los módulos)\nnpm run test:synapse:batch\n\n# Módulo específico\nnpm run test:synapse -- users\n\n# Con Brain integration\nnpm run test:synapse:brain\n```\n\n### Dashboard\n- **URL**: http://localhost:9998/panel-administrativo.html#e2e-testing-control\n- **Auto-Healing**: http://localhost:9998/panel-empresa.html#auto-healing-dashboard\n\n## Archivos Core\n\n- **Configs**: tests/e2e/configs/*.config.js (63 archivos)\n- **Runner**: tests/e2e/run-batch-tests.js\n- **Brain**: src/brain/services/BrainNervousSystem.js\n- **API**: src/routes/testingRoutes.js\n- **Frontend**: public/js/modules/e2e-testing-control-v3-unified.js',
  'SYNAPSE es el nombre unificado del sistema completo de testing enterprise que incluye Playwright E2E, Brain, Sistema Nervioso y Auto-Healing.',
  ARRAY['testing', 'playwright', 'e2e', 'brain', 'auto-healing']
),
(
  'quickstart',
  'SYNAPSE - Inicio Rápido',
  'core',
  E'# SYNAPSE - Inicio Rápido\n\n## Ejecutar batch completo\n\n```bash\ncd backend/tests/e2e\nnode run-batch-tests.js\n```\n\n## Ver resultados\n\n```bash\ncat tests/e2e/results/batch-test-results.json\n```\n\n## Dashboard web\n\nhttp://localhost:9998/panel-administrativo.html#e2e-testing-control',
  'Guía rápida para ejecutar SYNAPSE',
  ARRAY['quickstart', 'tutorial']
);

-- Configuraciones iniciales de SYNAPSE
INSERT INTO synapse_config (config_key, config_group, value_type, value, default_value, description, validation_rules) VALUES
('batch.hard_timeout', 'batch', 'number', '900000', '900000', 'Timeout máximo por módulo en batch (ms)', '{"min": 60000, "max": 3600000}'),
('batch.parallel_enabled', 'batch', 'boolean', 'false', 'false', 'Ejecutar tests en paralelo (experimental)', NULL),
('brain.enabled', 'brain', 'boolean', 'true', 'true', 'Habilitar integración con Brain', NULL),
('brain.auto_fix', 'brain', 'boolean', 'false', 'false', 'Aplicar fixes automáticamente sin confirmación', NULL),
('chaos.enabled', 'chaos', 'boolean', 'true', 'true', 'Habilitar Chaos Testing', NULL),
('chaos.monkey_duration', 'chaos', 'number', '20000', '20000', 'Duración de Chaos Monkey (ms)', '{"min": 5000, "max": 60000}'),
('performance.page_load_threshold', 'performance', 'number', '3000', '3000', 'Threshold para carga de página (ms)', '{"min": 1000, "max": 10000}'),
('performance.api_response_threshold', 'performance', 'number', '1000', '1000', 'Threshold para respuesta API (ms)', '{"min": 100, "max": 5000}');

-- Preset por defecto
INSERT INTO synapse_test_presets (preset_name, description, config, is_default) VALUES
(
  'full-regression',
  'Batería completa de tests con todas las capas habilitadas',
  '{
    "selectedTests": ["navigation", "crud", "performance", "chaos", "dependencies", "ssot", "brain"],
    "selectedModules": ["all"],
    "brainIntegration": true,
    "chaosEnabled": true,
    "maxDuration": 900000,
    "performanceThresholds": {
      "pageLoad": 3000,
      "apiResponse": 1000
    }
  }'::jsonb,
  true
);

-- ============================================================================
-- GRANTS
-- ============================================================================
-- Ajustar según tus usuarios de BD
-- GRANT SELECT, INSERT, UPDATE ON synapse_documentation TO backend_user;
-- GRANT SELECT, INSERT, UPDATE ON synapse_config TO backend_user;
-- GRANT ALL ON synapse_test_presets TO backend_user;
-- GRANT ALL ON synapse_execution_history TO backend_user;

COMMIT;
