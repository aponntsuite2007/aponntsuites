/**
 * Privacy Regulation Routes - API para regulaciones de privacidad multi-país
 * Sistema de Asistencia Biométrico v3.0
 *
 * Endpoints para consultar configuración de privacidad por país,
 * generar documentos de consentimiento y verificar cumplimiento.
 */

const express = require('express');
const router = express.Router();
const PrivacyRegulationService = require('../services/PrivacyRegulationService');
const { auth, adminOnly } = require('../middleware/auth');

/**
 * GET /api/privacy/countries
 * Lista todos los países configurados con regulaciones de privacidad
 * Requiere: autenticación
 */
router.get('/countries', auth, async (req, res) => {
    try {
        const countries = await PrivacyRegulationService.listConfiguredCountries();

        res.json({
            success: true,
            data: countries,
            count: countries.length
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error listando países:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo lista de países',
            message: error.message
        });
    }
});

/**
 * GET /api/privacy/config/:countryCode
 * Obtiene la configuración de privacidad para un país específico
 * Requiere: autenticación
 */
router.get('/config/:countryCode', auth, async (req, res) => {
    try {
        const { countryCode } = req.params;

        if (!countryCode || countryCode.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Código de país inválido'
            });
        }

        const config = await PrivacyRegulationService.getPrivacyConfigByCountryCode(countryCode.toUpperCase());

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error obteniendo config por país:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo configuración de privacidad',
            message: error.message
        });
    }
});

/**
 * GET /api/privacy/company-config
 * Obtiene la configuración de privacidad para la empresa del usuario autenticado
 * Requiere: autenticación
 */
router.get('/company-config', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Usuario no tiene empresa asociada'
            });
        }

        const config = await PrivacyRegulationService.getPrivacyConfigForCompany(companyId);

        res.json({
            success: true,
            data: config,
            companyId
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error obteniendo config de empresa:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo configuración de privacidad',
            message: error.message
        });
    }
});

/**
 * POST /api/privacy/generate-consent
 * Genera un documento de consentimiento personalizado
 * Requiere: autenticación
 * Body: { includeEmotional, includeDataSharing, employeeName, companyName }
 */
router.post('/generate-consent', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const {
            includeEmotional = true,
            includeDataSharing = false,
            employeeName = '',
            companyName = ''
        } = req.body;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Usuario no tiene empresa asociada'
            });
        }

        const document = await PrivacyRegulationService.generateConsentDocument(companyId, {
            includeEmotional,
            includeDataSharing,
            employeeName,
            companyName
        });

        res.json({
            success: true,
            data: document
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error generando documento:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando documento de consentimiento',
            message: error.message
        });
    }
});

/**
 * GET /api/privacy/validate-analysis/:type
 * Valida si un tipo de análisis está permitido para la empresa
 * Requiere: autenticación
 * Params: type = 'biometric' | 'emotional'
 */
router.get('/validate-analysis/:type', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { type } = req.params;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Usuario no tiene empresa asociada'
            });
        }

        if (!['biometric', 'emotional'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de análisis inválido. Use: biometric o emotional'
            });
        }

        const validation = await PrivacyRegulationService.validateAnalysisPermission(companyId, type);

        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error validando análisis:', error);
        res.status(500).json({
            success: false,
            error: 'Error validando permiso de análisis',
            message: error.message
        });
    }
});

/**
 * GET /api/privacy/compliance-summary
 * Obtiene un resumen de cumplimiento para la empresa
 * Requiere: autenticación
 */
router.get('/compliance-summary', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Usuario no tiene empresa asociada'
            });
        }

        const summary = await PrivacyRegulationService.getComplianceSummary(companyId);

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error obteniendo resumen:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo resumen de cumplimiento',
            message: error.message
        });
    }
});

/**
 * POST /api/privacy/clear-cache
 * Limpia el cache de configuraciones de privacidad (solo admin)
 * Requiere: autenticación + admin
 */
router.post('/clear-cache', auth, adminOnly, async (req, res) => {
    try {
        PrivacyRegulationService.clearCache();

        res.json({
            success: true,
            message: 'Cache de regulaciones de privacidad limpiado'
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error limpiando cache:', error);
        res.status(500).json({
            success: false,
            error: 'Error limpiando cache',
            message: error.message
        });
    }
});

/**
 * GET /api/privacy/employee/:employeeId/regulation
 * Obtiene la regulación de privacidad aplicable a un empleado específico
 * basándose en la sucursal donde trabaja
 * Requiere: autenticación
 */
router.get('/employee/:employeeId/regulation', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Usuario no tiene empresa asociada'
            });
        }

        const regulation = await PrivacyRegulationService.getEmployeeRegulation(employeeId, companyId);

        res.json({
            success: true,
            data: regulation
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error obteniendo regulación de empleado:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo regulación aplicable',
            message: error.message
        });
    }
});

/**
 * GET /api/privacy/my-regulation
 * Obtiene la regulación de privacidad aplicable al usuario autenticado
 * basándose en su sucursal predeterminada
 * Requiere: autenticación
 */
router.get('/my-regulation', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Usuario no tiene empresa asociada'
            });
        }

        const regulation = await PrivacyRegulationService.getEmployeeRegulation(userId, companyId);

        res.json({
            success: true,
            data: regulation
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error obteniendo mi regulación:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo regulación aplicable',
            message: error.message
        });
    }
});

/**
 * GET /api/privacy/branches-by-country
 * Obtiene las sucursales de la empresa agrupadas por país
 * Requiere: autenticación
 */
router.get('/branches-by-country', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Usuario no tiene empresa asociada'
            });
        }

        const branchesByCountry = await PrivacyRegulationService.getBranchesByCountry(companyId);

        res.json({
            success: true,
            data: branchesByCountry
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error obteniendo sucursales por país:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo sucursales',
            message: error.message
        });
    }
});

/**
 * GET /api/privacy/employees-by-regulation
 * Obtiene los empleados agrupados por la regulación que les aplica
 * Requiere: autenticación + admin
 */
router.get('/employees-by-regulation', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Usuario no tiene empresa asociada'
            });
        }

        const employeesByRegulation = await PrivacyRegulationService.getEmployeesByRegulation(companyId);

        res.json({
            success: true,
            data: employeesByRegulation
        });
    } catch (error) {
        console.error('[PRIVACY-API] Error obteniendo empleados por regulación:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo empleados por regulación',
            message: error.message
        });
    }
});

module.exports = router;
