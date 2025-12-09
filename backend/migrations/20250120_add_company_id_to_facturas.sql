/**
 * ============================================================================
 * MIGRACIÓN: Agregar company_id a siac_facturas
 * ============================================================================
 *
 * Agrega la columna company_id a la tabla siac_facturas para soportar
 * multi-tenancy en el sistema de facturación.
 *
 * CRÍTICO: Esta columna permite que:
 * - Aponnt (company_id = 1) facture a empresas
 * - Empresas (company_id > 1) facturen a sus clientes
 *
 * Created: 2025-01-20
 */

\echo ''
\echo '🔧 [MIGRATION] Agregando company_id a siac_facturas...'
\echo ''

-- Step 1: Add company_id column
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1;

\echo '   ✅ Columna company_id agregada'

-- Step 2: Create index for company_id queries
CREATE INDEX IF NOT EXISTS idx_siac_facturas_company
ON siac_facturas(company_id);

\echo '   ✅ Índice idx_siac_facturas_company creado'

-- Step 3: Add FK constraint to companies table
ALTER TABLE siac_facturas
ADD CONSTRAINT fk_siac_facturas_company
FOREIGN KEY (company_id) REFERENCES companies(company_id);

\echo '   ✅ FK constraint a companies agregado'

-- Step 4: Update existing data to use company from caja (if any exists in future)
-- This is safe because table is empty, but good to have for future
-- UPDATE siac_facturas f
-- SET company_id = c.company_id
-- FROM siac_cajas ca
-- JOIN companies c ON ca.company_id = c.company_id
-- WHERE f.caja_id = ca.id AND f.company_id IS NULL;

\echo ''
\echo '✅ [MIGRATION] Migración completada exitosamente'
\echo '   • Columna: company_id INTEGER NOT NULL'
\echo '   • Índice: idx_siac_facturas_company'
\echo '   • FK: companies(company_id)'
\echo ''
