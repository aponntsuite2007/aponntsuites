/**
 * RISK INTELLIGENCE SERVICE v3.0 - RBAC SSOT Integration
 * Servicio de Análisis de Riesgo Laboral - Conexión SSOT Real
 *
 * Consulta tablas reales: attendances, users, sanctions, vacations, departments
 * Calcula índices de riesgo basado en datos reales
 *
 * NUEVO v3.0:
 * - Integración con RBACService para umbrales dinámicos
 * - Segmentación por tipo de trabajo (work_category)
 * - Soporte para benchmarks internacionales (OIT, OSHA, SRT)
 * - Métodos: manual, quartile, benchmark, hybrid
 *
 * @version 3.0.0 - RBAC Unified SSOT
 * @date 2025-12-07
 */

const { sequelize, OrganizationalPosition, CompanyRiskConfig, RiskBenchmark } = require('../config/database');
const { QueryTypes, Op } = require('sequelize');
const RBACService = require('./RBACService');

// Configuración de índices DEFAULT (fallback si no hay config de empresa)
const DEFAULT_RISK_CONFIG = {
    FATIGUE: {
        id: 'fatigue',
        weight: 0.25,
        thresholds: { low: 30, medium: 60, high: 80, critical: 90 },
        // Parámetros de cálculo
        maxDailyHours: 8,        // Jornada normal
        maxWeeklyHours: 48,      // Máximo semanal LCT
        minRestHours: 12         // Descanso mínimo entre jornadas
    },
    ACCIDENT: {
        id: 'accident',
        weight: 0.25,
        thresholds: { low: 20, medium: 50, high: 70, critical: 85 },
        excludeJobTypes: ['administrative', 'administrativo', 'remote', 'remoto', 'oficina']
    },
    LEGAL_CLAIM: {
        id: 'legal_claim',
        weight: 0.20,
        thresholds: { low: 25, medium: 50, high: 70, critical: 85 }
    },
    PERFORMANCE: {
        id: 'performance',
        weight: 0.15,
        thresholds: { low: 30, medium: 55, high: 75, critical: 90 }
    },
    TURNOVER: {
        id: 'turnover',
        weight: 0.15,
        thresholds: { low: 25, medium: 50, high: 70, critical: 85 }
    }
};

// Alias para compatibilidad con código existente
const RISK_CONFIG = DEFAULT_RISK_CONFIG;

class RiskIntelligenceService {

    /**
     * Obtener dashboard completo de riesgos
     */
    static async getDashboard(companyId, period = 30) {
        try {
            const [employees, stats, indices] = await Promise.all([
                this.getEmployeesWithRisk(companyId, period),
                this.calculateStats(companyId, period),
                this.calculateGlobalIndices(companyId, period)
            ]);

            return {
                success: true,
                stats,
                indices,
                employees,
                lastUpdate: new Date().toISOString(),
                period: `${period}d`
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error getDashboard:', error);
            throw error;
        }
    }

    /**
     * Obtener empleados con análisis de riesgo
     */
    static async getEmployeesWithRisk(companyId, period = 30) {
        try {
            // Obtener empleados activos de la empresa
            const employees = await sequelize.query(`
                SELECT
                    u.user_id as id,
                    u."firstName" || ' ' || u."lastName" as name,
                    u."employeeId" as employee_id,
                    u.position,
                    u.position as job_type,
                    u."hireDate" as hire_date,
                    d.name as department,
                    d.id as department_id
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.company_id = :companyId
                  AND u.is_active = true
                  AND u.role != 'admin'
                ORDER BY u."lastName", u."firstName"
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            // Calcular índices para cada empleado
            const employeesWithRisk = await Promise.all(
                employees.map(async (emp) => {
                    const indices = await this.calculateEmployeeIndices(emp.id, companyId, period);
                    const riskScore = this.calculateOverallRisk(indices);

                    return {
                        id: emp.id,
                        name: emp.name,
                        employee_id: emp.employee_id,
                        department: emp.department || 'Sin departamento',
                        department_id: emp.department_id,
                        position: emp.position,
                        job_type: emp.job_type,
                        hire_date: emp.hire_date,
                        risk_score: riskScore,
                        indices
                    };
                })
            );

            // Ordenar por riesgo descendente
            return employeesWithRisk.sort((a, b) => b.risk_score - a.risk_score);

        } catch (error) {
            console.error('[RiskIntelligence] Error getEmployeesWithRisk:', error);
            throw error;
        }
    }

    /**
     * Calcular índices de riesgo para un empleado específico
     */
    static async calculateEmployeeIndices(userId, companyId, period = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        const indices = {};

        // 1. ÍNDICE DE FATIGA
        indices.fatigue = await this.calculateFatigueIndex(userId, companyId, startDate);

        // 2. RIESGO DE ACCIDENTE (solo si no es administrativo)
        const employee = await this.getEmployeeJobType(userId);
        if (!this.isAdministrative(employee?.job_type)) {
            indices.accident = await this.calculateAccidentRisk(userId, companyId, startDate, indices.fatigue);
        } else {
            indices.accident = 0; // N/A para administrativos
        }

        // 3. RIESGO DE RECLAMO LEGAL
        indices.legal_claim = await this.calculateLegalClaimRisk(userId, companyId, startDate);

        // 4. RIESGO DE BAJO RENDIMIENTO
        indices.performance = await this.calculatePerformanceRisk(userId, companyId, startDate);

        // 5. RIESGO DE ROTACIÓN
        indices.turnover = await this.calculateTurnoverRisk(userId, companyId);

        return indices;
    }

    /**
     * ÍNDICE DE FATIGA - Basado en horas trabajadas y descansos
     */
    static async calculateFatigueIndex(userId, companyId, startDate) {
        try {
            const [attendance] = await sequelize.query(`
                SELECT
                    COUNT(*) as total_days,
                    COALESCE(SUM(
                        CASE WHEN "checkOutTime" IS NOT NULL
                        THEN EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) / 3600.0
                        ELSE 0 END
                    ), 0) as total_hours,
                    COALESCE(AVG(
                        CASE WHEN "checkOutTime" IS NOT NULL
                        THEN EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) / 3600.0
                        ELSE 0 END
                    ), 0) as avg_daily_hours,
                    COUNT(CASE WHEN EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) / 3600.0 > 10 THEN 1 END) as long_days,
                    COUNT(CASE WHEN EXTRACT(DOW FROM "checkInTime") IN (0, 6) THEN 1 END) as weekend_days
                FROM attendances
                WHERE "UserId" = :userId
                  AND company_id = :companyId
                  AND "checkInTime" >= :startDate
                  AND status = 'completed'
            `, {
                replacements: { userId, companyId, startDate },
                type: QueryTypes.SELECT
            });

            const data = attendance || {};
            let fatigueScore = 0;

            // Factor 1: Promedio de horas diarias (peso 40%)
            const avgHours = parseFloat(data.avg_daily_hours) || 0;
            if (avgHours > 12) fatigueScore += 40;
            else if (avgHours > 10) fatigueScore += 30;
            else if (avgHours > 9) fatigueScore += 20;
            else if (avgHours > 8) fatigueScore += 10;

            // Factor 2: Días largos (>10h) (peso 30%)
            const longDaysRatio = (parseInt(data.long_days) || 0) / Math.max(parseInt(data.total_days) || 1, 1);
            fatigueScore += Math.min(longDaysRatio * 100, 30);

            // Factor 3: Trabajo en fines de semana (peso 20%)
            const weekendRatio = (parseInt(data.weekend_days) || 0) / Math.max(parseInt(data.total_days) || 1, 1);
            fatigueScore += Math.min(weekendRatio * 100, 20);

            // Factor 4: Total de horas en el período (peso 10%)
            const expectedHours = 8 * 22; // ~22 días laborables
            const hoursRatio = (parseFloat(data.total_hours) || 0) / expectedHours;
            if (hoursRatio > 1.3) fatigueScore += 10;
            else if (hoursRatio > 1.1) fatigueScore += 5;

            return Math.min(Math.round(fatigueScore), 100);

        } catch (error) {
            console.error('[RiskIntelligence] Error calculateFatigueIndex:', error);
            return 0;
        }
    }

    /**
     * RIESGO DE ACCIDENTE - Basado en fatiga, sanciones y tipo de trabajo
     */
    static async calculateAccidentRisk(userId, companyId, startDate, fatigueIndex) {
        try {
            // Obtener sanciones recientes
            const [sanctions] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM sanctions
                WHERE user_id = :userId
                  AND company_id = :companyId
                  AND created_at >= :startDate
            `, {
                replacements: { userId, companyId, startDate },
                type: QueryTypes.SELECT
            });

            let accidentScore = 0;

            // Factor 1: Fatiga contribuye al riesgo (peso 50%)
            accidentScore += (fatigueIndex || 0) * 0.5;

            // Factor 2: Sanciones recientes (peso 30%)
            const sanctionCount = parseInt(sanctions?.count) || 0;
            if (sanctionCount >= 3) accidentScore += 30;
            else if (sanctionCount >= 2) accidentScore += 20;
            else if (sanctionCount >= 1) accidentScore += 10;

            // Factor 3: Base de riesgo por tipo de trabajo (peso 20%)
            // TODO: Integrar con clasificación de puestos de trabajo
            accidentScore += 10; // Base para trabajo no administrativo

            return Math.min(Math.round(accidentScore), 100);

        } catch (error) {
            console.error('[RiskIntelligence] Error calculateAccidentRisk:', error);
            return 0;
        }
    }

    /**
     * RIESGO DE RECLAMO LEGAL - Basado en violaciones laborales
     */
    static async calculateLegalClaimRisk(userId, companyId, startDate) {
        try {
            // Horas extras excesivas
            const [overtime] = await sequelize.query(`
                SELECT
                    COUNT(CASE WHEN EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) / 3600.0 > 9 THEN 1 END) as overtime_days,
                    COUNT(*) as total_days
                FROM attendances
                WHERE "UserId" = :userId
                  AND company_id = :companyId
                  AND "checkInTime" >= :startDate
                  AND status = 'completed'
            `, {
                replacements: { userId, companyId, startDate },
                type: QueryTypes.SELECT
            });

            // Vacaciones pendientes
            const [vacations] = await sequelize.query(`
                SELECT
                    COALESCE(SUM(days_requested), 0) as days_taken
                FROM vacation_requests
                WHERE user_id = :userId
                  AND company_id = :companyId
                  AND status = 'approved'
                  AND start_date >= NOW() - INTERVAL '1 year'
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.SELECT
            });

            let legalScore = 0;

            // Factor 1: Overtime frecuente (peso 40%)
            const overtimeRatio = (parseInt(overtime?.overtime_days) || 0) / Math.max(parseInt(overtime?.total_days) || 1, 1);
            if (overtimeRatio > 0.5) legalScore += 40;
            else if (overtimeRatio > 0.3) legalScore += 25;
            else if (overtimeRatio > 0.1) legalScore += 10;

            // Factor 2: Vacaciones no tomadas (peso 40%)
            const daysTaken = parseInt(vacations?.days_taken) || 0;
            const minVacationDays = 14; // Mínimo legal Argentina
            if (daysTaken < 5) legalScore += 40;
            else if (daysTaken < minVacationDays) legalScore += 25;
            else if (daysTaken < minVacationDays + 7) legalScore += 10;

            // Factor 3: Base (peso 20%)
            legalScore += 5; // Base mínima

            return Math.min(Math.round(legalScore), 100);

        } catch (error) {
            console.error('[RiskIntelligence] Error calculateLegalClaimRisk:', error);
            return 0;
        }
    }

    /**
     * RIESGO DE BAJO RENDIMIENTO - Basado en llegadas tarde y ausencias
     */
    static async calculatePerformanceRisk(userId, companyId, startDate) {
        try {
            const [attendance] = await sequelize.query(`
                SELECT
                    COUNT(*) as total_days,
                    COUNT(CASE WHEN authorization_status = 'pending' THEN 1 END) as late_days,
                    0 as total_late_minutes,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days
                FROM attendances
                WHERE "UserId" = :userId
                  AND company_id = :companyId
                  AND "checkInTime" >= :startDate
            `, {
                replacements: { userId, companyId, startDate },
                type: QueryTypes.SELECT
            });

            // Sanciones
            const [sanctions] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM sanctions
                WHERE user_id = :userId
                  AND company_id = :companyId
                  AND created_at >= :startDate
            `, {
                replacements: { userId, companyId, startDate },
                type: QueryTypes.SELECT
            });

            let performanceScore = 0;
            const totalDays = Math.max(parseInt(attendance?.total_days) || 1, 1);

            // Factor 1: Llegadas tarde (peso 35%)
            const lateRatio = (parseInt(attendance?.late_days) || 0) / totalDays;
            if (lateRatio > 0.3) performanceScore += 35;
            else if (lateRatio > 0.2) performanceScore += 25;
            else if (lateRatio > 0.1) performanceScore += 15;
            else if (lateRatio > 0.05) performanceScore += 5;

            // Factor 2: Ausencias (peso 35%)
            const absentRatio = (parseInt(attendance?.absent_days) || 0) / totalDays;
            if (absentRatio > 0.15) performanceScore += 35;
            else if (absentRatio > 0.1) performanceScore += 25;
            else if (absentRatio > 0.05) performanceScore += 15;
            else if (absentRatio > 0.02) performanceScore += 5;

            // Factor 3: Sanciones (peso 30%)
            const sanctionCount = parseInt(sanctions?.count) || 0;
            if (sanctionCount >= 3) performanceScore += 30;
            else if (sanctionCount >= 2) performanceScore += 20;
            else if (sanctionCount >= 1) performanceScore += 10;

            return Math.min(Math.round(performanceScore), 100);

        } catch (error) {
            console.error('[RiskIntelligence] Error calculatePerformanceRisk:', error);
            return 0;
        }
    }

    /**
     * RIESGO DE ROTACIÓN - Basado en antigüedad y factores
     */
    static async calculateTurnoverRisk(userId, companyId) {
        try {
            const [employee] = await sequelize.query(`
                SELECT
                    u."hireDate" as hire_date,
                    EXTRACT(YEAR FROM AGE(NOW(), u."hireDate")) * 12 +
                    EXTRACT(MONTH FROM AGE(NOW(), u."hireDate")) as tenure_months,
                    (SELECT COUNT(*) FROM sanctions s WHERE s.user_id = u.user_id AND s.created_at >= NOW() - INTERVAL '6 months') as recent_sanctions
                FROM users u
                WHERE u.user_id = :userId
            `, {
                replacements: { userId },
                type: QueryTypes.SELECT
            });

            let turnoverScore = 0;
            const tenureMonths = parseInt(employee?.tenure_months) || 0;

            // Factor 1: Antigüedad (peso 50%)
            // Empleados nuevos o muy antiguos tienen mayor riesgo
            if (tenureMonths < 3) turnoverScore += 40; // Período de prueba
            else if (tenureMonths < 6) turnoverScore += 25;
            else if (tenureMonths < 12) turnoverScore += 15;
            else if (tenureMonths > 60) turnoverScore += 20; // Más de 5 años
            else if (tenureMonths > 36) turnoverScore += 10;

            // Factor 2: Sanciones recientes (peso 30%)
            const recentSanctions = parseInt(employee?.recent_sanctions) || 0;
            if (recentSanctions >= 2) turnoverScore += 30;
            else if (recentSanctions >= 1) turnoverScore += 15;

            // Factor 3: Base (peso 20%)
            turnoverScore += 5; // Base mínima

            return Math.min(Math.round(turnoverScore), 100);

        } catch (error) {
            console.error('[RiskIntelligence] Error calculateTurnoverRisk:', error);
            return 0;
        }
    }

    /**
     * Calcular riesgo global ponderado
     */
    static calculateOverallRisk(indices) {
        let totalWeight = 0;
        let weightedSum = 0;

        for (const [key, config] of Object.entries(RISK_CONFIG)) {
            const indexId = config.id;
            const value = indices[indexId];

            if (value !== undefined && value !== null) {
                weightedSum += value * config.weight;
                totalWeight += config.weight;
            }
        }

        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }

    /**
     * Calcular índices globales de la empresa
     */
    static async calculateGlobalIndices(companyId, period = 30) {
        try {
            const employees = await this.getEmployeesWithRisk(companyId, period);

            if (employees.length === 0) {
                return { fatigue: 0, accident: 0, legal_claim: 0, performance: 0, turnover: 0 };
            }

            const indices = { fatigue: 0, accident: 0, legal_claim: 0, performance: 0, turnover: 0 };
            const counts = { fatigue: 0, accident: 0, legal_claim: 0, performance: 0, turnover: 0 };

            for (const emp of employees) {
                for (const [key, value] of Object.entries(emp.indices || {})) {
                    if (value !== undefined && value !== null && value > 0) {
                        indices[key] = (indices[key] || 0) + value;
                        counts[key] = (counts[key] || 0) + 1;
                    }
                }
            }

            // Calcular promedios
            for (const key of Object.keys(indices)) {
                indices[key] = counts[key] > 0 ? Math.round(indices[key] / counts[key]) : 0;
            }

            return indices;

        } catch (error) {
            console.error('[RiskIntelligence] Error calculateGlobalIndices:', error);
            return { fatigue: 0, accident: 0, legal_claim: 0, performance: 0, turnover: 0 };
        }
    }

    /**
     * Calcular estadísticas generales
     */
    static async calculateStats(companyId, period = 30) {
        try {
            const employees = await this.getEmployeesWithRisk(companyId, period);

            const criticalCount = employees.filter(e => e.risk_score >= 80).length;
            const highCount = employees.filter(e => e.risk_score >= 60 && e.risk_score < 80).length;
            const averageRisk = employees.length > 0
                ? Math.round(employees.reduce((sum, e) => sum + e.risk_score, 0) / employees.length)
                : 0;

            // Obtener violaciones activas (sanciones sin resolver del período)
            const [violations] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM sanctions
                WHERE company_id = :companyId
                  AND created_at >= NOW() - INTERVAL '${period} days'
                  AND (resolved_at IS NULL OR resolved_at > NOW())
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            return {
                criticalCount,
                highCount,
                activeViolations: parseInt(violations?.count) || 0,
                averageRisk,
                compliancePercent: 100 - averageRisk,
                totalEmployees: employees.length,
                aiAnalysisCount: employees.length
            };

        } catch (error) {
            console.error('[RiskIntelligence] Error calculateStats:', error);
            return {
                criticalCount: 0,
                highCount: 0,
                activeViolations: 0,
                averageRisk: 0,
                compliancePercent: 100,
                totalEmployees: 0,
                aiAnalysisCount: 0
            };
        }
    }

    /**
     * Obtener análisis de riesgo de un empleado específico
     */
    static async getEmployeeRiskAnalysis(userId, companyId, period = 30) {
        try {
            const [employee] = await sequelize.query(`
                SELECT
                    u.user_id as id,
                    u."firstName" || ' ' || u."lastName" as name,
                    u."employeeId" as employee_id,
                    u.position,
                    u.position as job_type,
                    u."hireDate" as hire_date,
                    u.email,
                    d.name as department
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.user_id = :userId AND u.company_id = :companyId
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.SELECT
            });

            if (!employee) {
                throw new Error('Empleado no encontrado');
            }

            const indices = await this.calculateEmployeeIndices(userId, companyId, period);
            const riskScore = this.calculateOverallRisk(indices);

            // Obtener historial de sanciones
            const [sanctions] = await sequelize.query(`
                SELECT id, type, description, severity, created_at
                FROM sanctions
                WHERE user_id = :userId
                ORDER BY created_at DESC
                LIMIT 5
            `, {
                replacements: { userId },
                type: QueryTypes.SELECT
            });

            // Obtener resumen de asistencia
            const [attendanceSummary] = await sequelize.query(`
                SELECT
                    COUNT(*) as total_days,
                    COUNT(CASE WHEN late_minutes > 0 THEN 1 END) as late_days,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0), 0) as avg_hours
                FROM attendances
                WHERE user_id = :userId
                  AND check_in >= NOW() - INTERVAL '${period} days'
            `, {
                replacements: { userId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                employee: {
                    ...employee,
                    risk_score: riskScore,
                    indices
                },
                sanctions: sanctions || [],
                attendanceSummary: attendanceSummary || {},
                recommendations: this.generateRecommendations(indices, riskScore)
            };

        } catch (error) {
            console.error('[RiskIntelligence] Error getEmployeeRiskAnalysis:', error);
            throw error;
        }
    }

    /**
     * Generar recomendaciones basadas en índices
     */
    static generateRecommendations(indices, overallRisk) {
        const recommendations = [];

        if (indices.fatigue > 70) {
            recommendations.push({
                type: 'fatigue',
                priority: 'high',
                message: 'Revisar distribución de horarios y carga de trabajo',
                action: 'Considerar redistribución de turnos o descanso compensatorio'
            });
        }

        if (indices.accident > 60) {
            recommendations.push({
                type: 'accident',
                priority: 'high',
                message: 'Alto riesgo de accidente laboral',
                action: 'Verificar EPP, capacitación en seguridad y condiciones del puesto'
            });
        }

        if (indices.legal_claim > 60) {
            recommendations.push({
                type: 'legal',
                priority: 'medium',
                message: 'Posibles incumplimientos normativos detectados',
                action: 'Revisar cumplimiento de LCT (horas extras, descansos, vacaciones)'
            });
        }

        if (indices.performance > 65) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Indicadores de bajo rendimiento',
                action: 'Evaluar motivación, capacitación adicional o reasignación'
            });
        }

        if (indices.turnover > 60) {
            recommendations.push({
                type: 'turnover',
                priority: 'medium',
                message: 'Riesgo de rotación elevado',
                action: 'Considerar entrevista de retención y revisión de condiciones'
            });
        }

        return recommendations;
    }

    /**
     * Obtener violaciones/alertas activas
     */
    static async getViolations(companyId, filters = {}) {
        try {
            const { department, severity, status = 'active' } = filters;

            let whereClause = 'WHERE s.company_id = :companyId';
            const replacements = { companyId };

            if (status === 'active') {
                whereClause += ' AND (s.resolved_at IS NULL)';
            }

            if (severity) {
                whereClause += ' AND s.severity = :severity';
                replacements.severity = severity;
            }

            const violations = await sequelize.query(`
                SELECT
                    s.id,
                    s.type,
                    s.description,
                    s.severity,
                    s.created_at,
                    s.resolved_at,
                    u."firstName" || ' ' || u."lastName" as employee_name,
                    u.id as employee_id,
                    d.name as department
                FROM sanctions s
                JOIN users u ON s.user_id = u.id
                LEFT JOIN departments d ON u.department_id = d.id
                ${whereClause}
                ORDER BY s.created_at DESC
                LIMIT 50
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            return { success: true, violations };

        } catch (error) {
            console.error('[RiskIntelligence] Error getViolations:', error);
            throw error;
        }
    }

    /**
     * Obtener departamentos con estadísticas de riesgo
     */
    static async getDepartmentsWithRisk(companyId) {
        try {
            const departments = await sequelize.query(`
                SELECT
                    d.id,
                    d.name,
                    COUNT(u.id) as employee_count
                FROM departments d
                LEFT JOIN users u ON u.department_id = d.id AND u.is_active = true
                WHERE d.company_id = :companyId
                GROUP BY d.id, d.name
                ORDER BY d.name
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            return { success: true, departments };

        } catch (error) {
            console.error('[RiskIntelligence] Error getDepartmentsWithRisk:', error);
            throw error;
        }
    }

    // ========== HELPERS ==========

    static async getEmployeeJobType(userId) {
        try {
            const [result] = await sequelize.query(`
                SELECT position as job_type, position FROM users WHERE user_id = :userId
            `, {
                replacements: { userId },
                type: QueryTypes.SELECT
            });
            return result;
        } catch (error) {
            return null;
        }
    }

    static isAdministrative(jobType) {
        if (!jobType) return false;
        const adminTypes = RISK_CONFIG.ACCIDENT.excludeJobTypes;
        return adminTypes.some(t => jobType.toLowerCase().includes(t.toLowerCase()));
    }

    /**
     * Obtener configuración de índices
     */
    static getIndicesConfig() {
        return RISK_CONFIG;
    }

    /**
     * Actualizar configuración de un índice
     */
    static updateIndexConfig(indexId, newConfig) {
        const index = Object.values(RISK_CONFIG).find(i => i.id === indexId);
        if (index) {
            Object.assign(index, newConfig);
            return { success: true, config: index };
        }
        return { success: false, error: 'Índice no encontrado' };
    }

    // =========================================================================
    // MÉTODOS DE SEGMENTACIÓN Y UMBRALES DINÁMICOS (RBAC SSOT v3.0)
    // =========================================================================

    /**
     * Obtener configuración de riesgo de una empresa
     * Incluye método de cálculo, umbrales y opciones de segmentación
     */
    static async getCompanyRiskConfig(companyId) {
        try {
            const config = await RBACService.getOrCreateRiskConfig(companyId);
            const benchmarks = await RBACService.getAllBenchmarks();

            return {
                success: true,
                config: {
                    threshold_method: config.threshold_method,
                    enable_segmentation: config.enable_segmentation,
                    global_thresholds: config.global_thresholds,
                    global_weights: config.global_weights,
                    hybrid_weights: config.hybrid_weights,
                    quartile_recalc_frequency: config.quartile_recalc_frequency,
                    last_quartile_calculation: config.last_quartile_calculation,
                    calculated_quartiles: config.calculated_quartiles,
                    default_benchmark_code: config.default_benchmark_code
                },
                available_benchmarks: benchmarks.map(b => ({
                    code: b.benchmark_code,
                    name: b.benchmark_name,
                    category: b.work_category,
                    source: b.source,
                    source_year: b.source_year
                })),
                methods: [
                    { id: 'manual', name: 'Manual (Paramétrico)', description: 'Umbrales fijos definidos por administrador' },
                    { id: 'quartile', name: 'Cuartiles Dinámicos', description: 'Calculados por cuartiles de datos propios' },
                    { id: 'benchmark', name: 'Benchmarks Internacionales', description: 'Basados en OIT, OSHA, SRT' },
                    { id: 'hybrid', name: 'Híbrido', description: 'Combinación ponderada de los tres métodos' }
                ]
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error getCompanyRiskConfig:', error);
            throw error;
        }
    }

    /**
     * Actualizar configuración de riesgo de una empresa
     */
    static async updateCompanyRiskConfig(companyId, updates, userId = null) {
        try {
            const config = await RBACService.updateRiskConfig(companyId, updates, userId);
            return {
                success: true,
                config,
                message: 'Configuración actualizada correctamente'
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error updateCompanyRiskConfig:', error);
            throw error;
        }
    }

    /**
     * Cambiar método de cálculo de umbrales
     */
    static async setThresholdMethod(companyId, method, hybridWeights = null, userId = null) {
        try {
            await RBACService.setThresholdMethod(companyId, method, hybridWeights, userId);

            // Si el método es quartile o hybrid, recalcular cuartiles
            if (method === 'quartile' || method === 'hybrid') {
                await RBACService.recalculateQuartiles(companyId);
            }

            return {
                success: true,
                method,
                message: `Método cambiado a ${method}`
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error setThresholdMethod:', error);
            throw error;
        }
    }

    /**
     * Habilitar/deshabilitar segmentación por tipo de trabajo
     */
    static async setSegmentation(companyId, enabled, userId = null) {
        try {
            await RBACService.setSegmentation(companyId, enabled, userId);
            return {
                success: true,
                enabled,
                message: enabled ? 'Segmentación habilitada' : 'Segmentación deshabilitada'
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error setSegmentation:', error);
            throw error;
        }
    }

    /**
     * Forzar recálculo de cuartiles
     */
    static async recalculateQuartiles(companyId) {
        try {
            const result = await RBACService.recalculateQuartiles(companyId);
            return {
                success: true,
                quartiles: result,
                message: 'Cuartiles recalculados correctamente'
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error recalculateQuartiles:', error);
            throw error;
        }
    }

    /**
     * Obtener umbrales efectivos para un empleado específico
     * Considera: método de empresa, posición organizacional, benchmarks
     */
    static async getEmployeeThresholds(userId, companyId) {
        try {
            const rbac = await RBACService.getUserRBAC(userId, companyId);
            if (!rbac) {
                return DEFAULT_RISK_CONFIG;
            }

            return {
                success: true,
                user_id: userId,
                position: rbac.position,
                thresholds: rbac.risk_config.thresholds,
                weights: rbac.risk_config.weights,
                method: rbac.risk_config.method,
                segmentation_enabled: rbac.risk_config.segmentation_enabled
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error getEmployeeThresholds:', error);
            throw error;
        }
    }

    /**
     * Obtener análisis de riesgo con segmentación
     * Agrupa empleados por categoría de trabajo
     */
    static async getSegmentedRiskAnalysis(companyId, period = 30) {
        try {
            const employees = await this.getEmployeesWithRisk(companyId, period);
            const config = await RBACService.getOrCreateRiskConfig(companyId);

            // Agrupar por categoría de trabajo
            const segments = {};
            const unassigned = [];

            for (const emp of employees) {
                // Obtener posición organizacional
                const [position] = await sequelize.query(`
                    SELECT op.work_category, op.position_name, op.risk_exposure_level,
                           op.applies_accident_risk, op.applies_fatigue_index
                    FROM users u
                    LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
                    WHERE u.user_id = :userId
                `, {
                    replacements: { userId: emp.id },
                    type: QueryTypes.SELECT
                });

                if (position?.work_category) {
                    const category = position.work_category;
                    if (!segments[category]) {
                        segments[category] = {
                            category,
                            employees: [],
                            avg_risk: 0,
                            critical_count: 0,
                            high_count: 0
                        };
                    }
                    emp.position_data = position;
                    segments[category].employees.push(emp);

                    if (emp.risk_score >= 80) segments[category].critical_count++;
                    else if (emp.risk_score >= 60) segments[category].high_count++;
                } else {
                    unassigned.push(emp);
                }
            }

            // Calcular promedios por segmento
            for (const seg of Object.values(segments)) {
                seg.avg_risk = seg.employees.length > 0
                    ? Math.round(seg.employees.reduce((s, e) => s + e.risk_score, 0) / seg.employees.length)
                    : 0;
                seg.employee_count = seg.employees.length;
            }

            return {
                success: true,
                segmentation_enabled: config.enable_segmentation,
                threshold_method: config.threshold_method,
                segments,
                unassigned: {
                    employees: unassigned,
                    count: unassigned.length,
                    message: 'Empleados sin posición organizacional asignada'
                },
                summary: {
                    total_employees: employees.length,
                    segmented: employees.length - unassigned.length,
                    categories: Object.keys(segments).length
                }
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error getSegmentedRiskAnalysis:', error);
            throw error;
        }
    }

    /**
     * Obtener benchmarks disponibles con comparación
     */
    static async getBenchmarkComparison(companyId, period = 30) {
        try {
            const indices = await this.calculateGlobalIndices(companyId, period);
            const benchmarks = await RBACService.getAllBenchmarks();

            const comparison = benchmarks.map(b => ({
                benchmark: {
                    code: b.benchmark_code,
                    name: b.benchmark_name,
                    category: b.work_category,
                    source: `${b.source} ${b.source_year}`
                },
                fatigue: {
                    company: indices.fatigue,
                    p50: parseFloat(b.fatigue_p50),
                    p75: parseFloat(b.fatigue_p75),
                    status: indices.fatigue <= parseFloat(b.fatigue_p50) ? 'good' :
                            indices.fatigue <= parseFloat(b.fatigue_p75) ? 'warning' : 'critical'
                },
                accident: {
                    company: indices.accident,
                    p50: parseFloat(b.accident_p50),
                    p75: parseFloat(b.accident_p75),
                    status: indices.accident <= parseFloat(b.accident_p50) ? 'good' :
                            indices.accident <= parseFloat(b.accident_p75) ? 'warning' : 'critical'
                },
                legal_claim: {
                    company: indices.legal_claim,
                    p50: parseFloat(b.legal_claim_p50),
                    p75: parseFloat(b.legal_claim_p75),
                    status: indices.legal_claim <= parseFloat(b.legal_claim_p50) ? 'good' :
                            indices.legal_claim <= parseFloat(b.legal_claim_p75) ? 'warning' : 'critical'
                }
            }));

            return {
                success: true,
                company_indices: indices,
                benchmarks: comparison
            };
        } catch (error) {
            console.error('[RiskIntelligence] Error getBenchmarkComparison:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de RBAC para la empresa
     */
    static async getRBACStats(companyId) {
        try {
            return await RBACService.getCompanyRBACStats(companyId);
        } catch (error) {
            console.error('[RiskIntelligence] Error getRBACStats:', error);
            throw error;
        }
    }
}

module.exports = RiskIntelligenceService;
