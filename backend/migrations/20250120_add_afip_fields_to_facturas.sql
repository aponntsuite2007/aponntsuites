/**
 * ============================================================================
 * MIGRACIÓN: Agregar campos AFIP a siac_facturas
 * ============================================================================
 *
 * Agrega campos necesarios para integración completa con AFIP:
 * - Punto de venta AFIP
 * - Tipo de comprobante AFIP (código numérico)
 * - Número de comprobante AFIP
 * - Estado de proceso AFIP
 * - Observaciones de AFIP
 * - CUIT del cliente
 * - Datos adicionales para WSFEv1
 *
 * Created: 2025-01-20
 */

\echo ''
\echo '🏛️ [AFIP] Agregando campos AFIP a siac_facturas...'
\echo ''

-- CAMPOS PARA INTEGRACIÓN AFIP

-- Punto de venta AFIP (1-9999)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS punto_venta INTEGER;

-- Tipo de comprobante según códigos AFIP (1=Fact A, 6=Fact B, 11=Fact C, etc.)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS tipo_comprobante_afip INTEGER;

-- Número de comprobante AFIP (sin formato, solo número)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS numero_comprobante BIGINT;

-- Estado del proceso AFIP
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS estado_afip VARCHAR(20) DEFAULT 'PENDIENTE';

-- Observaciones retornadas por AFIP
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS observaciones_afip TEXT;

-- CUIT del cliente (requerido para facturas A)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS cliente_cuit VARCHAR(13);

-- Concepto de facturación AFIP (1=Productos, 2=Servicios, 3=Productos y Servicios)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS concepto INTEGER DEFAULT 1;

-- Moneda (PES, DOL, etc.)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'PES';

-- Cotización (tipo de cambio, default 1 para pesos)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS cotizacion NUMERIC(10,4) DEFAULT 1;

-- Fecha de inicio de servicios (solo para concepto=2 o 3)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS fecha_servicio_desde DATE;

-- Fecha de fin de servicios (solo para concepto=2 o 3)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS fecha_servicio_hasta DATE;

-- Items de la factura (JSON con detalle completo)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';

-- Impuestos calculados (JSON con detalle de IVA, percepciones, etc.)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS impuestos JSONB DEFAULT '[]';

-- Invoice number completo (ej: FAC-A-0001-00000123)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

\echo '   ✅ Campos AFIP agregados a siac_facturas'

-- CREAR ÍNDICES PARA PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_facturas_punto_venta
ON siac_facturas(company_id, punto_venta);

CREATE INDEX IF NOT EXISTS idx_facturas_tipo_afip
ON siac_facturas(tipo_comprobante_afip);

CREATE INDEX IF NOT EXISTS idx_facturas_estado_afip
ON siac_facturas(estado_afip);

CREATE INDEX IF NOT EXISTS idx_facturas_cae
ON siac_facturas(cae) WHERE cae IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_cliente_cuit
ON siac_facturas(cliente_cuit) WHERE cliente_cuit IS NOT NULL;

\echo '   ✅ Índices creados'

-- CONSTRAINT PARA VALIDAR CUIT (formato XX-XXXXXXXX-X)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_cliente_cuit'
    ) THEN
        ALTER TABLE siac_facturas
        ADD CONSTRAINT valid_cliente_cuit
        CHECK (cliente_cuit IS NULL OR cliente_cuit ~ '^\d{2}-\d{8}-\d{1}$');
    END IF;
END $$;

\echo '   ✅ Constraint de validación de CUIT agregada'

-- RENOMBRAR CAMPO EXISTENTE fecha_vencimiento_cae a cae_vencimiento
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'siac_facturas' AND column_name = 'fecha_vencimiento_cae'
    ) THEN
        ALTER TABLE siac_facturas RENAME COLUMN fecha_vencimiento_cae TO cae_vencimiento;
        RAISE NOTICE '   ✅ Campo fecha_vencimiento_cae renombrado a cae_vencimiento';
    END IF;
END $$;

-- COMENTARIOS EN CAMPOS (DOCUMENTACIÓN)
COMMENT ON COLUMN siac_facturas.punto_venta IS 'Punto de venta AFIP (1-9999)';
COMMENT ON COLUMN siac_facturas.tipo_comprobante_afip IS 'Código AFIP: 1=Fact A, 6=Fact B, 11=Fact C';
COMMENT ON COLUMN siac_facturas.numero_comprobante IS 'Número de comprobante AFIP (sin formato)';
COMMENT ON COLUMN siac_facturas.estado_afip IS 'PENDIENTE, APROBADO, RECHAZADO, ERROR';
COMMENT ON COLUMN siac_facturas.cliente_cuit IS 'CUIT del cliente (formato XX-XXXXXXXX-X)';
COMMENT ON COLUMN siac_facturas.concepto IS '1=Productos, 2=Servicios, 3=Productos y Servicios';
COMMENT ON COLUMN siac_facturas.moneda IS 'Código de moneda: PES, DOL, EUR, etc.';
COMMENT ON COLUMN siac_facturas.items IS 'Array JSON con items de la factura';
COMMENT ON COLUMN siac_facturas.impuestos IS 'Array JSON con impuestos calculados (IVA, percepciones)';

\echo ''
\echo '✅ [AFIP] Migración completada exitosamente'
\echo ''
\echo '📋 Campos agregados:'
\echo '   - punto_venta (INTEGER)'
\echo '   - tipo_comprobante_afip (INTEGER)'
\echo '   - numero_comprobante (BIGINT)'
\echo '   - estado_afip (VARCHAR)'
\echo '   - observaciones_afip (TEXT)'
\echo '   - cliente_cuit (VARCHAR)'
\echo '   - concepto (INTEGER)'
\echo '   - moneda (VARCHAR)'
\echo '   - cotizacion (NUMERIC)'
\echo '   - fecha_servicio_desde/hasta (DATE)'
\echo '   - items (JSONB)'
\echo '   - impuestos (JSONB)'
\echo '   - invoice_number (VARCHAR)'
\echo ''
