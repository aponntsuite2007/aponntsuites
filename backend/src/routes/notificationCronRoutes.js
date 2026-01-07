/**
 * ============================================================================
 * NOTIFICATION CRON ROUTES
 * ============================================================================
 *
 * API REST para controlar y monitorear los cron jobs de notificaciones
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/notifications/cron/status
 * Obtener estado de los cron jobs
 */
router.get('/status', async (req, res) => {
    try {
        if (!global.notificationCronService) {
            return res.status(503).json({
                success: false,
                message: 'Servicio de cron jobs no inicializado'
            });
        }

        const status = global.notificationCronService.getStatus();

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error obteniendo status de cron jobs:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/notifications/cron/start
 * Iniciar cron jobs
 */
router.post('/start', async (req, res) => {
    try {
        if (!global.notificationCronService) {
            return res.status(503).json({
                success: false,
                message: 'Servicio de cron jobs no inicializado'
            });
        }

        global.notificationCronService.start();

        res.json({
            success: true,
            message: 'Cron jobs iniciados correctamente'
        });
    } catch (error) {
        console.error('Error iniciando cron jobs:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/notifications/cron/stop
 * Detener cron jobs
 */
router.post('/stop', async (req, res) => {
    try {
        if (!global.notificationCronService) {
            return res.status(503).json({
                success: false,
                message: 'Servicio de cron jobs no inicializado'
            });
        }

        global.notificationCronService.stop();

        res.json({
            success: true,
            message: 'Cron jobs detenidos correctamente'
        });
    } catch (error) {
        console.error('Error deteniendo cron jobs:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/notifications/cron/run/:jobName
 * Ejecutar manualmente un job específico
 *
 * jobName: sla, warnings, cleanup, proactive
 */
router.post('/run/:jobName', async (req, res) => {
    try {
        const { jobName } = req.params;

        if (!global.notificationCronService) {
            return res.status(503).json({
                success: false,
                message: 'Servicio de cron jobs no inicializado'
            });
        }

        const validJobs = ['sla', 'warnings', 'cleanup', 'proactive'];
        if (!validJobs.includes(jobName)) {
            return res.status(400).json({
                success: false,
                message: `Job inválido. Usar: ${validJobs.join(', ')}`
            });
        }

        console.log(`📞 [API] Ejecutando job manual: ${jobName}`);

        // Ejecutar en background y retornar inmediatamente
        global.notificationCronService.runJob(jobName).catch(err => {
            console.error(`Error ejecutando job ${jobName}:`, err);
        });

        res.json({
            success: true,
            message: `Job "${jobName}" ejecutándose en background`
        });
    } catch (error) {
        console.error('Error ejecutando job:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
