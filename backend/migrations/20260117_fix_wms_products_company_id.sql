-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Agregar company_id a wms_products
-- Fecha: 2026-01-17
-- Problema: El backend intenta insertar company_id pero la tabla no lo tiene
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Agregar columna company_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_products' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE wms_products ADD COLUMN company_id INTEGER;

        -- Actualizar registros existentes con el company_id del warehouse
        UPDATE wms_products p
        SET company_id = (
            SELECT b.company_id
            FROM wms_warehouses w
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE w.id = p.warehouse_id
            LIMIT 1
        )
        WHERE company_id IS NULL AND warehouse_id IS NOT NULL;

        -- Agregar constraint NOT NULL después de poblar
        -- ALTER TABLE wms_products ALTER COLUMN company_id SET NOT NULL;

        -- Agregar índice
        CREATE INDEX IF NOT EXISTS idx_wms_products_company ON wms_products(company_id);

        RAISE NOTICE 'Columna company_id agregada a wms_products';
    ELSE
        RAISE NOTICE 'Columna company_id ya existe en wms_products';
    END IF;
END $$;

-- 2. Verificar y agregar columna quantity a wms_stock si falta
DO $$
BEGIN
    -- La tabla usa quantity_on_hand, pero si alguna query busca quantity, crear un alias
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_stock' AND column_name = 'quantity'
    ) THEN
        -- Agregar columna quantity como alias de quantity_on_hand
        ALTER TABLE wms_stock ADD COLUMN quantity DECIMAL(15,4) GENERATED ALWAYS AS (quantity_on_hand) STORED;
        RAISE NOTICE 'Columna quantity agregada a wms_stock como computed column';
    ELSE
        RAISE NOTICE 'Columna quantity ya existe en wms_stock';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error agregando quantity: %, continuando...', SQLERRM;
END $$;

-- 3. Verificar estructura final
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('wms_products', 'wms_stock')
AND column_name IN ('company_id', 'quantity', 'quantity_on_hand')
ORDER BY table_name, column_name;
