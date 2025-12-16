/**
 * ============================================================================
 * ATTENDANCE QUEUE SERVICE - Sistema de Cola para Fichajes Masivos
 * ============================================================================
 *
 * Optimizado para:
 * - Miles de fichajes simultáneos (rush hour 7:58-8:00 AM)
 * - Conexiones lentas/inestables (3G, zonas rurales)
 * - Recursos limitados de Render (Free/Starter tier)
 *
 * Estrategia:
 * 1. Respuesta inmediata al cliente (<100ms)
 * 2. Procesamiento en background (queue)
 * 3. Cache de templates en memoria
 * 4. Reintentos automáticos
 *
 * @version 1.0.0
 * @date 2025-12-16
 * ============================================================================
 */

const EventEmitter = require('events');

class AttendanceQueueService extends EventEmitter {
    constructor() {
        super();

        // Cola en memoria (en producción usar Redis/Bull)
        this.queue = [];
        this.processing = false;
        this.concurrency = 3; // Procesar 3 fichajes simultáneos
        this.activeWorkers = 0;

        // Cache de templates biométricos por empresa
        this.templatesCache = new Map();
        this.templatesCacheExpiry = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos

        // Métricas
        this.metrics = {
            queued: 0,
            processed: 0,
            failed: 0,
            avgProcessingTime: 0,
            peakQueueSize: 0
        };

        // Pending responses (para notificar resultado)
        this.pendingCallbacks = new Map();

        console.log('🚀 [QUEUE] AttendanceQueueService inicializado');
    }

    /**
     * ========================================================================
     * ENCOLAR FICHAJE - Respuesta inmediata
     * ========================================================================
     */
    async enqueue(attendanceData) {
        const ticketId = this.generateTicketId();
        const timestamp = Date.now();

        const queueItem = {
            ticketId,
            timestamp,
            data: attendanceData,
            retries: 0,
            maxRetries: 3,
            status: 'queued'
        };

        this.queue.push(queueItem);
        this.metrics.queued++;
        this.metrics.peakQueueSize = Math.max(this.metrics.peakQueueSize, this.queue.length);

        console.log(`📥 [QUEUE] Fichaje encolado: ${ticketId} (cola: ${this.queue.length})`);

        // Iniciar procesamiento si no está corriendo
        this.processQueue();

        // Respuesta inmediata al cliente
        return {
            success: true,
            ticketId,
            message: 'Fichaje recibido correctamente',
            queuePosition: this.queue.length,
            estimatedWait: this.estimateWaitTime(),
            status: 'queued'
        };
    }

    /**
     * ========================================================================
     * PROCESAR COLA - Background workers
     * ========================================================================
     */
    async processQueue() {
        // No iniciar más workers si ya hay suficientes
        if (this.activeWorkers >= this.concurrency) {
            return;
        }

        while (this.queue.length > 0 && this.activeWorkers < this.concurrency) {
            this.activeWorkers++;

            const item = this.queue.shift();
            if (!item) {
                this.activeWorkers--;
                continue;
            }

            // Procesar en background (no await para no bloquear)
            this.processItem(item).finally(() => {
                this.activeWorkers--;
                // Continuar procesando si hay más items
                if (this.queue.length > 0) {
                    setImmediate(() => this.processQueue());
                }
            });
        }
    }

    /**
     * ========================================================================
     * PROCESAR ITEM INDIVIDUAL
     * ========================================================================
     */
    async processItem(item) {
        const startTime = Date.now();
        item.status = 'processing';

        try {
            console.log(`⚙️  [QUEUE] Procesando ${item.ticketId}...`);

            // Obtener templates desde cache o BD
            const templates = await this.getTemplatesCached(item.data.companyId);

            // Realizar matching biométrico
            const matchResult = await this.performMatching(item.data, templates);

            if (!matchResult.success) {
                throw new Error(matchResult.reason || 'Matching failed');
            }

            // Registrar asistencia en BD
            const attendanceRecord = await this.recordAttendance(item.data, matchResult);

            const processingTime = Date.now() - startTime;
            this.updateMetrics(processingTime, true);

            item.status = 'completed';
            item.result = {
                success: true,
                attendanceId: attendanceRecord.id,
                employeeName: matchResult.employeeName,
                clockInTime: attendanceRecord.clockInTime,
                processingTime
            };

            console.log(`✅ [QUEUE] ${item.ticketId} completado en ${processingTime}ms`);

            // Emitir evento de completado
            this.emit('completed', item);

            // Notificar callback si existe
            this.notifyCallback(item.ticketId, item.result);

            return item.result;

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`❌ [QUEUE] Error procesando ${item.ticketId}:`, error.message);

            // Reintentar si no excedió máximo
            if (item.retries < item.maxRetries) {
                item.retries++;
                item.status = 'retrying';
                console.log(`🔄 [QUEUE] Reintento ${item.retries}/${item.maxRetries} para ${item.ticketId}`);

                // Reencolar con delay exponencial
                setTimeout(() => {
                    this.queue.push(item);
                    this.processQueue();
                }, Math.pow(2, item.retries) * 1000);

                return null;
            }

            // Falló definitivamente
            this.updateMetrics(processingTime, false);
            item.status = 'failed';
            item.error = error.message;

            this.emit('failed', item);
            this.notifyCallback(item.ticketId, { success: false, error: error.message });

            return { success: false, error: error.message };
        }
    }

    /**
     * ========================================================================
     * CACHE DE TEMPLATES BIOMÉTRICOS
     * ========================================================================
     */
    async getTemplatesCached(companyId) {
        const cacheKey = `templates_${companyId}`;
        const now = Date.now();

        // Verificar cache
        if (this.templatesCache.has(cacheKey)) {
            const expiry = this.templatesCacheExpiry.get(cacheKey);
            if (expiry > now) {
                console.log(`📦 [CACHE] Templates para empresa ${companyId} desde cache`);
                return this.templatesCache.get(cacheKey);
            }
        }

        // Cargar desde BD
        console.log(`🔍 [CACHE] Cargando templates para empresa ${companyId} desde BD...`);
        const templates = await this.loadTemplatesFromDB(companyId);

        // Guardar en cache
        this.templatesCache.set(cacheKey, templates);
        this.templatesCacheExpiry.set(cacheKey, now + this.CACHE_TTL);

        console.log(`💾 [CACHE] ${templates.length} templates cacheados para empresa ${companyId}`);

        return templates;
    }

    async loadTemplatesFromDB(companyId) {
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        // Los embeddings están en biometric_templates, no en users
        // Hacemos JOIN para obtener nombre del empleado + embedding
        const templates = await sequelize.query(`
            SELECT
                u.user_id,
                u.usuario,
                u."firstName",
                u."lastName",
                u.biometric_photo_url,
                bt.embedding_encrypted,
                bt.quality_score,
                bt.is_primary
            FROM users u
            INNER JOIN biometric_templates bt ON bt.employee_id = u.user_id::text
            WHERE u.company_id = $1
              AND u.is_active = true
              AND bt.is_active = true
              AND bt.embedding_encrypted IS NOT NULL
            ORDER BY bt.is_primary DESC, bt.quality_score DESC
        `, {
            bind: [companyId],
            type: QueryTypes.SELECT
        });

        // Desencriptar/parsear embeddings (pueden estar como JSON string)
        return templates.map(t => {
            let embedding = null;
            try {
                // embedding_encrypted puede ser JSON string de array
                if (t.embedding_encrypted) {
                    embedding = typeof t.embedding_encrypted === 'string'
                        ? JSON.parse(t.embedding_encrypted)
                        : t.embedding_encrypted;
                }
            } catch (e) {
                console.warn(`⚠️ [CACHE] Error parseando embedding para user ${t.user_id}`);
            }

            return {
                userId: t.user_id,
                username: t.usuario,
                name: `${t.firstName || ''} ${t.lastName || ''}`.trim(),
                embedding,
                photoUrl: t.biometric_photo_url,
                qualityScore: t.quality_score,
                isPrimary: t.is_primary
            };
        }).filter(t => t.embedding !== null);
    }

    /**
     * Invalidar cache de una empresa (cuando se actualiza un usuario)
     */
    invalidateCache(companyId) {
        const cacheKey = `templates_${companyId}`;
        this.templatesCache.delete(cacheKey);
        this.templatesCacheExpiry.delete(cacheKey);
        console.log(`🗑️  [CACHE] Cache invalidado para empresa ${companyId}`);
    }

    /**
     * Pre-cargar cache de empresas activas (llamar al iniciar servidor)
     */
    async preloadCache(companyIds) {
        console.log(`🔄 [CACHE] Pre-cargando templates para ${companyIds.length} empresas...`);

        for (const companyId of companyIds) {
            try {
                await this.getTemplatesCached(companyId);
            } catch (error) {
                console.error(`❌ [CACHE] Error pre-cargando empresa ${companyId}:`, error.message);
            }
        }

        console.log(`✅ [CACHE] Pre-carga completada`);
    }

    /**
     * ========================================================================
     * MATCHING BIOMÉTRICO OPTIMIZADO
     * ========================================================================
     */
    async performMatching(attendanceData, templates) {
        const { embedding, captureData } = attendanceData;

        if (!embedding && !captureData) {
            return { success: false, reason: 'NO_BIOMETRIC_DATA' };
        }

        // Si viene embedding del frontend, usarlo directamente
        const candidateEmbedding = embedding || await this.extractEmbedding(captureData);

        if (!candidateEmbedding) {
            return { success: false, reason: 'EMBEDDING_EXTRACTION_FAILED' };
        }

        // Buscar mejor match
        let bestMatch = null;
        let bestSimilarity = 0;

        for (const template of templates) {
            if (!template.embedding) continue;

            const similarity = this.cosineSimilarity(candidateEmbedding, template.embedding);

            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = template;
            }
        }

        // Threshold de matching
        const THRESHOLD = 0.75;

        if (bestMatch && bestSimilarity >= THRESHOLD) {
            return {
                success: true,
                userId: bestMatch.userId,
                employeeName: bestMatch.name,
                similarity: bestSimilarity,
                confidence: Math.min(bestSimilarity * 1.1, 1.0)
            };
        }

        return {
            success: false,
            reason: bestSimilarity > 0.5 ? 'LOW_CONFIDENCE' : 'NO_MATCH',
            bestSimilarity
        };
    }

    /**
     * Calcular similitud coseno entre embeddings
     */
    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * ========================================================================
     * REGISTRAR ASISTENCIA EN BD
     * ========================================================================
     */
    async recordAttendance(attendanceData, matchResult) {
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const now = new Date();

        const [result] = await sequelize.query(`
            INSERT INTO attendance (
                user_id, company_id, check_in, status,
                location_lat, location_lng, device_info,
                biometric_verified, biometric_score,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, 'present',
                $4, $5, $6,
                true, $7,
                NOW(), NOW()
            )
            RETURNING id, check_in
        `, {
            bind: [
                matchResult.userId,
                attendanceData.companyId,
                now,
                attendanceData.latitude || null,
                attendanceData.longitude || null,
                attendanceData.deviceInfo || 'kiosk',
                matchResult.similarity
            ],
            type: QueryTypes.INSERT
        });

        return {
            id: result[0]?.id,
            clockInTime: now.toISOString()
        };
    }

    /**
     * ========================================================================
     * UTILIDADES
     * ========================================================================
     */
    generateTicketId() {
        return `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }

    estimateWaitTime() {
        const itemsAhead = this.queue.length;
        const avgTime = this.metrics.avgProcessingTime || 500;
        const parallelism = this.concurrency;

        return Math.ceil((itemsAhead / parallelism) * avgTime);
    }

    updateMetrics(processingTime, success) {
        if (success) {
            this.metrics.processed++;
            // Moving average
            this.metrics.avgProcessingTime =
                (this.metrics.avgProcessingTime * (this.metrics.processed - 1) + processingTime)
                / this.metrics.processed;
        } else {
            this.metrics.failed++;
        }
    }

    notifyCallback(ticketId, result) {
        const callback = this.pendingCallbacks.get(ticketId);
        if (callback) {
            callback(result);
            this.pendingCallbacks.delete(ticketId);
        }
    }

    /**
     * Registrar callback para resultado
     */
    onResult(ticketId, callback) {
        this.pendingCallbacks.set(ticketId, callback);
    }

    /**
     * Obtener estado de un ticket
     */
    getTicketStatus(ticketId) {
        // Buscar en cola
        const inQueue = this.queue.find(item => item.ticketId === ticketId);
        if (inQueue) {
            return {
                found: true,
                status: inQueue.status,
                queuePosition: this.queue.indexOf(inQueue) + 1,
                estimatedWait: this.estimateWaitTime()
            };
        }

        return { found: false, status: 'unknown' };
    }

    /**
     * Obtener métricas
     */
    getMetrics() {
        return {
            ...this.metrics,
            queueLength: this.queue.length,
            activeWorkers: this.activeWorkers,
            cacheSize: this.templatesCache.size
        };
    }

    /**
     * Health check
     */
    isHealthy() {
        return {
            healthy: true,
            queueLength: this.queue.length,
            activeWorkers: this.activeWorkers,
            cacheSize: this.templatesCache.size,
            metrics: this.metrics
        };
    }
}

// Singleton
const attendanceQueueService = new AttendanceQueueService();

module.exports = attendanceQueueService;
