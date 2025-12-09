const { DataTypes, Sequelize } = require('sequelize');

// Configurar conexión directa para los modelos SIAC
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

/**
 * ============================================================================
 * MODELO PRESUPUESTO SIAC - SISTEMA DE 3 MODOS DE FACTURACIÓN
 * ============================================================================
 * Soporta 3 modos de facturación:
 * - OCASIONAL: Presupuesto que se factura UNA VEZ
 * - RECURRENTE: Presupuesto que se factura periódicamente (MONTHLY, QUARTERLY, YEARLY)
 * - MANUAL: No aplica (factura directa sin presupuesto previo)
 */

const Presupuesto = sequelize.define('Presupuesto', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    // ========================================
    // MULTI-TENANT
    // ========================================
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id'
    },

    // ========================================
    // NUMERACIÓN DEL PRESUPUESTO
    // ========================================
    numeroPresupuesto: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'numero_presupuesto'
    },
    prefijo: {
        type: DataTypes.STRING(10),
        field: 'prefijo'
    },
    numero: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'numero'
    },

    // ========================================
    // CLIENTE (compatible con siac_clientes)
    // ========================================
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

    // ========================================
    // FECHAS
    // ========================================
    fechaEmision: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'fecha_emision'
    },
    fechaValidez: {
        type: DataTypes.DATEONLY,
        field: 'fecha_validez'
    },

    // ========================================
    // MODO DE FACTURACIÓN (CRÍTICO)
    // ========================================
    tipoFacturacion: {
        type: DataTypes.ENUM('OCASIONAL', 'RECURRENTE'),
        defaultValue: 'OCASIONAL',
        field: 'tipo_facturacion'
    },
    frecuenciaFacturacion: {
        type: DataTypes.ENUM('MONTHLY', 'QUARTERLY', 'YEARLY'),
        field: 'frecuencia_facturacion'
    },
    fechaInicioFacturacion: {
        type: DataTypes.DATEONLY,
        field: 'fecha_inicio_facturacion'
    },
    fechaFinFacturacion: {
        type: DataTypes.DATEONLY,
        field: 'fecha_fin_facturacion'
    },
    proximoPeriodoFacturacion: {
        type: DataTypes.DATEONLY,
        field: 'proximo_periodo_facturacion'
    },

    // ========================================
    // ITEMS DEL PRESUPUESTO (JSONB)
    // ========================================
    items: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'items'
    },

    // ========================================
    // TOTALES (compatible con siac_facturas)
    // ========================================
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'subtotal'
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
    totalPresupuesto: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_presupuesto'
    },

    // ========================================
    // ESTADO DEL PRESUPUESTO
    // ========================================
    estado: {
        type: DataTypes.ENUM(
            'PENDIENTE',
            'APROBADO',
            'RECHAZADO',
            'VENCIDO',
            'FACTURADO',   // Solo para OCASIONAL
            'ACTIVO',      // Solo para RECURRENTE
            'FINALIZADO'   // Terminó facturación recurrente
        ),
        defaultValue: 'PENDIENTE',
        field: 'estado'
    },
    fechaAprobacion: {
        type: DataTypes.DATE,
        field: 'fecha_aprobacion'
    },
    aprobadoPor: {
        type: DataTypes.STRING(255),
        field: 'aprobado_por'
    },

    // ========================================
    // TRACKING DE FACTURAS GENERADAS
    // ========================================
    cantidadFacturasGeneradas: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'cantidad_facturas_generadas'
    },
    facturasGeneradas: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'facturas_generadas'
    },

    // ========================================
    // REFERENCIA A CONTRATO (caso Aponnt)
    // ========================================
    contractId: {
        type: DataTypes.UUID,
        field: 'contract_id'
    },

    // ========================================
    // NOTAS
    // ========================================
    observaciones: {
        type: DataTypes.TEXT,
        field: 'observaciones'
    },
    notasInternas: {
        type: DataTypes.TEXT,
        field: 'notas_internas'
    },
    terminosCondiciones: {
        type: DataTypes.TEXT,
        field: 'terminos_condiciones'
    },
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    },

    // ========================================
    // AUDITORÍA
    // ========================================
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    },
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
    tableName: 'siac_presupuestos',
    timestamps: false, // Manejamos manualmente created_at/updated_at
    underscored: true
});

/**
 * ============================================================================
 * MÉTODOS DE INSTANCIA
 * ============================================================================
 */

/**
 * Verifica si el presupuesto está listo para facturar (caso RECURRENTE)
 */
Presupuesto.prototype.isReadyToBill = function() {
    if (this.tipoFacturacion !== 'RECURRENTE') {
        return false;
    }

    if (this.estado !== 'ACTIVO') {
        return false;
    }

    if (!this.proximoPeriodoFacturacion) {
        return false;
    }

    const today = new Date();
    const nextPeriod = new Date(this.proximoPeriodoFacturacion);

    return nextPeriod <= today;
};

/**
 * Calcula el próximo período de facturación
 */
Presupuesto.prototype.calculateNextPeriod = function() {
    if (this.tipoFacturacion !== 'RECURRENTE') {
        throw new Error('Solo aplica a presupuestos RECURRENTE');
    }

    const currentPeriod = new Date(this.proximoPeriodoFacturacion || this.fechaInicioFacturacion);
    let nextPeriod = new Date(currentPeriod);

    switch (this.frecuenciaFacturacion) {
        case 'MONTHLY':
            nextPeriod.setMonth(nextPeriod.getMonth() + 1);
            break;
        case 'QUARTERLY':
            nextPeriod.setMonth(nextPeriod.getMonth() + 3);
            break;
        case 'YEARLY':
            nextPeriod.setFullYear(nextPeriod.getFullYear() + 1);
            break;
        default:
            throw new Error(`Frecuencia no válida: ${this.frecuenciaFacturacion}`);
    }

    return nextPeriod;
};

/**
 * Registra una factura generada desde este presupuesto
 */
Presupuesto.prototype.registerGeneratedInvoice = async function(facturaId, numeroFactura, period) {
    const newEntry = {
        factura_id: facturaId,
        numero_factura: numeroFactura,
        period: period,
        generated_at: new Date()
    };

    this.facturasGeneradas = [...(this.facturasGeneradas || []), newEntry];
    this.cantidadFacturasGeneradas = (this.cantidadFacturasGeneradas || 0) + 1;

    // Si es RECURRENTE, avanzar al próximo período
    if (this.tipoFacturacion === 'RECURRENTE') {
        this.proximoPeriodoFacturacion = this.calculateNextPeriod();
    }

    await this.save();
};

/**
 * ============================================================================
 * MÉTODOS ESTÁTICOS
 * ============================================================================
 */

/**
 * Obtener presupuestos listos para facturar (cron job)
 */
Presupuesto.getReadyToBill = async function() {
    return await Presupuesto.findAll({
        where: {
            tipoFacturacion: 'RECURRENTE',
            estado: 'ACTIVO',
            proximoPeriodoFacturacion: {
                [Sequelize.Op.lte]: new Date()
            }
        },
        order: [['proximoPeriodoFacturacion', 'ASC']]
    });
};

module.exports = Presupuesto;
