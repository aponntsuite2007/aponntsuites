/**
 * MIGRACIÓN SIMPLIFICADA: siac_presupuestos
 * Tabla SIN FK constraints inline (se agregan después con ALTER TABLE)
 */

BEGIN;

-- Crear tabla sin FK constraints
CREATE TABLE IF NOT EXISTS siac_presupuestos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    numero_presupuesto VARCHAR(50) NOT NULL,
    prefijo VARCHAR(10),
    numero INTEGER NOT NULL,

    -- Cliente
    cliente_id INTEGER,
    cliente_codigo VARCHAR(50),
    cliente_razon_social VARCHAR(200) NOT NULL,
    cliente_documento_tipo VARCHAR(10),
    cliente_documento_numero VARCHAR(20),
    cliente_direccion TEXT,
    cliente_telefono VARCHAR(50),
    cliente_email VARCHAR(100),
    cliente_condicion_iva VARCHAR(50) DEFAULT 'CONSUMIDOR_FINAL',

    -- Fechas
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_validez DATE,

    -- Modo de facturación
    tipo_facturacion VARCHAR(20) DEFAULT 'OCASIONAL',
    frecuencia_facturacion VARCHAR(20),
    fecha_inicio_facturacion DATE,
    fecha_fin_facturacion DATE,
    proximo_periodo_facturacion DATE,

    -- Items (JSONB)
    items JSONB NOT NULL DEFAULT '[]',

    -- Totales
    subtotal NUMERIC(12,2) DEFAULT 0,
    descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
    descuento_importe NUMERIC(12,2) DEFAULT 0,
    total_impuestos NUMERIC(12,2) DEFAULT 0,
    total_neto NUMERIC(12,2) DEFAULT 0,
    total_presupuesto NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Estado
    estado VARCHAR(20) DEFAULT 'PENDIENTE',
    fecha_aprobacion TIMESTAMP,
    aprobado_por VARCHAR(255),

    -- Tracking facturas
    cantidad_facturas_generadas INTEGER DEFAULT 0,
    facturas_generadas JSONB DEFAULT '[]',

    -- Referencia a contrato
    contract_id UUID,

    -- Notas
    observaciones TEXT,
    notas_internas TEXT,
    terminos_condiciones TEXT,
    configuracion_adicional JSONB DEFAULT '{}',

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,

    -- Constraints CHECK
    CONSTRAINT check_tipo_facturacion
        CHECK (tipo_facturacion IN ('OCASIONAL', 'RECURRENTE')),
    CONSTRAINT check_frecuencia_facturacion
        CHECK (frecuencia_facturacion IS NULL OR frecuencia_facturacion IN ('MONTHLY', 'QUARTERLY', 'YEARLY')),
    CONSTRAINT check_estado_presupuesto
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'VENCIDO', 'FACTURADO', 'ACTIVO', 'FINALIZADO')),
    CONSTRAINT check_recurrente_tiene_frecuencia
        CHECK (tipo_facturacion != 'RECURRENTE' OR frecuencia_facturacion IS NOT NULL),
    CONSTRAINT siac_presupuestos_numero_unico
        UNIQUE (company_id, prefijo, numero)
);

-- Crear índices
CREATE INDEX idx_siac_presupuestos_company ON siac_presupuestos(company_id);
CREATE INDEX idx_siac_presupuestos_cliente ON siac_presupuestos(cliente_id);
CREATE INDEX idx_siac_presupuestos_estado ON siac_presupuestos(estado);
CREATE INDEX idx_siac_presupuestos_tipo_facturacion ON siac_presupuestos(tipo_facturacion);
CREATE INDEX idx_siac_presupuestos_numero ON siac_presupuestos(numero_presupuesto);
CREATE INDEX idx_siac_presupuestos_proximo_periodo ON siac_presupuestos(proximo_periodo_facturacion);
CREATE INDEX idx_siac_presupuestos_contract ON siac_presupuestos(contract_id);
CREATE INDEX idx_siac_presupuestos_fecha_emision ON siac_presupuestos(fecha_emision);
CREATE INDEX idx_siac_presupuestos_auto_billing ON siac_presupuestos(tipo_facturacion, estado, proximo_periodo_facturacion)
    WHERE tipo_facturacion = 'RECURRENTE' AND estado = 'ACTIVO';

-- Trigger updated_at
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

-- Agregar FK constraints con ALTER TABLE
ALTER TABLE siac_presupuestos
    ADD CONSTRAINT fk_siac_presupuestos_company
        FOREIGN KEY (company_id)
        REFERENCES companies(company_id)
        ON DELETE CASCADE;

ALTER TABLE siac_presupuestos
    ADD CONSTRAINT fk_siac_presupuestos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES siac_clientes(id)
        ON DELETE SET NULL;

-- Modificar siac_facturas (agregar presupuesto_id)
ALTER TABLE siac_facturas
    ADD COLUMN IF NOT EXISTS presupuesto_id INTEGER;

ALTER TABLE siac_facturas
    ADD CONSTRAINT fk_siac_facturas_presupuesto
        FOREIGN KEY (presupuesto_id)
        REFERENCES siac_presupuestos(id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_siac_facturas_presupuesto ON siac_facturas(presupuesto_id);

-- Funciones helper
CREATE OR REPLACE FUNCTION avanzar_proximo_periodo(p_presupuesto_id INTEGER)
RETURNS DATE AS $$
DECLARE
    v_presupuesto RECORD;
    v_nuevo_periodo DATE;
BEGIN
    SELECT * INTO v_presupuesto FROM siac_presupuestos WHERE id = p_presupuesto_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Presupuesto no encontrado: %', p_presupuesto_id; END IF;
    IF v_presupuesto.tipo_facturacion != 'RECURRENTE' THEN RAISE EXCEPTION 'Solo aplica a presupuestos RECURRENTE'; END IF;

    CASE v_presupuesto.frecuencia_facturacion
        WHEN 'MONTHLY' THEN v_nuevo_periodo := v_presupuesto.proximo_periodo_facturacion + INTERVAL '1 month';
        WHEN 'QUARTERLY' THEN v_nuevo_periodo := v_presupuesto.proximo_periodo_facturacion + INTERVAL '3 months';
        WHEN 'YEARLY' THEN v_nuevo_periodo := v_presupuesto.proximo_periodo_facturacion + INTERVAL '1 year';
        ELSE RAISE EXCEPTION 'Frecuencia no válida: %', v_presupuesto.frecuencia_facturacion;
    END CASE;

    UPDATE siac_presupuestos
    SET proximo_periodo_facturacion = v_nuevo_periodo,
        cantidad_facturas_generadas = cantidad_facturas_generadas + 1
    WHERE id = p_presupuesto_id;

    RETURN v_nuevo_periodo;
END;
$$ LANGUAGE plpgsql;

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
    UPDATE siac_presupuestos SET facturas_generadas = facturas_generadas || v_nuevo_registro WHERE id = p_presupuesto_id;
END;
$$ LANGUAGE plpgsql;

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
    SELECT p.id, p.company_id, p.numero_presupuesto, p.cliente_razon_social,
           p.proximo_periodo_facturacion, p.frecuencia_facturacion, p.total_presupuesto
    FROM siac_presupuestos p
    WHERE p.tipo_facturacion = 'RECURRENTE'
      AND p.estado = 'ACTIVO'
      AND p.proximo_periodo_facturacion <= CURRENT_DATE
      AND (p.fecha_fin_facturacion IS NULL OR p.fecha_fin_facturacion >= CURRENT_DATE)
    ORDER BY p.proximo_periodo_facturacion ASC;
END;
$$ LANGUAGE plpgsql;

COMMIT;
