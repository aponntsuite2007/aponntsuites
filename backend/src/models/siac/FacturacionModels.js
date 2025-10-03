/**
 * Modelos Sequelize para el módulo FACTURACIÓN
 * Arquitectura modular con triple aislación: EMPRESA → PUNTO_VENTA → CAJA
 * Integración inteligente con módulos Clientes y Productos
 */

const { Sequelize, DataTypes } = require('sequelize');

// Configurar conexión
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

// Importar función de módulos (reutilizar)
async function moduloContratado(companyId, moduloCodigo) {
    try {
        const [results] = await sequelize.query(`
            SELECT siac_modulo_contratado(?, ?) as contratado
        `, {
            replacements: [companyId, moduloCodigo],
            type: Sequelize.QueryTypes.SELECT
        });
        return results?.contratado || false;
    } catch (error) {
        console.log('Error verificando módulo:', error.message);
        return false;
    }
}

// =====================================
// 1. MODELO: PuntoVenta
// =====================================
const PuntoVenta = sequelize.define('PuntoVenta', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id'
    },
    codigoPuntoVenta: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'codigo_punto_venta'
    },
    nombrePuntoVenta: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'nombre_punto_venta'
    },
    direccion: {
        type: DataTypes.TEXT,
        field: 'direccion'
    },
    telefono: {
        type: DataTypes.STRING(50),
        field: 'telefono'
    },
    email: {
        type: DataTypes.STRING(100),
        field: 'email'
    },
    responsableNombre: {
        type: DataTypes.STRING(100),
        field: 'responsable_nombre'
    },
    responsableDocumento: {
        type: DataTypes.STRING(20),
        field: 'responsable_documento'
    },

    // Configuración fiscal
    cuitEmpresa: {
        type: DataTypes.STRING(13),
        allowNull: false,
        field: 'cuit_empresa'
    },
    razonSocialEmpresa: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'razon_social_empresa'
    },
    condicionIva: {
        type: DataTypes.STRING(50),
        defaultValue: 'RESPONSABLE_INSCRIPTO',
        field: 'condicion_iva'
    },

    // AFIP Argentina
    puntoVentaAfip: {
        type: DataTypes.INTEGER,
        field: 'punto_venta_afip'
    },
    certificadoAfip: {
        type: DataTypes.TEXT,
        field: 'certificado_afip'
    },
    claveFiscal: {
        type: DataTypes.TEXT,
        field: 'clave_fiscal'
    },

    // Configuración de facturación
    permiteFacturaA: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_factura_a'
    },
    permiteFacturaB: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_factura_b'
    },
    permiteFacturaC: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_factura_c'
    },
    permiteNotaCredito: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_nota_credito'
    },
    permiteNotaDebito: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_nota_debito'
    },
    permitePresupuestos: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_presupuestos'
    },

    // Estado
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    predeterminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    },

    // Auditoría
    createdBy: {
        type: DataTypes.INTEGER,
        field: 'created_by'
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        field: 'updated_by'
    }
}, {
    tableName: 'siac_puntos_venta',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['company_id'] },
        { fields: ['activo'] },
        { fields: ['company_id', 'codigo_punto_venta'], unique: true }
    ]
});

// =====================================
// 2. MODELO: Caja
// =====================================
const Caja = sequelize.define('Caja', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    puntoVentaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'punto_venta_id'
    },
    codigoCaja: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'codigo_caja'
    },
    nombreCaja: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'nombre_caja'
    },
    descripcion: {
        type: DataTypes.TEXT
    },
    tipoCaja: {
        type: DataTypes.STRING(20),
        defaultValue: 'GENERAL',
        field: 'tipo_caja'
    },

    // Configuración formas de pago
    permiteEfectivo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_efectivo'
    },
    permiteTarjetas: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_tarjetas'
    },
    permiteCheques: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'permite_cheques'
    },
    permiteTransferencias: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'permite_transferencias'
    },
    permiteCuentaCorriente: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'permite_cuenta_corriente'
    },

    // Límites y configuraciones
    limiteEfectivo: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'limite_efectivo'
    },
    limiteDescuentoPorcentaje: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        field: 'limite_descuento_porcentaje'
    },
    requiereAutorizacionDescuento: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'requiere_autorizacion_descuento'
    },
    requiereSupervisorAnulacion: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'requiere_supervisor_anulacion'
    },

    // Estado
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    predeterminada: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    },

    // Auditoría
    createdBy: {
        type: DataTypes.INTEGER,
        field: 'created_by'
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        field: 'updated_by'
    }
}, {
    tableName: 'siac_cajas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['punto_venta_id'] },
        { fields: ['activo'] },
        { fields: ['punto_venta_id', 'codigo_caja'], unique: true }
    ]
});

// =====================================
// 3. MODELO: TipoComprobante
// =====================================
const TipoComprobante = sequelize.define('TipoComprobante', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id'
    },
    codigoTipo: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'codigo_tipo'
    },
    nombreTipo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'nombre_tipo'
    },
    descripcion: {
        type: DataTypes.TEXT
    },

    // Clasificación fiscal
    codigoAfip: {
        type: DataTypes.INTEGER,
        field: 'codigo_afip'
    },
    letraComprobante: {
        type: DataTypes.CHAR(1),
        field: 'letra_comprobante'
    },
    discriminaIva: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'discrimina_iva'
    },
    esFactura: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'es_factura'
    },
    esNotaCredito: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'es_nota_credito'
    },
    esNotaDebito: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'es_nota_debito'
    },
    esPresupuesto: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'es_presupuesto'
    },

    // Comportamiento
    afectaStock: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'afecta_stock'
    },
    afectaCuentaCorriente: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'afecta_cuenta_corriente'
    },
    requiereAutorizacion: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'requiere_autorizacion'
    },
    permiteDescuento: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_descuento'
    },

    // Numeración
    usaNumeracionAutomatica: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'usa_numeracion_automatica'
    },
    formatoNumero: {
        type: DataTypes.STRING(50),
        defaultValue: '00000-00000000',
        field: 'formato_numero'
    },

    // Estado
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    predeterminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    }
}, {
    tableName: 'siac_tipos_comprobantes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['company_id'] },
        { fields: ['letra_comprobante'] },
        { fields: ['company_id', 'codigo_tipo'], unique: true }
    ]
});

// =====================================
// 4. MODELO: Factura (Principal)
// =====================================
const Factura = sequelize.define('Factura', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cajaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'caja_id'
    },
    tipoComprobanteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'tipo_comprobante_id'
    },

    // Numeración
    numeroCompleto: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'numero_completo'
    },
    prefijo: {
        type: DataTypes.STRING(10)
    },
    numero: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    // Fechas
    fechaFactura: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'fecha_factura'
    },
    fechaVencimiento: {
        type: DataTypes.DATEONLY,
        field: 'fecha_vencimiento'
    },
    fechaEntrega: {
        type: DataTypes.DATEONLY,
        field: 'fecha_entrega'
    },

    // Cliente (integración inteligente)
    clienteId: {
        type: DataTypes.INTEGER,
        field: 'cliente_id'
    },
    clienteCodigo: {
        type: DataTypes.STRING(50),
        field: 'cliente_codigo'
    },
    clienteRazonSocial: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'cliente_razon_social'
    },
    clienteDocumentoTipo: {
        type: DataTypes.STRING(10),
        field: 'cliente_documento_tipo'
    },
    clienteDocumentoNumero: {
        type: DataTypes.STRING(20),
        field: 'cliente_documento_numero'
    },
    clienteDireccion: {
        type: DataTypes.TEXT,
        field: 'cliente_direccion'
    },
    clienteTelefono: {
        type: DataTypes.STRING(50),
        field: 'cliente_telefono'
    },
    clienteEmail: {
        type: DataTypes.STRING(100),
        field: 'cliente_email'
    },
    clienteCondicionIva: {
        type: DataTypes.STRING(50),
        defaultValue: 'CONSUMIDOR_FINAL',
        field: 'cliente_condicion_iva'
    },

    // Totales
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    },
    descuentoPorcentaje: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        field: 'descuento_porcentaje'
    },
    descuentoImporte: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'descuento_importe'
    },
    totalImpuestos: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'total_impuestos'
    },
    totalNeto: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'total_neto'
    },
    totalFactura: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_factura'
    },

    // Estado y control
    estado: {
        type: DataTypes.STRING(20),
        defaultValue: 'PENDIENTE'
    },
    facturaOriginalId: {
        type: DataTypes.INTEGER,
        field: 'factura_original_id'
    },
    motivoAnulacion: {
        type: DataTypes.TEXT,
        field: 'motivo_anulacion'
    },
    autorizadaPor: {
        type: DataTypes.INTEGER,
        field: 'autorizada_por'
    },

    // Datos fiscales
    cae: {
        type: DataTypes.STRING(50)
    },
    fechaVencimientoCae: {
        type: DataTypes.DATEONLY,
        field: 'fecha_vencimiento_cae'
    },
    codigoBarras: {
        type: DataTypes.TEXT,
        field: 'codigo_barras'
    },

    // Observaciones
    observaciones: {
        type: DataTypes.TEXT
    },
    notasInternas: {
        type: DataTypes.TEXT,
        field: 'notas_internas'
    },
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    },

    // Auditoría
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by'
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        field: 'updated_by'
    }
}, {
    tableName: 'siac_facturas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['caja_id'] },
        { fields: ['fecha_factura'] },
        { fields: ['cliente_id'] },
        { fields: ['estado'] },
        { fields: ['numero_completo'] },
        { fields: ['caja_id', 'tipo_comprobante_id', 'prefijo', 'numero'], unique: true }
    ]
});

// =====================================
// 5. MODELO: FacturaItem
// =====================================
const FacturaItem = sequelize.define('FacturaItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    facturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'factura_id'
    },
    numeroItem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'numero_item'
    },

    // Producto (integración inteligente)
    productoId: {
        type: DataTypes.INTEGER,
        field: 'producto_id'
    },
    productoCodigo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'producto_codigo'
    },
    productoDescripcion: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'producto_descripcion'
    },
    productoUnidadMedida: {
        type: DataTypes.STRING(20),
        defaultValue: 'UNI',
        field: 'producto_unidad_medida'
    },

    // Cantidades y precios
    cantidad: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 1
    },
    precioUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'precio_unitario'
    },
    descuentoPorcentaje: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        field: 'descuento_porcentaje'
    },
    descuentoImporte: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'descuento_importe'
    },

    // Subtotales
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    },
    subtotalConDescuento: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'subtotal_con_descuento'
    },

    // Impuestos por item
    alicuotaIva: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 21.00,
        field: 'alicuota_iva'
    },
    importeIva: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'importe_iva'
    },
    otrosImpuestos: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'otros_impuestos'
    },

    // Total del item
    totalItem: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_item'
    },

    // Información adicional del producto
    categoriaProducto: {
        type: DataTypes.STRING(100),
        field: 'categoria_producto'
    },
    marcaProducto: {
        type: DataTypes.STRING(100),
        field: 'marca_producto'
    },
    codigoBarras: {
        type: DataTypes.STRING(50),
        field: 'codigo_barras'
    },

    // Notas
    notas: {
        type: DataTypes.TEXT
    },
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    }
}, {
    tableName: 'siac_facturas_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['factura_id'] },
        { fields: ['producto_id'] },
        { fields: ['producto_codigo'] }
    ]
});

// =====================================
// 6. MODELO: FacturaImpuesto
// =====================================
const FacturaImpuesto = sequelize.define('FacturaImpuesto', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    facturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'factura_id'
    },
    codigoImpuesto: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'codigo_impuesto'
    },
    nombreImpuesto: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'nombre_impuesto'
    },
    tipoImpuesto: {
        type: DataTypes.STRING(50),
        defaultValue: 'IVA',
        field: 'tipo_impuesto'
    },
    baseImponible: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'base_imponible'
    },
    alicuotaPorcentaje: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'alicuota_porcentaje'
    },
    importeImpuesto: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'importe_impuesto'
    },
    condicionImpuesto: {
        type: DataTypes.STRING(50),
        field: 'condicion_impuesto'
    },
    codigoAfip: {
        type: DataTypes.INTEGER,
        field: 'codigo_afip'
    }
}, {
    tableName: 'siac_facturas_impuestos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { fields: ['factura_id'] },
        { fields: ['tipo_impuesto'] }
    ]
});

// =====================================
// 7. MODELO: FacturaPago
// =====================================
const FacturaPago = sequelize.define('FacturaPago', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    facturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'factura_id'
    },
    formaPago: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'forma_pago'
    },
    descripcionPago: {
        type: DataTypes.STRING(200),
        field: 'descripcion_pago'
    },
    importePago: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'importe_pago'
    },

    // Detalles para tarjetas
    numeroTarjeta: {
        type: DataTypes.STRING(20),
        field: 'numero_tarjeta'
    },
    tipoTarjeta: {
        type: DataTypes.STRING(50),
        field: 'tipo_tarjeta'
    },
    numeroCupon: {
        type: DataTypes.STRING(50),
        field: 'numero_cupon'
    },
    numeroLote: {
        type: DataTypes.STRING(20),
        field: 'numero_lote'
    },
    codigoAutorizacion: {
        type: DataTypes.STRING(50),
        field: 'codigo_autorizacion'
    },

    // Detalles para cheques
    numeroCheque: {
        type: DataTypes.STRING(50),
        field: 'numero_cheque'
    },
    bancoCheque: {
        type: DataTypes.STRING(100),
        field: 'banco_cheque'
    },
    fechaCheque: {
        type: DataTypes.DATEONLY,
        field: 'fecha_cheque'
    },
    fechaVencimientoCheque: {
        type: DataTypes.DATEONLY,
        field: 'fecha_vencimiento_cheque'
    },

    // Detalles para transferencias
    numeroOperacion: {
        type: DataTypes.STRING(50),
        field: 'numero_operacion'
    },
    bancoOrigen: {
        type: DataTypes.STRING(100),
        field: 'banco_origen'
    },

    // Para cuenta corriente
    generaCuentaCorriente: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'genera_cuenta_corriente'
    },

    // Estado del pago
    estadoPago: {
        type: DataTypes.STRING(20),
        defaultValue: 'CONFIRMADO',
        field: 'estado_pago'
    },
    fechaPago: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'fecha_pago'
    },

    // Configuración adicional
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    }
}, {
    tableName: 'siac_facturas_pagos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['factura_id'] },
        { fields: ['forma_pago'] },
        { fields: ['estado_pago'] }
    ]
});

// =====================================
// RELACIONES ENTRE MODELOS
// =====================================
function definirRelaciones() {
    // PuntoVenta → Cajas
    PuntoVenta.hasMany(Caja, {
        foreignKey: 'puntoVentaId',
        as: 'cajas'
    });
    Caja.belongsTo(PuntoVenta, {
        foreignKey: 'puntoVentaId',
        as: 'puntoVenta'
    });

    // Caja → Facturas
    Caja.hasMany(Factura, {
        foreignKey: 'cajaId',
        as: 'facturas'
    });
    Factura.belongsTo(Caja, {
        foreignKey: 'cajaId',
        as: 'caja'
    });

    // TipoComprobante → Facturas
    TipoComprobante.hasMany(Factura, {
        foreignKey: 'tipoComprobanteId',
        as: 'facturas'
    });
    Factura.belongsTo(TipoComprobante, {
        foreignKey: 'tipoComprobanteId',
        as: 'tipoComprobante'
    });

    // Factura → Items
    Factura.hasMany(FacturaItem, {
        foreignKey: 'facturaId',
        as: 'items'
    });
    FacturaItem.belongsTo(Factura, {
        foreignKey: 'facturaId',
        as: 'factura'
    });

    // Factura → Impuestos
    Factura.hasMany(FacturaImpuesto, {
        foreignKey: 'facturaId',
        as: 'impuestos'
    });
    FacturaImpuesto.belongsTo(Factura, {
        foreignKey: 'facturaId',
        as: 'factura'
    });

    // Factura → Pagos
    Factura.hasMany(FacturaPago, {
        foreignKey: 'facturaId',
        as: 'pagos'
    });
    FacturaPago.belongsTo(Factura, {
        foreignKey: 'facturaId',
        as: 'factura'
    });

    console.log('✅ Relaciones de facturación definidas correctamente');
}

// =====================================
// MÉTODOS ESTÁTICOS PARA INTEGRACIÓN
// =====================================

// Método para verificar módulos contratados
Factura.moduloContratado = moduloContratado;
PuntoVenta.moduloContratado = moduloContratado;
Caja.moduloContratado = moduloContratado;

// Método para obtener configuración de facturación
Factura.obtenerConfiguracion = async function(companyId) {
    const config = {
        clientesActivo: await moduloContratado(companyId, 'clientes'),
        productosActivo: await moduloContratado(companyId, 'productos'),
        cuentaCorrienteActivo: await moduloContratado(companyId, 'cuenta_corriente'),
        inventarioActivo: await moduloContratado(companyId, 'inventario')
    };

    return config;
};

// Método para obtener factura completa con datos relacionados
Factura.obtenerCompleta = async function(facturaId, companyId) {
    const config = await Factura.obtenerConfiguracion(companyId);

    const includeOptions = [
        { model: Caja, as: 'caja', include: [{ model: PuntoVenta, as: 'puntoVenta' }] },
        { model: TipoComprobante, as: 'tipoComprobante' },
        { model: FacturaItem, as: 'items' },
        { model: FacturaImpuesto, as: 'impuestos' },
        { model: FacturaPago, as: 'pagos' }
    ];

    const factura = await Factura.findByPk(facturaId, {
        include: includeOptions
    });

    if (factura) {
        // Agregar información de módulos disponibles
        factura.dataValues.modulosDisponibles = [];
        if (config.clientesActivo) factura.dataValues.modulosDisponibles.push('clientes');
        if (config.productosActivo) factura.dataValues.modulosDisponibles.push('productos');
        if (config.cuentaCorrienteActivo) factura.dataValues.modulosDisponibles.push('cuenta_corriente');
        if (config.inventarioActivo) factura.dataValues.modulosDisponibles.push('inventario');
    }

    return factura;
};

// Método para obtener próximo número de factura
Factura.obtenerProximoNumero = async function(cajaId, tipoComprobanteId) {
    try {
        const [results] = await sequelize.query(`
            SELECT siac_obtener_proximo_numero(?, ?) as numero
        `, {
            replacements: [cajaId, tipoComprobanteId],
            type: Sequelize.QueryTypes.SELECT
        });
        return results?.numero || 1;
    } catch (error) {
        console.error('Error obteniendo próximo número:', error);
        return 1;
    }
};

// Inicializar relaciones
definirRelaciones();

module.exports = {
    sequelize,
    PuntoVenta,
    Caja,
    TipoComprobante,
    Factura,
    FacturaItem,
    FacturaImpuesto,
    FacturaPago,
    moduloContratado
};