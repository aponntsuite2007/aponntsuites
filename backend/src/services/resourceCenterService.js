/**
 * RESOURCE CENTER SERVICE - Centro de Recursos y Tracking de Horas
 *
 * Servicio para rastrear y analizar utilización de recursos humanos,
 * horas trabajadas por categoría, asignación de tiempo y métricas de productividad
 *
 * VALOR: Visibilidad de utilización de recursos, detección de sobrecarga
 *
 * @version 2.0
 * @date 2025-10-16
 */

const { sequelize } = require('../config/database');

class ResourceCenterService {

    /**
     * Registra una transacción de recursos (horas trabajadas, ausencias, etc)
     *
     * @param {number} companyId - ID de la empresa
     * @param {number} departmentId - ID del departamento (opcional)
     * @param {string} employeeId - ID del empleado
     * @param {string} category - Categoría ('overtime', 'leave', 'shift_swaps', 'training', etc)
     * @param {number} hours - Cantidad de horas
     * @param {string} description - Descripción
     * @param {Object} metadata - Datos adicionales
     * @returns {Promise<Object>} - Transacción creada
     */
    async recordTransaction(companyId, departmentId, employeeId, category, hours, description, metadata = {}) {
        try {
            const result = await sequelize.query(`
                INSERT INTO cost_transactions
                (company_id, department_id, employee_id, cost_category, description, metadata, transaction_date)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING *
            `, [companyId, departmentId, employeeId, category, description, JSON.stringify({ ...metadata, hours })]);

            console.log(`📝 [RESOURCE] Registradas ${hours}h para ${employeeId} en categoría ${category}`);

            return result.rows[0];

        } catch (error) {
            console.error('❌ [RESOURCE] Error registrando transacción:', error);
            throw error;
        }
    }

    /**
     * Obtiene resumen de horas por categoría para un período
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @param {number} departmentId - ID del departamento (opcional)
     * @returns {Promise<Object>} - Resumen de horas
     */
    async getHoursSummary(companyId, startDate, endDate, departmentId = null) {
        try {
            let query = `
                SELECT
                    cost_category as category,
                    COUNT(DISTINCT employee_id) as employees_count,
                    COUNT(*) as transactions_count,
                    SUM((metadata->>'hours')::numeric) as total_hours,
                    AVG((metadata->>'hours')::numeric) as avg_hours_per_transaction
                FROM cost_transactions
                WHERE company_id = $1
                AND transaction_date BETWEEN $2 AND $3
            `;

            const params = [companyId, startDate, endDate];

            if (departmentId) {
                params.push(departmentId);
                query += ` AND department_id = $${params.length}`;
            }

            query += ` GROUP BY cost_category ORDER BY total_hours DESC`;

            const result = await sequelize.query(query, params);

            // Calcular totales generales
            const totalHours = result.rows.reduce((sum, row) => sum + parseFloat(row.total_hours || 0), 0);
            const totalTransactions = result.rows.reduce((sum, row) => sum + parseInt(row.transactions_count), 0);

            return {
                period: { start: startDate, end: endDate },
                department_id: departmentId,
                summary: {
                    total_hours: parseFloat(totalHours.toFixed(2)),
                    total_transactions: totalTransactions,
                    categories_count: result.rows.length
                },
                by_category: result.rows.map(row => ({
                    category: row.category,
                    employees_count: parseInt(row.employees_count),
                    transactions_count: parseInt(row.transactions_count),
                    total_hours: parseFloat(row.total_hours).toFixed(2),
                    avg_hours: parseFloat(row.avg_hours_per_transaction).toFixed(2),
                    percentage: ((parseFloat(row.total_hours) / totalHours) * 100).toFixed(2)
                }))
            };

        } catch (error) {
            console.error('❌ [RESOURCE] Error obteniendo resumen de horas:', error);
            throw error;
        }
    }

    /**
     * Obtiene utilización de recursos por departamento
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @returns {Promise<Array>} - Utilización por departamento
     */
    async getDepartmentUtilization(companyId, startDate, endDate) {
        try {
            const result = await sequelize.query(`
                SELECT
                    department_id,
                    cost_category as category,
                    COUNT(DISTINCT employee_id) as employees_count,
                    SUM((metadata->>'hours')::numeric) as total_hours
                FROM cost_transactions
                WHERE company_id = $1
                AND transaction_date BETWEEN $2 AND $3
                AND department_id IS NOT NULL
                GROUP BY department_id, cost_category
                ORDER BY department_id, total_hours DESC
            `, [companyId, startDate, endDate]);

            // Agrupar por departamento
            const departments = {};

            result.rows.forEach(row => {
                const deptId = row.department_id;
                if (!departments[deptId]) {
                    departments[deptId] = {
                        department_id: deptId,
                        total_hours: 0,
                        employees_count: new Set(),
                        categories: []
                    };
                }

                const hours = parseFloat(row.total_hours || 0);
                departments[deptId].total_hours += hours;
                departments[deptId].employees_count.add(...Array(parseInt(row.employees_count)).keys());
                departments[deptId].categories.push({
                    category: row.category,
                    hours: hours.toFixed(2),
                    employees_count: parseInt(row.employees_count)
                });
            });

            // Convertir a array y calcular porcentajes
            const deptArray = Object.values(departments).map(dept => ({
                ...dept,
                total_hours: dept.total_hours.toFixed(2),
                employees_count: dept.employees_count.size,
                avg_hours_per_employee: (dept.total_hours / dept.employees_count.size).toFixed(2)
            }));

            const totalHours = deptArray.reduce((sum, d) => sum + parseFloat(d.total_hours), 0);

            return deptArray.map(dept => ({
                ...dept,
                percentage_of_total: ((parseFloat(dept.total_hours) / totalHours) * 100).toFixed(2)
            })).sort((a, b) => parseFloat(b.total_hours) - parseFloat(a.total_hours));

        } catch (error) {
            console.error('❌ [RESOURCE] Error obteniendo utilización por departamento:', error);
            throw error;
        }
    }

    /**
     * Obtiene utilización de recursos por empleado
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @param {number} limit - Límite de resultados
     * @returns {Promise<Array>} - Top empleados por horas
     */
    async getEmployeeUtilization(companyId, startDate, endDate, limit = 50) {
        try {
            const result = await sequelize.query(`
                SELECT
                    employee_id,
                    department_id,
                    cost_category as category,
                    COUNT(*) as transactions_count,
                    SUM((metadata->>'hours')::numeric) as total_hours
                FROM cost_transactions
                WHERE company_id = $1
                AND transaction_date BETWEEN $2 AND $3
                GROUP BY employee_id, department_id, cost_category
                ORDER BY employee_id
            `, [companyId, startDate, endDate]);

            // Agrupar por empleado
            const employees = {};

            result.rows.forEach(row => {
                const empId = row.employee_id;
                if (!employees[empId]) {
                    employees[empId] = {
                        employee_id: empId,
                        department_id: row.department_id,
                        total_hours: 0,
                        transactions_count: 0,
                        categories: []
                    };
                }

                const hours = parseFloat(row.total_hours || 0);
                employees[empId].total_hours += hours;
                employees[empId].transactions_count += parseInt(row.transactions_count);
                employees[empId].categories.push({
                    category: row.category,
                    hours: hours.toFixed(2),
                    transactions: parseInt(row.transactions_count)
                });
            });

            // Convertir a array y ordenar
            return Object.values(employees)
                .map(emp => ({
                    ...emp,
                    total_hours: parseFloat(emp.total_hours.toFixed(2)),
                    avg_hours_per_transaction: (emp.total_hours / emp.transactions_count).toFixed(2)
                }))
                .sort((a, b) => b.total_hours - a.total_hours)
                .slice(0, limit);

        } catch (error) {
            console.error('❌ [RESOURCE] Error obteniendo utilización por empleado:', error);
            throw error;
        }
    }

    /**
     * Detecta sobrecarga de trabajo (empleados con muchas horas extra)
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @param {number} overtimeThreshold - Umbral de horas extra (default: 30h/mes)
     * @returns {Promise<Array>} - Empleados en sobrecarga
     */
    async detectWorkloadOverload(companyId, startDate, endDate, overtimeThreshold = 30) {
        try {
            const result = await sequelize.query(`
                SELECT
                    employee_id,
                    department_id,
                    SUM((metadata->>'hours')::numeric) as overtime_hours,
                    COUNT(*) as overtime_events
                FROM cost_transactions
                WHERE company_id = $1
                AND transaction_date BETWEEN $2 AND $3
                AND cost_category = 'overtime'
                GROUP BY employee_id, department_id
                HAVING SUM((metadata->>'hours')::numeric) > $4
                ORDER BY overtime_hours DESC
            `, [companyId, startDate, endDate, overtimeThreshold]);

            return result.rows.map(row => ({
                employee_id: row.employee_id,
                department_id: row.department_id,
                overtime_hours: parseFloat(row.overtime_hours).toFixed(2),
                overtime_events: parseInt(row.overtime_events),
                threshold: overtimeThreshold,
                excess_hours: (parseFloat(row.overtime_hours) - overtimeThreshold).toFixed(2),
                risk_level: this.calculateRiskLevel(parseFloat(row.overtime_hours), overtimeThreshold)
            }));

        } catch (error) {
            console.error('❌ [RESOURCE] Error detectando sobrecarga:', error);
            throw error;
        }
    }

    /**
     * Calcula nivel de riesgo basado en horas extra
     */
    calculateRiskLevel(overtimeHours, threshold) {
        const ratio = overtimeHours / threshold;

        if (ratio >= 2) return 'critical'; // Doble del límite
        if (ratio >= 1.5) return 'high';
        if (ratio >= 1.2) return 'medium';
        return 'low';
    }

    /**
     * Obtiene alertas de presupuesto de horas (budgets definidos por empresa)
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @returns {Promise<Array>} - Alertas de presupuesto
     */
    async getBudgetAlerts(companyId, startDate, endDate) {
        try {
            // Obtener budgets definidos
            const budgets = await sequelize.query(`
                SELECT
                    id,
                    department_id,
                    cost_category,
                    alert_threshold_percent,
                    period_start,
                    period_end
                FROM cost_budgets
                WHERE company_id = $1
                AND period_start <= $2
                AND period_end >= $3
            `, [companyId, endDate, startDate]);

            if (budgets.rows.length === 0) {
                return [];
            }

            const alerts = [];

            for (const budget of budgets.rows) {
                // Calcular horas gastadas para este budget
                const spent = await sequelize.query(`
                    SELECT
                        COALESCE(SUM((metadata->>'hours')::numeric), 0) as total_hours
                    FROM cost_transactions
                    WHERE company_id = $1
                    AND cost_category = $2
                    ${budget.department_id ? 'AND department_id = $3' : ''}
                    AND transaction_date BETWEEN $${budget.department_id ? 4 : 3} AND $${budget.department_id ? 5 : 4}
                `, budget.department_id
                    ? [companyId, budget.cost_category, budget.department_id, budget.period_start, budget.period_end]
                    : [companyId, budget.cost_category, budget.period_start, budget.period_end]
                );

                const totalHours = parseFloat(spent.rows[0].total_hours);

                // Nota: Como no tenemos budget_amount en horas, asumimos que alert_threshold_percent
                // se refiere a un porcentaje de uso general (podría configurarse)

                alerts.push({
                    budget_id: budget.id,
                    department_id: budget.department_id,
                    category: budget.cost_category,
                    period: {
                        start: budget.period_start,
                        end: budget.period_end
                    },
                    total_hours_used: totalHours.toFixed(2),
                    alert_threshold_percent: budget.alert_threshold_percent,
                    status: totalHours > 0 ? 'active' : 'no_usage'
                });
            }

            return alerts;

        } catch (error) {
            console.error('❌ [RESOURCE] Error obteniendo alertas de presupuesto:', error);
            throw error;
        }
    }

    /**
     * Obtiene dashboard completo de recursos
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @returns {Promise<Object>} - Dashboard completo
     */
    async getResourceDashboard(companyId, startDate, endDate) {
        try {
            console.log(`📊 [RESOURCE] Generando dashboard para empresa ${companyId}...`);

            // 1. Resumen general de horas
            const summary = await this.getHoursSummary(companyId, startDate, endDate);

            // 2. Utilización por departamento
            const departmentUtilization = await this.getDepartmentUtilization(companyId, startDate, endDate);

            // 3. Top 20 empleados por horas
            const topEmployees = await this.getEmployeeUtilization(companyId, startDate, endDate, 20);

            // 4. Detectar sobrecarga
            const overloadAlerts = await this.detectWorkloadOverload(companyId, startDate, endDate);

            // 5. Alertas de presupuesto
            const budgetAlerts = await this.getBudgetAlerts(companyId, startDate, endDate);

            return {
                period: { start: startDate, end: endDate },
                summary: summary.summary,
                hours_by_category: summary.by_category,
                department_utilization: departmentUtilization.slice(0, 10), // Top 10 departamentos
                top_employees: topEmployees.slice(0, 10), // Top 10 empleados
                alerts: {
                    workload_overload: overloadAlerts,
                    budget_alerts: budgetAlerts,
                    total_alerts: overloadAlerts.length + budgetAlerts.length
                }
            };

        } catch (error) {
            console.error('❌ [RESOURCE] Error generando dashboard:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de un empleado específico
     *
     * @param {string} employeeId - ID del empleado
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @returns {Promise<Object>} - Estadísticas del empleado
     */
    async getEmployeeStats(employeeId, companyId, startDate, endDate) {
        try {
            const result = await sequelize.query(`
                SELECT
                    cost_category as category,
                    COUNT(*) as transactions_count,
                    SUM((metadata->>'hours')::numeric) as total_hours,
                    AVG((metadata->>'hours')::numeric) as avg_hours
                FROM cost_transactions
                WHERE employee_id = $1
                AND company_id = $2
                AND transaction_date BETWEEN $3 AND $4
                GROUP BY cost_category
                ORDER BY total_hours DESC
            `, [employeeId, companyId, startDate, endDate]);

            const totalHours = result.rows.reduce((sum, row) => sum + parseFloat(row.total_hours || 0), 0);
            const totalTransactions = result.rows.reduce((sum, row) => sum + parseInt(row.transactions_count), 0);

            return {
                employee_id: employeeId,
                period: { start: startDate, end: endDate },
                summary: {
                    total_hours: totalHours.toFixed(2),
                    total_transactions: totalTransactions,
                    categories_count: result.rows.length
                },
                by_category: result.rows.map(row => ({
                    category: row.category,
                    transactions_count: parseInt(row.transactions_count),
                    total_hours: parseFloat(row.total_hours).toFixed(2),
                    avg_hours: parseFloat(row.avg_hours).toFixed(2),
                    percentage: ((parseFloat(row.total_hours) / totalHours) * 100).toFixed(2)
                }))
            };

        } catch (error) {
            console.error('❌ [RESOURCE] Error obteniendo stats de empleado:', error);
            throw error;
        }
    }

    /**
     * Obtiene comparación entre períodos
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} currentStart - Inicio período actual
     * @param {Date} currentEnd - Fin período actual
     * @param {Date} previousStart - Inicio período anterior
     * @param {Date} previousEnd - Fin período anterior
     * @returns {Promise<Object>} - Comparación
     */
    async comparePeriods(companyId, currentStart, currentEnd, previousStart, previousEnd) {
        try {
            const currentSummary = await this.getHoursSummary(companyId, currentStart, currentEnd);
            const previousSummary = await this.getHoursSummary(companyId, previousStart, previousEnd);

            const changes = {
                total_hours: (currentSummary.summary.total_hours - previousSummary.summary.total_hours).toFixed(2),
                total_transactions: currentSummary.summary.total_transactions - previousSummary.summary.total_transactions,
                total_hours_percent: previousSummary.summary.total_hours > 0
                    ? (((currentSummary.summary.total_hours - previousSummary.summary.total_hours) / previousSummary.summary.total_hours) * 100).toFixed(2)
                    : '0.00'
            };

            return {
                current: {
                    period: { start: currentStart, end: currentEnd },
                    summary: currentSummary.summary
                },
                previous: {
                    period: { start: previousStart, end: previousEnd },
                    summary: previousSummary.summary
                },
                changes: changes
            };

        } catch (error) {
            console.error('❌ [RESOURCE] Error comparando períodos:', error);
            throw error;
        }
    }

    /**
     * Obtiene período actual (mes actual)
     */
    getCurrentPeriod() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { start, end };
    }

    /**
     * Obtiene período anterior (mes anterior)
     */
    getPreviousPeriod() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start, end };
    }
}

module.exports = new ResourceCenterService();
