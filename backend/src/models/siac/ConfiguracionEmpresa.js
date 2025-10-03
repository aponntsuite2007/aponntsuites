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
 * Modelo de Configuración SIAC por Empresa
 * Replica la funcionalidad del módulo Configurador.pas de Delphi
 */
const ConfiguracionEmpresa = sequelize.define('SiacConfiguracionEmpresa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id',
        references: {
            model: 'companies',
            key: 'id'
        },
        unique: true // Una configuración por empresa
    },

    // DATOS DE LA EMPRESA
    razonSocial: {
        type: DataTypes.STRING(255),
        field: 'razon_social'
    },
    domicilio: {
        type: DataTypes.STRING(255),
        field: 'domicilio'
    },
    cuit: {
        type: DataTypes.STRING(15),
        field: 'cuit'
    },
    ingresosBrutos: {
        type: DataTypes.STRING(20),
        field: 'ingresos_brutos'
    },
    condicionIva: {
        type: DataTypes.STRING(50),
        defaultValue: 'RESPONSABLE_INSCRIPTO',
        field: 'condicion_iva'
    },
    licenciaInicio: {
        type: DataTypes.DATEONLY,
        field: 'licencia_inicio'
    },
    licenciaFin: {
        type: DataTypes.DATEONLY,
        field: 'licencia_fin'
    },

    // CONFIGURACIÓN FISCAL
    puntoVenta: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'punto_venta'
    },
    agenteRetencionIva: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'agente_retencion_iva'
    },
    agentePercepcionIva: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'agente_percepcion_iva'
    },
    agenteRetencionIb: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'agente_retencion_ib'
    },
    agentePercepcionIb: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'agente_percepcion_ib'
    },

    // PORCENTAJES DE IMPUESTOS
    porcRetencionIva: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 10.50,
        field: 'porc_retencion_iva'
    },
    porcPercepcionIva: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 21.00,
        field: 'porc_percepcion_iva'
    },
    porcRetencionIb: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 3.00,
        field: 'porc_retencion_ib'
    },
    porcPercepcionIb: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 3.50,
        field: 'porc_percepcion_ib'
    },

    // CONFIGURACIÓN DE FACTURACIÓN
    habilitaFacturacion: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'habilita_facturacion'
    },
    habilitaFacturasA: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'habilita_facturas_a'
    },
    habilitaNotaCredito: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'habilita_nota_credito'
    },
    habilitaFacturaSinStock: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'habilita_factura_sin_stock'
    },
    copiasFactura: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'copias_factura'
    },
    depositoFacturacion: {
        type: DataTypes.STRING(50),
        defaultValue: 'PRINCIPAL',
        field: 'deposito_facturacion'
    },

    // NUMERACIÓN DE COMPROBANTES
    facturaANumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'factura_a_numero'
    },
    facturaBNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'factura_b_numero'
    },
    facturaCNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'factura_c_numero'
    },
    notaCreditoNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'nota_credito_numero'
    },
    remitoNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'remito_numero'
    },
    reciboNumero: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'recibo_numero'
    },

    // CONFIGURACIÓN DE CÓDIGOS
    opcionCodigoClientes: {
        type: DataTypes.STRING(20),
        defaultValue: 'AUTOMATICO',
        field: 'opcion_codigo_clientes'
    },
    opcionCodigoArticulos: {
        type: DataTypes.STRING(20),
        defaultValue: 'AUTOMATICO',
        field: 'opcion_codigo_articulos'
    },
    cantDigitosArticulo: {
        type: DataTypes.INTEGER,
        defaultValue: 6,
        field: 'cant_digitos_articulo'
    },
    cantDigitosCantidad: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        field: 'cant_digitos_cantidad'
    },

    // CONFIGURACIÓN DE STOCK
    actualizaVentaConCosto: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'actualiza_venta_con_costo'
    },
    ingresaPrecioVenta: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'ingresa_precio_venta'
    },
    calculaMargenProducto: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'calcula_margen_producto'
    },

    // CONFIGURACIÓN DE TURNOS
    fuerzaInicioTurno: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'fuerza_inicio_turno'
    },
    horaCierreDiario: {
        type: DataTypes.TIME,
        defaultValue: '23:59:00',
        field: 'hora_cierre_diario'
    },

    // CONFIGURACIÓN DE BACKUP
    pathBackup: {
        type: DataTypes.STRING(500),
        field: 'path_backup'
    },
    modoBackup: {
        type: DataTypes.STRING(20),
        defaultValue: 'AUTOMATICO',
        field: 'modo_backup'
    },
    horarioBackup: {
        type: DataTypes.TIME,
        defaultValue: '02:00:00',
        field: 'horario_backup'
    },
    backupBases: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'backup_bases'
    },
    backupCierresDiarios: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'backup_cierres_diarios'
    },

    // CONFIGURACIÓN DE DEPÓSITOS
    nombreDeposito01: {
        type: DataTypes.STRING(100),
        defaultValue: 'Principal',
        field: 'nombre_deposito_01'
    },
    nombreDeposito02: {
        type: DataTypes.STRING(100),
        field: 'nombre_deposito_02'
    },
    nombreDeposito03: {
        type: DataTypes.STRING(100),
        field: 'nombre_deposito_03'
    },
    nombreDeposito04: {
        type: DataTypes.STRING(100),
        field: 'nombre_deposito_04'
    },
    nombreDeposito05: {
        type: DataTypes.STRING(100),
        field: 'nombre_deposito_05'
    },

    // CONFIGURACIÓN DE STOCK CRÍTICO
    stockNormalHasta: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        field: 'stock_normal_hasta'
    },
    stockAltoHasta: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
        field: 'stock_alto_hasta'
    },
    stockCriticoMasDe: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
        field: 'stock_critico_mas_de'
    },

    // CONFIGURACIÓN DE LOCALIZACIÓN
    pais: {
        type: DataTypes.STRING(3),
        defaultValue: 'ARG',
        field: 'pais'
    },
    moneda: {
        type: DataTypes.STRING(3),
        defaultValue: 'ARS',
        field: 'moneda'
    },
    idioma: {
        type: DataTypes.STRING(3),
        defaultValue: 'ES',
        field: 'idioma'
    },
    zonaHoraria: {
        type: DataTypes.STRING(50),
        defaultValue: 'America/Argentina/Buenos_Aires',
        field: 'zona_horaria'
    },

    // CONFIGURACIÓN ADICIONAL (JSONB para flexibilidad futura)
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    },

    // AUDITORÍA
    createdBy: {
        type: DataTypes.INTEGER,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        field: 'updated_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'siac_configuracion_empresa',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    // Hooks para auditoría
    hooks: {
        beforeUpdate: (configuracion, options) => {
            if (options.userId) {
                configuracion.updatedBy = options.userId;
            }
        }
    }
});

/**
 * Métodos de instancia útiles
 */
ConfiguracionEmpresa.prototype.esAgenteRetencion = function() {
    return this.agenteRetencionIva || this.agenteRetencionIb;
};

ConfiguracionEmpresa.prototype.esAgentePercepcion = function() {
    return this.agentePercepcionIva || this.agentePercepcionIb;
};

ConfiguracionEmpresa.prototype.getProximoNumero = function(tipoComprobante) {
    const campo = `${tipoComprobante}Numero`;
    return this[campo] || 1;
};

ConfiguracionEmpresa.prototype.incrementarNumero = async function(tipoComprobante) {
    const campo = `${tipoComprobante}Numero`;
    this[campo] = (this[campo] || 0) + 1;
    await this.save();
    return this[campo];
};

/**
 * Métodos estáticos
 */
ConfiguracionEmpresa.getDefault = function(companyId) {
    return {
        companyId,
        razonSocial: '',
        condicionIva: 'RESPONSABLE_INSCRIPTO',
        puntoVenta: 1,
        habilitaFacturacion: true,
        opcionCodigoClientes: 'AUTOMATICO',
        opcionCodigoArticulos: 'AUTOMATICO',
        pais: 'ARG',
        moneda: 'ARS'
    };
};

module.exports = ConfiguracionEmpresa;