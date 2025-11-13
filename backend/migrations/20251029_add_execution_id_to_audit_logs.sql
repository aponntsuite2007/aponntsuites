/**
 * ============================================================================
 * MIGRATION: Agregar execution_id a audit_logs
 * ============================================================================
 *
 * Agrega la columna execution_id para agrupar tests de una misma ejecución
 * y permitir análisis comparativo entre ejecuciones.
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

-- 1. Agregar columna execution_id
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS execution_id UUID;

-- 2. Crear índice para mejorar performance de queries por execution_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_execution_id
ON audit_logs(execution_id);

-- 3. Crear índice compuesto para queries comunes
CREATE INDEX IF NOT EXISTS idx_audit_logs_execution_status
ON audit_logs(execution_id, status);

-- 4. Comentarios para documentación
COMMENT ON COLUMN audit_logs.execution_id IS 'UUID que agrupa todos los tests de una misma ejecución del auditor';

-- 5. Actualizar registros existentes (asignar execution_id basado en timestamp)
-- Los registros antiguos sin execution_id se agrupan por hora
UPDATE audit_logs
SET execution_id = md5(date_trunc('hour', created_at)::text || company_id::text)::uuid
WHERE execution_id IS NULL;

COMMIT;
