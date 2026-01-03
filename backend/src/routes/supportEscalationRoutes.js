/**
 * ============================================================================
 * SUPPORT ESCALATION ROUTES
 * ============================================================================
 * Rutas para el sistema de escalamiento de tickets de soporte
 */

const express = require('express');
const router = express.Router();
const supportTicketEscalationService = require('../services/SupportTicketEscalationService');
const { auth: auth } = require('../middleware/auth');

/**
 * POST /api/v1/support/escalate
 * Escalamiento voluntario de ticket por soporte
 */
router.post('/escalate', auth, async (req, res) => {
    try {
        const { ticketId, reason } = req.body;
        const staffId = req.user.id;

        if (!ticketId) {
            return res.status(400).json({
                success: false,
                error: 'ticketId es requerido'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'reason es requerido para escalamiento voluntario'
            });
        }

        // Verificar que el usuario es staff de Aponnt
        const isAponntStaff = ['admin', 'super_admin', 'aponnt_support', 'vendor'].includes(req.user.role);
        if (!isAponntStaff) {
            return res.status(403).json({
                success: false,
                error: 'Solo staff de Aponnt puede escalar tickets'
            });
        }

        const result = await supportTicketEscalationService.voluntaryEscalate(
            ticketId,
            staffId,
            reason
        );

        res.json(result);

    } catch (error) {
        console.error('[ESCALATION-ROUTES] Error en escalamiento voluntario:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/support/escalation/history/:ticketId
 * Obtener historial de escalamientos de un ticket
 */
router.get('/escalation/history/:ticketId', auth, async (req, res) => {
    try {
        const { ticketId } = req.params;

        const history = await supportTicketEscalationService.getEscalationHistory(ticketId);

        res.json({
            success: true,
            history
        });

    } catch (error) {
        console.error('[ESCALATION-ROUTES] Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/support/escalation/stats
 * Obtener estadísticas de escalamiento
 */
router.get('/escalation/stats', auth, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;

        const stats = await supportTicketEscalationService.getStats(dateFrom, dateTo);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('[ESCALATION-ROUTES] Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/support/escalation/status
 * Obtener estado del servicio de escalamiento
 */
router.get('/escalation/status', auth, async (req, res) => {
    try {
        const status = supportTicketEscalationService.getStatus();

        res.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('[ESCALATION-ROUTES] Error obteniendo estado:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/support/escalation/run-cycle
 * Ejecutar ciclo de escalamiento manualmente (solo admin)
 */
router.post('/escalation/run-cycle', auth, async (req, res) => {
    try {
        // Solo admin puede ejecutar manualmente
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden ejecutar el ciclo manualmente'
            });
        }

        const result = await supportTicketEscalationService.runEscalationCycle();

        res.json({
            success: true,
            message: 'Ciclo de escalamiento ejecutado',
            result
        });

    } catch (error) {
        console.error('[ESCALATION-ROUTES] Error ejecutando ciclo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
