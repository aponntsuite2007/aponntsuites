/**
 * MIGRACIÓN: siac_presupuestos (Presupuestos/Cotizaciones)
 *
 * Tabla multi-tenant para presupuestos/cotizaciones.
 * Soporta 3 MODOS DE FACTURACIÓN:
 * - OCASIONAL: Presupuesto que se factura UNA VEZ (ej: proyecto puntual)
 * - RECURRENTE: Presupuesto que se factura periódicamente (ej: servicio mensual)
 * - N/A: Si la factura es MANUAL (sin presupuesto previo)
 *
 * USOS:
 * - Aponnt: Presupuestos a empresas que contratan módulos (RECURRENTE típicamente)
 * - Empresas: Presupuestos a SUS clientes (OCASIONAL o RECURRENTE según el servicio)
 *
 * Created: 2025-01-20
 */

-- Crear tabla siac_presupuestos
CREATE TABLE IF NOT EXISTS siac_presupuestos (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    company_id INTEGER NOT NULL,
    -- company_id = 1 (Aponnt) → Presupuestos a empresas que contratan
    -- company_id > 1 → Presupuestos de empresas a SUS clientes

    -- Numeración
    numero_presupuesto VARCHAR(50),
    -- Formato: PRES-2025-00001, QUOTE-2025-00042, etc.

    -- Cliente (referencia)
    cliente_id INTEGER,
    -- Puede ser NULL si es presupuesto interno
    -- Si company_id = 1 (Aponnt) → cliente_id apunta a companies.id
    -- Si company_id > 1 (Empresas) → cliente_id apunta a siac_clientes.id

    cliente_nombre VARCHAR(255),
    -- Desnormalizado para historicidad

    cliente_email VARCHAR(255),
    cliente_telefono VARCHAR(50),
    cliente_direccion TEXT,

    -- Información del presupuesto
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_validez DATE,
    -- Fecha hasta la cual el presupuesto es válido para aceptación

    -- =============================================
    -- MODO DE FACTURACIÓN (CRÍTICO)
    -- =============================================
    tipo_facturacion VARCHAR(20) DEFAULT 'OCASIONAL',
    -- OCASIONAL: Se factura UNA VEZ cuando se aprueba el presupuesto
    -- RECURRENTE: Se factura periódicamente según frecuencia_facturacion

    frecuencia_facturacion VARCHAR(20),
    -- MONTHLY, QUARTERLY, YEARLY
    -- Solo aplica si tipo_facturacion = 'RECURRENTE'

    fecha_inicio_facturacion DATE,
    -- Fecha desde la cual comienza la facturación recurrente
    -- Solo aplica si tipo_facturacion = 'RECURRENTE'

    fecha_fin_facturacion DATE,
    -- Fecha hasta la cual se factura (puede ser NULL = indefinido)
    -- Solo aplica si tipo_facturacion = 'RECURRENTE'

    proximo_periodo_facturacion DATE,
    -- Próximo mes/trimestre/año a facturar
    -- Se actualiza automáticamente después de cada facturación
    -- Solo aplica si tipo_facturacion = 'RECURRENTE'

    cantidad_facturas_generadas INTEGER DEFAULT 0,
    -- Contador de facturas generadas desde este presupuesto

    facturas_generadas JSONB DEFAULT '[]',
    -- Array de invoice_ids generados desde este presupuesto
    -- Ejemplo: [{"invoice_id": 123, "period": "2025-01", "generated_at": "2025-01-05"}]

    -- Items del presupuesto
    items JSONB NOT NULL DEFAULT '[]',
    /**
     * Estructura:
     * [
     *   {
     *     "producto_id": 5,
     *     "codigo": "MOD-USERS",
     *     "nombre": "Módulo de Usuarios",
     *     "descripcion": "Gestión completa de usuarios",
     *     "cantidad": 1,
     *     "precio_unitario": 25.00,
     *     "subtotal": 25.00
     *   },
     *   {
     *     "producto_id": 8,
     *     "codigo": "MOD-ATTENDANCE",
     *     "nombre": "Módulo de Asistencia",
     *     "cantidad": 1,
     *     "precio_unitario": 300.00,
     *     "subtotal": 300.00
     *   }
     * ]
     */

    -- Totales
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    -- Suma de todos los items sin impuestos

    descuento_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    descuento_monto DECIMAL(15,2) DEFAULT 0.00,

    impuestos JSONB DEFAULT '[]',
    /**
     * Impuestos aplicados desde plantilla fiscal
     * [
     *   {
     *     "concepto_id": 10,
     *     "nombre": "IVA",
     *     "porcentaje": 21.00,
     *     "monto": 68.25
     *   },
     *   {
     *     "concepto_id": 11,
     *     "nombre": "IIBB",
     *     "porcentaje": 3.50,
     *     "monto": 11.38
     *   }
     * ]
     */

    total_impuestos DECIMAL(15,2) DEFAULT 0.00,
    total_general DECIMAL(15,2) NOT NULL DEFAULT 0.00,

    moneda VARCHAR(3) DEFAULT 'USD',
    -- USD, ARS, EUR, etc.

    -- Estado del presupuesto
    estado VARCHAR(20) DEFAULT 'PENDIENTE',
    -- PENDIENTE: Creado, esperando aprobación del cliente
    -- APROBADO: Cliente aceptó, listo para facturar
    -- RECHAZADO: Cliente rechazó
    -- VENCIDO: Pasó la fecha_validez sin aprobación
    -- FACTURADO: Ya se facturó (solo para OCASIONAL)
    -- ACTIVO: Facturación recurrente en curso (solo para RECURRENTE)
    -- FINALIZADO: Facturación recurrente terminada (llegó a fecha_fin_facturacion)

    fecha_aprobacion TIMESTAMP,
    aprobado_por VARCHAR(255),
    -- Nombre/email de quien aprobó

    -- Notas
    notas TEXT,
    terminos_condiciones TEXT,

    -- Referencia a contrato (si aplica)
    contract_id INTEGER,
    -- Si el presupuesto generó un contrato (caso Aponnt)
    -- FOREIGN KEY a contracts.id

    -- Metadata adicional
    metadata JSONB DEFAULT '{}',
    -- Puede contener: trace_id (caso Aponnt), custom fields, etc.

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id VARCHAR(255),

    -- Constraints
    CONSTRAINT fk_siac_presupuestos_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

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
        )
);

-- Índices
CREATE INDEX idx_siac_presupuestos_company ON siac_presupuestos(company_id);
CREATE INDEX idx_siac_presupuestos_cliente ON siac_presupuestos(cliente_id);
CREATE INDEX idx_siac_presupuestos_estado ON siac_presupuestos(estado);
CREATE INDEX idx_siac_presupuestos_tipo_facturacion ON siac_presupuestos(tipo_facturacion);
CREATE INDEX idx_siac_presupuestos_numero ON siac_presupuestos(numero_presupuesto);
CREATE INDEX idx_siac_presupuestos_proximo_periodo ON siac_presupuestos(proximo_periodo_facturacion);
CREATE INDEX idx_siac_presupuestos_contract ON siac_presupuestos(contract_id);

-- Índice para el cron job de facturación automática
-- Busca presupuestos RECURRENTES que están ACTIVOS y ya llegó su próximo período
CREATE INDEX idx_siac_presupuestos_auto_billing ON siac_presupuestos(tipo_facturacion, estado, proximo_periodo_facturacion)
    WHERE tipo_facturacion = 'RECURRENTE' AND estado = 'ACTIVO';

-- Trigger para updated_at
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

-- Función helper: Avanzar al próximo período de facturación
CREATE OR REPLACE FUNCTION avanzar_proximo_periodo(
    p_presupuesto_id INTEGER
)
RETURNS DATE AS $$
DECLARE
    v_presupuesto RECORD;
    v_nuevo_periodo DATE;
BEGIN
    -- Obtener presupuesto
    SELECT * INTO v_presupuesto
    FROM siac_presupuestos
    WHERE id = p_presupuesto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Presupuesto no encontrado: %', p_presupuesto_id;
    END IF;

    -- Solo aplica a RECURRENTE
    IF v_presupuesto.tipo_facturacion != 'RECURRENTE' THEN
        RAISE EXCEPTION 'Solo aplica a presupuestos RECURRENTE';
    END IF;

    -- Calcular nuevo período según frecuencia
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

    -- Actualizar presupuesto
    UPDATE siac_presupuestos
    SET proximo_periodo_facturacion = v_nuevo_periodo,
        cantidad_facturas_generadas = cantidad_facturas_generadas + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_presupuesto_id;

    RETURN v_nuevo_periodo;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Registrar factura generada
CREATE OR REPLACE FUNCTION registrar_factura_generada(
    p_presupuesto_id INTEGER,
    p_invoice_id INTEGER,
    p_period VARCHAR(20)
)
RETURNS VOID AS $$
DECLARE
    v_nuevo_registro JSONB;
BEGIN
    v_nuevo_registro := jsonb_build_object(
        'invoice_id', p_invoice_id,
        'period', p_period,
        'generated_at', CURRENT_TIMESTAMP
    );

    -- Agregar al array de facturas_generadas
    UPDATE siac_presupuestos
    SET facturas_generadas = facturas_generadas || v_nuevo_registro
    WHERE id = p_presupuesto_id;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Obtener presupuestos listos para facturar
CREATE OR REPLACE FUNCTION get_presupuestos_para_facturar()
RETURNS TABLE (
    presupuesto_id INTEGER,
    company_id INTEGER,
    numero_presupuesto VARCHAR(50),
    cliente_nombre VARCHAR(255),
    proximo_periodo DATE,
    frecuencia VARCHAR(20),
    total_general DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.company_id,
        p.numero_presupuesto,
        p.cliente_nombre,
        p.proximo_periodo_facturacion,
        p.frecuencia_facturacion,
        p.total_general
    FROM siac_presupuestos p
    WHERE p.tipo_facturacion = 'RECURRENTE'
      AND p.estado = 'ACTIVO'
      AND p.proximo_periodo_facturacion <= CURRENT_DATE
      AND (p.fecha_fin_facturacion IS NULL OR p.fecha_fin_facturacion >= CURRENT_DATE)
    ORDER BY p.proximo_periodo_facturacion ASC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE siac_presupuestos IS 'Presupuestos/cotizaciones multi-tenant con soporte para facturación OCASIONAL (1 vez) o RECURRENTE (periódica).';
COMMENT ON COLUMN siac_presupuestos.tipo_facturacion IS 'OCASIONAL = factura 1 vez | RECURRENTE = factura periódicamente';
COMMENT ON COLUMN siac_presupuestos.frecuencia_facturacion IS 'MONTHLY | QUARTERLY | YEARLY (solo si tipo = RECURRENTE)';
COMMENT ON COLUMN siac_presupuestos.proximo_periodo_facturacion IS 'Próximo período a facturar (actualizado automáticamente)';
COMMENT ON COLUMN siac_presupuestos.estado IS 'PENDIENTE | APROBADO | RECHAZADO | VENCIDO | FACTURADO (ocasional) | ACTIVO (recurrente) | FINALIZADO';
COMMENT ON COLUMN siac_presupuestos.facturas_generadas IS 'Array JSONB de facturas generadas desde este presupuesto';

COMMIT;
