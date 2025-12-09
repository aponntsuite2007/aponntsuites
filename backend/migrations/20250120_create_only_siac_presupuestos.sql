/**
 * MIGRACIÓN: siac_presupuestos (ÚNICAMENTE)
 *
 * CONTEXTO:
 * - siac_productos YA EXISTE ✅
 * - siac_facturas YA EXISTE ✅
 * - siac_clientes YA EXISTE ✅
 *
 * FALTANTE:
 * - siac_presupuestos ❌ (esta migración)
 *
 * Tabla para presupuestos/cotizaciones con soporte para 3 MODOS DE FACTURACIÓN:
 * - OCASIONAL: Presupuesto que se factura UNA VEZ
 * - RECURRENTE: Presupuesto que se factura periódicamente
 * - MANUAL: No aplica (factura directa sin presupuesto)
 *
 * Created: 2025-01-20
 */

BEGIN;

-- ========================================
-- 1. CREAR TABLA siac_presupuestos
-- ========================================
CREATE TABLE IF NOT EXISTS siac_presupuestos (
    id SERIAL PRIMARY KEY,

    -- Vinculación con SIAC (multi-tenant + punto de venta)
    company_id INTEGER NOT NULL,
    -- Hereda el patrón de caja_id pero para presupuestos podemos simplificar
    -- Los presupuestos se generan a nivel empresa, no requieren caja específica

    -- Numeración del presupuesto
    numero_presupuesto VARCHAR(50) NOT NULL,
    -- Formato ejemplo: PRES-001-00001 (punto_venta - numero)

    prefijo VARCHAR(10),
    numero INTEGER NOT NULL,

    -- Cliente (reutiliza estructura de siac_facturas)
    cliente_id INTEGER,
    -- FK a siac_clientes.id (puede ser NULL si es interno)

    cliente_codigo VARCHAR(50),
    cliente_razon_social VARCHAR(200) NOT NULL,
    cliente_documento_tipo VARCHAR(10),
    cliente_documento_numero VARCHAR(20),
    cliente_direccion TEXT,
    cliente_telefono VARCHAR(50),
    cliente_email VARCHAR(100),
    cliente_condicion_iva VARCHAR(50) DEFAULT 'CONSUMIDOR_FINAL',

    -- Fechas del presupuesto
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_validez DATE,
    -- Fecha hasta la cual el presupuesto es válido para aceptación

    -- =============================================
    -- MODO DE FACTURACIÓN (CRÍTICO)
    -- =============================================
    tipo_facturacion VARCHAR(20) DEFAULT 'OCASIONAL',
    -- OCASIONAL: Se factura UNA VEZ cuando se aprueba
    -- RECURRENTE: Se factura periódicamente

    frecuencia_facturacion VARCHAR(20),
    -- MONTHLY, QUARTERLY, YEARLY
    -- Solo aplica si tipo_facturacion = 'RECURRENTE'

    fecha_inicio_facturacion DATE,
    fecha_fin_facturacion DATE,
    -- Solo para RECURRENTE

    proximo_periodo_facturacion DATE,
    -- Próximo período a facturar (actualizado automáticamente)

    -- =============================================
    -- ITEMS DEL PRESUPUESTO (JSONB)
    -- =============================================
    items JSONB NOT NULL DEFAULT '[]',
    /**
     * Estructura compatible con siac_productos:
     * [
     *   {
     *     "producto_id": 123,
     *     "codigo_producto": "MOD-USERS",
     *     "nombre_producto": "Módulo de Usuarios",
     *     "cantidad": 1,
     *     "precio_unitario": 25.00,
     *     "subtotal": 25.00
     *   }
     * ]
     */

    -- =============================================
    -- TOTALES (mismo patrón que siac_facturas)
    -- =============================================
    subtotal NUMERIC(12,2) DEFAULT 0,
    descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
    descuento_importe NUMERIC(12,2) DEFAULT 0,
    total_impuestos NUMERIC(12,2) DEFAULT 0,
    total_neto NUMERIC(12,2) DEFAULT 0,
    total_presupuesto NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- =============================================
    -- ESTADO DEL PRESUPUESTO
    -- =============================================
    estado VARCHAR(20) DEFAULT 'PENDIENTE',
    -- PENDIENTE: Creado, esperando aprobación
    -- APROBADO: Cliente aceptó
    -- RECHAZADO: Cliente rechazó
    -- VENCIDO: Pasó la fecha_validez sin aprobación
    -- FACTURADO: Ya se facturó (solo para OCASIONAL)
    -- ACTIVO: Facturación recurrente en curso (solo para RECURRENTE)
    -- FINALIZADO: Facturación recurrente terminada

    fecha_aprobacion TIMESTAMP,
    aprobado_por VARCHAR(255),

    -- =============================================
    -- TRACKING DE FACTURAS GENERADAS
    -- =============================================
    cantidad_facturas_generadas INTEGER DEFAULT 0,
    facturas_generadas JSONB DEFAULT '[]',
    /**
     * Array de invoice_ids generados:
     * [
     *   {
     *     "factura_id": 456,
     *     "numero_factura": "A-001-00000123",
     *     "period": "2025-01",
     *     "generated_at": "2025-01-05T10:30:00"
     *   }
     * ]
     */

    -- =============================================
    -- REFERENCIA A CONTRATO (caso Aponnt)
    -- =============================================
    contract_id UUID,
    -- FK a contracts.id (tabla del workflow de alta de empresa)
    -- Tipo UUID porque contracts.id es UUID

    -- Notas
    observaciones TEXT,
    notas_internas TEXT,
    terminos_condiciones TEXT,

    -- Metadata adicional
    configuracion_adicional JSONB DEFAULT '{}',
    -- Puede contener: trace_id (caso Aponnt), custom fields, etc.

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,

    -- Constraints
    CONSTRAINT fk_siac_presupuestos_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_siac_presupuestos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES siac_clientes(id)
        ON DELETE SET NULL,

    CONSTRAINT check_tipo_facturacion
        CHECK (tipo_facturacion IN ('OCASIONAL', 'RECURRENTE')),

    CONSTRAINT check_frecuencia_facturacion
        CHECK (
            frecuencia_facturacion IS NULL OR
            frecuencia_facturacion IN ('MONTHLY', 'QUARTERLY', 'YEARLY')
        ),

    CONSTRAINT check_estado_presupuesto
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'VENCIDO', 'FACTURADO', 'ACTIVO', 'FINALIZADO')),

    -- Si es RECURRENTE, DEBE tener frecuencia
    CONSTRAINT check_recurrente_tiene_frecuencia
        CHECK (
            tipo_facturacion != 'RECURRENTE' OR
            frecuencia_facturacion IS NOT NULL
        ),

    -- Numeración única por empresa
    CONSTRAINT siac_presupuestos_numero_unico
        UNIQUE (company_id, prefijo, numero)
);

-- ========================================
-- 2. ÍNDICES
-- ========================================
CREATE INDEX idx_siac_presupuestos_company ON siac_presupuestos(company_id);
CREATE INDEX idx_siac_presupuestos_cliente ON siac_presupuestos(cliente_id);
CREATE INDEX idx_siac_presupuestos_estado ON siac_presupuestos(estado);
CREATE INDEX idx_siac_presupuestos_tipo_facturacion ON siac_presupuestos(tipo_facturacion);
CREATE INDEX idx_siac_presupuestos_numero ON siac_presupuestos(numero_presupuesto);
CREATE INDEX idx_siac_presupuestos_proximo_periodo ON siac_presupuestos(proximo_periodo_facturacion);
CREATE INDEX idx_siac_presupuestos_contract ON siac_presupuestos(contract_id);
CREATE INDEX idx_siac_presupuestos_fecha_emision ON siac_presupuestos(fecha_emision);

-- Índice para el cron job de facturación automática
CREATE INDEX idx_siac_presupuestos_auto_billing ON siac_presupuestos(tipo_facturacion, estado, proximo_periodo_facturacion)
    WHERE tipo_facturacion = 'RECURRENTE' AND estado = 'ACTIVO';

-- ========================================
-- 3. TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION update_siac_presupuestos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_siac_presupuestos_timestamp
    BEFORE UPDATE ON siac_presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION update_siac_presupuestos_timestamp();

-- ========================================
-- 4. MODIFICAR siac_facturas (agregar vínculo a presupuesto)
-- ========================================
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS presupuesto_id INTEGER,
ADD CONSTRAINT fk_siac_facturas_presupuesto
    FOREIGN KEY (presupuesto_id)
    REFERENCES siac_presupuestos(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_siac_facturas_presupuesto ON siac_facturas(presupuesto_id);

COMMENT ON COLUMN siac_facturas.presupuesto_id IS 'ID del presupuesto que originó esta factura (NULL si es factura manual directa)';

-- ========================================
-- 5. FUNCIONES HELPER
-- ========================================

-- Función: Avanzar al próximo período de facturación
CREATE OR REPLACE FUNCTION avanzar_proximo_periodo(
    p_presupuesto_id INTEGER
)
RETURNS DATE AS $$
DECLARE
    v_presupuesto RECORD;
    v_nuevo_periodo DATE;
BEGIN
    SELECT * INTO v_presupuesto
    FROM siac_presupuestos
    WHERE id = p_presupuesto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Presupuesto no encontrado: %', p_presupuesto_id;
    END IF;

    IF v_presupuesto.tipo_facturacion != 'RECURRENTE' THEN
        RAISE EXCEPTION 'Solo aplica a presupuestos RECURRENTE';
    END IF;

    CASE v_presupuesto.frecuencia_facturacion
        WHEN 'MONTHLY' THEN
            v_nuevo_periodo := v_presupuesto.proximo_periodo_facturacion + INTERVAL '1 month';
        WHEN 'QUARTERLY' THEN
            v_nuevo_periodo := v_presupuesto.proximo_periodo_facturacion + INTERVAL '3 months';
        WHEN 'YEARLY' THEN
            v_nuevo_periodo := v_presupuesto.proximo_periodo_facturacion + INTERVAL '1 year';
        ELSE
            RAISE EXCEPTION 'Frecuencia no válida: %', v_presupuesto.frecuencia_facturacion;
    END CASE;

    UPDATE siac_presupuestos
    SET proximo_periodo_facturacion = v_nuevo_periodo,
        cantidad_facturas_generadas = cantidad_facturas_generadas + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_presupuesto_id;

    RETURN v_nuevo_periodo;
END;
$$ LANGUAGE plpgsql;

-- Función: Registrar factura generada desde presupuesto
CREATE OR REPLACE FUNCTION registrar_factura_generada(
    p_presupuesto_id INTEGER,
    p_factura_id INTEGER,
    p_numero_factura VARCHAR(50),
    p_period VARCHAR(20)
)
RETURNS VOID AS $$
DECLARE
    v_nuevo_registro JSONB;
BEGIN
    v_nuevo_registro := jsonb_build_object(
        'factura_id', p_factura_id,
        'numero_factura', p_numero_factura,
        'period', p_period,
        'generated_at', CURRENT_TIMESTAMP
    );

    UPDATE siac_presupuestos
    SET facturas_generadas = facturas_generadas || v_nuevo_registro
    WHERE id = p_presupuesto_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener presupuestos listos para facturar (cron job)
CREATE OR REPLACE FUNCTION get_presupuestos_para_facturar()
RETURNS TABLE (
    presupuesto_id INTEGER,
    company_id INTEGER,
    numero_presupuesto VARCHAR(50),
    cliente_razon_social VARCHAR(200),
    proximo_periodo DATE,
    frecuencia VARCHAR(20),
    total_presupuesto NUMERIC(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.company_id,
        p.numero_presupuesto,
        p.cliente_razon_social,
        p.proximo_periodo_facturacion,
        p.frecuencia_facturacion,
        p.total_presupuesto
    FROM siac_presupuestos p
    WHERE p.tipo_facturacion = 'RECURRENTE'
      AND p.estado = 'ACTIVO'
      AND p.proximo_periodo_facturacion <= CURRENT_DATE
      AND (p.fecha_fin_facturacion IS NULL OR p.fecha_fin_facturacion >= CURRENT_DATE)
    ORDER BY p.proximo_periodo_facturacion ASC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. COMENTARIOS
-- ========================================
COMMENT ON TABLE siac_presupuestos IS 'Presupuestos/cotizaciones multi-tenant con soporte para facturación OCASIONAL (1 vez) o RECURRENTE (periódica). Se integra con siac_facturas vía presupuesto_id.';
COMMENT ON COLUMN siac_presupuestos.tipo_facturacion IS 'OCASIONAL = factura 1 vez | RECURRENTE = factura periódicamente';
COMMENT ON COLUMN siac_presupuestos.items IS 'Array JSONB de productos/servicios del presupuesto (compatible con siac_productos)';
COMMENT ON COLUMN siac_presupuestos.facturas_generadas IS 'Tracking de todas las facturas generadas desde este presupuesto';

COMMIT;
