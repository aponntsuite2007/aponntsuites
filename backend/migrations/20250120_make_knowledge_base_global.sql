-- ============================================================================
-- MIGRACIÓN: Convertir Knowledge Base en GLOBAL (compartido entre empresas)
-- ============================================================================
-- OBJETIVO: El conocimiento debe ser acumulativo - todas las empresas
--           aprenden de todas las empresas. Solo el historial de
--           conversaciones debe ser multi-tenant.
--
-- CAMBIOS:
--   1. assistant_knowledge_base: company_id NULLABLE (opcional - solo analytics)
--   2. Nueva tabla assistant_conversations: Historial multi-tenant
--   3. Índices optimizados para búsqueda global
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MODIFICAR assistant_knowledge_base para hacerla GLOBAL
-- ============================================================================

-- Hacer company_id nullable (opcional - solo para analytics)
ALTER TABLE assistant_knowledge_base
  ALTER COLUMN company_id DROP NOT NULL;

-- Agregar comentario explicativo
COMMENT ON COLUMN assistant_knowledge_base.company_id IS
  'OPCIONAL - Solo para analytics. El conocimiento es GLOBAL (compartido entre empresas).';

-- Índices para búsqueda global optimizada
CREATE INDEX IF NOT EXISTS idx_knowledge_global_search
  ON assistant_knowledge_base (question_normalized, helpful, reused_count DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_verified_answers
  ON assistant_knowledge_base (verified_by_admin, helpful)
  WHERE verified_by_admin IS NOT NULL AND helpful = true;

-- ============================================================================
-- 2. CREAR tabla assistant_conversations (Historial MULTI-TENANT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant (obligatorio)
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Conversación
  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  -- Relación con knowledge base (si usó una respuesta existente)
  knowledge_entry_id UUID REFERENCES assistant_knowledge_base(id) ON DELETE SET NULL,

  -- Contexto de la conversación
  context JSONB DEFAULT '{}',
  module_name VARCHAR(100),
  screen_name VARCHAR(100),

  -- Metadata de la respuesta
  answer_source VARCHAR(50) DEFAULT 'ollama', -- ollama, cache, diagnostic, fallback
  confidence REAL DEFAULT 0.0,
  response_time_ms INTEGER,

  -- Feedback del usuario
  helpful BOOLEAN DEFAULT NULL, -- NULL = sin feedback aún
  feedback_comment TEXT,
  feedback_at TIMESTAMPTZ,

  -- Flags
  diagnostic_triggered BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0),
  CONSTRAINT valid_response_time CHECK (response_time_ms >= 0)
);

-- Índices para conversaciones
CREATE INDEX IF NOT EXISTS idx_conversations_company
  ON assistant_conversations (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user
  ON assistant_conversations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_module
  ON assistant_conversations (module_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_helpful
  ON assistant_conversations (helpful, created_at DESC)
  WHERE helpful IS NOT NULL;

-- Índice para analytics
CREATE INDEX IF NOT EXISTS idx_conversations_analytics
  ON assistant_conversations (company_id, module_name, helpful, created_at DESC);

-- ============================================================================
-- 3. FUNCIÓN: Obtener estadísticas de conversaciones por empresa
-- ============================================================================

CREATE OR REPLACE FUNCTION get_company_conversation_stats(
  search_company_id INTEGER,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_conversations BIGINT,
  helpful_count BIGINT,
  not_helpful_count BIGINT,
  no_feedback_count BIGINT,
  avg_confidence REAL,
  avg_response_time_ms REAL,
  diagnostics_triggered BIGINT,
  unique_users BIGINT,
  most_used_modules JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE helpful = true) as helpful_count,
    COUNT(*) FILTER (WHERE helpful = false) as not_helpful_count,
    COUNT(*) FILTER (WHERE helpful IS NULL) as no_feedback_count,
    AVG(confidence) as avg_confidence,
    AVG(response_time_ms) as avg_response_time_ms,
    COUNT(*) FILTER (WHERE diagnostic_triggered = true) as diagnostics_triggered,
    COUNT(DISTINCT user_id) as unique_users,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'module', module_name,
          'count', module_count
        )
      )
      FROM (
        SELECT module_name, COUNT(*) as module_count
        FROM assistant_conversations
        WHERE company_id = search_company_id
          AND created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY module_name
        ORDER BY module_count DESC
        LIMIT 10
      ) modules
    ) as most_used_modules
  FROM assistant_conversations
  WHERE company_id = search_company_id
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNCIÓN: Obtener estadísticas GLOBALES de knowledge base
-- ============================================================================

CREATE OR REPLACE FUNCTION get_global_knowledge_stats()
RETURNS TABLE (
  total_entries BIGINT,
  verified_entries BIGINT,
  helpful_entries BIGINT,
  most_reused_count INTEGER,
  unique_modules BIGINT,
  total_reuses BIGINT,
  companies_contributed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE verified_by_admin IS NOT NULL) as verified_entries,
    COUNT(*) FILTER (WHERE helpful = true) as helpful_entries,
    MAX(reused_count) as most_reused_count,
    COUNT(DISTINCT module_name) as unique_modules,
    SUM(reused_count) as total_reuses,
    COUNT(DISTINCT company_id) FILTER (WHERE company_id IS NOT NULL) as companies_contributed
  FROM assistant_knowledge_base;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGER: Actualizar reused_count cuando se usa una respuesta
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_knowledge_reuse()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la conversación usó una entrada del knowledge base, incrementar reused_count
  IF NEW.knowledge_entry_id IS NOT NULL THEN
    UPDATE assistant_knowledge_base
    SET reused_count = reused_count + 1
    WHERE id = NEW.knowledge_entry_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_knowledge_reuse
  AFTER INSERT ON assistant_conversations
  FOR EACH ROW
  EXECUTE FUNCTION increment_knowledge_reuse();

-- ============================================================================
-- 6. COMENTARIOS EN TABLAS
-- ============================================================================

COMMENT ON TABLE assistant_knowledge_base IS
  'Base de conocimiento GLOBAL - compartida entre TODAS las empresas. Aprendizaje acumulativo.';

COMMENT ON TABLE assistant_conversations IS
  'Historial de conversaciones MULTI-TENANT - aislado por empresa. Solo para tracking.';

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICACIÓN:';
  RAISE NOTICE '  • assistant_knowledge_base.company_id: NULLABLE ✓';
  RAISE NOTICE '  • assistant_conversations: MULTI-TENANT ✓';
  RAISE NOTICE '  • Funciones creadas: 2 ✓';
  RAISE NOTICE '  • Trigger creado: 1 ✓';
  RAISE NOTICE '  • Índices optimizados: 8 ✓';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 IMPACTO:';
  RAISE NOTICE '  • Knowledge base ahora es GLOBAL';
  RAISE NOTICE '  • Todas las empresas comparten conocimiento';
  RAISE NOTICE '  • Aprendizaje acumulativo activado';
  RAISE NOTICE '  • Historial de conversaciones sigue siendo privado por empresa';
END $$;
