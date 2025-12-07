/**
 * ============================================================================
 * SUPPORT TICKET ESCALATION SERVICE v1.0
 * ============================================================================
 * Servicio de escalamiento para tickets de soporte (usuarios → Aponnt)
 *
 * Cadena de escalamiento:
 * 1. Soporte asignado a empresa (vendedor o soporte específico)
 * 2. Coordinador de Soporte (aponntcoordinacionsoporte@gmail.com)
 * 3. Dirección General (aponntsuite@gmail.com)
 *
 * Funcionalidades:
 * - Escalamiento automático por SLA
 * - Escalamiento voluntario por el soporte
 * - Notificación a cada nivel
 * - Historial de escalamientos
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const cron = require('node-cron');
const emailService = require('./EmailService');

class SupportTicketEscalationService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
        this.config = {
            // Ejecutar cada 15 minutos
            schedule: '*/15 * * * *',
            // Emails de escalamiento
            coordinatorEmail: 'aponntcoordinacionsoporte@gmail.com',
            institutionalEmail: 'aponntsuite@gmail.com'
        };
        console.log('[SUPPORT-ESCALATION] Servicio inicializado');
    }

    /**
     * Iniciar el servicio de escalamiento automático
     */
    start() {
        if (this.isRunning) {
            console.log('[SUPPORT-ESCALATION] Servicio ya está corriendo');
            return;
        }

        console.log('[SUPPORT-ESCALATION] Iniciando servicio de escalamiento automático...');

        // Cron job: cada 15 minutos
        this.cronJob = cron.schedule(this.config.schedule, async () => {
            await this.runEscalationCycle();
        }, {
            timezone: 'America/Argentina/Buenos_Aires'
        });

        this.isRunning = true;
        console.log('[SUPPORT-ESCALATION] Servicio iniciado');
        console.log(`   Frecuencia: ${this.config.schedule}`);

        // Ejecutar una vez al inicio (después de 30 segundos)
        setTimeout(() => this.runEscalationCycle(), 30000);
    }

    /**
     * Detener el servicio
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        this.isRunning = false;
        console.log('[SUPPORT-ESCALATION] Servicio detenido');
    }

    /**
     * Ejecutar ciclo de escalamiento automático
     */
    async runEscalationCycle() {
        console.log('[SUPPORT-ESCALATION] Ejecutando ciclo de escalamiento...');

        try {
            // 1. Detectar tickets que deben ser escalados
            const ticketsToEscalate = await this.detectTicketsToEscalate();
            console.log(`   Tickets pendientes de escalamiento: ${ticketsToEscalate.length}`);

            // 2. Escalar cada ticket
            for (const ticket of ticketsToEscalate) {
                await this.autoEscalateTicket(ticket);
            }

            // 3. Enviar warnings de SLA próximo a vencer
            const warnings = await this.sendSLAWarnings();
            console.log(`   Warnings de SLA enviados: ${warnings}`);

            console.log('[SUPPORT-ESCALATION] Ciclo completado');

            return {
                escalated: ticketsToEscalate.length,
                warnings
            };

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error en ciclo:', error);
            throw error;
        }
    }

    /**
     * Detectar tickets que deben ser escalados por SLA
     */
    async detectTicketsToEscalate() {
        try {
            const tickets = await sequelize.query(`
                SELECT
                    st.ticket_id,
                    st.ticket_number,
                    st.company_id,
                    st.subject,
                    st.description,
                    st.priority,
                    st.status,
                    st.escalation_level,
                    st.assigned_staff_id,
                    st.created_at,
                    c.name as company_name,
                    sla.escalation_time_hours
                FROM support_tickets st
                JOIN companies c ON c.company_id = st.company_id
                LEFT JOIN support_sla_config sla ON sla.priority = st.priority
                WHERE st.status IN ('open', 'in_progress')
                  AND COALESCE(st.escalation_level, 1) < 3
                  AND (
                      -- No tiene staff asignado y ya pasó tiempo de SLA
                      (st.assigned_staff_id IS NULL AND
                       st.created_at + (COALESCE(sla.escalation_time_hours, 24) || ' hours')::INTERVAL < NOW())
                      OR
                      -- Tiene staff asignado pero no responde dentro del SLA
                      (st.assigned_staff_id IS NOT NULL AND
                       st.escalated_at IS NULL AND
                       st.created_at + (COALESCE(sla.escalation_time_hours, 24) || ' hours')::INTERVAL < NOW())
                      OR
                      -- Ya fue escalado pero el siguiente nivel tampoco responde
                      (st.escalated_at IS NOT NULL AND
                       st.escalated_at + (COALESCE(sla.escalation_time_hours, 24) || ' hours')::INTERVAL < NOW())
                  )
                ORDER BY
                    CASE st.priority
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        ELSE 4
                    END,
                    st.created_at ASC
            `, { type: QueryTypes.SELECT });

            return tickets;

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error detectando tickets:', error);
            return [];
        }
    }

    /**
     * Escalar ticket automáticamente al siguiente nivel
     */
    async autoEscalateTicket(ticket) {
        try {
            const currentLevel = ticket.escalation_level || 1;
            const nextLevel = currentLevel + 1;

            console.log(`[SUPPORT-ESCALATION] Escalando ticket ${ticket.ticket_number} de nivel ${currentLevel} a ${nextLevel}`);

            // Obtener el staff del siguiente nivel
            const nextStaff = await this.getNextEscalationStaff(currentLevel);

            if (!nextStaff) {
                console.log(`[SUPPORT-ESCALATION] No hay nivel superior para escalar (nivel actual: ${currentLevel})`);
                return;
            }

            // Registrar escalamiento en historial
            await this.recordEscalation({
                ticketId: ticket.ticket_id,
                fromLevel: currentLevel,
                toLevel: nextLevel,
                fromStaffId: ticket.assigned_staff_id,
                toStaffId: nextStaff.staff_id,
                escalationType: 'automatic',
                reason: `Sin respuesta dentro del plazo de SLA (${ticket.escalation_time_hours || 24}h)`
            });

            // Actualizar ticket
            await sequelize.query(`
                UPDATE support_tickets
                SET
                    escalation_level = :nextLevel,
                    assigned_staff_id = :toStaffId,
                    escalated_at = NOW(),
                    escalation_reason = :reason,
                    updated_at = NOW()
                WHERE ticket_id = :ticketId
            `, {
                replacements: {
                    nextLevel,
                    toStaffId: nextStaff.staff_id,
                    reason: `Escalado automáticamente por SLA - Sin respuesta en ${ticket.escalation_time_hours || 24}h`,
                    ticketId: ticket.ticket_id
                },
                type: QueryTypes.UPDATE
            });

            // Enviar email al nuevo responsable
            await this.sendEscalationEmail({
                ticket,
                nextStaff,
                escalationType: 'automatic',
                reason: `El ticket no fue atendido dentro del plazo de SLA`
            });

            console.log(`[SUPPORT-ESCALATION] Ticket ${ticket.ticket_number} escalado a ${nextStaff.email}`);

            return { success: true, escalatedTo: nextStaff };

        } catch (error) {
            console.error(`[SUPPORT-ESCALATION] Error escalando ticket ${ticket.ticket_number}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Escalamiento voluntario por el soporte
     * @param {UUID} ticketId - ID del ticket
     * @param {UUID} staffId - ID del staff que escala
     * @param {string} reason - Razón del escalamiento
     */
    async voluntaryEscalate(ticketId, staffId, reason) {
        try {
            // Obtener ticket actual
            const [ticket] = await sequelize.query(`
                SELECT
                    st.*,
                    c.name as company_name
                FROM support_tickets st
                JOIN companies c ON c.company_id = st.company_id
                WHERE st.ticket_id = :ticketId
            `, {
                replacements: { ticketId },
                type: QueryTypes.SELECT
            });

            if (!ticket) {
                throw new Error('Ticket no encontrado');
            }

            if (ticket.status === 'closed' || ticket.status === 'resolved') {
                throw new Error('No se puede escalar un ticket cerrado');
            }

            const currentLevel = ticket.escalation_level || 1;
            const nextLevel = currentLevel + 1;

            if (nextLevel > 3) {
                throw new Error('El ticket ya está en el nivel máximo de escalamiento');
            }

            // Verificar que el staff que escala es el asignado
            if (ticket.assigned_staff_id && ticket.assigned_staff_id !== staffId) {
                throw new Error('Solo el staff asignado puede escalar este ticket');
            }

            // Obtener el staff del siguiente nivel
            const nextStaff = await this.getNextEscalationStaff(currentLevel);

            if (!nextStaff) {
                throw new Error('No hay nivel superior para escalar');
            }

            // Registrar escalamiento en historial
            await this.recordEscalation({
                ticketId: ticket.ticket_id,
                fromLevel: currentLevel,
                toLevel: nextLevel,
                fromStaffId: staffId,
                toStaffId: nextStaff.staff_id,
                escalationType: 'voluntary',
                reason,
                escalatedBy: staffId
            });

            // Actualizar ticket
            await sequelize.query(`
                UPDATE support_tickets
                SET
                    escalation_level = :nextLevel,
                    assigned_staff_id = :toStaffId,
                    escalated_at = NOW(),
                    escalation_reason = :reason,
                    updated_at = NOW()
                WHERE ticket_id = :ticketId
            `, {
                replacements: {
                    nextLevel,
                    toStaffId: nextStaff.staff_id,
                    reason: `Escalado voluntariamente: ${reason}`,
                    ticketId: ticket.ticket_id
                },
                type: QueryTypes.UPDATE
            });

            // Enviar email al nuevo responsable
            await this.sendEscalationEmail({
                ticket,
                nextStaff,
                escalationType: 'voluntary',
                reason,
                escalatedByStaffId: staffId
            });

            console.log(`[SUPPORT-ESCALATION] Ticket ${ticket.ticket_number} escalado voluntariamente a ${nextStaff.email}`);

            return {
                success: true,
                message: `Ticket escalado a ${nextStaff.name}`,
                escalatedTo: {
                    name: nextStaff.name,
                    email: nextStaff.email,
                    level: nextLevel
                }
            };

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error en escalamiento voluntario:', error);
            throw error;
        }
    }

    /**
     * Obtener staff del siguiente nivel de escalamiento
     * Nivel 1 = Soporte asignado → Nivel 2 = Coordinador → Nivel 3 = Dirección
     */
    async getNextEscalationStaff(currentLevel) {
        try {
            let roleCode;
            switch (currentLevel) {
                case 1:
                    roleCode = 'CSUP'; // Coordinador de Soporte
                    break;
                case 2:
                    roleCode = 'DIR'; // Dirección
                    break;
                default:
                    return null; // Ya en nivel máximo
            }

            const [staff] = await sequelize.query(`
                SELECT
                    s.staff_id,
                    s.first_name || ' ' || s.last_name as name,
                    s.email,
                    r.role_code,
                    r.role_name
                FROM aponnt_staff s
                JOIN aponnt_staff_roles r ON r.role_id = s.role_id
                WHERE r.role_code = :roleCode
                  AND s.is_active = true
                LIMIT 1
            `, {
                replacements: { roleCode },
                type: QueryTypes.SELECT
            });

            return staff || null;

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error obteniendo staff de escalamiento:', error);
            return null;
        }
    }

    /**
     * Registrar escalamiento en historial
     */
    async recordEscalation(data) {
        try {
            await sequelize.query(`
                INSERT INTO support_ticket_escalations (
                    ticket_id, from_level, to_level,
                    from_staff_id, to_staff_id,
                    escalation_type, reason, escalated_by
                ) VALUES (
                    :ticketId, :fromLevel, :toLevel,
                    :fromStaffId, :toStaffId,
                    :escalationType, :reason, :escalatedBy
                )
            `, {
                replacements: {
                    ticketId: data.ticketId,
                    fromLevel: data.fromLevel,
                    toLevel: data.toLevel,
                    fromStaffId: data.fromStaffId || null,
                    toStaffId: data.toStaffId,
                    escalationType: data.escalationType,
                    reason: data.reason,
                    escalatedBy: data.escalatedBy || null
                },
                type: QueryTypes.INSERT
            });
        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error registrando escalamiento:', error);
        }
    }

    /**
     * Enviar email de escalamiento
     */
    async sendEscalationEmail(data) {
        const { ticket, nextStaff, escalationType, reason, escalatedByStaffId } = data;

        try {
            // Si hay un staff que escaló, obtener su info
            let escalatedByName = 'Sistema Automático';
            if (escalatedByStaffId) {
                const [escalatedBy] = await sequelize.query(`
                    SELECT first_name || ' ' || last_name as name
                    FROM aponnt_staff WHERE staff_id = :staffId
                `, {
                    replacements: { staffId: escalatedByStaffId },
                    type: QueryTypes.SELECT
                });
                escalatedByName = escalatedBy?.name || 'Soporte';
            }

            const priorityLabels = {
                critical: '🔴 CRÍTICO',
                high: '🟠 ALTA',
                medium: '🟡 MEDIA',
                low: '🟢 BAJA'
            };

            const levelNames = {
                1: 'Soporte de Primera Línea',
                2: 'Coordinación de Soporte',
                3: 'Dirección General'
            };

            const currentLevel = ticket.escalation_level || 1;
            const nextLevel = currentLevel + 1;

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">🚨 Escalamiento de Ticket</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Requiere atención inmediata</p>
                    </div>

                    <div style="padding: 20px;">
                        <div style="background: #fef2f2; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                            <p style="margin: 0; color: #991b1b; font-weight: bold;">
                                Tipo: ${escalationType === 'automatic' ? 'Escalamiento Automático por SLA' : 'Escalamiento Voluntario'}
                            </p>
                            <p style="margin: 10px 0 0 0; color: #991b1b;">
                                ${reason}
                            </p>
                        </div>

                        <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                            <p style="margin: 0; color: #64748b; font-size: 14px;">Ticket</p>
                            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #0f172a;">${ticket.ticket_number}</p>
                        </div>

                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 140px;">Empresa:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${ticket.company_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Prioridad:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${priorityLabels[ticket.priority] || ticket.priority}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Nivel anterior:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${levelNames[currentLevel] || `Nivel ${currentLevel}`}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Nuevo nivel:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;">${levelNames[nextLevel] || `Nivel ${nextLevel}`}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Escalado por:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${escalatedByName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Creado:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${new Date(ticket.created_at).toLocaleString('es-AR')}</td>
                            </tr>
                        </table>

                        <div style="margin-top: 20px;">
                            <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">Asunto:</p>
                            <p style="font-weight: bold; color: #0f172a; font-size: 16px;">${ticket.subject}</p>
                        </div>

                        <div style="margin-top: 15px;">
                            <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">Descripción:</p>
                            <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; white-space: pre-wrap; color: #334155;">${ticket.description || 'Sin descripción'}</div>
                        </div>

                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${process.env.APP_URL || 'http://localhost:9998'}/panel-administrativo.html#tickets"
                               style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                                Atender Ticket Urgente
                            </a>
                        </div>
                    </div>

                    <div style="background: #fef2f2; padding: 15px; text-align: center; color: #991b1b; font-size: 12px;">
                        <p style="margin: 0; font-weight: bold;">Este ticket requiere atención prioritaria</p>
                        <p style="margin: 5px 0 0 0;">Sistema de Escalamiento Automático - Aponnt</p>
                    </div>
                </div>
            `;

            // Enviar email
            await emailService.sendFromAponnt('support', {
                to: nextStaff.email,
                recipientName: nextStaff.name,
                subject: `🚨 [ESCALADO] ${ticket.ticket_number} - ${ticket.subject}`,
                html: emailHtml,
                text: `ESCALAMIENTO DE TICKET

Ticket: ${ticket.ticket_number}
Empresa: ${ticket.company_name}
Prioridad: ${ticket.priority}
Tipo: ${escalationType === 'automatic' ? 'Automático por SLA' : 'Voluntario'}
Razón: ${reason}

Asunto: ${ticket.subject}

Descripción:
${ticket.description || 'Sin descripción'}

Por favor atienda este ticket de forma prioritaria.`,
                category: 'ticket_escalation'
            });

            console.log(`[SUPPORT-ESCALATION] Email de escalamiento enviado a ${nextStaff.email}`);

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error enviando email de escalamiento:', error.message);
        }
    }

    /**
     * Enviar warnings de SLA próximo a vencer
     */
    async sendSLAWarnings() {
        try {
            // Buscar tickets próximos a escalamiento (en el 75% del tiempo de SLA)
            const ticketsNearSLA = await sequelize.query(`
                SELECT
                    st.ticket_id,
                    st.ticket_number,
                    st.subject,
                    st.priority,
                    st.assigned_staff_id,
                    st.created_at,
                    c.name as company_name,
                    s.email as staff_email,
                    s.first_name || ' ' || s.last_name as staff_name,
                    sla.escalation_time_hours,
                    EXTRACT(EPOCH FROM (
                        st.created_at + (sla.escalation_time_hours || ' hours')::INTERVAL - NOW()
                    )) / 3600 as hours_remaining
                FROM support_tickets st
                JOIN companies c ON c.company_id = st.company_id
                LEFT JOIN support_sla_config sla ON sla.priority = st.priority
                LEFT JOIN aponnt_staff s ON s.staff_id = st.assigned_staff_id
                WHERE st.status IN ('open', 'in_progress')
                  AND st.sla_breach_at IS NULL
                  AND st.assigned_staff_id IS NOT NULL
                  AND EXTRACT(EPOCH FROM (
                      st.created_at + (COALESCE(sla.escalation_time_hours, 24) || ' hours')::INTERVAL - NOW()
                  )) / 3600 BETWEEN 0.5 AND (COALESCE(sla.escalation_time_hours, 24) * 0.25)
            `, { type: QueryTypes.SELECT });

            let warningsSent = 0;

            for (const ticket of ticketsNearSLA) {
                // Marcar warning enviado
                await sequelize.query(`
                    UPDATE support_tickets
                    SET sla_breach_at = NOW()
                    WHERE ticket_id = :ticketId
                `, {
                    replacements: { ticketId: ticket.ticket_id },
                    type: QueryTypes.UPDATE
                });

                // Enviar email de warning
                if (ticket.staff_email) {
                    await this.sendSLAWarningEmail(ticket);
                    warningsSent++;
                }
            }

            return warningsSent;

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error enviando warnings de SLA:', error);
            return 0;
        }
    }

    /**
     * Enviar email de warning de SLA
     */
    async sendSLAWarningEmail(ticket) {
        try {
            const hoursRemaining = Math.round(ticket.hours_remaining * 10) / 10;

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fbbf24; border-radius: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">⚠️ Alerta de SLA</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket próximo a escalar</p>
                    </div>

                    <div style="padding: 20px;">
                        <div style="background: #fffbeb; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
                            <p style="margin: 0; color: #92400e; font-size: 14px;">Tiempo restante antes de escalamiento:</p>
                            <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #d97706;">${hoursRemaining}h</p>
                        </div>

                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Ticket:</td>
                                <td style="padding: 10px 0; font-weight: bold;">${ticket.ticket_number}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Empresa:</td>
                                <td style="padding: 10px 0;">${ticket.company_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Asunto:</td>
                                <td style="padding: 10px 0;">${ticket.subject}</td>
                            </tr>
                        </table>

                        <div style="margin-top: 20px; text-align: center;">
                            <a href="${process.env.APP_URL || 'http://localhost:9998'}/panel-administrativo.html#tickets"
                               style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                                Atender Ticket
                            </a>
                        </div>
                    </div>
                </div>
            `;

            await emailService.sendFromAponnt('support', {
                to: ticket.staff_email,
                recipientName: ticket.staff_name,
                subject: `⚠️ [SLA] ${ticket.ticket_number} - ${hoursRemaining}h para escalamiento`,
                html: emailHtml,
                category: 'sla_warning'
            });

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error enviando warning de SLA:', error.message);
        }
    }

    /**
     * Obtener historial de escalamientos de un ticket
     */
    async getEscalationHistory(ticketId) {
        try {
            const history = await sequelize.query(`
                SELECT
                    e.*,
                    fs.first_name || ' ' || fs.last_name as from_staff_name,
                    fs.email as from_staff_email,
                    ts.first_name || ' ' || ts.last_name as to_staff_name,
                    ts.email as to_staff_email,
                    eb.first_name || ' ' || eb.last_name as escalated_by_name
                FROM support_ticket_escalations e
                LEFT JOIN aponnt_staff fs ON fs.staff_id = e.from_staff_id
                LEFT JOIN aponnt_staff ts ON ts.staff_id = e.to_staff_id
                LEFT JOIN aponnt_staff eb ON eb.staff_id = e.escalated_by
                WHERE e.ticket_id = :ticketId
                ORDER BY e.created_at DESC
            `, {
                replacements: { ticketId },
                type: QueryTypes.SELECT
            });

            return history;

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error obteniendo historial:', error);
            return [];
        }
    }

    /**
     * Obtener estadísticas de escalamiento
     */
    async getStats(dateFrom = null, dateTo = null) {
        try {
            const dateFilter = dateFrom && dateTo
                ? `AND e.created_at BETWEEN :dateFrom AND :dateTo`
                : '';

            const stats = await sequelize.query(`
                SELECT
                    COUNT(*) as total_escalations,
                    COUNT(*) FILTER (WHERE escalation_type = 'automatic') as automatic_escalations,
                    COUNT(*) FILTER (WHERE escalation_type = 'voluntary') as voluntary_escalations,
                    COUNT(DISTINCT ticket_id) as tickets_escalated,
                    AVG(to_level - from_level) as avg_level_jump
                FROM support_ticket_escalations e
                WHERE 1=1 ${dateFilter}
            `, {
                replacements: { dateFrom, dateTo },
                type: QueryTypes.SELECT
            });

            return stats[0] || {};

        } catch (error) {
            console.error('[SUPPORT-ESCALATION] Error obteniendo estadísticas:', error);
            return {};
        }
    }

    /**
     * Obtener estado del servicio
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            schedule: this.config.schedule,
            coordinatorEmail: this.config.coordinatorEmail,
            institutionalEmail: this.config.institutionalEmail
        };
    }
}

// Singleton
const supportTicketEscalationService = new SupportTicketEscalationService();

module.exports = supportTicketEscalationService;
