/**
 * ============================================================================
 * FAST ATTENDANCE ROUTES - Endpoints Optimizados para Fichaje Masivo
 * ============================================================================
 *
 * Diseñado para:
 * - Respuesta en <100ms (sin esperar procesamiento)
 * - Miles de fichajes simultáneos
 * - Conexiones lentas/inestables
 * - Recursos limitados (Render Free/Starter)
 *
 * @version 1.0.0
 * @date 2025-12-16
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const attendanceQueue = require('../services/AttendanceQueueService');

// Multer para imágenes biométricas
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max (reducido para velocidad)
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo imágenes permitidas'), false);
        }
    }
});

/**
 * ========================================================================
 * POST /api/v3/attendance/fast-clock-in
 * ========================================================================
 * Fichaje rápido con respuesta inmediata
 *
 * Flujo:
 * 1. Recibe datos biométricos
 * 2. Encola para procesamiento
 * 3. Responde inmediatamente con ticketId
 * 4. Cliente puede consultar estado con ticketId
 */
router.post('/fast-clock-in', upload.single('photo'), async (req, res) => {
    const startTime = Date.now();

    try {
        const {
            companyId,
            kioskId,
            embedding,  // Embedding precalculado desde frontend
            latitude,
            longitude,
            deviceInfo,
            timestamp
        } = req.body;

        // Validación mínima (rápida)
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'companyId requerido'
            });
        }

        // Preparar datos para la cola
        const attendanceData = {
            companyId: parseInt(companyId),
            kioskId,
            embedding: embedding ? JSON.parse(embedding) : null,
            captureData: req.file ? req.file.buffer : null,
            latitude: parseFloat(latitude) || null,
            longitude: parseFloat(longitude) || null,
            deviceInfo: deviceInfo || 'mobile',
            clientTimestamp: timestamp || new Date().toISOString(),
            receivedAt: new Date().toISOString()
        };

        // Encolar (respuesta inmediata)
        const queueResult = await attendanceQueue.enqueue(attendanceData);

        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            ticketId: queueResult.ticketId,
            message: '✅ Fichaje recibido',
            queuePosition: queueResult.queuePosition,
            estimatedWait: queueResult.estimatedWait,
            responseTime,
            // Para debug
            _debug: {
                serverTime: new Date().toISOString(),
                processedIn: `${responseTime}ms`
            }
        });

    } catch (error) {
        console.error('❌ [FAST-CLOCK-IN] Error:', error.message);

        res.status(500).json({
            success: false,
            error: 'Error procesando fichaje',
            canRetry: true,
            retryAfter: 2000
        });
    }
});

/**
 * ========================================================================
 * GET /api/v3/attendance/ticket/:ticketId
 * ========================================================================
 * Consultar estado de un fichaje encolado
 */
router.get('/ticket/:ticketId', async (req, res) => {
    const { ticketId } = req.params;

    const status = attendanceQueue.getTicketStatus(ticketId);

    if (!status.found) {
        // Puede haber sido procesado y eliminado de la cola
        return res.json({
            success: true,
            ticketId,
            status: 'completed_or_expired',
            message: 'Ticket procesado o expirado'
        });
    }

    res.json({
        success: true,
        ticketId,
        status: status.status,
        queuePosition: status.queuePosition,
        estimatedWait: status.estimatedWait
    });
});

/**
 * ========================================================================
 * GET /api/v3/attendance/health
 * ========================================================================
 * Health check rápido para APK (detectar si servidor está vivo)
 */
router.get('/health', (req, res) => {
    // Respuesta mínima y rápida
    res.json({
        ok: true,
        ts: Date.now()
    });
});

/**
 * ========================================================================
 * GET /api/v3/attendance/ready
 * ========================================================================
 * Readiness check (servidor listo para recibir fichajes)
 */
router.get('/ready', async (req, res) => {
    const queueHealth = attendanceQueue.isHealthy();

    res.json({
        ready: queueHealth.healthy,
        queue: {
            length: queueHealth.queueLength,
            workers: queueHealth.activeWorkers,
            cached: queueHealth.cacheSize
        },
        metrics: queueHealth.metrics
    });
});

/**
 * ========================================================================
 * POST /api/v3/attendance/preload-cache
 * ========================================================================
 * Pre-cargar cache de templates (llamar al iniciar servidor o CRON)
 */
router.post('/preload-cache', async (req, res) => {
    try {
        const { companyIds } = req.body;

        if (!companyIds || !Array.isArray(companyIds)) {
            // Cargar todas las empresas activas
            const { sequelize } = require('../config/database');
            const { QueryTypes } = require('sequelize');

            const companies = await sequelize.query(
                'SELECT company_id FROM companies WHERE is_active = true',
                { type: QueryTypes.SELECT }
            );

            const ids = companies.map(c => c.company_id);
            await attendanceQueue.preloadCache(ids);

            return res.json({
                success: true,
                message: `Cache precargado para ${ids.length} empresas`,
                companies: ids
            });
        }

        await attendanceQueue.preloadCache(companyIds);

        res.json({
            success: true,
            message: `Cache precargado para ${companyIds.length} empresas`
        });

    } catch (error) {
        console.error('❌ [PRELOAD] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ========================================================================
 * DELETE /api/v3/attendance/cache/:companyId
 * ========================================================================
 * Invalidar cache de una empresa (cuando se actualiza biometría)
 */
router.delete('/cache/:companyId', (req, res) => {
    const { companyId } = req.params;

    attendanceQueue.invalidateCache(parseInt(companyId));

    res.json({
        success: true,
        message: `Cache invalidado para empresa ${companyId}`
    });
});

/**
 * ========================================================================
 * GET /api/v3/attendance/metrics
 * ========================================================================
 * Métricas del sistema de colas
 */
router.get('/metrics', (req, res) => {
    const metrics = attendanceQueue.getMetrics();

    res.json({
        success: true,
        metrics: {
            ...metrics,
            successRate: metrics.processed > 0
                ? ((metrics.processed / (metrics.processed + metrics.failed)) * 100).toFixed(2) + '%'
                : 'N/A',
            avgProcessingTime: metrics.avgProcessingTime.toFixed(0) + 'ms'
        }
    });
});

module.exports = router;
