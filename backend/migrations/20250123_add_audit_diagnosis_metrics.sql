/**
 * MIGRACIÓN: Agregar métricas de diagnóstico a audit_logs
 *
 * Extiende la tabla audit_logs para registrar métricas de precisión
 * de los diagnósticos de Ollama/OpenAI/Pattern Analysis
 *
 * Fecha: 2025-01-23
 * Versión: 1.0.0
 */

-- 1. Agregar columnas de métricas de diagnóstico
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diagnosis_source VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diagnosis_model VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diagnosis_level INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diagnosis_confidence DECIMAL(3,2);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diagnosis_specificity DECIMAL(3,2);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diagnosis_actionable BOOLEAN DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diagnosis_duration_ms INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS diagnosis_timestamp TIMESTAMP;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS repair_success BOOLEAN;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS repair_attempts INTEGER DEFAULT 0;

-- 2. Comentarios para documentación
COMMENT ON COLUMN audit_logs.diagnosis_source IS 'Origen del diagnóstico: ollama-local, ollama-external, openai, pattern-analysis';
COMMENT ON COLUMN audit_logs.diagnosis_model IS 'Modelo usado: llama3.1:8b, deepseek-r1:8b, gpt-4o-mini, rule-based';
COMMENT ON COLUMN audit_logs.diagnosis_level IS 'Nivel del sistema híbrido: 1=ollama-local, 2=ollama-external, 3=openai, 4=patterns';
COMMENT ON COLUMN audit_logs.diagnosis_confidence IS 'Confianza del diagnóstico (0.0-1.0)';
COMMENT ON COLUMN audit_logs.diagnosis_specificity IS 'Especificidad del diagnóstico (0.0-1.0)';
COMMENT ON COLUMN audit_logs.diagnosis_actionable IS 'Si el diagnóstico proporciona acciones concretas';
COMMENT ON COLUMN audit_logs.diagnosis_duration_ms IS 'Tiempo que tardó el análisis en milisegundos';
COMMENT ON COLUMN audit_logs.diagnosis_timestamp IS 'Timestamp del análisis';
COMMENT ON COLUMN audit_logs.repair_success IS 'Si la reparación fue exitosa (null si no se intentó)';
COMMENT ON COLUMN audit_logs.repair_attempts IS 'Número de intentos de reparación';

-- 3. Índices para queries de dashboard
CREATE INDEX IF NOT EXISTS idx_audit_logs_diagnosis_source ON audit_logs(diagnosis_source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_diagnosis_level ON audit_logs(diagnosis_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_diagnosis_confidence ON audit_logs(diagnosis_confidence);
CREATE INDEX IF NOT EXISTS idx_audit_logs_repair_success ON audit_logs(repair_success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_status ON audit_logs(module_name, status);

-- 4. Vista para métricas agregadas por módulo
CREATE OR REPLACE VIEW audit_metrics_by_module AS
SELECT
  module_name,
  COUNT(*) as total_audits,
  COUNT(CASE WHEN status = 'pass' THEN 1 END) as passed,
  COUNT(CASE WHEN status = 'fail' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'warning' THEN 1 END) as warnings,
  ROUND(AVG(diagnosis_confidence), 2) as avg_confidence,
  ROUND(AVG(diagnosis_specificity), 2) as avg_specificity,
  COUNT(CASE WHEN diagnosis_actionable = true THEN 1 END) as actionable_diagnoses,
  COUNT(CASE WHEN repair_success = true THEN 1 END) as successful_repairs,
  COUNT(CASE WHEN repair_success = false THEN 1 END) as failed_repairs,
  ROUND(AVG(diagnosis_duration_ms), 0) as avg_diagnosis_time_ms,
  MAX("createdAt") as last_audit
FROM audit_logs
WHERE diagnosis_source IS NOT NULL
GROUP BY module_name;

-- 5. Vista para comparación de fuentes de diagnóstico
CREATE OR REPLACE VIEW audit_metrics_by_source AS
SELECT
  diagnosis_source,
  diagnosis_model,
  diagnosis_level,
  COUNT(*) as total_diagnoses,
  ROUND(AVG(diagnosis_confidence), 2) as avg_confidence,
  ROUND(AVG(diagnosis_specificity), 2) as avg_specificity,
  COUNT(CASE WHEN diagnosis_actionable = true THEN 1 END) as actionable_count,
  COUNT(CASE WHEN repair_success = true THEN 1 END) as successful_repairs,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN repair_success IS NOT NULL THEN 1 END) > 0
      THEN (COUNT(CASE WHEN repair_success = true THEN 1 END)::DECIMAL /
            COUNT(CASE WHEN repair_success IS NOT NULL THEN 1 END)) * 100
      ELSE 0
    END,
    1
  ) as repair_success_rate,
  ROUND(AVG(diagnosis_duration_ms), 0) as avg_duration_ms,
  MIN(diagnosis_timestamp) as first_used,
  MAX(diagnosis_timestamp) as last_used
FROM audit_logs
WHERE diagnosis_source IS NOT NULL
GROUP BY diagnosis_source, diagnosis_model, diagnosis_level
ORDER BY diagnosis_level;

-- 6. Vista para timeline de progreso
CREATE OR REPLACE VIEW audit_progress_timeline AS
SELECT
  DATE_TRUNC('hour', "createdAt") as time_bucket,
  module_name,
  COUNT(*) as tests_run,
  COUNT(CASE WHEN status = 'pass' THEN 1 END) as passed,
  COUNT(CASE WHEN status = 'fail' THEN 1 END) as failed,
  ROUND(
    (COUNT(CASE WHEN status = 'pass' THEN 1 END)::DECIMAL / COUNT(*)) * 100,
    1
  ) as pass_rate
FROM audit_logs
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY time_bucket, module_name
ORDER BY time_bucket DESC;

-- 7. Función para obtener estadísticas globales de precisión
CREATE OR REPLACE FUNCTION get_diagnosis_precision_stats()
RETURNS TABLE(
  total_diagnoses BIGINT,
  ollama_local_count BIGINT,
  ollama_external_count BIGINT,
  openai_count BIGINT,
  pattern_count BIGINT,
  avg_ollama_confidence DECIMAL,
  avg_openai_confidence DECIMAL,
  avg_pattern_confidence DECIMAL,
  ollama_repair_success_rate DECIMAL,
  openai_repair_success_rate DECIMAL,
  pattern_repair_success_rate DECIMAL,
  recommendation TEXT
) AS $$
DECLARE
  ollama_success DECIMAL;
  openai_success DECIMAL;
BEGIN
  -- Calcular tasas de éxito
  SELECT
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN repair_success IS NOT NULL THEN 1 END) > 0
        THEN (COUNT(CASE WHEN repair_success = true THEN 1 END)::DECIMAL /
              COUNT(CASE WHEN repair_success IS NOT NULL THEN 1 END)) * 100
        ELSE 0
      END,
      1
    ) INTO ollama_success
  FROM audit_logs
  WHERE diagnosis_source LIKE 'ollama%';

  SELECT
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN repair_success IS NOT NULL THEN 1 END) > 0
        THEN (COUNT(CASE WHEN repair_success = true THEN 1 END)::DECIMAL /
              COUNT(CASE WHEN repair_success IS NOT NULL THEN 1 END)) * 100
        ELSE 0
      END,
      1
    ) INTO openai_success
  FROM audit_logs
  WHERE diagnosis_source = 'openai';

  RETURN QUERY
  SELECT
    COUNT(*) as total_diagnoses,
    COUNT(CASE WHEN diagnosis_source LIKE 'ollama-local%' THEN 1 END) as ollama_local_count,
    COUNT(CASE WHEN diagnosis_source = 'ollama-external' THEN 1 END) as ollama_external_count,
    COUNT(CASE WHEN diagnosis_source = 'openai' THEN 1 END) as openai_count,
    COUNT(CASE WHEN diagnosis_source = 'pattern-analysis' THEN 1 END) as pattern_count,
    ROUND(AVG(CASE WHEN diagnosis_source LIKE 'ollama%' THEN diagnosis_confidence END), 2) as avg_ollama_confidence,
    ROUND(AVG(CASE WHEN diagnosis_source = 'openai' THEN diagnosis_confidence END), 2) as avg_openai_confidence,
    ROUND(AVG(CASE WHEN diagnosis_source = 'pattern-analysis' THEN diagnosis_confidence END), 2) as avg_pattern_confidence,
    ollama_success as ollama_repair_success_rate,
    openai_success as openai_repair_success_rate,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN diagnosis_source = 'pattern-analysis' AND repair_success IS NOT NULL THEN 1 END) > 0
        THEN (COUNT(CASE WHEN diagnosis_source = 'pattern-analysis' AND repair_success = true THEN 1 END)::DECIMAL /
              COUNT(CASE WHEN diagnosis_source = 'pattern-analysis' AND repair_success IS NOT NULL THEN 1 END)) * 100
        ELSE 0
      END,
      1
    ) as pattern_repair_success_rate,
    CASE
      WHEN openai_success > ollama_success + 20 THEN 'Considera migrar a OpenAI - Mejor tasa de éxito'
      WHEN ollama_success >= openai_success THEN 'Ollama tiene buen rendimiento - Mantener configuración actual'
      WHEN ollama_success < 50 THEN 'Baja precisión de Ollama - Revisar configuración o considerar OpenAI'
      ELSE 'Rendimiento aceptable - Monitorear métricas'
    END as recommendation
  FROM audit_logs
  WHERE diagnosis_source IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Comentarios finales
COMMENT ON VIEW audit_metrics_by_module IS 'Métricas agregadas de auditoría por módulo';
COMMENT ON VIEW audit_metrics_by_source IS 'Comparación de rendimiento entre fuentes de diagnóstico (Ollama vs OpenAI vs Patterns)';
COMMENT ON VIEW audit_progress_timeline IS 'Timeline de progreso de auditorías (últimas 24 horas)';
COMMENT ON FUNCTION get_diagnosis_precision_stats() IS 'Estadísticas globales de precisión y recomendación de uso de Ollama vs OpenAI';
