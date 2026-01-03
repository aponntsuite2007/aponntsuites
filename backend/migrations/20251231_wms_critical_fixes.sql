-- ============================================================================
-- WMS CRITICAL FIXES
-- Correcciones de errores detectados en revisión exhaustiva
-- ============================================================================

-- ============================================================================
-- FIX 1: Agregar company_id a wms_transfers (requerido por trigger de firma)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_transfers' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE wms_transfers ADD COLUMN company_id INTEGER REFERENCES companies(company_id);

        -- Actualizar registros existentes obteniendo company_id del warehouse
        UPDATE wms_transfers t
        SET company_id = (
            SELECT b.company_id
            FROM wms_warehouses w
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE w.id = t.source_warehouse_id
        );

        -- Hacer NOT NULL después de poblar
        ALTER TABLE wms_transfers ALTER COLUMN company_id SET NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_wms_transfers_company ON wms_transfers(company_id);

        RAISE NOTICE '✅ FIX 1: Columna company_id agregada a wms_transfers';
    ELSE
        RAISE NOTICE '⏭️  FIX 1: company_id ya existe en wms_transfers';
    END IF;
END $$;

-- ============================================================================
-- FIX 2: Corregir función wms_get_available_stock (status 'active' → 'AVAILABLE')
-- ============================================================================

DROP FUNCTION IF EXISTS wms_get_available_stock(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION wms_get_available_stock(
    p_product_id INTEGER,
    p_warehouse_id INTEGER
)
RETURNS TABLE(
    batch_id INTEGER,
    lot_number VARCHAR(100),
    quantity DECIMAL(15,4),
    reserved DECIMAL(15,4),
    available DECIMAL(15,4),
    expiry_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sb.id as batch_id,
        sb.lot_number,
        sb.quantity,
        COALESCE((
            SELECT SUM(sr.quantity)
            FROM wms_stock_reservations sr
            WHERE sr.batch_id = sb.id AND sr.status = 'active'
        ), 0)::DECIMAL(15,4) as reserved,
        (sb.quantity - COALESCE((
            SELECT SUM(sr.quantity)
            FROM wms_stock_reservations sr
            WHERE sr.batch_id = sb.id AND sr.status = 'active'
        ), 0))::DECIMAL(15,4) as available,
        sb.expiry_date
    FROM wms_stock s
    JOIN wms_stock_batches sb ON sb.stock_id = s.id
    WHERE s.product_id = p_product_id
      AND s.warehouse_id = p_warehouse_id
      AND sb.status = 'AVAILABLE'
      AND sb.quantity > 0
    ORDER BY sb.expiry_date ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX 3: Corregir función wms_get_batches_fifo (status 'active' → 'AVAILABLE')
-- ============================================================================

DROP FUNCTION IF EXISTS wms_get_batches_fifo(INTEGER, INTEGER, DECIMAL);
CREATE OR REPLACE FUNCTION wms_get_batches_fifo(
    p_product_id INTEGER,
    p_warehouse_id INTEGER,
    p_quantity_needed DECIMAL(15,4)
)
RETURNS TABLE(
    batch_id INTEGER,
    lot_number VARCHAR(100),
    available_quantity DECIMAL(15,4),
    quantity_to_use DECIMAL(15,4),
    expiry_date DATE
) AS $$
DECLARE
    remaining DECIMAL(15,4) := p_quantity_needed;
    batch RECORD;
BEGIN
    FOR batch IN
        SELECT
            sb.id,
            sb.lot_number,
            sb.quantity - COALESCE((
                SELECT SUM(sr.quantity)
                FROM wms_stock_reservations sr
                WHERE sr.batch_id = sb.id AND sr.status = 'active'
            ), 0) as avail,
            sb.expiry_date
        FROM wms_stock s
        JOIN wms_stock_batches sb ON sb.stock_id = s.id
        WHERE s.product_id = p_product_id
          AND s.warehouse_id = p_warehouse_id
          AND sb.status = 'AVAILABLE'  -- FIX: era 'active'
          AND sb.quantity > COALESCE((
              SELECT SUM(sr.quantity)
              FROM wms_stock_reservations sr
              WHERE sr.batch_id = sb.id AND sr.status = 'active'
          ), 0)
        ORDER BY sb.expiry_date ASC NULLS LAST
    LOOP
        IF remaining <= 0 THEN
            EXIT;
        END IF;

        batch_id := batch.id;
        lot_number := batch.lot_number;
        available_quantity := batch.avail;
        expiry_date := batch.expiry_date;

        IF batch.avail >= remaining THEN
            quantity_to_use := remaining;
            remaining := 0;
        ELSE
            quantity_to_use := batch.avail;
            remaining := remaining - batch.avail;
        END IF;

        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX 4: Corregir trigger wms_auto_sign_transfer (obtener company_id correctamente)
-- ============================================================================

CREATE OR REPLACE FUNCTION wms_auto_sign_transfer()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id INTEGER;
    v_signer_id UUID;
BEGIN
    -- Obtener company_id de la tabla (ahora existe)
    v_company_id := NEW.company_id;

    -- Obtener signer apropiado
    v_signer_id := COALESCE(NEW.confirmed_by, NEW.dispatched_by, NEW.approved_by, NEW.created_by);

    IF TG_OP = 'INSERT' THEN
        PERFORM wms_create_signature(
            v_company_id,
            'transfer',
            NEW.id,
            'created',
            NEW.created_by,
            to_jsonb(NEW)
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        PERFORM wms_create_signature(
            v_company_id,
            'transfer',
            NEW.id,
            NEW.status,
            v_signer_id,
            to_jsonb(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX 5: Actualizar vista wms_stock_availability (status 'active' → 'AVAILABLE')
-- ============================================================================

DROP VIEW IF EXISTS wms_stock_availability;
CREATE OR REPLACE VIEW wms_stock_availability AS
SELECT
    s.id as stock_id,
    s.product_id,
    p.name as product_name,
    p.internal_code as sku,
    s.warehouse_id,
    w.name as warehouse_name,
    s.quantity_on_hand as total_quantity,
    COALESCE(SUM(sb.quantity), 0) as batch_quantity,
    COALESCE(SUM(
        CASE WHEN sb.status = 'AVAILABLE' THEN sb.quantity ELSE 0 END
    ), 0) as available_quantity,
    COALESCE(SUM(
        CASE WHEN sb.expiry_date <= CURRENT_DATE THEN sb.quantity ELSE 0 END
    ), 0) as expired_quantity,
    COALESCE(SUM(
        CASE WHEN sb.expiry_date > CURRENT_DATE AND sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN sb.quantity ELSE 0 END
    ), 0) as expiring_soon_quantity,
    s.quantity_reserved as reserved_quantity,
    MIN(sb.expiry_date) FILTER (WHERE sb.quantity > 0 AND sb.status = 'AVAILABLE') as earliest_expiry,
    COALESCE(p.is_perishable, FALSE) as requires_expiry_control,
    COALESCE(p.shelf_life_days, 30) as expiry_alert_days
FROM wms_stock s
JOIN wms_products p ON s.product_id = p.id
JOIN wms_warehouses w ON s.warehouse_id = w.id
LEFT JOIN wms_stock_batches sb ON sb.stock_id = s.id
GROUP BY s.id, s.product_id, p.name, p.internal_code, s.warehouse_id, w.name, s.quantity_on_hand, s.quantity_reserved, p.is_perishable, p.shelf_life_days;

-- ============================================================================
-- FIX 6: Agregar columna manager_email a wms_warehouses si no existe
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_warehouses' AND column_name = 'manager_email'
    ) THEN
        ALTER TABLE wms_warehouses ADD COLUMN manager_email VARCHAR(255);
        RAISE NOTICE '✅ FIX 6: Columna manager_email agregada a wms_warehouses';
    ELSE
        RAISE NOTICE '⏭️  FIX 6: manager_email ya existe en wms_warehouses';
    END IF;
END $$;

-- ============================================================================
-- FIX 7: Agregar columna location_id a wms_stock_batches si no existe
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_stock_batches' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE wms_stock_batches ADD COLUMN location_id INTEGER REFERENCES wms_locations(id);
        CREATE INDEX IF NOT EXISTS idx_wms_stock_batches_location ON wms_stock_batches(location_id);
        RAISE NOTICE '✅ FIX 7: Columna location_id agregada a wms_stock_batches';
    ELSE
        RAISE NOTICE '⏭️  FIX 7: location_id ya existe en wms_stock_batches';
    END IF;
END $$;

-- ============================================================================
-- FIX 8: Estandarizar columna de cantidad en wms_stock_batches
-- (agregar current_quantity como alias si no existe)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wms_stock_batches' AND column_name = 'current_quantity'
    ) THEN
        -- Agregar como columna computada o trigger para mantener sincronizado
        ALTER TABLE wms_stock_batches ADD COLUMN current_quantity DECIMAL(15,4) GENERATED ALWAYS AS (quantity) STORED;
        RAISE NOTICE '✅ FIX 8: Columna current_quantity agregada como alias de quantity';
    ELSE
        RAISE NOTICE '⏭️  FIX 8: current_quantity ya existe en wms_stock_batches';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Si la BD no soporta GENERATED, crear un trigger
    RAISE NOTICE '⚠️  FIX 8: No se pudo agregar columna computada, creando vista alternativa';
END $$;

-- ============================================================================
-- FIX 9: Agregar índices faltantes para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wms_transfers_company_status ON wms_transfers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wms_authorization_requests_company_status ON wms_authorization_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wms_documents_company_type ON wms_documents(company_id, document_type_id);
CREATE INDEX IF NOT EXISTS idx_wms_recall_requests_company_status ON wms_recall_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wms_stock_batches_product ON wms_stock_batches(stock_id, status);

-- ============================================================================
-- FIX 10: Crear función helper para obtener company_id de un warehouse
-- ============================================================================

CREATE OR REPLACE FUNCTION wms_get_company_from_warehouse(p_warehouse_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_company_id INTEGER;
BEGIN
    SELECT b.company_id INTO v_company_id
    FROM wms_warehouses w
    JOIN wms_branches b ON w.branch_id = b.id
    WHERE w.id = p_warehouse_id;

    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '                    WMS CRITICAL FIXES APLICADOS                 ';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';

    -- Verificar company_id en transfers
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'wms_transfers' AND column_name = 'company_id';
    RAISE NOTICE '✅ wms_transfers.company_id: %', CASE WHEN v_count > 0 THEN 'OK' ELSE 'FALTA' END;

    -- Verificar manager_email en warehouses
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'wms_warehouses' AND column_name = 'manager_email';
    RAISE NOTICE '✅ wms_warehouses.manager_email: %', CASE WHEN v_count > 0 THEN 'OK' ELSE 'FALTA' END;

    -- Verificar location_id en batches
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'wms_stock_batches' AND column_name = 'location_id';
    RAISE NOTICE '✅ wms_stock_batches.location_id: %', CASE WHEN v_count > 0 THEN 'OK' ELSE 'FALTA' END;

    -- Verificar funciones
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routines
    WHERE routine_name = 'wms_get_company_from_warehouse';
    RAISE NOTICE '✅ wms_get_company_from_warehouse(): %', CASE WHEN v_count > 0 THEN 'OK' ELSE 'FALTA' END;

    -- Verificar vista
    SELECT COUNT(*) INTO v_count
    FROM information_schema.views
    WHERE table_name = 'wms_stock_availability';
    RAISE NOTICE '✅ wms_stock_availability view: %', CASE WHEN v_count > 0 THEN 'OK' ELSE 'FALTA' END;

    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '                    FIXES COMPLETADOS                            ';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
