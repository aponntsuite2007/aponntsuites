-- ════════════════════════════════════════════════════════════════
-- MIGRACIÓN: SISTEMA AUTO-EVOLUTIVO DE APRENDIZAJE DEL AUDITOR
-- Fecha: 2025-10-26
-- Propósito: Crear tablas para almacenar conocimiento aprendido de tests
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- TABLA 1: auditor_knowledge_base
-- Almacena TODO el conocimiento aprendido (patrones, estrategias, behaviors)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS auditor_knowledge_base (
  id SERIAL PRIMARY KEY,

  -- Tipo de conocimiento
  knowledge_type VARCHAR(50) NOT NULL CHECK (
    knowledge_type IN (
      'error_pattern',      -- Patrones de errores descubiertos
      'module_behavior',    -- Comportamientos de módulos
      'repair_strategy',    -- Estrategias de reparación
      'edge_case',          -- Casos límite
      'performance_insight' -- Insights de performance
    )
  ),

  -- Clave única para el conocimiento
  -- Formato: "error_pattern:TypeError:undefined_property"
  --          "module_behavior:users"
  --          "repair_strategy:missing_import"
  key VARCHAR(255) UNIQUE NOT NULL,

  -- Datos del conocimiento (JSON flexible)
  data JSONB NOT NULL,

  -- Score de confianza (0.0 a 1.0)
  -- 0.3 = baja (1 ocurrencia), 0.6 = media (3+), 0.9 = alta (5+)
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.30 CHECK (
    confidence_score >= 0.00 AND confidence_score <= 1.00
  ),

  -- Número de veces que se ha confirmado este conocimiento
  occurrences INT NOT NULL DEFAULT 1,

  -- Tasa de éxito (solo para repair_strategy)
  -- Ejemplo: 0.85 = 85% de éxito al aplicar esta estrategia
  success_rate DECIMAL(3,2) DEFAULT NULL CHECK (
    success_rate IS NULL OR (success_rate >= 0.00 AND success_rate <= 1.00)
  ),

  -- Timestamps
  first_discovered TIMESTAMP NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Tags para búsqueda rápida
  -- Ejemplo: ['TypeError', 'critical', 'users']
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Prioridad (critical, high, medium, low)
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('critical', 'high', 'medium', 'low')
  ),

  -- Estado (active, archived, deprecated)
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'archived', 'deprecated')
  )
);

-- Índices para búsqueda rápida
CREATE INDEX idx_kb_knowledge_type ON auditor_knowledge_base(knowledge_type);
CREATE INDEX idx_kb_confidence ON auditor_knowledge_base(confidence_score DESC);
CREATE INDEX idx_kb_key ON auditor_knowledge_base(key);
CREATE INDEX idx_kb_tags ON auditor_knowledge_base USING GIN(tags);
CREATE INDEX idx_kb_status ON auditor_knowledge_base(status);
CREATE INDEX idx_kb_priority ON auditor_knowledge_base(priority);

-- Índice compuesto para query más común: obtener patrones de alta confianza
CREATE INDEX idx_kb_type_confidence ON auditor_knowledge_base(knowledge_type, confidence_score DESC)
WHERE status = 'active';

COMMENT ON TABLE auditor_knowledge_base IS 'Almacén central de conocimiento aprendido por el auditor';
COMMENT ON COLUMN auditor_knowledge_base.confidence_score IS 'Confianza graduada: 0.3 (baja) → 0.6 (media) → 0.9 (alta)';
COMMENT ON COLUMN auditor_knowledge_base.success_rate IS 'Tasa de éxito para repair_strategy (NULL para otros tipos)';

-- ═══════════════════════════════════════════════════════════════
-- TABLA 2: auditor_learning_history
-- Historial cronológico de TODO lo que aprende el sistema
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS auditor_learning_history (
  id SERIAL PRIMARY KEY,

  -- Acción realizada
  action VARCHAR(100) NOT NULL CHECK (
    action IN (
      'record_error_pattern',
      'record_module_behavior',
      'record_repair_strategy',
      'update_confidence',
      'create_suggestion'
    )
  ),

  -- Clave del conocimiento afectado (puede ser NULL para acciones globales)
  knowledge_key VARCHAR(255),

  -- Detalles de la acción (JSON flexible)
  details JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_history_action ON auditor_learning_history(action);
CREATE INDEX idx_history_knowledge_key ON auditor_learning_history(knowledge_key);
CREATE INDEX idx_history_created_at ON auditor_learning_history(created_at DESC);

COMMENT ON TABLE auditor_learning_history IS 'Historial cronológico de aprendizaje del sistema';
COMMENT ON COLUMN auditor_learning_history.details IS 'Detalles flexibles de la acción (patrones, resultados, etc.)';

-- ═══════════════════════════════════════════════════════════════
-- TABLA 3: auditor_suggestions
-- Sugerencias que requieren revisión manual antes de auto-aplicar
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS auditor_suggestions (
  id SERIAL PRIMARY KEY,

  -- Tipo de sugerencia
  suggestion_type VARCHAR(50) NOT NULL CHECK (
    suggestion_type IN (
      'improvement',           -- Mejora general
      'new_pattern',           -- Nuevo patrón detectado (requiere validación)
      'edge_case_test',        -- Agregar test para edge case
      'failed_repair',         -- Reparación falló (requiere intervención)
      'strategy_improvement'   -- Mejorar estrategia existente
    )
  ),

  -- Clave del conocimiento relacionado (puede ser NULL)
  knowledge_key VARCHAR(255),

  -- Título de la sugerencia
  title VARCHAR(255) NOT NULL,

  -- Descripción detallada
  description TEXT NOT NULL,

  -- Ejemplo de código (JSON: { test_code, fix_code, etc. })
  code_example JSONB DEFAULT NULL,

  -- Prioridad
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('critical', 'high', 'medium', 'low')
  ),

  -- Estado (pending, reviewed, accepted, rejected, implemented)
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'accepted', 'rejected', 'implemented')
  ),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP DEFAULT NULL,
  implemented_at TIMESTAMP DEFAULT NULL,

  -- Notas de revisión
  review_notes TEXT DEFAULT NULL
);

-- Índices
CREATE INDEX idx_suggestions_type ON auditor_suggestions(suggestion_type);
CREATE INDEX idx_suggestions_status ON auditor_suggestions(status);
CREATE INDEX idx_suggestions_priority ON auditor_suggestions(priority);
CREATE INDEX idx_suggestions_created_at ON auditor_suggestions(created_at DESC);

COMMENT ON TABLE auditor_suggestions IS 'Sugerencias de mejora que requieren revisión manual';
COMMENT ON COLUMN auditor_suggestions.code_example IS 'Ejemplos de código/tests sugeridos';

-- ═══════════════════════════════════════════════════════════════
-- FUNCIONES HELPER PARA CONSULTAS COMUNES
-- ═══════════════════════════════════════════════════════════════

-- Función: Obtener patrones de error por confianza mínima
CREATE OR REPLACE FUNCTION get_error_patterns_by_confidence(min_confidence DECIMAL DEFAULT 0.5)
RETURNS TABLE (
  key VARCHAR,
  data JSONB,
  confidence_score DECIMAL,
  occurrences INT,
  priority VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.key,
    kb.data,
    kb.confidence_score,
    kb.occurrences,
    kb.priority
  FROM auditor_knowledge_base kb
  WHERE kb.knowledge_type = 'error_pattern'
    AND kb.confidence_score >= min_confidence
    AND kb.status = 'active'
  ORDER BY kb.confidence_score DESC, kb.occurrences DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_error_patterns_by_confidence IS 'Obtiene patrones de error con confianza >= min_confidence';

-- Función: Obtener estrategias de reparación filtradas
CREATE OR REPLACE FUNCTION get_repair_strategies(error_type_filter VARCHAR DEFAULT NULL)
RETURNS TABLE (
  key VARCHAR,
  data JSONB,
  success_rate DECIMAL,
  confidence_score DECIMAL,
  occurrences INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.key,
    kb.data,
    kb.success_rate,
    kb.confidence_score,
    kb.occurrences
  FROM auditor_knowledge_base kb
  WHERE kb.knowledge_type = 'repair_strategy'
    AND kb.status = 'active'
    AND (error_type_filter IS NULL OR kb.key LIKE '%' || error_type_filter || '%')
  ORDER BY kb.success_rate DESC NULLS LAST, kb.confidence_score DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_repair_strategies IS 'Obtiene estrategias de reparación ordenadas por success_rate';

-- Función: Actualizar confidence score basado en éxito/fallo
CREATE OR REPLACE FUNCTION update_confidence_score(
  knowledge_key VARCHAR,
  was_successful BOOLEAN
)
RETURNS DECIMAL AS $$
DECLARE
  new_confidence DECIMAL;
  current_confidence DECIMAL;
  current_occurrences INT;
BEGIN
  -- Obtener valores actuales
  SELECT confidence_score, occurrences
  INTO current_confidence, current_occurrences
  FROM auditor_knowledge_base
  WHERE key = knowledge_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Knowledge key not found: %', knowledge_key;
  END IF;

  -- Calcular nueva confianza
  IF was_successful THEN
    new_confidence := LEAST(current_confidence + 0.1, 1.0);
  ELSE
    new_confidence := GREATEST(current_confidence - 0.05, 0.0);
  END IF;

  -- Actualizar
  UPDATE auditor_knowledge_base
  SET
    confidence_score = new_confidence,
    occurrences = occurrences + 1,
    last_updated = NOW()
  WHERE key = knowledge_key;

  RETURN new_confidence;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_confidence_score IS 'Actualiza confidence_score basado en resultado (éxito incrementa, fallo decrementa)';

-- ═══════════════════════════════════════════════════════════════
-- DATOS SEMILLA (SEED DATA)
-- Algunos patrones de error comunes para empezar
-- ═══════════════════════════════════════════════════════════════

-- Patrón: Dynamic module loading failure (ya descubierto en tests anteriores)
INSERT INTO auditor_knowledge_base (
  knowledge_type,
  key,
  data,
  confidence_score,
  occurrences,
  tags,
  priority,
  status
) VALUES (
  'error_pattern',
  'error_pattern:dynamic_loading:module_not_loaded',
  '{
    "type": "dynamic_loading_error",
    "category": "module-loading-error",
    "message": "Module not loaded before test execution",
    "severity": "medium",
    "canAutoFix": true,
    "suggestedFix": "Call loadModuleContent() and await completion before testing"
  }'::jsonb,
  0.90,  -- Alta confianza (ya confirmado en múltiples tests)
  5,     -- Confirmado 5 veces
  ARRAY['dynamic_loading', 'medium', 'all_modules'],
  'medium',
  'active'
) ON CONFLICT (key) DO NOTHING;

-- Estrategia: Fix dynamic loading
INSERT INTO auditor_knowledge_base (
  knowledge_type,
  key,
  data,
  confidence_score,
  occurrences,
  success_rate,
  tags,
  priority,
  status
) VALUES (
  'repair_strategy',
  'repair_strategy:dynamic_loading_fix',
  '{
    "strategy": "await_module_load",
    "total_attempts": 1,
    "successes": 1,
    "failures": 0,
    "last_result": {
      "success": true,
      "fix": "Added await loadModuleContent() before test"
    }
  }'::jsonb,
  0.60,  -- Confianza media (aplicada pocas veces aún)
  1,
  1.00,  -- 100% éxito hasta ahora
  ARRAY['dynamic_loading', 'auto_fix'],
  'high',
  'active'
) ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- RESUMEN DE LA MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA - Sistema Auto-Evolutivo Creado';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Tablas creadas:';
  RAISE NOTICE '  1. auditor_knowledge_base - Almacén de conocimiento';
  RAISE NOTICE '  2. auditor_learning_history - Historial de aprendizaje';
  RAISE NOTICE '  3. auditor_suggestions - Sugerencias para revisión';
  RAISE NOTICE '';
  RAISE NOTICE 'Funciones helper creadas:';
  RAISE NOTICE '  • get_error_patterns_by_confidence(min_confidence)';
  RAISE NOTICE '  • get_repair_strategies(error_type_filter)';
  RAISE NOTICE '  • update_confidence_score(key, was_successful)';
  RAISE NOTICE '';
  RAISE NOTICE 'Datos semilla insertados:';
  RAISE NOTICE '  • 1 patrón de error (dynamic loading)';
  RAISE NOTICE '  • 1 estrategia de reparación (await module load)';
  RAISE NOTICE '';
  RAISE NOTICE 'Sistema listo para comenzar a aprender! 🧠';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;
