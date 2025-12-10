-- ============================================================================
-- Agregar branch_code a organizational_positions
-- Fecha: 2025-12-09
-- Propósito: Identificar rama organizacional (PROD, VENTAS, IT, etc.)
-- ============================================================================

-- Agregar columna branch_code
ALTER TABLE organizational_positions
ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20);

-- Índice para consultas por rama
CREATE INDEX IF NOT EXISTS idx_org_positions_branch
ON organizational_positions(company_id, branch_code);

-- Comentario
COMMENT ON COLUMN organizational_positions.branch_code IS
'Código de rama organizacional (ej: PROD, VENTAS, IT). Permite agrupar posiciones de la misma área funcional.';

-- Log de migración
INSERT INTO migration_log (migration_name, executed_at, description)
SELECT
    '20251209_add_branch_code_to_positions',
    CURRENT_TIMESTAMP,
    'Agregar branch_code a organizational_positions para identificar ramas organizacionales'
WHERE NOT EXISTS (
    SELECT 1 FROM migration_log
    WHERE migration_name = '20251209_add_branch_code_to_positions'
);

-- Ejemplo de datos de prueba (opcional - comentado)
-- UPDATE organizational_positions SET branch_code = 'PROD' WHERE position_code LIKE '%PROD%';
-- UPDATE organizational_positions SET branch_code = 'VENTAS' WHERE position_code LIKE '%VTA%' OR position_code LIKE '%VEN%';
-- UPDATE organizational_positions SET branch_code = 'ADMIN' WHERE position_code LIKE '%ADM%';
