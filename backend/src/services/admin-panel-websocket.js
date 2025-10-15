/**
 * 🖥️ ADMIN PANEL WEBSOCKET SERVER
 * =================================
 * Servidor WebSocket para panel administrativo/empresa
 * - Muestra fichajes en tiempo real desde Kiosks
 * - Dashboard biométrico actualizado en vivo
 * - Estado de kioscos conectados
 * - Alertas y notificaciones
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class AdminPanelWebSocketServer {
    constructor(server) {
        this.server = server;
        this.wss = null;
        this.clients = new Map(); // Map de conexiones por user_id
        this.companies = new Map(); // Map de empresas con suscriptores
        this.kioskServerRef = null; // Referencia al servidor de kiosks
        this.heartbeatInterval = null; // Intervalo para heartbeat

        this.initialize();
        this.startHeartbeat();
    }

    /**
     * 💓 INICIAR SISTEMA DE HEARTBEAT
     */
    startHeartbeat() {
        // Enviar ping cada 30 segundos para mantener conexiones vivas
        this.heartbeatInterval = setInterval(() => {
            if (!this.wss) return;

            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) {
                    console.warn('⚠️ [ADMIN-WS] Cliente no respondió al ping, terminando conexión');
                    return ws.terminate();
                }

                ws.isAlive = false;
                ws.ping();
            });
        }, 30000); // 30 segundos

        console.log('💓 [ADMIN-WS] Sistema de heartbeat iniciado (30s)');
    }

    /**
     * 🚀 INICIALIZAR SERVIDOR WEBSOCKET
     */
    initialize() {
        try {
            this.wss = new WebSocket.Server({
                server: this.server,
                path: '/biometric-ws',
                perMessageDeflate: false,
                clientTracking: true,
                maxPayload: 1 * 1024 * 1024, // 1MB
                verifyClient: (info) => {
                    // Log para debugging en Render
                    console.log('🔍 [ADMIN-WS] Nueva solicitud de conexión:', {
                        origin: info.origin,
                        secure: info.secure,
                        host: info.req.headers.host,
                        protocol: info.req.headers['sec-websocket-protocol'],
                        userAgent: info.req.headers['user-agent']?.substring(0, 50)
                    });
                    return true; // Aceptar todas las conexiones por ahora
                }
            });

            this.wss.on('connection', (ws, request) => {
                this.handleConnection(ws, request);
            });

            this.wss.on('error', (error) => {
                console.error('❌ [ADMIN-WS] Error en servidor WebSocket:', error.message);
                console.error('❌ [ADMIN-WS] Stack:', error.stack);
            });

            this.wss.on('listening', () => {
                console.log('✅ [ADMIN-WS] Servidor WebSocket escuchando en /biometric-ws');
            });

            console.log('🖥️ [ADMIN-WS] Servidor WebSocket para panel admin/empresa inicializado');
            console.log('🖥️ [ADMIN-WS] Path: /biometric-ws');
            console.log('🖥️ [ADMIN-WS] Max clientes: sin límite');
            console.log('🖥️ [ADMIN-WS] Max payload: 1MB');
        } catch (error) {
            console.error('💥 [ADMIN-WS] Error crítico inicializando WebSocket:', error);
            throw error;
        }
    }

    /**
     * 🔗 CONECTAR CON SERVIDOR DE KIOSKS
     */
    connectToKioskServer(kioskServer) {
        this.kioskServerRef = kioskServer;
        console.log('🔗 [ADMIN-WS] Conectado con servidor de kiosks');
    }

    /**
     * 🔌 MANEJAR NUEVA CONEXIÓN
     */
    handleConnection(ws, request) {
        const clientIP = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
        console.log('🔌 [ADMIN-WS] Nueva conexión desde panel admin');
        console.log('🔌 [ADMIN-WS] IP:', clientIP);
        console.log('🔌 [ADMIN-WS] Origin:', request.headers.origin);
        console.log('🔌 [ADMIN-WS] User-Agent:', request.headers['user-agent']?.substring(0, 80));

        // Configurar cliente temporal (sin autenticar)
        const clientInfo = {
            ws,
            userId: null,
            companyId: null,
            role: null,
            isAuthenticated: false,
            lastActivity: Date.now(),
            connectedAt: Date.now(),
            ip: clientIP
        };

        ws.clientInfo = clientInfo;
        ws.isAlive = true; // Para heartbeat

        // Configurar eventos
        ws.on('message', (data) => {
            this.handleMessage(ws, data);
        });

        ws.on('close', () => {
            this.handleDisconnection(ws);
        });

        ws.on('error', (error) => {
            console.error(`❌ [ADMIN-WS] Error en conexión:`, error.message);
        });

        ws.on('pong', () => {
            ws.isAlive = true;
            ws.clientInfo.lastActivity = Date.now();
        });

        // Enviar mensaje de bienvenida
        this.sendMessage(ws, {
            type: 'connection_established',
            server_time: Date.now(),
            message: 'Conexión establecida. Por favor autentique.',
            requiresAuth: true
        });

        // Solicitar autenticación
        setTimeout(() => {
            if (!ws.clientInfo.isAuthenticated) {
                console.warn('⚠️ [ADMIN-WS] Cliente no se autenticó en 10s, cerrando conexión');
                this.sendMessage(ws, {
                    type: 'error',
                    error: 'Autenticación requerida'
                });
                ws.close(1008, 'Autenticación requerida');
            }
        }, 10000); // 10 segundos para autenticar
    }

    /**
     * 📨 MANEJAR MENSAJE RECIBIDO
     */
    async handleMessage(ws, data) {
        try {
            const message = JSON.parse(data);
            ws.clientInfo.lastActivity = Date.now();

            switch (message.type) {
                case 'subscribe':
                    await this.handleSubscribe(ws, message);
                    break;

                case 'ping':
                    this.sendMessage(ws, { type: 'pong', timestamp: Date.now() });
                    break;

                case 'get_kiosks_status':
                    this.sendKiosksStatus(ws);
                    break;

                case 'get_stats':
                    this.sendStats(ws);
                    break;

                default:
                    console.warn(`⚠️ [ADMIN-WS] Tipo de mensaje desconocido: ${message.type}`);
            }

        } catch (error) {
            console.error(`❌ [ADMIN-WS] Error procesando mensaje:`, error);
            this.sendMessage(ws, {
                type: 'error',
                error: 'Error procesando mensaje',
                details: error.message
            });
        }
    }

    /**
     * 🔐 MANEJAR SUSCRIPCIÓN (CON AUTENTICACIÓN)
     */
    async handleSubscribe(ws, message) {
        const { companyId, token } = message;

        if (!companyId) {
            this.sendMessage(ws, {
                type: 'subscription_failed',
                error: 'companyId es requerido'
            });
            return;
        }

        // Verificar token JWT (opcional pero recomendado)
        let user = null;
        if (token) {
            try {
                const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_aqui';
                user = jwt.verify(token, JWT_SECRET);

                // Verificar que el usuario pertenece a la empresa
                if (user.companyId !== companyId && user.companyId != companyId) {
                    this.sendMessage(ws, {
                        type: 'subscription_failed',
                        error: 'Usuario no pertenece a esta empresa'
                    });
                    return;
                }
            } catch (error) {
                console.warn('⚠️ [ADMIN-WS] Token inválido, pero permitiendo conexión');
                // Permitir conexión sin token por ahora
            }
        }

        // Registrar cliente autenticado
        ws.clientInfo.companyId = companyId;
        ws.clientInfo.userId = user?.user_id || `anonymous_${Date.now()}`;
        ws.clientInfo.role = user?.role || 'unknown';
        ws.clientInfo.isAuthenticated = true;

        this.clients.set(ws.clientInfo.userId, ws);

        // Agregar a map de empresas
        if (!this.companies.has(companyId)) {
            this.companies.set(companyId, new Set());
        }
        this.companies.get(companyId).add(ws.clientInfo.userId);

        console.log(`✅ [ADMIN-WS] Cliente autenticado: ${ws.clientInfo.userId} - Empresa: ${companyId}`);

        this.sendMessage(ws, {
            type: 'subscribed',
            companyId,
            userId: ws.clientInfo.userId,
            message: 'Suscrito exitosamente a eventos de la empresa',
            features: {
                realtime_attendance: true,
                biometric_dashboard: true,
                kiosk_status: true,
                alerts: true
            }
        });

        // Enviar estado inicial
        this.sendInitialState(ws);
    }

    /**
     * 📊 ENVIAR ESTADO INICIAL
     */
    sendInitialState(ws) {
        const companyId = ws.clientInfo.companyId;

        // Obtener kioscos activos de la empresa
        if (this.kioskServerRef) {
            const companyData = this.kioskServerRef.companies.get(companyId);
            if (companyData) {
                this.sendMessage(ws, {
                    type: 'initial_state',
                    kiosks_online: companyData.kiosks.size,
                    kiosks_list: Array.from(companyData.kiosks)
                });
            }
        }
    }

    /**
     * 🔔 NOTIFICAR NUEVO FICHAJE (llamado desde kiosk-websocket-server)
     */
    notifyNewAttendance(companyId, attendanceData) {
        const subscribers = this.companies.get(companyId);
        if (!subscribers) return;

        console.log(`📢 [ADMIN-WS] Notificando fichaje a ${subscribers.size} clientes de empresa ${companyId}`);

        subscribers.forEach(userId => {
            const client = this.clients.get(userId);
            if (client && client.readyState === WebSocket.OPEN) {
                this.sendMessage(client, {
                    type: 'new_attendance',
                    data: attendanceData,
                    timestamp: Date.now()
                });
            }
        });
    }

    /**
     * 👤 NOTIFICAR DETECCIÓN DE EMPLEADO
     */
    notifyEmployeeDetected(companyId, detectionData) {
        const subscribers = this.companies.get(companyId);
        if (!subscribers) return;

        subscribers.forEach(userId => {
            const client = this.clients.get(userId);
            if (client && client.readyState === WebSocket.OPEN) {
                this.sendMessage(client, {
                    type: 'employee_detected',
                    data: detectionData,
                    timestamp: Date.now()
                });
            }
        });
    }

    /**
     * 🖥️ NOTIFICAR CAMBIO EN ESTADO DE KIOSK
     */
    notifyKioskStatusChange(companyId, kioskId, status) {
        const subscribers = this.companies.get(companyId);
        if (!subscribers) return;

        subscribers.forEach(userId => {
            const client = this.clients.get(userId);
            if (client && client.readyState === WebSocket.OPEN) {
                this.sendMessage(client, {
                    type: 'kiosk_status_change',
                    kiosk_id: kioskId,
                    status, // 'online', 'offline', 'error'
                    timestamp: Date.now()
                });
            }
        });
    }

    /**
     * 📊 ENVIAR ESTADO DE KIOSKS
     */
    sendKiosksStatus(ws) {
        if (!ws.clientInfo.isAuthenticated) {
            this.sendMessage(ws, {
                type: 'error',
                error: 'No autenticado'
            });
            return;
        }

        const companyId = ws.clientInfo.companyId;

        if (this.kioskServerRef) {
            const companyData = this.kioskServerRef.companies.get(companyId);
            const kiosksOnline = companyData ? Array.from(companyData.kiosks) : [];

            this.sendMessage(ws, {
                type: 'kiosks_status',
                kiosks_online: kiosksOnline.length,
                kiosks: kiosksOnline,
                timestamp: Date.now()
            });
        } else {
            this.sendMessage(ws, {
                type: 'kiosks_status',
                kiosks_online: 0,
                kiosks: [],
                message: 'Servidor de kiosks no disponible',
                timestamp: Date.now()
            });
        }
    }

    /**
     * 📊 ENVIAR ESTADÍSTICAS
     */
    sendStats(ws) {
        const stats = {
            clients_connected: this.clients.size,
            companies_active: this.companies.size,
            kiosks_total: this.kioskServerRef ? this.kioskServerRef.stats.activeKiosks : 0
        };

        this.sendMessage(ws, {
            type: 'stats_response',
            stats,
            timestamp: Date.now()
        });
    }

    /**
     * 📤 ENVIAR MENSAJE
     */
    sendMessage(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('❌ [ADMIN-WS] Error enviando mensaje:', error);
            }
        }
    }

    /**
     * 🔌 MANEJAR DESCONEXIÓN
     */
    handleDisconnection(ws) {
        const clientInfo = ws.clientInfo;
        if (!clientInfo) return;

        console.log(`🔌 [ADMIN-WS] Desconexión: ${clientInfo.userId || 'desconocido'}`);

        if (clientInfo.userId) {
            this.clients.delete(clientInfo.userId);

            // Remover de empresa
            if (clientInfo.companyId) {
                const subscribers = this.companies.get(clientInfo.companyId);
                if (subscribers) {
                    subscribers.delete(clientInfo.userId);
                    if (subscribers.size === 0) {
                        this.companies.delete(clientInfo.companyId);
                    }
                }
            }
        }
    }

    /**
     * 📊 OBTENER ESTADÍSTICAS
     */
    getStats() {
        return {
            clients_connected: this.clients.size,
            companies_active: this.companies.size,
            uptime: Date.now()
        };
    }
}

module.exports = {
    AdminPanelWebSocketServer
};
