-- ============================================================================
-- RENOMBRAR: A MI PASO → A MI ME PASO
-- Corrección del nombre del módulo
-- Fecha: 2025-12-23
-- ============================================================================

-- 1. Renombrar tabla
ALTER TABLE IF EXISTS a_mi_paso_searches RENAME TO a_mi_me_paso_searches;

-- 2. Recrear funciones con nombre correcto
DROP FUNCTION IF EXISTS get_popular_searches(INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS detect_knowledge_gaps(INTEGER, INTEGER, INTEGER, INTEGER);

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
  FROM a_mi_me_paso_searches amps
  WHERE amps.company_id = p_company_id
    AND amps.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY amps.query
  HAVING COUNT(*) > 2
  ORDER BY search_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

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
  FROM a_mi_me_paso_searches amps
  WHERE amps.company_id = p_company_id
    AND amps.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY amps.query
  HAVING COUNT(*) >= p_min_searches
    AND AVG(amps.results_count) < p_max_avg_results
  ORDER BY search_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar comentarios
COMMENT ON TABLE a_mi_me_paso_searches IS
  'Búsquedas realizadas en el asistente A MI ME PASO para analytics';

-- ✅ COMPLETADO
-- Tabla renombrada: a_mi_paso_searches → a_mi_me_paso_searches
-- Funciones actualizadas
