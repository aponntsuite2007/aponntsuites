-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Hacer campos opcionales en contracts
-- Fecha: 2026-02-01
-- Razón: Contratos pueden crearse desde Quote (sin budget_id) o sin vendedor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. budget_id opcional (contratos desde Quotes no tienen budget)
ALTER TABLE contracts ALTER COLUMN budget_id DROP NOT NULL;

-- 2. seller_id opcional (ventas directas sin comisión)
ALTER TABLE contracts ALTER COLUMN seller_id DROP NOT NULL;

-- 3. Verificar cambios
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name IN ('budget_id', 'seller_id');
