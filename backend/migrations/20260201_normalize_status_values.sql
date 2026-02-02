-- ============================================================================
-- MIGRACIÓN: Normalizar valores de status a inglés ('active' en vez de 'activo')
-- Fecha: 2026-02-01
-- Descripción: Corrige inconsistencia de idioma en valores de status
-- ============================================================================

-- ============================================================================
-- 1. NORMALIZAR STATUS EN COMPANIES
-- ============================================================================
UPDATE companies
SET status = 'active'
WHERE status = 'activo';

UPDATE companies
SET status = 'pending'
WHERE status = 'pendiente';

UPDATE companies
SET status = 'suspended'
WHERE status = 'suspendido';

UPDATE companies
SET status = 'cancelled'
WHERE status = 'cancelado';

-- ============================================================================
-- 2. NORMALIZAR STATUS EN PARTNERS (vendedores/socios)
-- ============================================================================
UPDATE partners
SET status = 'active'
WHERE status = 'activo';

UPDATE partners
SET status = 'pending'
WHERE status = 'pendiente';

UPDATE partners
SET status = 'suspended'
WHERE status = 'suspendido';

UPDATE partners
SET status = 'inactive'
WHERE status = 'inactivo';

-- ============================================================================
-- 3. NORMALIZAR STATUS EN USER_LEGAL_ISSUES (casos judiciales)
-- ============================================================================
UPDATE user_legal_issues
SET status = 'active'
WHERE status = 'activo';

UPDATE user_legal_issues
SET status = 'closed'
WHERE status = 'cerrado';

UPDATE user_legal_issues
SET status = 'resolved'
WHERE status = 'resuelto';

-- ============================================================================
-- 4. VERIFICACIÓN - Contar registros por status después de migración
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN POST-MIGRACIÓN ===';
    RAISE NOTICE 'Companies status counts:';
END $$;

SELECT 'companies' as table_name, status, COUNT(*) as count
FROM companies
GROUP BY status
ORDER BY status;

SELECT 'partners' as table_name, status, COUNT(*) as count
FROM partners
GROUP BY status
ORDER BY status;

-- ============================================================================
-- ROLLBACK (si es necesario revertir):
-- UPDATE companies SET status = 'activo' WHERE status = 'active';
-- UPDATE partners SET status = 'activo' WHERE status = 'active';
-- UPDATE user_legal_issues SET status = 'activo' WHERE status = 'active';
-- ============================================================================
