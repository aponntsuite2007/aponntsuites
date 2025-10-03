const { sequelize } = require('../config/database');
const EventEmitter = require('events');

class NotificationSystem extends EventEmitter {
    constructor() {
        super();
        this.webSocketClients = new Map(); // Para notificaciones web en tiempo real
        this.mobileTokens = new Map(); // Para notificaciones push móviles
        this.scheduledNotifications = new Map(); // Para notificaciones programadas
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Iniciar procesamiento de notificaciones programadas
        this.startScheduledProcessor();
        
        // Configurar listeners para eventos del sistema
        this.setupSystemEventListeners();

        this.initialized = true;
        console.log('📲 Sistema de notificaciones inicializado');
    }

    // === REGISTRO DE CLIENTES ===

    registerWebClient(userId, socketId, socket) {
        if (!this.webSocketClients.has(userId)) {
            this.webSocketClients.set(userId, new Map());
        }
        
        this.webSocketClients.get(userId).set(socketId, {
            socket,
            connectedAt: new Date(),
            lastActivity: new Date()
        });

        console.log(`🌐 Cliente web registrado: ${userId} (${socketId})`);
    }

    unregisterWebClient(userId, socketId) {
        if (this.webSocketClients.has(userId)) {
            this.webSocketClients.get(userId).delete(socketId);
            
            if (this.webSocketClients.get(userId).size === 0) {
                this.webSocketClients.delete(userId);
            }
        }
    }

    registerMobileToken(userId, token, platform = 'android') {
        if (!this.mobileTokens.has(userId)) {
            this.mobileTokens.set(userId, []);
        }

        const tokens = this.mobileTokens.get(userId);
        const existingToken = tokens.find(t => t.token === token);
        
        if (!existingToken) {
            tokens.push({
                token,
                platform,
                registeredAt: new Date(),
                isActive: true
            });
            console.log(`📱 Token móvil registrado: ${userId} (${platform})`);
        }
    }

    // === CREACIÓN DE NOTIFICACIONES ===

    async createTrainingNotification(assignmentId, type, customData = {}) {
        try {
            // Obtener información del assignment y empleado
            const [assignmentData] = await sequelize.query(`
                SELECT 
                    ta.id, ta.employee_id, ta.due_date, ta.status,
                    tc.title as course_title, tc.type as course_type,
                    u.firstName, u.lastName, u.email
                FROM training_assignments ta
                JOIN training_courses tc ON ta.course_id = tc.id
                JOIN users u ON ta.employee_id = u.id
                WHERE ta.id = ?
            `, { replacements: [assignmentId] });

            if (assignmentData.length === 0) {
                throw new Error('Assignment not found');
            }

            const assignment = assignmentData[0];
            const employeeName = `${assignment.firstName} ${assignment.lastName}`;

            // Generar contenido de notificación según tipo
            const notification = this.generateNotificationContent(type, {
                employeeName,
                courseTitle: assignment.course_title,
                courseType: assignment.course_type,
                dueDate: assignment.due_date,
                ...customData
            });

            // Guardar en base de datos
            const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            await sequelize.query(`
                INSERT INTO training_notifications 
                (id, assignment_id, employee_id, notification_type, title, message, 
                 send_web, send_mobile, send_email, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `, {
                replacements: [
                    notificationId,
                    assignmentId,
                    assignment.employee_id,
                    type,
                    notification.title,
                    notification.message,
                    notification.sendWeb,
                    notification.sendMobile,
                    notification.sendEmail
                ]
            });

            // Enviar inmediatamente
            await this.sendNotification(notificationId);

            return notificationId;

        } catch (error) {
            console.error('Error creando notificación de capacitación:', error);
            throw error;
        }
    }

    generateNotificationContent(type, data) {
        const templates = {
            assignment: {
                title: '📚 Nueva Capacitación Asignada',
                message: `Hola ${data.employeeName}, se te ha asignado la capacitación "${data.courseTitle}". Tienes hasta el ${new Date(data.dueDate).toLocaleDateString('es-AR')} para completarla.`,
                sendWeb: true,
                sendMobile: true,
                sendEmail: true
            },
            reminder: {
                title: '⏰ Recordatorio de Capacitación',
                message: `${data.employeeName}, recuerda que tienes pendiente la capacitación "${data.courseTitle}". Vence el ${new Date(data.dueDate).toLocaleDateString('es-AR')}.`,
                sendWeb: true,
                sendMobile: true,
                sendEmail: false
            },
            overdue: {
                title: '🚨 Capacitación Vencida',
                message: `${data.employeeName}, la capacitación "${data.courseTitle}" ha vencido. Por favor, contacta a RRHH para solicitar una prórroga.`,
                sendWeb: true,
                sendMobile: true,
                sendEmail: true
            },
            extension: {
                title: '📅 Prórroga Otorgada',
                message: `${data.employeeName}, se ha extendido el plazo de tu capacitación "${data.courseTitle}" hasta el ${new Date(data.newDueDate).toLocaleDateString('es-AR')}.`,
                sendWeb: true,
                sendMobile: true,
                sendEmail: false
            },
            completion: {
                title: '🎉 Capacitación Completada',
                message: `¡Felicitaciones ${data.employeeName}! Has completado exitosamente la capacitación "${data.courseTitle}" con una calificación de ${data.score}%.`,
                sendWeb: true,
                sendMobile: true,
                sendEmail: false
            },
            evaluation_failed: {
                title: '📝 Evaluación No Aprobada',
                message: `${data.employeeName}, no has aprobado la evaluación de "${data.courseTitle}". Te quedan ${data.remainingAttempts} intentos más.`,
                sendWeb: true,
                sendMobile: true,
                sendEmail: false
            }
        };

        return templates[type] || {
            title: '📢 Notificación de Capacitación',
            message: 'Tienes una nueva notificación de capacitación.',
            sendWeb: true,
            sendMobile: true,
            sendEmail: false
        };
    }

    // === ENVÍO DE NOTIFICACIONES ===

    async sendNotification(notificationId) {
        try {
            const [notification] = await sequelize.query(`
                SELECT * FROM training_notifications WHERE id = ?
            `, { replacements: [notificationId] });

            if (notification.length === 0) {
                throw new Error('Notification not found');
            }

            const notif = notification[0];
            const promises = [];

            // Enviar a web si está habilitado
            if (notif.send_web) {
                promises.push(this.sendWebNotification(notif));
            }

            // Enviar a móvil si está habilitado
            if (notif.send_mobile) {
                promises.push(this.sendMobileNotification(notif));
            }

            // Enviar por email si está habilitado
            if (notif.send_email) {
                promises.push(this.sendEmailNotification(notif));
            }

            // Ejecutar todos los envíos en paralelo
            await Promise.allSettled(promises);

            // Actualizar estado
            await sequelize.query(`
                UPDATE training_notifications 
                SET status = 'sent'
                WHERE id = ?
            `, { replacements: [notificationId] });

            console.log(`📤 Notificación enviada: ${notificationId}`);

        } catch (error) {
            console.error('Error enviando notificación:', error);
            
            // Marcar como fallida
            await sequelize.query(`
                UPDATE training_notifications 
                SET status = 'failed'
                WHERE id = ?
            `, { replacements: [notificationId] });
        }
    }

    async sendWebNotification(notification) {
        const userId = notification.employee_id;
        
        if (!this.webSocketClients.has(userId)) {
            console.log(`🌐 No hay clientes web conectados para usuario ${userId}`);
            return;
        }

        const clients = this.webSocketClients.get(userId);
        const webNotification = {
            id: notification.id,
            type: 'training_notification',
            title: notification.title,
            message: notification.message,
            notificationType: notification.notification_type,
            timestamp: new Date(),
            assignmentId: notification.assignment_id
        };

        let delivered = false;

        // Enviar a todos los clientes conectados del usuario
        clients.forEach((clientInfo, socketId) => {
            try {
                if (clientInfo.socket && clientInfo.socket.readyState === 1) {
                    clientInfo.socket.emit('training_notification', webNotification);
                    delivered = true;
                }
            } catch (error) {
                console.error(`Error enviando a socket ${socketId}:`, error);
                // Remover cliente inactivo
                clients.delete(socketId);
            }
        });

        if (delivered) {
            await sequelize.query(`
                UPDATE training_notifications 
                SET web_sent_at = NOW(), web_delivered_at = NOW()
                WHERE id = ?
            `, { replacements: [notification.id] });
        }
    }

    async sendMobileNotification(notification) {
        const userId = notification.employee_id;
        
        if (!this.mobileTokens.has(userId)) {
            console.log(`📱 No hay tokens móviles para usuario ${userId}`);
            return;
        }

        const tokens = this.mobileTokens.get(userId);
        const mobilePayload = {
            title: notification.title,
            body: notification.message,
            data: {
                type: 'training_notification',
                notificationId: notification.id,
                assignmentId: notification.assignment_id,
                notificationType: notification.notification_type
            }
        };

        let delivered = false;

        for (const tokenInfo of tokens) {
            if (!tokenInfo.isActive) continue;

            try {
                // Aquí iría la integración con Firebase FCM o el servicio de push que uses
                // Por ahora simulamos el envío
                await this.sendPushNotification(tokenInfo.token, mobilePayload, tokenInfo.platform);
                delivered = true;
                
            } catch (error) {
                console.error(`Error enviando push a ${tokenInfo.token}:`, error);
                // Marcar token como inactivo si falló
                tokenInfo.isActive = false;
            }
        }

        if (delivered) {
            await sequelize.query(`
                UPDATE training_notifications 
                SET mobile_sent_at = NOW(), mobile_delivered_at = NOW()
                WHERE id = ?
            `, { replacements: [notification.id] });
        }
    }

    async sendPushNotification(token, payload, platform) {
        // Aquí integrarías con Firebase FCM u otro servicio de push
        // Por ahora solo simularemos el envío
        
        console.log(`📱 Push notification enviada:`, {
            token: token.substring(0, 10) + '...',
            platform,
            title: payload.title
        });

        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return { success: true };
    }

    async sendEmailNotification(notification) {
        // Por ahora solo registramos que se envió
        // Aquí integrarías con tu servicio de email
        
        console.log(`📧 Email notification enviada:`, {
            to: notification.employee_id,
            title: notification.title
        });

        await sequelize.query(`
            UPDATE training_notifications 
            SET email_sent_at = NOW(), email_delivered_at = NOW()
            WHERE id = ?
        `, { replacements: [notification.id] });
    }

    // === NOTIFICACIONES PROGRAMADAS ===

    async scheduleNotification(assignmentId, type, scheduleDate, customData = {}) {
        const notificationId = `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Crear la notificación con estado programado
            const [assignmentData] = await sequelize.query(`
                SELECT 
                    ta.employee_id,
                    tc.title as course_title
                FROM training_assignments ta
                JOIN training_courses tc ON ta.course_id = tc.id
                WHERE ta.id = ?
            `, { replacements: [assignmentId] });

            if (assignmentData.length === 0) {
                throw new Error('Assignment not found for scheduling');
            }

            const notification = this.generateNotificationContent(type, customData);

            await sequelize.query(`
                INSERT INTO training_notifications 
                (id, assignment_id, employee_id, notification_type, title, message, 
                 send_web, send_mobile, send_email, status, scheduled_for)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            `, {
                replacements: [
                    notificationId,
                    assignmentId,
                    assignmentData[0].employee_id,
                    type,
                    notification.title,
                    notification.message,
                    notification.sendWeb,
                    notification.sendMobile,
                    notification.sendEmail,
                    scheduleDate
                ]
            });

            // Agregar al mapa de programadas
            this.scheduledNotifications.set(notificationId, {
                scheduledFor: scheduleDate,
                notificationId
            });

            console.log(`⏰ Notificación programada: ${notificationId} para ${scheduleDate}`);

            return notificationId;

        } catch (error) {
            console.error('Error programando notificación:', error);
            throw error;
        }
    }

    startScheduledProcessor() {
        // Procesar notificaciones programadas cada minuto
        setInterval(async () => {
            try {
                await this.processScheduledNotifications();
            } catch (error) {
                console.error('Error procesando notificaciones programadas:', error);
            }
        }, 60000); // 1 minuto

        console.log('⏰ Procesador de notificaciones programadas iniciado');
    }

    async processScheduledNotifications() {
        const now = new Date();
        
        // Buscar notificaciones que deben enviarse ahora
        const [pending] = await sequelize.query(`
            SELECT id FROM training_notifications 
            WHERE status = 'pending' 
            AND scheduled_for IS NOT NULL 
            AND scheduled_for <= ?
        `, { replacements: [now] });

        for (const notification of pending) {
            try {
                await this.sendNotification(notification.id);
                this.scheduledNotifications.delete(notification.id);
            } catch (error) {
                console.error(`Error enviando notificación programada ${notification.id}:`, error);
            }
        }

        if (pending.length > 0) {
            console.log(`📤 Procesadas ${pending.length} notificaciones programadas`);
        }
    }

    // === AUTOMATIZACIÓN DE CAPACITACIONES ===

    async scheduleTrainingReminders(assignmentId) {
        try {
            const [assignment] = await sequelize.query(`
                SELECT due_date FROM training_assignments WHERE id = ?
            `, { replacements: [assignmentId] });

            if (assignment.length === 0) return;

            const dueDate = new Date(assignment[0].due_date);
            const now = new Date();

            // Recordatorio 7 días antes
            const reminder7Days = new Date(dueDate);
            reminder7Days.setDate(reminder7Days.getDate() - 7);
            if (reminder7Days > now) {
                await this.scheduleNotification(assignmentId, 'reminder', reminder7Days);
            }

            // Recordatorio 3 días antes
            const reminder3Days = new Date(dueDate);
            reminder3Days.setDate(reminder3Days.getDate() - 3);
            if (reminder3Days > now) {
                await this.scheduleNotification(assignmentId, 'reminder', reminder3Days);
            }

            // Recordatorio 1 día antes
            const reminder1Day = new Date(dueDate);
            reminder1Day.setDate(reminder1Day.getDate() - 1);
            if (reminder1Day > now) {
                await this.scheduleNotification(assignmentId, 'reminder', reminder1Day);
            }

            // Notificación de vencimiento (1 día después)
            const overdueNotif = new Date(dueDate);
            overdueNotif.setDate(overdueNotif.getDate() + 1);
            await this.scheduleNotification(assignmentId, 'overdue', overdueNotif);

            console.log(`📅 Recordatorios programados para assignment ${assignmentId}`);

        } catch (error) {
            console.error('Error programando recordatorios:', error);
        }
    }

    // === EVENTOS DEL SISTEMA ===

    setupSystemEventListeners() {
        // Escuchar eventos de capacitaciones
        this.on('training_assigned', async (data) => {
            await this.createTrainingNotification(data.assignmentId, 'assignment');
            await this.scheduleTrainingReminders(data.assignmentId);
        });

        this.on('training_completed', async (data) => {
            await this.createTrainingNotification(data.assignmentId, 'completion', {
                score: data.score
            });
        });

        this.on('training_extended', async (data) => {
            await this.createTrainingNotification(data.assignmentId, 'extension', {
                newDueDate: data.newDueDate
            });
        });

        this.on('evaluation_failed', async (data) => {
            await this.createTrainingNotification(data.assignmentId, 'evaluation_failed', {
                remainingAttempts: data.remainingAttempts
            });
        });
    }

    // === MÉTODOS PÚBLICOS PARA INTEGRACIÓN ===

    async markAsRead(notificationId, userId) {
        await sequelize.query(`
            UPDATE training_notifications 
            SET read_at = NOW()
            WHERE id = ? AND employee_id = ?
        `, { replacements: [notificationId, userId] });
    }

    async markAsAcknowledged(notificationId, userId) {
        await sequelize.query(`
            UPDATE training_notifications 
            SET acknowledged_at = NOW()
            WHERE id = ? AND employee_id = ?
        `, { replacements: [notificationId, userId] });
    }

    async getUnreadCount(userId) {
        const [result] = await sequelize.query(`
            SELECT COUNT(*) as count 
            FROM training_notifications 
            WHERE employee_id = ? AND read_at IS NULL
        `, { replacements: [userId] });

        return result[0].count;
    }

    async getUserNotifications(userId, limit = 50) {
        const [notifications] = await sequelize.query(`
            SELECT 
                tn.*,
                tc.title as course_title,
                ta.due_date
            FROM training_notifications tn
            LEFT JOIN training_assignments ta ON tn.assignment_id = ta.id
            LEFT JOIN training_courses tc ON ta.course_id = tc.id
            WHERE tn.employee_id = ?
            ORDER BY tn.created_at DESC
            LIMIT ?
        `, { replacements: [userId, limit] });

        return notifications;
    }
}

// Singleton instance
const notificationSystem = new NotificationSystem();

module.exports = notificationSystem;