// SERVICIO DE NOTIFICACIONES ENTERPRISE - ALTA CONCURRENCIA
// Diseñado para 10,000 usuarios simultáneos de 1,000 empresas diferentes
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class NotificationEnterpriseService extends EventEmitter {
    constructor(database) {
        super();
        this.database = database;
        this.sequelize = database.sequelize;
        this.isInitialized = false;
        
        // Buffer para batch processing
        this.notificationBuffer = new Map(); // company_id -> notifications[]
        this.queueBuffer = new Map();        // company_id -> queue_items[]
        
        // Configuración de performance
        this.config = {
            batchSize: 100,           // Procesar 100 notificaciones por batch
            bufferTimeout: 2000,      // Flush buffer cada 2 segundos
            maxRetries: 3,
            concurrentWorkers: 10     // 10 workers simultáneos
        };
        
        // Trabajadores activos
        this.activeWorkers = new Set();
        this.processingQueues = new Map(); // company_id -> processing status
        
        this.initialize();
        
        console.log('📱 [NOTIFICATION-ENTERPRISE] Servicio inicializado para alta concurrencia');
    }
    
    async initialize() {
        try {
            // Definir modelos si no existen
            if (!this.database.NotificationEnterprise) {
                this.database.NotificationEnterprise = this.sequelize.define('NotificationEnterprise', {
                    id: {
                        type: this.sequelize.Sequelize.DataTypes.STRING,
                        primaryKey: true,
                        defaultValue: () => uuidv4()
                    },
                    companyId: {
                        type: this.sequelize.Sequelize.DataTypes.STRING(50),
                        allowNull: false,
                        field: 'company_id'
                    },
                    notificationCode: {
                        type: this.sequelize.Sequelize.DataTypes.STRING(200),
                        allowNull: false,
                        field: 'notification_code'
                    },
                    fromModule: {
                        type: this.sequelize.Sequelize.DataTypes.ENUM(
                            'permissions', 'medical', 'training', 'art', 'legal', 'hr', 'payroll', 'safety'
                        ),
                        allowNull: false,
                        field: 'from_module'
                    },
                    fromUserId: {
                        type: this.sequelize.Sequelize.DataTypes.STRING,
                        allowNull: true,
                        field: 'from_user_id'
                    },
                    toUserId: {
                        type: this.sequelize.Sequelize.DataTypes.STRING,
                        allowNull: false,
                        field: 'to_user_id'
                    },
                    toRole: {
                        type: this.sequelize.Sequelize.DataTypes.ENUM(
                            'admin', 'supervisor', 'employee', 'medical', 'legal'
                        ),
                        allowNull: false,
                        field: 'to_role'
                    },
                    title: {
                        type: this.sequelize.Sequelize.DataTypes.STRING(255),
                        allowNull: false
                    },
                    message: {
                        type: this.sequelize.Sequelize.DataTypes.TEXT,
                        allowNull: false
                    },
                    notificationType: {
                        type: this.sequelize.Sequelize.DataTypes.ENUM(
                            'permission_change', 'role_change', 'permission_reset',
                            'medical_alert', 'medical_request', 'medical_document',
                            'training_assignment', 'training_reminder', 'training_completed',
                            'art_notification', 'safety_equipment', 'safety_training',
                            'legal_notification', 'hr_notification',
                            'payroll_receipt', 'vacation_request', 'schedule_change',
                            'system_announcement', 'urgent_alert'
                        ),
                        allowNull: false,
                        field: 'notification_type'
                    },
                    status: {
                        type: this.sequelize.Sequelize.DataTypes.ENUM(
                            'pending', 'sent', 'delivered', 'read', 'failed'
                        ),
                        defaultValue: 'pending'
                    },
                    priority: {
                        type: this.sequelize.Sequelize.DataTypes.ENUM(
                            'low', 'medium', 'high', 'urgent'
                        ),
                        defaultValue: 'medium'
                    },
                    channels: {
                        type: this.sequelize.Sequelize.DataTypes.JSON
                    },
                    deliveryAttempts: {
                        type: this.sequelize.Sequelize.DataTypes.INTEGER,
                        defaultValue: 0,
                        field: 'delivery_attempts'
                    },
                    metadata: {
                        type: this.sequelize.Sequelize.DataTypes.JSON
                    },
                    requiresResponse: {
                        type: this.sequelize.Sequelize.DataTypes.BOOLEAN,
                        defaultValue: false,
                        field: 'requires_response'
                    },
                    responseData: {
                        type: this.sequelize.Sequelize.DataTypes.JSON,
                        field: 'response_data'
                    },
                    responseAt: {
                        type: this.sequelize.Sequelize.DataTypes.DATE,
                        field: 'response_at'
                    },
                    readAt: {
                        type: this.sequelize.Sequelize.DataTypes.DATE,
                        field: 'read_at'
                    },
                    deliveredAt: {
                        type: this.sequelize.Sequelize.DataTypes.DATE,
                        field: 'delivered_at'
                    }
                }, {
                    tableName: 'notifications_enterprise',
                    timestamps: true,
                    indexes: [
                        { fields: ['company_id'] },
                        { fields: ['to_user_id', 'status'] },
                        { fields: ['company_id', 'status', 'priority'] }
                    ]
                });
            }
            
            if (!this.database.NotificationQueue) {
                this.database.NotificationQueue = this.sequelize.define('NotificationQueue', {
                    id: {
                        type: this.sequelize.Sequelize.DataTypes.STRING,
                        primaryKey: true,
                        defaultValue: () => uuidv4()
                    },
                    companyId: {
                        type: this.sequelize.Sequelize.DataTypes.STRING(50),
                        allowNull: false,
                        field: 'company_id'
                    },
                    notificationId: {
                        type: this.sequelize.Sequelize.DataTypes.STRING,
                        allowNull: false,
                        field: 'notification_id'
                    },
                    channel: {
                        type: this.sequelize.Sequelize.DataTypes.ENUM(
                            'internal', 'email', 'whatsapp', 'sms'
                        ),
                        allowNull: false
                    },
                    status: {
                        type: this.sequelize.Sequelize.DataTypes.ENUM(
                            'pending', 'processing', 'completed', 'failed'
                        ),
                        defaultValue: 'pending'
                    },
                    attempts: {
                        type: this.sequelize.Sequelize.DataTypes.INTEGER,
                        defaultValue: 0
                    },
                    maxAttempts: {
                        type: this.sequelize.Sequelize.DataTypes.INTEGER,
                        defaultValue: 3,
                        field: 'max_attempts'
                    },
                    scheduledAt: {
                        type: this.sequelize.Sequelize.DataTypes.DATE,
                        defaultValue: this.sequelize.Sequelize.DataTypes.NOW,
                        field: 'scheduled_at'
                    },
                    processedAt: {
                        type: this.sequelize.Sequelize.DataTypes.DATE,
                        field: 'processed_at'
                    },
                    errorMessage: {
                        type: this.sequelize.Sequelize.DataTypes.TEXT,
                        field: 'error_message'
                    }
                }, {
                    tableName: 'notification_queue',
                    timestamps: false,
                    indexes: [
                        { fields: ['status', 'scheduled_at'] },
                        { fields: ['company_id', 'status'] }
                    ]
                });
            }
            
            // Iniciar workers de procesamiento
            this.startBackgroundWorkers();
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ [NOTIFICATION-ENTERPRISE] Error inicializando:', error);
            throw error;
        }
    }
    
    /**
     * CREAR NOTIFICACIÓN AUTOMÁTICA
     * Función principal para generar notificaciones desde cualquier módulo
     */
    async createNotification({
        companyId,
        fromModule,
        fromUserId = null,
        toUserId,
        toRole,
        notificationType,
        title,
        message,
        priority = 'medium',
        channels = ['internal'],
        metadata = {},
        requiresResponse = false
    }) {
        try {
            // Generar código único por empresa-módulo-evento
            const notificationCode = this.generateNotificationCode(
                companyId, fromModule, notificationType, toUserId
            );
            
            const notification = {
                id: uuidv4(),
                companyId,
                notificationCode,
                fromModule,
                fromUserId,
                toUserId,
                toRole,
                title,
                message,
                notificationType,
                priority,
                channels: Array.isArray(channels) ? channels : [channels],
                metadata,
                requiresResponse,
                status: 'pending',
                deliveryAttempts: 0,
                createdAt: new Date()
            };
            
            // Usar buffer para alta concurrencia
            this.addToBuffer(companyId, notification);
            
            // Emitir evento para monitoring en tiempo real
            this.emit('notificationCreated', notification);
            
            console.log(`📱 [NOTIFICATION] Creada: ${notificationType} para ${toRole} en empresa ${companyId}`);
            return notification;
            
        } catch (error) {
            console.error('❌ [NOTIFICATION] Error creando:', error);
            throw error;
        }
    }
    
    /**
     * NOTIFICACIONES AUTOMÁTICAS POR EVENTOS
     */
    
    // Cambio de permisos
    async notifyPermissionChange(companyId, targetUserId, targetRole, changes, changedByUserId) {
        const changesText = Object.entries(changes)
            .map(([module, newPermission]) => `${module}: ${newPermission}`)
            .join(', ');
            
        return this.createNotification({
            companyId,
            fromModule: 'permissions',
            fromUserId: changedByUserId,
            toUserId: targetUserId,
            toRole: targetRole,
            notificationType: 'permission_change',
            title: '🔐 Cambio de Permisos',
            message: `Sus permisos de acceso han sido modificados: ${changesText}`,
            priority: 'high',
            channels: ['internal', 'email'],
            metadata: { changes, changedBy: changedByUserId }
        });
    }
    
    // Cambio en ficha personal
    async notifyPersonalDataChange(companyId, targetUserId, targetRole, changes, changedByUserId) {
        const changesText = Object.keys(changes).join(', ');
        
        return this.createNotification({
            companyId,
            fromModule: 'hr',
            fromUserId: changedByUserId,
            toUserId: targetUserId,
            toRole: targetRole,
            notificationType: 'hr_notification',
            title: '👤 Actualización de Datos Personales',
            message: `Su información personal ha sido actualizada: ${changesText}`,
            priority: 'medium',
            channels: ['internal', 'email'],
            metadata: { changes, changedBy: changedByUserId }
        });
    }
    
    // Nueva capacitación
    async notifyTrainingAssignment(companyId, targetUserId, targetRole, trainingData) {
        return this.createNotification({
            companyId,
            fromModule: 'training',
            toUserId: targetUserId,
            toRole: targetRole,
            notificationType: 'training_assignment',
            title: '🎓 Nueva Capacitación Asignada',
            message: `Se le ha asignado la capacitación: ${trainingData.title}. Fecha límite: ${trainingData.deadline}`,
            priority: 'high',
            channels: ['internal', 'email'],
            metadata: { trainingId: trainingData.id, deadline: trainingData.deadline },
            requiresResponse: true
        });
    }
    
    // Solicitud médica
    async notifyMedicalRequest(companyId, targetUserId, targetRole, requestData, fromUserId) {
        return this.createNotification({
            companyId,
            fromModule: 'medical',
            fromUserId,
            toUserId: targetUserId,
            toRole: targetRole,
            notificationType: 'medical_request',
            title: '🏥 Solicitud Médica',
            message: `Solicitud: ${requestData.type}. ${requestData.description}`,
            priority: 'high',
            channels: ['internal', 'email'],
            metadata: { requestType: requestData.type, requestId: requestData.id },
            requiresResponse: true
        });
    }
    
    // Entrega de EPP
    async notifyEPPDelivery(companyId, targetUserId, targetRole, eppData, deliveredByUserId) {
        return this.createNotification({
            companyId,
            fromModule: 'safety',
            fromUserId: deliveredByUserId,
            toUserId: targetUserId,
            toRole: targetRole,
            notificationType: 'safety_equipment',
            title: '🦺 Entrega de Equipo de Protección',
            message: `Se le ha entregado: ${eppData.items.join(', ')}. Por favor confirme la recepción.`,
            priority: 'high',
            channels: ['internal'],
            metadata: { items: eppData.items, deliveryId: eppData.id },
            requiresResponse: true
        });
    }
    
    /**
     * PROCESAMIENTO DE ALTA CONCURRENCIA
     */
    
    addToBuffer(companyId, notification) {
        if (!this.notificationBuffer.has(companyId)) {
            this.notificationBuffer.set(companyId, []);
        }
        
        this.notificationBuffer.get(companyId).push(notification);
        
        // Auto-flush si el buffer está lleno
        if (this.notificationBuffer.get(companyId).length >= this.config.batchSize) {
            this.flushBuffer(companyId);
        }
    }
    
    async flushBuffer(companyId) {
        const notifications = this.notificationBuffer.get(companyId);
        if (!notifications || notifications.length === 0) return;
        
        try {
            console.log(`📦 [NOTIFICATION-BATCH] Procesando ${notifications.length} notificaciones para empresa ${companyId}`);
            
            // Batch insert para alta performance
            await this.database.NotificationEnterprise.bulkCreate(notifications, {
                ignoreDuplicates: true,
                validate: false // Skip validations for performance
            });
            
            // Crear items de cola para procesamiento asíncrono
            const queueItems = [];
            for (const notification of notifications) {
                for (const channel of notification.channels) {
                    queueItems.push({
                        id: uuidv4(),
                        companyId: notification.companyId,
                        notificationId: notification.id,
                        channel,
                        status: 'pending',
                        attempts: 0,
                        maxAttempts: this.config.maxRetries,
                        scheduledAt: new Date()
                    });
                }
            }
            
            if (queueItems.length > 0) {
                await this.database.NotificationQueue.bulkCreate(queueItems, {
                    ignoreDuplicates: true,
                    validate: false
                });
            }
            
            // Limpiar buffer
            this.notificationBuffer.set(companyId, []);
            
            console.log(`✅ [NOTIFICATION-BATCH] ${notifications.length} notificaciones procesadas, ${queueItems.length} items en cola`);
            
        } catch (error) {
            console.error(`❌ [NOTIFICATION-BATCH] Error procesando empresa ${companyId}:`, error);
        }
    }
    
    async flushAllBuffers() {
        const companies = Array.from(this.notificationBuffer.keys());
        const promises = companies.map(companyId => this.flushBuffer(companyId));
        await Promise.allSettled(promises);
    }
    
    startBackgroundWorkers() {
        // Worker para flush automático de buffers
        setInterval(() => {
            this.flushAllBuffers();
        }, this.config.bufferTimeout);
        
        // Workers para procesamiento de cola
        for (let i = 0; i < this.config.concurrentWorkers; i++) {
            setTimeout(() => this.startQueueWorker(i), i * 100); // Stagger start times
        }
        
        console.log(`🚀 [WORKERS] Iniciados ${this.config.concurrentWorkers} workers de procesamiento`);
    }
    
    async startQueueWorker(workerId) {
        const worker = `worker-${workerId}`;
        this.activeWorkers.add(worker);
        
        console.log(`👷 [${worker}] Iniciado`);
        
        while (this.activeWorkers.has(worker)) {
            try {
                await this.processQueueBatch(worker);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between batches
            } catch (error) {
                console.error(`❌ [${worker}] Error:`, error);
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s on error
            }
        }
    }
    
    async processQueueBatch(workerId) {
        const batchSize = 50;
        
        // Obtener batch de items pendientes
        const queueItems = await this.database.NotificationQueue.findAll({
            where: {
                status: 'pending',
                scheduledAt: { [this.sequelize.Sequelize.Op.lte]: new Date() }
            },
            limit: batchSize,
            order: [['scheduled_at', 'ASC']]
        });
        
        if (queueItems.length === 0) return;
        
        console.log(`📨 [${workerId}] Procesando ${queueItems.length} items de cola`);
        
        for (const item of queueItems) {
            try {
                // Marcar como procesando
                await item.update({ 
                    status: 'processing',
                    attempts: item.attempts + 1
                });
                
                // Procesar según el canal
                const success = await this.deliverNotification(item);
                
                if (success) {
                    await item.update({
                        status: 'completed',
                        processedAt: new Date()
                    });
                } else {
                    if (item.attempts >= item.maxAttempts) {
                        await item.update({
                            status: 'failed',
                            processedAt: new Date(),
                            errorMessage: 'Max attempts reached'
                        });
                    } else {
                        await item.update({
                            status: 'pending',
                            scheduledAt: new Date(Date.now() + (item.attempts * 60000)) // Exponential backoff
                        });
                    }
                }
                
            } catch (error) {
                console.error(`❌ [${workerId}] Error procesando item ${item.id}:`, error);
                await item.update({
                    status: 'failed',
                    processedAt: new Date(),
                    errorMessage: error.message
                });
            }
        }
    }
    
    async deliverNotification(queueItem) {
        // Obtener la notificación completa
        const notification = await this.database.NotificationEnterprise.findByPk(queueItem.notificationId);
        if (!notification) return false;
        
        console.log(`📤 [DELIVERY] Enviando ${queueItem.channel} para ${notification.notificationType}`);
        
        switch (queueItem.channel) {
            case 'internal':
                // Marcar como entregada internamente (siempre exitoso)
                await notification.update({
                    status: 'delivered',
                    deliveredAt: new Date()
                });
                return true;
                
            case 'email':
                // TODO: Integrar con servicio de email (SendGrid, etc)
                console.log(`📧 [EMAIL] Enviando a usuario ${notification.toUserId}`);
                return true;
                
            case 'whatsapp':
                // TODO: Integrar con API de WhatsApp Business
                console.log(`📱 [WHATSAPP] Enviando a usuario ${notification.toUserId}`);
                return true;
                
            case 'sms':
                // TODO: Integrar con servicio SMS (Twilio, etc)
                console.log(`💬 [SMS] Enviando a usuario ${notification.toUserId}`);
                return true;
                
            default:
                return false;
        }
    }
    
    generateNotificationCode(companyId, fromModule, notificationType, toUserId, timestamp = Date.now()) {
        return `${companyId}-${fromModule}-${notificationType}-${toUserId}-${timestamp}`;
    }
    
    /**
     * API PARA FRONTEND - OBTENER NOTIFICACIONES POR USUARIO
     */
    
    async getUserNotifications(companyId, userId, options = {}) {
        const {
            status = null,
            limit = 50,
            offset = 0,
            priority = null,
            unreadOnly = false
        } = options;
        
        const where = {
            companyId,
            toUserId: userId
        };
        
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (unreadOnly) where.readAt = null;
        
        return await this.database.NotificationEnterprise.findAndCountAll({
            where,
            order: [['priority', 'DESC'], ['createdAt', 'DESC']],
            limit,
            offset
        });
    }
    
    async markAsRead(notificationId, userId) {
        const notification = await this.database.NotificationEnterprise.findOne({
            where: { id: notificationId, toUserId: userId }
        });
        
        if (notification && !notification.readAt) {
            await notification.update({
                status: 'read',
                readAt: new Date()
            });
            return true;
        }
        return false;
    }
    
    async getUnreadCount(companyId, userId) {
        return await this.database.NotificationEnterprise.count({
            where: {
                companyId,
                toUserId: userId,
                readAt: null
            }
        });
    }
    
    // Shutdown graceful
    async shutdown() {
        console.log('🛑 [NOTIFICATION-ENTERPRISE] Cerrando servicio...');
        
        // Detener workers
        this.activeWorkers.clear();
        
        // Flush final de todos los buffers
        await this.flushAllBuffers();
        
        console.log('✅ [NOTIFICATION-ENTERPRISE] Servicio cerrado correctamente');
    }
}

module.exports = NotificationEnterpriseService;