-- ============================================================================
-- WMS PRODUCTS - CAMPOS ENTERPRISE ADICIONALES
-- Campos fiscales, comercio exterior y control avanzado
-- ============================================================================

-- 1. CAMPOS FISCALES Y ARANCELARIOS
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS iva_type VARCHAR(20) DEFAULT 'gravado';
-- gravado, exento, no_gravado, gravado_reducido

ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS iva_rate DECIMAL(5,2) DEFAULT 21.00;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS internal_tax_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS perception_iva_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS perception_iibb_rate DECIMAL(5,2) DEFAULT 0;

-- Codigos arancelarios (comercio exterior)
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS ncm_code VARCHAR(20); -- Nomenclatura Comun MERCOSUR
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS hs_code VARCHAR(20); -- Harmonized System code
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(3); -- ISO 3166-1 alpha-3
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS customs_tariff_rate DECIMAL(6,2);

-- 2. DATOS DE PROVEEDOR AMPLIADOS
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS manufacturer_name VARCHAR(200);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS manufacturer_code VARCHAR(50);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS alternate_part_number VARCHAR(100);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS oem_code VARCHAR(100); -- Original Equipment Manufacturer

-- 3. CERTIFICACIONES Y CALIDAD
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
-- Ej: [{"type": "ISO9001", "valid_until": "2025-12-31"}, {"type": "IRAM", "number": "12345"}]

ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS quality_inspection_required BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS quality_inspection_type VARCHAR(50);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS quality_inspection_frequency VARCHAR(20); -- each, lot, periodic
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS quality_hold_days INTEGER DEFAULT 0;

-- 4. DATOS DE LOGISTICA AVANZADOS
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS handling_instructions TEXT;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS storage_zone_type VARCHAR(30);
-- ambient, refrigerated, frozen, hazmat, controlled_temperature, high_value

ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS is_hazardous BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS hazmat_class VARCHAR(20);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS hazmat_un_number VARCHAR(10);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS hazmat_packing_group VARCHAR(10);

ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS requires_fifo BOOLEAN DEFAULT true;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS requires_fefo BOOLEAN DEFAULT false; -- First Expired First Out
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS shelf_life_percent_for_receipt INTEGER DEFAULT 75;
-- Porcentaje minimo de vida util para aceptar en recepcion

-- 5. DATOS DE PLANIFICACION DE COMPRAS
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS criticality_level VARCHAR(10) DEFAULT 'normal';
-- critical, high, normal, low

ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS economic_order_qty DECIMAL(15,3);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS reorder_qty DECIMAL(15,3);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS purchasing_cycle_days INTEGER;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS preferred_supplier_id INTEGER REFERENCES wms_suppliers(id);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS alternate_supplier_ids INTEGER[];
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS last_purchase_date DATE;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS avg_purchase_price DECIMAL(15,4);

-- 6. DATOS DE VENTA Y COMERCIALIZACION
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS sales_unit_measure_id INTEGER REFERENCES wms_units_of_measure(id);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(15,6) DEFAULT 1;
-- Ej: se compra en cajas de 12, se vende por unidad -> factor = 12

ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS suggested_retail_price DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS minimum_sale_price DECIMAL(15,4);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS target_margin_percent DECIMAL(5,2);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS allows_fractional_sales BOOLEAN DEFAULT false;

-- 7. CONTROL DE OBSOLESCENCIA
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) DEFAULT 'active';
-- active, phasing_out, discontinued, obsolete

ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS phase_out_date DATE;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS replacement_product_id INTEGER REFERENCES wms_products(id);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS last_sale_date DATE;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS days_without_movement INTEGER;

-- 8. CAMPOS DE BUSQUEDA Y CLASIFICACION
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS tags VARCHAR(500);
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS keywords TEXT;
ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;
-- Atributos personalizables por tipo de producto

-- 9. INDICES PARA NUEVOS CAMPOS
CREATE INDEX IF NOT EXISTS idx_wms_products_ncm ON wms_products(ncm_code) WHERE ncm_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_products_hs ON wms_products(hs_code) WHERE hs_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_products_lifecycle ON wms_products(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_wms_products_critical ON wms_products(is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_wms_products_hazmat ON wms_products(is_hazardous) WHERE is_hazardous = true;
CREATE INDEX IF NOT EXISTS idx_wms_products_preferred_supplier ON wms_products(preferred_supplier_id);

-- 10. TABLA DE TIPOS DE ALMACEN
CREATE TABLE IF NOT EXISTS wms_warehouse_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    storage_conditions JSONB, -- temperatura, humedad, etc.
    required_certifications VARCHAR(200)[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar tipos de almacen predefinidos
INSERT INTO wms_warehouse_types (code, name, description, storage_conditions) VALUES
('MATERIA_PRIMA', 'Materias Primas', 'Almacen de insumos para produccion', '{"type": "ambient"}'),
('PRODUCTO_TERMINADO', 'Producto Terminado', 'Almacen de productos listos para venta', '{"type": "ambient"}'),
('REPUESTOS', 'Repuestos y Partes', 'Almacen de repuestos de maquinaria', '{"type": "ambient"}'),
('HERRAMIENTAS', 'Herramientas y Equipos', 'Panel de herramientas y equipos', '{"type": "ambient"}'),
('REFRIGERADO', 'Camara Frigorifica', 'Almacen con temperatura controlada', '{"type": "refrigerated", "temp_min": 0, "temp_max": 8}'),
('CONGELADO', 'Camara de Congelados', 'Almacen de congelados', '{"type": "frozen", "temp_min": -25, "temp_max": -18}'),
('HAZMAT', 'Materiales Peligrosos', 'Almacen de sustancias peligrosas', '{"type": "hazmat", "requires_certification": true}'),
('ALTO_VALOR', 'Alto Valor', 'Almacen de productos de alto valor', '{"type": "high_security"}'),
('TRANSITO', 'Transito/Cross-Dock', 'Zona de cross-docking', '{"type": "transit"}'),
('DEVOLUCION', 'Devoluciones', 'Almacen de productos devueltos', '{"type": "returns"}'),
('MAQUINARIA', 'Maquinaria Pesada', 'Almacen de maquinaria y equipos grandes', '{"type": "heavy_equipment"}'),
('QUIMICOS', 'Productos Quimicos', 'Almacen de productos quimicos no peligrosos', '{"type": "chemical"}')
ON CONFLICT (code) DO NOTHING;

-- Agregar tipo de almacen a warehouses
ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS warehouse_type_id INTEGER REFERENCES wms_warehouse_types(id);

-- 11. VISTA DE PRODUCTOS CON TODA LA INFORMACION
CREATE OR REPLACE VIEW v_wms_products_complete AS
SELECT
    p.*,
    c.name as category_name,
    b.name as brand_name,
    s.name as supplier_name,
    u.code as unit_code,
    u.name as unit_name,
    ps.name as preferred_supplier_name,
    su.code as sales_unit_code,
    wt.name as warehouse_type_name,
    COALESCE(stock.total_qty, 0) as total_stock_qty,
    COALESCE(stock.total_value, 0) as total_stock_value,
    COALESCE(stock.warehouses_count, 0) as warehouses_with_stock
FROM wms_products p
LEFT JOIN wms_categories c ON p.category_id = c.id
LEFT JOIN wms_brands b ON p.brand_id = b.id
LEFT JOIN wms_suppliers s ON p.supplier_id = s.id
LEFT JOIN wms_units_of_measure u ON p.unit_of_measure_id = u.id
LEFT JOIN wms_suppliers ps ON p.preferred_supplier_id = ps.id
LEFT JOIN wms_units_of_measure su ON p.sales_unit_measure_id = su.id
LEFT JOIN wms_warehouses w ON p.warehouse_id = w.id
LEFT JOIN wms_warehouse_types wt ON w.warehouse_type_id = wt.id
LEFT JOIN (
    SELECT product_id,
           SUM(quantity_on_hand) as total_qty,
           SUM(total_value) as total_value,
           COUNT(DISTINCT warehouse_id) as warehouses_count
    FROM wms_stock
    GROUP BY product_id
) stock ON p.id = stock.product_id;

-- 12. FUNCION PARA DETECTAR PRODUCTOS OBSOLETOS
CREATE OR REPLACE FUNCTION wms_update_obsolete_products() RETURNS void AS $$
BEGIN
    -- Marcar productos sin movimiento en 180 dias como "phasing_out"
    UPDATE wms_products
    SET lifecycle_status = 'phasing_out',
        days_without_movement = EXTRACT(DAY FROM NOW() - COALESCE(last_sale_date, created_at))
    WHERE lifecycle_status = 'active'
      AND last_sale_date < NOW() - INTERVAL '180 days'
      AND is_active = true;

    -- Marcar productos sin movimiento en 365 dias como "discontinued"
    UPDATE wms_products
    SET lifecycle_status = 'discontinued',
        days_without_movement = EXTRACT(DAY FROM NOW() - COALESCE(last_sale_date, created_at))
    WHERE lifecycle_status IN ('active', 'phasing_out')
      AND last_sale_date < NOW() - INTERVAL '365 days'
      AND is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE wms_warehouse_types IS 'Tipos de almacen: materias primas, producto terminado, refrigerado, etc.';
COMMENT ON COLUMN wms_products.ncm_code IS 'Codigo NCM (Nomenclatura Comun MERCOSUR) para comercio exterior';
COMMENT ON COLUMN wms_products.hs_code IS 'Codigo HS (Harmonized System) para aduana internacional';
COMMENT ON COLUMN wms_products.lifecycle_status IS 'Estado del ciclo de vida: active, phasing_out, discontinued, obsolete';
