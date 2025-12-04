/**
 * Holiday API Routes - Integración con Nager.Date
 *
 * Endpoints para sincronizar y consultar feriados desde API externa
 *
 * Base URL: /api/v1/holidays-api
 */

const express = require('express');
const router = express.Router();
const { Holiday, Branch } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const holidayApiService = require('../services/HolidayApiService');

// ============================================================================
// CONSULTAS A API EXTERNA (sin modificar BD)
// ============================================================================

/**
 * @route GET /api/v1/holidays-api/countries
 * @desc Obtener lista de países disponibles en Nager.Date
 * @access Authenticated
 */
router.get('/countries', auth, async (req, res) => {
    try {
        const countries = await holidayApiService.getAvailableCountries();

        // Filtrar solo LATAM si se especifica
        const { latamOnly } = req.query;
        let result = countries;

        if (latamOnly === 'true') {
            const latamCodes = Object.keys(holidayApiService.countryMap);
            result = countries.filter(c => latamCodes.includes(c.countryCode));
        }

        res.json({
            success: true,
            count: result.length,
            countries: result
        });
    } catch (error) {
        console.error('[HOLIDAY-API] Error:', error.message);
        res.status(500).json({ error: 'Error obteniendo países' });
    }
});

/**
 * @route GET /api/v1/holidays-api/latam-countries
 * @desc Obtener lista de países LATAM soportados
 * @access Authenticated
 */
router.get('/latam-countries', auth, async (req, res) => {
    try {
        const countries = holidayApiService.getLatamCountries();
        res.json({
            success: true,
            count: countries.length,
            countries
        });
    } catch (error) {
        console.error('[HOLIDAY-API] Error:', error.message);
        res.status(500).json({ error: 'Error obteniendo países LATAM' });
    }
});

/**
 * @route GET /api/v1/holidays-api/preview/:countryCode/:year
 * @desc Ver feriados de un país/año SIN guardar en BD (preview)
 * @access Authenticated
 */
router.get('/preview/:countryCode/:year', auth, async (req, res) => {
    try {
        const { countryCode, year } = req.params;

        // Validar año
        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            return res.status(400).json({ error: 'Año inválido' });
        }

        // Verificar si país está soportado
        const isSupported = await holidayApiService.isCountrySupported(countryCode);
        if (!isSupported) {
            return res.status(400).json({
                error: `País ${countryCode} no soportado`,
                suggestion: 'Use GET /api/v1/holidays-api/countries para ver países disponibles'
            });
        }

        const holidays = await holidayApiService.getPublicHolidays(countryCode, yearNum);

        res.json({
            success: true,
            country: holidayApiService.getCountryName(countryCode),
            countryCode,
            year: yearNum,
            count: holidays.length,
            holidays: holidays.map(h => ({
                date: h.date,
                localName: h.localName,
                name: h.name,
                isNational: h.global,
                regions: h.counties,
                types: h.types
            }))
        });
    } catch (error) {
        console.error('[HOLIDAY-API] Error preview:', error.message);
        res.status(500).json({ error: 'Error obteniendo feriados' });
    }
});

/**
 * @route GET /api/v1/holidays-api/stats/:countryCode/:year
 * @desc Obtener estadísticas de feriados
 * @access Authenticated
 */
router.get('/stats/:countryCode/:year', auth, async (req, res) => {
    try {
        const { countryCode, year } = req.params;
        const yearNum = parseInt(year);

        if (isNaN(yearNum)) {
            return res.status(400).json({ error: 'Año inválido' });
        }

        const stats = await holidayApiService.getHolidayStats(countryCode, yearNum);
        res.json({ success: true, ...stats });
    } catch (error) {
        console.error('[HOLIDAY-API] Error stats:', error.message);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

/**
 * @route GET /api/v1/holidays-api/check/:countryCode/:date
 * @desc Verificar si una fecha es feriado
 * @access Authenticated
 */
router.get('/check/:countryCode/:date', auth, async (req, res) => {
    try {
        const { countryCode, date } = req.params;

        const holiday = await holidayApiService.checkIfHoliday(countryCode, date);

        res.json({
            success: true,
            date,
            countryCode,
            isHoliday: holiday !== null,
            holiday: holiday ? {
                name: holiday.localName,
                englishName: holiday.name,
                isNational: holiday.global
            } : null
        });
    } catch (error) {
        console.error('[HOLIDAY-API] Error check:', error.message);
        res.status(500).json({ error: 'Error verificando fecha' });
    }
});

/**
 * @route GET /api/v1/holidays-api/upcoming/:countryCode
 * @desc Obtener próximos feriados
 * @access Authenticated
 */
router.get('/upcoming/:countryCode', auth, async (req, res) => {
    try {
        const { countryCode } = req.params;
        const { days = 30 } = req.query;

        const upcoming = await holidayApiService.getUpcomingHolidays(countryCode, parseInt(days));

        res.json({
            success: true,
            countryCode,
            country: holidayApiService.getCountryName(countryCode),
            nextDays: parseInt(days),
            count: upcoming.length,
            holidays: upcoming
        });
    } catch (error) {
        console.error('[HOLIDAY-API] Error upcoming:', error.message);
        res.status(500).json({ error: 'Error obteniendo próximos feriados' });
    }
});

// ============================================================================
// SINCRONIZACIÓN CON BASE DE DATOS
// ============================================================================

/**
 * @route POST /api/v1/holidays-api/sync/:countryCode/:year
 * @desc Sincronizar feriados de un país/año a la BD
 * @access Admin/Supervisor only
 */
router.post('/sync/:countryCode/:year', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { countryCode, year } = req.params;
        const { replaceExisting = false, onlyNational = true } = req.body;

        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            return res.status(400).json({ error: 'Año inválido' });
        }

        console.log(`[HOLIDAY-API] Sincronización solicitada: ${countryCode}/${yearNum}`);

        const result = await holidayApiService.syncHolidaysToDb(
            Holiday,
            countryCode,
            yearNum,
            { replaceExisting, onlyNational }
        );

        res.json(result);
    } catch (error) {
        console.error('[HOLIDAY-API] Error sync:', error.message);
        res.status(500).json({ error: 'Error sincronizando feriados' });
    }
});

/**
 * @route POST /api/v1/holidays-api/sync-multi/:countryCode
 * @desc Sincronizar feriados de múltiples años
 * @body { startYear: 2024, endYear: 2026 }
 * @access Admin/Supervisor only
 */
router.post('/sync-multi/:countryCode', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { countryCode } = req.params;
        const { startYear, endYear, replaceExisting = false, onlyNational = true } = req.body;

        if (!startYear || !endYear) {
            return res.status(400).json({ error: 'startYear y endYear son requeridos' });
        }

        if (endYear - startYear > 5) {
            return res.status(400).json({ error: 'Máximo 5 años por solicitud' });
        }

        console.log(`[HOLIDAY-API] Sync multi-year: ${countryCode} ${startYear}-${endYear}`);

        const results = await holidayApiService.syncMultipleYears(
            Holiday,
            countryCode,
            parseInt(startYear),
            parseInt(endYear),
            { replaceExisting, onlyNational }
        );

        // Calcular totales
        const totals = results.reduce((acc, r) => ({
            inserted: acc.inserted + (r.inserted || 0),
            updated: acc.updated + (r.updated || 0),
            skipped: acc.skipped + (r.skipped || 0)
        }), { inserted: 0, updated: 0, skipped: 0 });

        res.json({
            success: true,
            country: holidayApiService.getCountryName(countryCode),
            countryCode,
            years: { start: startYear, end: endYear },
            totals,
            details: results
        });
    } catch (error) {
        console.error('[HOLIDAY-API] Error sync-multi:', error.message);
        res.status(500).json({ error: 'Error sincronizando feriados' });
    }
});

/**
 * @route POST /api/v1/holidays-api/sync-for-branch/:branchId
 * @desc Sincronizar feriados según el país de una sucursal
 * @access Admin/Supervisor only
 */
router.post('/sync-for-branch/:branchId', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { branchId } = req.params;
        const { years = [new Date().getFullYear()] } = req.body;

        // Obtener sucursal
        const branch = await Branch.findByPk(branchId);
        if (!branch) {
            return res.status(404).json({ error: 'Sucursal no encontrada' });
        }

        // Verificar que tenga país configurado
        if (!branch.country) {
            return res.status(400).json({
                error: 'La sucursal no tiene país configurado',
                suggestion: 'Configure el país en la sucursal primero'
            });
        }

        const countryCode = branch.country;

        // Verificar si es código ISO válido
        const isSupported = await holidayApiService.isCountrySupported(countryCode);
        if (!isSupported) {
            return res.status(400).json({
                error: `País ${countryCode} no soportado en API externa`,
                branchCountry: branch.country
            });
        }

        // Sincronizar cada año
        const results = [];
        for (const year of years) {
            const result = await holidayApiService.syncHolidaysToDb(
                Holiday,
                countryCode,
                year,
                { onlyNational: true }
            );
            results.push(result);
        }

        res.json({
            success: true,
            branch: {
                id: branch.id,
                name: branch.name,
                country: branch.country
            },
            syncResults: results
        });
    } catch (error) {
        console.error('[HOLIDAY-API] Error sync-for-branch:', error.message);
        res.status(500).json({ error: 'Error sincronizando feriados para sucursal' });
    }
});

/**
 * @route POST /api/v1/holidays-api/sync-all-latam/:year
 * @desc Sincronizar feriados de TODOS los países LATAM para un año
 * @access Admin only
 */
router.post('/sync-all-latam/:year', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const { year } = req.params;
        const yearNum = parseInt(year);

        if (isNaN(yearNum)) {
            return res.status(400).json({ error: 'Año inválido' });
        }

        console.log(`[HOLIDAY-API] Sincronización LATAM completa: ${yearNum}`);

        const latamCountries = holidayApiService.getLatamCountries();
        const results = [];

        for (const country of latamCountries) {
            const result = await holidayApiService.syncHolidaysToDb(
                Holiday,
                country.code,
                yearNum,
                { onlyNational: true }
            );
            results.push(result);

            // Pequeño delay entre países
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Calcular totales
        const totals = results.reduce((acc, r) => ({
            inserted: acc.inserted + (r.inserted || 0),
            updated: acc.updated + (r.updated || 0),
            skipped: acc.skipped + (r.skipped || 0)
        }), { inserted: 0, updated: 0, skipped: 0 });

        const successful = results.filter(r => r.success).length;

        res.json({
            success: true,
            year: yearNum,
            countries: {
                total: latamCountries.length,
                successful
            },
            totals,
            details: results
        });
    } catch (error) {
        console.error('[HOLIDAY-API] Error sync-all-latam:', error.message);
        res.status(500).json({ error: 'Error sincronizando feriados LATAM' });
    }
});

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * @route DELETE /api/v1/holidays-api/cache
 * @desc Limpiar cache del servicio
 * @access Admin only
 */
router.delete('/cache', auth, supervisorOrAdmin, async (req, res) => {
    try {
        holidayApiService.clearCache();
        res.json({ success: true, message: 'Cache limpiado' });
    } catch (error) {
        res.status(500).json({ error: 'Error limpiando cache' });
    }
});

/**
 * @route GET /api/v1/holidays-api/health
 * @desc Verificar estado de la API externa
 * @access Public
 */
router.get('/health', async (req, res) => {
    try {
        const start = Date.now();
        const countries = await holidayApiService.getAvailableCountries();
        const responseTime = Date.now() - start;

        res.json({
            status: 'ok',
            api: 'Nager.Date',
            endpoint: 'https://date.nager.at',
            responseTime: `${responseTime}ms`,
            countriesAvailable: countries.length,
            latamSupport: true
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            api: 'Nager.Date',
            error: error.message
        });
    }
});

module.exports = router;
