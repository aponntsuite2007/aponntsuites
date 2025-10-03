const { DataTypes, Sequelize, Op } = require('sequelize');

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
 * MODELOS CORREGIDOS PARA EL MÓDULO DE CLIENTES SIAC
 * Estos modelos coinciden exactamente con las tablas creadas en PostgreSQL
 */

// =====================================
// MODELO PRINCIPAL - CLIENTES
// =====================================
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

    // Identificación
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

    // Documentación
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

    // Contacto
    email: {
        type: DataTypes.STRING(255),
        field: 'email'
    },
    telefono: {
        type: DataTypes.STRING(50),
        field: 'telefono'
    },
    celular: {
        type: DataTypes.STRING(50),
        field: 'celular'
    },
    whatsapp: {
        type: DataTypes.STRING(50),
        field: 'whatsapp'
    },
    website: {
        type: DataTypes.STRING(255),
        field: 'website'
    },

    // Domicilio
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
    ciudad: {
        type: DataTypes.STRING(100),
        field: 'ciudad'
    },
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
        defaultValue: 'Argentina',
        field: 'pais'
    },
    latitud: {
        type: DataTypes.DECIMAL(10, 8),
        field: 'latitud'
    },
    longitud: {
        type: DataTypes.DECIMAL(11, 8),
        field: 'longitud'
    },

    // Configuración comercial
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

    // Configuración adicional
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

    // Fechas y estadísticas
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
    observaciones: {
        type: DataTypes.TEXT,
        field: 'observaciones'
    },
    notasInternas: {
        type: DataTypes.TEXT,
        field: 'notas_internas'
    },

    // Campos flexibles
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

    // Control de estado
    estado: {
        type: DataTypes.STRING(20),
        defaultValue: 'ACTIVO',
        field: 'estado'
    },
    motivoInactivacion: {
        type: DataTypes.TEXT,
        field: 'motivo_inactivacion'
    }
}, {
    tableName: 'siac_clientes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// =====================================
// MODELO CONTACTOS
// =====================================
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
        allowNull: false,
        field: 'nombre'
    },
    apellido: {
        type: DataTypes.STRING(100),
        field: 'apellido'
    },
    cargo: {
        type: DataTypes.STRING(100),
        field: 'cargo'
    },
    departamento: {
        type: DataTypes.STRING(100),
        field: 'departamento'
    },
    telefono: {
        type: DataTypes.STRING(50),
        field: 'telefono'
    },
    celular: {
        type: DataTypes.STRING(50),
        field: 'celular'
    },
    email: {
        type: DataTypes.STRING(255),
        field: 'email'
    },
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
        defaultValue: true,
        field: 'activo'
    }
}, {
    tableName: 'siac_clientes_contactos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// =====================================
// MODELO DIRECCIONES
// =====================================
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
        allowNull: false,
        defaultValue: 'ADICIONAL',
        field: 'tipo_direccion'
    },
    nombreDireccion: {
        type: DataTypes.STRING(100),
        field: 'nombre_direccion'
    },
    calle: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'calle'
    },
    numero: {
        type: DataTypes.STRING(20),
        field: 'numero'
    },
    piso: {
        type: DataTypes.STRING(10),
        field: 'piso'
    },
    departamento: {
        type: DataTypes.STRING(10),
        field: 'departamento'
    },
    entreCalles: {
        type: DataTypes.STRING(255),
        field: 'entre_calles'
    },
    referencias: {
        type: DataTypes.TEXT,
        field: 'referencias'
    },
    ciudad: {
        type: DataTypes.STRING(100),
        field: 'ciudad'
    },
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
        defaultValue: 'Argentina',
        field: 'pais'
    },
    latitud: {
        type: DataTypes.DECIMAL(10, 8),
        field: 'latitud'
    },
    longitud: {
        type: DataTypes.DECIMAL(11, 8),
        field: 'longitud'
    },
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
        defaultValue: true,
        field: 'activo'
    }
}, {
    tableName: 'siac_clientes_direcciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// =====================================
// MODELO PRECIOS ESPECIALES
// =====================================
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
        defaultValue: 'ARS',
        field: 'moneda'
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
        defaultValue: true,
        field: 'activo'
    }
}, {
    tableName: 'siac_clientes_precios_especiales',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// =====================================
// MODELO MÓDULOS EMPRESA
// =====================================
const ModuloContratado = sequelize.define('ModuloContratado', {
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
        defaultValue: true,
        field: 'activo'
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
        defaultValue: {},
        field: 'configuracion'
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
    updatedAt: 'updated_at'
});

// =====================================
// DEFINIR RELACIONES
// =====================================
Cliente.hasMany(ClienteContacto, { foreignKey: 'cliente_id', as: 'contactos' });
Cliente.hasMany(ClienteDireccion, { foreignKey: 'cliente_id', as: 'direcciones' });
Cliente.hasMany(ClientePrecioEspecial, { foreignKey: 'cliente_id', as: 'preciosEspeciales' });

ClienteContacto.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
ClienteDireccion.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
ClientePrecioEspecial.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

// =====================================
// MÉTODOS ESTÁTICOS PARA INTEGRACIÓN INTELIGENTE
// =====================================

// Detectar si un módulo está contratado
Cliente.moduloContratado = async function(companyId, moduloCodigo) {
    const modulo = await ModuloContratado.findOne({
        where: {
            companyId,
            moduloCodigo,
            activo: true,
            [Op.or]: [
                { fechaVencimiento: null },
                { fechaVencimiento: { [Op.gte]: new Date() } }
            ]
        }
    });
    return modulo !== null;
};

// Obtener cliente completo con integración automática
Cliente.obtenerCompleto = async function(clienteId, companyId) {
    // Obtener módulos contratados
    const modulosContratados = await ModuloContratado.findAll({
        where: { companyId, activo: true }
    });

    const modulosMap = {};
    modulosContratados.forEach(mod => {
        modulosMap[mod.moduloCodigo] = true;
    });

    // Incluir relaciones según módulos disponibles
    const includeOptions = [
        { model: ClienteContacto, as: 'contactos' },
        { model: ClienteDireccion, as: 'direcciones' }
    ];

    // Si productos está contratado, incluir precios especiales
    if (modulosMap.productos) {
        includeOptions.push({ model: ClientePrecioEspecial, as: 'preciosEspeciales' });
    }

    const cliente = await Cliente.findOne({
        where: { id: clienteId, companyId },
        include: includeOptions
    });

    if (cliente) {
        // Agregar información de módulos disponibles
        cliente.dataValues.modulosDisponibles = Object.keys(modulosMap);
    }

    return cliente;
};

// Formatear documento automáticamente
Cliente.formatearDocumento = function(numero, tipo) {
    if (!numero) return numero;

    switch (tipo) {
        case 'CUIT':
            if (numero.length === 11) {
                return `${numero.substring(0, 2)}-${numero.substring(2, 10)}-${numero.substring(10, 11)}`;
            }
            break;
        case 'RUT':
            return numero; // Sin formato especial
        case 'CNPJ':
            if (numero.length === 14) {
                return `${numero.substring(0, 2)}.${numero.substring(2, 5)}.${numero.substring(5, 8)}/${numero.substring(8, 12)}-${numero.substring(12, 14)}`;
            }
            break;
    }
    return numero;
};

// Obtener estadísticas de clientes
Cliente.obtenerEstadisticas = async function(companyId) {
    const stats = await sequelize.query(`
        SELECT
            COUNT(*) as total_clientes,
            COUNT(CASE WHEN estado = 'ACTIVO' THEN 1 END) as clientes_activos,
            COUNT(CASE WHEN estado = 'INACTIVO' THEN 1 END) as clientes_inactivos,
            SUM(total_compras) as ventas_totales,
            AVG(promedio_compra) as promedio_general,
            COUNT(CASE WHEN fecha_primera_compra >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuevos_mes
        FROM siac_clientes
        WHERE company_id = :companyId
    `, {
        replacements: { companyId },
        type: Sequelize.QueryTypes.SELECT
    });

    return stats[0];
};

module.exports = {
    Cliente,
    ClienteContacto,
    ClienteDireccion,
    ClientePrecioEspecial,
    ModuloContratado
};