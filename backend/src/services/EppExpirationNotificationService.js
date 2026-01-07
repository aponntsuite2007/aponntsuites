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

// 🔥 NCE: Central Telefónica de Notificaciones - CERO BYPASS
const NCE = require('./NotificationCentralExchange');

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
     * Busca el responsable HSE del área/departamento/branch del empleado
     * Usa jerarquía organizacional y posición, NO rol genérico
     */
    async findHseResponsibleForEmployee(employeeId, companyId) {
        try {
            const { sequelize } = this.db;

            // Obtener información del empleado (department, branch, posición)
            const employeeQuery = `
                SELECT u.user_id, u."firstName", u."lastName",
                       u.department_id, u.branch,
                       op.parent_position_id, op.branch_code
                FROM users u
                LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE u.user_id = $1 AND u.company_id = $2
            `;

            const employeeResult = await sequelize.query(employeeQuery, {
                bind: [employeeId, companyId],
                type: sequelize.QueryTypes.SELECT
            });

            if (!employeeResult || employeeResult.length === 0) {
                console.log(`⚠️ [EPP] Empleado ${employeeId} no encontrado`);
                return [];
            }

            const employee = employeeResult[0];
            const hseResponsibles = [];

            // ESTRATEGIA 1: Buscar HSE manager del mismo branch (si tiene branch_code)
            if (employee.branch_code) {
                const branchHseQuery = `
                    SELECT u.user_id, u."firstName", u."lastName", u.email,
                           op.position_name, op.position_code
                    FROM users u
                    JOIN organizational_positions op ON u.organizational_position_id = op.id
                    WHERE u.company_id = $1
                      AND op.branch_code = $2
                      AND u.is_active = true
                      AND (
                        UPPER(op.position_code) LIKE '%HSE%'
                        OR UPPER(op.position_name) LIKE '%HSE%'
                        OR UPPER(op.position_name) LIKE '%SEGURIDAD%'
                        OR UPPER(op.position_name) LIKE '%HIGIENE%'
                      )
                    ORDER BY op.level_order ASC
                    LIMIT 1
                `;

                const branchHse = await sequelize.query(branchHseQuery, {
                    bind: [companyId, employee.branch_code],
                    type: sequelize.QueryTypes.SELECT
                });

                if (branchHse.length > 0) {
                    console.log(`✅ [EPP] HSE encontrado por branch: ${branchHse[0].firstName} ${branchHse[0].lastName}`);
                    hseResponsibles.push({
                        userId: branchHse[0].user_id,
                        name: `${branchHse[0].firstName} ${branchHse[0].lastName}`,
                        email: branchHse[0].email,
                        position: branchHse[0].position_name,
                        resolvedFrom: 'branch_hse'
                    });
                    return hseResponsibles; // Encontrado, retornar
                }
            }

            // ESTRATEGIA 2: Buscar HSE manager del mismo department
            if (employee.department_id) {
                const deptHseQuery = `
                    SELECT u.user_id, u."firstName", u."lastName", u.email,
                           op.position_name, op.position_code
                    FROM users u
                    JOIN organizational_positions op ON u.organizational_position_id = op.id
                    WHERE u.company_id = $1
                      AND u.department_id = $2
                      AND u.is_active = true
                      AND (
                        UPPER(op.position_code) LIKE '%HSE%'
                        OR UPPER(op.position_name) LIKE '%HSE%'
                        OR UPPER(op.position_name) LIKE '%SEGURIDAD%'
                        OR UPPER(op.position_name) LIKE '%HIGIENE%'
                      )
                    ORDER BY op.level_order ASC
                    LIMIT 1
                `;

                const deptHse = await sequelize.query(deptHseQuery, {
                    bind: [companyId, employee.department_id],
                    type: sequelize.QueryTypes.SELECT
                });

                if (deptHse.length > 0) {
                    console.log(`✅ [EPP] HSE encontrado por departamento: ${deptHse[0].firstName} ${deptHse[0].lastName}`);
                    hseResponsibles.push({
                        userId: deptHse[0].user_id,
                        name: `${deptHse[0].firstName} ${deptHse[0].lastName}`,
                        email: deptHse[0].email,
                        position: deptHse[0].position_name,
                        resolvedFrom: 'department_hse'
                    });
                    return hseResponsibles;
                }
            }

            // ESTRATEGIA 3: Buscar HSE manager de nivel company (sin branch ni department)
            const companyHseQuery = `
                SELECT u.user_id, u."firstName", u."lastName", u.email,
                       op.position_name, op.position_code
                FROM users u
                JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE u.company_id = $1
                  AND u.is_active = true
                  AND (
                    UPPER(op.position_code) LIKE '%HSE%'
                    OR UPPER(op.position_name) LIKE '%HSE%'
                    OR UPPER(op.position_name) LIKE '%SEGURIDAD%'
                    OR UPPER(op.position_name) LIKE '%HIGIENE%'
                  )
                ORDER BY op.level_order ASC
                LIMIT 3
            `;

            const companyHse = await sequelize.query(companyHseQuery, {
                bind: [companyId],
                type: sequelize.QueryTypes.SELECT
            });

            if (companyHse.length > 0) {
                console.log(`✅ [EPP] HSE encontrado a nivel company: ${companyHse.length} responsables`);
                hseResponsibles.push(...companyHse.map(hse => ({
                    userId: hse.user_id,
                    name: `${hse.firstName} ${hse.lastName}`,
                    email: hse.email,
                    position: hse.position_name,
                    resolvedFrom: 'company_hse'
                })));
                return hseResponsibles;
            }

            // ESTRATEGIA 4 (Fallback): Buscar RRHH por posición
            console.log(`⚠️ [EPP] No se encontró HSE manager. Buscando RRHH...`);
            const rrhhQuery = `
                SELECT u.user_id, u."firstName", u."lastName", u.email,
                       op.position_name, op.position_code
                FROM users u
                JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE u.company_id = $1
                  AND u.is_active = true
                  AND (
                    UPPER(op.position_code) LIKE '%RRHH%'
                    OR UPPER(op.position_code) LIKE '%RH%'
                    OR UPPER(op.position_code) LIKE '%HR%'
                    OR UPPER(op.position_name) LIKE '%RECURSOS HUMANOS%'
                  )
                ORDER BY op.level_order ASC
                LIMIT 2
            `;

            const rrhhUsers = await sequelize.query(rrhhQuery, {
                bind: [companyId],
                type: sequelize.QueryTypes.SELECT
            });

            if (rrhhUsers.length > 0) {
                console.log(`✅ [EPP] RRHH encontrado como fallback: ${rrhhUsers[0].firstName} ${rrhhUsers[0].lastName}`);
                hseResponsibles.push(...rrhhUsers.map(rrhh => ({
                    userId: rrhh.user_id,
                    name: `${rrhh.firstName} ${rrhh.lastName}`,
                    email: rrhh.email,
                    position: rrhh.position_name,
                    resolvedFrom: 'rrhh_fallback'
                })));
                return hseResponsibles;
            }

            console.log(`❌ [EPP] No se encontró responsable HSE ni RRHH para empleado ${employeeId}`);
            return [];

        } catch (error) {
            console.error(`❌ [EPP] Error buscando responsable HSE:`, error);
            return [];
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

        // Notificar al responsable HSE (usando jerarquía organizacional)
        if (notifyHseManager && delivery.employee) {
            const hseResponsibles = await this.findHseResponsibleForEmployee(
                delivery.employee.user_id,
                company.company_id
            );

            for (const responsible of hseResponsibles) {
                notifications.push({
                    recipient_id: responsible.userId,
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
                        days_remaining: daysRemaining,
                        resolved_from: responsible.resolvedFrom,
                        responsible_position: responsible.position
                    }
                });
            }
        }

        // 🔥 NCE: Crear notificaciones via Central Telefónica
        try {
            for (const notif of notifications) {
                await NCE.send({
                    companyId: notif.company_id,
                    module: 'hse',
                    originType: notif.type,
                    originId: `epp-${delivery.id}-${notif.recipient_id}`,
                    workflowKey: isExpired ? 'hse.epp_expired' : 'hse.epp_expiring',
                    recipientType: 'user',
                    recipientId: notif.recipient_id,
                    title: notif.title,
                    message: notif.message,
                    priority: severity === 'critical' ? 'urgent' : (severity === 'high' ? 'high' : 'normal'),
                    requiresAction: true,
                    actionType: 'replacement',
                    metadata: {
                        ...notif.metadata,
                        action_url: notif.action_url,
                        severity: notif.severity
                    },
                    slaHours: isExpired ? 24 : (daysRemaining * 24),
                    channels: ['inbox'],
                });
            }
        } catch (err) {
            console.error('[EPP-SCHEDULER] Error creando notificacion NCE:', err.message);
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
