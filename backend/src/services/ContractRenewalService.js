/**
 * ============================================================================
 * CONTRACT RENEWAL SERVICE - Sistema de Renovación Automática de Contratos
 * ============================================================================
 *
 * Servicio que gestiona el ciclo de vida de contratos con:
 * - Alertas T-30 días antes del vencimiento
 * - Extensión automática de 60 días (grace period) al vencer
 * - Alertas continuas durante el grace period
 * - Suspensión automática tras expirar el grace period
 *
 * Destinatarios de alertas:
 * - Vendedor asignado al contrato
 * - aponntcomercial@gmail.com (siempre)
 * - Email de la sucursal central de la empresa
 *
 * @version 1.0
 * @date 2025-12-16
 */

const { sequelize } = require('../config/database');
const emailService = require('./EmailService');
const inboxService = require('./inboxService');

// 🔥 NCE: Central Telefónica de Notificaciones (elimina bypass EmailService)
const NCE = require('./NotificationCentralExchange');

class ContractRenewalService {
    constructor() {
        this.emailService = emailService;
        this.APONNT_COMMERCIAL_EMAIL = 'aponntcomercial@gmail.com';
    }

    /**
     * ========================================================================
     * MÉTODO PRINCIPAL: Ejecutar ciclo de renovación
     * ========================================================================
     *
     * Este método debe ejecutarse diariamente (cron job) para:
     * 1. Enviar alertas de renovación (T-30 días)
     * 2. Aplicar extensiones automáticas (T-0)
     * 3. Suspender contratos con grace period expirado (T+60)
     */
    async runRenewalCycle() {
        console.log('📋 [CONTRACT-RENEWAL] Iniciando ciclo de renovación...');

        const results = {
            timestamp: new Date().toISOString(),
            alerts_sent: 0,
            extensions_applied: 0,
            contracts_suspended: 0,
            errors: []
        };

        try {
            // 1. Enviar alertas de renovación
            const alertResults = await this.sendRenewalAlerts();
            results.alerts_sent = alertResults.count;

            // 2. Aplicar extensiones automáticas
            const extensionResults = await this.applyAutoExtensions();
            results.extensions_applied = extensionResults.count;

            // 3. Suspender contratos expirados
            const suspensionResults = await this.suspendExpiredContracts();
            results.contracts_suspended = suspensionResults.count;

            console.log('✅ [CONTRACT-RENEWAL] Ciclo completado:', results);
            return results;

        } catch (error) {
            console.error('❌ [CONTRACT-RENEWAL] Error en ciclo:', error);
            results.errors.push(error.message);
            return results;
        }
    }

    /**
     * ========================================================================
     * PASO 1: Enviar alertas de renovación
     * ========================================================================
     */
    async sendRenewalAlerts() {
        console.log('📧 [CONTRACT-RENEWAL] Buscando contratos para alertas...');

        try {
            // Obtener contratos que necesitan alerta usando la función PostgreSQL
            const contracts = await sequelize.query(
                'SELECT * FROM get_contracts_needing_renewal_alert()',
                { type: sequelize.QueryTypes.SELECT }
            );

            console.log(`📋 [CONTRACT-RENEWAL] ${contracts.length} contratos necesitan alerta`);

            let successCount = 0;

            for (const contract of contracts) {
                try {
                    await this.sendRenewalAlertForContract(contract);

                    // Actualizar fecha de última alerta
                    await sequelize.query(`
                        UPDATE contracts
                        SET renewal_alert_sent_at = CURRENT_TIMESTAMP,
                            status = CASE WHEN status = 'ACTIVE' THEN 'RENEWAL_PENDING' ELSE status END
                        WHERE id = :contractId
                    `, {
                        replacements: { contractId: contract.contract_id },
                        type: sequelize.QueryTypes.UPDATE
                    });

                    // Registrar en log de renovaciones
                    await this.logRenewalAction(contract.contract_id, 'ALERT_SENT', {
                        days_until_expiry: contract.days_until_expiry,
                        is_grace_period: contract.is_grace_period,
                        recipients: [
                            contract.vendor_email,
                            this.APONNT_COMMERCIAL_EMAIL,
                            contract.company_email
                        ].filter(Boolean)
                    });

                    successCount++;

                } catch (error) {
                    console.error(`❌ [CONTRACT-RENEWAL] Error enviando alerta para ${contract.contract_code}:`, error.message);
                }
            }

            return { count: successCount, total: contracts.length };

        } catch (error) {
            console.error('❌ [CONTRACT-RENEWAL] Error en sendRenewalAlerts:', error);
            throw error;
        }
    }

    /**
     * Enviar alerta de renovación para un contrato específico
     */
    async sendRenewalAlertForContract(contract) {
        const isGracePeriod = contract.is_grace_period;
        const daysLeft = contract.days_until_expiry;

        // Determinar urgencia
        let urgency = 'normal';
        let urgencyEmoji = '📋';
        if (daysLeft <= 7) {
            urgency = 'critical';
            urgencyEmoji = '🚨';
        } else if (daysLeft <= 15) {
            urgency = 'high';
            urgencyEmoji = '⚠️';
        }

        // Asunto del email
        const subject = isGracePeriod
            ? `${urgencyEmoji} URGENTE: Contrato ${contract.contract_code} en período de gracia (${daysLeft} días restantes)`
            : `${urgencyEmoji} Renovación pendiente: Contrato ${contract.contract_code} (vence en ${daysLeft} días)`;

        // Contenido HTML del email
        const html = this.generateRenewalEmailHtml(contract, isGracePeriod, daysLeft, urgency);

        // Recopilar destinatarios
        const recipients = [];
        if (contract.vendor_email) recipients.push(contract.vendor_email);
        recipients.push(this.APONNT_COMMERCIAL_EMAIL);
        if (contract.company_email) recipients.push(contract.company_email);

        // 🔥 Enviar email a cada destinatario → NCE
        for (const recipient of recipients) {
            try {
                // Determinar tipo de destinatario para tracking
                let recipientType = 'external';
                if (recipient === contract.vendor_email) recipientType = 'vendor';
                else if (recipient === this.APONNT_COMMERCIAL_EMAIL) recipientType = 'staff';
                else if (recipient === contract.company_email) recipientType = 'company';

                await NCE.send({
                    companyId: contract.company_id,
                    module: 'contracts',
                    originType: 'contract_renewal_alert',
                    originId: `contract-${contract.contract_id}-renewal-${recipient}`,

                    workflowKey: isGracePeriod ? 'contracts.grace_period_alert' : 'contracts.renewal_alert',

                    recipientType: recipientType === 'staff' ? 'group' : 'external',
                    recipientId: recipient,
                    recipientEmail: recipient,

                    title: subject,
                    message: `Alerta de renovación para contrato ${contract.contract_code}`,

                    metadata: {
                        contractId: contract.contract_id,
                        contractCode: contract.contract_code,
                        companyId: contract.company_id,
                        companyName: contract.company_name,
                        daysLeft,
                        isGracePeriod,
                        recipientType,
                        htmlContent: html,
                        textContent: this.generateRenewalEmailText(contract, isGracePeriod, daysLeft)
                    },

                    priority: isGracePeriod ? 'urgent' : 'high',
                    requiresAction: true,
                    actionType: 'response',
                    slaHours: isGracePeriod ? 24 : 72,

                    channels: ['email'],
                });

                console.log(`✅ [NCE] Alerta enviada a ${recipient} para ${contract.contract_code}`);

            } catch (error) {
                console.error(`⚠️ [NCE] Error enviando a ${recipient}:`, error.message);
            }
        }

        // También crear notificación interna si es para la empresa
        if (contract.company_id) {
            await this.createInboxNotification(contract, isGracePeriod, daysLeft);
        }
    }

    /**
     * Generar HTML para email de renovación
     */
    generateRenewalEmailHtml(contract, isGracePeriod, daysLeft, urgency) {
        const urgencyColor = urgency === 'critical' ? '#ef4444' :
                            urgency === 'high' ? '#f59e0b' : '#3b82f6';

        const statusMessage = isGracePeriod
            ? `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                 <strong>⚠️ PERÍODO DE GRACIA ACTIVO</strong><br>
                 El contrato ha entrado en período de gracia de 60 días.
                 Si no se renueva antes del ${new Date(contract.end_date).toLocaleDateString('es-ES')},
                 el servicio será suspendido automáticamente.
               </div>`
            : `<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                 <strong>📅 Vencimiento próximo</strong><br>
                 El contrato vence el ${new Date(contract.end_date).toLocaleDateString('es-ES')}.
                 Por favor, inicie el proceso de renovación para evitar interrupciones en el servicio.
               </div>`;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: ${urgencyColor}; color: white; padding: 25px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .contract-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .contract-info table { width: 100%; }
        .contract-info td { padding: 8px 0; }
        .contract-info td:first-child { font-weight: bold; color: #666; width: 40%; }
        .countdown { text-align: center; margin: 25px 0; }
        .countdown-number { font-size: 48px; font-weight: bold; color: ${urgencyColor}; }
        .countdown-label { font-size: 14px; color: #666; }
        .cta { text-align: center; margin: 30px 0; }
        .cta a { display: inline-block; background: ${urgencyColor}; color: white; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${isGracePeriod ? '⚠️ PERÍODO DE GRACIA' : '📋 Renovación de Contrato'}</h1>
        </div>

        <div class="content">
            ${statusMessage}

            <div class="countdown">
                <div class="countdown-number">${daysLeft}</div>
                <div class="countdown-label">días restantes</div>
            </div>

            <div class="contract-info">
                <table>
                    <tr>
                        <td>Código de Contrato:</td>
                        <td>${contract.contract_code}</td>
                    </tr>
                    <tr>
                        <td>Empresa:</td>
                        <td>${contract.company_name}</td>
                    </tr>
                    <tr>
                        <td>Fecha de Vencimiento:</td>
                        <td>${new Date(contract.end_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                    <tr>
                        <td>Estado:</td>
                        <td><span style="color: ${urgencyColor}; font-weight: bold;">${contract.status}</span></td>
                    </tr>
                </table>
            </div>

            <div class="cta">
                <a href="${process.env.APP_URL || 'https://sistema.aponnt.com'}/panel-administrativo.html#/contracts/${contract.contract_id}">
                    Gestionar Renovación
                </a>
            </div>

            <p style="text-align: center; color: #666; font-size: 14px;">
                Si tiene alguna consulta, contacte al equipo comercial:<br>
                <a href="mailto:${this.APONNT_COMMERCIAL_EMAIL}">${this.APONNT_COMMERCIAL_EMAIL}</a>
            </p>
        </div>

        <div class="footer">
            <p>Este es un mensaje automático del sistema de gestión de contratos de APONNT.</p>
            <p>© ${new Date().getFullYear()} APONNT - Sistema de Asistencia Biométrico</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Generar texto plano para email de renovación
     */
    generateRenewalEmailText(contract, isGracePeriod, daysLeft) {
        return `
RENOVACIÓN DE CONTRATO - APONNT
================================

${isGracePeriod ? '⚠️ PERÍODO DE GRACIA ACTIVO' : '📋 Renovación Pendiente'}

Días restantes: ${daysLeft}

Información del Contrato:
- Código: ${contract.contract_code}
- Empresa: ${contract.company_name}
- Vencimiento: ${new Date(contract.end_date).toLocaleDateString('es-ES')}
- Estado: ${contract.status}

${isGracePeriod
    ? 'IMPORTANTE: El contrato ha entrado en período de gracia de 60 días. Si no se renueva, el servicio será suspendido automáticamente.'
    : 'Por favor, inicie el proceso de renovación para evitar interrupciones en el servicio.'}

Para gestionar la renovación, visite:
${process.env.APP_URL || 'https://sistema.aponnt.com'}/panel-administrativo.html

Contacto comercial: ${this.APONNT_COMMERCIAL_EMAIL}

---
APONNT - Sistema de Asistencia Biométrico
        `.trim();
    }

    /**
     * Crear notificación interna en inbox
     */
    async createInboxNotification(contract, isGracePeriod, daysLeft) {
        try {
            const urgency = daysLeft <= 7 ? 'critical' : daysLeft <= 15 ? 'high' : 'medium';

            await inboxService.createNotification({
                company_id: contract.company_id,
                type: 'contract_renewal',
                title: isGracePeriod
                    ? `⚠️ Contrato en período de gracia (${daysLeft} días)`
                    : `📋 Renovación pendiente (${daysLeft} días)`,
                message: isGracePeriod
                    ? `El contrato ${contract.contract_code} está en período de gracia. Vence el ${new Date(contract.end_date).toLocaleDateString('es-ES')}.`
                    : `El contrato ${contract.contract_code} vence en ${daysLeft} días. Contacte a su vendedor para renovar.`,
                priority: urgency,
                module: 'contracts',
                action_url: `/contracts/${contract.contract_id}`,
                metadata: {
                    contract_id: contract.contract_id,
                    contract_code: contract.contract_code,
                    days_until_expiry: daysLeft,
                    is_grace_period: isGracePeriod
                }
            });

        } catch (error) {
            console.error('⚠️ [CONTRACT-RENEWAL] Error creando notificación inbox:', error.message);
        }
    }

    /**
     * ========================================================================
     * PASO 2: Aplicar extensiones automáticas
     * ========================================================================
     */
    async applyAutoExtensions() {
        console.log('🔄 [CONTRACT-RENEWAL] Aplicando extensiones automáticas...');

        try {
            // Usar la función PostgreSQL para aplicar extensiones
            const results = await sequelize.query(
                'SELECT * FROM apply_contract_auto_extension()',
                { type: sequelize.QueryTypes.SELECT }
            );

            console.log(`✅ [CONTRACT-RENEWAL] ${results.length} contratos extendidos automáticamente`);

            // Enviar notificación por cada extensión aplicada
            for (const extension of results) {
                try {
                    await this.notifyAutoExtension(extension);
                } catch (error) {
                    console.error(`⚠️ [CONTRACT-RENEWAL] Error notificando extensión:`, error.message);
                }
            }

            return { count: results.length, details: results };

        } catch (error) {
            console.error('❌ [CONTRACT-RENEWAL] Error en applyAutoExtensions:', error);
            throw error;
        }
    }

    /**
     * Notificar sobre extensión automática aplicada
     */
    async notifyAutoExtension(extension) {
        // Obtener emails del contrato
        const [contractData] = await sequelize.query(`
            SELECT
                c.id, c.contract_code, c.vendor_id,
                s.email as vendor_email,
                co.name as company_name,
                COALESCE(co.contact_email, b.email) as company_email
            FROM contracts c
            JOIN companies co ON c.company_id = co.company_id
            LEFT JOIN branches b ON b.company_id = co.company_id AND b.is_main = true
            LEFT JOIN aponnt_staff s ON c.vendor_id = s.staff_id
            WHERE c.id = :contractId
        `, {
            replacements: { contractId: extension.contract_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!contractData) return;

        const subject = `🔄 Extensión automática aplicada - Contrato ${extension.contract_code}`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 25px; }
        .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔄 Extensión Automática Aplicada</h2>
        </div>
        <div class="content">
            <p>Se ha aplicado una <strong>extensión automática de 60 días</strong> al siguiente contrato:</p>

            <div class="info-box">
                <p><strong>Contrato:</strong> ${extension.contract_code}</p>
                <p><strong>Empresa:</strong> ${extension.company_name}</p>
                <p><strong>Fecha original de vencimiento:</strong> ${new Date(extension.old_end_date).toLocaleDateString('es-ES')}</p>
                <p><strong>Nueva fecha de vencimiento:</strong> ${new Date(extension.new_end_date).toLocaleDateString('es-ES')}</p>
                <p><strong>Extensiones aplicadas:</strong> ${extension.extension_count}</p>
            </div>

            <p style="color: #dc2626; font-weight: bold;">
                ⚠️ IMPORTANTE: Este es un período de gracia. El contrato debe ser renovado formalmente
                antes del ${new Date(extension.new_end_date).toLocaleDateString('es-ES')} para evitar la suspensión del servicio.
            </p>

            <p style="text-align: center; margin-top: 25px;">
                <a href="${process.env.APP_URL || 'https://sistema.aponnt.com'}/panel-administrativo.html#/contracts/${extension.contract_id}"
                   style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                    Gestionar Renovación
                </a>
            </p>
        </div>
        <div class="footer">
            <p>APONNT - Sistema de Asistencia Biométrico</p>
        </div>
    </div>
</body>
</html>`;

        // Enviar a todos los destinatarios
        const recipients = [
            contractData.vendor_email,
            this.APONNT_COMMERCIAL_EMAIL,
            contractData.company_email
        ].filter(Boolean);

        // 🔥 NCE: Central Telefónica
        for (const recipient of recipients) {
            try {
                await NCE.send({
                    companyId: contractData.company_id,
                    module: 'contracts',
                    originType: 'contract_extension_notification',
                    originId: `contract-${contractData.contract_id}-extension-${recipient}`,

                    workflowKey: 'contracts.extension_applied',

                    recipientType: 'external',
                    recipientId: recipient,
                    recipientEmail: recipient,

                    title: subject,
                    message: `Extensión de 60 días aplicada al contrato ${contractData.contract_code}`,

                    metadata: {
                        contractId: contractData.contract_id,
                        contractCode: contractData.contract_code,
                        companyId: contractData.company_id,
                        htmlContent: html
                    },

                    priority: 'high',
                    requiresAction: true,
                    channels: ['email'],
                });
            } catch (error) {
                console.error(`⚠️ [NCE] Error enviando a ${recipient}:`, error.message);
            }
        }
    }

    /**
     * ========================================================================
     * PASO 3: Suspender contratos expirados
     * ========================================================================
     */
    async suspendExpiredContracts() {
        console.log('⏹️ [CONTRACT-RENEWAL] Suspendiendo contratos con grace period expirado...');

        try {
            // Usar la función PostgreSQL para suspender contratos
            const results = await sequelize.query(
                'SELECT * FROM suspend_expired_grace_contracts()',
                { type: sequelize.QueryTypes.SELECT }
            );

            console.log(`⚠️ [CONTRACT-RENEWAL] ${results.length} contratos suspendidos`);

            // Notificar por cada suspensión
            for (const suspension of results) {
                try {
                    await this.notifySuspension(suspension);
                } catch (error) {
                    console.error(`⚠️ Error notificando suspensión:`, error.message);
                }
            }

            return { count: results.length, details: results };

        } catch (error) {
            console.error('❌ [CONTRACT-RENEWAL] Error en suspendExpiredContracts:', error);
            throw error;
        }
    }

    /**
     * Notificar sobre suspensión de contrato
     */
    async notifySuspension(suspension) {
        // Obtener datos del contrato
        const [contractData] = await sequelize.query(`
            SELECT
                c.id, c.contract_code, c.vendor_id,
                s.email as vendor_email,
                co.name as company_name,
                co.company_id,
                COALESCE(co.contact_email, b.email) as company_email
            FROM contracts c
            JOIN companies co ON c.company_id = co.company_id
            LEFT JOIN branches b ON b.company_id = co.company_id AND b.is_main = true
            LEFT JOIN aponnt_staff s ON c.vendor_id = s.staff_id
            WHERE c.id = :contractId
        `, {
            replacements: { contractId: suspension.contract_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!contractData) return;

        const subject = `🛑 CONTRATO SUSPENDIDO - ${suspension.contract_code}`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 25px; }
        .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🛑 Contrato Suspendido</h2>
        </div>
        <div class="content">
            <div class="alert-box">
                <p><strong>⚠️ ATENCIÓN:</strong> El siguiente contrato ha sido suspendido por vencimiento del período de gracia:</p>
            </div>

            <p><strong>Contrato:</strong> ${suspension.contract_code}</p>
            <p><strong>Empresa:</strong> ${suspension.company_name}</p>
            <p><strong>Período de gracia vencido:</strong> ${new Date(suspension.grace_period_end).toLocaleDateString('es-ES')}</p>

            <p style="margin-top: 20px;">
                Para reactivar el servicio, es necesario generar un nuevo presupuesto y contrato.
                Contacte al equipo comercial de APONNT.
            </p>

            <p style="text-align: center; margin-top: 25px;">
                <a href="mailto:${this.APONNT_COMMERCIAL_EMAIL}"
                   style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                    Contactar Equipo Comercial
                </a>
            </p>
        </div>
        <div class="footer">
            <p>APONNT - Sistema de Asistencia Biométrico</p>
        </div>
    </div>
</body>
</html>`;

        // Enviar notificaciones
        const recipients = [
            contractData.vendor_email,
            this.APONNT_COMMERCIAL_EMAIL,
            contractData.company_email
        ].filter(Boolean);

        // 🔥 NCE: Central Telefónica
        for (const recipient of recipients) {
            try {
                await NCE.send({
                    companyId: contractData.company_id,
                    module: 'contracts',
                    originType: 'contract_suspension_notification',
                    originId: `contract-${contractData.contract_id}-suspension-${recipient}`,

                    workflowKey: 'contracts.suspension_applied',

                    recipientType: 'external',
                    recipientId: recipient,
                    recipientEmail: recipient,

                    title: subject,
                    message: `Contrato ${contractData.contract_code} suspendido por falta de renovación`,

                    metadata: {
                        contractId: contractData.contract_id,
                        contractCode: contractData.contract_code,
                        companyId: contractData.company_id,
                        htmlContent: html
                    },

                    priority: 'urgent',
                    requiresAction: true,
                    channels: ['email'],
                });
            } catch (error) {
                console.error(`⚠️ [NCE] Error enviando a ${recipient}:`, error.message);
            }
        }

        // Crear notificación crítica en inbox
        if (contractData.company_id) {
            await inboxService.createNotification({
                company_id: contractData.company_id,
                type: 'contract_suspended',
                title: `🛑 Contrato ${suspension.contract_code} suspendido`,
                message: 'El contrato ha sido suspendido por vencimiento del período de gracia. Contacte a APONNT para reactivar el servicio.',
                priority: 'critical',
                module: 'contracts',
                action_url: `/contracts/${suspension.contract_id}`
            });
        }
    }

    /**
     * ========================================================================
     * UTILIDADES
     * ========================================================================
     */

    /**
     * Registrar acción de renovación en logs
     */
    async logRenewalAction(contractId, actionType, details = {}) {
        try {
            await sequelize.query(`
                INSERT INTO contract_renewal_logs (
                    contract_id, action_type, action_date,
                    alert_recipients, notes, created_at
                ) VALUES (
                    :contractId, :actionType, CURRENT_TIMESTAMP,
                    :recipients::jsonb, :notes, CURRENT_TIMESTAMP
                )
            `, {
                replacements: {
                    contractId,
                    actionType,
                    recipients: JSON.stringify(details.recipients || []),
                    notes: JSON.stringify(details)
                },
                type: sequelize.QueryTypes.INSERT
            });
        } catch (error) {
            console.error('⚠️ Error registrando log de renovación:', error.message);
        }
    }

    /**
     * Obtener estadísticas de renovación
     */
    async getRenewalStats() {
        try {
            const [stats] = await sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_contracts,
                    COUNT(*) FILTER (WHERE status = 'RENEWAL_PENDING') as renewal_pending,
                    COUNT(*) FILTER (WHERE status = 'GRACE_PERIOD') as in_grace_period,
                    COUNT(*) FILTER (WHERE status = 'SUSPENDED') as suspended,
                    COUNT(*) FILTER (
                        WHERE status = 'ACTIVE'
                        AND end_date::DATE - INTERVAL '30 days' <= CURRENT_DATE
                    ) as expiring_soon,
                    COUNT(*) FILTER (
                        WHERE status = 'GRACE_PERIOD'
                        AND grace_period_end - INTERVAL '7 days' <= CURRENT_DATE
                    ) as grace_ending_soon
                FROM contracts
            `, { type: sequelize.QueryTypes.SELECT });

            return stats;

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return null;
        }
    }

    /**
     * Obtener contratos por estado
     */
    async getContractsByStatus(status, companyId = null) {
        try {
            let query = `
                SELECT
                    c.*,
                    co.name as company_name,
                    s.email as vendor_email,
                    s.first_name || ' ' || s.last_name as vendor_name
                FROM contracts c
                JOIN companies co ON c.company_id = co.company_id
                LEFT JOIN aponnt_staff s ON c.vendor_id = s.staff_id
                WHERE c.status = :status
            `;

            const replacements = { status };

            if (companyId) {
                query += ' AND c.company_id = :companyId';
                replacements.companyId = companyId;
            }

            query += ' ORDER BY c.end_date ASC';

            const contracts = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return contracts;

        } catch (error) {
            console.error('❌ Error obteniendo contratos:', error);
            return [];
        }
    }

    /**
     * Renovar contrato manualmente
     */
    async manualRenewal(contractId, newEndDate, renewedBy) {
        try {
            // Actualizar contrato
            await sequelize.query(`
                UPDATE contracts
                SET
                    end_date = :newEndDate,
                    status = 'ACTIVE',
                    grace_period_end = NULL,
                    next_renewal_alert_date = :newEndDate::DATE - INTERVAL '30 days',
                    renewal_notification_sent = false,
                    renewal_alert_sent_at = NULL,
                    auto_extension_count = 0,
                    original_end_date = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :contractId
            `, {
                replacements: { contractId, newEndDate },
                type: sequelize.QueryTypes.UPDATE
            });

            // Registrar en log
            await this.logRenewalAction(contractId, 'MANUAL_RENEWAL', {
                new_end_date: newEndDate,
                renewed_by: renewedBy
            });

            console.log(`✅ [CONTRACT-RENEWAL] Contrato ${contractId} renovado hasta ${newEndDate}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Error en renovación manual:', error);
            throw error;
        }
    }
}

module.exports = new ContractRenewalService();
