/**
 * ============================================================================
 * MODELO: SiacCliente
 * Modulo: SIAC Commercial - Gestion de Clientes
 * ============================================================================
 *
 * Modelo Sequelize para la tabla siac_clientes (esquema existente).
 * Adaptado para trabajar con la estructura actual de la base de datos.
 *
 * Updated: 2025-12-30
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SiacCliente = sequelize.define('SiacCliente', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // Multi-tenant
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id'
            }
        },

        // Identificacion
        codigo_cliente: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'codigo_cliente'
        },
        razon_social: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        nombre_fantasia: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        tipo_cliente: {
            type: DataTypes.STRING(20),
            defaultValue: 'PERSONA_FISICA'
        },

        // Documentacion
        documento_tipo: {
            type: DataTypes.STRING(20),
            defaultValue: 'CUIT'
        },
        documento_numero: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        documento_formateado: {
            type: DataTypes.STRING(30),
            allowNull: true
        },

        // Contacto
        email: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        telefono: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        celular: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        whatsapp: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        website: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        // Domicilio (campos legacy)
        domicilio_calle: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        domicilio_numero: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        domicilio_piso: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        domicilio_depto: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        domicilio_completo: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // Ubicacion
        ciudad: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        provincia: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        provincia_estado: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        localidad: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        codigo_postal: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        pais: {
            type: DataTypes.STRING(100),
            defaultValue: 'Argentina'
        },
        zona_comercial: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        // Domicilio (campos nuevos)
        calle: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        numero: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        piso: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        departamento: {
            type: DataTypes.STRING(10),
            allowNull: true
        },

        // GPS
        latitud: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            get() {
                const value = this.getDataValue('latitud');
                return value ? parseFloat(value) : null;
            }
        },
        longitud: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            get() {
                const value = this.getDataValue('longitud');
                return value ? parseFloat(value) : null;
            }
        },

        // Clasificacion comercial
        categoria_cliente: {
            type: DataTypes.STRING(50),
            defaultValue: 'GENERAL'
        },
        lista_precio: {
            type: DataTypes.STRING(50),
            defaultValue: 'GENERAL'
        },
        lista_precios_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        vendedor_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        vendedor_asignado_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        canal_venta: {
            type: DataTypes.STRING(50),
            defaultValue: 'DIRECTO'
        },
        origen_cliente: {
            type: DataTypes.STRING(50),
            defaultValue: 'MANUAL'
        },

        // Condicion fiscal
        condicion_fiscal: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        condicion_fiscal_code: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        formato_facturacion: {
            type: DataTypes.STRING(20),
            defaultValue: 'A'
        },
        requiere_orden_compra: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        email_facturacion: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        // Credito y cuenta corriente
        cuenta_corriente_habilitada: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        limite_credito: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0,
            get() {
                const value = this.getDataValue('limite_credito');
                return value ? parseFloat(value) : 0;
            }
        },
        credito_disponible: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0,
            get() {
                const value = this.getDataValue('credito_disponible');
                return value ? parseFloat(value) : 0;
            }
        },
        credito_maximo: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            get() {
                const value = this.getDataValue('credito_maximo');
                return value ? parseFloat(value) : 0;
            }
        },
        credito_utilizado: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            get() {
                const value = this.getDataValue('credito_utilizado');
                return value ? parseFloat(value) : 0;
            }
        },
        dias_vencimiento: {
            type: DataTypes.INTEGER,
            defaultValue: 30
        },
        plazo_pago_dias: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        descuento_maximo: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            get() {
                const value = this.getDataValue('descuento_maximo');
                return value ? parseFloat(value) : 0;
            }
        },
        descuento_general: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            get() {
                const value = this.getDataValue('descuento_general');
                return value ? parseFloat(value) : 0;
            }
        },

        // Bloqueos
        bloqueo_por_vencimiento: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        bloqueo_por_credito: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // Datos bancarios
        banco: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        tipo_cuenta: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        numero_cuenta: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        cbu: {
            type: DataTypes.STRING(22),
            allowNull: true
        },
        alias_cbu: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        // Estadisticas
        fecha_alta: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        },
        fecha_primera_compra: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        fecha_ultima_compra: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        fecha_ultimo_analisis: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        total_compras: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0,
            get() {
                const value = this.getDataValue('total_compras');
                return value ? parseFloat(value) : 0;
            }
        },
        cantidad_facturas: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        promedio_compra: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0,
            get() {
                const value = this.getDataValue('promedio_compra');
                return value ? parseFloat(value) : 0;
            }
        },

        // Estado
        estado: {
            type: DataTypes.STRING(20),
            defaultValue: 'ACTIVO'
        },
        motivo_inactivacion: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // Observaciones
        observaciones: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        notas_internas: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        observaciones_credito: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // Datos extra (JSONB)
        configuracion_adicional: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        datos_extra: {
            type: DataTypes.JSONB,
            defaultValue: {}
        }
    }, {
        tableName: 'siac_clientes',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Asociaciones
    SiacCliente.associate = (models) => {
        SiacCliente.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
    };

    // Metodos de clase
    SiacCliente.findByCompany = async function(companyId, options = {}) {
        return this.findAll({
            where: { company_id: companyId },
            order: [['razon_social', 'ASC']],
            ...options
        });
    };

    SiacCliente.findByCodigo = async function(companyId, codigo) {
        return this.findOne({
            where: { company_id: companyId, codigo_cliente: codigo }
        });
    };

    SiacCliente.getNextCodigo = async function(companyId) {
        const result = await this.findOne({
            where: { company_id: companyId },
            order: [['id', 'DESC']],
            attributes: ['codigo_cliente']
        });

        if (!result) return '1';

        const currentCode = parseInt(result.codigo_cliente);
        if (!isNaN(currentCode)) {
            return String(currentCode + 1);
        }

        return String(Date.now()).slice(-6);
    };

    // Metodos de instancia
    SiacCliente.prototype.toJSON = function() {
        const values = { ...this.get() };

        // Formatear montos
        values.limite_credito = parseFloat(values.limite_credito) || 0;
        values.credito_disponible = parseFloat(values.credito_disponible) || 0;
        values.credito_maximo = parseFloat(values.credito_maximo) || 0;
        values.credito_utilizado = parseFloat(values.credito_utilizado) || 0;
        values.descuento_maximo = parseFloat(values.descuento_maximo) || 0;
        values.descuento_general = parseFloat(values.descuento_general) || 0;
        values.total_compras = parseFloat(values.total_compras) || 0;
        values.promedio_compra = parseFloat(values.promedio_compra) || 0;

        return values;
    };

    SiacCliente.prototype.getNombreCompleto = function() {
        return `${this.codigo_cliente} - ${this.razon_social}`;
    };

    SiacCliente.prototype.getDireccionCompleta = function() {
        if (this.domicilio_completo) return this.domicilio_completo;
        const parts = [this.calle, this.numero, this.ciudad, this.provincia, this.pais].filter(Boolean);
        return parts.join(', ');
    };

    return SiacCliente;
};
