# SISTEMA INTEGRAL DE FACTURACIÓN, COBRANZAS Y CAJA
## Diseño Completo - SIAC + AFIP/ARCA 2025

---

## 1. ARQUITECTURA GENERAL

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA COMERCIAL SIAC                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  MÓDULO CLIENTES          MÓDULO PRODUCTOS         MÓDULO STOCK           │
│  ┌──────────────┐         ┌──────────────┐        ┌──────────────┐        │
│  │ • Datos      │         │ • Catálogo   │        │ • Inventario │        │
│  │ • Fiscal     │         │ • Precios    │        │ • Movimientos│        │
│  │ • Comercial  │         │ • Listas     │        │ • Alertas    │        │
│  └──────┬───────┘         └──────┬───────┘        └──────────────┘        │
│         │                        │                                         │
│         ▼                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │                      PRESUPUESTOS                                │      │
│  │  • Crear presupuesto con items                                   │      │
│  │  • Enviar por email/WhatsApp                                     │      │
│  │  • Vigencia configurable                                         │      │
│  │  • Estados: BORRADOR → ENVIADO → ACEPTADO → FACTURADO/VENCIDO   │      │
│  └─────────────────────────────┬───────────────────────────────────┘      │
│                                │                                           │
│              ┌─────────────────┴─────────────────┐                        │
│              ▼                                   ▼                         │
│  ┌─────────────────────┐            ┌─────────────────────┐               │
│  │ FACTURAR DIRECTO    │            │ GENERAR REMITO      │               │
│  │ (con/sin modificar) │            │ (entrega mercadería)│               │
│  └──────────┬──────────┘            └──────────┬──────────┘               │
│             │                                   │                          │
│             │                                   ▼                          │
│             │                       ┌─────────────────────┐               │
│             │                       │      REMITOS        │               │
│             │                       │  • Nro. remito      │               │
│             │                       │  • Items entregados │               │
│             │                       │  • CAI (AFIP)       │               │
│             │                       │  • Estado: EMITIDO  │               │
│             │                       │    → FACTURADO      │               │
│             │                       └──────────┬──────────┘               │
│             │                                  │                           │
│             │         ┌────────────────────────┘                          │
│             ▼         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │                      FACTURACIÓN AFIP                            │      │
│  │  • Factura A/B/C/M                                               │      │
│  │  • Nota de Crédito                                               │      │
│  │  • Nota de Débito                                                │      │
│  │  • CAE automático (WSFEv1)                                       │      │
│  │  • PDF con QR                                                    │      │
│  │  • Multi-moneda (ARS/USD)                                        │      │
│  └───────────────────────────┬─────────────────────────────────────┘      │
│                              │                                             │
│         ┌────────────────────┴────────────────────┐                       │
│         ▼                                         ▼                        │
│  ┌─────────────────────┐              ┌─────────────────────┐             │
│  │  CONTADO            │              │  CUENTA CORRIENTE   │             │
│  │  → Caja inmediato   │              │  → Mov. Cta. Cte.   │             │
│  └──────────┬──────────┘              └──────────┬──────────┘             │
│             │                                    │                         │
│             ▼                                    ▼                         │
│  ┌─────────────────────┐              ┌─────────────────────┐             │
│  │       CAJA          │              │   CUENTAS CORRIENTES│             │
│  │  • Movimientos      │              │  • Saldos           │             │
│  │  • Medios de pago   │              │  • Aging            │             │
│  │  • Arqueo           │              │  • Límites          │             │
│  └─────────────────────┘              └──────────┬──────────┘             │
│                                                  │                         │
│                                                  ▼                         │
│                                       ┌─────────────────────┐             │
│                                       │     COBRANZAS       │             │
│                                       │  • Recibos          │             │
│                                       │  • Cheques          │             │
│                                       │  • Seguimiento      │             │
│                                       └─────────────────────┘             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. FLUJOS DE TRABAJO DETALLADOS

### 2.1 Presupuesto → Factura Directa (Contado)

```
[Presupuesto ACEPTADO]
        │
        ▼
┌───────────────────┐
│ Botón "Facturar"  │
│ Opción: Contado   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     ┌───────────────────┐
│ ¿Modificar items? │────▶│ Modal edición     │
│    (opcional)     │ Sí  │ items/precios     │
└────────┬──────────┘     └────────┬──────────┘
         │ No                      │
         ▼                         ▼
┌───────────────────────────────────────────┐
│ Seleccionar medio de pago                 │
│ • Efectivo  • Cheque  • Transferencia     │
│ • Tarjeta débito  • Tarjeta crédito       │
└────────────────────┬──────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────┐
│ Solicitar CAE a AFIP (WSFEv1)             │
│ • condicion_iva_receptor_id (obligatorio) │
│ • Moneda + cotización                     │
└────────────────────┬──────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ CAE OK          │     │ CAE RECHAZADO   │
│ Factura emitida │     │ Mostrar error   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Registrar movimiento en CAJA            │
│ • Ingreso por venta                     │
│ • Medio de pago seleccionado            │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Generar PDF con QR                      │
│ Actualizar estado presupuesto: FACTURADO│
└─────────────────────────────────────────┘
```

### 2.2 Presupuesto → Factura Directa (Cuenta Corriente)

```
[Presupuesto ACEPTADO]
        │
        ▼
┌───────────────────┐
│ Botón "Facturar"  │
│ Opción: Cta. Cte. │
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────────────┐
│ Validar cliente:                          │
│ • ¿Tiene cta. cte. habilitada?            │
│ • ¿Tiene crédito disponible?              │
│ • ¿No está bloqueado?                     │
└────────────────────┬──────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Validación OK   │     │ Validación FAIL │
│ Continuar       │     │ Mostrar motivo  │
└────────┬────────┘     │ • Sin crédito   │
         │              │ • Bloqueado     │
         │              │ • Excede límite │
         │              └─────────────────┘
         ▼
┌───────────────────────────────────────────┐
│ Solicitar CAE a AFIP (WSFEv1)             │
└────────────────────┬──────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────┐
│ Registrar movimiento en CTA. CTE.         │
│ • Tipo: DEBITO                            │
│ • Concepto: FACTURA                       │
│ • Actualizar saldo cliente                │
└────────────────────┬──────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ Generar PDF                             │
│ Actualizar estado presupuesto: FACTURADO│
└─────────────────────────────────────────┘
```

### 2.3 Presupuesto → Remito → Factura

```
[Presupuesto ACEPTADO]
        │
        ▼
┌────────────────────┐
│ Botón "Gen. Remito"│
└────────┬───────────┘
         │
         ▼
┌───────────────────────────────────────────┐
│ Generar Remito                            │
│ • Copiar items del presupuesto            │
│ • Asignar número de remito                │
│ • Solicitar CAI (si aplica)               │
│ • Estado: EMITIDO                         │
│ • Presupuesto → estado: REMITADO          │
└────────────────────┬──────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────┐
│ [Remito EMITIDO - Pendiente de facturar]  │
│ Puede pasar tiempo...                     │
└────────────────────┬──────────────────────┘
                     │
                     ▼
┌────────────────────┐
│ Botón "Facturar    │
│ Remito"            │
└────────┬───────────┘
         │
         ▼
┌───────────────────────────────────────────┐
│ SIEMPRE a Cuenta Corriente                │
│ (porque ya se entregó la mercadería)      │
│                                           │
│ • Validar cliente (crédito, bloqueo)      │
│ • Solicitar CAE                           │
│ • Crear movimiento Cta. Cte.              │
│ • Remito → estado: FACTURADO              │
│ • Vincular factura ↔ remito               │
└─────────────────────────────────────────┘
```

### 2.4 Remito Directo → Factura

```
┌────────────────────┐
│ Crear Remito       │
│ (sin presupuesto)  │
└────────┬───────────┘
         │
         ▼
┌───────────────────────────────────────────┐
│ Cargar items manualmente                  │
│ • Seleccionar cliente                     │
│ • Agregar productos                       │
│ • Asignar número de remito                │
│ • Estado: EMITIDO                         │
└────────────────────┬──────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────┐
│ Desde listado de remitos pendientes:      │
│ Botón "Facturar"                          │
│                                           │
│ → SIEMPRE Cuenta Corriente                │
│ → Mismo flujo que 2.3                     │
└───────────────────────────────────────────┘
```

---

## 3. MODELO DE DATOS COMPLETO

### 3.1 Tabla: siac_presupuestos

```sql
CREATE TABLE siac_presupuestos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- Identificación
    numero_presupuesto VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    vigencia_dias INTEGER DEFAULT 15,
    fecha_vencimiento DATE,

    -- Cliente
    cliente_id INTEGER REFERENCES siac_clientes(id),
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_cuit VARCHAR(15),
    cliente_domicilio TEXT,
    cliente_condicion_iva VARCHAR(50),
    cliente_condicion_iva_id INTEGER, -- Código AFIP 1-10

    -- Vendedor
    vendedor_id INTEGER,
    vendedor_nombre VARCHAR(100),

    -- Moneda
    moneda VARCHAR(3) DEFAULT 'ARS',
    cotizacion DECIMAL(15,4) DEFAULT 1,

    -- Totales
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(15,2) DEFAULT 0,
    neto_gravado DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_21 DECIMAL(15,2) DEFAULT 0,
    iva_10_5 DECIMAL(15,2) DEFAULT 0,
    iva_27 DECIMAL(15,2) DEFAULT 0,
    percepciones_iva DECIMAL(15,2) DEFAULT 0,
    percepciones_iibb DECIMAL(15,2) DEFAULT 0,
    impuestos_internos DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Estado y trazabilidad
    estado VARCHAR(20) DEFAULT 'BORRADOR',
    -- BORRADOR, ENVIADO, VISTO, ACEPTADO, RECHAZADO, REMITADO, FACTURADO, VENCIDO, ANULADO

    -- Fechas de seguimiento
    enviado_at TIMESTAMP,
    visto_at TIMESTAMP,
    aceptado_at TIMESTAMP,
    rechazado_at TIMESTAMP,
    motivo_rechazo TEXT,

    -- Referencias
    factura_id INTEGER, -- Si se facturó directamente
    remito_id INTEGER,  -- Si se generó remito

    observaciones TEXT,
    condiciones_comerciales TEXT,

    -- Auditoría
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, numero_presupuesto)
);

CREATE TABLE siac_presupuestos_items (
    id SERIAL PRIMARY KEY,
    presupuesto_id INTEGER NOT NULL REFERENCES siac_presupuestos(id) ON DELETE CASCADE,

    -- Producto
    producto_id INTEGER,
    codigo VARCHAR(50),
    descripcion VARCHAR(255) NOT NULL,
    unidad_medida VARCHAR(20) DEFAULT 'UN',

    -- Cantidades y precios
    cantidad DECIMAL(15,4) NOT NULL,
    precio_unitario DECIMAL(15,4) NOT NULL,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(15,2) DEFAULT 0,
    precio_final DECIMAL(15,4),

    -- Impuestos
    alicuota_iva DECIMAL(5,2) DEFAULT 21,
    monto_iva DECIMAL(15,2) DEFAULT 0,

    subtotal DECIMAL(15,2) NOT NULL,

    orden INTEGER DEFAULT 0,
    observaciones TEXT
);
```

### 3.2 Tabla: siac_remitos

```sql
CREATE TABLE siac_remitos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- Identificación
    tipo_remito VARCHAR(1) DEFAULT 'R', -- R=Remito, X=Remito X (sin valor fiscal)
    punto_venta INTEGER NOT NULL,
    numero_remito INTEGER NOT NULL,
    numero_completo VARCHAR(20), -- 0001-00000001
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,

    -- CAI (Código de Autorización de Impresión)
    cai VARCHAR(20),
    cai_vencimiento DATE,

    -- Cliente
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id),
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

    -- Origen
    presupuesto_id INTEGER REFERENCES siac_presupuestos(id),

    -- Estado
    estado VARCHAR(20) DEFAULT 'EMITIDO',
    -- EMITIDO, ENTREGADO, FACTURADO, ANULADO

    factura_id INTEGER, -- Cuando se factura
    facturado_at TIMESTAMP,

    observaciones TEXT,

    -- Auditoría
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, punto_venta, numero_remito)
);

CREATE TABLE siac_remitos_items (
    id SERIAL PRIMARY KEY,
    remito_id INTEGER NOT NULL REFERENCES siac_remitos(id) ON DELETE CASCADE,

    -- Producto
    producto_id INTEGER,
    codigo VARCHAR(50),
    descripcion VARCHAR(255) NOT NULL,
    unidad_medida VARCHAR(20) DEFAULT 'UN',

    -- Cantidades
    cantidad DECIMAL(15,4) NOT NULL,

    -- Referencia al presupuesto (si aplica)
    presupuesto_item_id INTEGER,

    orden INTEGER DEFAULT 0,
    observaciones TEXT
);
```

### 3.3 Tabla: siac_facturas (mejorada)

```sql
CREATE TABLE siac_facturas (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- Identificación AFIP
    tipo_comprobante INTEGER NOT NULL, -- 1=Fc A, 6=Fc B, 11=Fc C, etc.
    letra VARCHAR(1) NOT NULL, -- A, B, C, M
    punto_venta INTEGER NOT NULL,
    numero_comprobante INTEGER NOT NULL,
    numero_completo VARCHAR(20), -- 0001-00000001
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,

    -- CAE
    cae VARCHAR(20),
    cae_vencimiento DATE,
    estado_afip VARCHAR(20) DEFAULT 'PENDIENTE',
    -- PENDIENTE, APROBADO, RECHAZADO, OBSERVADO

    -- Cliente
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id),
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_tipo_documento INTEGER NOT NULL, -- 80=CUIT, 96=DNI, 99=CF
    cliente_documento VARCHAR(15) NOT NULL,
    cliente_domicilio TEXT,
    cliente_condicion_iva VARCHAR(50),
    cliente_condicion_iva_id INTEGER NOT NULL, -- NUEVO: Código AFIP 1-10 (RG 5616)

    -- Concepto
    concepto INTEGER DEFAULT 1, -- 1=Productos, 2=Servicios, 3=Ambos
    fecha_servicio_desde DATE,
    fecha_servicio_hasta DATE,
    fecha_vencimiento_pago DATE,

    -- Moneda (NUEVO: soporte completo multi-moneda)
    moneda VARCHAR(3) DEFAULT 'PES', -- PES, DOL, EUR
    cotizacion DECIMAL(15,4) DEFAULT 1,
    cancela_misma_moneda_ext BOOLEAN DEFAULT false, -- NUEVO: RG 5616

    -- Condición de venta
    condicion_venta VARCHAR(20) NOT NULL, -- CONTADO, CUENTA_CORRIENTE
    plazo_dias INTEGER DEFAULT 0,
    cantidad_cuotas INTEGER DEFAULT 1,

    -- Totales
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(15,2) DEFAULT 0,

    neto_gravado DECIMAL(15,2) NOT NULL DEFAULT 0,
    neto_no_gravado DECIMAL(15,2) DEFAULT 0,
    neto_exento DECIMAL(15,2) DEFAULT 0,

    iva_21 DECIMAL(15,2) DEFAULT 0,
    iva_10_5 DECIMAL(15,2) DEFAULT 0,
    iva_27 DECIMAL(15,2) DEFAULT 0,
    iva_5 DECIMAL(15,2) DEFAULT 0,
    iva_2_5 DECIMAL(15,2) DEFAULT 0,

    -- Percepciones y otros impuestos
    percepciones_iva DECIMAL(15,2) DEFAULT 0,
    percepciones_iibb DECIMAL(15,2) DEFAULT 0,
    percepciones_iibb_jurisdiccion VARCHAR(50),
    impuestos_internos DECIMAL(15,2) DEFAULT 0,
    otros_tributos DECIMAL(15,2) DEFAULT 0,

    total DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Estado de pago
    estado_pago VARCHAR(20) DEFAULT 'PENDIENTE',
    -- PENDIENTE, PARCIAL, PAGADO, ANULADO
    saldo_pendiente DECIMAL(15,2),

    -- Orígenes
    presupuesto_id INTEGER REFERENCES siac_presupuestos(id),
    remito_id INTEGER REFERENCES siac_remitos(id),

    -- Para NC/ND: comprobante asociado
    comprobante_asociado_tipo INTEGER,
    comprobante_asociado_punto_venta INTEGER,
    comprobante_asociado_numero INTEGER,

    -- PDF
    pdf_path VARCHAR(500),
    pdf_generado_at TIMESTAMP,

    observaciones TEXT,

    -- Auditoría
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, punto_venta, tipo_comprobante, numero_comprobante)
);

CREATE TABLE siac_facturas_items (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER NOT NULL REFERENCES siac_facturas(id) ON DELETE CASCADE,

    -- Producto
    producto_id INTEGER,
    codigo VARCHAR(50),
    descripcion VARCHAR(255) NOT NULL,
    unidad_medida VARCHAR(20) DEFAULT 'UN',

    -- Cantidades y precios
    cantidad DECIMAL(15,4) NOT NULL,
    precio_unitario DECIMAL(15,4) NOT NULL,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(15,2) DEFAULT 0,
    precio_final DECIMAL(15,4),

    bonificacion_porcentaje DECIMAL(5,2) DEFAULT 0,

    -- Impuestos
    alicuota_iva_id INTEGER, -- Código AFIP: 3=0%, 4=10.5%, 5=21%, 6=27%
    alicuota_iva_porcentaje DECIMAL(5,2) DEFAULT 21,
    base_imponible DECIMAL(15,2),
    monto_iva DECIMAL(15,2) DEFAULT 0,

    subtotal DECIMAL(15,2) NOT NULL,

    -- Referencias
    presupuesto_item_id INTEGER,
    remito_item_id INTEGER,

    orden INTEGER DEFAULT 0
);

-- Tabla separada para IVAs (requerido por AFIP cuando hay múltiples alícuotas)
CREATE TABLE siac_facturas_iva (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER NOT NULL REFERENCES siac_facturas(id) ON DELETE CASCADE,

    alicuota_id INTEGER NOT NULL, -- 3, 4, 5, 6, 8, 9
    base_imponible DECIMAL(15,2) NOT NULL,
    importe DECIMAL(15,2) NOT NULL
);

-- Tabla para tributos adicionales (percepciones, etc.)
CREATE TABLE siac_facturas_tributos (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER NOT NULL REFERENCES siac_facturas(id) ON DELETE CASCADE,

    tributo_id INTEGER NOT NULL, -- 1=IVA, 2=Nac, 3=Prov, 4=Mun, 5=Int, 99=Otros
    descripcion VARCHAR(100),
    base_imponible DECIMAL(15,2),
    alicuota DECIMAL(5,2),
    importe DECIMAL(15,2) NOT NULL
);
```

### 3.4 Tabla: siac_cajas

```sql
-- Definición de cajas/puntos de cobro
CREATE TABLE siac_cajas (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

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

    UNIQUE(company_id, codigo)
);

-- Turnos de caja (sesiones de apertura/cierre)
CREATE TABLE siac_caja_turnos (
    id SERIAL PRIMARY KEY,
    caja_id INTEGER NOT NULL REFERENCES siac_cajas(id),

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
    transferido_a_caja_id INTEGER,
    monto_transferido DECIMAL(15,2),
    fecha_transferencia TIMESTAMP,

    observaciones_apertura TEXT,
    observaciones_cierre TEXT,

    estado VARCHAR(20) DEFAULT 'ABIERTO', -- ABIERTO, CERRADO, AUDITADO, TRANSFERIDO

    created_at TIMESTAMP DEFAULT NOW()
);

-- Movimientos de caja
CREATE TABLE siac_caja_movimientos (
    id SERIAL PRIMARY KEY,
    turno_id INTEGER NOT NULL REFERENCES siac_caja_turnos(id),

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
    recibo_id INTEGER,

    -- Detalles según medio de pago
    -- Cheque
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

-- Arqueo detallado de caja
CREATE TABLE siac_caja_arqueo (
    id SERIAL PRIMARY KEY,
    turno_id INTEGER NOT NULL REFERENCES siac_caja_turnos(id),

    -- Efectivo en pesos
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
```

### 3.5 Tabla: siac_cuenta_corriente

```sql
-- Movimientos de cuenta corriente
CREATE TABLE siac_cuenta_corriente (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id),

    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,

    tipo VARCHAR(20) NOT NULL, -- DEBITO, CREDITO
    concepto VARCHAR(50) NOT NULL,
    -- DEBITO: FACTURA, NOTA_DEBITO, INTERES_MORA, AJUSTE_DEBITO
    -- CREDITO: RECIBO, NOTA_CREDITO, ANTICIPO, AJUSTE_CREDITO

    -- Comprobante origen
    comprobante_tipo VARCHAR(20),
    comprobante_numero VARCHAR(20),
    factura_id INTEGER REFERENCES siac_facturas(id),
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

-- Índices para performance
CREATE INDEX idx_cta_cte_cliente ON siac_cuenta_corriente(cliente_id);
CREATE INDEX idx_cta_cte_fecha ON siac_cuenta_corriente(fecha);
CREATE INDEX idx_cta_cte_estado ON siac_cuenta_corriente(estado);
CREATE INDEX idx_cta_cte_vencimiento ON siac_cuenta_corriente(fecha_vencimiento);

-- Vista de resumen por cliente
CREATE TABLE siac_cuenta_corriente_resumen (
    cliente_id INTEGER PRIMARY KEY REFERENCES siac_clientes(id),
    company_id INTEGER NOT NULL,

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

-- Trigger para actualizar resumen
CREATE OR REPLACE FUNCTION actualizar_resumen_cta_cte()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular todo el resumen del cliente
    INSERT INTO siac_cuenta_corriente_resumen (cliente_id, company_id, saldo_total, updated_at)
    SELECT
        NEW.cliente_id,
        NEW.company_id,
        COALESCE(SUM(debe) - SUM(haber), 0),
        NOW()
    FROM siac_cuenta_corriente
    WHERE cliente_id = NEW.cliente_id
    ON CONFLICT (cliente_id) DO UPDATE SET
        saldo_total = EXCLUDED.saldo_total,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_resumen_cta_cte
AFTER INSERT OR UPDATE OR DELETE ON siac_cuenta_corriente
FOR EACH ROW EXECUTE FUNCTION actualizar_resumen_cta_cte();
```

### 3.6 Tablas de Cobranzas

```sql
-- Recibos de cobro
CREATE TABLE siac_recibos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- Numeración
    punto_venta INTEGER NOT NULL,
    numero_recibo INTEGER NOT NULL,
    numero_completo VARCHAR(20),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Cliente
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id),
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

    UNIQUE(company_id, punto_venta, numero_recibo)
);

-- Detalle: imputación a facturas
CREATE TABLE siac_recibos_imputaciones (
    id SERIAL PRIMARY KEY,
    recibo_id INTEGER NOT NULL REFERENCES siac_recibos(id) ON DELETE CASCADE,

    factura_id INTEGER REFERENCES siac_facturas(id),
    movimiento_cta_cte_id INTEGER REFERENCES siac_cuenta_corriente(id),

    factura_numero VARCHAR(20),
    factura_fecha DATE,
    factura_total DECIMAL(15,2),
    saldo_anterior DECIMAL(15,2),

    monto_imputado DECIMAL(15,2) NOT NULL,
    saldo_posterior DECIMAL(15,2),

    es_anticipo BOOLEAN DEFAULT false
);

-- Detalle: medios de pago
CREATE TABLE siac_recibos_medios_pago (
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

-- Cartera de cheques
CREATE TABLE siac_cheques_cartera (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- Origen
    recibo_medio_pago_id INTEGER REFERENCES siac_recibos_medios_pago(id),
    cliente_origen_id INTEGER REFERENCES siac_clientes(id),

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
    -- EN_CARTERA, DEPOSITADO, COBRADO, RECHAZADO, ENDOSADO, DESCONTADO

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

-- Seguimiento de cobranza
CREATE TABLE siac_cobranza_seguimiento (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id),

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
```

---

## 4. CAMPOS PARA CUMPLIMIENTO AFIP 2025

### 4.1 Condición IVA Receptor (RG 5616) - OBLIGATORIO

```javascript
const CONDICION_IVA_RECEPTOR = {
    1: { codigo: 1, descripcion: 'IVA Responsable Inscripto' },
    2: { codigo: 2, descripcion: 'IVA Responsable no Inscripto' },
    3: { codigo: 3, descripcion: 'IVA no Responsable' },
    4: { codigo: 4, descripcion: 'IVA Sujeto Exento' },
    5: { codigo: 5, descripcion: 'Consumidor Final' },
    6: { codigo: 6, descripcion: 'Responsable Monotributo' },
    7: { codigo: 7, descripcion: 'Sujeto no Categorizado' },
    8: { codigo: 8, descripcion: 'Proveedor del Exterior' },
    9: { codigo: 9, descripcion: 'Cliente del Exterior' },
    10: { codigo: 10, descripcion: 'IVA Liberado - Ley 19.640' },
    11: { codigo: 11, descripcion: 'IVA Responsable Inscripto - Agente de Percepción' },
    12: { codigo: 12, descripcion: 'Pequeño Contribuyente Eventual' },
    13: { codigo: 13, descripcion: 'Monotributista Social' },
    14: { codigo: 14, descripcion: 'Pequeño Contribuyente Eventual Social' }
};

// Mapeo condición fiscal → código AFIP
function getCondicionIvaReceptorId(condicionFiscal) {
    const mapeo = {
        'RESPONSABLE_INSCRIPTO': 1,
        'RI': 1,
        'RESPONSABLE_NO_INSCRIPTO': 2,
        'RNI': 2,
        'NO_RESPONSABLE': 3,
        'NR': 3,
        'EXENTO': 4,
        'EX': 4,
        'CONSUMIDOR_FINAL': 5,
        'CF': 5,
        'MONOTRIBUTO': 6,
        'MONOTRIBUTISTA': 6,
        'MT': 6
    };
    return mapeo[condicionFiscal.toUpperCase()] || 5; // Default: CF
}
```

### 4.2 Moneda Extranjera (RG 5616)

```javascript
// Al facturar en USD:
const facturaUSD = {
    MonId: 'DOL',
    MonCotiz: cotizacionBNA, // Tipo vendedor día anterior

    // NUEVO CAMPO OBLIGATORIO:
    CancelaMismaMonedaExt: true/false
    // true = el cliente pagará en USD
    // false = el cliente pagará en ARS (se usará cotización del día de pago)
};

// Consultar cotización automática
async function getCotizacionBNA(moneda = 'DOL') {
    // WSFEv1: FEParamGetCotizacion
    const response = await afipService.FEParamGetCotizacion({
        MonId: moneda
    });
    return response.ResultGet.MonCotiz;
}
```

---

## 5. FRONTEND - DISEÑO DARK THEME

### 5.1 Paleta de Colores

```css
:root {
    /* Backgrounds */
    --bg-primary: #0f1419;
    --bg-secondary: #1a1f25;
    --bg-card: rgba(26, 31, 37, 0.95);
    --bg-hover: rgba(255, 255, 255, 0.05);
    --bg-input: rgba(0, 0, 0, 0.3);

    /* Borders */
    --border-color: rgba(255, 255, 255, 0.1);
    --border-focus: #4a9eff;

    /* Text */
    --text-primary: #e6edf3;
    --text-secondary: rgba(255, 255, 255, 0.7);
    --text-muted: rgba(255, 255, 255, 0.5);

    /* Accents */
    --accent-blue: #4a9eff;
    --accent-green: #3dd56d;
    --accent-yellow: #f0b429;
    --accent-orange: #ff9500;
    --accent-red: #ff6b6b;
    --accent-purple: #a855f7;

    /* Status */
    --status-success: #22c55e;
    --status-warning: #eab308;
    --status-error: #ef4444;
    --status-info: #3b82f6;

    /* Shadows */
    --shadow-sm: 0 2px 4px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
}
```

### 5.2 Componentes Comunes

```javascript
// Botón primario
const btnPrimary = `
    background: linear-gradient(135deg, var(--accent-blue), #357abd);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
`;

// Card con glassmorphism
const card = `
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    box-shadow: var(--shadow-md);
`;

// Input field
const input = `
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 14px;
    color: var(--text-primary);
    font-size: 14px;
    transition: border-color 0.2s;
`;

// Stats card
const statsCard = (color) => `
    background: linear-gradient(135deg, ${color}15, ${color}05);
    border: 1px solid ${color}30;
    border-radius: 12px;
    padding: 16px;
`;
```

---

## 6. ORDEN DE IMPLEMENTACIÓN

### Fase 1: Base de Datos (4-6h)
- [ ] Crear migración con todas las tablas
- [ ] Crear triggers y funciones
- [ ] Crear índices para performance
- [ ] Seed de datos de prueba

### Fase 2: Compliance AFIP 2025 (8-12h)
- [ ] Agregar condicion_iva_receptor_id al flujo
- [ ] Implementar cancela_misma_moneda_ext
- [ ] Consulta automática cotización BNA
- [ ] Actualizar constantes AFIP

### Fase 3: Presupuestos Mejorado (8-10h)
- [ ] API CRUD completa
- [ ] Frontend dark theme
- [ ] Botón "Facturar" con opciones
- [ ] Botón "Generar Remito"
- [ ] Estados y workflow

### Fase 4: Remitos (8-10h)
- [ ] API CRUD completa
- [ ] Frontend dark theme
- [ ] Generación desde presupuesto
- [ ] Botón "Facturar Remito"
- [ ] Lista de remitos pendientes

### Fase 5: Facturación Mejorada (16-20h)
- [ ] Integración con presupuestos
- [ ] Integración con remitos
- [ ] Percepciones (IVA, IIBB)
- [ ] Panel de medios de pago
- [ ] Condición de venta

### Fase 6: Cuentas Corrientes (12-16h)
- [ ] Movimientos automáticos
- [ ] Resumen por cliente
- [ ] Aging automático
- [ ] Vista de estado de cuenta
- [ ] Bloqueos automáticos

### Fase 7: Módulo de Caja (16-20h)
- [ ] Apertura/cierre de caja
- [ ] Registro de movimientos
- [ ] Arqueo detallado
- [ ] Transferencias entre cajas
- [ ] Reportes

### Fase 8: Cobranzas (16-20h)
- [ ] Recibos de cobro
- [ ] Imputación a facturas
- [ ] Cartera de cheques
- [ ] Seguimiento
- [ ] Lista de morosos

### Fase 9: PDF y Reportes (12-16h)
- [ ] Generador PDF facturas con QR
- [ ] PDF presupuestos
- [ ] PDF remitos
- [ ] PDF recibos
- [ ] Reportes varios

---

## 7. ESTIMACIÓN TOTAL

| Fase | Descripción | Horas |
|------|-------------|-------|
| 1 | Base de Datos | 4-6 |
| 2 | Compliance AFIP | 8-12 |
| 3 | Presupuestos | 8-10 |
| 4 | Remitos | 8-10 |
| 5 | Facturación | 16-20 |
| 6 | Cuentas Corrientes | 12-16 |
| 7 | Caja | 16-20 |
| 8 | Cobranzas | 16-20 |
| 9 | PDF y Reportes | 12-16 |
| **TOTAL** | | **100-130h** |

---

*Documento generado: 2025-12-17*
*Sistema: SIAC - APONNT*
