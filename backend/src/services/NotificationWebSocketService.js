/**
 * ============================================================================
 * NOTIFICATION WEBSOCKET SERVICE
 * ============================================================================
 *
 * Servicio de WebSocket para notificaciones en tiempo real usando Socket.IO
 *
 * FEATURES:
 * - Notificaciones real-time a usuarios conectados
 * - Salas por empresa (multi-tenant)
 * - Salas por usuario individual
 * - Broadcast a todos los usuarios de una empresa
 * - Tracking de usuarios conectados
 * - Reconexión automática
 *
 * ============================================================================
 */

const socketIO = require('socket.io');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class NotificationWebSocketService {

    constructor() {
        this.io = null;
        this.initialized = false;
        this.connectedUsers = new Map(); // userId -> socket.id
        this.userCompanies = new Map(); // socket.id -> companyId
    }

    /**
     * Inicializar Socket.IO con el servidor HTTP
     */
    initialize(server) {
        try {
            console.log('🌐 [WEBSOCKET] Inicializando Socket.IO...');

            this.io = socketIO(server, {
                cors: {
                    origin: "*", // En producción, especificar dominios permitidos
                    methods: ["GET", "POST"]
                },
                path: '/socket.io',
                transports: ['websocket', 'polling']
            });

            this.setupEventHandlers();

            this.initialized = true;
            console.log('✅ [WEBSOCKET] Socket.IO inicializado correctamente');

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error inicializando Socket.IO:', error.message);
        }
    }

    /**
     * Configurar event handlers de Socket.IO
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 [WEBSOCKET] Cliente conectado: ${socket.id}`);

            // Evento: Cliente se identifica (autentica)
            socket.on('identify', async (data) => {
                await this.handleIdentify(socket, data);
            });

            // Evento: Cliente se desconecta
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });

            // Evento: Cliente confirma recepción de notificación
            socket.on('notification_received', (data) => {
                this.handleNotificationReceived(socket, data);
            });

            // Evento: Cliente marca notificación como leída
            socket.on('notification_read', (data) => {
                this.handleNotificationRead(socket, data);
            });

            // Evento: Ping para mantener conexión
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });

            // 📱 KIOSK EVENTS: Autenticación y eventos de kiosko
            socket.on('authenticate', async (data) => {
                await this.handleKioskAuthenticate(socket, data);
            });

            socket.on('join_room', (data) => {
                if (data && data.room) {
                    socket.join(data.room);
                    console.log(`📍 [WEBSOCKET] Socket ${socket.id} joined room: ${data.room}`);
                }
            });

            socket.on('attendance_checkin', (data) => {
                this.handleAttendanceEvent(socket, 'checkin', data);
            });

            socket.on('attendance_checkout', (data) => {
                this.handleAttendanceEvent(socket, 'checkout', data);
            });

            socket.on('kiosk_status', (data) => {
                if (socket.companyId) {
                    this.io.to(`company_${socket.companyId}`).emit('kiosk_status_update', data);
                }
            });

            socket.on('request_late_authorization', (data) => {
                this.handleLateAuthorizationRequest(socket, data);
            });
        });
    }

    /**
     * Handle: Kiosk authenticate (compatible con Flutter websocket_service.dart)
     */
    async handleKioskAuthenticate(socket, data) {
        try {
            const { token, userId, kioskId, clientType } = data || {};

            // Kiosk puede autenticarse sin token (modo público)
            const companyId = data?.companyId || null;

            // Si hay kioskId, unir a sala del kiosk
            if (kioskId) {
                socket.join(`kiosk_${kioskId}`);
                socket.kioskId = kioskId;
            }

            // Si hay userId/companyId, hacer identify normal
            if (userId && companyId) {
                this.connectedUsers.set(userId, socket.id);
                this.userCompanies.set(socket.id, companyId);
                socket.join(`company_${companyId}`);
                socket.userId = userId;
                socket.companyId = companyId;
            }

            socket.clientType = clientType || 'unknown';

            console.log(`✅ [WEBSOCKET] Kiosk autenticado: ${socket.id} (kiosk: ${kioskId || 'N/A'}, type: ${clientType})`);

            socket.emit('authenticated', {
                success: true,
                kioskId,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('❌ [WEBSOCKET] Error en kiosk authenticate:', error.message);
            socket.emit('authentication_error', { message: error.message });
        }
    }

    /**
     * Handle: Attendance events (checkin/checkout) from kiosk
     */
    handleAttendanceEvent(socket, type, data) {
        const companyId = socket.companyId || data?.companyId;
        if (companyId) {
            // Broadcast a todos los clientes de la empresa (admin panels, etc.)
            this.io.to(`company_${companyId}`).emit(type === 'checkin' ? 'new_checkin' : 'new_checkout', {
                ...data,
                kioskId: socket.kioskId,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle: Late arrival authorization request from kiosk
     */
    handleLateAuthorizationRequest(socket, data) {
        const companyId = socket.companyId || data?.companyId;
        if (companyId) {
            // Enviar a supervisores/admins de la empresa
            this.io.to(`company_${companyId}`).emit('authorization_request', {
                ...data,
                kioskId: socket.kioskId,
                requestedAt: Date.now()
            });
            console.log(`🔔 [WEBSOCKET] Late authorization request from kiosk ${socket.kioskId} → company ${companyId}`);
        }
    }

    /**
     * Handle: Cliente se identifica con userId y companyId
     */
    async handleIdentify(socket, data) {
        try {
            const { userId, companyId, token } = data;

            if (!userId || !companyId) {
                socket.emit('error', { message: 'userId y companyId requeridos' });
                return;
            }

            // TODO: Verificar token JWT si es necesario
            // const isValid = await this.verifyToken(token);
            // if (!isValid) { socket.disconnect(); return; }

            // Registrar usuario conectado
            this.connectedUsers.set(userId, socket.id);
            this.userCompanies.set(socket.id, companyId);

            // Unir a salas
            socket.join(`user_${userId}`); // Sala personal del usuario
            socket.join(`company_${companyId}`); // Sala de la empresa

            socket.userId = userId;
            socket.companyId = companyId;

            console.log(`✅ [WEBSOCKET] Usuario ${userId} identificado (empresa ${companyId})`);
            console.log(`   📡 Salas: user_${userId}, company_${companyId}`);

            // Confirmar identificación
            socket.emit('identified', {
                userId,
                companyId,
                timestamp: Date.now()
            });

            // Enviar estadísticas de notificaciones pendientes
            await this.sendPendingNotificationsCount(socket, userId);

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error en identify:', error.message);
            socket.emit('error', { message: 'Error al identificar usuario' });
        }
    }

    /**
     * Handle: Cliente se desconecta
     */
    handleDisconnect(socket) {
        const userId = socket.userId;
        const companyId = socket.companyId;

        if (userId) {
            this.connectedUsers.delete(userId);
            console.log(`🔌 [WEBSOCKET] Usuario ${userId} desconectado (empresa ${companyId})`);
        } else {
            console.log(`🔌 [WEBSOCKET] Cliente ${socket.id} desconectado (no identificado)`);
        }

        this.userCompanies.delete(socket.id);
    }

    /**
     * Handle: Cliente confirma recepción de notificación
     */
    async handleNotificationReceived(socket, data) {
        try {
            const { notificationId } = data;

            if (!notificationId) return;

            // Actualizar en BD
            await sequelize.query(`
                UPDATE unified_notifications
                SET delivered_at = NOW(),
                    updated_at = NOW()
                WHERE id = :notificationId
                  AND delivered_at IS NULL
            `, {
                replacements: { notificationId },
                type: QueryTypes.UPDATE
            });

            console.log(`📥 [WEBSOCKET] Notificación ${notificationId} entregada`);

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error en notification_received:', error.message);
        }
    }

    /**
     * Handle: Cliente marca notificación como leída
     */
    async handleNotificationRead(socket, data) {
        try {
            const { notificationId } = data;

            if (!notificationId) return;

            // Actualizar en BD
            await sequelize.query(`
                UPDATE unified_notifications
                SET read_at = NOW(),
                    updated_at = NOW()
                WHERE id = :notificationId
                  AND read_at IS NULL
            `, {
                replacements: { notificationId },
                type: QueryTypes.UPDATE
            });

            console.log(`📖 [WEBSOCKET] Notificación ${notificationId} leída`);

            // Enviar actualización de contador
            await this.sendPendingNotificationsCount(socket, socket.userId);

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error en notification_read:', error.message);
        }
    }

    /**
     * Enviar contador de notificaciones pendientes al usuario
     */
    async sendPendingNotificationsCount(socket, userId) {
        try {
            const result = await sequelize.query(`
                SELECT COUNT(*)::INTEGER as count
                FROM unified_notifications
                WHERE recipient_user_id = :userId
                  AND read_at IS NULL
                  AND deleted_at IS NULL
            `, {
                replacements: { userId },
                type: QueryTypes.SELECT
            });

            const count = result[0]?.count || 0;

            socket.emit('notifications_count', {
                unread: count,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error enviando contador:', error.message);
        }
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS PARA ENVIAR NOTIFICACIONES
    // ========================================================================

    /**
     * Enviar notificación a un usuario específico
     */
    async sendToUser(userId, notification) {
        if (!this.initialized) {
            console.warn('⚠️  [WEBSOCKET] No inicializado - no se puede enviar notificación');
            return { success: false, status: 'not_initialized' };
        }

        try {
            const socketId = this.connectedUsers.get(userId);

            if (!socketId) {
                console.log(`⚠️  [WEBSOCKET] Usuario ${userId} no está conectado`);
                return { success: false, status: 'user_offline' };
            }

            // Enviar notificación a la sala del usuario
            this.io.to(`user_${userId}`).emit('notification', {
                ...notification,
                timestamp: Date.now()
            });

            console.log(`✅ [WEBSOCKET] Notificación enviada a usuario ${userId}`);

            return {
                success: true,
                status: 'sent',
                messageId: `ws_${Date.now()}`
            };

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error enviando a usuario:', error.message);
            return {
                success: false,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Broadcast a todos los usuarios de una empresa
     */
    async sendToCompany(companyId, notification) {
        if (!this.initialized) {
            console.warn('⚠️  [WEBSOCKET] No inicializado - no se puede enviar broadcast');
            return { success: false, status: 'not_initialized' };
        }

        try {
            // Enviar a la sala de la empresa
            this.io.to(`company_${companyId}`).emit('notification', {
                ...notification,
                timestamp: Date.now()
            });

            console.log(`✅ [WEBSOCKET] Broadcast enviado a empresa ${companyId}`);

            return {
                success: true,
                status: 'sent',
                messageId: `ws_broadcast_${Date.now()}`
            };

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error enviando broadcast:', error.message);
            return {
                success: false,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Broadcast a todos los usuarios conectados (global)
     */
    async sendToAll(notification) {
        if (!this.initialized) {
            console.warn('⚠️  [WEBSOCKET] No inicializado - no se puede enviar broadcast global');
            return { success: false, status: 'not_initialized' };
        }

        try {
            this.io.emit('notification', {
                ...notification,
                timestamp: Date.now()
            });

            console.log(`✅ [WEBSOCKET] Broadcast global enviado`);

            return {
                success: true,
                status: 'sent',
                messageId: `ws_global_${Date.now()}`
            };

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error enviando broadcast global:', error.message);
            return {
                success: false,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Verificar si un usuario está conectado
     */
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }

    /**
     * Obtener estadísticas de conexiones
     */
    getStats() {
        const companyStats = new Map();

        for (const [socketId, companyId] of this.userCompanies.entries()) {
            companyStats.set(companyId, (companyStats.get(companyId) || 0) + 1);
        }

        return {
            totalConnections: this.connectedUsers.size,
            totalCompanies: companyStats.size,
            connectionsByCompany: Object.fromEntries(companyStats)
        };
    }

    /**
     * Verificar si está inicializado
     */
    isInitialized() {
        return this.initialized;
    }
}

// Exportar singleton
const notificationWebSocketService = new NotificationWebSocketService();
module.exports = notificationWebSocketService;
