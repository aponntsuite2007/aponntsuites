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
 * MODELO CLIENTE SIAC - ARQUITECTURA ESCALABLE
 * ============================================================================
 * Sistema modular que detecta automáticamente módulos contratados
 * e integra inteligentemente funcionalidades según disponibilidad
 */

/**
 * Modelo principal de Clientes
 */
const Cliente = sequelize.define('Cliente', {
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

    // ========================================
    // IDENTIFICACIÓN Y DATOS PRINCIPALES
    // ========================================
    codigoCliente: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'codigo_cliente'
    },
    razonSocial: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'razon_social'
    },
    nombreFantasia: {
        type: DataTypes.STRING(255),
        field: 'nombre_fantasia'
    },
    tipoCliente: {
        type: DataTypes.STRING(20),
        defaultValue: 'PERSONA_FISICA',
        field: 'tipo_cliente'
    },

    // ========================================
    // DOCUMENTACIÓN TRIBUTARIA
    // ========================================
    documentoTipo: {
        type: DataTypes.STRING(20),
        defaultValue: 'CUIT',
        field: 'documento_tipo'
    },
    documentoNumero: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'documento_numero'
    },
    documentoFormateado: {
        type: DataTypes.STRING(30),
        field: 'documento_formateado'
    },

    // Integración automática con Tax Templates
    taxTemplateId: {
        type: DataTypes.INTEGER,
        field: 'tax_template_id'
    },
    condicionImpositivaId: {
        type: DataTypes.INTEGER,
        field: 'condicion_impositiva_id'
    },

    // ========================================
    // CONTACTO Y UBICACIÓN
    // ========================================
    email: {
        type: DataTypes.STRING(255),
        validate: {
            isEmail: true
        }
    },
    telefono: DataTypes.STRING(50),
    celular: DataTypes.STRING(50),
    whatsapp: DataTypes.STRING(50),
    website: DataTypes.STRING(255),

    // Domicilio Legal
    domicilioCalle: {
        type: DataTypes.STRING(255),
        field: 'domicilio_calle'
    },
    domicilioNumero: {
        type: DataTypes.STRING(20),
        field: 'domicilio_numero'
    },
    domicilioPiso: {
        type: DataTypes.STRING(10),
        field: 'domicilio_piso'
    },
    domicilioDepto: {
        type: DataTypes.STRING(10),
        field: 'domicilio_depto'
    },
    domicilioCompleto: {
        type: DataTypes.TEXT,
        field: 'domicilio_completo'
    },

    // Ubicación Geográfica
    ciudad: DataTypes.STRING(100),
    provinciaEstado: {
        type: DataTypes.STRING(100),
        field: 'provincia_estado'
    },
    codigoPostal: {
        type: DataTypes.STRING(20),
        field: 'codigo_postal'
    },
    pais: {
        type: DataTypes.STRING(100),
        defaultValue: 'Argentina'
    },

    // Coordenadas GPS
    latitud: {
        type: DataTypes.DECIMAL(10, 8)
    },
    longitud: {
        type: DataTypes.DECIMAL(11, 8)
    },

    // ========================================
    // CONFIGURACIÓN COMERCIAL
    // ========================================
    categoriaCliente: {
        type: DataTypes.STRING(50),
        defaultValue: 'GENERAL',
        field: 'categoria_cliente'
    },
    listaPrecio: {
        type: DataTypes.STRING(50),
        defaultValue: 'GENERAL',
        field: 'lista_precio'
    },
    descuentoMaximo: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        field: 'descuento_maximo'
    },

    // Límites de Crédito
    limiteCredito: {
        type: DataTypes.DECIMAL(15, 4),
        defaultValue: 0,
        field: 'limite_credito'
    },
    creditoDisponible: {
        type: DataTypes.DECIMAL(15, 4),
        defaultValue: 0,
        field: 'credito_disponible'
    },
    diasVencimiento: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        field: 'dias_vencimiento'
    },

    // ========================================
    // CONFIGURACIÓN FISCAL AVANZADA
    // ========================================
    exentoImpuestos: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'exento_impuestos'
    },
    aplicaRetencionIva: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'aplica_retencion_iva'
    },
    aplicaRetencionGanancias: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'aplica_retencion_ganancias'
    },
    aplicaRetencionIb: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'aplica_retencion_ib'
    },
    aplicaPercepcionIva: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'aplica_percepcion_iva'
    },
    aplicaPercepcionIb: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'aplica_percepcion_ib'
    },

    // Alícuotas personalizadas
    alicuotaRetencionIva: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'alicuota_retencion_iva'
    },
    alicuotaRetencionGanancias: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'alicuota_retencion_ganancias'
    },
    alicuotaRetencionIb: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'alicuota_retencion_ib'
    },
    alicuotaPercepcionIva: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'alicuota_percepcion_iva'
    },
    alicuotaPercepcionIb: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'alicuota_percepcion_ib'
    },

    // ========================================
    // DATOS COMERCIALES ADICIONALES
    // ========================================
    vendedorAsignadoId: {
        type: DataTypes.INTEGER,
        field: 'vendedor_asignado_id'
    },
    canalVenta: {
        type: DataTypes.STRING(50),
        defaultValue: 'DIRECTO',
        field: 'canal_venta'
    },
    origenCliente: {
        type: DataTypes.STRING(50),
        defaultValue: 'MANUAL',
        field: 'origen_cliente'
    },

    // Configuración de Facturación
    requiereOrdenCompra: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'requiere_orden_compra'
    },
    formatoFacturacion: {
        type: DataTypes.STRING(20),
        defaultValue: 'A',
        field: 'formato_facturacion'
    },
    emailFacturacion: {
        type: DataTypes.STRING(255),
        field: 'email_facturacion'
    },

    // ========================================
    // INFORMACIÓN ADICIONAL
    // ========================================
    fechaAlta: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        field: 'fecha_alta'
    },
    fechaPrimeraCompra: {
        type: DataTypes.DATEONLY,
        field: 'fecha_primera_compra'
    },
    fechaUltimaCompra: {
        type: DataTypes.DATEONLY,
        field: 'fecha_ultima_compra'
    },

    // Estadísticas comerciales (calculadas automáticamente)
    totalCompras: {
        type: DataTypes.DECIMAL(15, 4),
        defaultValue: 0,
        field: 'total_compras'
    },
    cantidadFacturas: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'cantidad_facturas'
    },
    promedioCompra: {
        type: DataTypes.DECIMAL(15, 4),
        defaultValue: 0,
        field: 'promedio_compra'
    },

    // Observaciones
    observaciones: DataTypes.TEXT,
    notasInternas: {
        type: DataTypes.TEXT,
        field: 'notas_internas'
    },

    // ========================================
    // CONFIGURACIÓN FLEXIBLE
    // ========================================
    configuracionAdicional: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_adicional'
    },
    datosExtra: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'datos_extra'
    },

    // ========================================
    // CONTROL DE ESTADO Y AUDITORÍA
    // ========================================
    estado: {
        type: DataTypes.STRING(20),
        defaultValue: 'ACTIVO'
    },
    motivoInactivacion: {
        type: DataTypes.TEXT,
        field: 'motivo_inactivacion'
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
    tableName: 'siac_clientes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['company_id', 'codigo_cliente']
        },
        {
            unique: true,
            fields: ['company_id', 'documento_numero']
        },
        {
            unique: true,
            fields: ['company_id', 'email']
        }
    ]
});

/**
 * Modelo de Contactos Adicionales
 */
const ClienteContacto = sequelize.define('ClienteContacto', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clienteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cliente_id'
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    apellido: DataTypes.STRING(100),
    cargo: DataTypes.STRING(100),
    departamento: DataTypes.STRING(100),
    telefono: DataTypes.STRING(50),
    celular: DataTypes.STRING(50),
    email: DataTypes.STRING(255),
    esContactoPrincipal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'es_contacto_principal'
    },
    recibeFacturas: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'recibe_facturas'
    },
    recibeCobranzas: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'recibe_cobranzas'
    },
    recibeMarketing: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'recibe_marketing'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'siac_clientes_contactos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

/**
 * Modelo de Direcciones Adicionales
 */
const ClienteDireccion = sequelize.define('ClienteDireccion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clienteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cliente_id'
    },
    tipoDireccion: {
        type: DataTypes.STRING(30),
        defaultValue: 'ADICIONAL',
        field: 'tipo_direccion'
    },
    nombreDireccion: {
        type: DataTypes.STRING(100),
        field: 'nombre_direccion'
    },
    calle: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    numero: DataTypes.STRING(20),
    piso: DataTypes.STRING(10),
    departamento: DataTypes.STRING(10),
    entreCalles: {
        type: DataTypes.STRING(255),
        field: 'entre_calles'
    },
    referencias: DataTypes.TEXT,
    ciudad: DataTypes.STRING(100),
    provinciaEstado: {
        type: DataTypes.STRING(100),
        field: 'provincia_estado'
    },
    codigoPostal: {
        type: DataTypes.STRING(20),
        field: 'codigo_postal'
    },
    pais: {
        type: DataTypes.STRING(100),
        defaultValue: 'Argentina'
    },
    latitud: DataTypes.DECIMAL(10, 8),
    longitud: DataTypes.DECIMAL(11, 8),
    esDireccionPrincipal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'es_direccion_principal'
    },
    activaParaFacturacion: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'activa_para_facturacion'
    },
    activaParaEntrega: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'activa_para_entrega'
    },
    horariosEntrega: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'horarios_entrega'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'siac_clientes_direcciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

/**
 * Modelo de Precios Especiales
 */
const ClientePrecioEspecial = sequelize.define('ClientePrecioEspecial', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clienteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cliente_id'
    },
    productoId: {
        type: DataTypes.INTEGER,
        field: 'producto_id'
    },
    productoCodigo: {
        type: DataTypes.STRING(50),
        field: 'producto_codigo'
    },
    productoDescripcion: {
        type: DataTypes.STRING(255),
        field: 'producto_descripcion'
    },
    precioEspecial: {
        type: DataTypes.DECIMAL(15, 4),
        allowNull: false,
        field: 'precio_especial'
    },
    moneda: {
        type: DataTypes.STRING(3),
        defaultValue: 'ARS'
    },
    tipoPrecio: {
        type: DataTypes.STRING(20),
        defaultValue: 'FIJO',
        field: 'tipo_precio'
    },
    valorDescuento: {
        type: DataTypes.DECIMAL(15, 4),
        field: 'valor_descuento'
    },
    fechaDesde: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        field: 'fecha_desde'
    },
    fechaHasta: {
        type: DataTypes.DATEONLY,
        field: 'fecha_hasta'
    },
    cantidadMinima: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'cantidad_minima'
    },
    soloContado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'solo_contado'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    createdBy: {
        type: DataTypes.INTEGER,
        field: 'created_by'
    }
}, {
    tableName: 'siac_clientes_precios_especiales',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

/**
 * Modelo de Módulos por Empresa
 */
const ModuloEmpresa = sequelize.define('ModuloEmpresa', {
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
    moduloCodigo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'modulo_codigo'
    },
    moduloNombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'modulo_nombre'
    },
    moduloDescripcion: {
        type: DataTypes.TEXT,
        field: 'modulo_descripcion'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    fechaContratacion: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        field: 'fecha_contratacion'
    },
    fechaVencimiento: {
        type: DataTypes.DATEONLY,
        field: 'fecha_vencimiento'
    },
    configuracion: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    precioMensual: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'precio_mensual'
    }
}, {
    tableName: 'siac_modulos_empresa',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['company_id', 'modulo_codigo']
        }
    ]
});

// ============================================================================
// DEFINICIÓN DE ASOCIACIONES
// ============================================================================

// Cliente tiene muchos contactos
Cliente.hasMany(ClienteContacto, {
    foreignKey: 'cliente_id',
    as: 'contactos',
    onDelete: 'CASCADE'
});
ClienteContacto.belongsTo(Cliente, {
    foreignKey: 'cliente_id',
    as: 'cliente'
});

// Cliente tiene muchas direcciones
Cliente.hasMany(ClienteDireccion, {
    foreignKey: 'cliente_id',
    as: 'direcciones',
    onDelete: 'CASCADE'
});
ClienteDireccion.belongsTo(Cliente, {
    foreignKey: 'cliente_id',
    as: 'cliente'
});

// Cliente tiene muchos precios especiales
Cliente.hasMany(ClientePrecioEspecial, {
    foreignKey: 'cliente_id',
    as: 'preciosEspeciales',
    onDelete: 'CASCADE'
});
ClientePrecioEspecial.belongsTo(Cliente, {
    foreignKey: 'cliente_id',
    as: 'cliente'
});

// ============================================================================
// MÉTODOS ESTÁTICOS PARA INTEGRACIÓN MODULAR
// ============================================================================

/**
 * Verifica si un módulo está contratado por la empresa
 */
Cliente.moduloContratado = async function(companyId, moduloCodigo) {
    try {
        const modulo = await ModuloEmpresa.findOne({
            where: {
                companyId: companyId,
                moduloCodigo: moduloCodigo,
                activo: true
            }
        });

        if (!modulo) return false;

        // Verificar fecha de vencimiento si existe
        if (modulo.fechaVencimiento) {
            return new Date() <= new Date(modulo.fechaVencimiento);
        }

        return true;
    } catch (error) {
        console.error('Error verificando módulo contratado:', error);
        return false;
    }
};

/**
 * Obtiene la configuración completa de un cliente con integración inteligente
 */
Cliente.obtenerCompleto = async function(clienteId, companyId) {
    try {
        // Verificar módulos contratados
        const moduloProductos = await this.moduloContratado(companyId, 'productos');
        const moduloFacturacion = await this.moduloContratado(companyId, 'facturacion');

        // Consulta base
        const includeArray = [
            { model: ClienteContacto, as: 'contactos' },
            { model: ClienteDireccion, as: 'direcciones' }
        ];

        // Si tiene módulo de productos, incluir precios especiales
        if (moduloProductos) {
            includeArray.push({
                model: ClientePrecioEspecial,
                as: 'preciosEspeciales',
                where: { activo: true },
                required: false
            });
        }

        const cliente = await this.findOne({
            where: { id: clienteId, companyId: companyId },
            include: includeArray
        });

        if (!cliente) return null;

        // Agregar información de módulos disponibles
        const clienteData = cliente.toJSON();
        clienteData.modulosDisponibles = {
            productos: moduloProductos,
            facturacion: moduloFacturacion
        };

        return clienteData;
    } catch (error) {
        console.error('Error obteniendo cliente completo:', error);
        throw error;
    }
};

/**
 * Genera código de cliente automático
 */
Cliente.generarCodigoAutomatico = async function(companyId) {
    try {
        // Buscar el código más alto existente
        const ultimoCliente = await this.findOne({
            where: {
                companyId: companyId,
                codigoCliente: {
                    [sequelize.Op.regexp]: '^[0-9]+$'
                }
            },
            order: [
                [sequelize.cast(sequelize.col('codigo_cliente'), 'INTEGER'), 'DESC']
            ]
        });

        let proximoNumero = 1;
        if (ultimoCliente) {
            proximoNumero = parseInt(ultimoCliente.codigoCliente) + 1;
        }

        // Formatear con ceros a la izquierda (6 dígitos por defecto)
        return proximoNumero.toString().padStart(6, '0');
    } catch (error) {
        console.error('Error generando código automático:', error);
        // Fallback: usar timestamp
        return Date.now().toString().substr(-6);
    }
};

/**
 * Formatea documento según el país
 */
Cliente.formatearDocumento = function(numero, tipo) {
    if (!numero) return '';

    switch (tipo) {
        case 'CUIT':
            // Formato argentino: XX-XXXXXXXX-X
            if (numero.length === 11) {
                return `${numero.substr(0, 2)}-${numero.substr(2, 8)}-${numero.substr(10, 1)}`;
            }
            break;
        case 'RUT':
            // Formato uruguayo: mantener sin formato
            return numero;
        case 'CNPJ':
            // Formato brasileño: XX.XXX.XXX/XXXX-XX
            if (numero.length === 14) {
                return `${numero.substr(0, 2)}.${numero.substr(2, 3)}.${numero.substr(5, 3)}/${numero.substr(8, 4)}-${numero.substr(12, 2)}`;
            }
            break;
    }

    return numero;
};

module.exports = {
    Cliente,
    ClienteContacto,
    ClienteDireccion,
    ClientePrecioEspecial,
    ModuloEmpresa,
    sequelize
};