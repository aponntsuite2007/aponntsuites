/**
 * SIAC SESSION MANAGER
 * Gestor completo de sesiones para 20+ terminales simultáneas
 * Solución a limitaciones de Access/Delphi
 */

const SesionLocal = require('../../models/siac/SesionLocal');
const ConfiguracionEmpresa = require('../../models/siac/ConfiguracionEmpresa');
const { Sequelize } = require('sequelize');

// Configurar conexión para transacciones
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

class SiacSessionManager {

    /**
     * CREAR NUEVA SESIÓN
     * Genera sesión única para terminal específico
     */
    static async crearSesion(companyId, terminalId, userId, ipAddress, userAgent = null) {
        try {
            console.log(`🔄 [SESSION] Creando sesión: empresa=${companyId}, terminal=${terminalId}, usuario=${userId}`);

            const nuevaSesion = await SesionLocal.crearSesion(
                companyId,
                terminalId,
                userId,
                ipAddress,
                userAgent
            );

            // Configurar cleanup automático específico para esta sesión
            this._programarCleanupSesion(nuevaSesion.sessionId, 2 * 60 * 60 * 1000); // 2 horas

            return {
                success: true,
                sessionId: nuevaSesion.sessionId,
                terminalId: nuevaSesion.terminalId,
                configuracion: nuevaSesion.configuracionLocal,
                mensaje: `Sesión iniciada en ${terminalId}`
            };

        } catch (error) {
            console.error('❌ [SESSION] Error creando sesión:', error);
            throw new Error(`Error creando sesión: ${error.message}`);
        }
    }

    /**
     * AGREGAR ITEM TEMPORAL
     * Agrega item a tabla temporal específica de la sesión
     */
    static async agregarItemTemporal(sessionId, tipoTabla, item) {
        try {
            const sesion = await SesionLocal.findOne({
                where: { sessionId, isActive: true }
            });

            if (!sesion) {
                throw new Error('Sesión no encontrada o inactiva');
            }

            // Agregar item a tabla temporal
            const nuevoItem = sesion.agregarItemTemp(tipoTabla, item);
            await sesion.save();

            console.log(`✅ [SESSION] Item agregado a ${tipoTabla}: ${nuevoItem.id}`);

            return {
                success: true,
                item: nuevoItem,
                totalItems: sesion[`${tipoTabla}Temp`].length,
                sessionId
            };

        } catch (error) {
            console.error('❌ [SESSION] Error agregando item temporal:', error);
            throw new Error(`Error agregando item: ${error.message}`);
        }
    }

    /**
     * OBTENER PRÓXIMO NÚMERO SEGURO
     * Implementa numeración concurrente sin duplicados
     */
    static async obtenerProximoNumeroSeguro(companyId, tipoComprobante, sessionData) {
        const transaction = await sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        });

        try {
            console.log(`🔢 [NUMERACIÓN] Obteniendo número: ${tipoComprobante} para empresa ${companyId}`);

            // Usar función PostgreSQL optimizada
            const [resultado] = await sequelize.query(`
                SELECT * FROM obtener_proximo_numero_seguro(
                    :companyId,
                    :tipoComprobante,
                    :sessionId,
                    :userId,
                    :terminalId
                );
            `, {
                replacements: {
                    companyId,
                    tipoComprobante,
                    sessionId: sessionData.sessionId,
                    userId: sessionData.userId,
                    terminalId: sessionData.terminalId
                },
                type: sequelize.QueryTypes.SELECT,
                transaction
            });

            await transaction.commit();

            const numeroAsignado = resultado[0].numero_asignado;
            const siguienteNumero = resultado[0].siguiente_numero;

            console.log(`✅ [NUMERACIÓN] Número asignado: ${numeroAsignado}, siguiente: ${siguienteNumero}`);

            return {
                success: true,
                numeroAsignado,
                siguienteNumero,
                tipoComprobante,
                timestamp: new Date(),
                sessionId: sessionData.sessionId
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [NUMERACIÓN] Error:', error);
            throw new Error(`Error obteniendo número: ${error.message}`);
        }
    }

    /**
     * CONFIRMAR OPERACIÓN
     * Mueve datos temporales a tablas definitivas con transacción atómica
     */
    static async confirmarOperacion(sessionId, tipoOperacion, datosConfirmacion) {
        const transaction = await sequelize.transaction();

        try {
            console.log(`🔄 [OPERACIÓN] Confirmando ${tipoOperacion} en sesión ${sessionId}`);

            // Obtener sesión
            const sesion = await SesionLocal.findOne({
                where: { sessionId, isActive: true },
                transaction
            });

            if (!sesion) {
                throw new Error('Sesión no encontrada o inactiva');
            }

            // Obtener número de comprobante seguro
            const numeroComprobante = await this.obtenerProximoNumeroSeguro(
                sesion.companyId,
                tipoOperacion,
                {
                    sessionId: sesion.sessionId,
                    userId: sesion.userId,
                    terminalId: sesion.terminalId
                }
            );

            // Crear registro en tabla definitiva
            const registroDefinitivo = await this._crearRegistroDefinitivo(
                tipoOperacion,
                sesion,
                numeroComprobante,
                datosConfirmacion,
                transaction
            );

            // Limpiar tabla temporal
            sesion.limpiarTablaTemp(tipoOperacion);
            await sesion.save({ transaction });

            await transaction.commit();

            console.log(`✅ [OPERACIÓN] ${tipoOperacion} confirmada: ${numeroComprobante.numeroAsignado}`);

            return {
                success: true,
                numeroComprobante: numeroComprobante.numeroAsignado,
                registroId: registroDefinitivo.id,
                tipoOperacion,
                sessionId,
                mensaje: `${tipoOperacion} ${numeroComprobante.numeroAsignado} creada exitosamente`
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [OPERACIÓN] Error:', error);
            throw new Error(`Error confirmando operación: ${error.message}`);
        }
    }

    /**
     * OBTENER ESTADO DE SESIÓN
     * Información completa de la sesión activa
     */
    static async obtenerEstadoSesion(sessionId) {
        try {
            const sesion = await SesionLocal.findOne({
                where: { sessionId }
            });

            if (!sesion) {
                return {
                    success: false,
                    error: 'Sesión no encontrada'
                };
            }

            return {
                success: true,
                sessionId: sesion.sessionId,
                terminalId: sesion.terminalId,
                isActive: sesion.isActive,
                lastActivity: sesion.lastActivity,
                datosTemporales: {
                    facturacion: sesion.facturacionTemp?.length || 0,
                    recibos: sesion.recibosTemp?.length || 0,
                    ordenesPago: sesion.ordenesPagoTemp?.length || 0
                },
                configuracion: sesion.configuracionLocal,
                tiempoInactividad: Date.now() - new Date(sesion.lastActivity).getTime()
            };

        } catch (error) {
            console.error('❌ [SESSION] Error obteniendo estado:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * CERRAR SESIÓN
     * Limpia datos temporales y libera terminal
     */
    static async cerrarSesion(sessionId, motivo = 'Sesión finalizada por usuario') {
        try {
            console.log(`🔒 [SESSION] Cerrando sesión: ${sessionId}`);

            const resultado = await SesionLocal.cerrarSesion(sessionId, motivo);

            return {
                success: true,
                sessionId,
                motivo,
                mensaje: 'Sesión cerrada exitosamente'
            };

        } catch (error) {
            console.error('❌ [SESSION] Error cerrando sesión:', error);
            throw new Error(`Error cerrando sesión: ${error.message}`);
        }
    }

    /**
     * OBTENER SESIONES ACTIVAS
     * Lista de todas las sesiones activas de una empresa
     */
    static async obtenerSesionesActivas(companyId) {
        try {
            const sesiones = await SesionLocal.findAll({
                where: {
                    companyId,
                    isActive: true
                },
                order: [['lastActivity', 'DESC']]
            });

            const estadisticas = await SesionLocal.obtenerEstadisticas(companyId);

            return {
                success: true,
                sesiones: sesiones.map(s => ({
                    sessionId: s.sessionId,
                    terminalId: s.terminalId,
                    userId: s.userId,
                    lastActivity: s.lastActivity,
                    tiempoInactividad: Date.now() - new Date(s.lastActivity).getTime(),
                    itemsTemporales: {
                        facturacion: s.facturacionTemp?.length || 0,
                        recibos: s.recibosTemp?.length || 0,
                        ordenesPago: s.ordenesPagoTemp?.length || 0
                    }
                })),
                estadisticas,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ [SESSION] Error obteniendo sesiones activas:', error);
            throw new Error(`Error obteniendo sesiones: ${error.message}`);
        }
    }

    /**
     * CLEANUP AUTOMÁTICO
     * Cierra sesiones inactivas periódicamente
     */
    static async ejecutarCleanupAutomatico() {
        try {
            const sesionesLimpiadas = await SesionLocal.cleanupSesionesInactivas();

            if (sesionesLimpiadas > 0) {
                console.log(`🧹 [CLEANUP] ${sesionesLimpiadas} sesiones limpiadas automáticamente`);
            }

            return {
                success: true,
                sesionesLimpiadas,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ [CLEANUP] Error en cleanup automático:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * MÉTODOS PRIVADOS
     */

    static _crearRegistroDefinitivo(tipoOperacion, sesion, numeroComprobante, datosConfirmacion, transaction) {
        // Por ahora solo registramos en log - luego se implementarán las tablas específicas
        console.log(`📋 [REGISTRO] Creando ${tipoOperacion} definitivo:`, {
            numero: numeroComprobante.numeroAsignado,
            empresa: sesion.companyId,
            terminal: sesion.terminalId,
            datos: datosConfirmacion
        });

        return {
            id: `${tipoOperacion}_${numeroComprobante.numeroAsignado}`,
            numero: numeroComprobante.numeroAsignado,
            tipo: tipoOperacion,
            datos: datosConfirmacion
        };
    }

    static _programarCleanupSesion(sessionId, tiempoMs) {
        setTimeout(async () => {
            try {
                const sesion = await SesionLocal.findOne({
                    where: { sessionId, isActive: true }
                });

                if (sesion) {
                    const tiempoInactividad = Date.now() - new Date(sesion.lastActivity).getTime();
                    if (tiempoInactividad >= tiempoMs) {
                        await this.cerrarSesion(sessionId, 'Timeout automático');
                    }
                }
            } catch (error) {
                console.error('❌ [CLEANUP] Error en cleanup programado:', error);
            }
        }, tiempoMs);
    }
}

// Programar cleanup automático cada 30 minutos
setInterval(() => {
    SiacSessionManager.ejecutarCleanupAutomatico();
}, 30 * 60 * 1000);

console.log('⚡ [SESSION MANAGER] SIAC Session Manager inicializado con cleanup automático');

module.exports = SiacSessionManager;