-- =================================================================
-- WMS AUTO DEFAULTS TRIGGERS
-- Crea automáticamente:
-- 1. Sucursal "Central" al crear empresa
-- 2. Almacén "Depósito 1" al activar módulo WMS
-- =================================================================

-- Función: Crear sucursal Central cuando se crea una empresa
CREATE OR REPLACE FUNCTION create_default_branch()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si no existe ya una sucursal para esta empresa
    IF NOT EXISTS (
        SELECT 1 FROM wms_branches WHERE company_id = NEW.company_id
    ) THEN
        INSERT INTO wms_branches (
            company_id, code, name, address, city, state_province,
            country_id, is_headquarters, is_active, created_at
        ) VALUES (
            NEW.company_id, 'CENTRAL', 'Central',
            COALESCE(NEW.address, 'Dirección Principal'),
            'Ciudad', 'Provincia',
            1, true, true, NOW()
        );
        RAISE NOTICE 'WMS: Sucursal Central creada para empresa %', NEW.company_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en companies
DROP TRIGGER IF EXISTS trg_create_default_branch ON companies;
CREATE TRIGGER trg_create_default_branch
    AFTER INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION create_default_branch();

-- Función: Crear almacén Depósito 1 cuando se activa WMS
CREATE OR REPLACE FUNCTION create_default_warehouse()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id INTEGER;
    v_warehouse_id INTEGER;
    v_zone_id INTEGER;
    v_module_key VARCHAR;
BEGIN
    -- Obtener module_key del módulo activado
    SELECT module_key INTO v_module_key
    FROM system_modules
    WHERE id = NEW.system_module_id;

    -- Solo si es el módulo warehouse-management y está activo
    IF v_module_key = 'warehouse-management' AND NEW.is_active = true THEN

        -- Buscar sucursal de la empresa (o crear si no existe)
        SELECT id INTO v_branch_id
        FROM wms_branches
        WHERE company_id = NEW.company_id
        ORDER BY is_headquarters DESC, created_at ASC
        LIMIT 1;

        -- Si no hay sucursal, crear una
        IF v_branch_id IS NULL THEN
            INSERT INTO wms_branches (
                company_id, code, name, address, city, state_province,
                country_id, is_headquarters, is_active, created_at
            ) VALUES (
                NEW.company_id, 'CENTRAL', 'Central',
                'Dirección Principal', 'Ciudad', 'Provincia',
                1, true, true, NOW()
            )
            RETURNING id INTO v_branch_id;

            RAISE NOTICE 'WMS: Sucursal Central creada para empresa %', NEW.company_id;
        END IF;

        -- Verificar si ya existe un almacén para esta sucursal
        IF NOT EXISTS (
            SELECT 1 FROM wms_warehouses WHERE branch_id = v_branch_id
        ) THEN
            -- Crear almacén Depósito 1
            INSERT INTO wms_warehouses (
                branch_id, code, name, warehouse_type, rotation_policy,
                track_batches, track_serial_numbers, track_expiry,
                allows_negative_stock, is_active, created_at
            ) VALUES (
                v_branch_id, 'DEP-001', 'Depósito 1', 'general', 'FIFO',
                true, false, true,
                false, true, NOW()
            )
            RETURNING id INTO v_warehouse_id;

            RAISE NOTICE 'WMS: Almacén Depósito 1 creado (ID: %)', v_warehouse_id;

            -- Crear zona General
            INSERT INTO wms_warehouse_zones (
                warehouse_id, code, name, zone_type, is_active, created_at
            ) VALUES (
                v_warehouse_id, 'GENERAL', 'Zona General', 'storage', true, NOW()
            )
            RETURNING id INTO v_zone_id;

            RAISE NOTICE 'WMS: Zona General creada (ID: %)', v_zone_id;

            -- Crear ubicación inicial A-01-01
            INSERT INTO wms_locations (
                zone_id, code, name, aisle, rack, level, position,
                location_type, max_weight_kg, is_active, created_at
            ) VALUES (
                v_zone_id, 'A-01-01', 'Ubicación A-01-01', 'A', '01', '01', '01',
                'rack', 1000.00, true, NOW()
            );

            RAISE NOTICE 'WMS: Ubicación A-01-01 creada';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en company_modules
DROP TRIGGER IF EXISTS trg_create_default_warehouse ON company_modules;
CREATE TRIGGER trg_create_default_warehouse
    AFTER INSERT OR UPDATE OF is_active ON company_modules
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION create_default_warehouse();

-- También trigger para active_modules en companies (si se actualiza directo)
CREATE OR REPLACE FUNCTION check_wms_in_active_modules()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id INTEGER;
    v_warehouse_id INTEGER;
    v_zone_id INTEGER;
BEGIN
    -- Solo si active_modules contiene warehouse-management y antes no lo tenía
    IF NEW.active_modules::text LIKE '%warehouse-management%'
       AND (OLD.active_modules IS NULL OR OLD.active_modules::text NOT LIKE '%warehouse-management%') THEN

        -- Buscar sucursal
        SELECT id INTO v_branch_id
        FROM wms_branches
        WHERE company_id = NEW.company_id
        ORDER BY is_headquarters DESC, created_at ASC
        LIMIT 1;

        -- Crear sucursal si no existe
        IF v_branch_id IS NULL THEN
            INSERT INTO wms_branches (
                company_id, code, name, address, city, state_province,
                country_id, is_headquarters, is_active, created_at
            ) VALUES (
                NEW.company_id, 'CENTRAL', 'Central',
                COALESCE(NEW.address, 'Dirección Principal'),
                'Ciudad', 'Provincia', 1, true, true, NOW()
            )
            RETURNING id INTO v_branch_id;
        END IF;

        -- Crear almacén si no existe
        IF NOT EXISTS (SELECT 1 FROM wms_warehouses WHERE branch_id = v_branch_id) THEN
            INSERT INTO wms_warehouses (
                branch_id, code, name, warehouse_type, rotation_policy,
                track_batches, track_serial_numbers, track_expiry,
                allows_negative_stock, is_active, created_at
            ) VALUES (
                v_branch_id, 'DEP-001', 'Depósito 1', 'general', 'FIFO',
                true, false, true, false, true, NOW()
            )
            RETURNING id INTO v_warehouse_id;

            -- Zona
            INSERT INTO wms_warehouse_zones (
                warehouse_id, code, name, zone_type, is_active, created_at
            ) VALUES (v_warehouse_id, 'GENERAL', 'Zona General', 'storage', true, NOW())
            RETURNING id INTO v_zone_id;

            -- Ubicación
            INSERT INTO wms_locations (
                zone_id, code, name, aisle, rack, level, position,
                location_type, max_weight_kg, is_active, created_at
            ) VALUES (
                v_zone_id, 'A-01-01', 'Ubicación A-01-01', 'A', '01', '01', '01',
                'rack', 1000.00, true, NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_wms_in_active_modules ON companies;
CREATE TRIGGER trg_check_wms_in_active_modules
    AFTER UPDATE OF active_modules ON companies
    FOR EACH ROW
    EXECUTE FUNCTION check_wms_in_active_modules();

-- Verificar triggers creados
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_%wms%' OR trigger_name LIKE 'trg_create_default%'
ORDER BY event_object_table;
