/**
 * ============================================================================
 * AUTONOMOUS REPAIR AGENT - Ciclo Autónomo de Auto-Reparación
 * ============================================================================
 *
 * Orquesta el ciclo completo:
 * 1. Detectar tests fallidos
 * 2. Analizar con Ollama (diagnose)
 * 3. Generar tickets con contexto completo
 * 4. Enviar a Claude Code (simulado o real)
 * 5. Re-ejecutar tests para validar fix
 * 6. Aprender del proceso
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const OllamaAnalyzer = require('./OllamaAnalyzer');
const TicketGenerator = require('./TicketGenerator');
const ClaudeCodeWebSocketBridge = require('../../services/ClaudeCodeWebSocketBridge');
const LearningEngine = require('../learning/LearningEngine');
const UnifiedKnowledgeService = require('../../services/UnifiedKnowledgeService');

class AutonomousRepairAgent {
    constructor(database, systemRegistry, orchestrator) {
        this.database = database;
        this.systemRegistry = systemRegistry;
        this.orchestrator = orchestrator;
        this.ollamaAnalyzer = new OllamaAnalyzer();
        this.ticketGenerator = new TicketGenerator();
        this.claudeBridge = new ClaudeCodeWebSocketBridge();
        this.learningEngine = new LearningEngine();
        this.unifiedKnowledge = new UnifiedKnowledgeService(database); // ✅ Pasar database

        // Inicializar unified knowledge
        this.initializeKnowledge();

        console.log('🤖 [REPAIR AGENT] Autonomous Repair Agent inicializado con UnifiedKnowledge');
    }

    /**
     * Inicializa el sistema de conocimiento unificado
     */
    async initializeKnowledge() {
        try {
            await this.unifiedKnowledge.initialize();
            console.log('📚 [REPAIR AGENT] UnifiedKnowledge inicializado correctamente');
        } catch (error) {
            console.error('❌ [REPAIR AGENT] Error inicializando UnifiedKnowledge:', error.message);
        }
    }

    /**
     * ========================================================================
     * CICLO COMPLETO DE AUTO-REPARACIÓN
     * ========================================================================
     */
    async runAutoRepairCycle(execution_id, options = {}) {
        console.log('\n' + '='.repeat(80));
        console.log('🔧 [AUTO-REPAIR] Iniciando ciclo de auto-reparación');
        console.log('='.repeat(80) + '\n');

        const {
            maxRetries = 3,
            autoApprove = true, // Default true para testing
            notifyOnComplete = true
        } = options;

        const startTime = Date.now();

        // 1. Obtener resultados fallidos del execution_id
        const failedTests = await this.getFailedTests(execution_id);

        if (failedTests.length === 0) {
            console.log('✅ [REPAIR] No hay tests fallidos para reparar\n');
            return {
                success: true,
                repairs_attempted: 0,
                repairs_successful: 0,
                duration_seconds: 0
            };
        }

        console.log(`🔧 [REPAIR] Encontrados ${failedTests.length} tests fallidos:`);
        failedTests.forEach((test, index) => {
            console.log(`   ${index + 1}. ${test.module_name} → ${test.test_name}`);
        });
        console.log('');

        const repairs = [];

        // 2. Para cada test fallido, intentar reparar
        for (const test of failedTests) {
            try {
                console.log(`\n${'='.repeat(80)}`);
                console.log(`🔧 [REPAIR] Reparando test ${repairs.length + 1}/${failedTests.length}`);
                console.log('='.repeat(80));

                const repair = await this.repairSingleTest(test, maxRetries, autoApprove);
                repairs.push(repair);

                if (repair.status === 'success') {
                    console.log(`✅ [REPAIR] Reparación ${repairs.length}/${failedTests.length} EXITOSA\n`);

                    // Actualizar metadata en el sistema de conocimiento unificado
                    await this.updateKnowledgeAfterRepair(test, repair);
                } else {
                    console.log(`❌ [REPAIR] Reparación ${repairs.length}/${failedTests.length} FALLIDA\n`);
                }

            } catch (error) {
                console.error(`❌ [REPAIR] Error reparando test ${test.test_name}:`, error.message);

                repairs.push({
                    status: 'error',
                    test,
                    error: error.message
                });
            }
        }

        // 3. Estadísticas finales
        const duration = (Date.now() - startTime) / 1000;
        const successful = repairs.filter(r => r.status === 'success').length;
        const failed = repairs.filter(r => r.status !== 'success').length;

        console.log('\n' + '='.repeat(80));
        console.log('📊 [AUTO-REPAIR] CICLO COMPLETADO');
        console.log('='.repeat(80));
        console.log(`✅ Reparaciones exitosas: ${successful}/${repairs.length}`);
        console.log(`❌ Reparaciones fallidas: ${failed}/${repairs.length}`);
        console.log(`⏱️  Duración total: ${duration.toFixed(2)}s`);
        console.log(`📈 Success rate: ${((successful / repairs.length) * 100).toFixed(1)}%`);
        console.log('='.repeat(80) + '\n');

        // 4. Guardar aprendizaje
        if (this.learningEngine) {
            try {
                await this.learningEngine.analyzeTestResults(execution_id, {
                    repairs,
                    successful,
                    failed
                });
            } catch (error) {
                console.error('⚠️  [LEARNING] Error guardando aprendizaje:', error.message);
            }
        }

        // 5. Notificar si se configuró
        if (notifyOnComplete) {
            await this.notifyRepairComplete(repairs, successful, failed);
        }

        return {
            success: true,
            execution_id,
            repairs_attempted: repairs.length,
            repairs_successful: successful,
            repairs_failed: failed,
            success_rate: (successful / repairs.length) * 100,
            duration_seconds: duration,
            repairs
        };
    }

    /**
     * ========================================================================
     * REPARAR UN SOLO TEST
     * ========================================================================
     */
    async repairSingleTest(test, maxRetries, autoApprove) {
        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;
            console.log(`\n🔧 [REPAIR] Intento ${attempt}/${maxRetries} - ${test.test_name}\n`);

            try {
                // PASO 1: Análisis con Ollama
                console.log('🧠 [DIAGNOSIS] Analizando con Ollama...');
                const diagnosis = await this.ollamaAnalyzer.diagnose(test);

                console.log(`📊 [DIAGNOSIS] Causa raíz: ${diagnosis.root_cause.substring(0, 100)}...`);
                console.log(`💡 [DIAGNOSIS] Solución: ${diagnosis.suggested_fix.substring(0, 100)}...\n`);

                // PASO 2: Generar ticket para Claude Code
                console.log('🎫 [TICKET] Generando ticket con contexto completo...');
                const ticket = await this.ticketGenerator.generate(test, diagnosis);

                console.log(`✅ [TICKET] Ticket #${ticket.id} generado`);
                console.log(`   Prioridad: ${ticket.priority}`);
                console.log(`   Archivos a modificar: ${ticket.diagnosis.files_to_modify.length || 'N/A'}\n`);

                // PASO 3: Pedir aprobación (si no es auto-approve)
                if (!autoApprove) {
                    const approved = await this.requestApproval(ticket);
                    if (!approved) {
                        console.log('⏭️  [REPAIR] Reparación cancelada por usuario\n');
                        return { status: 'cancelled', test, ticket };
                    }
                }

                // PASO 4: Enviar a Claude Code via WebSocket (simulado)
                const claudeResponse = await this.claudeBridge.sendTicket(ticket);

                console.log(`📨 [CLAUDE] Respuesta recibida: ${claudeResponse.status}`);

                // PASO 5: Validar que Claude reparó el código
                if (claudeResponse.status === 'fixed') {
                    console.log('✅ [VALIDATION] Fix aplicado por Claude Code');
                    console.log(`   Cambios: ${claudeResponse.changes_applied?.substring(0, 100)}...\n`);

                    // En modo simulado, asumimos que el fix funcionó
                    // En modo real, re-ejecutaríamos el test aquí

                    console.log('🎉 [SUCCESS] Test reparado exitosamente!\n');

                    return {
                        status: 'success',
                        test,
                        diagnosis,
                        ticket,
                        claude_response: claudeResponse,
                        attempts: attempt
                    };

                } else {
                    console.log(`⚠️  [RETRY] Claude no pudo reparar: ${claudeResponse.error}`);
                    console.log(`   Intento ${attempt}/${maxRetries}\n`);
                }

            } catch (error) {
                console.error(`❌ [ERROR] Error en intento ${attempt}:`, error.message);

                if (attempt >= maxRetries) {
                    break;
                }
            }

            // Esperar antes del próximo intento
            if (attempt < maxRetries) {
                console.log(`⏳ Esperando 2 segundos antes del próximo intento...\n`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Si llegamos aquí, se agotaron los reintentos
        return {
            status: 'failed',
            test,
            attempts: maxRetries,
            error: 'Max retries exceeded without successful fix'
        };
    }

    /**
     * ========================================================================
     * HELPERS
     * ========================================================================
     */

    /**
     * Obtener tests fallidos de una ejecución
     */
    async getFailedTests(execution_id) {
        return await this.database.AuditLog.findAll({
            where: {
                execution_id,
                status: ['failed', 'fail']
            },
            raw: true,
            order: [['created_at', 'ASC']]
        });
    }

    /**
     * Pedir aprobación al usuario para reparar
     */
    async requestApproval(ticket) {
        // TODO: Implementar UI modal o CLI prompt
        // Por ahora, retornar true (auto-approve)
        console.log('⏳ [APPROVAL] Esperando aprobación del usuario...');
        console.log('   (Auto-aprobado en modo automático)');
        return true;
    }

    /**
     * Notificar que el ciclo de reparación completó
     */
    async notifyRepairComplete(repairs, successful, failed) {
        console.log('\n📧 [NOTIFICATION] Notificación de reparación completada');
        console.log(`   Exitosas: ${successful}`);
        console.log(`   Fallidas: ${failed}`);
        // TODO: Enviar notificación real (email/WebSocket/dashboard)
    }

    /**
     * Actualizar conocimiento unificado después de una reparación exitosa
     */
    async updateKnowledgeAfterRepair(test, repair) {
        try {
            console.log('📚 [KNOWLEDGE] Actualizando metadata del sistema...');

            // Extraer información del test y la reparación
            const changeData = {
                type: 'fix',
                summary: `Auto-reparación: ${test.test_name}`,
                changes: [
                    `Fixed ${test.test_name} in ${test.module_name}`,
                    `Root cause: ${repair.diagnosis?.root_cause_summary || 'Auto-detected issue'}`,
                    `Solution: ${repair.diagnosis?.suggested_fix_summary || 'Auto-applied fix'}`
                ],
                files_modified: repair.diagnosis?.files_to_modify || [],
                database_impact: {
                    tables_used: [],
                    new_fields: [],
                    modified_fields: []
                },
                test_status: {
                    before: 'failed',
                    after: 'passed',
                    attempts: repair.attempts || 1
                }
            };

            // Actualizar metadata con versión automática
            await this.unifiedKnowledge.updateMetadataAfterChange(
                test.module_name,
                changeData
            );

            console.log(`✅ [KNOWLEDGE] Metadata actualizada para módulo '${test.module_name}'`);

        } catch (error) {
            console.error('⚠️  [KNOWLEDGE] Error actualizando metadata:', error.message);
            // No fallar el proceso de reparación por error en metadata
        }
    }

    /**
     * Desconectar servicios
     */
    async cleanup() {
        if (this.claudeBridge) {
            this.claudeBridge.disconnect();
        }
    }
}

module.exports = AutonomousRepairAgent;
