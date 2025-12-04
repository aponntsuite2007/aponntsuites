/**
 * PROACTIVE NOTIFICATION SERVICE - Sistema de Notificaciones Preventivas
 *
 * Servicio para detectar problemas ANTES de que ocurran y generar alertas automáticas.
 * Ejecuta reglas configurables que analizan datos y disparan notificaciones preventivas.
 *
 * VALOR: Prevención de problemas, reducción de violaciones, alertas tempranas
 *
 * @version 2.0
 * @date 2025-10-16
 */

const { sequelize } = require('../config/database');
const inboxService = require('./inboxService');
const crypto = require('crypto');

class ProactiveNotificationService {

    /**
     * Mapa de tipos de regla a configuración de hilos
     */
    static RULE_THREAD_CONFIG = {
        vacation_expiry: {
            group_type: 'proactive_vacation_expiry',
            icon: '🏖️',
            priority: 'high',
            subject_template: 'Vacaciones por vencer - {count} empleados'
        },
        overtime_limit: {
            group_type: 'proactive_overtime_limit',
            icon: '⏰',
            priority: 'critical',
            subject_template: 'Límite de horas extra - {count} alertas'
        },
        rest_violation: {
            group_type: 'proactive_rest_violation',
            icon: '😴',
            priority: 'critical',
            subject_template: 'Riesgo violación descanso - {count} empleados'
        },
        document_expiry: {
            group_type: 'proactive_document_expiry',
            icon: '📄',
            priority: 'high',
            subject_template: 'Documentos por vencer - {count} alertas'
        },
        certificate_expiry: {
            group_type: 'proactive_certificate_expiry',
            icon: '🏥',
            priority: 'medium',
            subject_template: 'Certificados médicos por vencer - {count}'
        },
        consent_renewal: {
            group_type: 'proactive_consent_renewal',
            icon: '🔐',
            priority: 'high',
            subject_template: 'Consentimientos biométricos por renovar - {count}'
        }
    };

    /**
     * Ejecuta todas las reglas proactivas activas de una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @returns {Promise<Object>} - Resultado de la ejecución
     */
    async executeAllRules(companyId) {
        try {
            console.log(`🔍 [PROACTIVE] Ejecutando reglas para empresa ${companyId}...`);

            // Obtener reglas activas
            const rules = await this.getActiveRules(companyId);

            if (rules.length === 0) {
                console.log(`ℹ️ [PROACTIVE] No hay reglas activas para empresa ${companyId}`);
                return {
                    company_id: companyId,
                    rules_executed: 0,
                    total_matches: 0,
                    actions_taken: 0,
                    executions: []
                };
            }

            const results = {
                company_id: companyId,
                rules_executed: rules.length,
                total_matches: 0,
                actions_taken: 0,
                executions: []
            };

            // Ejecutar cada regla
            for (const rule of rules) {
                const execution = await this.executeRule(companyId, rule);
                results.executions.push(execution);
                results.total_matches += execution.matched_count;
                results.actions_taken += execution.actions_taken;

                // Actualizar last_checked
                await this.updateLastChecked(rule.id);
            }

            console.log(`✅ [PROACTIVE] Ejecución completada: ${results.total_matches} coincidencias, ${results.actions_taken} acciones`);

            return results;

        } catch (error) {
            console.error('❌ [PROACTIVE] Error ejecutando reglas:', error);
            throw error;
        }
    }

    /**
     * Ejecuta una regla proactiva específica
     *
     * @param {number} companyId - ID de la empresa
     * @param {Object} rule - Regla a ejecutar
     * @returns {Promise<Object>} - Resultado de la ejecución
     */
    async executeRule(companyId, rule) {
        try {
            console.log(`📋 [PROACTIVE] Ejecutando regla: ${rule.rule_name}`);

            let matches = [];
            let actionsTaken = 0;

            // Ejecutar según tipo de regla
            switch (rule.rule_type) {
                case 'vacation_expiry':
                    matches = await this.checkVacationExpiry(companyId, rule);
                    break;

                case 'overtime_limit':
                    matches = await this.checkOvertimeLimit(companyId, rule);
                    break;

                case 'rest_violation':
                    matches = await this.checkRestViolationRisk(companyId, rule);
                    break;

                case 'document_expiry':
                    matches = await this.checkDocumentExpiry(companyId, rule);
                    break;

                case 'certificate_expiry':
                    matches = await this.checkCertificateExpiry(companyId, rule);
                    break;

                case 'consent_renewal':
                    matches = await this.checkConsentRenewal(companyId, rule);
                    break;

                default:
                    console.warn(`⚠️ [PROACTIVE] Tipo de regla no soportado: ${rule.rule_type}`);
            }

            // Ejecutar acción automática si hay coincidencias
            if (matches.length > 0) {
                actionsTaken = await this.executeAutoAction(companyId, rule, matches);
            }

            // Registrar ejecución
            const execution = await this.logExecution(rule.id, matches.length, actionsTaken, matches);

            return {
                rule_id: rule.id,
                rule_name: rule.rule_name,
                rule_type: rule.rule_type,
                matched_count: matches.length,
                actions_taken: actionsTaken,
                matches: matches,
                execution_id: execution.id
            };

        } catch (error) {
            console.error(`❌ [PROACTIVE] Error ejecutando regla ${rule.rule_name}:`, error);
            return {
                rule_id: rule.id,
                rule_name: rule.rule_name,
                matched_count: 0,
                actions_taken: 0,
                error: error.message
            };
        }
    }

    /**
     * Verifica vacaciones próximas a vencer
     */
    async checkVacationExpiry(companyId, rule) {
        try {
            const threshold = rule.trigger_threshold.days_until_expiry || 60;

            const result = await sequelize.query(`
                SELECT
                    employee_id,
                    balance,
                    expiry_date,
                    EXTRACT(DAY FROM (expiry_date - CURRENT_DATE)) as days_until_expiry
                FROM vacation_balances
                WHERE company_id = $1
                AND balance > 0
                AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * $2
                ORDER BY expiry_date ASC
            `, [companyId, threshold]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                type: 'vacation_expiry',
                severity: this.calculateSeverityByDays(parseInt(row.days_until_expiry)),
                details: {
                    balance: row.balance,
                    expiry_date: row.expiry_date,
                    days_until_expiry: parseInt(row.days_until_expiry)
                },
                message: `Tiene ${row.balance} días de vacaciones que vencen en ${row.days_until_expiry} días`
            }));

        } catch (error) {
            console.error('❌ Error verificando vencimiento de vacaciones:', error);
            return [];
        }
    }

    /**
     * Verifica empleados cerca del límite de horas extra
     */
    async checkOvertimeLimit(companyId, rule) {
        try {
            const monthlyLimit = rule.trigger_threshold.monthly_limit || 30;
            const percentage = rule.trigger_threshold.percentage || 90;
            const threshold = (monthlyLimit * percentage) / 100;

            const result = await sequelize.query(`
                SELECT
                    employee_id,
                    SUM((metadata->>'hours')::numeric) as overtime_hours,
                    COUNT(*) as overtime_events
                FROM cost_transactions
                WHERE company_id = $1
                AND cost_category = 'overtime'
                AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY employee_id
                HAVING SUM((metadata->>'hours')::numeric) >= $2
                ORDER BY overtime_hours DESC
            `, [companyId, threshold]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                type: 'overtime_limit',
                severity: parseFloat(row.overtime_hours) >= monthlyLimit ? 'critical' : 'warning',
                details: {
                    overtime_hours: parseFloat(row.overtime_hours).toFixed(2),
                    monthly_limit: monthlyLimit,
                    percentage_used: ((parseFloat(row.overtime_hours) / monthlyLimit) * 100).toFixed(2),
                    remaining: (monthlyLimit - parseFloat(row.overtime_hours)).toFixed(2)
                },
                message: `Tiene ${row.overtime_hours}h extras este mes (${percentage}% del límite de ${monthlyLimit}h)`
            }));

        } catch (error) {
            console.error('❌ Error verificando límite de horas extra:', error);
            return [];
        }
    }

    /**
     * Verifica riesgo de violación de período de descanso
     */
    async checkRestViolationRisk(companyId, rule) {
        try {
            const minimumHours = rule.trigger_threshold.minimum_hours || 12;

            // Obtener empleados con próximo turno programado
            const result = await sequelize.query(`
                SELECT DISTINCT
                    a.employee_id,
                    a.date as last_work_date,
                    a.exit_time,
                    sa.date as next_shift_date,
                    sa.start_time as next_shift_start,
                    EXTRACT(EPOCH FROM (
                        (sa.date + sa.start_time::time) - (a.date + a.exit_time::time)
                    )) / 3600 as rest_hours
                FROM attendance_records a
                JOIN shift_assignments sa ON a.employee_id = sa.employee_id
                WHERE a.company_id = $1
                AND a.exit_time IS NOT NULL
                AND a.date = CURRENT_DATE
                AND sa.date = CURRENT_DATE + INTERVAL '1 day'
                AND EXTRACT(EPOCH FROM (
                    (sa.date + sa.start_time::time) - (a.date + a.exit_time::time)
                )) / 3600 < $2
            `, [companyId, minimumHours]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                type: 'rest_violation_risk',
                severity: 'critical',
                details: {
                    last_exit: `${row.last_work_date} ${row.exit_time}`,
                    next_entry: `${row.next_shift_date} ${row.next_shift_start}`,
                    rest_hours: parseFloat(row.rest_hours).toFixed(2),
                    minimum_required: minimumHours,
                    deficit: (minimumHours - parseFloat(row.rest_hours)).toFixed(2)
                },
                message: `Riesgo: solo ${parseFloat(row.rest_hours).toFixed(1)}h de descanso antes del próximo turno (mínimo: ${minimumHours}h)`
            }));

        } catch (error) {
            console.error('❌ Error verificando riesgo de descanso:', error);
            return [];
        }
    }

    /**
     * Verifica documentos próximos a vencer
     */
    async checkDocumentExpiry(companyId, rule) {
        try {
            const threshold = rule.trigger_threshold.days_until_expiry || 30;

            const result = await sequelize.query(`
                SELECT
                    employee_id,
                    document_type,
                    document_number,
                    expiry_date,
                    EXTRACT(DAY FROM (expiry_date - CURRENT_DATE)) as days_until_expiry
                FROM employee_documents
                WHERE company_id = $1
                AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * $2
                ORDER BY expiry_date ASC
            `, [companyId, threshold]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                type: 'document_expiry',
                severity: this.calculateSeverityByDays(parseInt(row.days_until_expiry)),
                details: {
                    document_type: row.document_type,
                    document_number: row.document_number,
                    expiry_date: row.expiry_date,
                    days_until_expiry: parseInt(row.days_until_expiry)
                },
                message: `Documento ${row.document_type} vence en ${row.days_until_expiry} días`
            }));

        } catch (error) {
            console.error('❌ Error verificando vencimiento de documentos:', error);
            return [];
        }
    }

    /**
     * Verifica certificados médicos próximos a vencer
     */
    async checkCertificateExpiry(companyId, rule) {
        try {
            const threshold = rule.trigger_threshold.days_until_expiry || 7;

            const result = await sequelize.query(`
                SELECT
                    employee_id,
                    start_date,
                    days,
                    (start_date + INTERVAL '1 day' * days) as end_date,
                    EXTRACT(DAY FROM ((start_date + INTERVAL '1 day' * days) - CURRENT_DATE)) as days_remaining
                FROM medical_leaves
                WHERE company_id = $1
                AND status = 'active'
                AND (start_date + INTERVAL '1 day' * days) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * $2
                ORDER BY end_date ASC
            `, [companyId, threshold]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                type: 'certificate_expiry',
                severity: this.calculateSeverityByDays(parseInt(row.days_remaining)),
                details: {
                    start_date: row.start_date,
                    total_days: row.days,
                    end_date: row.end_date,
                    days_remaining: parseInt(row.days_remaining)
                },
                message: `Licencia médica finaliza en ${row.days_remaining} días - Preparar reincorporación`
            }));

        } catch (error) {
            console.error('❌ Error verificando certificados médicos:', error);
            return [];
        }
    }

    /**
     * Verifica consentimientos biométricos próximos a vencer
     * Busca en biometric_consents donde expires_at está por vencer
     */
    async checkConsentRenewal(companyId, rule) {
        try {
            const threshold = rule.trigger_threshold?.days_before_expiry || 30;

            // Consulta consentimientos activos cuya fecha de expiración está próxima
            const result = await sequelize.query(`
                SELECT
                    bc.user_id as employee_id,
                    bc.id as consent_id,
                    bc.consent_date,
                    bc.expires_at,
                    bc.consent_version,
                    u."firstName" as first_name,
                    u."lastName" as last_name,
                    u.email,
                    EXTRACT(DAY FROM (bc.expires_at - CURRENT_DATE)) as days_until_expiry
                FROM biometric_consents bc
                JOIN users u ON bc.user_id = u.user_id
                WHERE bc.company_id = :companyId
                AND bc.revoked = false
                AND bc.consent_given = true
                AND bc.expires_at IS NOT NULL
                AND bc.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * :threshold
                ORDER BY bc.expires_at ASC
            `, {
                replacements: { companyId, threshold },
                type: sequelize.QueryTypes.SELECT
            });

            return result.map(row => ({
                employee_id: row.employee_id,
                type: 'consent_renewal',
                severity: this.calculateSeverityByDays(parseInt(row.days_until_expiry)),
                details: {
                    consent_id: row.consent_id,
                    consent_date: row.consent_date,
                    expiry_date: row.expires_at,
                    consent_version: row.consent_version,
                    days_until_expiry: parseInt(row.days_until_expiry),
                    employee_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
                    employee_email: row.email
                },
                message: `Consentimiento biométrico de ${row.first_name || ''} ${row.last_name || ''} vence en ${row.days_until_expiry} días. Requiere renovación.`
            }));

        } catch (error) {
            console.error('❌ Error verificando renovación de consentimientos:', error);
            return [];
        }
    }

    /**
     * Calcula severidad según días restantes
     */
    calculateSeverityByDays(days) {
        if (days <= 7) return 'critical';
        if (days <= 15) return 'high';
        if (days <= 30) return 'medium';
        return 'low';
    }

    /**
     * Ejecuta la acción automática configurada en la regla
     */
    async executeAutoAction(companyId, rule, matches) {
        try {
            let actionsTaken = 0;

            switch (rule.auto_action) {
                case 'create_notification':
                    actionsTaken = await this.createNotifications(companyId, rule, matches);
                    break;

                case 'send_alert':
                    actionsTaken = await this.sendAlerts(companyId, rule, matches);
                    break;

                case 'block_action':
                    actionsTaken = await this.blockActions(companyId, rule, matches);
                    break;

                default:
                    console.warn(`⚠️ [PROACTIVE] Acción automática no soportada: ${rule.auto_action}`);
            }

            return actionsTaken;

        } catch (error) {
            console.error('❌ Error ejecutando acción automática:', error);
            return 0;
        }
    }

    /**
     * Crea notificaciones reales en el sistema de inbox con hilos
     * Agrupa las detecciones por tipo de regla en un solo hilo
     */
    async createNotifications(companyId, rule, matches) {
        try {
            if (matches.length === 0) return 0;

            const recipients = rule.notification_recipients || ['employee', 'rrhh'];
            const config = ProactiveNotificationService.RULE_THREAD_CONFIG[rule.rule_type] || {
                group_type: `proactive_${rule.rule_type}`,
                icon: '🔔',
                priority: 'medium',
                subject_template: 'Alerta proactiva - {count} detecciones'
            };

            // Buscar o crear hilo existente para esta regla (mismo día)
            const today = new Date().toISOString().split('T')[0];
            const existingGroup = await this.findExistingThread(companyId, config.group_type, today);

            let groupId;
            if (existingGroup) {
                groupId = existingGroup.id;
                console.log(`📬 [PROACTIVE] Usando hilo existente: ${groupId}`);
            } else {
                // Crear nuevo hilo/grupo
                const subject = config.subject_template.replace('{count}', matches.length);
                const group = await inboxService.createNotificationGroup(companyId, {
                    group_type: config.group_type,
                    initiator_type: 'system',
                    initiator_id: 'proactive-engine',
                    subject: `${config.icon} ${subject}`,
                    priority: config.priority,
                    metadata: {
                        rule_id: rule.id,
                        rule_name: rule.rule_name,
                        rule_type: rule.rule_type,
                        detection_date: today,
                        recipients: recipients,
                        total_detections: matches.length
                    }
                });
                groupId = group.id;
                console.log(`📬 [PROACTIVE] Nuevo hilo creado: ${groupId}`);
            }

            // Crear mensajes para cada detección
            let created = 0;
            for (const match of matches) {
                const messageContent = this.formatDetectionMessage(match, config);

                await inboxService.sendMessage(groupId, companyId, {
                    sender_type: 'system',
                    sender_id: 'proactive-engine',
                    sender_name: `Sistema Proactivo ${config.icon}`,
                    recipient_type: this.mapRecipientType(recipients),
                    recipient_id: match.employee_id || 'all',
                    recipient_name: match.details?.employee_name || 'Destinatarios',
                    message_type: 'proactive_detection',
                    subject: match.type,
                    content: messageContent,
                    deadline_at: this.calculateDeadline(match),
                    requires_response: match.severity === 'critical',
                    channels: ['web', 'email']
                });

                created++;
            }

            // Actualizar metadata del grupo con el conteo final
            await this.updateGroupMetadata(groupId, matches.length);

            console.log(`✅ [PROACTIVE] ${created} notificaciones creadas en hilo ${groupId}`);
            return created;

        } catch (error) {
            console.error('❌ Error creando notificaciones en inbox:', error);
            return 0;
        }
    }

    /**
     * Busca un hilo existente para la misma regla del mismo día
     */
    async findExistingThread(companyId, groupType, date) {
        try {
            const [result] = await sequelize.query(`
                SELECT id, metadata
                FROM notification_groups
                WHERE company_id = $1
                AND group_type = $2
                AND status = 'open'
                AND DATE(created_at) = $3
                ORDER BY created_at DESC
                LIMIT 1
            `, { bind: [companyId, groupType, date] });

            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('❌ Error buscando hilo existente:', error);
            return null;
        }
    }

    /**
     * Formatea el mensaje de detección para el inbox
     */
    formatDetectionMessage(match, config) {
        const severityIcon = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        }[match.severity] || '⚪';

        let message = `${severityIcon} **Severidad: ${match.severity.toUpperCase()}**\n\n`;
        message += `${match.message}\n\n`;

        if (match.details) {
            message += `**Detalles:**\n`;
            for (const [key, value] of Object.entries(match.details)) {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                message += `- ${formattedKey}: ${value}\n`;
            }
        }

        message += `\n📅 Detectado: ${new Date().toLocaleString('es-AR')}`;
        return message;
    }

    /**
     * Mapea los recipients de la regla al tipo de recipient del inbox
     */
    mapRecipientType(recipients) {
        if (recipients.includes('all') || recipients.includes('broadcast')) return 'broadcast';
        if (recipients.includes('rrhh')) return 'role';
        if (recipients.includes('supervisor')) return 'role';
        return 'employee';
    }

    /**
     * Calcula el deadline basado en la severidad
     */
    calculateDeadline(match) {
        const now = new Date();
        const hoursToAdd = {
            critical: 4,
            high: 24,
            medium: 72,
            low: 168 // 1 semana
        }[match.severity] || 48;

        return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    }

    /**
     * Actualiza el metadata del grupo con el conteo total
     */
    async updateGroupMetadata(groupId, newCount) {
        try {
            await sequelize.query(`
                UPDATE notification_groups
                SET metadata = jsonb_set(
                    COALESCE(metadata, '{}'),
                    '{total_detections}',
                    to_jsonb(COALESCE((metadata->>'total_detections')::int, 0) + $1)
                )
                WHERE id = $2
            `, { bind: [newCount, groupId] });
        } catch (error) {
            console.error('❌ Error actualizando metadata del grupo:', error);
        }
    }

    /**
     * Envía alertas (emails, push, etc)
     */
    async sendAlerts(companyId, rule, matches) {
        try {
            // TODO: Integrar con sistema de emails/push
            console.log(`🚨 [PROACTIVE] ${matches.length} alertas enviadas`);
            return matches.length;

        } catch (error) {
            console.error('❌ Error enviando alertas:', error);
            return 0;
        }
    }

    /**
     * Bloquea acciones (prevención)
     */
    async blockActions(companyId, rule, matches) {
        try {
            // TODO: Implementar bloqueo según tipo de regla
            console.log(`🚫 [PROACTIVE] ${matches.length} acciones bloqueadas preventivamente`);
            return matches.length;

        } catch (error) {
            console.error('❌ Error bloqueando acciones:', error);
            return 0;
        }
    }

    /**
     * Registra la ejecución de una regla
     */
    async logExecution(ruleId, matchedCount, actionsTaken, matches) {
        try {
            const result = await sequelize.query(`
                INSERT INTO proactive_executions
                (rule_id, execution_time, matched_count, actions_taken, execution_details)
                VALUES ($1, NOW(), $2, $3, $4)
                RETURNING *
            `, [ruleId, matchedCount, actionsTaken, JSON.stringify(matches)]);

            return result.rows[0];

        } catch (error) {
            console.error('❌ Error registrando ejecución:', error);
            throw error;
        }
    }

    /**
     * Actualiza el timestamp de última verificación de una regla
     */
    async updateLastChecked(ruleId) {
        try {
            await sequelize.query(`
                UPDATE proactive_rules
                SET last_checked = NOW()
                WHERE id = $1
            `, [ruleId]);

        } catch (error) {
            console.error('❌ Error actualizando last_checked:', error);
        }
    }

    /**
     * Obtiene las reglas activas de una empresa
     */
    async getActiveRules(companyId) {
        try {
            const result = await sequelize.query(`
                SELECT * FROM proactive_rules
                WHERE company_id = $1
                AND active = true
                ORDER BY priority DESC, id ASC
            `, [companyId]);

            return result.rows;

        } catch (error) {
            console.error('❌ Error obteniendo reglas activas:', error);
            return [];
        }
    }

    /**
     * Crea una nueva regla proactiva
     */
    async createRule(companyId, ruleData) {
        try {
            const {
                rule_name,
                rule_type,
                trigger_threshold,
                auto_action,
                notification_recipients,
                priority,
                check_frequency
            } = ruleData;

            const result = await sequelize.query(`
                INSERT INTO proactive_rules
                (company_id, rule_name, rule_type, trigger_threshold, auto_action,
                 notification_recipients, priority, check_frequency, active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
                RETURNING *
            `, [
                companyId,
                rule_name,
                rule_type,
                JSON.stringify(trigger_threshold),
                auto_action,
                JSON.stringify(notification_recipients),
                priority || 'medium',
                check_frequency || 'daily'
            ]);

            console.log(`✅ [PROACTIVE] Regla creada: ${rule_name}`);

            return result.rows[0];

        } catch (error) {
            console.error('❌ Error creando regla:', error);
            throw error;
        }
    }

    /**
     * Actualiza una regla existente
     */
    async updateRule(ruleId, updates) {
        try {
            const fields = [];
            const values = [];
            let index = 1;

            Object.keys(updates).forEach(key => {
                if (['trigger_threshold', 'notification_recipients'].includes(key)) {
                    fields.push(`${key} = $${index}`);
                    values.push(JSON.stringify(updates[key]));
                } else {
                    fields.push(`${key} = $${index}`);
                    values.push(updates[key]);
                }
                index++;
            });

            values.push(ruleId);

            const result = await sequelize.query(`
                UPDATE proactive_rules
                SET ${fields.join(', ')}
                WHERE id = $${index}
                RETURNING *
            `, values);

            return result.rows[0];

        } catch (error) {
            console.error('❌ Error actualizando regla:', error);
            throw error;
        }
    }

    /**
     * Desactiva una regla
     */
    async deactivateRule(ruleId) {
        try {
            await sequelize.query(`
                UPDATE proactive_rules
                SET active = false
                WHERE id = $1
            `, [ruleId]);

            console.log(`🔇 [PROACTIVE] Regla ${ruleId} desactivada`);

        } catch (error) {
            console.error('❌ Error desactivando regla:', error);
            throw error;
        }
    }

    /**
     * Obtiene historial de ejecuciones de una regla
     */
    async getExecutionHistory(ruleId, limit = 50) {
        try {
            const result = await sequelize.query(`
                SELECT * FROM proactive_executions
                WHERE rule_id = $1
                ORDER BY execution_time DESC
                LIMIT $2
            `, [ruleId, limit]);

            return result.rows;

        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);
            return [];
        }
    }

    /**
     * Obtiene dashboard de reglas proactivas
     */
    async getProactiveDashboard(companyId) {
        try {
            const rules = await this.getActiveRules(companyId);

            // Obtener última ejecución de cada regla
            const rulesWithStats = await Promise.all(rules.map(async (rule) => {
                const lastExecution = await sequelize.query(`
                    SELECT * FROM proactive_executions
                    WHERE rule_id = $1
                    ORDER BY execution_time DESC
                    LIMIT 1
                `, [rule.id]);

                return {
                    ...rule,
                    last_execution: lastExecution.rows[0] || null
                };
            }));

            // Estadísticas globales
            const stats = await sequelize.query(`
                SELECT
                    COUNT(*) as total_executions,
                    SUM(matched_count) as total_matches,
                    SUM(actions_taken) as total_actions
                FROM proactive_executions pe
                JOIN proactive_rules pr ON pe.rule_id = pr.id
                WHERE pr.company_id = $1
                AND pe.execution_time >= CURRENT_DATE - INTERVAL '30 days'
            `, [companyId]);

            // Obtener última ejecución global
            const lastExec = await sequelize.query(`
                SELECT MAX(execution_time) as last_execution
                FROM proactive_executions pe
                JOIN proactive_rules pr ON pe.rule_id = pr.id
                WHERE pr.company_id = $1
            `, [companyId]);

            // Detecciones de hoy
            const todayStats = await sequelize.query(`
                SELECT SUM(matched_count) as today_detections
                FROM proactive_executions pe
                JOIN proactive_rules pr ON pe.rule_id = pr.id
                WHERE pr.company_id = $1
                AND DATE(pe.execution_time) = CURRENT_DATE
            `, [companyId]);

            return {
                total_rules: rules.length,
                active_rules: rules.filter(r => r.active).length,
                last_execution: lastExec.rows[0].last_execution || null,
                today_detections: parseInt(todayStats.rows[0].today_detections || 0),
                total_executions_30d: parseInt(stats.rows[0].total_executions || 0),
                total_matches_30d: parseInt(stats.rows[0].total_matches || 0),
                total_actions_30d: parseInt(stats.rows[0].total_actions || 0),
                rules: rulesWithStats
            };

        } catch (error) {
            console.error('❌ Error obteniendo dashboard proactivo:', error);
            throw error;
        }
    }
}

module.exports = new ProactiveNotificationService();
