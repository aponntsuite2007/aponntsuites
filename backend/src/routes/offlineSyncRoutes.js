/**
 * Rutas API para Sincronización Offline
 * Maneja las operaciones pendientes de la APK cuando no hay conexión
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const offlineSyncService = require('../services/offlineSync');

// 📤 Enviar operaciones pendientes desde la APK
router.post('/queue', auth, async (req, res) => {
    try {
        const { deviceId, operations } = req.body;
        
        if (!deviceId || !operations || !Array.isArray(operations)) {
            return res.status(400).json({
                success: false,
                error: 'deviceId y operations son requeridos'
            });
        }

        const queuedIds = [];
        
        for (const operation of operations) {
            const id = offlineSyncService.addPendingOperation(deviceId, operation);
            queuedIds.push(id);
        }

        res.json({
            success: true,
            message: `${operations.length} operaciones agregadas a la cola`,
            queuedIds,
            deviceId
        });

    } catch (error) {
        console.error('Error agregando operaciones a la cola:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 🔄 Sincronizar operaciones pendientes manualmente
router.post('/sync/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        await offlineSyncService.forceSyncNow(deviceId);
        const status = offlineSyncService.getSyncStatus(deviceId);
        
        res.json({
            success: true,
            message: 'Sincronización iniciada',
            status
        });

    } catch (error) {
        console.error('Error sincronizando dispositivo:', error);
        res.status(500).json({
            success: false,
            error: 'Error durante la sincronización'
        });
    }
});

// 📊 Obtener estado de sincronización
router.get('/status/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const status = offlineSyncService.getSyncStatus(deviceId);
        
        res.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('Error obteniendo estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estado de sincronización'
        });
    }
});

// 🧹 Limpiar operaciones completadas
router.delete('/cleanup/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const result = offlineSyncService.cleanupCompleted(deviceId);
        
        res.json({
            success: true,
            message: `${result.cleaned} operaciones limpiadas`,
            remaining: result.remaining
        });

    } catch (error) {
        console.error('Error limpiando operaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error limpiando operaciones completadas'
        });
    }
});

// 📱 Endpoint especial para la APK - Batch sync
router.post('/batch', async (req, res) => {
    try {
        const { 
            deviceId, 
            deviceInfo,
            operations,
            lastSyncTime,
            companyId 
        } = req.body;

        if (!deviceId || !operations) {
            return res.status(400).json({
                success: false,
                error: 'Datos incompletos'
            });
        }

        console.log(`📱 [OFFLINE-SYNC] Recibiendo batch de ${operations.length} operaciones del dispositivo ${deviceId}`);

        const results = [];
        let successCount = 0;
        let failCount = 0;

        // Procesar cada operación
        for (const op of operations) {
            try {
                // Agregar a la cola para procesamiento
                const id = offlineSyncService.addPendingOperation(deviceId, {
                    ...op,
                    companyId,
                    deviceInfo
                });

                results.push({
                    localId: op.localId,
                    serverId: id,
                    status: 'queued'
                });
                successCount++;

            } catch (error) {
                results.push({
                    localId: op.localId,
                    status: 'failed',
                    error: error.message
                });
                failCount++;
            }
        }

        // Iniciar sincronización inmediata
        offlineSyncService.forceSyncNow(deviceId);

        res.json({
            success: true,
            message: `Batch procesado: ${successCount} exitosos, ${failCount} fallidos`,
            results,
            serverTime: new Date().toISOString(),
            nextSyncIn: 30000 // Próxima sincronización en 30 segundos
        });

    } catch (error) {
        console.error('Error procesando batch:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando batch de operaciones'
        });
    }
});

// 🔍 Verificar conectividad (heartbeat)
router.get('/heartbeat', (req, res) => {
    res.json({
        success: true,
        serverTime: new Date().toISOString(),
        status: 'online',
        version: '1.0.0'
    });
});

module.exports = router;