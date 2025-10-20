/**
 * MIGRATION: Create assistant_knowledge_base table
 *
 * Sistema de Asistente IA con Knowledge Base
 *
 * Almacena conversaciones, respuestas de IA, feedback de usuarios
 * y aprende progresivamente de las interacciones.
 *
 * @created 2025-01-19
 * @version 1.0.0
 * @technology Ollama + Llama 3.1 (8B) Local AI
 */

-- ═══════════════════════════════════════════════════════════
-- TABLA PRINCIPAL: assistant_knowledge_base
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS assistant_knowledge_base (
  -- IDENTIFICACIÓN
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- MULTI-TENANT
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

  -- CONTEXTO DE USUARIO
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  user_role VARCHAR(50), -- admin, rrhh, employee, etc.

  -- PREGUNTA DEL USUARIO
  question TEXT NOT NULL,
  question_normalized TEXT, -- Normalizado para búsqueda (lowercase, sin acentos)
  -- question_embedding: Removido (requiere pgvector extension - futuro enhancement)

  -- CONTEXTO DE LA PREGUNTA
  context JSONB, -- { module, submodule, screen, user_action, system_state }
  module_name VARCHAR(100), -- ej: 'users', 'attendance', 'medical'

  -- RESPUESTA DE LA IA
  answer TEXT NOT NULL,
  answer_source VARCHAR(50) DEFAULT 'ollama', -- 'ollama', 'cache', 'diagnostic', 'registry'
  model_used VARCHAR(100) DEFAULT 'llama3.1:8b', -- Modelo usado (puede cambiar en el futuro)

  -- METADATA DE LA RESPUESTA
  tokens_used INTEGER, -- Para tracking de uso
  response_time_ms INTEGER, -- Tiempo de respuesta de Ollama
  confidence_score NUMERIC(3,2), -- 0.00 a 1.00 (qué tan confiada está la IA)

  -- AUTO-DIAGNÓSTICO INTEGRADO
  diagnostic_triggered BOOLEAN DEFAULT FALSE,
  diagnostic_execution_id UUID, -- Referencia a audit_logs.execution_id si se disparó diagnóstico
  diagnostic_results JSONB, -- Resumen de resultados de auditoría

  -- SUGERENCIAS Y ACCIONES
  suggested_actions JSONB, -- [{ type, label, action, params }]
  quick_replies JSONB, -- ["Sí, hazlo", "No gracias", "Necesito más info"]

  -- FEEDBACK DEL USUARIO
  helpful BOOLEAN, -- true = 👍, false = 👎, null = sin feedback
  feedback_comment TEXT, -- Comentario opcional del usuario
  feedback_at TIMESTAMP,

  -- APRENDIZAJE PROGRESIVO
  reused_count INTEGER DEFAULT 0, -- Cuántas veces se reusó esta respuesta
  improved_answer TEXT, -- Versión mejorada de la respuesta (si admin corrige)
  verified_by_admin UUID REFERENCES users(user_id) ON DELETE SET NULL,
  verified_at TIMESTAMP,

  -- METADATA
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════

-- Multi-tenant filtering
CREATE INDEX idx_knowledge_base_company_id ON assistant_knowledge_base(company_id);

-- Búsqueda por módulo (muy frecuente)
CREATE INDEX idx_knowledge_base_module_name ON assistant_knowledge_base(module_name);

-- Búsqueda full-text en preguntas normalizadas
CREATE INDEX idx_knowledge_base_question_normalized ON assistant_knowledge_base USING gin(to_tsvector('spanish', question_normalized));

-- Filtrar por feedback positivo (para reusar respuestas buenas)
CREATE INDEX idx_knowledge_base_helpful ON assistant_knowledge_base(helpful) WHERE helpful = TRUE;

-- Búsqueda de respuestas verificadas (alta calidad)
CREATE INDEX idx_knowledge_base_verified ON assistant_knowledge_base(verified_at) WHERE verified_at IS NOT NULL;

-- Ordenar por fecha (historial de conversaciones)
CREATE INDEX idx_knowledge_base_created_at ON assistant_knowledge_base(created_at DESC);

-- Búsqueda compuesta: empresa + módulo + útil
CREATE INDEX idx_knowledge_base_company_module_helpful ON assistant_knowledge_base(company_id, module_name, helpful);

-- ═══════════════════════════════════════════════════════════
-- TRIGGER PARA updated_at
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_assistant_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assistant_knowledge_base_updated_at
  BEFORE UPDATE ON assistant_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_knowledge_base_updated_at();

-- ═══════════════════════════════════════════════════════════
-- FUNCIÓN HELPER: Buscar respuestas similares
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_similar_answers(
  search_question TEXT,
  search_company_id INTEGER DEFAULT NULL,
  search_module VARCHAR DEFAULT NULL,
  limit_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  helpful BOOLEAN,
  reused_count INTEGER,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.question,
    COALESCE(kb.improved_answer, kb.answer) as answer,
    kb.helpful,
    kb.reused_count,
    similarity(kb.question_normalized, lower(unaccent(search_question))) as similarity
  FROM assistant_knowledge_base kb
  WHERE
    (search_company_id IS NULL OR kb.company_id = search_company_id)
    AND (search_module IS NULL OR kb.module_name = search_module)
    AND kb.helpful = TRUE
    AND similarity(kb.question_normalized, lower(unaccent(search_question))) > 0.3
  ORDER BY similarity DESC, kb.reused_count DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_similar_answers IS 'Busca respuestas similares en la knowledge base usando similitud de texto';

-- ═══════════════════════════════════════════════════════════
-- FUNCIÓN HELPER: Obtener estadísticas del asistente
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_assistant_stats(stats_company_id INTEGER, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_questions BIGINT,
  helpful_rate NUMERIC,
  avg_response_time_ms NUMERIC,
  total_diagnostics BIGINT,
  most_asked_module VARCHAR,
  total_reuses BIGINT,
  verified_answers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_questions,
    ROUND(
      (COUNT(*) FILTER (WHERE helpful = TRUE)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE helpful IS NOT NULL), 0)) * 100,
      2
    ) as helpful_rate,
    ROUND(AVG(response_time_ms), 0) as avg_response_time_ms,
    COUNT(*) FILTER (WHERE diagnostic_triggered = TRUE)::BIGINT as total_diagnostics,
    (
      SELECT module_name
      FROM assistant_knowledge_base
      WHERE company_id = stats_company_id
        AND created_at > NOW() - (days_back || ' days')::INTERVAL
      GROUP BY module_name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_asked_module,
    SUM(reused_count)::BIGINT as total_reuses,
    COUNT(*) FILTER (WHERE verified_at IS NOT NULL)::BIGINT as verified_answers
  FROM assistant_knowledge_base
  WHERE company_id = stats_company_id
    AND created_at > NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_assistant_stats IS 'Obtiene estadísticas de uso del asistente IA por empresa';

-- ═══════════════════════════════════════════════════════════
-- EXTENSIÓN: unaccent (para búsquedas sin acentos)
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Para similarity()

-- ═══════════════════════════════════════════════════════════
-- COMENTARIOS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE assistant_knowledge_base IS 'Knowledge base del asistente IA con Ollama + Llama 3.1 - Aprende de interacciones';
COMMENT ON COLUMN assistant_knowledge_base.question_normalized IS 'Pregunta normalizada (lowercase, sin acentos) para búsqueda';
COMMENT ON COLUMN assistant_knowledge_base.context IS 'JSONB con contexto: módulo, pantalla, acción del usuario';
COMMENT ON COLUMN assistant_knowledge_base.answer_source IS 'Origen de respuesta: ollama (generada), cache (reusada), diagnostic (de auditor)';
COMMENT ON COLUMN assistant_knowledge_base.confidence_score IS 'Confianza de la IA en la respuesta (0.00-1.00)';
COMMENT ON COLUMN assistant_knowledge_base.diagnostic_triggered IS 'Si se disparó diagnóstico técnico del auditor';
COMMENT ON COLUMN assistant_knowledge_base.suggested_actions IS 'Acciones sugeridas: botones/links para ejecutar acciones';
COMMENT ON COLUMN assistant_knowledge_base.reused_count IS 'Cuántas veces se reusó esta respuesta (popularidad)';
COMMENT ON COLUMN assistant_knowledge_base.improved_answer IS 'Respuesta mejorada manualmente por admin';

-- ═══════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Tabla assistant_knowledge_base creada exitosamente';
  RAISE NOTICE '✅ 7 índices creados para búsqueda rápida';
  RAISE NOTICE '✅ Extensiones: unaccent, pg_trgm habilitadas';
  RAISE NOTICE '✅ Funciones helper: search_similar_answers, get_assistant_stats';
  RAISE NOTICE '🤖 Sistema de Asistente IA (Ollama + Llama 3.1) LISTO';
  RAISE NOTICE '🧠 Knowledge Base preparada para aprendizaje progresivo';
END $$;
