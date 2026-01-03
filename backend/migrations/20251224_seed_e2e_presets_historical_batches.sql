-- ═══════════════════════════════════════════════════════════
-- SEED DATA: Presets Históricos (Batch #1-#10+)
-- Fecha: 2025-12-24
-- Objetivo: Migrar batches históricos como presets ejecutables
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- PRESET 1: Batch #10 - Full Validation (MEJORAS #23+#24)
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags,
  times_executed,
  avg_duration,
  last_result
)
VALUES (
  'Batch #10 - Full Validation',
  '29 módulos completos con MEJORAS #23+#24 aplicadas. Fix completo de attendance (isActive → is_active, id → user_id). Companies con skip CHAOS/DEPENDENCY.',
  '{
    "selectedTests": ["setup", "chaos", "dependency", "ssot", "brain"],
    "selectedModules": [
      "admin-consent-management", "associate-marketplace", "associate-workflow-panel",
      "attendance", "auto-healing-dashboard", "biometric-consent", "companies",
      "company-account", "company-email-process", "configurador-modulos", "dashboard",
      "database-sync", "deploy-manager-3stages", "deployment-sync", "dms-dashboard",
      "engineering-dashboard", "hours-cube-dashboard", "inbox", "mi-espacio",
      "notification-center", "organizational-structure", "partner-scoring-system",
      "partners", "phase4-integrated-manager", "roles-permissions",
      "testing-metrics-dashboard", "user-support", "users", "vendors"
    ],
    "executionConfig": {
      "parallel": false,
      "timeout": 300000,
      "retries": 3,
      "brainIntegration": true,
      "hardTimeout": 900000
    }
  }'::JSONB,
  ARRAY['full', 'validation', 'production', 'mejoras-23-24'],
  1,
  7800000,
  '{"total": 29, "passed": 28, "failed": 1, "rate": 96.5, "topFailures": ["companies"], "improvements": ["#23", "#24"]}'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  last_result = EXCLUDED.last_result;

-- ═══════════════════════════════════════════════════════════
-- PRESET 2: Batch #9 - Con MEJORA #22
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags,
  times_executed,
  avg_duration,
  last_result
)
VALUES (
  'Batch #9 - Con MEJORA #22',
  '29 módulos con MEJORA #22 (skip CHAOS/DEPENDENCY para companies). Attendance 4/5 passing (sin #23+#24).',
  '{
    "selectedTests": ["setup", "chaos", "dependency", "ssot", "brain"],
    "selectedModules": [
      "admin-consent-management", "associate-marketplace", "associate-workflow-panel",
      "attendance", "auto-healing-dashboard", "biometric-consent", "companies",
      "company-account", "company-email-process", "configurador-modulos", "dashboard",
      "database-sync", "deploy-manager-3stages", "deployment-sync", "dms-dashboard",
      "engineering-dashboard", "hours-cube-dashboard", "inbox", "mi-espacio",
      "notification-center", "organizational-structure", "partner-scoring-system",
      "partners", "phase4-integrated-manager", "roles-permissions",
      "testing-metrics-dashboard", "user-support", "users", "vendors"
    ],
    "executionConfig": {
      "parallel": false,
      "timeout": 300000,
      "retries": 3,
      "brainIntegration": true
    }
  }'::JSONB,
  ARRAY['full', 'validation', 'mejora-22'],
  1,
  7560000,
  '{"total": 29, "passed": 27, "failed": 2, "rate": 93.1, "topFailures": ["attendance", "companies"], "improvements": ["#22"]}'::JSONB
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PRESET 3: Batch #7 - 27/29 PASSED
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags,
  times_executed,
  avg_duration,
  last_result
)
VALUES (
  'Batch #7 - MEJORAS #1-#20',
  '29 módulos con todas las mejoras #1-#20. Primer batch en alcanzar 93.1% success rate.',
  '{
    "selectedTests": ["setup", "chaos", "dependency", "ssot", "brain"],
    "selectedModules": [
      "admin-consent-management", "associate-marketplace", "associate-workflow-panel",
      "attendance", "auto-healing-dashboard", "biometric-consent", "companies",
      "company-account", "company-email-process", "configurador-modulos", "dashboard",
      "database-sync", "deploy-manager-3stages", "deployment-sync", "dms-dashboard",
      "engineering-dashboard", "hours-cube-dashboard", "inbox", "mi-espacio",
      "notification-center", "organizational-structure", "partner-scoring-system",
      "partners", "phase4-integrated-manager", "roles-permissions",
      "testing-metrics-dashboard", "user-support", "users", "vendors"
    ],
    "executionConfig": {
      "parallel": false,
      "timeout": 300000,
      "retries": 3,
      "brainIntegration": true
    }
  }'::JSONB,
  ARRAY['full', 'mejoras-1-20', 'milestone'],
  1,
  7200000,
  '{"total": 29, "passed": 27, "failed": 2, "rate": 93.1}'::JSONB
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PRESET 4: Critical Only - 2 Módulos
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags
)
VALUES (
  'Critical Only - Attendance + Companies',
  'Testing rápido de los 2 módulos que históricamente tuvieron problemas. Útil para debugging.',
  '{
    "selectedTests": ["setup", "chaos", "ssot", "brain"],
    "selectedModules": ["attendance", "companies"],
    "executionConfig": {
      "parallel": false,
      "timeout": 300000,
      "retries": 3,
      "brainIntegration": true
    }
  }'::JSONB,
  ARRAY['critical', 'debug', 'quick']
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PRESET 5: Quick Smoke - SSOT Only
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags
)
VALUES (
  'Quick Smoke - SSOT Only',
  'Testing rápido de integridad de datos (SSOT) en todos los 29 módulos. ~30 minutos.',
  '{
    "selectedTests": ["ssot"],
    "selectedModules": [
      "admin-consent-management", "associate-marketplace", "associate-workflow-panel",
      "attendance", "auto-healing-dashboard", "biometric-consent", "companies",
      "company-account", "company-email-process", "configurador-modulos", "dashboard",
      "database-sync", "deploy-manager-3stages", "deployment-sync", "dms-dashboard",
      "engineering-dashboard", "hours-cube-dashboard", "inbox", "mi-espacio",
      "notification-center", "organizational-structure", "partner-scoring-system",
      "partners", "phase4-integrated-manager", "roles-permissions",
      "testing-metrics-dashboard", "user-support", "users", "vendors"
    ],
    "executionConfig": {
      "parallel": true,
      "maxParallel": 3,
      "timeout": 180000,
      "retries": 1,
      "brainIntegration": false
    }
  }'::JSONB,
  ARRAY['quick', 'smoke', 'data-integrity']
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PRESET 6: Security CHAOS - All Modules
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags
)
VALUES (
  'Security CHAOS - All Modules',
  'Testing de seguridad CHAOS en todos los módulos. XSS, SQL Injection, Race Conditions, Memory Leaks. ~3 horas.',
  '{
    "selectedTests": ["chaos"],
    "selectedModules": [
      "admin-consent-management", "associate-marketplace", "associate-workflow-panel",
      "attendance", "auto-healing-dashboard", "biometric-consent", "companies",
      "company-account", "company-email-process", "configurador-modulos", "dashboard",
      "database-sync", "deploy-manager-3stages", "deployment-sync", "dms-dashboard",
      "engineering-dashboard", "hours-cube-dashboard", "inbox", "mi-espacio",
      "notification-center", "organizational-structure", "partner-scoring-system",
      "partners", "phase4-integrated-manager", "roles-permissions",
      "testing-metrics-dashboard", "user-support", "users", "vendors"
    ],
    "executionConfig": {
      "parallel": true,
      "maxParallel": 3,
      "timeout": 300000,
      "retries": 0,
      "brainIntegration": true
    }
  }'::JSONB,
  ARRAY['security', 'chaos', 'penetration']
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PRESET 7: RRHH Module Suite
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags
)
VALUES (
  'RRHH Module Suite - Full Tests',
  'Testing completo de todos los módulos de RRHH: payroll, vacations, attendance, hours, organizational structure.',
  '{
    "selectedTests": ["setup", "chaos", "dependency", "ssot", "brain"],
    "selectedModules": [
      "attendance",
      "hours-cube-dashboard",
      "organizational-structure",
      "users",
      "departments"
    ],
    "executionConfig": {
      "parallel": false,
      "timeout": 300000,
      "retries": 3,
      "brainIntegration": true
    }
  }'::JSONB,
  ARRAY['rrhh', 'suite', 'functional']
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PRESET 8: Core Modules Only
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags
)
VALUES (
  'Core Modules - Essential 5',
  'Testing de los 5 módulos core esenciales del sistema: users, companies, attendance, departments, roles.',
  '{
    "selectedTests": ["setup", "chaos", "dependency", "ssot", "brain"],
    "selectedModules": [
      "users",
      "companies",
      "attendance",
      "departments",
      "roles-permissions"
    ],
    "executionConfig": {
      "parallel": false,
      "timeout": 300000,
      "retries": 3,
      "brainIntegration": true
    }
  }'::JSONB,
  ARRAY['core', 'essential', 'foundation']
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PRESET 9: Performance Stress Test
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags
)
VALUES (
  'Performance Stress Test',
  'Testing de performance y stress en módulos críticos. Solo CHAOS con 100+ iteraciones.',
  '{
    "selectedTests": ["chaos"],
    "selectedModules": [
      "users",
      "attendance",
      "payroll-liquidation",
      "notification-center",
      "hours-cube-dashboard"
    ],
    "executionConfig": {
      "parallel": true,
      "maxParallel": 2,
      "timeout": 600000,
      "retries": 0,
      "brainIntegration": false,
      "chaosIterations": 100
    }
  }'::JSONB,
  ARRAY['performance', 'stress', 'load']
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PRESET 10: Regression Test Suite
-- ═══════════════════════════════════════════════════════════

INSERT INTO e2e_test_presets (
  name,
  description,
  config,
  tags
)
VALUES (
  'Regression Test Suite',
  'Suite de regresión: testing completo de módulos que históricamente tuvieron fixes aplicados.',
  '{
    "selectedTests": ["setup", "chaos", "dependency", "ssot", "brain"],
    "selectedModules": [
      "attendance",
      "companies",
      "partners",
      "users",
      "associate-workflow-panel",
      "deploy-manager-3stages"
    ],
    "executionConfig": {
      "parallel": false,
      "timeout": 300000,
      "retries": 3,
      "brainIntegration": true
    }
  }'::JSONB,
  ARRAY['regression', 'qa', 'validation']
)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- COMENTARIOS Y VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════

-- Verificar presets insertados
SELECT
  id,
  name,
  array_length(tags, 1) as num_tags,
  jsonb_array_length(config->'selectedModules') as num_modules,
  jsonb_array_length(config->'selectedTests') as num_tests,
  CASE
    WHEN last_result IS NOT NULL THEN (last_result->>'rate')::NUMERIC
    ELSE NULL
  END as last_success_rate
FROM e2e_test_presets
ORDER BY id;

SELECT 'Seed de presets históricos completado exitosamente. 10 presets insertados.' AS status;
