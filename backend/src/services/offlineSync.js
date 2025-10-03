/**
 * Sistema de Sincronización Offline para APK Android
 * Maneja las fichadas cuando no hay conexión a internet
 */

const { v4: uuidv4 } = require('uuid');

class OfflineSyncService {
    constructor() {
        this.pendingQueue = new Map(); // Cola de operaciones pendientes por dispositivo
        this.syncInterval = 30000; // Intentar sincronizar cada 30 segundos
        this.maxRetries = 5;
        this.syncTimers = new Map();
    }

    /**
     * Registrar una operación pendiente de sincronización
     */
    addPendingOperation(deviceId, operation) {
        if (!this.pendingQueue.has(deviceId)) {
            this.pendingQueue.set(deviceId, []);
        }

        const pendingOp = {
            id: uuidv4(),
            deviceId,
            type: operation.type, // 'check_in', 'check_out', 'break_start', 'break_end'
            data: operation.data,
            timestamp: operation.timestamp || new Date().toISOString(),
            localTimestamp: operation.localTimestamp,
            retryCount: 0,
            status: 'pending',
            location: operation.location,
            biometricData: operation.biometricData
        };

        this.pendingQueue.get(deviceId).push(pendingOp);
        
        // Iniciar proceso de sincronización para este dispositivo
        this.startSyncProcess(deviceId);
        
        return pendingOp.id;
    }

    /**
     * Iniciar proceso de sincronización automática
     */
    startSyncProcess(deviceId) {
        if (this.syncTimers.has(deviceId)) {
            return; // Ya hay un proceso en marcha
        }

        const timer = setInterval(async () => {
            await this.syncDevice(deviceId);
        }, this.syncInterval);

        this.syncTimers.set(deviceId, timer);
    }

    /**
     * Sincronizar operaciones pendientes de un dispositivo
     */
    async syncDevice(deviceId) {
        const operations = this.pendingQueue.get(deviceId) || [];
        
        if (operations.length === 0) {
            this.stopSyncProcess(deviceId);
            return;
        }

        console.log(`🔄 [OFFLINE-SYNC] Sincronizando ${operations.length} operaciones del dispositivo ${deviceId}`);

        for (const operation of operations) {
            if (operation.status === 'completed') continue;
            
            try {
                const result = await this.processOperation(operation);
                
                if (result.success) {
                    operation.status = 'completed';
                    operation.syncedAt = new Date().toISOString();
                    console.log(`✅ [OFFLINE-SYNC] Operación ${operation.id} sincronizada`);
                } else {
                    operation.retryCount++;
                    
                    if (operation.retryCount >= this.maxRetries) {
                        operation.status = 'failed';
                        operation.error = result.error;
                        console.error(`❌ [OFFLINE-SYNC] Operación ${operation.id} falló después de ${this.maxRetries} intentos`);
                    }
                }
            } catch (error) {
                operation.retryCount++;
                operation.lastError = error.message;
                console.error(`⚠️ [OFFLINE-SYNC] Error procesando operación ${operation.id}:`, error);
            }
        }

        // Limpiar operaciones completadas
        const pending = operations.filter(op => op.status === 'pending');
        
        if (pending.length > 0) {
            this.pendingQueue.set(deviceId, pending);
        } else {
            this.pendingQueue.delete(deviceId);
            this.stopSyncProcess(deviceId);
        }
    }

    /**
     * Procesar una operación individual
     */
    async processOperation(operation) {
        const { Attendance, User } = require('../config/database');
        
        try {
            switch (operation.type) {
                case 'check_in':
                case 'check_out':
                    // Verificar si el usuario existe
                    const user = await User.findByPk(operation.data.userId);
                    if (!user) {
                        return { success: false, error: 'Usuario no encontrado' };
                    }

                    // Crear registro de asistencia
                    const attendance = await Attendance.create({
                        userId: operation.data.userId,
                        checkIn: operation.type === 'check_in' ? operation.timestamp : null,
                        checkOut: operation.type === 'check_out' ? operation.timestamp : null,
                        date: new Date(operation.timestamp).toISOString().split('T')[0],
                        location: operation.location ? JSON.stringify(operation.location) : null,
                        biometricVerified: !!operation.biometricData,
                        offlineSync: true,
                        syncedAt: new Date(),
                        deviceId: operation.deviceId,
                        localTimestamp: operation.localTimestamp
                    });

                    return { success: true, data: attendance };

                case 'break_start':
                case 'break_end':
                    // Buscar el registro de asistencia del día
                    const today = new Date(operation.timestamp).toISOString().split('T')[0];
                    const attendanceRecord = await Attendance.findOne({
                        where: {
                            userId: operation.data.userId,
                            date: today
                        }
                    });

                    if (!attendanceRecord) {
                        return { success: false, error: 'No hay registro de asistencia para actualizar' };
                    }

                    // Actualizar tiempos de descanso
                    if (operation.type === 'break_start') {
                        attendanceRecord.breakStart = operation.timestamp;
                    } else {
                        attendanceRecord.breakEnd = operation.timestamp;
                    }

                    await attendanceRecord.save();
                    return { success: true, data: attendanceRecord };

                default:
                    return { success: false, error: `Tipo de operación no soportado: ${operation.type}` };
            }
        } catch (error) {
            console.error('Error procesando operación:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Detener proceso de sincronización
     */
    stopSyncProcess(deviceId) {
        const timer = this.syncTimers.get(deviceId);
        if (timer) {
            clearInterval(timer);
            this.syncTimers.delete(deviceId);
        }
    }

    /**
     * Obtener estado de sincronización para un dispositivo
     */
    getSyncStatus(deviceId) {
        const operations = this.pendingQueue.get(deviceId) || [];
        
        return {
            deviceId,
            pendingCount: operations.filter(op => op.status === 'pending').length,
            completedCount: operations.filter(op => op.status === 'completed').length,
            failedCount: operations.filter(op => op.status === 'failed').length,
            isSyncing: this.syncTimers.has(deviceId),
            operations: operations.map(op => ({
                id: op.id,
                type: op.type,
                status: op.status,
                timestamp: op.timestamp,
                retryCount: op.retryCount
            }))
        };
    }

    /**
     * Forzar sincronización inmediata
     */
    async forceSyncNow(deviceId) {
        console.log(`⚡ [OFFLINE-SYNC] Forzando sincronización para dispositivo ${deviceId}`);
        return await this.syncDevice(deviceId);
    }

    /**
     * Limpiar cola de operaciones completadas
     */
    cleanupCompleted(deviceId) {
        const operations = this.pendingQueue.get(deviceId) || [];
        const pending = operations.filter(op => op.status !== 'completed');
        
        if (pending.length > 0) {
            this.pendingQueue.set(deviceId, pending);
        } else {
            this.pendingQueue.delete(deviceId);
            this.stopSyncProcess(deviceId);
        }
        
        return {
            cleaned: operations.length - pending.length,
            remaining: pending.length
        };
    }
}

// Singleton instance
const offlineSyncService = new OfflineSyncService();

module.exports = offlineSyncService;