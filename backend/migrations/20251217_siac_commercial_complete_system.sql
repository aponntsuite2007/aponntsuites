/**
 * ============================================================================
 * MIGRACIÓN: Sistema Comercial Completo SIAC
 * ============================================================================
 *
 * Crea todas las tablas necesarias para:
 * - Remitos (con items)
 * - Mejoras a Facturas (campos AFIP 2025)
 * - Caja (turnos, movimientos, arqueo)
 * - Cuenta Corriente (movimientos, resumen)
 * - Cobranzas (recibos, imputaciones, medios de pago)
 * - Cartera de Cheques
 * - Seguimiento de Cobranza
 *
 * PREREQUISITOS (ya deben existir):
 * - siac_clientes
 * - siac_productos
 * - siac_presupuestos
 * - siac_facturas
 *
 * Created: 2025-12-17
 * Author: Claude Code
 */

\echo ''
\echo '=========================================='
\echo 'MIGRACIÓN: Sistema Comercial Completo SIAC'
\echo '=========================================='
\echo ''

BEGIN;

-- ============================================================================
-- 1. TABLA: siac_remitos
-- ============================================================================
\echo '📦 Creando tabla siac_remitos...'

CREATE TABLE IF NOT EXISTS siac_remitos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Identificación
    tipo_remito VARCHAR(1) DEFAULT 'R', -- R=Remito, X=Remito X (sin valor fiscal)
    punto_venta INTEGER NOT NULL,
    numero_remito INTEGER NOT NULL,
    numero_completo VARCHAR(20), -- 0001-00000001
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,

    -- CAI (Código de Autorización de Impresión) - AFIP
    cai VARCHAR(20),
    cai_vencimiento DATE,

    -- Cliente
    cliente_id INTEGER REFERENCES siac_clientes(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_cuit VARCHAR(15),
    cliente_domicilio TEXT,

    -- Dirección de entrega (puede diferir del domicilio fiscal)
    entrega_domicilio TEXT,
    entrega_localidad VARCHAR(100),
    entrega_provincia VARCHAR(100),
    entrega_codigo_postal VARCHAR(10),
    entrega_contacto VARCHAR(100),
    entrega_telefono VARCHAR(50),

    -- Transporte
    transporte VARCHAR(100),
    patente VARCHAR(20),
    chofer VARCHAR(100),
    chofer_dni VARCHAR(15),

    -- Origen
    presupuesto_id INTEGER REFERENCES siac_presupuestos(id) ON DELETE SET NULL,

    -- Estado
    estado VARCHAR(20) DEFAULT 'EMITIDO',
    -- EMITIDO, ENTREGADO, FACTURADO, PARCIAL, ANULADO

    -- Facturación
    factura_id INTEGER, -- Se completa cuando se factura
    facturado_at TIMESTAMP,

    -- Totales (para referencia, sin valor fiscal)
    cantidad_items INTEGER DEFAULT 0,
    observaciones TEXT,

    -- Auditoría
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Anulación
    anulado_por INTEGER,
    anulado_at TIMESTAMP,
    motivo_anulacion TEXT,

    CONSTRAINT siac_remitos_unique UNIQUE(company_id, punto_venta, numero_remito)
);

CREATE INDEX IF NOT EXISTS idx_remitos_company ON siac_remitos(company_id);
CREATE INDEX IF NOT EXISTS idx_remitos_cliente ON siac_remitos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_remitos_estado ON siac_remitos(estado);
CREATE INDEX IF NOT EXISTS idx_remitos_fecha ON siac_remitos(fecha);
CREATE INDEX IF NOT EXISTS idx_remitos_presupuesto ON siac_remitos(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_remitos_factura ON siac_remitos(factura_id);
CREATE INDEX IF NOT EXISTS idx_remitos_pendientes ON siac_remitos(estado) WHERE estado IN ('EMITIDO', 'ENTREGADO', 'PARCIAL');

\echo '   ✅ Tabla siac_remitos creada'

-- ============================================================================
-- 2. TABLA: siac_remitos_items
-- ============================================================================
\echo '📦 Creando tabla siac_remitos_items...'

CREATE TABLE IF NOT EXISTS siac_remitos_items (
    id SERIAL PRIMARY KEY,
    remito_id INTEGER NOT NULL REFERENCES siac_remitos(id) ON DELETE CASCADE,

    -- Producto
    producto_id INTEGER REFERENCES siac_productos(id) ON DELETE SET NULL,
    codigo VARCHAR(50),
    descripcion VARCHAR(255) NOT NULL,
    unidad_medida VARCHAR(20) DEFAULT 'UN',

    -- Cantidades
    cantidad DECIMAL(15,4) NOT NULL,
    cantidad_facturada DECIMAL(15,4) DEFAULT 0, -- Para facturación parcial

    -- Referencia al presupuesto (si aplica)
    presupuesto_item_id INTEGER,

    -- Lote/Serie (para trazabilidad)
    lote VARCHAR(50),
    numero_serie VARCHAR(100),
    fecha_vencimiento DATE,

    orden INTEGER DEFAULT 0,
    observaciones TEXT
);

CREATE INDEX IF NOT EXISTS idx_remitos_items_remito ON siac_remitos_items(remito_id);
CREATE INDEX IF NOT EXISTS idx_remitos_items_producto ON siac_remitos_items(producto_id);

\echo '   ✅ Tabla siac_remitos_items creada'

-- ============================================================================
-- 3. MEJORAS A TABLA siac_facturas (campos AFIP 2025)
-- ============================================================================
\echo '📄 Mejorando tabla siac_facturas con campos AFIP 2025...'

-- Condición IVA Receptor (RG 5616 - OBLIGATORIO desde julio 2025)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS cliente_condicion_iva_id INTEGER;
-- 1=RI, 2=RNI, 3=No Responsable, 4=Exento, 5=CF, 6=Monotributo, etc.

COMMENT ON COLUMN siac_facturas.cliente_condicion_iva_id IS 'Código AFIP de condición IVA receptor (RG 5616). 1-14 según tabla oficial';

-- Campo para moneda extranjera (RG 5616)
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS cancela_misma_moneda_ext BOOLEAN DEFAULT false;

COMMENT ON COLUMN siac_facturas.cancela_misma_moneda_ext IS 'true = cliente paga en moneda extranjera, false = paga en ARS (RG 5616)';

-- Referencia a remito
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS remito_id INTEGER REFERENCES siac_remitos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_remito ON siac_facturas(remito_id);

-- Estado de pago mejorado
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) DEFAULT 'PENDIENTE';
-- PENDIENTE, PARCIAL, PAGADO, ANULADO

ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS saldo_pendiente DECIMAL(15,2);

-- Percepciones
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS percepciones_iva DECIMAL(15,2) DEFAULT 0;

ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS percepciones_iibb DECIMAL(15,2) DEFAULT 0;

ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS percepciones_iibb_jurisdiccion VARCHAR(50);

ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS impuestos_internos DECIMAL(15,2) DEFAULT 0;

ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS otros_tributos DECIMAL(15,2) DEFAULT 0;

-- PDF path
ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500);

ALTER TABLE siac_facturas
ADD COLUMN IF NOT EXISTS pdf_generado_at TIMESTAMP;

\echo '   ✅ Tabla siac_facturas mejorada'

-- ============================================================================
-- 4. TABLA: siac_facturas_iva (detalle de IVAs por factura)
-- ============================================================================
\echo '📄 Creando tabla siac_facturas_iva...'

CREATE TABLE IF NOT EXISTS siac_facturas_iva (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER NOT NULL REFERENCES siac_facturas(id) ON DELETE CASCADE,

    alicuota_id INTEGER NOT NULL, -- 3=0%, 4=10.5%, 5=21%, 6=27%, 8=5%, 9=2.5%
    base_imponible DECIMAL(15,2) NOT NULL,
    importe DECIMAL(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facturas_iva_factura ON siac_facturas_iva(factura_id);

COMMENT ON TABLE siac_facturas_iva IS 'Detalle de alícuotas IVA por factura (requerido por AFIP cuando hay múltiples alícuotas)';

\echo '   ✅ Tabla siac_facturas_iva creada'

-- ============================================================================
-- 5. TABLA: siac_facturas_tributos (percepciones y otros)
-- ============================================================================
\echo '📄 Creando tabla siac_facturas_tributos...'

CREATE TABLE IF NOT EXISTS siac_facturas_tributos (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER NOT NULL REFERENCES siac_facturas(id) ON DELETE CASCADE,

    tributo_id INTEGER NOT NULL, -- 1=IVA, 2=Nac, 3=Prov, 4=Mun, 5=Int, 99=Otros
    descripcion VARCHAR(100),
    base_imponible DECIMAL(15,2),
    alicuota DECIMAL(5,2),
    importe DECIMAL(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facturas_tributos_factura ON siac_facturas_tributos(factura_id);

COMMENT ON TABLE siac_facturas_tributos IS 'Tributos adicionales (percepciones, impuestos internos) por factura para AFIP';

\echo '   ✅ Tabla siac_facturas_tributos creada'

-- ============================================================================
-- 6. TABLA: siac_cajas (definición de puntos de cobro)
-- ============================================================================
\echo '💰 Creando tabla siac_cajas...'

CREATE TABLE IF NOT EXISTS siac_cajas (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,

    sucursal_id INTEGER,
    punto_venta_afip INTEGER, -- Asociado a punto de venta

    tipo VARCHAR(20) DEFAULT 'PRINCIPAL', -- PRINCIPAL, CHICA, MOVIL
    moneda_principal VARCHAR(3) DEFAULT 'ARS',

    fondo_fijo DECIMAL(15,2) DEFAULT 0, -- Monto que siempre debe quedar
    limite_efectivo DECIMAL(15,2), -- Máximo efectivo permitido

    activa BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT siac_cajas_unique UNIQUE(company_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_cajas_company ON siac_cajas(company_id);
CREATE INDEX IF NOT EXISTS idx_cajas_activa ON siac_cajas(activa) WHERE activa = true;

\echo '   ✅ Tabla siac_cajas creada'

-- ============================================================================
-- 7. TABLA: siac_caja_turnos (sesiones de apertura/cierre)
-- ============================================================================
\echo '💰 Creando tabla siac_caja_turnos...'

CREATE TABLE IF NOT EXISTS siac_caja_turnos (
    id SERIAL PRIMARY KEY,
    caja_id INTEGER NOT NULL REFERENCES siac_cajas(id) ON DELETE CASCADE,

    -- Apertura
    usuario_apertura_id INTEGER NOT NULL,
    fecha_apertura TIMESTAMP NOT NULL DEFAULT NOW(),
    fondo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
    fondo_inicial_detalle JSONB, -- Detalle de billetes/monedas

    -- Totales calculados
    total_ingresos DECIMAL(15,2) DEFAULT 0,
    total_egresos DECIMAL(15,2) DEFAULT 0,
    total_efectivo DECIMAL(15,2) DEFAULT 0,
    total_cheques DECIMAL(15,2) DEFAULT 0,
    total_tarjetas DECIMAL(15,2) DEFAULT 0,
    total_transferencias DECIMAL(15,2) DEFAULT 0,

    -- Cierre
    usuario_cierre_id INTEGER,
    fecha_cierre TIMESTAMP,
    saldo_sistema DECIMAL(15,2),
    saldo_arqueo DECIMAL(15,2),
    diferencia DECIMAL(15,2),

    -- Transferencia a caja central
    transferido_a_caja_id INTEGER REFERENCES siac_cajas(id),
    monto_transferido DECIMAL(15,2),
    fecha_transferencia TIMESTAMP,

    observaciones_apertura TEXT,
    observaciones_cierre TEXT,

    estado VARCHAR(20) DEFAULT 'ABIERTO', -- ABIERTO, CERRADO, AUDITADO, TRANSFERIDO

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caja_turnos_caja ON siac_caja_turnos(caja_id);
CREATE INDEX IF NOT EXISTS idx_caja_turnos_estado ON siac_caja_turnos(estado);
CREATE INDEX IF NOT EXISTS idx_caja_turnos_fecha ON siac_caja_turnos(fecha_apertura);
CREATE INDEX IF NOT EXISTS idx_caja_turnos_abiertos ON siac_caja_turnos(caja_id) WHERE estado = 'ABIERTO';

\echo '   ✅ Tabla siac_caja_turnos creada'

-- ============================================================================
-- 8. TABLA: siac_caja_movimientos
-- ============================================================================
\echo '💰 Creando tabla siac_caja_movimientos...'

CREATE TABLE IF NOT EXISTS siac_caja_movimientos (
    id SERIAL PRIMARY KEY,
    turno_id INTEGER NOT NULL REFERENCES siac_caja_turnos(id) ON DELETE CASCADE,

    fecha TIMESTAMP NOT NULL DEFAULT NOW(),

    tipo VARCHAR(20) NOT NULL, -- INGRESO, EGRESO
    categoria VARCHAR(50) NOT NULL,
    -- Categorías INGRESO: COBRO_FACTURA, COBRO_ANTICIPO, AJUSTE_POSITIVO, FONDO_INICIAL, OTROS
    -- Categorías EGRESO: PAGO_PROVEEDOR, RETIRO_EFECTIVO, GASTO, AJUSTE_NEGATIVO, TRANSFERENCIA_CAJA, OTROS

    medio_pago VARCHAR(30) NOT NULL,
    -- EFECTIVO, CHEQUE_AL_DIA, CHEQUE_DIFERIDO, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO, OTROS

    monto DECIMAL(15,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'ARS',
    cotizacion DECIMAL(15,4) DEFAULT 1,
    monto_moneda_local DECIMAL(15,2), -- Convertido a ARS

    -- Referencias
    cliente_id INTEGER REFERENCES siac_clientes(id),
    proveedor_id INTEGER,
    factura_id INTEGER REFERENCES siac_facturas(id),
    recibo_id INTEGER, -- Se completa después

    -- Detalles según medio de pago - Cheque
    cheque_id INTEGER, -- Referencia a cartera de cheques
    cheque_numero VARCHAR(20),
    cheque_banco VARCHAR(100),
    cheque_fecha DATE,

    -- Tarjeta
    tarjeta_tipo VARCHAR(20), -- VISA, MASTERCARD, AMEX, etc.
    tarjeta_ultimos_digitos VARCHAR(4),
    tarjeta_cuotas INTEGER DEFAULT 1,
    tarjeta_autorizacion VARCHAR(20),
    tarjeta_lote VARCHAR(20),

    -- Transferencia
    transferencia_referencia VARCHAR(50),
    transferencia_banco VARCHAR(100),
    transferencia_cbu_origen VARCHAR(25),

    descripcion TEXT,
    comprobante_externo VARCHAR(50), -- Nro. de comprobante externo

    -- Auditoría
    usuario_id INTEGER NOT NULL,
    anulado BOOLEAN DEFAULT false,
    anulado_por INTEGER,
    anulado_at TIMESTAMP,
    motivo_anulacion TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caja_mov_turno ON siac_caja_movimientos(turno_id);
CREATE INDEX IF NOT EXISTS idx_caja_mov_tipo ON siac_caja_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_caja_mov_fecha ON siac_caja_movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_caja_mov_cliente ON siac_caja_movimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_caja_mov_factura ON siac_caja_movimientos(factura_id);
CREATE INDEX IF NOT EXISTS idx_caja_mov_medio ON siac_caja_movimientos(medio_pago);

\echo '   ✅ Tabla siac_caja_movimientos creada'

-- ============================================================================
-- 9. TABLA: siac_caja_arqueo
-- ============================================================================
\echo '💰 Creando tabla siac_caja_arqueo...'

CREATE TABLE IF NOT EXISTS siac_caja_arqueo (
    id SERIAL PRIMARY KEY,
    turno_id INTEGER NOT NULL REFERENCES siac_caja_turnos(id) ON DELETE CASCADE,

    -- Efectivo en pesos argentinos
    billetes_20000 INTEGER DEFAULT 0,
    billetes_10000 INTEGER DEFAULT 0,
    billetes_5000 INTEGER DEFAULT 0,
    billetes_2000 INTEGER DEFAULT 0,
    billetes_1000 INTEGER DEFAULT 0,
    billetes_500 INTEGER DEFAULT 0,
    billetes_200 INTEGER DEFAULT 0,
    billetes_100 INTEGER DEFAULT 0,
    billetes_50 INTEGER DEFAULT 0,
    billetes_20 INTEGER DEFAULT 0,
    billetes_10 INTEGER DEFAULT 0,
    monedas_total DECIMAL(10,2) DEFAULT 0,

    total_efectivo_ars DECIMAL(15,2),

    -- Efectivo en dólares (si aplica)
    dolares_100 INTEGER DEFAULT 0,
    dolares_50 INTEGER DEFAULT 0,
    dolares_20 INTEGER DEFAULT 0,
    dolares_10 INTEGER DEFAULT 0,
    dolares_5 INTEGER DEFAULT 0,
    dolares_1 INTEGER DEFAULT 0,
    dolares_otros DECIMAL(10,2) DEFAULT 0,
    total_efectivo_usd DECIMAL(15,2),

    -- Cheques
    cantidad_cheques INTEGER DEFAULT 0,
    total_cheques DECIMAL(15,2) DEFAULT 0,
    detalle_cheques JSONB, -- Array de cheques contados

    -- Vouchers tarjeta
    cantidad_vouchers_debito INTEGER DEFAULT 0,
    total_vouchers_debito DECIMAL(15,2) DEFAULT 0,
    cantidad_vouchers_credito INTEGER DEFAULT 0,
    total_vouchers_credito DECIMAL(15,2) DEFAULT 0,

    total_arqueo DECIMAL(15,2),

    usuario_arqueo_id INTEGER NOT NULL,
    fecha_arqueo TIMESTAMP DEFAULT NOW(),

    observaciones TEXT
);

CREATE INDEX IF NOT EXISTS idx_caja_arqueo_turno ON siac_caja_arqueo(turno_id);

\echo '   ✅ Tabla siac_caja_arqueo creada'

-- ============================================================================
-- 10. TABLA: siac_cuenta_corriente
-- ============================================================================
\echo '📊 Creando tabla siac_cuenta_corriente...'

CREATE TABLE IF NOT EXISTS siac_cuenta_corriente (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE CASCADE,

    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,

    tipo VARCHAR(20) NOT NULL, -- DEBITO, CREDITO
    concepto VARCHAR(50) NOT NULL,
    -- DEBITO: FACTURA, NOTA_DEBITO, INTERES_MORA, AJUSTE_DEBITO
    -- CREDITO: RECIBO, NOTA_CREDITO, ANTICIPO, AJUSTE_CREDITO

    -- Comprobante origen
    comprobante_tipo VARCHAR(20),
    comprobante_numero VARCHAR(20),
    factura_id INTEGER REFERENCES siac_facturas(id) ON DELETE SET NULL,
    recibo_id INTEGER,
    nota_credito_id INTEGER,
    nota_debito_id INTEGER,

    -- Montos
    debe DECIMAL(15,2) DEFAULT 0,
    haber DECIMAL(15,2) DEFAULT 0,
    saldo DECIMAL(15,2), -- Saldo progresivo (trigger)

    -- Si hay saldo pendiente en este movimiento
    saldo_pendiente DECIMAL(15,2),
    estado VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, PARCIAL, CANCELADO

    -- Moneda original
    moneda VARCHAR(3) DEFAULT 'ARS',
    cotizacion DECIMAL(15,4) DEFAULT 1,
    monto_original DECIMAL(15,2),

    observaciones TEXT,

    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cta_cte_company ON siac_cuenta_corriente(company_id);
CREATE INDEX IF NOT EXISTS idx_cta_cte_cliente ON siac_cuenta_corriente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cta_cte_fecha ON siac_cuenta_corriente(fecha);
CREATE INDEX IF NOT EXISTS idx_cta_cte_estado ON siac_cuenta_corriente(estado);
CREATE INDEX IF NOT EXISTS idx_cta_cte_vencimiento ON siac_cuenta_corriente(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_cta_cte_factura ON siac_cuenta_corriente(factura_id);
CREATE INDEX IF NOT EXISTS idx_cta_cte_pendientes ON siac_cuenta_corriente(cliente_id, estado) WHERE estado IN ('PENDIENTE', 'PARCIAL');

\echo '   ✅ Tabla siac_cuenta_corriente creada'

-- ============================================================================
-- 11. TABLA: siac_cuenta_corriente_resumen
-- ============================================================================
\echo '📊 Creando tabla siac_cuenta_corriente_resumen...'

CREATE TABLE IF NOT EXISTS siac_cuenta_corriente_resumen (
    cliente_id INTEGER PRIMARY KEY REFERENCES siac_clientes(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    saldo_total DECIMAL(15,2) DEFAULT 0,

    -- Contadores
    facturas_pendientes INTEGER DEFAULT 0,

    -- Aging (antigüedad)
    a_vencer DECIMAL(15,2) DEFAULT 0,      -- No vencido
    vencido_1_30 DECIMAL(15,2) DEFAULT 0,  -- 1-30 días
    vencido_31_60 DECIMAL(15,2) DEFAULT 0, -- 31-60 días
    vencido_61_90 DECIMAL(15,2) DEFAULT 0, -- 61-90 días
    vencido_mas_90 DECIMAL(15,2) DEFAULT 0,-- +90 días

    monto_total_vencido DECIMAL(15,2) DEFAULT 0,
    dias_mayor_atraso INTEGER DEFAULT 0,

    -- Último movimiento
    ultimo_debito_fecha DATE,
    ultimo_debito_monto DECIMAL(15,2),
    ultimo_credito_fecha DATE,
    ultimo_credito_monto DECIMAL(15,2),

    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cta_cte_resumen_company ON siac_cuenta_corriente_resumen(company_id);
CREATE INDEX IF NOT EXISTS idx_cta_cte_resumen_saldo ON siac_cuenta_corriente_resumen(saldo_total) WHERE saldo_total > 0;
CREATE INDEX IF NOT EXISTS idx_cta_cte_resumen_vencido ON siac_cuenta_corriente_resumen(monto_total_vencido) WHERE monto_total_vencido > 0;

\echo '   ✅ Tabla siac_cuenta_corriente_resumen creada'

-- ============================================================================
-- 12. TABLA: siac_recibos
-- ============================================================================
\echo '🧾 Creando tabla siac_recibos...'

CREATE TABLE IF NOT EXISTS siac_recibos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Numeración
    punto_venta INTEGER NOT NULL,
    numero_recibo INTEGER NOT NULL,
    numero_completo VARCHAR(20),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Cliente
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE RESTRICT,
    cliente_nombre VARCHAR(255),

    -- Totales
    total DECIMAL(15,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'ARS',
    cotizacion DECIMAL(15,4) DEFAULT 1,

    -- Estado
    estado VARCHAR(20) DEFAULT 'EMITIDO', -- EMITIDO, ANULADO

    -- Cobranza
    cobrador_id INTEGER,
    caja_turno_id INTEGER REFERENCES siac_caja_turnos(id),

    observaciones TEXT,

    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Anulación
    anulado_por INTEGER,
    anulado_at TIMESTAMP,
    motivo_anulacion TEXT,

    CONSTRAINT siac_recibos_unique UNIQUE(company_id, punto_venta, numero_recibo)
);

CREATE INDEX IF NOT EXISTS idx_recibos_company ON siac_recibos(company_id);
CREATE INDEX IF NOT EXISTS idx_recibos_cliente ON siac_recibos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recibos_fecha ON siac_recibos(fecha);
CREATE INDEX IF NOT EXISTS idx_recibos_estado ON siac_recibos(estado);
CREATE INDEX IF NOT EXISTS idx_recibos_turno ON siac_recibos(caja_turno_id);

\echo '   ✅ Tabla siac_recibos creada'

-- ============================================================================
-- 13. TABLA: siac_recibos_imputaciones
-- ============================================================================
\echo '🧾 Creando tabla siac_recibos_imputaciones...'

CREATE TABLE IF NOT EXISTS siac_recibos_imputaciones (
    id SERIAL PRIMARY KEY,
    recibo_id INTEGER NOT NULL REFERENCES siac_recibos(id) ON DELETE CASCADE,

    factura_id INTEGER REFERENCES siac_facturas(id) ON DELETE SET NULL,
    movimiento_cta_cte_id INTEGER REFERENCES siac_cuenta_corriente(id) ON DELETE SET NULL,

    factura_numero VARCHAR(20),
    factura_fecha DATE,
    factura_total DECIMAL(15,2),
    saldo_anterior DECIMAL(15,2),

    monto_imputado DECIMAL(15,2) NOT NULL,
    saldo_posterior DECIMAL(15,2),

    es_anticipo BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_recibos_imp_recibo ON siac_recibos_imputaciones(recibo_id);
CREATE INDEX IF NOT EXISTS idx_recibos_imp_factura ON siac_recibos_imputaciones(factura_id);
CREATE INDEX IF NOT EXISTS idx_recibos_imp_movimiento ON siac_recibos_imputaciones(movimiento_cta_cte_id);

\echo '   ✅ Tabla siac_recibos_imputaciones creada'

-- ============================================================================
-- 14. TABLA: siac_recibos_medios_pago
-- ============================================================================
\echo '🧾 Creando tabla siac_recibos_medios_pago...'

CREATE TABLE IF NOT EXISTS siac_recibos_medios_pago (
    id SERIAL PRIMARY KEY,
    recibo_id INTEGER NOT NULL REFERENCES siac_recibos(id) ON DELETE CASCADE,

    medio_pago VARCHAR(30) NOT NULL,
    monto DECIMAL(15,2) NOT NULL,

    -- Cheque
    cheque_numero VARCHAR(20),
    cheque_banco VARCHAR(100),
    cheque_sucursal VARCHAR(50),
    cheque_cuit_emisor VARCHAR(15),
    cheque_titular VARCHAR(100),
    cheque_fecha_emision DATE,
    cheque_fecha_cobro DATE,
    cheque_a_la_orden VARCHAR(100),
    cheque_cruzado BOOLEAN DEFAULT false,

    -- Transferencia
    transferencia_referencia VARCHAR(50),
    transferencia_banco VARCHAR(100),
    transferencia_fecha DATE,
    transferencia_cbu_origen VARCHAR(25),

    -- Tarjeta
    tarjeta_tipo VARCHAR(20),
    tarjeta_ultimos_digitos VARCHAR(4),
    tarjeta_cuotas INTEGER DEFAULT 1,
    tarjeta_autorizacion VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_recibos_mp_recibo ON siac_recibos_medios_pago(recibo_id);
CREATE INDEX IF NOT EXISTS idx_recibos_mp_medio ON siac_recibos_medios_pago(medio_pago);

\echo '   ✅ Tabla siac_recibos_medios_pago creada'

-- ============================================================================
-- 15. TABLA: siac_cheques_cartera
-- ============================================================================
\echo '📄 Creando tabla siac_cheques_cartera...'

CREATE TABLE IF NOT EXISTS siac_cheques_cartera (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Origen
    recibo_medio_pago_id INTEGER REFERENCES siac_recibos_medios_pago(id) ON DELETE SET NULL,
    cliente_origen_id INTEGER REFERENCES siac_clientes(id) ON DELETE SET NULL,

    -- Datos del cheque
    numero VARCHAR(20) NOT NULL,
    banco VARCHAR(100) NOT NULL,
    sucursal VARCHAR(50),
    plaza VARCHAR(100),
    cuit_emisor VARCHAR(15),
    titular VARCHAR(100),
    fecha_emision DATE NOT NULL,
    fecha_cobro DATE NOT NULL, -- Fecha de vencimiento/cobro
    a_la_orden VARCHAR(100),
    cruzado BOOLEAN DEFAULT false,

    monto DECIMAL(15,2) NOT NULL,

    -- Estado
    estado VARCHAR(20) DEFAULT 'EN_CARTERA',
    -- EN_CARTERA, DEPOSITADO, COBRADO, RECHAZADO, ENDOSADO, DESCONTADO, ANULADO

    -- Depósito
    fecha_deposito DATE,
    banco_deposito VARCHAR(100),
    cuenta_deposito VARCHAR(50),

    -- Cobro
    fecha_cobro_real DATE,

    -- Rechazo
    fecha_rechazo DATE,
    motivo_rechazo VARCHAR(100),
    gastos_rechazo DECIMAL(10,2),

    -- Endoso
    fecha_endoso DATE,
    endosado_a VARCHAR(100),
    proveedor_endoso_id INTEGER,

    observaciones TEXT,

    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cheques_company ON siac_cheques_cartera(company_id);
CREATE INDEX IF NOT EXISTS idx_cheques_cliente ON siac_cheques_cartera(cliente_origen_id);
CREATE INDEX IF NOT EXISTS idx_cheques_estado ON siac_cheques_cartera(estado);
CREATE INDEX IF NOT EXISTS idx_cheques_fecha_cobro ON siac_cheques_cartera(fecha_cobro);
CREATE INDEX IF NOT EXISTS idx_cheques_cartera_activos ON siac_cheques_cartera(estado, fecha_cobro) WHERE estado IN ('EN_CARTERA', 'DEPOSITADO');

\echo '   ✅ Tabla siac_cheques_cartera creada'

-- ============================================================================
-- 16. TABLA: siac_cobranza_seguimiento
-- ============================================================================
\echo '📞 Creando tabla siac_cobranza_seguimiento...'

CREATE TABLE IF NOT EXISTS siac_cobranza_seguimiento (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE CASCADE,

    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME DEFAULT CURRENT_TIME,

    tipo_accion VARCHAR(30) NOT NULL,
    -- LLAMADA, VISITA, EMAIL, WHATSAPP, SMS, CARTA_DOCUMENTO

    resultado VARCHAR(30),
    -- CONTACTADO, NO_CONTACTADO, PROMESA_PAGO, PAGO_REALIZADO, RECHAZADO, ILOCALIZABLE

    contacto_nombre VARCHAR(100),
    contacto_telefono VARCHAR(50),

    -- Promesa de pago
    promesa_fecha DATE,
    promesa_monto DECIMAL(15,2),
    promesa_cumplida BOOLEAN,

    -- Próxima acción
    proxima_accion_fecha DATE,
    proxima_accion_tipo VARCHAR(30),
    proxima_accion_asignado_id INTEGER,

    observaciones TEXT,

    cobrador_id INTEGER,
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cobranza_seg_company ON siac_cobranza_seguimiento(company_id);
CREATE INDEX IF NOT EXISTS idx_cobranza_seg_cliente ON siac_cobranza_seguimiento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobranza_seg_fecha ON siac_cobranza_seguimiento(fecha);
CREATE INDEX IF NOT EXISTS idx_cobranza_seg_proxima ON siac_cobranza_seguimiento(proxima_accion_fecha) WHERE proxima_accion_fecha IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cobranza_seg_cobrador ON siac_cobranza_seguimiento(cobrador_id);

\echo '   ✅ Tabla siac_cobranza_seguimiento creada'

-- ============================================================================
-- 17. FUNCIONES Y TRIGGERS
-- ============================================================================
\echo '⚙️ Creando funciones y triggers...'

-- Función: Actualizar totales del turno de caja
CREATE OR REPLACE FUNCTION actualizar_totales_turno_caja()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE siac_caja_turnos
    SET
        total_ingresos = (
            SELECT COALESCE(SUM(monto_moneda_local), 0)
            FROM siac_caja_movimientos
            WHERE turno_id = NEW.turno_id AND tipo = 'INGRESO' AND NOT anulado
        ),
        total_egresos = (
            SELECT COALESCE(SUM(monto_moneda_local), 0)
            FROM siac_caja_movimientos
            WHERE turno_id = NEW.turno_id AND tipo = 'EGRESO' AND NOT anulado
        ),
        total_efectivo = (
            SELECT COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto_moneda_local ELSE -monto_moneda_local END), 0)
            FROM siac_caja_movimientos
            WHERE turno_id = NEW.turno_id AND medio_pago = 'EFECTIVO' AND NOT anulado
        ),
        total_cheques = (
            SELECT COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto_moneda_local ELSE -monto_moneda_local END), 0)
            FROM siac_caja_movimientos
            WHERE turno_id = NEW.turno_id AND medio_pago LIKE 'CHEQUE%' AND NOT anulado
        ),
        total_tarjetas = (
            SELECT COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto_moneda_local ELSE -monto_moneda_local END), 0)
            FROM siac_caja_movimientos
            WHERE turno_id = NEW.turno_id AND medio_pago LIKE 'TARJETA%' AND NOT anulado
        ),
        total_transferencias = (
            SELECT COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto_moneda_local ELSE -monto_moneda_local END), 0)
            FROM siac_caja_movimientos
            WHERE turno_id = NEW.turno_id AND medio_pago = 'TRANSFERENCIA' AND NOT anulado
        )
    WHERE id = NEW.turno_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_totales_turno ON siac_caja_movimientos;
CREATE TRIGGER trg_actualizar_totales_turno
AFTER INSERT OR UPDATE OR DELETE ON siac_caja_movimientos
FOR EACH ROW EXECUTE FUNCTION actualizar_totales_turno_caja();

\echo '   ✅ Trigger actualizar_totales_turno_caja creado'

-- Función: Actualizar resumen de cuenta corriente
CREATE OR REPLACE FUNCTION actualizar_resumen_cta_cte()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente_id INTEGER;
    v_company_id INTEGER;
BEGIN
    -- Determinar cliente y company
    IF TG_OP = 'DELETE' THEN
        v_cliente_id := OLD.cliente_id;
        v_company_id := OLD.company_id;
    ELSE
        v_cliente_id := NEW.cliente_id;
        v_company_id := NEW.company_id;
    END IF;

    -- Insertar o actualizar resumen
    INSERT INTO siac_cuenta_corriente_resumen (
        cliente_id, company_id, saldo_total, facturas_pendientes,
        a_vencer, vencido_1_30, vencido_31_60, vencido_61_90, vencido_mas_90,
        monto_total_vencido, dias_mayor_atraso,
        ultimo_debito_fecha, ultimo_debito_monto,
        ultimo_credito_fecha, ultimo_credito_monto,
        updated_at
    )
    SELECT
        v_cliente_id,
        v_company_id,
        COALESCE(SUM(debe) - SUM(haber), 0),
        COUNT(*) FILTER (WHERE concepto = 'FACTURA' AND estado IN ('PENDIENTE', 'PARCIAL')),
        -- Aging
        COALESCE(SUM(saldo_pendiente) FILTER (WHERE fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE), 0),
        COALESCE(SUM(saldo_pendiente) FILTER (WHERE fecha_vencimiento < CURRENT_DATE AND fecha_vencimiento >= CURRENT_DATE - 30), 0),
        COALESCE(SUM(saldo_pendiente) FILTER (WHERE fecha_vencimiento < CURRENT_DATE - 30 AND fecha_vencimiento >= CURRENT_DATE - 60), 0),
        COALESCE(SUM(saldo_pendiente) FILTER (WHERE fecha_vencimiento < CURRENT_DATE - 60 AND fecha_vencimiento >= CURRENT_DATE - 90), 0),
        COALESCE(SUM(saldo_pendiente) FILTER (WHERE fecha_vencimiento < CURRENT_DATE - 90), 0),
        -- Total vencido
        COALESCE(SUM(saldo_pendiente) FILTER (WHERE fecha_vencimiento < CURRENT_DATE), 0),
        COALESCE(MAX(CURRENT_DATE - fecha_vencimiento) FILTER (WHERE fecha_vencimiento < CURRENT_DATE AND saldo_pendiente > 0), 0),
        -- Últimos movimientos
        MAX(fecha) FILTER (WHERE tipo = 'DEBITO'),
        (SELECT debe FROM siac_cuenta_corriente WHERE cliente_id = v_cliente_id AND tipo = 'DEBITO' ORDER BY fecha DESC LIMIT 1),
        MAX(fecha) FILTER (WHERE tipo = 'CREDITO'),
        (SELECT haber FROM siac_cuenta_corriente WHERE cliente_id = v_cliente_id AND tipo = 'CREDITO' ORDER BY fecha DESC LIMIT 1),
        NOW()
    FROM siac_cuenta_corriente
    WHERE cliente_id = v_cliente_id
    ON CONFLICT (cliente_id) DO UPDATE SET
        saldo_total = EXCLUDED.saldo_total,
        facturas_pendientes = EXCLUDED.facturas_pendientes,
        a_vencer = EXCLUDED.a_vencer,
        vencido_1_30 = EXCLUDED.vencido_1_30,
        vencido_31_60 = EXCLUDED.vencido_31_60,
        vencido_61_90 = EXCLUDED.vencido_61_90,
        vencido_mas_90 = EXCLUDED.vencido_mas_90,
        monto_total_vencido = EXCLUDED.monto_total_vencido,
        dias_mayor_atraso = EXCLUDED.dias_mayor_atraso,
        ultimo_debito_fecha = EXCLUDED.ultimo_debito_fecha,
        ultimo_debito_monto = EXCLUDED.ultimo_debito_monto,
        ultimo_credito_fecha = EXCLUDED.ultimo_credito_fecha,
        ultimo_credito_monto = EXCLUDED.ultimo_credito_monto,
        updated_at = NOW();

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_resumen_cta_cte ON siac_cuenta_corriente;
CREATE TRIGGER trg_actualizar_resumen_cta_cte
AFTER INSERT OR UPDATE OR DELETE ON siac_cuenta_corriente
FOR EACH ROW EXECUTE FUNCTION actualizar_resumen_cta_cte();

\echo '   ✅ Trigger actualizar_resumen_cta_cte creado'

-- Función: Generar número completo de remito
CREATE OR REPLACE FUNCTION generar_numero_remito()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_completo := LPAD(NEW.punto_venta::TEXT, 4, '0') || '-' || LPAD(NEW.numero_remito::TEXT, 8, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_numero_remito ON siac_remitos;
CREATE TRIGGER trg_generar_numero_remito
BEFORE INSERT OR UPDATE OF punto_venta, numero_remito ON siac_remitos
FOR EACH ROW EXECUTE FUNCTION generar_numero_remito();

\echo '   ✅ Trigger generar_numero_remito creado'

-- Función: Generar número completo de recibo
CREATE OR REPLACE FUNCTION generar_numero_recibo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_completo := LPAD(NEW.punto_venta::TEXT, 4, '0') || '-' || LPAD(NEW.numero_recibo::TEXT, 8, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_numero_recibo ON siac_recibos;
CREATE TRIGGER trg_generar_numero_recibo
BEFORE INSERT OR UPDATE OF punto_venta, numero_recibo ON siac_recibos
FOR EACH ROW EXECUTE FUNCTION generar_numero_recibo();

\echo '   ✅ Trigger generar_numero_recibo creado'

-- Función: Calcular monto en moneda local
CREATE OR REPLACE FUNCTION calcular_monto_moneda_local()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.moneda != 'ARS' AND NEW.cotizacion > 0 THEN
        NEW.monto_moneda_local := NEW.monto * NEW.cotizacion;
    ELSE
        NEW.monto_moneda_local := NEW.monto;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_monto_local ON siac_caja_movimientos;
CREATE TRIGGER trg_calcular_monto_local
BEFORE INSERT OR UPDATE OF monto, moneda, cotizacion ON siac_caja_movimientos
FOR EACH ROW EXECUTE FUNCTION calcular_monto_moneda_local();

\echo '   ✅ Trigger calcular_monto_moneda_local creado'

-- ============================================================================
-- 18. FUNCIONES HELPER
-- ============================================================================
\echo '🛠️ Creando funciones helper...'

-- Obtener próximo número de remito
CREATE OR REPLACE FUNCTION get_proximo_numero_remito(
    p_company_id INTEGER,
    p_punto_venta INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_ultimo INTEGER;
BEGIN
    SELECT COALESCE(MAX(numero_remito), 0) + 1 INTO v_ultimo
    FROM siac_remitos
    WHERE company_id = p_company_id AND punto_venta = p_punto_venta;

    RETURN v_ultimo;
END;
$$ LANGUAGE plpgsql;

-- Obtener próximo número de recibo
CREATE OR REPLACE FUNCTION get_proximo_numero_recibo(
    p_company_id INTEGER,
    p_punto_venta INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_ultimo INTEGER;
BEGIN
    SELECT COALESCE(MAX(numero_recibo), 0) + 1 INTO v_ultimo
    FROM siac_recibos
    WHERE company_id = p_company_id AND punto_venta = p_punto_venta;

    RETURN v_ultimo;
END;
$$ LANGUAGE plpgsql;

-- Obtener estado de cuenta de cliente
CREATE OR REPLACE FUNCTION get_estado_cuenta_cliente(
    p_cliente_id INTEGER
)
RETURNS TABLE (
    saldo_total DECIMAL(15,2),
    facturas_pendientes INTEGER,
    monto_vencido DECIMAL(15,2),
    dias_mayor_atraso INTEGER,
    puede_facturar BOOLEAN,
    motivo_bloqueo TEXT
) AS $$
DECLARE
    v_cliente RECORD;
    v_resumen RECORD;
BEGIN
    -- Obtener datos del cliente
    SELECT * INTO v_cliente FROM siac_clientes WHERE id = p_cliente_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL(15,2), 0, 0::DECIMAL(15,2), 0, false, 'Cliente no encontrado'::TEXT;
        RETURN;
    END IF;

    -- Obtener resumen de cuenta corriente
    SELECT * INTO v_resumen FROM siac_cuenta_corriente_resumen WHERE cliente_id = p_cliente_id;

    -- Determinar si puede facturar
    IF v_cliente.bloqueo_por_vencimiento THEN
        RETURN QUERY SELECT
            COALESCE(v_resumen.saldo_total, 0::DECIMAL(15,2)),
            COALESCE(v_resumen.facturas_pendientes, 0),
            COALESCE(v_resumen.monto_total_vencido, 0::DECIMAL(15,2)),
            COALESCE(v_resumen.dias_mayor_atraso, 0),
            false,
            'Bloqueado por vencimiento'::TEXT;
        RETURN;
    END IF;

    IF v_cliente.bloqueo_por_credito THEN
        RETURN QUERY SELECT
            COALESCE(v_resumen.saldo_total, 0::DECIMAL(15,2)),
            COALESCE(v_resumen.facturas_pendientes, 0),
            COALESCE(v_resumen.monto_total_vencido, 0::DECIMAL(15,2)),
            COALESCE(v_resumen.dias_mayor_atraso, 0),
            false,
            'Bloqueado por exceso de crédito'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        COALESCE(v_resumen.saldo_total, 0::DECIMAL(15,2)),
        COALESCE(v_resumen.facturas_pendientes, 0),
        COALESCE(v_resumen.monto_total_vencido, 0::DECIMAL(15,2)),
        COALESCE(v_resumen.dias_mayor_atraso, 0),
        true,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Obtener cheques a vencer en los próximos N días
CREATE OR REPLACE FUNCTION get_cheques_a_vencer(
    p_company_id INTEGER,
    p_dias INTEGER DEFAULT 7
)
RETURNS TABLE (
    id INTEGER,
    numero VARCHAR(20),
    banco VARCHAR(100),
    monto DECIMAL(15,2),
    fecha_cobro DATE,
    dias_para_vencer INTEGER,
    cliente_nombre VARCHAR(255),
    estado VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.numero,
        c.banco,
        c.monto,
        c.fecha_cobro,
        (c.fecha_cobro - CURRENT_DATE)::INTEGER,
        cl.nombre,
        c.estado
    FROM siac_cheques_cartera c
    LEFT JOIN siac_clientes cl ON c.cliente_origen_id = cl.id
    WHERE c.company_id = p_company_id
      AND c.estado = 'EN_CARTERA'
      AND c.fecha_cobro BETWEEN CURRENT_DATE AND CURRENT_DATE + p_dias
    ORDER BY c.fecha_cobro ASC;
END;
$$ LANGUAGE plpgsql;

-- Obtener clientes morosos
CREATE OR REPLACE FUNCTION get_clientes_morosos(
    p_company_id INTEGER,
    p_dias_minimo INTEGER DEFAULT 30
)
RETURNS TABLE (
    cliente_id INTEGER,
    cliente_nombre VARCHAR(255),
    saldo_total DECIMAL(15,2),
    monto_vencido DECIMAL(15,2),
    dias_mayor_atraso INTEGER,
    facturas_pendientes INTEGER,
    ultima_gestion DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.cliente_id,
        c.nombre,
        r.saldo_total,
        r.monto_total_vencido,
        r.dias_mayor_atraso,
        r.facturas_pendientes,
        (SELECT MAX(fecha) FROM siac_cobranza_seguimiento s WHERE s.cliente_id = r.cliente_id)
    FROM siac_cuenta_corriente_resumen r
    JOIN siac_clientes c ON r.cliente_id = c.id
    WHERE r.company_id = p_company_id
      AND r.dias_mayor_atraso >= p_dias_minimo
      AND r.saldo_total > 0
    ORDER BY r.dias_mayor_atraso DESC, r.monto_total_vencido DESC;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Funciones helper creadas'

-- ============================================================================
-- 19. COMENTARIOS
-- ============================================================================

COMMENT ON TABLE siac_remitos IS 'Remitos de entrega de mercadería - pueden generarse desde presupuestos';
COMMENT ON TABLE siac_remitos_items IS 'Items de cada remito con control de facturación parcial';
COMMENT ON TABLE siac_facturas_iva IS 'Detalle de alícuotas IVA por factura (requerido AFIP múltiples alícuotas)';
COMMENT ON TABLE siac_facturas_tributos IS 'Percepciones y tributos adicionales por factura';
COMMENT ON TABLE siac_cajas IS 'Definición de cajas/puntos de cobro por empresa';
COMMENT ON TABLE siac_caja_turnos IS 'Turnos de caja (sesiones de apertura/cierre)';
COMMENT ON TABLE siac_caja_movimientos IS 'Movimientos de caja (ingresos/egresos) con detalle de medios de pago';
COMMENT ON TABLE siac_caja_arqueo IS 'Arqueo detallado de caja con conteo de billetes';
COMMENT ON TABLE siac_cuenta_corriente IS 'Movimientos de cuenta corriente por cliente';
COMMENT ON TABLE siac_cuenta_corriente_resumen IS 'Resumen precalculado de cuenta corriente con aging';
COMMENT ON TABLE siac_recibos IS 'Recibos de cobro';
COMMENT ON TABLE siac_recibos_imputaciones IS 'Imputación de recibos a facturas';
COMMENT ON TABLE siac_recibos_medios_pago IS 'Medios de pago detallados por recibo';
COMMENT ON TABLE siac_cheques_cartera IS 'Cartera de cheques recibidos';
COMMENT ON TABLE siac_cobranza_seguimiento IS 'Seguimiento de gestión de cobranza';

COMMIT;

\echo ''
\echo '=========================================='
\echo 'MIGRACIÓN COMPLETADA EXITOSAMENTE'
\echo '=========================================='
\echo ''
\echo 'Tablas creadas/mejoradas:'
\echo '  - siac_remitos + siac_remitos_items'
\echo '  - siac_facturas (campos AFIP 2025)'
\echo '  - siac_facturas_iva + siac_facturas_tributos'
\echo '  - siac_cajas + siac_caja_turnos + siac_caja_movimientos + siac_caja_arqueo'
\echo '  - siac_cuenta_corriente + siac_cuenta_corriente_resumen'
\echo '  - siac_recibos + siac_recibos_imputaciones + siac_recibos_medios_pago'
\echo '  - siac_cheques_cartera'
\echo '  - siac_cobranza_seguimiento'
\echo ''
\echo 'Triggers creados:'
\echo '  - actualizar_totales_turno_caja'
\echo '  - actualizar_resumen_cta_cte'
\echo '  - generar_numero_remito'
\echo '  - generar_numero_recibo'
\echo '  - calcular_monto_moneda_local'
\echo ''
\echo 'Funciones helper:'
\echo '  - get_proximo_numero_remito(company_id, punto_venta)'
\echo '  - get_proximo_numero_recibo(company_id, punto_venta)'
\echo '  - get_estado_cuenta_cliente(cliente_id)'
\echo '  - get_cheques_a_vencer(company_id, dias)'
\echo '  - get_clientes_morosos(company_id, dias_minimo)'
\echo ''
