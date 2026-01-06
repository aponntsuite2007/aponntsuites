-- =====================================================
-- SISTEMA DE ADJUNTOS Y CLASIFICACIÓN DE ÓRDENES
-- Portal de Proveedores - Mejoras Críticas
-- =====================================================
-- Fecha: 2026-01-05
-- Propósito:
--   1. Discriminar SERVICIO vs PRODUCTO
--   2. Adjuntos CONTRACTUALES vs ORIENTATIVOS
--   3. Imputación contable automática
--   4. Adjuntos empresa → proveedor
-- =====================================================

BEGIN;

-- ============================================================================
-- PARTE 1: DISCRIMINACIÓN SERVICIO vs PRODUCTO
-- ============================================================================

-- 1.1 Agregar tipo de orden a purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'product' CHECK (order_type IN ('product', 'service', 'mixed'));

COMMENT ON COLUMN purchase_orders.order_type IS 'Tipo de orden: product (materias primas, repuestos), service (tornería, mantenimiento), mixed (ambos)';

-- 1.2 Agregar tipo de item a purchase_order_items
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'product' CHECK (item_type IN ('product', 'service'));

COMMENT ON COLUMN purchase_order_items.item_type IS 'Tipo de item: product o service (define imputación contable)';

-- 1.3 Agregar tipo de item a rfq_items
ALTER TABLE rfq_items
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'product' CHECK (item_type IN ('product', 'service'));

COMMENT ON COLUMN rfq_items.item_type IS 'Tipo de item solicitado: product o service';

-- ============================================================================
-- PARTE 2: IMPUTACIÓN CONTABLE AUTOMÁTICA
-- ============================================================================

-- 2.1 Agregar categoría contable a items
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS accounting_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS accounting_account_id INTEGER;

COMMENT ON COLUMN purchase_order_items.accounting_category IS 'Categoría contable: MATERIA_PRIMA, REPUESTOS, SERVICIOS_TORNERIA, SERVICIOS_MANTENIMIENTO, etc.';
COMMENT ON COLUMN purchase_order_items.accounting_account_id IS 'ID de cuenta contable del plan de cuentas (finance_chart_of_accounts)';

-- 2.2 Agregar categoría contable a rfq_items
ALTER TABLE rfq_items
ADD COLUMN IF NOT EXISTS accounting_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS accounting_account_id INTEGER;

-- 2.3 Crear índice para búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_poi_accounting_category ON purchase_order_items(accounting_category);
CREATE INDEX IF NOT EXISTS idx_rfqi_accounting_category ON rfq_items(accounting_category);

-- ============================================================================
-- PARTE 3: ADJUNTOS EMPRESA → PROVEEDOR (CONTRACTUALES)
-- ============================================================================

-- 3.1 Crear tabla de adjuntos enviados por la empresa al proveedor
CREATE TABLE IF NOT EXISTS rfq_company_attachments (
    id BIGSERIAL PRIMARY KEY,
    rfq_id BIGINT NOT NULL REFERENCES request_for_quotations(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Datos del archivo
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Clasificación CRÍTICA del adjunto
    attachment_type VARCHAR(20) NOT NULL DEFAULT 'informative' CHECK (attachment_type IN ('contractual', 'informative')),
    binding_level VARCHAR(20) NOT NULL DEFAULT 'orientative' CHECK (binding_level IN ('strict', 'orientative')),

    -- Avisos legales y contractuales
    legal_notice TEXT,
    contract_clause TEXT,
    deviation_allowed BOOLEAN DEFAULT false,
    deviation_tolerance VARCHAR(100), -- "±5%", "color puede variar", etc.

    -- Consecuencias contractuales
    non_compliance_action VARCHAR(20) DEFAULT 'payment_rejection' CHECK (non_compliance_action IN ('payment_rejection', 'partial_payment', 'claim', 'warning')),
    non_compliance_notice TEXT,

    -- Metadata
    description TEXT,
    is_required BOOLEAN DEFAULT false, -- Proveedor DEBE descargarlo
    downloaded_by_supplier BOOLEAN DEFAULT false,
    downloaded_at TIMESTAMPTZ,
    supplier_acknowledged BOOLEAN DEFAULT false, -- Proveedor aceptó términos
    acknowledged_at TIMESTAMPTZ,

    -- Integración con DMS
    dms_document_id INTEGER,

    -- Auditoría
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_rfq_comp_att_rfq ON rfq_company_attachments(rfq_id);
CREATE INDEX idx_rfq_comp_att_company ON rfq_company_attachments(company_id);
CREATE INDEX idx_rfq_comp_att_type ON rfq_company_attachments(attachment_type);
CREATE INDEX idx_rfq_comp_att_binding ON rfq_company_attachments(binding_level);

-- Comentarios
COMMENT ON TABLE rfq_company_attachments IS 'Adjuntos enviados por la EMPRESA al proveedor en RFQs (planos, especificaciones, etc.)';
COMMENT ON COLUMN rfq_company_attachments.attachment_type IS 'contractual: vinculante, informative: solo referencia';
COMMENT ON COLUMN rfq_company_attachments.binding_level IS 'strict: debe cumplirse exactamente, orientative: puede variar';
COMMENT ON COLUMN rfq_company_attachments.legal_notice IS 'Aviso legal mostrado al proveedor: "Pieza debe ser exacta según plano. Variaciones invalidan pago."';
COMMENT ON COLUMN rfq_company_attachments.non_compliance_action IS 'Acción si proveedor no cumple: rechazo de pago, pago parcial, reclamo';

-- ============================================================================
-- PARTE 4: ACTUALIZAR TABLA DE ADJUNTOS DE PROVEEDOR
-- ============================================================================

-- 4.1 Agregar campos de reconocimiento a rfq_attachments
ALTER TABLE rfq_attachments
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20) DEFAULT 'informative' CHECK (attachment_type IN ('quotation_document', 'technical_specs', 'sample_photo', 'certificate', 'other')),
ADD COLUMN IF NOT EXISTS is_response_to_requirement BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS company_attachment_id BIGINT REFERENCES rfq_company_attachments(id);

COMMENT ON COLUMN rfq_attachments.attachment_type IS 'Tipo de adjunto del proveedor: documento de cotización, specs técnicas, fotos, certificados';
COMMENT ON COLUMN rfq_attachments.is_response_to_requirement IS 'TRUE si es respuesta a un adjunto contractual de la empresa';
COMMENT ON COLUMN rfq_attachments.company_attachment_id IS 'ID del adjunto de la empresa al que responde (si aplica)';

-- ============================================================================
-- PARTE 5: ADJUNTOS EN ÓRDENES DE COMPRA (EMPRESA → PROVEEDOR)
-- ============================================================================

-- 5.1 Crear tabla de adjuntos en órdenes de compra
CREATE TABLE IF NOT EXISTS purchase_order_attachments (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Datos del archivo
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Tipo de adjunto en orden de compra
    attachment_type VARCHAR(20) NOT NULL DEFAULT 'purchase_order_copy' CHECK (attachment_type IN ('purchase_order_copy', 'technical_spec', 'delivery_instructions', 'quality_requirements', 'other')),
    binding_level VARCHAR(20) NOT NULL DEFAULT 'orientative' CHECK (binding_level IN ('strict', 'orientative')),

    -- Avisos
    legal_notice TEXT,
    is_required BOOLEAN DEFAULT false,

    -- Tracking proveedor
    downloaded_by_supplier BOOLEAN DEFAULT false,
    downloaded_at TIMESTAMPTZ,

    -- DMS
    dms_document_id INTEGER,

    -- Auditoría
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_att_po ON purchase_order_attachments(purchase_order_id);
CREATE INDEX idx_po_att_company ON purchase_order_attachments(company_id);

COMMENT ON TABLE purchase_order_attachments IS 'Adjuntos enviados por la empresa al proveedor en Órdenes de Compra';

-- ============================================================================
-- PARTE 6: FACTURAS DE PROVEEDOR (PROVEEDOR → EMPRESA)
-- ============================================================================

-- 6.1 Actualizar supplier_invoices con validación de adjuntos
ALTER TABLE supplier_invoices
ADD COLUMN IF NOT EXISTS invoice_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_validation_notes TEXT,
ADD COLUMN IF NOT EXISTS validated_by INTEGER,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

COMMENT ON COLUMN supplier_invoices.invoice_required IS 'TRUE si se requiere factura para pagar';
COMMENT ON COLUMN supplier_invoices.invoice_validated IS 'TRUE si factura fue validada por empresa';

-- ============================================================================
-- PARTE 7: FUNCIONES HELPER
-- ============================================================================

-- 7.1 Función para obtener adjuntos contractuales de un RFQ
CREATE OR REPLACE FUNCTION get_rfq_contractual_attachments(p_rfq_id BIGINT)
RETURNS TABLE (
    attachment_id BIGINT,
    file_name VARCHAR,
    file_path TEXT,
    binding_level VARCHAR,
    legal_notice TEXT,
    is_required BOOLEAN,
    downloaded_by_supplier BOOLEAN,
    supplier_acknowledged BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id,
        rfq_company_attachments.file_name,
        file_path,
        rfq_company_attachments.binding_level,
        rfq_company_attachments.legal_notice,
        is_required,
        rfq_company_attachments.downloaded_by_supplier,
        rfq_company_attachments.supplier_acknowledged
    FROM rfq_company_attachments
    WHERE rfq_id = p_rfq_id
      AND attachment_type = 'contractual'
    ORDER BY is_required DESC, created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 7.2 Función para verificar si proveedor descargó adjuntos requeridos
CREATE OR REPLACE FUNCTION check_supplier_downloaded_required_attachments(p_rfq_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_required_count INTEGER;
    v_downloaded_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_required_count
    FROM rfq_company_attachments
    WHERE rfq_id = p_rfq_id AND is_required = true;

    SELECT COUNT(*) INTO v_downloaded_count
    FROM rfq_company_attachments
    WHERE rfq_id = p_rfq_id
      AND is_required = true
      AND downloaded_by_supplier = true;

    RETURN v_required_count = v_downloaded_count;
END;
$$ LANGUAGE plpgsql;

-- 7.3 Función para calcular orden type según items
CREATE OR REPLACE FUNCTION calculate_order_type(p_po_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_has_products BOOLEAN;
    v_has_services BOOLEAN;
BEGIN
    SELECT bool_or(item_type = 'product') INTO v_has_products
    FROM purchase_order_items
    WHERE purchase_order_id = p_po_id;

    SELECT bool_or(item_type = 'service') INTO v_has_services
    FROM purchase_order_items
    WHERE purchase_order_id = p_po_id;

    IF v_has_products AND v_has_services THEN
        RETURN 'mixed';
    ELSIF v_has_services THEN
        RETURN 'service';
    ELSE
        RETURN 'product';
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- MENSAJE FINAL
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Adjuntos y Clasificación completado';
    RAISE NOTICE '';
    RAISE NOTICE '📦 PARTE 1: Discriminación SERVICIO vs PRODUCTO';
    RAISE NOTICE '   - Campo order_type en purchase_orders';
    RAISE NOTICE '   - Campo item_type en purchase_order_items y rfq_items';
    RAISE NOTICE '';
    RAISE NOTICE '💰 PARTE 2: Imputación Contable';
    RAISE NOTICE '   - Campo accounting_category en items';
    RAISE NOTICE '   - Campo accounting_account_id en items';
    RAISE NOTICE '';
    RAISE NOTICE '📎 PARTE 3: Adjuntos EMPRESA → PROVEEDOR';
    RAISE NOTICE '   - Tabla rfq_company_attachments (adjuntos contractuales)';
    RAISE NOTICE '   - Clasificación: contractual vs informative';
    RAISE NOTICE '   - Nivel: strict vs orientative';
    RAISE NOTICE '   - Avisos legales y consecuencias';
    RAISE NOTICE '';
    RAISE NOTICE '📄 PARTE 4: Adjuntos PROVEEDOR → EMPRESA';
    RAISE NOTICE '   - rfq_attachments ampliado con tipos';
    RAISE NOTICE '   - Referencia a adjuntos de empresa';
    RAISE NOTICE '';
    RAISE NOTICE '🔖 PARTE 5: Adjuntos en Órdenes de Compra';
    RAISE NOTICE '   - Tabla purchase_order_attachments';
    RAISE NOTICE '';
    RAISE NOTICE '🧾 PARTE 6: Validación de Facturas';
    RAISE NOTICE '   - supplier_invoices ampliado con validación';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  PARTE 7: Funciones Helper';
    RAISE NOTICE '   - get_rfq_contractual_attachments()';
    RAISE NOTICE '   - check_supplier_downloaded_required_attachments()';
    RAISE NOTICE '   - calculate_order_type()';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Listo para usar en Portal de Proveedores';
END $$;
