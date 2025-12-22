/**
 * ============================================================================
 * BRAIN NERVOUS SYSTEM - Sistema de Deteccion en Tiempo Real
 * ============================================================================
 *
 * Este es el SISTEMA NERVIOSO del Brain:
 * - Detecta "picazones" (problemas) instantaneamente
 * - Monitorea errores del servidor en tiempo real
 * - Observa cambios en archivos criticos
 * - Ejecuta tests SSOT periodicamente
 * - Envia todo a BrainEscalationService para procesamiento
 *
 * "El cerebro no espera que le digan que pica - LO SIENTE"
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const BrainEscalationService = require('./BrainEscalationService');

class BrainNervousSystem extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            // Intervalo de chequeo de salud (ms)
            healthCheckInterval: 60000, // 1 minuto

            // Intervalo de tests SSOT (ms)
            ssotTestInterval: 300000, // 5 minutos

            // Archivos/directorios a monitorear
            watchPaths: [
                'src/routes',
                'src/services',
                'src/models'
            ],

            // Patrones de error a detectar en logs
            errorPatterns: [
                /\[ERROR\]/i,
                /\[CRITICAL\]/i,
                /UnhandledPromiseRejection/i,
                /SequelizeDatabaseError/i,
                /ECONNREFUSED/i,
                /TypeError:/i,
                /ReferenceError:/i
            ],

            // Severidad segun tipo de error
            severityMap: {
                'CRITICAL': 'critical',
                'UnhandledPromise': 'critical',
                'SequelizeDatabase': 'high',
                'ECONNREFUSED': 'high',
                'TypeError': 'medium',
                'ReferenceError': 'medium',
                'ERROR': 'medium'
            },

            ...options
        };

        this.isRunning = false;
        this.fileWatchers = new Map();
        this.healthCheckTimer = null;
        this.ssotTestTimer = null;
        this.errorBuffer = [];        // Buffer de errores recientes
        this.lastHealthCheck = null;

        // Estadisticas
        this.stats = {
            errorsDetected: 0,
            ssotViolations: 0,
            fileChangesDetected: 0,
            healthChecks: 0
        };

        console.log('🧠 [NERVOUS-SYSTEM] Brain Nervous System inicializado');
    }

    /**
     * ========================================================================
     * INICIO DEL SISTEMA NERVIOSO
     * ========================================================================
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ [NERVOUS-SYSTEM] El sistema ya esta corriendo');
            return;
        }

        console.log('\n' + '='.repeat(80));
        console.log('🧠 [NERVOUS-SYSTEM] INICIANDO SISTEMA NERVIOSO DEL BRAIN');
        console.log('='.repeat(80));

        try {
            // 1. Inicializar BrainEscalationService
            await BrainEscalationService.initialize();

            // 2. Interceptar errores del proceso
            this.setupErrorInterceptors();

            // 3. Iniciar monitoreo de archivos (opcional, puede consumir recursos)
            // this.startFileWatching();

            // 4. Iniciar health checks periodicos
            this.startHealthChecks();

            // 5. Iniciar tests SSOT periodicos
            this.startSSOTTests();

            this.isRunning = true;

            console.log('✅ [NERVOUS-SYSTEM] Sistema nervioso ACTIVO');
            console.log(`   🔍 Health checks: cada ${this.config.healthCheckInterval / 1000}s`);
            console.log(`   🧪 SSOT tests: cada ${this.config.ssotTestInterval / 1000}s`);
            console.log('='.repeat(80) + '\n');

            return true;

        } catch (error) {
            console.error('❌ [NERVOUS-SYSTEM] Error iniciando:', error);
            return false;
        }
    }

    /**
     * Detener el sistema
     */
    stop() {
        console.log('🛑 [NERVOUS-SYSTEM] Deteniendo sistema nervioso...');

        // Detener timers
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }

        if (this.ssotTestTimer) {
            clearInterval(this.ssotTestTimer);
            this.ssotTestTimer = null;
        }

        // Cerrar file watchers
        for (const [path, watcher] of this.fileWatchers) {
            watcher.close();
        }
        this.fileWatchers.clear();

        this.isRunning = false;
        console.log('🛑 [NERVOUS-SYSTEM] Sistema nervioso DETENIDO');
    }

    /**
     * ========================================================================
     * INTERCEPTORES DE ERRORES (SISTEMA SENSORIAL)
     * ========================================================================
     */

    /**
     * Configurar interceptores de errores del proceso
     */
    setupErrorInterceptors() {
        // Capturar errores no manejados
        process.on('uncaughtException', (error) => {
            this.onErrorDetected({
                type: 'uncaughtException',
                message: error.message,
                stack: error.stack,
                severity: 'critical'
            });
        });

        // Capturar promesas rechazadas
        process.on('unhandledRejection', (reason, promise) => {
            this.onErrorDetected({
                type: 'unhandledRejection',
                message: reason?.message || String(reason),
                stack: reason?.stack,
                severity: 'critical'
            });
        });

        // Interceptar console.error (para capturar errores logueados)
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Llamar al original
            originalConsoleError.apply(console, args);

            // Analizar el error
            const message = args.map(a => {
                if (a instanceof Error) return a.message;
                if (typeof a === 'object') return JSON.stringify(a);
                return String(a);
            }).join(' ');

            // Verificar si coincide con patrones de error
            for (const pattern of this.config.errorPatterns) {
                if (pattern.test(message)) {
                    this.onErrorDetected({
                        type: 'logged_error',
                        message: message.substring(0, 500),
                        severity: this.determineSeverity(message)
                    });
                    break;
                }
            }
        };

        console.log('   👁️ Interceptores de errores configurados');
    }

    /**
     * Determinar severidad basado en el mensaje
     */
    determineSeverity(message) {
        for (const [pattern, severity] of Object.entries(this.config.severityMap)) {
            if (message.includes(pattern)) {
                return severity;
            }
        }
        return 'medium';
    }

    /**
     * Handler cuando se detecta un error
     */
    async onErrorDetected(errorData) {
        this.stats.errorsDetected++;

        // Debounce: evitar reportar el mismo error multiples veces
        const errorKey = `${errorData.type}:${errorData.message?.substring(0, 50)}`;
        const now = Date.now();

        // Buscar error similar en el buffer (ultimos 30 segundos)
        const recentSimilar = this.errorBuffer.find(e =>
            e.key === errorKey && (now - e.timestamp) < 30000
        );

        if (recentSimilar) {
            recentSimilar.count++;
            return; // Ya reportado recientemente
        }

        // Agregar al buffer
        this.errorBuffer.push({
            key: errorKey,
            timestamp: now,
            count: 1
        });

        // Limpiar buffer viejo (> 5 minutos)
        this.errorBuffer = this.errorBuffer.filter(e => now - e.timestamp < 300000);

        // Reportar al BrainEscalationService
        console.log(`\n🔔 [NERVOUS-SYSTEM] Error detectado: ${errorData.type}`);

        try {
            await BrainEscalationService.onProblemDetected({
                type: errorData.type,
                module: this.extractModuleFromStack(errorData.stack),
                severity: errorData.severity,
                message: errorData.message,
                stack: errorData.stack
            });
        } catch (e) {
            // Evitar bucle infinito si BrainEscalation falla
            console.log('⚠️ [NERVOUS-SYSTEM] No se pudo reportar error a BrainEscalation');
        }
    }

    /**
     * Extraer nombre del modulo del stack trace
     */
    extractModuleFromStack(stack) {
        if (!stack) return 'unknown';

        // Buscar rutas de src/
        const match = stack.match(/src[\/\\](\w+)[\/\\](\w+)/);
        if (match) {
            return `${match[1]}/${match[2]}`;
        }

        return 'unknown';
    }

    /**
     * ========================================================================
     * MONITOREO DE ARCHIVOS
     * ========================================================================
     */

    /**
     * Iniciar monitoreo de archivos criticos
     */
    startFileWatching() {
        const backendPath = path.resolve(__dirname, '../../../');

        for (const watchPath of this.config.watchPaths) {
            const fullPath = path.join(backendPath, watchPath);

            if (fs.existsSync(fullPath)) {
                try {
                    const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
                        this.onFileChange(eventType, filename, watchPath);
                    });

                    this.fileWatchers.set(watchPath, watcher);
                    console.log(`   📂 Monitoreando: ${watchPath}`);

                } catch (e) {
                    console.log(`   ⚠️ No se pudo monitorear: ${watchPath}`);
                }
            }
        }
    }

    /**
     * Handler cuando cambia un archivo
     */
    onFileChange(eventType, filename, watchPath) {
        if (!filename || !filename.endsWith('.js')) return;

        this.stats.fileChangesDetected++;
        console.log(`📝 [NERVOUS-SYSTEM] Cambio detectado: ${watchPath}/${filename}`);

        // Emitir evento para que otros sistemas reaccionen
        this.emit('file:changed', {
            path: `${watchPath}/${filename}`,
            eventType,
            timestamp: new Date()
        });
    }

    /**
     * ========================================================================
     * HEALTH CHECKS PERIODICOS
     * ========================================================================
     */

    /**
     * Iniciar health checks periodicos
     */
    startHealthChecks() {
        this.healthCheckTimer = setInterval(async () => {
            await this.runHealthCheck();
        }, this.config.healthCheckInterval);

        // Ejecutar uno inmediato
        setTimeout(() => this.runHealthCheck(), 5000);
    }

    /**
     * Ejecutar health check
     */
    async runHealthCheck() {
        this.stats.healthChecks++;
        this.lastHealthCheck = new Date();

        try {
            const checks = {
                database: await this.checkDatabase(),
                memory: this.checkMemory(),
                eventLoop: this.checkEventLoop()
            };

            const failed = Object.entries(checks).filter(([, result]) => !result.healthy);

            if (failed.length > 0) {
                console.log(`⚠️ [NERVOUS-SYSTEM] Health check: ${failed.length} problemas detectados`);

                for (const [name, result] of failed) {
                    await BrainEscalationService.onProblemDetected({
                        type: 'health_check_failed',
                        module: `system/${name}`,
                        severity: result.severity || 'medium',
                        message: result.message || `${name} health check failed`
                    });
                }
            }

        } catch (error) {
            console.error('❌ [NERVOUS-SYSTEM] Error en health check:', error.message);
        }
    }

    /**
     * Verificar conexion a base de datos
     */
    async checkDatabase() {
        try {
            const { sequelize } = require('../../config/database');
            await sequelize.authenticate();
            return { healthy: true };
        } catch (error) {
            return {
                healthy: false,
                message: `Database connection failed: ${error.message}`,
                severity: 'critical'
            };
        }
    }

    /**
     * Verificar uso de memoria
     */
    checkMemory() {
        const usage = process.memoryUsage();
        const heapUsedMB = usage.heapUsed / 1024 / 1024;
        const heapTotalMB = usage.heapTotal / 1024 / 1024;
        const percentage = (heapUsedMB / heapTotalMB) * 100;

        if (percentage > 90) {
            return {
                healthy: false,
                message: `High memory usage: ${percentage.toFixed(1)}% (${heapUsedMB.toFixed(0)}MB / ${heapTotalMB.toFixed(0)}MB)`,
                severity: 'high'
            };
        }

        return { healthy: true, usage: percentage };
    }

    /**
     * Verificar event loop
     */
    checkEventLoop() {
        // Medir lag del event loop
        const start = Date.now();
        const expectedLag = 100;

        return new Promise(resolve => {
            setTimeout(() => {
                const actualLag = Date.now() - start - expectedLag;
                if (actualLag > 500) {
                    resolve({
                        healthy: false,
                        message: `Event loop lag: ${actualLag}ms (expected ~${expectedLag}ms)`,
                        severity: 'medium'
                    });
                } else {
                    resolve({ healthy: true, lag: actualLag });
                }
            }, expectedLag);
        });
    }

    /**
     * ========================================================================
     * TESTS SSOT PERIODICOS
     * ========================================================================
     */

    /**
     * Iniciar tests SSOT periodicos
     */
    startSSOTTests() {
        this.ssotTestTimer = setInterval(async () => {
            await this.runSSOTTests();
        }, this.config.ssotTestInterval);
    }

    /**
     * Ejecutar tests SSOT
     */
    async runSSOTTests() {
        console.log('\n🧪 [NERVOUS-SYSTEM] Ejecutando tests SSOT periodicos...');

        try {
            // Importar y ejecutar verificaciones SSOT
            const violations = await this.checkSSOTViolations();

            if (violations.length > 0) {
                this.stats.ssotViolations += violations.length;
                console.log(`⚠️ [NERVOUS-SYSTEM] Detectadas ${violations.length} violaciones SSOT`);

                for (const violation of violations) {
                    await BrainEscalationService.onProblemDetected({
                        type: 'ssot_violation',
                        module: violation.module,
                        severity: violation.severity || 'high',
                        message: violation.message,
                        affectedData: violation.data
                    });
                }
            } else {
                console.log('✅ [NERVOUS-SYSTEM] Tests SSOT: OK');
            }

        } catch (error) {
            console.error('❌ [NERVOUS-SYSTEM] Error en tests SSOT:', error.message);
        }
    }

    /**
     * Verificar violaciones SSOT
     */
    async checkSSOTViolations() {
        const violations = [];

        try {
            const { sequelize } = require('../../config/database');

            // 1. Verificar usuarios sin company_id
            const [orphanUsers] = await sequelize.query(`
                SELECT COUNT(*) as count FROM users WHERE company_id IS NULL
            `);
            if (orphanUsers[0]?.count > 0) {
                violations.push({
                    module: 'users',
                    severity: 'high',
                    message: `${orphanUsers[0].count} usuarios sin company_id`,
                    data: { count: orphanUsers[0].count }
                });
            }

            // 2. Verificar departamentos huerfanos
            const [orphanDepts] = await sequelize.query(`
                SELECT COUNT(*) as count FROM departments d
                WHERE d.company_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = d.company_id)
            `);
            if (orphanDepts[0]?.count > 0) {
                violations.push({
                    module: 'departments',
                    severity: 'medium',
                    message: `${orphanDepts[0].count} departamentos con company_id invalido`,
                    data: { count: orphanDepts[0].count }
                });
            }

            // 3. Verificar shifts huerfanos
            const [orphanShifts] = await sequelize.query(`
                SELECT COUNT(*) as count FROM shifts s
                WHERE s.company_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = s.company_id)
            `);
            if (orphanShifts[0]?.count > 0) {
                violations.push({
                    module: 'shifts',
                    severity: 'medium',
                    message: `${orphanShifts[0].count} turnos con company_id invalido`,
                    data: { count: orphanShifts[0].count }
                });
            }

            // 4. Verificar asistencias sin usuario valido
            const [orphanAttendance] = await sequelize.query(`
                SELECT COUNT(*) as count FROM attendance a
                WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = a.user_id)
                LIMIT 1
            `);
            if (orphanAttendance[0]?.count > 0) {
                violations.push({
                    module: 'attendance',
                    severity: 'high',
                    message: 'Existen registros de asistencia sin usuario valido',
                    data: { detected: true }
                });
            }

        } catch (error) {
            console.error('❌ [NERVOUS-SYSTEM] Error verificando SSOT:', error.message);
        }

        return violations;
    }

    /**
     * ========================================================================
     * API PUBLICA
     * ========================================================================
     */

    /**
     * Reportar problema manualmente (desde otros modulos)
     */
    async reportProblem(problemData) {
        return await BrainEscalationService.onProblemDetected({
            type: problemData.type || 'manual_report',
            module: problemData.module,
            severity: problemData.severity || 'medium',
            message: problemData.message,
            stack: problemData.stack,
            affectedFiles: problemData.files
        });
    }

    /**
     * Obtener estadisticas
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            lastHealthCheck: this.lastHealthCheck,
            escalationStats: BrainEscalationService.getStats(),
            activeIncidents: BrainEscalationService.getActiveIncidents().length
        };
    }

    /**
     * Obtener estado completo del sistema
     */
    getStatus() {
        return {
            running: this.isRunning,
            stats: this.getStats(),
            config: {
                healthCheckInterval: this.config.healthCheckInterval,
                ssotTestInterval: this.config.ssotTestInterval
            },
            lastHealthCheck: this.lastHealthCheck,
            activeIncidents: BrainEscalationService.getActiveIncidents()
        };
    }
}

// Singleton
const brainNervousSystem = new BrainNervousSystem();

module.exports = brainNervousSystem;
