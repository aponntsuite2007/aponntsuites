/**
 * PROACTIVE NOTIFICATIONS ROUTES - API Endpoints para Notificaciones Proactivas
 *
 * Rutas para gestión de reglas preventivas, ejecución manual,
 * historial de detecciones y dashboard
 *
 * @version 2.0
 * @date 2025-10-16
 */

const express = require('express');
const router = express.Router();
const proactiveService = require('../services/proactiveNotificationService');

// Middleware de autenticación con JWT
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'aponnt_2024_secret_key_ultra_secure';

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            // Fallback a headers custom para compatibilidad
            req.user = {
                employee_id: req.headers['x-employee-id'] || 'EMP-DEFAULT',
                company_id: parseInt(req.headers['x-company-id']) || null,
                role: req.headers['x-role'] || 'employee'
            };
            return next();
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token mal formado'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            employee_id: decoded.employee_id || decoded.id,
            company_id: decoded.company_id || decoded.companyId,
            role: decoded.role || 'employee'
        };

        next();
    } catch (error) {
        console.error('❌ Error verificando token:', error.message);
        return res.status(401).json({
            success: false,
            error: 'Token inválido o expirado'
        });
    }
};

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE PROACTIVE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/proactive/dashboard
 * Obtiene dashboard de reglas proactivas con estadísticas
 */
router.get('/dashboard', async (req, res) => {
    try {
        const { company_id } = req.user;

        const dashboard = await proactiveService.getProactiveDashboard(company_id);

        res.json({
            success: true,
            dashboard: dashboard
        });

    } catch (error) {
        console.error('❌ Error obteniendo dashboard proactivo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/proactive/execute
 * Ejecuta todas las reglas activas manualmente
 */
router.post('/execute', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;

        const results = await proactiveService.executeAllRules(company_id);

        res.json({
            success: true,
            message: 'Ejecución completada',
            results: results
        });

    } catch (error) {
        console.error('❌ Error ejecutando reglas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/proactive/rules
 * Obtiene todas las reglas activas
 */
router.get('/rules', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;

        const rules = await proactiveService.getActiveRules(company_id);

        res.json({
            success: true,
            rules: rules,
            total: rules.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo reglas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/proactive/rules
 * Crea una nueva regla proactiva
 */
router.post('/rules', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const ruleData = req.body;

        // Validar campos requeridos
        if (!ruleData.rule_name || !ruleData.rule_type || !ruleData.trigger_threshold) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: rule_name, rule_type, trigger_threshold'
            });
        }

        const rule = await proactiveService.createRule(company_id, ruleData);

        res.status(201).json({
            success: true,
            message: 'Regla creada exitosamente',
            rule: rule
        });

    } catch (error) {
        console.error('❌ Error creando regla:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/proactive/rules/:id
 * Actualiza una regla existente
 */
router.put('/rules/:id', requireRRHH, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const rule = await proactiveService.updateRule(parseInt(id), updates);

        res.json({
            success: true,
            message: 'Regla actualizada exitosamente',
            rule: rule
        });

    } catch (error) {
        console.error('❌ Error actualizando regla:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/proactive/rules/:id
 * Desactiva una regla
 */
router.delete('/rules/:id', requireRRHH, async (req, res) => {
    try {
        const { id } = req.params;

        await proactiveService.deactivateRule(parseInt(id));

        res.json({
            success: true,
            message: 'Regla desactivada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error desactivando regla:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/proactive/rules/:id/history
 * Obtiene historial de ejecuciones de una regla
 */
router.get('/rules/:id/history', requireRRHH, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50 } = req.query;

        const history = await proactiveService.getExecutionHistory(
            parseInt(id),
            parseInt(limit)
        );

        res.json({
            success: true,
            rule_id: parseInt(id),
            history: history,
            total: history.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/proactive/rules/:id/execute
 * Ejecuta una regla específica manualmente
 */
router.post('/rules/:id/execute', requireRRHH, async (req, res) => {
    try {
        const { company_id } = req.user;
        const { id } = req.params;

        // Obtener la regla
        const rules = await proactiveService.getActiveRules(company_id);
        const rule = rules.find(r => r.id === parseInt(id));

        if (!rule) {
            return res.status(404).json({
                success: false,
                error: 'Regla no encontrada'
            });
        }

        // Ejecutar la regla
        const result = await proactiveService.executeRule(company_id, rule);

        res.json({
            success: true,
            message: 'Regla ejecutada exitosamente',
            result: result
        });

    } catch (error) {
        console.error('❌ Error ejecutando regla:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
