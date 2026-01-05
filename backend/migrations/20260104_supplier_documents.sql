-- =====================================================
-- SISTEMA DE DOCUMENTOS PARA PORTAL DE PROVEEDORES
-- =====================================================
-- Fecha: 2026-01-04
-- Propósito: Gestión de adjuntos RFQ y facturas
-- =====================================================

BEGIN;

-- Tabla de adjuntos en cotizaciones (RFQ)
CREATE TABLE IF NOT EXISTS rfq_attachments (
    id BIGSERIAL PRIMARY KEY,
    rfq_id BIGINT NOT NULL REFERENCES request_for_quotations(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,

    -- Datos del archivo
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Integración con DMS
    dms_document_id INTEGER,  -- Referencia opcional al DMS

    -- Metadata
    description TEXT,
    uploaded_by INTEGER,  -- ID del usuario del portal que subió
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_rfq_attachments_rfq ON rfq_attachments(rfq_id);
CREATE INDEX idx_rfq_attachments_supplier ON rfq_attachments(supplier_id);

-- Comentarios
COMMENT ON TABLE rfq_attachments IS 'Adjuntos subidos por proveedores en sus cotizaciones';
COMMENT ON COLUMN rfq_attachments.dms_document_id IS 'ID del documento en el sistema DMS (opcional)';

-- Agregar columnas a supplier_invoices si no existen
ALTER TABLE supplier_invoices
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS dms_document_id INTEGER,
ADD COLUMN IF NOT EXISTS uploaded_by INTEGER,
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

-- Comentarios
COMMENT ON COLUMN supplier_invoices.file_name IS 'Archivo PDF de la factura subido por el proveedor';
COMMENT ON COLUMN supplier_invoices.dms_document_id IS 'ID del documento en el sistema DMS';

COMMIT;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de documentos para portal de proveedores creado';
    RAISE NOTICE '   📎 Tabla rfq_attachments: Adjuntos en cotizaciones';
    RAISE NOTICE '   📄 supplier_invoices: Ampliada con campos de archivos';
    RAISE NOTICE '   🔗 Integración con DMS opcional';
END $$;
