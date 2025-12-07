/**
 * EppExpirationNotificationService.js
 * Servicio de notificaciones automaticas para vencimiento de EPP
 *
 * Cron job diario que verifica EPP por vencer y envia notificaciones
 * segun configuracion de empresa (30, 15, 7, 1 dias antes)
 *
 * @version 1.0.0
 */

const cron = require('node-cron');
const { Op } = require('sequelize');

class EppExpirationNotificationService {
    constructor() {
        this.db = null;
        this.isRunning = false;
        this.scheduler = null;
    }

    /**
     * Inicializar el servicio con la conexion a BD
     */
    async initialize(database) {
        this.db = database;
        console.log('🛡️ [EPP-SCHEDULER] Inicializando scheduler de EPP...');

        // Ejecutar diariamente a las 8:00 AM
        this.scheduler = cron.schedule('0 8 * * *', async () => {
            await this.checkExpirations();
        }, {
            scheduled: true,
            timezone: 'America/Argentina/Buenos_Aires'
        });

        console.log('✅ [EPP-SCHEDULER] Scheduler iniciado (diario 8:00 AM)');
        console.log('   • Frecuencia: Diario a las 8:00 AM');
        console.log('   • Notificaciones: 30, 15, 7, 1 dias antes del vencimiento');
        console.log('   • Zona horaria: America/Argentina/Buenos_Aires');
    }

    /**
     * Verificar EPP por vencer y enviar notificaciones
     */
    async checkExpirations() {
        if (this.isRunning) {
            console.log('⚠️ [EPP-SCHEDULER] Ciclo anterior aun en ejecucion, saltando...');
            return;
        }

        this.isRunning = true;
        console.log('🔄 [EPP-SCHEDULER] Ejecutando ciclo de verificacion de vencimientos EPP...');

        try {
            const { EppDelivery, EppCatalog, EppCategory, HseCompanyConfig, User, Company } = this.db;

            // Obtener todas las empresas con configuracion HSE
            const companies = await Company.findAll({
                where: { is_active: true },
                attributes: ['company_id', 'name']
            });

            let totalNotifications = 0;

            for (const company of companies) {
                // Obtener configuracion HSE de la empresa
                const config = await HseCompanyConfig.findOne({
                    where: { company_id: company.company_id }
                });

                // Usar configuracion por defecto si no existe
                const alertDays = config?.alert_days_before || [30, 15, 7, 1];
                const notifyEmployee = config?.notify_employee ?? true;
                const notifyHseManager = config?.notify_hse_manager ?? true;

                // Verificar cada periodo de alerta
                for (const days of alertDays) {
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() + days);
                    targetDate.setHours(0, 0, 0, 0);

                    const nextDay = new Date(targetDate);
                    nextDay.setDate(nextDay.getDate() + 1);

                    // Construir campo de notificacion segun dias
                    let notificationField;
                    if (days === 30) notificationField = 'notification_30_sent';
                    else if (days === 15) notificationField = 'notification_15_sent';
                    else if (days === 7) notificationField = 'notification_7_sent';
                    else if (days <= 1) notificationField = 'notification_expired_sent';
                    else continue; // Dias no estandar

                    // Buscar EPP que vencen en esta fecha y no han sido notificados
                    const expiringDeliveries = await EppDelivery.findAll({
                        where: {
                            company_id: company.company_id,
                            status: 'active',
                            calculated_replacement_date: {
                                [Op.gte]: targetDate,
                                [Op.lt]: nextDay
                            },
                            [notificationField]: false
                        },
                        include: [
                            {
                                model: EppCatalog,
                                as: 'catalog',
                                include: [{ model: EppCategory, as: 'category' }]
                            },
                            {
                                model: User,
                                as: 'employee',
                                attributes: ['user_id', 'firstName', 'lastName', 'employeeId', 'email']
                            }
                        ]
                    });

                    // Enviar notificaciones
                    for (const delivery of expiringDeliveries) {
                        try {
                            await this.sendExpirationNotification(delivery, days, {
                                notifyEmployee,
                                notifyHseManager,
                                company
                            });

                            // Marcar como notificado
                            await delivery.update({ [notificationField]: true });
                            totalNotifications++;
                        } catch (err) {
                            console.error(`[EPP-SCHEDULER] Error enviando notificacion para delivery ${delivery.id}:`, err.message);
                        }
                    }
                }

                // Verificar EPP ya vencidos (dias < 0)
                const expiredDeliveries = await EppDelivery.findAll({
                    where: {
                        company_id: company.company_id,
                        status: 'active',
                        calculated_replacement_date: {
                            [Op.lt]: new Date()
                        },
                        notification_expired_sent: false
                    },
                    include: [
                        {
                            model: EppCatalog,
                            as: 'catalog',
                            include: [{ model: EppCategory, as: 'category' }]
                        },
                        {
                            model: User,
                            as: 'employee',
                            attributes: ['user_id', 'firstName', 'lastName', 'employeeId', 'email']
                        }
                    ]
                });

                for (const delivery of expiredDeliveries) {
                    try {
                        await this.sendExpirationNotification(delivery, 0, {
                            notifyEmployee,
                            notifyHseManager,
                            company,
                            isExpired: true
                        });

                        await delivery.update({
                            notification_expired_sent: true,
                            status: 'expired'
                        });
                        totalNotifications++;
                    } catch (err) {
                        console.error(`[EPP-SCHEDULER] Error enviando notificacion EPP vencido ${delivery.id}:`, err.message);
                    }
                }
            }

            console.log(`✅ [EPP-SCHEDULER] Ciclo completado`);
            console.log(`   📧 Total notificaciones enviadas: ${totalNotifications}`);

        } catch (error) {
            console.error('[EPP-SCHEDULER] Error en ciclo de verificacion:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Enviar notificacion de vencimiento de EPP
     */
    async sendExpirationNotification(delivery, daysRemaining, options) {
        const { notifyEmployee, notifyHseManager, company, isExpired } = options;
        const { NotificationEnterpriseService } = this.db;

        const eppName = delivery.catalog?.name || 'EPP';
        const categoryName = delivery.catalog?.category?.name_es || 'EPP';
        const employeeName = delivery.employee ?
            `${delivery.employee.firstName} ${delivery.employee.lastName}` : 'Empleado';

        const severity = isExpired ? 'critical' : (daysRemaining <= 7 ? 'high' : 'medium');

        // Crear notificaciones
        const notifications = [];

        // Notificar al empleado
        if (notifyEmployee && delivery.employee) {
            notifications.push({
                recipient_id: delivery.employee.user_id,
                type: isExpired ? 'EPP_EXPIRED' : 'EPP_EXPIRING',
                severity,
                title: isExpired ?
                    `⚠️ EPP VENCIDO: ${eppName}` :
                    `🛡️ EPP por vencer: ${eppName}`,
                message: isExpired ?
                    `Tu ${categoryName} "${eppName}" ha VENCIDO. Debes solicitar reemplazo inmediatamente.` :
                    `Tu ${categoryName} "${eppName}" vence en ${daysRemaining} dia(s). Fecha: ${delivery.calculated_replacement_date?.toLocaleDateString() || 'N/A'}`,
                action_url: `/hse/my-epp/${delivery.id}`,
                company_id: company.company_id,
                metadata: {
                    delivery_id: delivery.id,
                    epp_name: eppName,
                    days_remaining: daysRemaining,
                    replacement_date: delivery.calculated_replacement_date
                }
            });
        }

        // Notificar al responsable HSE
        if (notifyHseManager) {
            // Buscar usuarios con rol hse_manager en la empresa
            const hseManagers = await this.db.User.findAll({
                where: {
                    company_id: company.company_id,
                    role: { [Op.in]: ['admin', 'hse_manager'] },
                    isActive: true
                },
                attributes: ['user_id']
            });

            for (const manager of hseManagers) {
                notifications.push({
                    recipient_id: manager.user_id,
                    type: isExpired ? 'EPP_EXPIRED_ALERT' : 'EPP_EXPIRING_ALERT',
                    severity,
                    title: isExpired ?
                        `⚠️ EPP VENCIDO: ${employeeName}` :
                        `🛡️ EPP por vencer: ${employeeName}`,
                    message: isExpired ?
                        `El ${categoryName} de ${employeeName} ha VENCIDO y requiere reemplazo urgente.` :
                        `El ${categoryName} de ${employeeName} vence en ${daysRemaining} dia(s). Programar reemplazo.`,
                    action_url: `/hse/deliveries/${delivery.id}/replace`,
                    company_id: company.company_id,
                    metadata: {
                        delivery_id: delivery.id,
                        employee_id: delivery.employee?.user_id,
                        employee_name: employeeName,
                        epp_name: eppName,
                        days_remaining: daysRemaining
                    }
                });
            }
        }

        // Crear notificaciones usando el sistema enterprise
        try {
            const { EnterpriseNotification } = this.db;
            if (EnterpriseNotification) {
                for (const notif of notifications) {
                    await EnterpriseNotification.create({
                        ...notif,
                        status: 'pending',
                        read: false,
                        created_at: new Date()
                    });
                }
            } else {
                // Fallback: usar console.log si no hay sistema de notificaciones
                console.log(`[EPP-NOTIFICATION] ${isExpired ? 'VENCIDO' : 'Por vencer'}: ${eppName} - ${employeeName} - ${daysRemaining} dias`);
            }
        } catch (err) {
            console.error('[EPP-SCHEDULER] Error creando notificacion:', err.message);
            // No lanzar error para continuar con otras notificaciones
        }
    }

    /**
     * Ejecutar verificacion manual (para testing)
     */
    async runManualCheck() {
        console.log('🔧 [EPP-SCHEDULER] Ejecutando verificacion manual...');
        await this.checkExpirations();
    }

    /**
     * Detener el scheduler
     */
    stop() {
        if (this.scheduler) {
            this.scheduler.stop();
            console.log('🛑 [EPP-SCHEDULER] Scheduler detenido');
        }
    }
}

// Singleton
const eppExpirationService = new EppExpirationNotificationService();
module.exports = eppExpirationService;
