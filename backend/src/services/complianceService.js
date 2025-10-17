/**
 * COMPLIANCE SERVICE - Validación de Cumplimiento Legal
 *
 * Servicio para validar cumplimiento de leyes laborales argentinas (LCT),
 * detectar violaciones y generar alertas preventivas
 *
 * VALOR: Prevenir violaciones laborales automáticamente
 *
 * @version 2.0
 * @date 2025-10-16
 */

const db = require('../config/database');

// TODO: Este servicio requiere migraciones de BD para las siguientes tablas:
// - attendance_records, vacation_balances, medical_leaves
// - compliance_violations, compliance_rules
// Temporalmente deshabilitado hasta ejecutar migraciones
const moduleService = require('./moduleService');

class ComplianceService {

    /**
     * Valida todas las reglas de compliance para una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @returns {Promise<Object>} - Resultado de validación con violaciones detectadas
     */
    async validateAllRules(companyId) {
        try {
            console.log(`🔍 [COMPLIANCE] Validando reglas para empresa ${companyId}...`);

            // Obtener todas las reglas activas
            const rules = await this.getActiveRules();

            const results = {
                company_id: companyId,
                total_rules: rules.length,
                violations: [],
                passed: [],
                warnings: [],
                compliance_percent: 0,
                validated_at: new Date()
            };

            // Validar cada regla
            for (const rule of rules) {
                const ruleResult = await this.validateRule(companyId, rule);

                if (ruleResult.violations.length > 0) {
                    results.violations.push({
                        rule_code: rule.rule_code,
                        rule_name: rule.legal_reference,
                        severity: rule.severity,
                        violation_count: ruleResult.violations.length,
                        violations: ruleResult.violations
                    });
                } else {
                    results.passed.push({
                        rule_code: rule.rule_code,
                        rule_name: rule.legal_reference
                    });
                }
            }

            // Calcular porcentaje de cumplimiento
            results.compliance_percent = ((results.passed.length / results.total_rules) * 100).toFixed(1);

            console.log(`✅ [COMPLIANCE] Validación completada: ${results.compliance_percent}% cumplimiento`);
            console.log(`⚠️ [COMPLIANCE] ${results.violations.length} violaciones detectadas`);

            return results;

        } catch (error) {
            console.error(`❌ [COMPLIANCE] Error validando reglas:`, error);
            throw error;
        }
    }

    /**
     * Valida una regla específica de compliance
     *
     * @param {number} companyId - ID de la empresa
     * @param {Object} rule - Regla de compliance
     * @returns {Promise<Object>} - Resultado con violaciones encontradas
     */
    async validateRule(companyId, rule) {
        try {
            let violations = [];

            switch (rule.rule_type) {
                case 'rest_period':
                    violations = await this.validateRestPeriod(companyId, rule);
                    break;

                case 'overtime_limit':
                    violations = await this.validateOvertimeLimit(companyId, rule);
                    break;

                case 'vacation_expiry':
                    violations = await this.validateVacationExpiry(companyId, rule);
                    break;

                case 'documentation':
                    violations = await this.validateDocumentation(companyId, rule);
                    break;

                case 'working_hours':
                    violations = await this.validateWorkingHours(companyId, rule);
                    break;

                default:
                    console.warn(`⚠️ [COMPLIANCE] Tipo de regla desconocido: ${rule.rule_type}`);
            }

            // Registrar violaciones en la base de datos
            if (violations.length > 0) {
                await this.recordViolations(companyId, rule, violations);
            }

            return { violations };

        } catch (error) {
            console.error(`❌ [COMPLIANCE] Error validando regla ${rule.rule_code}:`, error);
            return { violations: [] };
        }
    }

    /**
     * Valida períodos de descanso (Art. 197 LCT - 12h entre jornadas)
     */
    async validateRestPeriod(companyId, rule) {
        try {
            // Obtener empleados con violación de período de descanso
            const result = await db.query(`
                WITH employee_shifts AS (
                    SELECT
                        a1.employee_id,
                        a1.date as work_date,
                        a1.exit_time,
                        a2.date as next_date,
                        a2.entry_time as next_entry,
                        EXTRACT(EPOCH FROM (
                            (a2.date + a2.entry_time::time) - (a1.date + a1.exit_time::time)
                        )) / 3600 as rest_hours
                    FROM attendance_records a1
                    JOIN attendance_records a2 ON a2.employee_id = a1.employee_id
                    WHERE a1.company_id = $1
                    AND a1.exit_time IS NOT NULL
                    AND a2.entry_time IS NOT NULL
                    AND a2.date >= a1.date
                    AND (a2.date = a1.date + INTERVAL '1 day' OR a2.date = a1.date)
                    AND a2.id > a1.id
                    AND a1.date >= CURRENT_DATE - INTERVAL '30 days'
                )
                SELECT
                    employee_id,
                    work_date,
                    next_date,
                    rest_hours
                FROM employee_shifts
                WHERE rest_hours < 12
                ORDER BY work_date DESC
                LIMIT 100
            `, [companyId]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                violation_date: row.work_date,
                details: {
                    work_date: row.work_date,
                    next_work_date: row.next_date,
                    rest_hours: parseFloat(row.rest_hours).toFixed(2),
                    minimum_required: 12,
                    difference: (12 - parseFloat(row.rest_hours)).toFixed(2)
                },
                severity: 'critical'
            }));

        } catch (error) {
            console.error('❌ Error validando período de descanso:', error);
            return [];
        }
    }

    /**
     * Valida límites de horas extra (Art. 201 LCT)
     */
    async validateOvertimeLimit(companyId, rule) {
        try {
            // Empleados que exceden 30h extras mensuales
            const result = await db.query(`
                SELECT
                    employee_id,
                    DATE_TRUNC('month', date) as month,
                    SUM(overtime_hours) as total_overtime
                FROM attendance_records
                WHERE company_id = $1
                AND date >= DATE_TRUNC('month', CURRENT_DATE)
                AND overtime_hours > 0
                GROUP BY employee_id, DATE_TRUNC('month', date)
                HAVING SUM(overtime_hours) > 30
            `, [companyId]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                violation_date: new Date(),
                details: {
                    month: row.month,
                    total_overtime_hours: parseFloat(row.total_overtime).toFixed(2),
                    limit: 30,
                    excess: (parseFloat(row.total_overtime) - 30).toFixed(2)
                },
                severity: 'warning'
            }));

        } catch (error) {
            console.error('❌ Error validando horas extra:', error);
            return [];
        }
    }

    /**
     * Valida vencimiento de vacaciones (Art. 153 LCT)
     */
    async validateVacationExpiry(companyId, rule) {
        try {
            // Empleados con vacaciones próximas a vencer (60 días)
            const result = await db.query(`
                SELECT
                    employee_id,
                    balance,
                    expiry_date,
                    EXTRACT(DAY FROM (expiry_date - CURRENT_DATE)) as days_until_expiry
                FROM vacation_balances
                WHERE company_id = $1
                AND balance > 0
                AND expiry_date < CURRENT_DATE + INTERVAL '60 days'
                AND expiry_date > CURRENT_DATE
                ORDER BY expiry_date ASC
            `, [companyId]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                violation_date: row.expiry_date,
                details: {
                    balance: row.balance,
                    expiry_date: row.expiry_date,
                    days_until_expiry: parseInt(row.days_until_expiry)
                },
                severity: 'warning'
            }));

        } catch (error) {
            console.error('❌ Error validando vencimiento vacaciones:', error);
            return [];
        }
    }

    /**
     * Valida documentación obligatoria (certificados médicos)
     */
    async validateDocumentation(companyId, rule) {
        try {
            // Licencias médicas sin certificado
            const result = await db.query(`
                SELECT
                    ml.employee_id,
                    ml.start_date,
                    ml.days,
                    ml.id as leave_id
                FROM medical_leaves ml
                WHERE ml.company_id = $1
                AND ml.certificate_file IS NULL
                AND ml.start_date >= CURRENT_DATE - INTERVAL '90 days'
                AND ml.status = 'active'
            `, [companyId]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                violation_date: row.start_date,
                details: {
                    leave_id: row.leave_id,
                    start_date: row.start_date,
                    days: row.days,
                    missing_document: 'Certificado médico'
                },
                severity: 'critical'
            }));

        } catch (error) {
            console.error('❌ Error validando documentación:', error);
            return [];
        }
    }

    /**
     * Valida jornada máxima (Art. 196 LCT - 9 horas)
     */
    async validateWorkingHours(companyId, rule) {
        try {
            // Empleados con jornadas superiores a 9 horas
            const result = await db.query(`
                SELECT
                    employee_id,
                    date,
                    worked_hours
                FROM attendance_records
                WHERE company_id = $1
                AND worked_hours > 9
                AND date >= CURRENT_DATE - INTERVAL '30 days'
                ORDER BY date DESC
            `, [companyId]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                violation_date: row.date,
                details: {
                    date: row.date,
                    worked_hours: parseFloat(row.worked_hours).toFixed(2),
                    maximum_allowed: 9,
                    excess: (parseFloat(row.worked_hours) - 9).toFixed(2)
                },
                severity: 'critical'
            }));

        } catch (error) {
            console.error('❌ Error validando jornada máxima:', error);
            return [];
        }
    }

    /**
     * Registra violaciones en la base de datos
     */
    async recordViolations(companyId, rule, violations) {
        try {
            for (const violation of violations) {
                // Verificar si ya existe
                const existing = await db.query(`
                    SELECT id FROM compliance_violations
                    WHERE company_id = $1
                    AND rule_code = $2
                    AND employee_id = $3
                    AND violation_date = $4
                    AND status = 'active'
                `, [companyId, rule.rule_code, violation.employee_id, violation.violation_date]);

                if (existing.rows.length > 0) {
                    // Ya existe, actualizar
                    await db.query(`
                        UPDATE compliance_violations
                        SET violation_data = $1, updated_at = NOW()
                        WHERE id = $2
                    `, [JSON.stringify(violation.details), existing.rows[0].id]);
                } else {
                    // Crear nueva violación
                    await db.query(`
                        INSERT INTO compliance_violations
                        (company_id, rule_code, employee_id, violation_date, violation_data, status)
                        VALUES ($1, $2, $3, $4, $5, 'active')
                    `, [
                        companyId,
                        rule.rule_code,
                        violation.employee_id,
                        violation.violation_date,
                        JSON.stringify(violation.details)
                    ]);
                }
            }

            console.log(`📝 [COMPLIANCE] ${violations.length} violaciones registradas para ${rule.rule_code}`);

        } catch (error) {
            console.error('❌ Error registrando violaciones:', error);
        }
    }

    /**
     * Obtiene dashboard de compliance para una empresa
     */
    async getComplianceDashboard(companyId) {
        try {
            // Validar todas las reglas
            const validation = await this.validateAllRules(companyId);

            // TODO: Tablas compliance_violations y compliance_rules no existen
            // Retornar datos vacíos temporalmente
            const violationsBySeverity = { rows: [] };
            const topViolations = { rows: [] };

            // Métricas por categoría
            const metrics = {
                rest_periods: await this.getMetricByType(companyId, 'rest_period'),
                overtime: await this.getMetricByType(companyId, 'overtime_limit'),
                vacations: await this.getMetricByType(companyId, 'vacation_expiry'),
                documentation: await this.getMetricByType(companyId, 'documentation'),
                working_hours: await this.getMetricByType(companyId, 'working_hours')
            };

            return {
                summary: {
                    compliance_percent: parseFloat(validation.compliance_percent),
                    total_violations: validation.violations.length,
                    critical_violations: validation.violations.filter(v => v.severity === 'critical').length,
                    warning_violations: validation.violations.filter(v => v.severity === 'warning').length
                },
                violations_by_severity: violationsBySeverity.rows,
                top_violations: topViolations.rows,
                metrics: metrics,
                last_validation: validation.validated_at
            };

        } catch (error) {
            console.error('❌ Error obteniendo dashboard:', error);
            throw error;
        }
    }

    /**
     * Obtiene métrica de cumplimiento por tipo
     */
    async getMetricByType(companyId, ruleType) {
        try {
            const result = await db.query(`
                SELECT
                    COUNT(cv.id) FILTER (WHERE cv.status = 'active') as active_violations,
                    COUNT(cv.id) FILTER (WHERE cv.status = 'resolved') as resolved_violations
                FROM compliance_violations cv
                JOIN compliance_rules cr ON cv.rule_code = cr.rule_code
                WHERE cv.company_id = $1
                AND cr.rule_type = $2
            `, [companyId, ruleType]);

            const data = result.rows[0];
            const total = parseInt(data.active_violations) + parseInt(data.resolved_violations);
            const compliant = total > 0 ? ((parseInt(data.resolved_violations) / total) * 100).toFixed(1) : 100;

            return {
                active_violations: parseInt(data.active_violations),
                resolved_violations: parseInt(data.resolved_violations),
                compliance_percent: parseFloat(compliant)
            };

        } catch (error) {
            return { active_violations: 0, resolved_violations: 0, compliance_percent: 100 };
        }
    }

    /**
     * Resuelve una violación (marca como resuelta)
     */
    async resolveViolation(violationId, resolvedBy, notes) {
        try {
            await db.query(`
                UPDATE compliance_violations
                SET status = 'resolved',
                    resolved_at = NOW(),
                    resolution_notes = $1
                WHERE id = $2
            `, [notes, violationId]);

            console.log(`✅ [COMPLIANCE] Violación ${violationId} resuelta por ${resolvedBy}`);

            return { resolved: true };

        } catch (error) {
            console.error('❌ Error resolviendo violación:', error);
            throw error;
        }
    }

    /**
     * Genera alertas automáticas para violaciones críticas
     */
    async generateComplianceAlerts(companyId) {
        try {
            const validation = await this.validateAllRules(companyId);

            // Filtrar violaciones críticas
            const criticalViolations = validation.violations.filter(v => v.severity === 'critical');

            if (criticalViolations.length === 0) {
                console.log(`✅ [COMPLIANCE] No hay violaciones críticas para empresa ${companyId}`);
                return { alerts_generated: 0 };
            }

            // Generar alerta para RRHH
            const alertContent = this.buildComplianceAlertMessage(criticalViolations, validation);

            // TODO: Crear notificación en el sistema
            // await notificationService.createSystemNotification(companyId, 'rrhh', alertContent);

            console.log(`⚠️ [COMPLIANCE] ${criticalViolations.length} alertas críticas generadas`);

            return {
                alerts_generated: criticalViolations.length,
                alert_content: alertContent
            };

        } catch (error) {
            console.error('❌ Error generando alertas:', error);
            throw error;
        }
    }

    /**
     * Construye mensaje de alerta de compliance
     */
    buildComplianceAlertMessage(violations, validation) {
        let message = `⚠️ ALERTA DE CUMPLIMIENTO LEGAL\n\n`;
        message += `Se detectaron ${violations.length} violaciones CRÍTICAS que requieren atención inmediata:\n\n`;

        violations.forEach((v, index) => {
            message += `${index + 1}. ${v.rule_name}\n`;
            message += `   - Violaciones: ${v.violation_count}\n`;
            message += `   - Severidad: ${v.severity.toUpperCase()}\n\n`;
        });

        message += `📊 Cumplimiento general: ${validation.compliance_percent}%\n`;
        message += `⚠️ Estas violaciones requieren acción correctiva inmediata\n`;

        return message;
    }

    /**
     * Obtiene todas las reglas activas
     */
    async getActiveRules() {
        try {
            // TODO: Tabla compliance_rules no existe - retornar array vacío temporalmente
            console.log('⚠️ [COMPLIANCE] Sistema temporalmente deshabilitado - esperando migración de BD');
            return [];

        } catch (error) {
            console.error('❌ Error obteniendo reglas:', error);
            return [];
        }
    }

    /**
     * Obtiene violaciones activas de una empresa
     */
    async getActiveViolations(companyId, options = {}) {
        try {
            let query = `
                SELECT
                    cv.*,
                    cr.legal_reference,
                    cr.severity
                FROM compliance_violations cv
                JOIN compliance_rules cr ON cv.rule_code = cr.rule_code
                WHERE cv.company_id = $1
                AND cv.status = 'active'
            `;

            const params = [companyId];

            if (options.severity) {
                params.push(options.severity);
                query += ` AND cr.severity = $${params.length}`;
            }

            if (options.employee_id) {
                params.push(options.employee_id);
                query += ` AND cv.employee_id = $${params.length}`;
            }

            query += ` ORDER BY cv.violation_date DESC`;

            if (options.limit) {
                params.push(options.limit);
                query += ` LIMIT $${params.length}`;
            }

            const result = await db.query(query, params);

            return result.rows;

        } catch (error) {
            console.error('❌ Error obteniendo violaciones:', error);
            return [];
        }
    }
}

module.exports = new ComplianceService();
