/**
 * ============================================================================
 * PREDICTIVE WORKFORCE ROUTES
 * ============================================================================
 *
 * API REST para Sistema de Analítica Predictiva
 *
 * ENDPOINTS:
 * - GET  /api/predictive/:companyId/ira/:date           - IRA diario
 * - GET  /api/predictive/:companyId/ira-range           - IRA para rango
 * - GET  /api/predictive/:companyId/sensitivity         - Análisis de sensibilidad
 * - GET  /api/predictive/:companyId/compare/:level      - Comparaciones multinivel
 * - GET  /api/predictive/:companyId/forecast            - Previsión presupuestaria
 * - GET  /api/predictive/:companyId/drill-down/:metric  - Drill-down SSOT
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

// Servicio
let predictiveService = null;

const initService = (req, res, next) => {
    if (!predictiveService) {
        const db = require('../config/database');
        const PredictiveWorkforceService = require('../services/PredictiveWorkforceService');
        predictiveService = new PredictiveWorkforceService(db);
    }
    req.predictiveService = predictiveService;
    next();
};

router.use(initService);

// ============================================================================
// ÍNDICE DE RIESGO DE ASISTENCIA (IRA)
// ============================================================================

/**
 * GET /api/predictive/:companyId/ira
 * Obtiene el IRA para HOY (endpoint base para dashboard)
 */
router.get('/:companyId/ira', authenticateJWT, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { departmentId, branchId, shiftId } = req.query;

        // IRA de hoy por defecto
        const today = new Date();

        const [ira, factors] = await Promise.all([
            req.predictiveService.calculateDailyIRA(
                parseInt(companyId),
                today,
                { departmentId, branchId, shiftId }
            ),
            req.predictiveService.getIRAFactorBreakdown ?
                req.predictiveService.getIRAFactorBreakdown(parseInt(companyId), today) :
                null
        ]);

        // Interpretar el nivel de riesgo
        let interpretation = 'Sin datos suficientes';
        if (ira && typeof ira.totalScore === 'number') {
            const score = ira.totalScore;
            if (score < 30) interpretation = 'Riesgo bajo - Operación normal esperada';
            else if (score < 50) interpretation = 'Riesgo moderado - Monitorear situación';
            else if (score < 70) interpretation = 'Riesgo elevado - Considerar refuerzos';
            else interpretation = 'Riesgo alto - Activar plan de contingencia';
        }

        res.json({
            success: true,
            data: {
                ira: {
                    value: ira?.totalScore || 0,
                    interpretation,
                    date: today.toISOString().split('T')[0]
                },
                factors: factors || ira?.components || {
                    climate: { weight: 0.20, value: 0, contribution: 0 },
                    dayOfWeek: { weight: 0.15, value: 0, contribution: 0 },
                    weekendProximity: { weight: 0.12, value: 0, contribution: 0 },
                    holidayProximity: { weight: 0.15, value: 0, contribution: 0 },
                    seasonality: { weight: 0.10, value: 0, contribution: 0 },
                    workType: { weight: 0.13, value: 0, contribution: 0 },
                    employeeHistory: { weight: 0.15, value: 0, contribution: 0 }
                },
                methodology: {
                    name: 'Modelo IRA v2.0',
                    formula: 'IRA = Σ(βᵢ × Xᵢ)',
                    description: 'Suma ponderada de factores de riesgo normalizados 0-100'
                }
            }
        });

    } catch (error) {
        console.error('[Predictive] Error calculando IRA base:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/predictive/:companyId/ira/:date
 * Obtiene el IRA para una fecha específica
 */
router.get('/:companyId/ira/:date', authenticateJWT, async (req, res) => {
    try {
        const { companyId, date } = req.params;
        const { departmentId, branchId, shiftId } = req.query;

        const ira = await req.predictiveService.calculateDailyIRA(
            parseInt(companyId),
            new Date(date),
            { departmentId, branchId, shiftId }
        );

        res.json({
            success: true,
            data: ira
        });

    } catch (error) {
        console.error('[Predictive] Error calculando IRA:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/predictive/:companyId/ira-range
 * Obtiene IRA para un rango de fechas
 */
router.get('/:companyId/ira-range', authenticateJWT, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, departmentId, branchId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren startDate y endDate'
            });
        }

        const result = await req.predictiveService.calculateIRARange(
            parseInt(companyId),
            startDate,
            endDate,
            { departmentId, branchId }
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[Predictive] Error calculando IRA range:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// ANÁLISIS DE SENSIBILIDAD
// ============================================================================

/**
 * GET /api/predictive/:companyId/sensitivity
 * Análisis de sensibilidad por variable
 */
router.get('/:companyId/sensitivity', authenticateJWT, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, variable } = req.query;

        const result = await req.predictiveService.analyzeSensitivity(
            parseInt(companyId),
            { startDate, endDate, variable }
        );

        res.json(result);

    } catch (error) {
        console.error('[Predictive] Error en análisis de sensibilidad:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// COMPARACIONES MULTINIVEL
// ============================================================================

/**
 * GET /api/predictive/:companyId/compare/:level
 * Compara unidades organizacionales
 * level: branch, department, shift, sector
 */
router.get('/:companyId/compare/:level', authenticateJWT, async (req, res) => {
    try {
        const { companyId, level } = req.params;
        const { startDate, endDate, controlVariables } = req.query;

        const controls = controlVariables ? controlVariables.split(',') : ['climate', 'workType'];

        const result = await req.predictiveService.compareUnits(
            parseInt(companyId),
            {
                level,
                startDate,
                endDate,
                controlVariables: controls
            }
        );

        res.json(result);

    } catch (error) {
        console.error('[Predictive] Error en comparación:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// PREVISIÓN PRESUPUESTARIA
// ============================================================================

/**
 * GET /api/predictive/:companyId/forecast
 * Previsión de horas de cobertura
 */
router.get('/:companyId/forecast', authenticateJWT, async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            forecastDays = 30,
            startDate,
            departmentId,
            branchId,
            confidenceLevel = 0.95
        } = req.query;

        const result = await req.predictiveService.forecastCoverageHours(
            parseInt(companyId),
            {
                forecastDays: parseInt(forecastDays),
                startDate: startDate ? new Date(startDate) : new Date(),
                departmentId,
                branchId,
                confidenceLevel: parseFloat(confidenceLevel)
            }
        );

        res.json(result);

    } catch (error) {
        console.error('[Predictive] Error en forecast:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// DRILL-DOWN SSOT - Navegación jerárquica hasta el fichaje
// ============================================================================

/**
 * GET /api/predictive/:companyId/drill-down/:metric
 * Drill-down unificado para cualquier métrica
 *
 * metric: attendance, health, overtime, patterns, etc.
 *
 * Query params:
 * - level: company, branch, department, sector, shift, employee, record
 * - branchId, departmentId, shiftId, employeeId, recordId (según nivel)
 * - startDate, endDate
 */
router.get('/:companyId/drill-down/:metric', authenticateJWT, async (req, res) => {
    try {
        const { companyId, metric } = req.params;
        const {
            level = 'company',
            branchId,
            departmentId,
            sectorId,
            shiftId,
            employeeId,
            recordId,
            startDate,
            endDate
        } = req.query;

        const db = require('../config/database');
        const { sequelize } = db;

        // Fechas por defecto: último mes
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Función de drill-down según métrica
        const drillDownResult = await drillDownMetric(
            sequelize,
            parseInt(companyId),
            metric,
            level,
            { branchId, departmentId, sectorId, shiftId, employeeId, recordId },
            { startDate: start, endDate: end }
        );

        res.json({
            success: true,
            metric,
            level,
            filters: { branchId, departmentId, sectorId, shiftId, employeeId, recordId },
            period: { startDate: start, endDate: end },
            data: drillDownResult.data,
            children: drillDownResult.children,
            breadcrumb: drillDownResult.breadcrumb,
            canDrillDeeper: drillDownResult.canDrillDeeper,
            nextLevel: drillDownResult.nextLevel,
            methodology: drillDownResult.methodology
        });

    } catch (error) {
        console.error('[Predictive] Error en drill-down:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// FUNCIÓN DE DRILL-DOWN UNIVERSAL
// ============================================================================

async function drillDownMetric(sequelize, companyId, metric, level, filters, dateRange) {
    const { QueryTypes } = require('sequelize');
    const { branchId, departmentId, sectorId, shiftId, employeeId, recordId } = filters;
    const { startDate, endDate } = dateRange;

    // Definir jerarquía de niveles
    const levelHierarchy = ['company', 'branch', 'department', 'sector', 'shift', 'employee', 'record'];
    const currentIndex = levelHierarchy.indexOf(level);
    const nextLevel = currentIndex < levelHierarchy.length - 1 ? levelHierarchy[currentIndex + 1] : null;

    // Construir breadcrumb
    const breadcrumb = await buildBreadcrumb(sequelize, companyId, filters);

    // Según la métrica, obtener datos específicos
    let data, children, methodology;

    switch (metric) {
        case 'attendance':
            ({ data, children, methodology } = await drillDownAttendance(
                sequelize, companyId, level, filters, dateRange
            ));
            break;

        case 'health':
            ({ data, children, methodology } = await drillDownHealth(
                sequelize, companyId, level, filters, dateRange
            ));
            break;

        case 'overtime':
            ({ data, children, methodology } = await drillDownOvertime(
                sequelize, companyId, level, filters, dateRange
            ));
            break;

        case 'patterns':
            ({ data, children, methodology } = await drillDownPatterns(
                sequelize, companyId, level, filters, dateRange
            ));
            break;

        case 'climate':
            ({ data, children, methodology } = await drillDownClimate(
                sequelize, companyId, level, filters, dateRange
            ));
            break;

        default:
            throw new Error(`Métrica no soportada: ${metric}`);
    }

    return {
        data,
        children,
        breadcrumb,
        canDrillDeeper: level !== 'record',
        nextLevel,
        methodology
    };
}

async function buildBreadcrumb(sequelize, companyId, filters) {
    const { QueryTypes } = require('sequelize');
    const crumbs = [];

    // Empresa
    const [company] = await sequelize.query(
        'SELECT name FROM companies WHERE id = :companyId',
        { replacements: { companyId }, type: QueryTypes.SELECT }
    );
    crumbs.push({ level: 'company', id: companyId, name: company?.name || 'Empresa' });

    // Sucursal
    if (filters.branchId) {
        const [branch] = await sequelize.query(
            'SELECT name FROM branches WHERE id = :id',
            { replacements: { id: filters.branchId }, type: QueryTypes.SELECT }
        );
        crumbs.push({ level: 'branch', id: filters.branchId, name: branch?.name || 'Sucursal' });
    }

    // Departamento
    if (filters.departmentId) {
        const [dept] = await sequelize.query(
            'SELECT name FROM departments WHERE id = :id',
            { replacements: { id: filters.departmentId }, type: QueryTypes.SELECT }
        );
        crumbs.push({ level: 'department', id: filters.departmentId, name: dept?.name || 'Departamento' });
    }

    // Turno
    if (filters.shiftId) {
        const [shift] = await sequelize.query(
            'SELECT name FROM shifts WHERE id = :id',
            { replacements: { id: filters.shiftId }, type: QueryTypes.SELECT }
        );
        crumbs.push({ level: 'shift', id: filters.shiftId, name: shift?.name || 'Turno' });
    }

    // Empleado
    if (filters.employeeId) {
        const [emp] = await sequelize.query(
            'SELECT first_name, last_name, legajo FROM users WHERE id = :id',
            { replacements: { id: filters.employeeId }, type: QueryTypes.SELECT }
        );
        crumbs.push({
            level: 'employee',
            id: filters.employeeId,
            name: emp ? `${emp.first_name} ${emp.last_name} (${emp.legajo})` : 'Empleado'
        });
    }

    return crumbs;
}

// ============================================================================
// DRILL-DOWN POR MÉTRICA
// ============================================================================

async function drillDownAttendance(sequelize, companyId, level, filters, dateRange) {
    const { QueryTypes } = require('sequelize');
    const { startDate, endDate } = dateRange;

    let query, groupBy, selectExtra = '';

    switch (level) {
        case 'company':
            query = `
                SELECT
                    b.id, b.name,
                    COUNT(DISTINCT u.id) as employees,
                    COUNT(a.id) as total_records,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN a.is_late = true THEN 1 END) as late,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
                    SUM(COALESCE(a.worked_hours, 0)) as worked_hours
                FROM branches b
                LEFT JOIN users u ON u.branch_id = b.id AND u.company_id = :companyId
                LEFT JOIN attendance a ON a.user_id = u.id
                    AND a.date BETWEEN :startDate AND :endDate
                WHERE b.company_id = :companyId
                GROUP BY b.id, b.name
                ORDER BY b.name
            `;
            break;

        case 'branch':
            query = `
                SELECT
                    d.id, d.name, d.work_type,
                    COUNT(DISTINCT u.id) as employees,
                    COUNT(a.id) as total_records,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN a.is_late = true THEN 1 END) as late,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
                    SUM(COALESCE(a.worked_hours, 0)) as worked_hours
                FROM departments d
                LEFT JOIN users u ON u.department_id = d.id
                LEFT JOIN attendance a ON a.user_id = u.id
                    AND a.date BETWEEN :startDate AND :endDate
                WHERE d.company_id = :companyId
                  AND (u.branch_id = :branchId OR :branchId IS NULL)
                GROUP BY d.id, d.name, d.work_type
                ORDER BY d.name
            `;
            break;

        case 'department':
            query = `
                SELECT
                    u.id, u.first_name, u.last_name, u.legajo, u.sector,
                    COUNT(a.id) as total_records,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN a.is_late = true THEN 1 END) as late,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
                    SUM(COALESCE(a.worked_hours, 0)) as worked_hours,
                    AVG(CASE WHEN a.is_late = true THEN
                        EXTRACT(EPOCH FROM (a.check_in - (a.date + '09:00:00'::time))) / 60
                    END) as avg_late_minutes
                FROM users u
                LEFT JOIN attendance a ON a.user_id = u.id
                    AND a.date BETWEEN :startDate AND :endDate
                WHERE u.company_id = :companyId
                  AND u.department_id = :departmentId
                GROUP BY u.id, u.first_name, u.last_name, u.legajo, u.sector
                ORDER BY u.last_name, u.first_name
            `;
            break;

        case 'employee':
            query = `
                SELECT
                    a.id, a.date, a.check_in, a.check_out,
                    a.status, a.is_late, a.worked_hours, a.overtime_hours,
                    a.absence_type, a.absence_reason,
                    k.name as kiosk_name,
                    s.name as shift_name
                FROM attendance a
                LEFT JOIN kiosks k ON a.kiosk_id = k.id
                LEFT JOIN user_shift_assignments usa ON usa.user_id = a.user_id AND usa.is_active = true
                LEFT JOIN shifts s ON s.id = usa.shift_id
                WHERE a.user_id = :employeeId
                  AND a.date BETWEEN :startDate AND :endDate
                ORDER BY a.date DESC, a.check_in DESC
            `;
            break;

        default:
            query = 'SELECT 1 WHERE false';
    }

    const [children] = await sequelize.query(query, {
        replacements: {
            companyId,
            startDate,
            endDate,
            branchId: filters.branchId || null,
            departmentId: filters.departmentId || null,
            employeeId: filters.employeeId || null
        },
        type: QueryTypes.SELECT
    });

    // Calcular totales
    const data = calculateTotals(children, level);

    return {
        data,
        children: children || [],
        methodology: {
            calculation: 'Tasas = (eventos / total_registros) × 100',
            filters: 'Aplicados jerárquicamente según nivel de drill-down',
            aggregation: level === 'employee' ? 'Sin agregación - datos individuales' : 'Agrupación por nivel'
        }
    };
}

async function drillDownHealth(sequelize, companyId, level, filters, dateRange) {
    const { QueryTypes } = require('sequelize');
    const { startDate, endDate } = dateRange;

    let query;

    switch (level) {
        case 'company':
        case 'branch':
            query = `
                SELECT
                    COALESCE(d.id, 0) as id,
                    COALESCE(d.name, 'Sin Departamento') as name,
                    COUNT(DISTINCT mc.id) as total_certificates,
                    COUNT(DISTINCT mc.user_id) as employees_with_cert,
                    SUM(COALESCE(mc.approved_days, 0)) as total_days_lost,
                    COUNT(CASE WHEN mc.status = 'approved' THEN 1 END) as approved,
                    COUNT(CASE WHEN mc.status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN mc.status = 'rejected' THEN 1 END) as rejected,
                    COUNT(CASE WHEN mc.has_justification = true THEN 1 END) as with_justification,
                    COUNT(CASE WHEN mc.has_justification = false OR mc.has_justification IS NULL THEN 1 END) as without_justification
                FROM medical_certificates mc
                INNER JOIN users u ON mc.user_id = u.id
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.company_id = :companyId
                  AND mc.issue_date BETWEEN :startDate AND :endDate
                  ${filters.branchId ? 'AND u.branch_id = :branchId' : ''}
                GROUP BY d.id, d.name
                ORDER BY total_certificates DESC
            `;
            break;

        case 'department':
            query = `
                SELECT
                    u.id, u.first_name, u.last_name, u.legajo,
                    COUNT(mc.id) as certificates,
                    SUM(COALESCE(mc.approved_days, 0)) as days_lost,
                    COUNT(CASE WHEN mc.status = 'approved' THEN 1 END) as approved,
                    COUNT(CASE WHEN mc.has_justification = true THEN 1 END) as with_justification,
                    MAX(mc.issue_date) as last_certificate,
                    CASE
                        WHEN COUNT(mc.id) >= 5 THEN 'CARPETA_ABIERTA'
                        WHEN COUNT(mc.id) >= 3 THEN 'ALERTA'
                        ELSE 'NORMAL'
                    END as health_status
                FROM users u
                LEFT JOIN medical_certificates mc ON mc.user_id = u.id
                    AND mc.issue_date BETWEEN :startDate AND :endDate
                WHERE u.company_id = :companyId
                  AND u.department_id = :departmentId
                GROUP BY u.id, u.first_name, u.last_name, u.legajo
                HAVING COUNT(mc.id) > 0 OR :includeAll = true
                ORDER BY certificates DESC
            `;
            break;

        case 'employee':
            query = `
                SELECT
                    mc.id, mc.issue_date, mc.diagnosis_code, mc.diagnosis_category,
                    mc.approved_days, mc.status, mc.has_justification,
                    mc.medical_institution, mc.doctor_name,
                    mc.created_at, mc.updated_at
                FROM medical_certificates mc
                WHERE mc.user_id = :employeeId
                  AND mc.issue_date BETWEEN :startDate AND :endDate
                ORDER BY mc.issue_date DESC
            `;
            break;

        default:
            query = 'SELECT 1 WHERE false';
    }

    const [children] = await sequelize.query(query, {
        replacements: {
            companyId,
            startDate,
            endDate,
            branchId: filters.branchId || null,
            departmentId: filters.departmentId || null,
            employeeId: filters.employeeId || null,
            includeAll: false
        },
        type: QueryTypes.SELECT
    });

    const data = calculateHealthTotals(children, level);

    return {
        data,
        children: children || [],
        methodology: {
            classification: 'CIE-10 para diagnósticos médicos',
            carpetaAbierta: '≥5 certificados en período = carpeta abierta',
            alerta: '≥3 certificados en período = estado de alerta',
            justification: 'Clasificación por presencia de documentación justificativa'
        }
    };
}

async function drillDownOvertime(sequelize, companyId, level, filters, dateRange) {
    const { QueryTypes } = require('sequelize');
    const { startDate, endDate } = dateRange;

    // Similar estructura para overtime
    const query = level === 'employee' ? `
        SELECT
            a.id, a.date, a.overtime_hours,
            a.worked_hours, a.scheduled_hours,
            EXTRACT(DOW FROM a.date) as day_of_week,
            s.name as shift_name,
            s."hourlyRates" as hourly_rates
        FROM attendance a
        LEFT JOIN user_shift_assignments usa ON usa.user_id = a.user_id AND usa.is_active = true
        LEFT JOIN shifts s ON s.id = usa.shift_id
        WHERE a.user_id = :employeeId
          AND a.date BETWEEN :startDate AND :endDate
          AND COALESCE(a.overtime_hours, 0) > 0
        ORDER BY a.date DESC
    ` : `
        SELECT
            ${level === 'company' ? 'b.id, b.name' : level === 'branch' ? 'd.id, d.name, d.work_type' : 'u.id, u.first_name, u.last_name, u.legajo'},
            SUM(COALESCE(a.overtime_hours, 0)) as overtime_hours,
            COUNT(CASE WHEN a.overtime_hours > 0 THEN 1 END) as overtime_days,
            AVG(CASE WHEN a.overtime_hours > 0 THEN a.overtime_hours END) as avg_overtime,
            COUNT(CASE WHEN EXTRACT(DOW FROM a.date) IN (0, 6) AND a.overtime_hours > 0 THEN 1 END) as weekend_overtime_days
        FROM ${level === 'company' ? 'branches b LEFT JOIN users u ON u.branch_id = b.id' :
              level === 'branch' ? 'departments d LEFT JOIN users u ON u.department_id = d.id' :
              'users u'}
        LEFT JOIN attendance a ON a.user_id = u.id
            AND a.date BETWEEN :startDate AND :endDate
        WHERE ${level === 'company' ? 'b' : level === 'branch' ? 'd' : 'u'}.company_id = :companyId
          ${filters.branchId ? 'AND u.branch_id = :branchId' : ''}
          ${filters.departmentId ? 'AND u.department_id = :departmentId' : ''}
        GROUP BY ${level === 'company' ? 'b.id, b.name' : level === 'branch' ? 'd.id, d.name, d.work_type' : 'u.id, u.first_name, u.last_name, u.legajo'}
        ORDER BY overtime_hours DESC
    `;

    const [children] = await sequelize.query(query, {
        replacements: {
            companyId,
            startDate,
            endDate,
            branchId: filters.branchId || null,
            departmentId: filters.departmentId || null,
            employeeId: filters.employeeId || null
        },
        type: QueryTypes.SELECT
    });

    return {
        data: { totalOvertimeHours: children.reduce((sum, c) => sum + parseFloat(c.overtime_hours || 0), 0) },
        children: children || [],
        methodology: {
            calculation: 'Overtime = worked_hours - scheduled_hours (si > 0)',
            multipliers: 'Según turno: normal(1x), overtime(1.5x), weekend(1.5x), holiday(2x)',
            aggregation: 'Sumatorio jerárquico por nivel'
        }
    };
}

async function drillDownPatterns(sequelize, companyId, level, filters, dateRange) {
    const { QueryTypes } = require('sequelize');

    const query = `
        SELECT
            ap.id, ap.pattern_name, ap.pattern_category, ap.severity,
            ap.confidence_score, ap.detection_date, ap.is_resolved,
            u.id as user_id, u.first_name, u.last_name, u.legajo,
            d.name as department_name,
            b.name as branch_name
        FROM attendance_patterns ap
        INNER JOIN users u ON ap.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.company_id = :companyId
          AND ap.is_resolved = false
          ${filters.branchId ? 'AND u.branch_id = :branchId' : ''}
          ${filters.departmentId ? 'AND u.department_id = :departmentId' : ''}
          ${filters.employeeId ? 'AND u.id = :employeeId' : ''}
        ORDER BY
            CASE ap.severity
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                ELSE 4
            END,
            ap.detection_date DESC
    `;

    const [children] = await sequelize.query(query, {
        replacements: {
            companyId,
            branchId: filters.branchId || null,
            departmentId: filters.departmentId || null,
            employeeId: filters.employeeId || null
        },
        type: QueryTypes.SELECT
    });

    // Agrupar por severidad
    const bySeverity = children.reduce((acc, p) => {
        acc[p.severity] = (acc[p.severity] || 0) + 1;
        return acc;
    }, {});

    return {
        data: {
            totalPatterns: children.length,
            bySeverity,
            criticalCount: bySeverity.critical || 0,
            highCount: bySeverity.high || 0
        },
        children: children || [],
        methodology: {
            detection: '15 patrones predefinidos con umbrales científicos',
            confidence: 'Score 0-1 basado en tamaño de muestra y consistencia',
            severity: 'CRITICAL > HIGH > MEDIUM > LOW según impacto en asistencia'
        }
    };
}

async function drillDownClimate(sequelize, companyId, level, filters, dateRange) {
    const { QueryTypes } = require('sequelize');
    const { startDate, endDate } = dateRange;

    const query = `
        SELECT
            k.id as kiosk_id, k.name as kiosk_name,
            k.gps_lat, k.gps_lng,
            b.name as branch_name,
            COUNT(DISTINCT a.id) as attendance_count,
            COUNT(CASE WHEN a.is_late = true THEN 1 END) as late_count,
            AVG(CASE
                WHEN el.weather_conditions IS NOT NULL
                THEN (el.weather_conditions->>'temperature')::float
            END) as avg_temperature,
            MODE() WITHIN GROUP (ORDER BY el.weather_conditions->>'condition') as dominant_condition
        FROM kiosks k
        LEFT JOIN branches b ON k.branch_id = b.id
        LEFT JOIN attendance a ON a.kiosk_id = k.id
            AND a.date BETWEEN :startDate AND :endDate
        LEFT JOIN employee_locations el ON el.kiosk_id = k.id
            AND DATE(el.reported_at) BETWEEN :startDate AND :endDate
        WHERE k.company_id = :companyId
          ${filters.branchId ? 'AND k.branch_id = :branchId' : ''}
        GROUP BY k.id, k.name, k.gps_lat, k.gps_lng, b.name
        ORDER BY attendance_count DESC
    `;

    const [children] = await sequelize.query(query, {
        replacements: {
            companyId,
            startDate,
            endDate,
            branchId: filters.branchId || null
        },
        type: QueryTypes.SELECT
    });

    return {
        data: {
            kiosksWithData: children.filter(k => k.avg_temperature != null).length,
            avgTemperature: children.reduce((sum, k) => sum + (parseFloat(k.avg_temperature) || 0), 0) / (children.length || 1)
        },
        children: children || [],
        methodology: {
            source: 'weather_conditions capturado por kiosko al momento del fichaje',
            correlation: 'Correlación Pearson entre condición climática y tasa de tardanza',
            classification: 'Zonas climáticas por latitud GPS (TROPICAL, SUBTROPICAL, TEMPERATE, COLD)'
        }
    };
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateTotals(children, level) {
    if (!children || children.length === 0) return {};

    return {
        totalEmployees: children.reduce((sum, c) => sum + parseInt(c.employees || 1), 0),
        totalRecords: children.reduce((sum, c) => sum + parseInt(c.total_records || 0), 0),
        totalPresent: children.reduce((sum, c) => sum + parseInt(c.present || 0), 0),
        totalLate: children.reduce((sum, c) => sum + parseInt(c.late || 0), 0),
        totalAbsent: children.reduce((sum, c) => sum + parseInt(c.absent || 0), 0),
        totalWorkedHours: children.reduce((sum, c) => sum + parseFloat(c.worked_hours || 0), 0),
        avgPresentRate: children.length > 0 ?
            children.reduce((sum, c) => {
                const total = parseInt(c.total_records) || 1;
                return sum + (parseInt(c.present || 0) / total * 100);
            }, 0) / children.length : 0
    };
}

function calculateHealthTotals(children, level) {
    if (!children || children.length === 0) return {};

    return {
        totalCertificates: children.reduce((sum, c) => sum + parseInt(c.total_certificates || c.certificates || 0), 0),
        totalDaysLost: children.reduce((sum, c) => sum + parseInt(c.total_days_lost || c.days_lost || 0), 0),
        employeesWithCertificates: children.filter(c => parseInt(c.certificates || c.total_certificates || 0) > 0).length,
        withJustification: children.reduce((sum, c) => sum + parseInt(c.with_justification || 0), 0),
        carpetaAbierta: children.filter(c => c.health_status === 'CARPETA_ABIERTA').length,
        alerta: children.filter(c => c.health_status === 'ALERTA').length
    };
}

module.exports = router;
