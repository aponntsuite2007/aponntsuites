/**
 * ============================================================================
 * APONNT BILLING SERVICE
 * ============================================================================
 *
 * Servicio para gestionar la facturación de APONNT a las empresas clientes.
 * Reutiliza la infraestructura de facturación SIAC existente.
 *
 * Funcionalidades:
 * - Generación automática de pre-facturas desde contratos firmados
 * - Gestión de tareas administrativas
 * - Conversión de pre-factura a factura AFIP
 * - Integración con sistema de emails de APONNT
 *
 * Created: 2025-12-17
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// 🔥 NCE: Central Telefónica de Notificaciones (elimina bypass EmailService)
const NCE = require('./NotificationCentralExchange');

class AponntBillingService {

    /**
     * =============================================
     * PRE-FACTURAS
     * =============================================
     */

    /**
     * Genera una pre-factura desde un contrato firmado
     * @param {string} contractId - UUID del contrato
     * @returns {Object} Pre-factura generada
     */
    static async createPreInvoiceFromContract(contractId) {
        try {
            console.log(`📄 [APONNT BILLING] Generando pre-factura para contrato: ${contractId}`);

            // ═══════════════════════════════════════════════════════════════════
            // VALIDACIÓN CRÍTICA: Verificar si está en período TRIAL
            // Doble verificación:
            // 1. Via contract.quote_id → quotes.has_trial
            // 2. Via module_trials activos para la empresa (fallback si no hay quote_id)
            // ═══════════════════════════════════════════════════════════════════

            // Obtener company_id del contrato
            const [contractInfo] = await sequelize.query(
                `SELECT c.id, c.contract_code, c.company_id, c.quote_id, comp.name AS company_name
                 FROM contracts c
                 JOIN companies comp ON c.company_id = comp.company_id
                 WHERE c.id = $1`,
                { bind: [contractId], type: QueryTypes.SELECT }
            );

            if (!contractInfo) {
                throw new Error('Contrato no encontrado');
            }

            console.log(`📋 [APONNT BILLING] Contrato ${contractInfo.contract_code} - Empresa: ${contractInfo.company_name}`);

            // VALIDACIÓN 1: Via quote (si existe quote_id)
            if (contractInfo.quote_id) {
                const [trialCheck] = await sequelize.query(
                    `SELECT q.id, q.quote_number, q.has_trial, q.trial_end_date, q.trial_bonification_percentage,
                            CASE WHEN q.has_trial = true AND q.trial_end_date > NOW() THEN true ELSE false END AS is_in_trial
                     FROM quotes q WHERE q.id = $1`,
                    { bind: [contractInfo.quote_id], type: QueryTypes.SELECT }
                );

                if (trialCheck && trialCheck.is_in_trial === true) {
                    const daysRemaining = Math.ceil((new Date(trialCheck.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                    console.log(`🚫 [APONNT BILLING] Quote ${trialCheck.quote_number} está en período TRIAL`);
                    throw new Error(
                        `No se puede facturar: La empresa está en período de prueba (trial). ` +
                        `El trial termina el ${new Date(trialCheck.trial_end_date).toLocaleDateString('es-AR')} ` +
                        `(faltan ${daysRemaining} días). Bonificación: ${trialCheck.trial_bonification_percentage}%.`
                    );
                }
            }

            // VALIDACIÓN 2: Via module_trials activos (fallback cuando no hay quote_id)
            const [activeTrials] = await sequelize.query(
                `SELECT mt.id, mt.module_name, mt.end_date, mt.status,
                        EXTRACT(DAY FROM mt.end_date - NOW())::INTEGER AS days_remaining
                 FROM module_trials mt
                 WHERE mt.company_id = $1
                   AND mt.status = 'active'
                   AND mt.end_date > NOW()
                 ORDER BY mt.end_date ASC
                 LIMIT 5`,
                { bind: [contractInfo.company_id], type: QueryTypes.SELECT }
            );

            if (activeTrials && activeTrials.length > 0) {
                const trial = activeTrials[0];
                const moduleNames = activeTrials.map(t => t.module_name).join(', ');
                console.log(`🚫 [APONNT BILLING] Empresa tiene ${activeTrials.length} módulos en TRIAL activo`);

                throw new Error(
                    `No se puede facturar: La empresa tiene ${activeTrials.length} módulo(s) en período de prueba: ${moduleNames}. ` +
                    `El trial más próximo a vencer es el ${new Date(trial.end_date).toLocaleDateString('es-AR')} ` +
                    `(faltan ${trial.days_remaining} días). Espere a que termine el trial o cancélelo primero.`
                );
            }

            // VALIDACIÓN 3: Verificar status del quote si existe (sin trial pero status 'in_trial')
            const [quoteInTrial] = await sequelize.query(
                `SELECT q.id, q.quote_number, q.status, q.trial_end_date
                 FROM quotes q
                 WHERE q.company_id = $1 AND q.status = 'in_trial'
                 ORDER BY q.created_at DESC LIMIT 1`,
                { bind: [contractInfo.company_id], type: QueryTypes.SELECT }
            );

            if (quoteInTrial) {
                console.log(`🚫 [APONNT BILLING] Empresa tiene quote ${quoteInTrial.quote_number} en status 'in_trial'`);
                throw new Error(
                    `No se puede facturar: Existe un presupuesto en período de prueba (${quoteInTrial.quote_number}). ` +
                    `Espere a que termine el trial o procéselo manualmente.`
                );
            }

            // Si pasó todas las validaciones de trial, continuar con la facturación
            console.log(`✅ [APONNT BILLING] Validación trial OK - Procediendo a generar pre-factura`);

            // Usar la función de PostgreSQL
            const [result] = await sequelize.query(
                'SELECT create_pre_invoice_from_contract($1) AS pre_invoice_id',
                {
                    bind: [contractId],
                    type: QueryTypes.SELECT
                }
            );

            if (!result || !result.pre_invoice_id) {
                throw new Error('No se pudo crear la pre-factura');
            }

            const preInvoiceId = result.pre_invoice_id;

            // Obtener la pre-factura completa
            const preInvoice = await this.getPreInvoiceById(preInvoiceId);

            console.log(`✅ [APONNT BILLING] Pre-factura ${preInvoice.pre_invoice_code} generada`);

            // Notificar al equipo administrativo
            await this._notifyPreInvoiceCreated(preInvoice);

            return preInvoice;

        } catch (error) {
            console.error('❌ [APONNT BILLING] Error creando pre-factura:', error);
            throw error;
        }
    }

    /**
     * Obtiene una pre-factura por ID
     */
    static async getPreInvoiceById(id) {
        const [preInvoice] = await sequelize.query(
            `SELECT
                pi.*,
                c.name AS company_name,
                c.slug AS company_slug,
                con.contract_code
            FROM aponnt_pre_invoices pi
            JOIN companies c ON pi.company_id = c.company_id
            LEFT JOIN contracts con ON pi.contract_id = con.id
            WHERE pi.id = $1`,
            {
                bind: [id],
                type: QueryTypes.SELECT
            }
        );
        return preInvoice;
    }

    /**
     * Lista pre-facturas con filtros
     */
    static async listPreInvoices(filters = {}) {
        const { status, companyId, limit = 50, offset = 0 } = filters;

        let whereClause = '1=1';
        const params = [];
        let paramIndex = 1;

        if (status) {
            whereClause += ` AND pi.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (companyId) {
            whereClause += ` AND pi.company_id = $${paramIndex}`;
            params.push(companyId);
            paramIndex++;
        }

        params.push(limit, offset);

        const preInvoices = await sequelize.query(
            `SELECT
                pi.id,
                pi.pre_invoice_code,
                pi.company_id,
                c.name AS company_name,
                pi.cliente_razon_social,
                pi.cliente_cuit,
                pi.periodo_desde,
                pi.periodo_hasta,
                pi.subtotal,
                pi.iva_21,
                pi.total,
                pi.status,
                pi.created_at,
                pi.contract_id,
                con.contract_code
            FROM aponnt_pre_invoices pi
            JOIN companies c ON pi.company_id = c.company_id
            LEFT JOIN contracts con ON pi.contract_id = con.id
            WHERE ${whereClause}
            ORDER BY
                CASE pi.status
                    WHEN 'PENDING_REVIEW' THEN 1
                    WHEN 'APPROVED' THEN 2
                    ELSE 3
                END,
                pi.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            {
                bind: params,
                type: QueryTypes.SELECT
            }
        );

        // Count total
        const [countResult] = await sequelize.query(
            `SELECT COUNT(*) as total FROM aponnt_pre_invoices pi WHERE ${whereClause}`,
            {
                bind: params.slice(0, -2),
                type: QueryTypes.SELECT
            }
        );

        return {
            preInvoices,
            total: parseInt(countResult.total),
            limit,
            offset
        };
    }

    /**
     * Aprueba una pre-factura (lista para facturar)
     */
    static async approvePreInvoice(preInvoiceId, approvedBy) {
        await sequelize.query(
            `UPDATE aponnt_pre_invoices
             SET status = 'APPROVED',
                 admin_notes = COALESCE(admin_notes, '') || '\nAprobada por staff ID ' || $2 || ' el ' || NOW()::TEXT,
                 updated_at = NOW()
             WHERE id = $1 AND status = 'PENDING_REVIEW'`,
            {
                bind: [preInvoiceId, approvedBy],
                type: QueryTypes.UPDATE
            }
        );

        // Actualizar tarea administrativa (completed_by es TEXT para soportar UUID)
        await sequelize.query(
            `UPDATE aponnt_admin_tasks
             SET status = 'COMPLETED',
                 completed_at = NOW(),
                 completion_notes = 'Pre-factura aprobada por staff ' || $2::TEXT
             WHERE entity_type = 'pre_invoice' AND entity_id = $1 AND status = 'PENDING'`,
            {
                bind: [preInvoiceId, approvedBy],
                type: QueryTypes.UPDATE
            }
        );

        return await this.getPreInvoiceById(preInvoiceId);
    }

    /**
     * Rechaza una pre-factura
     */
    static async rejectPreInvoice(preInvoiceId, reason, rejectedBy) {
        // rejected_by es INTEGER pero staff_id es UUID, guardamos en rejection_reason
        await sequelize.query(
            `UPDATE aponnt_pre_invoices
             SET status = 'REJECTED',
                 rejection_reason = $2 || ' (por staff: ' || $3::TEXT || ')',
                 rejected_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            {
                bind: [preInvoiceId, reason, rejectedBy],
                type: QueryTypes.UPDATE
            }
        );

        // Actualizar tarea administrativa
        await sequelize.query(
            `UPDATE aponnt_admin_tasks
             SET status = 'COMPLETED',
                 completed_at = NOW(),
                 completion_notes = 'Pre-factura rechazada por staff ' || $3::TEXT || ': ' || $2
             WHERE entity_type = 'pre_invoice' AND entity_id = $1`,
            {
                bind: [preInvoiceId, reason, rejectedBy],
                type: QueryTypes.UPDATE
            }
        );

        return await this.getPreInvoiceById(preInvoiceId);
    }

    /**
     * Convierte pre-factura a factura AFIP
     * (Usa el módulo SIAC de facturación existente)
     */
    static async invoicePreInvoice(preInvoiceId, invoicedBy) {
        const preInvoice = await this.getPreInvoiceById(preInvoiceId);

        if (!preInvoice) {
            throw new Error('Pre-factura no encontrada');
        }

        if (preInvoice.status !== 'APPROVED') {
            throw new Error('La pre-factura debe estar aprobada para facturar');
        }

        // Obtener configuración fiscal de APONNT
        const aponntMasterId = await this.getAponntMasterId();

        // TODO: Integrar con AfipBillingService para generar factura
        // Por ahora, marcamos como facturada manualmente

        await sequelize.query(
            `UPDATE aponnt_pre_invoices
             SET status = 'INVOICED',
                 invoiced_at = NOW(),
                 invoiced_by = $2,
                 updated_at = NOW()
             WHERE id = $1`,
            {
                bind: [preInvoiceId, invoicedBy],
                type: QueryTypes.UPDATE
            }
        );

        console.log(`✅ [APONNT BILLING] Pre-factura ${preInvoice.pre_invoice_code} marcada como facturada`);

        return await this.getPreInvoiceById(preInvoiceId);
    }

    /**
     * =============================================
     * TAREAS ADMINISTRATIVAS
     * =============================================
     */

    /**
     * Lista tareas administrativas pendientes
     */
    static async listAdminTasks(filters = {}) {
        const { taskType, priority, status = 'PENDING', assignedRole, limit = 50, offset = 0 } = filters;

        let whereClause = 'status IN ($1, $2)';
        const params = ['PENDING', 'IN_PROGRESS'];
        let paramIndex = 3;

        if (taskType) {
            whereClause += ` AND task_type = $${paramIndex}`;
            params.push(taskType);
            paramIndex++;
        }

        if (priority) {
            whereClause += ` AND priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }

        if (assignedRole) {
            whereClause += ` AND assigned_role = $${paramIndex}`;
            params.push(assignedRole);
            paramIndex++;
        }

        params.push(limit, offset);

        const tasks = await sequelize.query(
            `SELECT
                t.*,
                c.name AS company_name,
                CASE
                    WHEN t.due_date < NOW() THEN 'OVERDUE'
                    WHEN t.due_date < NOW() + INTERVAL '1 day' THEN 'DUE_TODAY'
                    WHEN t.due_date < NOW() + INTERVAL '3 days' THEN 'DUE_SOON'
                    ELSE 'ON_TIME'
                END AS urgency
            FROM aponnt_admin_tasks t
            LEFT JOIN companies c ON t.company_id = c.company_id
            WHERE ${whereClause}
            ORDER BY
                CASE t.priority
                    WHEN 'URGENT' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 4
                END,
                t.due_date ASC NULLS LAST
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            {
                bind: params,
                type: QueryTypes.SELECT
            }
        );

        // Counts by type
        const counts = await sequelize.query(
            `SELECT
                task_type,
                COUNT(*) as count
            FROM aponnt_admin_tasks
            WHERE status IN ('PENDING', 'IN_PROGRESS')
            GROUP BY task_type`,
            { type: QueryTypes.SELECT }
        );

        return {
            tasks,
            counts: counts.reduce((acc, c) => ({ ...acc, [c.task_type]: parseInt(c.count) }), {}),
            total: tasks.length,
            limit,
            offset
        };
    }

    /**
     * Obtiene estadísticas del dashboard administrativo
     */
    static async getAdminDashboardStats() {
        const stats = await sequelize.query(
            `SELECT
                -- Pre-facturas
                (SELECT COUNT(*) FROM aponnt_pre_invoices WHERE status = 'PENDING_REVIEW') AS pre_invoices_pending,
                (SELECT COUNT(*) FROM aponnt_pre_invoices WHERE status = 'APPROVED') AS pre_invoices_approved,
                (SELECT COALESCE(SUM(total), 0) FROM aponnt_pre_invoices WHERE status IN ('PENDING_REVIEW', 'APPROVED')) AS pre_invoices_total_amount,

                -- Tareas
                (SELECT COUNT(*) FROM aponnt_admin_tasks WHERE status = 'PENDING') AS tasks_pending,
                (SELECT COUNT(*) FROM aponnt_admin_tasks WHERE status = 'PENDING' AND priority = 'URGENT') AS tasks_urgent,
                (SELECT COUNT(*) FROM aponnt_admin_tasks WHERE status = 'PENDING' AND due_date < NOW()) AS tasks_overdue,

                -- Contratos
                (SELECT COUNT(*) FROM contracts WHERE status = 'ACTIVE' AND valid_until < NOW() + INTERVAL '30 days') AS contracts_expiring_soon,

                -- Empresas activas
                (SELECT COUNT(*) FROM companies WHERE is_active = true AND is_aponnt_master = false) AS active_companies`,
            { type: QueryTypes.SELECT }
        );

        return stats[0];
    }

    /**
     * =============================================
     * CONFIGURACIÓN DE EMAILS
     * =============================================
     */

    /**
     * Obtiene configuración de email por tipo
     */
    static async getEmailConfig(configType) {
        const [config] = await sequelize.query(
            `SELECT * FROM aponnt_email_config WHERE config_type = $1 AND is_active = true`,
            {
                bind: [configType],
                type: QueryTypes.SELECT
            }
        );
        return config;
    }

    /**
     * Lista todas las configuraciones de email
     */
    static async listEmailConfigs() {
        return await sequelize.query(
            `SELECT config_type, from_email, from_name, is_active, updated_at
             FROM aponnt_email_config
             ORDER BY config_type`,
            { type: QueryTypes.SELECT }
        );
    }

    /**
     * Actualiza configuración de email
     */
    static async updateEmailConfig(configType, data) {
        const { fromEmail, fromName, replyTo, smtpHost, smtpPort, smtpUser, smtpPassword, isActive } = data;

        await sequelize.query(
            `UPDATE aponnt_email_config
             SET from_email = COALESCE($2, from_email),
                 from_name = COALESCE($3, from_name),
                 reply_to = COALESCE($4, reply_to),
                 smtp_host = COALESCE($5, smtp_host),
                 smtp_port = COALESCE($6, smtp_port),
                 smtp_user = COALESCE($7, smtp_user),
                 smtp_password = COALESCE($8, smtp_password),
                 is_active = COALESCE($9, is_active),
                 updated_at = NOW()
             WHERE config_type = $1`,
            {
                bind: [configType, fromEmail, fromName, replyTo, smtpHost, smtpPort, smtpUser, smtpPassword, isActive],
                type: QueryTypes.UPDATE
            }
        );

        return await this.getEmailConfig(configType);
    }

    /**
     * =============================================
     * HELPERS
     * =============================================
     */

    /**
     * Obtiene el ID de APONNT master
     */
    static async getAponntMasterId() {
        const [result] = await sequelize.query(
            'SELECT get_aponnt_master_id() AS id',
            { type: QueryTypes.SELECT }
        );
        return result.id;
    }

    /**
     * Notifica la creación de una pre-factura al equipo administrativo
     */
    static async _notifyPreInvoiceCreated(preInvoice) {
        try {
            // Obtener email comercial de APONNT
            const emailConfig = await this.getEmailConfig('commercial');

            if (!emailConfig) {
                console.warn('⚠️ [APONNT BILLING] No hay configuración de email comercial');
                return;
            }

            // Crear notificación en inbox del staff (si existe el sistema)
            try {
                const inboxService = require('./inboxService');
                await inboxService.crearNotificacion({
                    staff_id: null, // Se asignará al rol de finanzas
                    tipo: 'pre_invoice',
                    titulo: `📄 Nueva Pre-factura: ${preInvoice.pre_invoice_code}`,
                    mensaje: `Se ha generado una pre-factura para ${preInvoice.company_name} por $${preInvoice.total}. Requiere revisión.`,
                    prioridad: 'alta',
                    metadata: {
                        pre_invoice_id: preInvoice.id,
                        company_id: preInvoice.company_id,
                        total: preInvoice.total
                    },
                    actionable: true,
                    action_url: `/admin/pre-invoices/${preInvoice.id}`
                });
            } catch (e) {
                console.warn('⚠️ [APONNT BILLING] No se pudo crear notificación en inbox:', e.message);
            }

            // 🔥 Enviar email → NCE
            try {
                await NCE.send({
                    companyId: preInvoice.company_id,
                    module: 'billing',
                    originType: 'pre_invoice_review',
                    originId: `pre-invoice-${preInvoice.id}`,

                    workflowKey: 'billing.pre_invoice_pending',

                    recipientType: 'group',
                    recipientId: 'aponnt_billing_team',
                    recipientEmail: emailConfig.from_email,

                    title: `📄 Pre-factura ${preInvoice.pre_invoice_code} pendiente de revisión`,
                    message: `Nueva pre-factura generada para ${preInvoice.company_name || 'empresa'} por $${preInvoice.total}`,

                    metadata: {
                        preInvoiceId: preInvoice.id,
                        preInvoiceCode: preInvoice.pre_invoice_code,
                        companyId: preInvoice.company_id,
                        total: preInvoice.total,
                        htmlContent: this._generatePreInvoiceEmailHtml(preInvoice)
                    },

                    priority: 'normal',
                    requiresAction: true,
                    actionType: 'approval',

                    channels: ['email'],
                });
            } catch (e) {
                console.warn('⚠️ [NCE] No se pudo enviar email:', e.message);
            }

            console.log(`📧 [APONNT BILLING] Notificación enviada para pre-factura ${preInvoice.pre_invoice_code}`);

        } catch (error) {
            console.error('❌ [APONNT BILLING] Error enviando notificación:', error);
        }
    }

    /**
     * Genera HTML del email de pre-factura
     */
    static _generatePreInvoiceEmailHtml(preInvoice) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1e3a5f, #2c5f8d); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                .footer { background: #333; color: #aaa; padding: 15px; font-size: 12px; border-radius: 0 0 8px 8px; }
                .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #2c5f8d; margin: 15px 0; }
                .amount { font-size: 24px; font-weight: bold; color: #2c5f8d; }
                .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">📄 Nueva Pre-factura Generada</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Requiere revisión administrativa</p>
                </div>
                <div class="content">
                    <div class="highlight">
                        <div>Código: <strong>${preInvoice.pre_invoice_code}</strong></div>
                        <div>Empresa: <strong>${preInvoice.company_name}</strong></div>
                        <div>CUIT: ${preInvoice.cliente_cuit}</div>
                    </div>

                    <h3>Detalle:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td>Período:</td>
                            <td><strong>${preInvoice.periodo_desde} al ${preInvoice.periodo_hasta}</strong></td>
                        </tr>
                        <tr>
                            <td>Subtotal:</td>
                            <td>$${parseFloat(preInvoice.subtotal).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>IVA 21%:</td>
                            <td>$${parseFloat(preInvoice.iva_21).toFixed(2)}</td>
                        </tr>
                        <tr style="font-size: 18px; font-weight: bold;">
                            <td>TOTAL:</td>
                            <td class="amount">$${parseFloat(preInvoice.total).toFixed(2)}</td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${require('../utils/urlHelper').getPanelAdminUrl()}#admin-tasks" class="btn">
                            Revisar Pre-factura
                        </a>
                    </div>
                </div>
                <div class="footer">
                    <p>Este es un mensaje automático del sistema APONNT Suite.</p>
                    <p>Generado: ${new Date().toLocaleString('es-AR')}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * =============================================
     * TRIAL STATUS
     * =============================================
     */

    /**
     * Obtiene el estado del período trial de un contrato
     * Útil para que el frontend muestre información antes de intentar facturar
     * @param {string|number} contractId - ID del contrato
     * @returns {Object} Información del trial
     */
    static async getContractTrialStatus(contractId) {
        const [result] = await sequelize.query(
            `SELECT
                c.id AS contract_id,
                c.contract_code,
                c.status AS contract_status,
                c.company_id,
                comp.name AS company_name,
                q.id AS quote_id,
                q.quote_number,
                q.has_trial,
                q.trial_start_date,
                q.trial_end_date,
                q.trial_bonification_percentage,
                q.trial_modules,
                CASE
                    WHEN q.has_trial = true AND q.trial_end_date > NOW() THEN 'IN_TRIAL'
                    WHEN q.has_trial = true AND q.trial_end_date <= NOW() THEN 'TRIAL_ENDED'
                    ELSE 'NO_TRIAL'
                END AS trial_status,
                CASE
                    WHEN q.trial_end_date IS NOT NULL AND q.trial_end_date > NOW() THEN
                        EXTRACT(DAY FROM q.trial_end_date - NOW())::INTEGER
                    ELSE 0
                END AS trial_days_remaining,
                CASE
                    WHEN q.has_trial = true AND q.trial_end_date > NOW() THEN false
                    ELSE true
                END AS can_invoice
            FROM contracts c
            LEFT JOIN quotes q ON c.quote_id = q.id
            LEFT JOIN companies comp ON c.company_id = comp.company_id
            WHERE c.id = $1`,
            {
                bind: [contractId],
                type: QueryTypes.SELECT
            }
        );

        if (!result) {
            throw new Error('Contrato no encontrado');
        }

        return {
            contractId: result.contract_id,
            contractCode: result.contract_code,
            contractStatus: result.contract_status,
            companyId: result.company_id,
            companyName: result.company_name,
            quoteId: result.quote_id,
            quoteNumber: result.quote_number,
            trial: {
                hasTrial: result.has_trial || false,
                status: result.trial_status,
                startDate: result.trial_start_date,
                endDate: result.trial_end_date,
                daysRemaining: result.trial_days_remaining || 0,
                bonificationPercentage: result.trial_bonification_percentage || 0,
                modules: result.trial_modules || []
            },
            canInvoice: result.can_invoice,
            message: result.trial_status === 'IN_TRIAL'
                ? `La empresa está en período de prueba. Faltan ${result.trial_days_remaining} días para poder facturar.`
                : result.trial_status === 'TRIAL_ENDED'
                    ? 'El período de prueba ha terminado. Se puede proceder a facturar.'
                    : 'No hay período de prueba activo.'
        };
    }

    /**
     * Obtiene el estado del período trial de una empresa por su company_id
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Información del trial
     */
    static async getCompanyTrialStatus(companyId) {
        // Buscar el contrato activo más reciente de la empresa
        const [contract] = await sequelize.query(
            `SELECT c.id
             FROM contracts c
             WHERE c.company_id = $1
               AND c.status IN ('active', 'signed')
             ORDER BY c.created_at DESC
             LIMIT 1`,
            {
                bind: [companyId],
                type: QueryTypes.SELECT
            }
        );

        if (!contract) {
            return {
                companyId,
                hasActiveContract: false,
                canInvoice: false,
                message: 'No hay contrato activo para esta empresa'
            };
        }

        const trialStatus = await this.getContractTrialStatus(contract.id);
        return {
            ...trialStatus,
            hasActiveContract: true
        };
    }
}

module.exports = AponntBillingService;
