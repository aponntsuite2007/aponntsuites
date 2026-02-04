-- Migration: Add unit_cost to wms_stock table
-- Date: 2026-02-04
-- Description: Adds the unit_cost column to wms_stock for warehouse value calculations

-- Add unit_cost to wms_stock if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_stock' AND column_name = 'unit_cost'
    ) THEN
        ALTER TABLE wms_stock ADD COLUMN unit_cost NUMERIC(15,4) DEFAULT 0;
        RAISE NOTICE 'Added unit_cost column to wms_stock';
    ELSE
        RAISE NOTICE 'unit_cost column already exists in wms_stock';
    END IF;
END $$;

-- Also ensure wms_stock_batches has unit_cost
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_stock_batches' AND column_name = 'unit_cost'
    ) THEN
        ALTER TABLE wms_stock_batches ADD COLUMN unit_cost NUMERIC(15,4) DEFAULT 0;
        RAISE NOTICE 'Added unit_cost column to wms_stock_batches';
    ELSE
        RAISE NOTICE 'unit_cost column already exists in wms_stock_batches';
    END IF;
END $$;

-- Also ensure wms_stock_movements has unit_cost
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_stock_movements' AND column_name = 'unit_cost'
    ) THEN
        ALTER TABLE wms_stock_movements ADD COLUMN unit_cost NUMERIC(15,4) DEFAULT 0;
        RAISE NOTICE 'Added unit_cost column to wms_stock_movements';
    ELSE
        RAISE NOTICE 'unit_cost column already exists in wms_stock_movements';
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wms_stock_unit_cost ON wms_stock(unit_cost);
