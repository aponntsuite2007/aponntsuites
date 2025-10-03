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
 * Modelo de Sesión Local SIAC
 * Maneja sesiones por terminal para evitar conflictos de concurrencia
 */
const SesionLocal = sequelize.define('SiacSesionLocal', {
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

    // IDENTIFICACIÓN ÚNICA DE SESIÓN
    sessionId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'session_id'
    },
    terminalId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'terminal_id'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
    },

    // DATOS TEMPORALES DE LA SESIÓN
    facturacionTemp: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'facturacion_temp'
    },
    recibosTemp: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'recibos_temp'
    },
    ordenesPagoTemp: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'ordenes_pago_temp'
    },
    otrosTemp: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'otros_temp'
    },

    // CONTROL DE CONCURRENCIA
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    lockedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'locked_at'
    },
    lastActivity: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'last_activity'
    },

    // CONFIGURACIÓN LOCAL ESPECÍFICA DEL TERMINAL
    configuracionLocal: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'configuracion_local'
    },

    // INFORMACIÓN DE CONEXIÓN
    ipAddress: {
        type: DataTypes.INET,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.TEXT,
        field: 'user_agent'
    }
}, {
    tableName: 'siac_sesiones_locales',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    // Hooks para auditoría
    hooks: {
        beforeUpdate: (sesion, options) => {
            sesion.lastActivity = new Date();
        }
    }
});

/**
 * Métodos de instancia
 */
SesionLocal.prototype.agregarItemTemp = function(tabla, item) {
    const campoTabla = `${tabla}Temp`;
    const datosActuales = this[campoTabla] || [];

    const nuevoItem = {
        ...item,
        id: require('crypto').randomUUID(),
        timestamp: new Date(),
        sessionId: this.sessionId
    };

    datosActuales.push(nuevoItem);
    this[campoTabla] = datosActuales;

    return nuevoItem;
};

SesionLocal.prototype.removerItemTemp = function(tabla, itemId) {
    const campoTabla = `${tabla}Temp`;
    const datosActuales = this[campoTabla] || [];

    this[campoTabla] = datosActuales.filter(item => item.id !== itemId);

    return this[campoTabla];
};

SesionLocal.prototype.limpiarTablaTemp = function(tabla) {
    const campoTabla = `${tabla}Temp`;
    this[campoTabla] = [];
    return this;
};

SesionLocal.prototype.actualizarActividad = async function() {
    this.lastActivity = new Date();
    return await this.save();
};

SesionLocal.prototype.estaActiva = function() {
    return this.isActive && this.lastActivity > new Date(Date.now() - (2 * 60 * 60 * 1000)); // 2 horas
};

/**
 * Métodos estáticos
 */
SesionLocal.crearSesion = async function(companyId, terminalId, userId, ipAddress, userAgent) {
    const sessionId = `siac_${companyId}_${terminalId}_${Date.now()}_${require('crypto').randomUUID()}`;

    // Cerrar cualquier sesión anterior del mismo terminal
    await SesionLocal.update(
        {
            isActive: false,
            configuracionLocal: sequelize.literal(`configuracion_local || '{"motivo_cierre": "nueva_sesion", "fecha_cierre": "${new Date().toISOString()}"}'`)
        },
        {
            where: {
                companyId,
                terminalId,
                isActive: true
            }
        }
    );

    // Crear nueva sesión
    const nuevaSesion = await SesionLocal.create({
        companyId,
        sessionId,
        terminalId,
        userId,
        ipAddress,
        userAgent,
        configuracionLocal: {
            impresora: `PRINTER_${terminalId}`,
            display: `DISPLAY_${terminalId}`,
            creada: new Date().toISOString()
        }
    });

    console.log(`✅ [SESIÓN] Creada: ${sessionId} en ${terminalId}`);
    return nuevaSesion;
};

SesionLocal.obtenerSesionActiva = async function(companyId, terminalId) {
    return await SesionLocal.findOne({
        where: {
            companyId,
            terminalId,
            isActive: true
        }
    });
};

SesionLocal.cerrarSesion = async function(sessionId, motivo = 'Sesión finalizada') {
    const resultado = await SesionLocal.update(
        {
            isActive: false,
            configuracionLocal: sequelize.literal(`configuracion_local || '{"motivo_cierre": "${motivo}", "fecha_cierre": "${new Date().toISOString()}"}'`)
        },
        {
            where: { sessionId }
        }
    );

    console.log(`🔒 [SESIÓN] Cerrada: ${sessionId} - ${motivo}`);
    return resultado;
};

SesionLocal.cleanupSesionesInactivas = async function() {
    const doHorasAtras = new Date(Date.now() - (2 * 60 * 60 * 1000));

    const [sesionesActualizadas] = await SesionLocal.update(
        {
            isActive: false,
            configuracionLocal: sequelize.literal(`configuracion_local || '{"motivo_cierre": "timeout_inactividad", "fecha_cierre": "${new Date().toISOString()}"}'`)
        },
        {
            where: {
                isActive: true,
                lastActivity: {
                    [Op.lt]: doHorasAtras
                }
            }
        }
    );

    if (sesionesActualizadas > 0) {
        console.log(`🧹 [CLEANUP] ${sesionesActualizadas} sesiones cerradas por inactividad`);
    }

    return sesionesActualizadas;
};

SesionLocal.obtenerEstadisticas = async function(companyId) {
    const [estadisticas] = await sequelize.query(`
        SELECT
            COUNT(*) FILTER (WHERE is_active = true) as sesiones_activas,
            COUNT(*) as total_sesiones,
            COUNT(DISTINCT terminal_id) FILTER (WHERE is_active = true) as terminales_activos,
            COUNT(DISTINCT user_id) FILTER (WHERE is_active = true) as usuarios_activos,
            AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity))) FILTER (WHERE is_active = true) as promedio_inactividad_segundos
        FROM siac_sesiones_locales
        WHERE company_id = :companyId
    `, {
        replacements: { companyId },
        type: sequelize.QueryTypes.SELECT
    });

    return estadisticas[0];
};

module.exports = SesionLocal;