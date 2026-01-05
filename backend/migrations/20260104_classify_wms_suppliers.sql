-- =====================================================
-- CLASIFICACIÓN DE WMS_SUPPLIERS
-- =====================================================
-- Fecha: 2026-01-04
-- Propósito: Agregar clasificación de tipo de proveedor
-- =====================================================

BEGIN;

-- Agregar columnas de clasificación
ALTER TABLE wms_suppliers
ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(30) DEFAULT 'standard' CHECK (supplier_type IN ('standard', 'aponnt_associate')),
ADD COLUMN IF NOT EXISTS aponnt_associate_id UUID REFERENCES aponnt_associates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS aponnt_commission_percent DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_marketplace_provider BOOLEAN GENERATED ALWAYS AS (supplier_type = 'aponnt_associate' AND aponnt_associate_id IS NOT NULL) STORED;

-- Comentarios
COMMENT ON COLUMN wms_suppliers.supplier_type IS 'standard = proveedor normal de empresa | aponnt_associate = asociado del marketplace Aponnt';
COMMENT ON COLUMN wms_suppliers.aponnt_associate_id IS 'Si el proveedor es un asociado Aponnt, referencia a aponnt_associates';
COMMENT ON COLUMN wms_suppliers.aponnt_commission_percent IS 'Porcentaje de comisión que cobra Aponnt en cada factura (solo marketplace)';
COMMENT ON COLUMN wms_suppliers.is_marketplace_provider IS 'Columna computada: true si es proveedor del marketplace Aponnt';

-- Índices
CREATE INDEX IF NOT EXISTS idx_wms_suppliers_type ON wms_suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_wms_suppliers_aponnt_associate ON wms_suppliers(aponnt_associate_id) WHERE aponnt_associate_id IS NOT NULL;

-- Vista consolidada: Proveedores del marketplace con datos del asociado
CREATE OR REPLACE VIEW v_marketplace_providers AS
SELECT
    ws.id as supplier_id,
    ws.name as supplier_business_name,
    ws.supplier_type,
    ws.aponnt_commission_percent,

    -- Datos del asociado
    aa.id as associate_id,
    aa.first_name,
    aa.last_name,
    aa.email,
    aa.phone,
    aa.category as associate_category,
    aa.specialty,
    aa.hourly_rate as associate_hourly_rate,
    aa.rating_average,
    aa.rating_count,
    aa.contracts_completed,
    aa.is_verified as associate_verified,

    -- Datos comerciales
    ws.tax_id,
    ws.bank_name,
    ws.bank_account_number,
    ws.bank_account_type,

    -- Empresas que lo contratan
    (
        SELECT json_agg(json_build_object(
            'company_id', c.company_id,
            'company_name', c.name,
            'contract_status', cac.status,
            'start_date', cac.start_date,
            'end_date', cac.end_date
        ))
        FROM company_associate_contracts cac
        JOIN companies c ON cac.company_id = c.company_id
        WHERE cac.associate_id = aa.id
    ) as contracted_companies,

    ws.created_at,
    aa.updated_at

FROM wms_suppliers ws
JOIN aponnt_associates aa ON ws.aponnt_associate_id = aa.id
WHERE ws.supplier_type = 'aponnt_associate'
  AND ws.aponnt_associate_id IS NOT NULL;

COMMENT ON VIEW v_marketplace_providers IS 'Vista de proveedores del marketplace Aponnt con datos del asociado y empresas contratantes';

COMMIT;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Clasificación de proveedores agregada a wms_suppliers';
    RAISE NOTICE '   📋 supplier_type: standard | aponnt_associate';
    RAISE NOTICE '   🔗 aponnt_associate_id: Relación con aponnt_associates';
    RAISE NOTICE '   💰 aponnt_commission_percent: Comisión marketplace';
    RAISE NOTICE '   📊 Vista v_marketplace_providers creada';
END $$;
