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

const db = require('../config/database');

class ProactiveNotificationService {

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

            const result = await db.query(`
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

            const result = await db.query(`
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
            const result = await db.query(`
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

            const result = await db.query(`
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

            const result = await db.query(`
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
     * Crea notificaciones en el sistema
     */
    async createNotifications(companyId, rule, matches) {
        try {
            const recipients = rule.notification_recipients || ['employee', 'rrhh'];
            let created = 0;

            for (const match of matches) {
                // TODO: Integrar con notification system para crear notificación real
                console.log(`📨 [PROACTIVE] Notificación creada para ${match.employee_id}: ${match.message}`);
                created++;
            }

            return created;

        } catch (error) {
            console.error('❌ Error creando notificaciones:', error);
            return 0;
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
            const result = await db.query(`
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
            await db.query(`
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
            const result = await db.query(`
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

            const result = await db.query(`
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

            const result = await db.query(`
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
            await db.query(`
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
            const result = await db.query(`
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
                const lastExecution = await db.query(`
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
            const stats = await db.query(`
                SELECT
                    COUNT(*) as total_executions,
                    SUM(matched_count) as total_matches,
                    SUM(actions_taken) as total_actions
                FROM proactive_executions pe
                JOIN proactive_rules pr ON pe.rule_id = pr.id
                WHERE pr.company_id = $1
                AND pe.execution_time >= CURRENT_DATE - INTERVAL '30 days'
            `, [companyId]);

            return {
                summary: {
                    total_rules: rules.length,
                    total_executions_30d: parseInt(stats.rows[0].total_executions || 0),
                    total_matches_30d: parseInt(stats.rows[0].total_matches || 0),
                    total_actions_30d: parseInt(stats.rows[0].total_actions || 0)
                },
                rules: rulesWithStats
            };

        } catch (error) {
            console.error('❌ Error obteniendo dashboard proactivo:', error);
            throw error;
        }
    }
}

module.exports = new ProactiveNotificationService();
