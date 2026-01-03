/**
 * ============================================================================
 * EMPLOYEE VOICE PLATFORM - MIGRACIÓN COMPLETA
 * ============================================================================
 *
 * Este script crea el schema completo para el Employee Experience & Voice Platform:
 * - Tablas principales (experiences, clusters, votes, comments, recognitions)
 * - Sistema de gamificación (stats, config)
 * - Extensión pgvector para similarity search
 * - Índices optimizados
 * - Funciones PostgreSQL helper
 * - Triggers automáticos
 *
 * @version 1.0.0
 * @date 2025-12-22
 * ============================================================================
 */

-- ============================================================================
-- 1. EXTENSIONES REQUERIDAS
-- ============================================================================

-- Extensión para vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLA PRINCIPAL: employee_experiences
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id INT REFERENCES users(user_id) ON DELETE SET NULL,  -- NULL si anónimo total

  -- Contenido
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,

  -- Categorización manual (opcional, puede ser NULL si usuario no categoriza)
  type VARCHAR(50),              -- SUGERENCIA, PROBLEMA, SOLUCION, RECONOCIMIENTO, PREGUNTA
  area VARCHAR(50),              -- PRODUCCION, ADMINISTRACION, LOGISTICA, CALIDAD, SEGURIDAD, IT, INFRAESTRUCTURA, COMERCIAL, OTRO
  priority VARCHAR(20),          -- CRITICO, ALTO, MEDIO, BAJO
  impact_scope VARCHAR(20),      -- INDIVIDUAL, EQUIPO, PLANTA, EMPRESA

  -- IA/ML resultados (se llenan async después de crear)
  embedding VECTOR(384),         -- S-BERT embedding (384 dimensiones)
  topics JSONB,                  -- LDA topics: ["palletizado", "seguridad"]
  sentiment_score FLOAT,         -- -1 (negativo) a +1 (positivo)
  sentiment_label VARCHAR(20),   -- POSITIVE, NEUTRAL, NEGATIVE
  keywords TEXT[],               -- Extracted keywords

  -- Clustering
  cluster_id UUID REFERENCES experience_clusters(id) ON DELETE SET NULL,
  similarity_to_cluster FLOAT,  -- 0-1 (qué tan similar es al centroid del cluster)
  is_cluster_original BOOLEAN DEFAULT false,  -- true si fue la primera del cluster

  -- Visibilidad y privacidad
  visibility VARCHAR(20) NOT NULL DEFAULT 'ADMIN_ONLY',
  -- ANONYMOUS: nadie ve autor (ni siquiera admin)
  -- ADMIN_ONLY: solo admin/gerente ve autor, empleados no
  -- PUBLIC: todos ven autor

  -- Estado workflow
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING → IN_REVIEW → APPROVED → PILOT → IMPLEMENTED
  -- También: REJECTED, DUPLICATE

  -- Implementación
  approved_by INT REFERENCES users(user_id),
  approved_date TIMESTAMP,
  implementation_start_date TIMESTAMP,
  implementation_complete_date TIMESTAMP,
  implementation_notes TEXT,

  -- Métricas de impacto (estimadas y reales)
  estimated_savings DECIMAL(12,2),
  actual_savings DECIMAL(12,2),
  estimated_time_saved VARCHAR(100),
  actual_time_saved VARCHAR(100),
  quality_improvement_pct FLOAT,
  safety_impact_notes TEXT,

  -- Engagement
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views INT DEFAULT 0,

  -- Reconocimiento
  total_points_awarded INT DEFAULT 0,
  badges_earned TEXT[],

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_visibility CHECK (visibility IN ('ANONYMOUS', 'ADMIN_ONLY', 'PUBLIC')),
  CONSTRAINT check_status CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'PILOT',
                                             'IMPLEMENTED', 'REJECTED', 'DUPLICATE')),
  CONSTRAINT check_sentiment_score CHECK (sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_experiences_company ON employee_experiences(company_id);
CREATE INDEX IF NOT EXISTS idx_experiences_employee ON employee_experiences(employee_id);
CREATE INDEX IF NOT EXISTS idx_experiences_cluster ON employee_experiences(cluster_id);
CREATE INDEX IF NOT EXISTS idx_experiences_status ON employee_experiences(status);
CREATE INDEX IF NOT EXISTS idx_experiences_created ON employee_experiences(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiences_visibility ON employee_experiences(visibility);
CREATE INDEX IF NOT EXISTS idx_experiences_area ON employee_experiences(area);
CREATE INDEX IF NOT EXISTS idx_experiences_type ON employee_experiences(type);

-- Vector similarity search (IVFFlat index para Faiss-like performance)
CREATE INDEX IF NOT EXISTS idx_experiences_embedding
  ON employee_experiences
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Comentario
COMMENT ON TABLE employee_experiences IS 'Tabla principal del Employee Voice Platform: sugerencias, problemas, soluciones';
COMMENT ON COLUMN employee_experiences.embedding IS 'S-BERT embedding (384 dims) para similarity search';
COMMENT ON COLUMN employee_experiences.visibility IS 'ANONYMOUS: nadie ve autor | ADMIN_ONLY: solo admin | PUBLIC: todos';

-- ============================================================================
-- 3. TABLA: experience_clusters
-- ============================================================================

CREATE TABLE IF NOT EXISTS experience_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Metadata del cluster
  name VARCHAR(200) NOT NULL,
  description TEXT,
  auto_generated BOOLEAN DEFAULT true,  -- true si fue creado por IA, false si manual

  -- Centroid del cluster (promedio de embeddings de miembros)
  centroid_embedding VECTOR(384),

  -- Categorización del cluster (heredada del original o votada)
  type VARCHAR(50),
  area VARCHAR(50),
  priority VARCHAR(20),

  -- LDA topics del cluster (agregado de todos los miembros)
  dominant_topics JSONB,

  -- Estadísticas agregadas
  member_count INT DEFAULT 0,
  total_upvotes INT DEFAULT 0,
  total_downvotes INT DEFAULT 0,
  avg_sentiment FLOAT,

  -- Estado del cluster (sigue workflow similar a experiences)
  status VARCHAR(20) DEFAULT 'PENDING',
  merged_into_cluster_id UUID REFERENCES experience_clusters(id),  -- Si fue merged con otro cluster

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_cluster_status CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED',
                                                     'IMPLEMENTED', 'REJECTED', 'MERGED'))
);

CREATE INDEX IF NOT EXISTS idx_clusters_company ON experience_clusters(company_id);
CREATE INDEX IF NOT EXISTS idx_clusters_status ON experience_clusters(status);
CREATE INDEX IF NOT EXISTS idx_clusters_area ON experience_clusters(area);

COMMENT ON TABLE experience_clusters IS 'Clusters de sugerencias similares detectadas por IA';
COMMENT ON COLUMN experience_clusters.centroid_embedding IS 'Promedio de embeddings de miembros para similarity matching';

-- ============================================================================
-- 4. TABLA: experience_votes
-- ============================================================================

CREATE TABLE IF NOT EXISTS experience_votes (
  id SERIAL PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  vote_type VARCHAR(10) NOT NULL,  -- UPVOTE, DOWNVOTE

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(experience_id, user_id),
  CONSTRAINT check_vote_type CHECK (vote_type IN ('UPVOTE', 'DOWNVOTE'))
);

CREATE INDEX IF NOT EXISTS idx_votes_experience ON experience_votes(experience_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON experience_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_company ON experience_votes(company_id);

COMMENT ON TABLE experience_votes IS 'Votos (upvote/downvote) de empleados en sugerencias';

-- ============================================================================
-- 5. TABLA: experience_comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS experience_comments (
  id SERIAL PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(user_id) ON DELETE SET NULL,  -- NULL si anónimo
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  parent_comment_id INT REFERENCES experience_comments(id) ON DELETE CASCADE,  -- Threading (reply to comment)

  content TEXT NOT NULL,

  -- Visibilidad del comentario (puede ser anónimo aunque la sugerencia sea pública)
  visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',

  -- Engagement en comentarios
  upvotes INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_comment_visibility CHECK (visibility IN ('ANONYMOUS', 'PUBLIC'))
);

CREATE INDEX IF NOT EXISTS idx_comments_experience ON experience_comments(experience_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON experience_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON experience_comments(user_id);

COMMENT ON TABLE experience_comments IS 'Comentarios en sugerencias (soporta threading para replies)';

-- ============================================================================
-- 6. TABLA: experience_recognitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS experience_recognitions (
  id SERIAL PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Tipo de reconocimiento
  recognition_type VARCHAR(50) NOT NULL,
  -- QUICK_WIN: Implementada en < 1 mes
  -- IMPACT_SAVER: Ahorro > $10k/año
  -- SAFETY_STAR: Mejora seguridad
  -- INNOVATION_AWARD: Idea disruptiva
  -- TEAM_BOOSTER: Mejora clima laboral
  -- CLUSTER_CONTRIBUTOR: Parte de cluster implementado

  -- Recompensas
  points_awarded INT NOT NULL,
  badge_name VARCHAR(50),
  monetary_reward DECIMAL(10,2),

  -- Metadata
  awarded_by INT NOT NULL REFERENCES users(user_id),
  awarded_date TIMESTAMP DEFAULT NOW(),

  notes TEXT,

  CONSTRAINT check_recognition_type CHECK (
    recognition_type IN ('QUICK_WIN', 'IMPACT_SAVER', 'SAFETY_STAR',
                        'INNOVATION_AWARD', 'TEAM_BOOSTER', 'CLUSTER_CONTRIBUTOR',
                        'FIRST_SUGGESTION', 'SERIAL_CONTRIBUTOR')
  )
);

CREATE INDEX IF NOT EXISTS idx_recognitions_experience ON experience_recognitions(experience_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_user ON experience_recognitions(user_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_company ON experience_recognitions(company_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_date ON experience_recognitions(awarded_date DESC);

COMMENT ON TABLE experience_recognitions IS 'Reconocimientos otorgados por implementación de sugerencias';

-- ============================================================================
-- 7. TABLA: experience_topics
-- ============================================================================

CREATE TABLE IF NOT EXISTS experience_topics (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- LDA topic info
  topic_id INT NOT NULL,
  topic_name VARCHAR(100),
  keywords TEXT[],

  -- Stats
  document_count INT DEFAULT 0,
  avg_sentiment FLOAT,

  -- Metadata
  model_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, topic_id, model_version)
);

CREATE INDEX IF NOT EXISTS idx_topics_company ON experience_topics(company_id);
CREATE INDEX IF NOT EXISTS idx_topics_name ON experience_topics(topic_name);

COMMENT ON TABLE experience_topics IS 'LDA topics detectados automáticamente del corpus de sugerencias';

-- ============================================================================
-- 8. TABLA: voice_gamification_config
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_gamification_config (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Configuración de puntos (editable por empresa)
  points_config JSONB NOT NULL DEFAULT '{
    "SUBMIT_SUGGESTION": 10,
    "SUBMIT_PROBLEM": 8,
    "SUBMIT_SOLUTION": 12,
    "UPVOTE_RECEIVED": 5,
    "COMMENT_ON_SUGGESTION": 2,
    "HELPFUL_COMMENT": 5,
    "SUGGESTION_APPROVED": 25,
    "SUGGESTION_IN_PILOT": 50,
    "SUGGESTION_IMPLEMENTED": 100,
    "CLUSTER_ORIGINAL": 15,
    "CLUSTER_CONTRIBUTOR": 10,
    "FIRST_SUGGESTION": 20,
    "MONTHLY_CONTRIBUTOR": 30
  }'::jsonb,

  -- Configuración de badges/niveles
  badges_config JSONB NOT NULL DEFAULT '{
    "BRONZE": {"min_points": 0, "max_points": 100, "title": "Contributor", "color": "#CD7F32"},
    "SILVER": {"min_points": 100, "max_points": 500, "title": "Active Innovator", "color": "#C0C0C0"},
    "GOLD": {"min_points": 500, "max_points": 1000, "title": "Innovation Leader", "color": "#FFD700"},
    "PLATINUM": {"min_points": 1000, "max_points": null, "title": "Change Agent", "color": "#E5E4E2"}
  }'::jsonb,

  -- Configuración de reconocimientos monetarios (opcional, por empresa)
  monetary_rewards_enabled BOOLEAN DEFAULT false,
  recognition_rewards JSONB DEFAULT '{
    "QUICK_WIN": 100,
    "IMPACT_SAVER": 500,
    "SAFETY_STAR": 300,
    "INNOVATION_AWARD": 1000,
    "TEAM_BOOSTER": 200,
    "CLUSTER_CONTRIBUTOR": 50
  }'::jsonb,

  -- Leaderboard settings
  leaderboard_reset_frequency VARCHAR(20) DEFAULT 'MONTHLY',  -- NEVER, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  show_top_n INT DEFAULT 10,
  show_department_leaderboard BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_gamification_company ON voice_gamification_config(company_id);

COMMENT ON TABLE voice_gamification_config IS 'Configuración de gamificación personalizada por empresa';

-- ============================================================================
-- 9. TABLA: voice_user_stats
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_user_stats (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Estadísticas de contribución
  total_suggestions INT DEFAULT 0,
  total_problems INT DEFAULT 0,
  total_solutions INT DEFAULT 0,
  total_recognitions INT DEFAULT 0,
  total_questions INT DEFAULT 0,

  -- Por estado
  suggestions_pending INT DEFAULT 0,
  suggestions_in_review INT DEFAULT 0,
  suggestions_approved INT DEFAULT 0,
  suggestions_pilot INT DEFAULT 0,
  suggestions_implemented INT DEFAULT 0,
  suggestions_rejected INT DEFAULT 0,

  -- Clustering
  clustered_with_others INT DEFAULT 0,       -- Cuántas veces sus sugerencias fueron agrupadas con otros
  cluster_original_count INT DEFAULT 0,      -- Cuántas veces fue el original del cluster

  -- Engagement
  total_upvotes_given INT DEFAULT 0,
  total_upvotes_received INT DEFAULT 0,
  total_downvotes_given INT DEFAULT 0,
  total_downvotes_received INT DEFAULT 0,
  total_comments_posted INT DEFAULT 0,
  total_comment_upvotes_received INT DEFAULT 0,

  -- Gamificación
  total_points INT DEFAULT 0,
  current_level VARCHAR(20) DEFAULT 'BRONZE',
  badges JSONB DEFAULT '[]'::jsonb,          -- Array de badges earned

  -- Impacto (agregado)
  total_estimated_savings DECIMAL(12,2) DEFAULT 0,
  total_actual_savings DECIMAL(12,2) DEFAULT 0,

  -- Rankings
  global_rank INT,
  department_rank INT,
  monthly_rank INT,

  -- Metadata
  last_contribution_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stats_company ON voice_user_stats(company_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user ON voice_user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON voice_user_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_global_rank ON voice_user_stats(global_rank);
CREATE INDEX IF NOT EXISTS idx_user_stats_dept_rank ON voice_user_stats(department_rank);

COMMENT ON TABLE voice_user_stats IS 'Estadísticas agregadas de cada usuario en Voice Platform (para leaderboards)';

-- ============================================================================
-- 10. FUNCIONES HELPER
-- ============================================================================

/**
 * Función: update_experience_updated_at()
 * Trigger: Auto-actualiza updated_at en employee_experiences
 */
CREATE OR REPLACE FUNCTION update_experience_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_experience_updated_at
  BEFORE UPDATE ON employee_experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_experience_updated_at();

/**
 * Función: update_cluster_updated_at()
 * Trigger: Auto-actualiza updated_at en experience_clusters
 */
CREATE OR REPLACE FUNCTION update_cluster_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cluster_updated_at
  BEFORE UPDATE ON experience_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_cluster_updated_at();

/**
 * Función: update_vote_counts()
 * Trigger: Auto-actualiza upvotes/downvotes en employee_experiences
 */
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'UPVOTE' THEN
      UPDATE employee_experiences SET upvotes = upvotes + 1 WHERE id = NEW.experience_id;
    ELSE
      UPDATE employee_experiences SET downvotes = downvotes + 1 WHERE id = NEW.experience_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'UPVOTE' THEN
      UPDATE employee_experiences SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.experience_id;
    ELSE
      UPDATE employee_experiences SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.experience_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    -- Usuario cambió de upvote a downvote o viceversa
    IF OLD.vote_type = 'UPVOTE' THEN
      UPDATE employee_experiences SET upvotes = GREATEST(upvotes - 1, 0), downvotes = downvotes + 1 WHERE id = NEW.experience_id;
    ELSE
      UPDATE employee_experiences SET downvotes = GREATEST(downvotes - 1, 0), upvotes = upvotes + 1 WHERE id = NEW.experience_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON experience_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_counts();

/**
 * Función: update_comment_counts()
 * Trigger: Auto-actualiza comments_count en employee_experiences
 */
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE employee_experiences SET comments_count = comments_count + 1 WHERE id = NEW.experience_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE employee_experiences SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.experience_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_counts
  AFTER INSERT OR DELETE ON experience_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_counts();

/**
 * Función: calculate_user_level(points INT)
 * Retorna el nivel basado en puntos
 */
CREATE OR REPLACE FUNCTION calculate_user_level(points INT)
RETURNS VARCHAR AS $$
BEGIN
  IF points >= 1000 THEN
    RETURN 'PLATINUM';
  ELSIF points >= 500 THEN
    RETURN 'GOLD';
  ELSIF points >= 100 THEN
    RETURN 'SILVER';
  ELSE
    RETURN 'BRONZE';
  END IF;
END;
$$ LANGUAGE plpgsql;

/**
 * Función: get_voice_overview(company_id INT)
 * Retorna overview analytics del Voice Platform para una empresa
 */
CREATE OR REPLACE FUNCTION get_voice_overview(p_company_id INT)
RETURNS TABLE (
  total_experiences BIGINT,
  unique_contributors BIGINT,
  implemented_count BIGINT,
  implementation_rate NUMERIC,
  total_savings NUMERIC,
  avg_sentiment NUMERIC,
  pending_review_count BIGINT,
  top_area VARCHAR,
  top_topic VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(DISTINCT employee_id)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'IMPLEMENTED')::BIGINT,
    ROUND(COUNT(*) FILTER (WHERE status = 'IMPLEMENTED')::numeric / NULLIF(COUNT(*), 0) * 100, 2),
    COALESCE(SUM(actual_savings) FILTER (WHERE actual_savings IS NOT NULL), 0),
    ROUND(AVG(sentiment_score)::numeric, 2),
    COUNT(*) FILTER (WHERE status = 'PENDING' OR status = 'IN_REVIEW')::BIGINT,
    (SELECT area FROM employee_experiences WHERE company_id = p_company_id AND area IS NOT NULL GROUP BY area ORDER BY COUNT(*) DESC LIMIT 1),
    (SELECT topic_name FROM experience_topics WHERE company_id = p_company_id ORDER BY document_count DESC LIMIT 1)
  FROM employee_experiences
  WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Función: get_leaderboard(company_id INT, limit INT, type VARCHAR)
 * Retorna leaderboard (global, departamento, mensual)
 */
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_company_id INT,
  p_limit INT DEFAULT 10,
  p_type VARCHAR DEFAULT 'global'
)
RETURNS TABLE (
  rank INT,
  user_id INT,
  user_name VARCHAR,
  total_points INT,
  suggestions_implemented INT,
  level VARCHAR,
  department VARCHAR
) AS $$
BEGIN
  IF p_type = 'global' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY vs.total_points DESC)::INT,
      vs.user_id,
      u.name,
      vs.total_points,
      vs.suggestions_implemented,
      vs.current_level,
      d.name
    FROM voice_user_stats vs
    JOIN users u ON vs.user_id = u.user_id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE vs.company_id = p_company_id
    ORDER BY vs.total_points DESC
    LIMIT p_limit;

  ELSIF p_type = 'monthly' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)::INT,
      e.employee_id,
      u.name,
      COALESCE(SUM(e.total_points_awarded), 0)::INT,
      COUNT(*) FILTER (WHERE e.status = 'IMPLEMENTED')::INT,
      calculate_user_level(COALESCE(SUM(e.total_points_awarded), 0)::INT),
      d.name
    FROM employee_experiences e
    JOIN users u ON e.employee_id = u.user_id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE e.company_id = p_company_id
      AND e.created_at >= date_trunc('month', CURRENT_DATE)
    GROUP BY e.employee_id, u.name, d.name
    ORDER BY COUNT(*) DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. DATOS INICIALES
-- ============================================================================

-- Insertar configuración de gamificación por defecto para empresas existentes
INSERT INTO voice_gamification_config (company_id)
SELECT id FROM companies
WHERE id NOT IN (SELECT company_id FROM voice_gamification_config)
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================================
-- 12. GRANTS
-- ============================================================================

-- Asegurar que el usuario de la aplicación tenga permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE employee_experiences TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE experience_clusters TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE experience_votes TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE experience_comments TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE experience_recognitions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE experience_topics TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE voice_gamification_config TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE voice_user_stats TO postgres;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- Verificación
DO $$
DECLARE
  table_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'employee_experiences',
      'experience_clusters',
      'experience_votes',
      'experience_comments',
      'experience_recognitions',
      'experience_topics',
      'voice_gamification_config',
      'voice_user_stats'
    );

  RAISE NOTICE '✅ Voice Platform Migration Complete!';
  RAISE NOTICE '   Tables created: %', table_count;
  RAISE NOTICE '   pgvector extension: %', (SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector');
  RAISE NOTICE '   Triggers created: 4';
  RAISE NOTICE '   Functions created: 5';
END $$;
