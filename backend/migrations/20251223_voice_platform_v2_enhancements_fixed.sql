-- ============================================================================
-- VOICE PLATFORM V2.0 + A MI PASO
-- Migración: Mejoras y nuevas funcionalidades
-- Fecha: 2025-12-23
-- ============================================================================

-- ============================================================================
-- 1. MEJORAS EN employee_experiences
-- ============================================================================

-- Agregar campos de categorización inteligente
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS related_process_id UUID;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS related_department_id INTEGER;

-- Campos de resolución
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS resolved_by UUID;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS auto_resolved BOOLEAN DEFAULT false;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS similarity_sources JSONB;

-- Campos de destacados y noticias
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT false;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS highlighted_at TIMESTAMP;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS highlighted_by UUID;

-- Campos de impacto (para métricas)
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS estimated_time_saved INTEGER;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS estimated_cost_saved DECIMAL(10,2);
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS implementation_date DATE;

-- Campos de engagement
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS bookmarks_count INTEGER DEFAULT 0;
ALTER TABLE employee_experiences ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;


-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_experiences_category
  ON employee_experiences(company_id, category);

CREATE INDEX IF NOT EXISTS idx_experiences_process
  ON employee_experiences(related_process_id)
  WHERE related_process_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_experiences_status_company
  ON employee_experiences(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_experiences_highlighted
  ON employee_experiences(company_id, is_highlighted, highlighted_at DESC)
  WHERE is_highlighted = true;

CREATE INDEX IF NOT EXISTS idx_experiences_resolved
  ON employee_experiences(company_id, resolved_at DESC)
  WHERE resolved_at IS NOT NULL;


-- ============================================================================
-- 2. TABLA: company_news (Noticias de la empresa)
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Contenido
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  summary VARCHAR(500),

  -- Tipo de noticia
  type VARCHAR(50) NOT NULL,  -- 'IMPLEMENTATION', 'RECOGNITION', 'ANNOUNCEMENT', 'MILESTONE'

  -- Vinculación con experiencias
  related_experience_ids TEXT[],  -- Array de UUIDs como strings
  related_process_ids TEXT[],  -- Procesos creados/modificados

  -- Multimedia
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  attachments JSONB,

  -- Publicación
  published_by UUID NOT NULL REFERENCES users(user_id),
  published_at TIMESTAMP DEFAULT NOW(),
  is_published BOOLEAN DEFAULT true,

  -- Destacado
  is_pinned BOOLEAN DEFAULT false,
  pin_expires_at TIMESTAMP,

  -- Engagement
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  -- Metadata
  tags TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_news_company_published
  ON company_news(company_id, published_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_news_pinned
  ON company_news(company_id, is_pinned, pin_expires_at)
  WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_news_type
  ON company_news(company_id, type, published_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_company_news_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_company_news_timestamp
  BEFORE UPDATE ON company_news
  FOR EACH ROW
  EXECUTE FUNCTION update_company_news_timestamp();


-- ============================================================================
-- 3. TABLA: a_mi_paso_searches (Búsquedas del asistente)
-- ============================================================================

CREATE TABLE IF NOT EXISTS a_mi_paso_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Query
  query TEXT NOT NULL,
  query_normalized TEXT,

  -- Resultados
  results_count INTEGER DEFAULT 0,
  results_summary JSONB,  -- {procedures: 3, experiences: 5, news: 1}

  -- Interacción
  clicked_result_id TEXT,  -- UUID como string
  clicked_result_source VARCHAR(50),  -- 'PROCEDURE', 'EXPERIENCE', 'NEWS'
  clicked_result_position INTEGER,

  -- Feedback
  was_helpful BOOLEAN,
  feedback_comment TEXT,

  -- Performance
  search_time_ms INTEGER,

  -- Context
  user_department_id INTEGER,
  search_context VARCHAR(50),  -- 'MI_ESPACIO', 'FEED', etc.

  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ami_paso_company_user
  ON a_mi_paso_searches(company_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ami_paso_query
  ON a_mi_paso_searches(company_id, query_normalized, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ami_paso_helpful
  ON a_mi_paso_searches(company_id, was_helpful, created_at DESC);


-- ============================================================================
-- 4. TABLA: experience_bookmarks (Guardados por usuario)
-- ============================================================================

CREATE TABLE IF NOT EXISTS experience_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,

  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, experience_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user
  ON experience_bookmarks(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookmarks_experience
  ON experience_bookmarks(experience_id);


-- ============================================================================
-- 5. FUNCIONES HELPER
-- ============================================================================

-- Función: Incrementar contador de bookmarks
CREATE OR REPLACE FUNCTION increment_bookmarks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE employee_experiences
    SET bookmarks_count = bookmarks_count + 1
    WHERE id = NEW.experience_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE employee_experiences
    SET bookmarks_count = GREATEST(bookmarks_count - 1, 0)
    WHERE id = OLD.experience_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookmark_count
  AFTER INSERT OR DELETE ON experience_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION increment_bookmarks_count();


-- Función: Obtener búsquedas populares
CREATE OR REPLACE FUNCTION get_popular_searches(
  p_company_id INTEGER,
  p_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  query TEXT,
  search_count BIGINT,
  avg_results NUMERIC,
  unique_users BIGINT,
  helpfulness_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    amps.query,
    COUNT(*)::BIGINT as search_count,
    AVG(amps.results_count)::NUMERIC as avg_results,
    COUNT(DISTINCT amps.user_id)::BIGINT as unique_users,
    (SUM(CASE WHEN amps.was_helpful = true THEN 1 ELSE 0 END)::NUMERIC /
     NULLIF(COUNT(*), 0))::NUMERIC as helpfulness_rate
  FROM a_mi_paso_searches amps
  WHERE amps.company_id = p_company_id
    AND amps.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY amps.query
  HAVING COUNT(*) > 2
  ORDER BY search_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- Función: Detectar knowledge gaps
CREATE OR REPLACE FUNCTION detect_knowledge_gaps(
  p_company_id INTEGER,
  p_days INTEGER DEFAULT 30,
  p_min_searches INTEGER DEFAULT 5,
  p_max_avg_results INTEGER DEFAULT 3
)
RETURNS TABLE(
  query TEXT,
  search_count BIGINT,
  avg_results NUMERIC,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    amps.query,
    COUNT(*)::BIGINT as search_count,
    AVG(amps.results_count)::NUMERIC as avg_results,
    COUNT(DISTINCT amps.user_id)::BIGINT as unique_users
  FROM a_mi_paso_searches amps
  WHERE amps.company_id = p_company_id
    AND amps.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY amps.query
  HAVING COUNT(*) >= p_min_searches
    AND AVG(amps.results_count) < p_max_avg_results
  ORDER BY search_count DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON COLUMN employee_experiences.category IS
  'Categorías: PROCESS, SAFETY, HR, QUALITY, LOGISTICS, IT, ADMIN, FINANCE, OTHER';

COMMENT ON TABLE company_news IS
  'Noticias publicadas por admin cuando se implementan sugerencias o se hacen anuncios';

COMMENT ON TABLE a_mi_paso_searches IS
  'Búsquedas realizadas en el asistente A MI PASO para analytics';


-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================

-- ✅ employee_experiences: +17 campos nuevos
-- ✅ company_news: Tabla nueva
-- ✅ a_mi_paso_searches: Tabla nueva
-- ✅ experience_bookmarks: Tabla nueva
-- ✅ Funciones: get_popular_searches(), detect_knowledge_gaps()
-- ✅ Triggers: Auto-incremento de bookmarks_count
