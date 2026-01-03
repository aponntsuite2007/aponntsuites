-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: E2E Testing Advanced System - Tablas Completas
-- Fecha: 2025-12-24
-- Objetivo: Soportar sistema de testing E2E avanzado parametrizable
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- TABLA 1: e2e_test_presets
-- Almacena configuraciones guardadas de tests (ej: Batch #10)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS e2e_test_presets (
  id SERIAL PRIMARY KEY,

  -- Información básica
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Configuración del preset (JSON flexible)
  config JSONB NOT NULL,
  -- Ejemplo de config:
  -- {
  --   "selectedTests": ["setup", "chaos", "ssot", "dependency", "brain"],
  --   "selectedModules": ["users", "attendance", "companies", ...],
  --   "executionConfig": {
  --     "parallel": true,
  --     "maxParallel": 3,
  --     "timeout": 300000,
  --     "retries": 3,
  --     "brainIntegration": true
  --   }
  -- }

  -- Tags para filtrado
  tags TEXT[], -- ['full', 'validation', 'security', 'critical']

  -- Metadata de creación
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Estadísticas de uso
  times_executed INTEGER DEFAULT 0,
  avg_duration INTEGER, -- milisegundos
  last_executed_at TIMESTAMP,

  -- Último resultado guardado
  last_result JSONB,
  -- Ejemplo:
  -- {
  --   "total": 29,
  --   "passed": 28,
  --   "failed": 1,
  --   "rate": 96.5,
  --   "topFailures": ["companies"]
  -- }

  -- Soft delete
  is_active BOOLEAN DEFAULT true,

  -- Constraints
  CONSTRAINT unique_preset_name UNIQUE(name)
);

-- Índices para performance
CREATE INDEX idx_e2e_presets_tags ON e2e_test_presets USING GIN(tags);
CREATE INDEX idx_e2e_presets_created_by ON e2e_test_presets(created_by);
CREATE INDEX idx_e2e_presets_last_executed ON e2e_test_presets(last_executed_at DESC);

-- ═══════════════════════════════════════════════════════════
-- TABLA 2: e2e_test_flows
-- Almacena flujos de negocio completos (circuitos E2E)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS e2e_test_flows (
  id SERIAL PRIMARY KEY,

  -- Información básica
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Steps del flow (secuencia de acciones)
  steps JSONB NOT NULL,
  -- Ejemplo:
  -- [
  --   {
  --     "order": 1,
  --     "module": "users",
  --     "action": "create",
  --     "testType": "crud",
  --     "description": "Crear usuario de prueba"
  --   },
  --   {
  --     "order": 2,
  --     "module": "departments",
  --     "action": "assign",
  --     "testType": "integration",
  --     "description": "Asignar usuario a departamento",
  --     "dependsOn": [1]
  --   }
  -- ]

  -- Dependencias entre módulos
  dependencies TEXT[], -- ['users', 'departments', 'roles-permissions']

  -- Categorización
  category VARCHAR(50), -- 'onboarding', 'payroll', 'security', 'integration'

  -- Estimaciones
  estimated_duration INTEGER, -- milisegundos

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,

  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_predefined BOOLEAN DEFAULT false, -- System-defined flows vs user-created

  -- Estadísticas
  times_executed INTEGER DEFAULT 0,
  avg_actual_duration INTEGER,
  last_executed_at TIMESTAMP,
  success_rate DECIMAL(5,2), -- 0-100

  CONSTRAINT unique_flow_name UNIQUE(name)
);

-- Índices
CREATE INDEX idx_e2e_flows_category ON e2e_test_flows(category);
CREATE INDEX idx_e2e_flows_dependencies ON e2e_test_flows USING GIN(dependencies);
CREATE INDEX idx_e2e_flows_is_predefined ON e2e_test_flows(is_predefined);

-- ═══════════════════════════════════════════════════════════
-- TABLA 3: e2e_test_executions
-- Historial de todas las ejecuciones de tests
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS e2e_test_executions (
  id VARCHAR(50) PRIMARY KEY, -- Format: exec_1735064400000 (timestamp)

  -- Referencias
  preset_id INTEGER REFERENCES e2e_test_presets(id) ON DELETE SET NULL,
  flow_id INTEGER REFERENCES e2e_test_flows(id) ON DELETE SET NULL,

  -- Modo de ejecución
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('matrix', 'preset', 'flow')),

  -- Configuración usada (snapshot)
  config JSONB NOT NULL,

  -- Tiempos
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration INTEGER, -- milisegundos (completed_at - started_at)

  -- Resultados agregados
  summary JSONB,
  -- Ejemplo:
  -- {
  --   "total": 29,
  --   "passed": 28,
  --   "failed": 1,
  --   "warnings": 0,
  --   "rate": 96.5
  -- }

  -- Resultados detallados por módulo
  results JSONB,
  -- Ejemplo:
  -- {
  --   "users": {
  --     "total": 5,
  --     "passed": 5,
  --     "duration": 4200,
  --     "tests": {
  --       "setup": {"status": "passed", "duration": 200},
  --       "chaos": {"status": "passed", "duration": 2800}
  --     }
  --   },
  --   "attendance": {
  --     "total": 5,
  --     "passed": 5,
  --     "duration": 9800,
  --     "improvements": ["#23", "#24"]
  --   }
  -- }

  -- Mejoras aplicadas en esta ejecución
  improvements TEXT[], -- ['#23', '#24']

  -- Estado de ejecución
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),

  -- Metadata
  executed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  notes TEXT, -- Notas del usuario

  -- Errores (si status = failed)
  error JSONB,

  -- WebSocket channel para live updates
  websocket_channel VARCHAR(100)
);

-- Índices
CREATE INDEX idx_e2e_executions_preset ON e2e_test_executions(preset_id);
CREATE INDEX idx_e2e_executions_flow ON e2e_test_executions(flow_id);
CREATE INDEX idx_e2e_executions_mode ON e2e_test_executions(mode);
CREATE INDEX idx_e2e_executions_started ON e2e_test_executions(started_at DESC);
CREATE INDEX idx_e2e_executions_status ON e2e_test_executions(status);
CREATE INDEX idx_e2e_executions_executed_by ON e2e_test_executions(executed_by);

-- ═══════════════════════════════════════════════════════════
-- FUNCIONES HELPER
-- ═══════════════════════════════════════════════════════════

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_e2e_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trg_e2e_presets_updated_at
BEFORE UPDATE ON e2e_test_presets
FOR EACH ROW EXECUTE FUNCTION update_e2e_updated_at();

CREATE TRIGGER trg_e2e_flows_updated_at
BEFORE UPDATE ON e2e_test_flows
FOR EACH ROW EXECUTE FUNCTION update_e2e_updated_at();

-- Función para calcular success_rate de flows
CREATE OR REPLACE FUNCTION calculate_flow_success_rate(flow_id_param INTEGER)
RETURNS DECIMAL AS $$
DECLARE
  total_executions INTEGER;
  successful_executions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_executions
  FROM e2e_test_executions
  WHERE flow_id = flow_id_param AND status = 'completed';

  IF total_executions = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO successful_executions
  FROM e2e_test_executions
  WHERE flow_id = flow_id_param
    AND status = 'completed'
    AND (summary->>'failed')::INTEGER = 0;

  RETURN ROUND((successful_executions::DECIMAL / total_executions) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- SEED DATA: Flows Predefinidos
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_flows (name, description, steps, dependencies, category, estimated_duration, is_predefined)
VALUES
(
  'Onboarding Empleado Completo',
  'Flow completo desde creación de usuario hasta primera asistencia',
  '[
    {"order": 1, "module": "users", "action": "create", "testType": "crud", "description": "Crear usuario de prueba"},
    {"order": 2, "module": "departments", "action": "assign", "testType": "integration", "description": "Asignar a departamento", "dependsOn": [1]},
    {"order": 3, "module": "roles-permissions", "action": "assign", "testType": "integration", "description": "Asignar rol", "dependsOn": [1]},
    {"order": 4, "module": "biometric-consent", "action": "register", "testType": "crud", "description": "Registrar consentimiento biométrico", "dependsOn": [1]},
    {"order": 5, "module": "attendance", "action": "create-first", "testType": "crud", "description": "Registrar primera asistencia", "dependsOn": [1, 2]}
  ]'::JSONB,
  ARRAY['users', 'departments', 'roles-permissions', 'biometric-consent', 'attendance'],
  'onboarding',
  8000,
  true
),
(
  'Ciclo de Nómina Completo',
  'Desde cálculo de horas hasta generación de recibos',
  '[
    {"order": 1, "module": "hours-cube-dashboard", "action": "calculate", "testType": "integration", "description": "Calcular horas trabajadas del mes"},
    {"order": 2, "module": "payroll-liquidation", "action": "generate", "testType": "integration", "description": "Generar liquidación", "dependsOn": [1]},
    {"order": 3, "module": "payroll-liquidation", "action": "approve", "testType": "integration", "description": "Aprobar nómina", "dependsOn": [2]},
    {"order": 4, "module": "notification-center", "action": "send", "testType": "integration", "description": "Notificar a empleados", "dependsOn": [3]}
  ]'::JSONB,
  ARRAY['hours-cube-dashboard', 'payroll-liquidation', 'notification-center'],
  'payroll',
  12000,
  true
),
(
  'Security Audit Completo',
  'Tests de seguridad en todos los módulos críticos',
  '[
    {"order": 1, "module": "all-core", "action": "xss-injection", "testType": "security", "description": "XSS Injection en 29 módulos"},
    {"order": 2, "module": "all-core", "action": "sql-injection", "testType": "security", "description": "SQL Injection en 29 módulos"},
    {"order": 3, "module": "all-core", "action": "csrf-protection", "testType": "security", "description": "Verificar CSRF tokens"},
    {"order": 4, "module": "all-core", "action": "auth-bypass", "testType": "security", "description": "Intentos de bypass de autenticación"}
  ]'::JSONB,
  ARRAY['all'],
  'security',
  180000,
  true
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- COMENTARIOS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE e2e_test_presets IS 'Configuraciones guardadas de tests E2E (ej: Batch #10 completo)';
COMMENT ON TABLE e2e_test_flows IS 'Flujos de negocio completos que abarcan múltiples módulos';
COMMENT ON TABLE e2e_test_executions IS 'Historial completo de todas las ejecuciones de tests E2E';

COMMENT ON COLUMN e2e_test_presets.config IS 'Configuración JSON: selectedTests, selectedModules, executionConfig';
COMMENT ON COLUMN e2e_test_flows.steps IS 'Array JSON de steps ordenados con dependencias entre ellos';
COMMENT ON COLUMN e2e_test_executions.mode IS 'Modo de ejecución: matrix (granular), preset (configuración guardada), flow (circuito completo)';
COMMENT ON COLUMN e2e_test_executions.improvements IS 'Lista de mejoras aplicadas en esta ejecución (ej: #23, #24)';

-- ═══════════════════════════════════════════════════════════
-- FIN DE MIGRACIÓN
-- ═══════════════════════════════════════════════════════════

SELECT 'Migración E2E Testing Advanced System completada exitosamente' AS status;
