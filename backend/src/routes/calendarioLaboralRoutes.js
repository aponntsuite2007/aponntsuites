/**
 * ============================================================================
 * CALENDARIO LABORAL ROUTES
 * ============================================================================
 *
 * API REST para el servicio de calendario laboral.
 *
 * Endpoints:
 * - GET  /api/calendario/is-working/:userId/:date - Verificar si es día laboral
 * - GET  /api/calendario/user/:userId/calendar    - Generar calendario
 * - GET  /api/calendario/employees/:date          - Empleados esperados
 * - GET  /api/calendario/holidays/:countryCode    - Feriados próximos
 * - POST /api/calendario/non-working              - Crear día no laborable
 * - GET  /api/calendario/month-stats              - Estadísticas del mes
 * - POST /api/calendario/sync-holidays            - Sincronizar feriados
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const calendarioLaboralService = require('../services/CalendarioLaboralService');
const { authenticateJWT, authorize } = require('../middleware/auth');

/**
 * GET /api/calendario/is-working/:userId/:date
 * Verificar si un empleado debe trabajar en una fecha
 */
router.get('/is-working/:userId/:date', authenticateJWT, async (req, res) => {
    try {
        const { userId, date } = req.params;

        const result = await calendarioLaboralService.isWorkingDay(userId, date);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[CalendarioRoutes] Error en is-working:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/calendario/user/:userId/calendar
 * Generar calendario laboral para un rango de fechas
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 */
router.get('/user/:userId/calendar', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren startDate y endDate'
            });
        }

        const calendar = await calendarioLaboralService.generateCalendar(
            userId,
            startDate,
            endDate
        );

        res.json({
            success: true,
            data: calendar
        });

    } catch (error) {
        console.error('[CalendarioRoutes] Error generando calendario:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/calendario/employees/:date
 * Obtener empleados que deben trabajar en una fecha
 *
 * Query params:
 * - departmentId: Filtrar por departamento (opcional)
 * - branchId: Filtrar por sucursal (opcional)
 */
router.get('/employees/:date', authenticateJWT, async (req, res) => {
    try {
        const { date } = req.params;
        const { departmentId, branchId } = req.query;
        const companyId = req.user.company_id;

        const result = await calendarioLaboralService.getEmployeesExpectedToWork(
            companyId,
            date,
            { departmentId, branchId }
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[CalendarioRoutes] Error obteniendo empleados:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/calendario/holidays/:countryCode
 * Obtener próximos feriados de un país
 *
 * Query params:
 * - days: Días hacia adelante (default: 30)
 */
router.get('/holidays/:countryCode', authenticateJWT, async (req, res) => {
    try {
        const { countryCode } = req.params;
        const days = parseInt(req.query.days) || 30;

        const holidays = await calendarioLaboralService.getUpcomingHolidays(
            countryCode,
            days
        );

        res.json({
            success: true,
            data: {
                countryCode,
                days,
                holidays
            }
        });

    } catch (error) {
        console.error('[CalendarioRoutes] Error obteniendo feriados:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/calendario/non-working
 * Crear día no laborable manual
 *
 * Body:
 * - date: Fecha (YYYY-MM-DD)
 * - reason: Motivo
 * - affects: 'ALL' | 'BRANCH' | 'DEPARTMENT'
 * - branchId: ID de sucursal (si affects = 'BRANCH')
 * - departmentId: ID de departamento (si affects = 'DEPARTMENT')
 */
router.post('/non-working', authenticateJWT, authorize(['admin', 'rrhh']), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const createdBy = req.user.id;

        const { date, reason, affects, branchId, departmentId } = req.body;

        if (!date || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren date y reason'
            });
        }

        const result = await calendarioLaboralService.createNonWorkingDay(companyId, {
            date,
            reason,
            affects: affects || 'ALL',
            branchId,
            departmentId,
            createdBy
        });

        res.json(result);

    } catch (error) {
        console.error('[CalendarioRoutes] Error creando día no laborable:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/calendario/month-stats
 * Obtener estadísticas de un mes
 *
 * Query params:
 * - year: Año
 * - month: Mes (1-12)
 */
router.get('/month-stats', authenticateJWT, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const stats = await calendarioLaboralService.getMonthStatistics(
            companyId,
            year,
            month
        );

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('[CalendarioRoutes] Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/calendario/sync-holidays
 * Sincronizar feriados desde API externa
 *
 * Body:
 * - countryCode: Código ISO del país (AR, PE, CL, etc.)
 * - year: Año a sincronizar
 */
router.post('/sync-holidays', authenticateJWT, authorize(['admin', 'rrhh']), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { countryCode, year } = req.body;

        if (!countryCode || !year) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren countryCode y year'
            });
        }

        const result = await calendarioLaboralService.syncHolidays(
            companyId,
            countryCode,
            year
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[CalendarioRoutes] Error sincronizando feriados:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/calendario/today
 * Información del día actual para el usuario logueado
 */
router.get('/today', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        const result = await calendarioLaboralService.isWorkingDay(userId, today);

        res.json({
            success: true,
            data: {
                ...result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[CalendarioRoutes] Error obteniendo info del día:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/calendario/countries
 * Obtener lista de países LATAM soportados para feriados
 */
router.get('/countries', authenticateJWT, async (req, res) => {
    try {
        const holidayApiService = require('../services/HolidayApiService');
        const countries = holidayApiService.getLatamCountries();

        res.json({
            success: true,
            data: countries
        });

    } catch (error) {
        console.error('[CalendarioRoutes] Error obteniendo países:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
