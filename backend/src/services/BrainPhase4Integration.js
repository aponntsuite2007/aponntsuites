/**
 * ============================================================================
 * BRAIN-PHASE4 INTEGRATION SERVICE
 * ============================================================================
 *
 * Conecta EcosystemBrainService con Phase4TestOrchestrator para:
 * - Testing inteligente guiado por Brain
 * - Feedback loop bidireccional
 * - Auto-healing basado en resultados
 * - Generación de tutoriales desde tests
 *
 * FLUJO COMPLETO:
 * 1. Brain detecta cambios en código/workflows
 * 2. Integration determina qué testear
 * 3. Phase4 ejecuta tests específicos
 * 4. Resultados vuelven a Brain
 * 5. Brain actualiza scores, tutoriales, learning
 * 6. Si hay errores, HybridHealer intenta fix
 * 7. Re-testear si hubo fix
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const EventEmitter = require('events');
const path = require('path');

class BrainPhase4Integration extends EventEmitter {
    constructor(options = {}) {
        super();

        // Referencias a servicios
        this.brainService = null;
        this.phase4Orchestrator = null;
        this.workflowGenerator = null;
        this.fileWatcher = null;
        this.hybridHealer = null;

        // Configuración
        this.config = {
            autoTestOnChange: options.autoTestOnChange !== false,
            maxRetestAttempts: options.maxRetestAttempts || 3,
            testDelayAfterChange: options.testDelayAfterChange || 2000,
            persistResults: options.persistResults !== false,
            enableAutoHealing: options.enableAutoHealing !== false
        };

        // Estado interno
        this.isInitialized = false;
        this.pendingTests = new Map();
        this.testHistory = [];
        this.learningDatabase = new Map();

        // Base de datos (si está disponible)
        this.sequelize = null;

        console.log('🔗 [BRAIN-PHASE4] Integration Service inicializado');
    }

    /**
     * Inicializar con todos los servicios
     */
    async initialize({
        brainService,
        phase4Orchestrator,
        workflowGenerator,
        fileWatcher,
        hybridHealer,
        sequelize
    }) {
        console.log('🔗 [BRAIN-PHASE4] Inicializando integración...');

        this.brainService = brainService;
        this.phase4Orchestrator = phase4Orchestrator;
        this.workflowGenerator = workflowGenerator;
        this.fileWatcher = fileWatcher;
        this.hybridHealer = hybridHealer;
        this.sequelize = sequelize;

        // Configurar listeners
        this.setupEventListeners();

        // Cargar learning database si existe
        await this.loadLearningDatabase();

        this.isInitialized = true;
        console.log('🔗 [BRAIN-PHASE4] Integración lista');

        return this;
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Escuchar cambios de workflow
        if (this.fileWatcher) {
            this.fileWatcher.on('workflow-updated', async (data) => {
                console.log(`📢 [BRAIN-PHASE4] Workflow actualizado: ${data.module}`);

                if (this.config.autoTestOnChange) {
                    // Esperar un poco antes de testear
                    setTimeout(() => {
                        this.queueSmartTest(data.module, 'workflow_change');
                    }, this.config.testDelayAfterChange);
                }
            });

            this.fileWatcher.on('file-changed', async (data) => {
                console.log(`📢 [BRAIN-PHASE4] Archivo cambiado: ${data.file}`);
            });
        }

        // Escuchar regeneración de workflows
        if (this.workflowGenerator) {
            this.workflowGenerator.on('workflows-updated', async (data) => {
                console.log(`📢 [BRAIN-PHASE4] Todos los workflows actualizados`);

                // Notificar a Brain
                if (this.brainService) {
                    await this.notifyBrainWorkflowsUpdated(data);
                }
            });
        }

        console.log('   Event listeners configurados');
    }

    /**
     * ========================================================================
     * SMART TESTING: Brain guía qué testear
     * ========================================================================
     */

    /**
     * Encolar test inteligente para un módulo
     */
    async queueSmartTest(moduleKey, reason = 'manual') {
        console.log(`📋 [BRAIN-PHASE4] Encolando smart test: ${moduleKey} (${reason})`);

        const testId = `test-${moduleKey}-${Date.now()}`;

        this.pendingTests.set(testId, {
            moduleKey,
            reason,
            queuedAt: new Date().toISOString(),
            status: 'queued'
        });

        // Ejecutar test
        setImmediate(() => this.executeSmartTest(testId));

        return testId;
    }

    /**
     * Ejecutar test inteligente
     */
    async executeSmartTest(testId) {
        const testInfo = this.pendingTests.get(testId);
        if (!testInfo) return;

        const { moduleKey, reason } = testInfo;
        console.log(`🧪 [BRAIN-PHASE4] Ejecutando smart test: ${moduleKey}`);

        testInfo.status = 'running';
        testInfo.startedAt = new Date().toISOString();

        try {
            // 1. Obtener plan de test desde Brain
            const testPlan = await this.getBrainTestPlan(moduleKey);

            // 2. Obtener workflow actual
            const workflow = await this.getModuleWorkflow(moduleKey);

            // 3. Ejecutar tests con Phase4
            const results = await this.runPhase4Tests(moduleKey, testPlan, workflow);

            // 4. Procesar resultados
            const processedResults = await this.processTestResults(moduleKey, results, workflow);

            // 5. Actualizar Brain con resultados
            await this.feedResultsToBrain(moduleKey, processedResults);

            // 6. Auto-healing si hay errores
            if (processedResults.failures > 0 && this.config.enableAutoHealing) {
                await this.attemptAutoHealing(moduleKey, processedResults);
            }

            // 7. Actualizar estado
            testInfo.status = 'completed';
            testInfo.completedAt = new Date().toISOString();
            testInfo.results = processedResults;

            // 8. Guardar en historial
            this.testHistory.push({
                testId,
                ...testInfo
            });

            // 9. Persistir si está habilitado
            if (this.config.persistResults) {
                await this.persistTestResults(moduleKey, processedResults);
            }

            this.emit('test-completed', {
                testId,
                moduleKey,
                results: processedResults
            });

            return processedResults;

        } catch (error) {
            console.error(`❌ [BRAIN-PHASE4] Error en smart test:`, error.message);

            testInfo.status = 'error';
            testInfo.error = error.message;

            this.emit('test-error', { testId, moduleKey, error });

            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener plan de test desde Brain
     */
    async getBrainTestPlan(moduleKey) {
        console.log(`   📋 Obteniendo plan de Brain para: ${moduleKey}`);

        if (!this.brainService) {
            return this.getDefaultTestPlan(moduleKey);
        }

        try {
            // Obtener información del módulo desde Brain
            const moduleInfo = await this.brainService.getModuleInfo(moduleKey);

            // Obtener workflows conectados
            const workflows = await this.brainService.getWorkflowsConnected();
            const moduleWorkflows = workflows.workflows?.filter(w =>
                w.module === moduleKey || w.name.toLowerCase().includes(moduleKey)
            ) || [];

            // Obtener descubrimientos previos
            const discoveries = await this.brainService.getHistoricalDiscoveries(moduleKey);

            // Construir plan de test
            const plan = {
                module: moduleKey,
                priority: this.calculateTestPriority(moduleKey, moduleInfo),

                // Endpoints a testear
                endpoints: moduleInfo?.endpoints || [],

                // Workflows a validar
                workflows: moduleWorkflows.map(w => ({
                    id: w.id,
                    name: w.name,
                    stages: w.stages?.length || 0,
                    entryPoint: w.entry_point
                })),

                // CRUD operations
                crud: {
                    create: true,
                    read: true,
                    update: true,
                    delete: true
                },

                // Buttons/UI descubiertos previamente
                knownButtons: discoveries?.buttons || [],
                knownModals: discoveries?.modals || [],
                knownFields: discoveries?.fields || [],

                // Validaciones especiales
                validations: this.getModuleValidations(moduleKey),

                // Test específicos por workflow stages
                stageTests: moduleWorkflows.flatMap(w =>
                    (w.stages || []).map(stage => ({
                        workflowId: w.id,
                        stageId: stage.key || stage.id,
                        stageName: stage.name,
                        validations: stage.validations || []
                    }))
                )
            };

            console.log(`   → Plan generado: ${plan.endpoints.length} endpoints, ${plan.workflows.length} workflows`);

            return plan;

        } catch (error) {
            console.error(`   ⚠️ Error obteniendo plan de Brain:`, error.message);
            return this.getDefaultTestPlan(moduleKey);
        }
    }

    /**
     * Plan de test por defecto
     */
    getDefaultTestPlan(moduleKey) {
        return {
            module: moduleKey,
            priority: 'normal',
            endpoints: [],
            workflows: [],
            crud: { create: true, read: true, update: true, delete: true },
            knownButtons: [],
            knownModals: [],
            knownFields: [],
            validations: [],
            stageTests: []
        };
    }

    /**
     * Obtener workflow del módulo
     */
    async getModuleWorkflow(moduleKey) {
        if (!this.workflowGenerator) return null;

        try {
            return await this.workflowGenerator.getWorkflow(moduleKey);
        } catch (e) {
            return null;
        }
    }

    /**
     * Ejecutar tests con Phase4
     */
    async runPhase4Tests(moduleKey, testPlan, workflow) {
        console.log(`   🎯 Ejecutando Phase4 tests para: ${moduleKey}`);

        if (!this.phase4Orchestrator) {
            console.log(`   ⚠️ Phase4Orchestrator no disponible`);
            return { success: false, error: 'Phase4 not available' };
        }

        try {
            // Configurar opciones de test
            const testOptions = {
                module: moduleKey,
                plan: testPlan,
                workflow: workflow,
                brainGuided: true,

                // Opciones específicas
                testCRUD: testPlan.crud,
                validateWorkflowStages: testPlan.stageTests.length > 0,
                useKnownDiscoveries: true,

                // Callbacks para feedback en tiempo real
                onStageComplete: (stage, result) => {
                    this.emit('stage-tested', { moduleKey, stage, result });
                },
                onDiscovery: (discovery) => {
                    this.emit('discovery', { moduleKey, discovery });
                }
            };

            // Ejecutar test del módulo
            const result = await this.phase4Orchestrator.testModule(moduleKey, testOptions);

            return result;

        } catch (error) {
            console.error(`   ❌ Error en Phase4:`, error.message);
            return {
                success: false,
                error: error.message,
                moduleKey
            };
        }
    }

    /**
     * Procesar resultados de tests
     */
    async processTestResults(moduleKey, rawResults, workflow) {
        console.log(`   📊 Procesando resultados de: ${moduleKey}`);

        const processed = {
            moduleKey,
            timestamp: new Date().toISOString(),
            success: rawResults.success !== false,
            total: 0,
            passed: 0,
            failed: 0,
            failures: 0,
            skipped: 0,

            // Detalles
            crudResults: {},
            workflowResults: [],
            discoveries: {
                buttons: [],
                modals: [],
                fields: [],
                endpoints: []
            },

            // Errores para auto-healing
            errors: [],

            // Métricas
            duration: rawResults.duration || 0,
            coverage: 0
        };

        // Procesar resultados de CRUD
        if (rawResults.crud) {
            for (const [op, result] of Object.entries(rawResults.crud)) {
                processed.crudResults[op] = result;
                processed.total++;
                if (result.success) {
                    processed.passed++;
                } else {
                    processed.failed++;
                    processed.failures++;
                    if (result.error) {
                        processed.errors.push({
                            type: 'crud',
                            operation: op,
                            error: result.error
                        });
                    }
                }
            }
        }

        // Procesar resultados de workflow stages
        if (rawResults.stages) {
            for (const stageResult of rawResults.stages) {
                processed.workflowResults.push(stageResult);
                processed.total++;
                if (stageResult.success) {
                    processed.passed++;
                } else {
                    processed.failed++;
                    processed.failures++;
                    if (stageResult.error) {
                        processed.errors.push({
                            type: 'workflow_stage',
                            stage: stageResult.stageId,
                            error: stageResult.error
                        });
                    }
                }
            }
        }

        // Recopilar descubrimientos
        if (rawResults.discoveries) {
            processed.discoveries = {
                ...processed.discoveries,
                ...rawResults.discoveries
            };
        }

        // Calcular cobertura
        if (workflow && workflow.stages) {
            const testedStages = processed.workflowResults.length;
            const totalStages = workflow.stages.filter(s => !s.is_final).length;
            processed.coverage = totalStages > 0 ? Math.round((testedStages / totalStages) * 100) : 0;
        }

        console.log(`   → Total: ${processed.total}, Passed: ${processed.passed}, Failed: ${processed.failed}`);

        return processed;
    }

    /**
     * ========================================================================
     * FEEDBACK LOOP: Resultados vuelven a Brain
     * ========================================================================
     */

    /**
     * Alimentar resultados a Brain
     */
    async feedResultsToBrain(moduleKey, results) {
        console.log(`   🧠 Alimentando resultados a Brain: ${moduleKey}`);

        if (!this.brainService) {
            console.log(`   ⚠️ BrainService no disponible`);
            return;
        }

        try {
            // 1. Registrar resultados de test
            if (typeof this.brainService.recordTestResults === 'function') {
                await this.brainService.recordTestResults(moduleKey, results, results.discoveries);
            }

            // 2. Actualizar score del módulo
            if (typeof this.brainService.updateModuleScore === 'function') {
                const newScore = this.calculateModuleScore(results);
                await this.brainService.updateModuleScore(moduleKey, newScore);
            }

            // 3. Registrar descubrimientos
            if (results.discoveries && typeof this.brainService.recordDiscoveries === 'function') {
                await this.brainService.recordDiscoveries(moduleKey, results.discoveries);
            }

            // 4. Actualizar learning database local
            this.updateLearningDatabase(moduleKey, results);

            console.log(`   ✅ Brain actualizado`);

        } catch (error) {
            console.error(`   ⚠️ Error alimentando Brain:`, error.message);
        }
    }

    /**
     * Calcular score del módulo
     */
    calculateModuleScore(results) {
        if (results.total === 0) return 0;

        const passRate = results.passed / results.total;
        const coverageBonus = (results.coverage || 0) / 100 * 0.2;

        return Math.round((passRate * 0.8 + coverageBonus) * 100);
    }

    /**
     * ========================================================================
     * AUTO-HEALING: Intentar corregir errores
     * ========================================================================
     */

    /**
     * Intentar auto-healing de errores
     */
    async attemptAutoHealing(moduleKey, results) {
        console.log(`   🔧 Intentando auto-healing para: ${moduleKey}`);

        if (!this.hybridHealer || results.errors.length === 0) {
            return { healed: false, reason: 'No healer or no errors' };
        }

        const healingResults = {
            attempted: 0,
            healed: 0,
            failed: 0,
            details: []
        };

        for (const error of results.errors) {
            healingResults.attempted++;

            try {
                const healResult = await this.hybridHealer.analyzeAndHeal({
                    module: moduleKey,
                    errorType: error.type,
                    errorMessage: error.error,
                    context: error
                });

                if (healResult.fixed) {
                    healingResults.healed++;
                    healingResults.details.push({
                        error: error,
                        fix: healResult.fix,
                        status: 'healed'
                    });
                } else {
                    healingResults.failed++;
                    healingResults.details.push({
                        error: error,
                        suggestion: healResult.suggestion,
                        status: 'suggested'
                    });
                }

            } catch (healError) {
                healingResults.failed++;
                healingResults.details.push({
                    error: error,
                    healError: healError.message,
                    status: 'error'
                });
            }
        }

        console.log(`   → Healed: ${healingResults.healed}/${healingResults.attempted}`);

        // Si hubo fixes, re-testear
        if (healingResults.healed > 0) {
            console.log(`   🔄 Re-testeando después de healing...`);
            await this.queueSmartTest(moduleKey, 'post_healing');
        }

        return healingResults;
    }

    /**
     * ========================================================================
     * PERSISTENCIA Y LEARNING
     * ========================================================================
     */

    /**
     * Persistir resultados de test en BD
     */
    async persistTestResults(moduleKey, results) {
        if (!this.sequelize) return;

        try {
            // Insertar en tabla de resultados de test
            await this.sequelize.query(`
                INSERT INTO test_results (
                    module_key,
                    test_timestamp,
                    total_tests,
                    passed,
                    failed,
                    coverage,
                    duration_ms,
                    results_json,
                    discoveries_json
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (module_key, DATE(test_timestamp))
                DO UPDATE SET
                    total_tests = EXCLUDED.total_tests,
                    passed = EXCLUDED.passed,
                    failed = EXCLUDED.failed,
                    coverage = EXCLUDED.coverage,
                    duration_ms = EXCLUDED.duration_ms,
                    results_json = EXCLUDED.results_json,
                    discoveries_json = EXCLUDED.discoveries_json,
                    updated_at = NOW()
            `, {
                bind: [
                    moduleKey,
                    new Date(),
                    results.total,
                    results.passed,
                    results.failed,
                    results.coverage,
                    results.duration,
                    JSON.stringify(results),
                    JSON.stringify(results.discoveries)
                ]
            });

            console.log(`   💾 Resultados persistidos en BD`);

        } catch (error) {
            // Tabla puede no existir aún
            console.log(`   ⚠️ No se pudo persistir (tabla puede no existir):`, error.message);
        }
    }

    /**
     * Actualizar learning database local
     */
    updateLearningDatabase(moduleKey, results) {
        const entry = this.learningDatabase.get(moduleKey) || {
            testCount: 0,
            totalPassed: 0,
            totalFailed: 0,
            lastScore: 0,
            patterns: new Map()
        };

        entry.testCount++;
        entry.totalPassed += results.passed;
        entry.totalFailed += results.failed;
        entry.lastScore = this.calculateModuleScore(results);
        entry.lastTested = new Date().toISOString();

        // Aprender de errores
        for (const error of results.errors) {
            const errorKey = `${error.type}:${error.error?.substring(0, 50)}`;
            const patternCount = entry.patterns.get(errorKey) || 0;
            entry.patterns.set(errorKey, patternCount + 1);
        }

        this.learningDatabase.set(moduleKey, entry);
    }

    /**
     * Cargar learning database desde BD
     */
    async loadLearningDatabase() {
        if (!this.sequelize) return;

        try {
            const results = await this.sequelize.query(`
                SELECT module_key, test_count, total_passed, total_failed, last_score, patterns_json
                FROM learning_patterns
            `, { type: this.sequelize.QueryTypes?.SELECT || 'SELECT' });

            for (const row of results || []) {
                this.learningDatabase.set(row.module_key, {
                    testCount: row.test_count,
                    totalPassed: row.total_passed,
                    totalFailed: row.total_failed,
                    lastScore: row.last_score,
                    patterns: new Map(Object.entries(row.patterns_json || {}))
                });
            }

            console.log(`   📚 Learning database cargada: ${this.learningDatabase.size} módulos`);

        } catch (error) {
            // Tabla puede no existir
            console.log(`   ⚠️ Learning database no disponible`);
        }
    }

    /**
     * Persistir learning database
     */
    async persistLearningDatabase() {
        if (!this.sequelize) return;

        try {
            for (const [moduleKey, entry] of this.learningDatabase) {
                await this.sequelize.query(`
                    INSERT INTO learning_patterns (
                        module_key, test_count, total_passed, total_failed,
                        last_score, patterns_json, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (module_key)
                    DO UPDATE SET
                        test_count = EXCLUDED.test_count,
                        total_passed = EXCLUDED.total_passed,
                        total_failed = EXCLUDED.total_failed,
                        last_score = EXCLUDED.last_score,
                        patterns_json = EXCLUDED.patterns_json,
                        updated_at = NOW()
                `, {
                    bind: [
                        moduleKey,
                        entry.testCount,
                        entry.totalPassed,
                        entry.totalFailed,
                        entry.lastScore,
                        JSON.stringify(Object.fromEntries(entry.patterns))
                    ]
                });
            }

            console.log(`   💾 Learning database persistida`);

        } catch (error) {
            console.log(`   ⚠️ Error persistiendo learning:`, error.message);
        }
    }

    /**
     * ========================================================================
     * HELPERS
     * ========================================================================
     */

    /**
     * Calcular prioridad de test
     */
    calculateTestPriority(moduleKey, moduleInfo) {
        // Módulos core tienen mayor prioridad
        const coreModules = ['users', 'attendance', 'companies', 'auth'];
        if (coreModules.includes(moduleKey)) return 'high';

        // Módulos con errores recientes tienen prioridad
        const learning = this.learningDatabase.get(moduleKey);
        if (learning && learning.totalFailed > learning.totalPassed) return 'high';

        return 'normal';
    }

    /**
     * Obtener validaciones específicas del módulo
     */
    getModuleValidations(moduleKey) {
        const validations = {
            attendance: ['check_shift', 'verify_biometric', 'validate_late_arrival'],
            legal: ['verify_documents', 'check_deadlines', 'validate_jurisdiction'],
            medical: ['verify_certificate', 'check_dates', 'validate_diagnosis'],
            vacation: ['check_balance', 'verify_approval_chain', 'validate_dates'],
            sanctions: ['verify_evidence', 'check_due_process', 'validate_severity'],
            payroll: ['verify_calculations', 'check_deductions', 'validate_totals']
        };

        return validations[moduleKey] || [];
    }

    /**
     * Notificar a Brain que workflows fueron actualizados
     */
    async notifyBrainWorkflowsUpdated(data) {
        if (!this.brainService) return;

        try {
            // Invalidar cache de Brain
            if (typeof this.brainService.invalidateCache === 'function') {
                await this.brainService.invalidateCache('workflows');
            }

            // Notificar regeneración
            if (typeof this.brainService.onWorkflowsRegenerated === 'function') {
                await this.brainService.onWorkflowsRegenerated(data);
            }

            console.log(`   🧠 Brain notificado de actualización de workflows`);

        } catch (error) {
            console.error(`   ⚠️ Error notificando Brain:`, error.message);
        }
    }

    /**
     * Obtener estado de la integración
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            services: {
                brain: !!this.brainService,
                phase4: !!this.phase4Orchestrator,
                workflowGenerator: !!this.workflowGenerator,
                fileWatcher: !!this.fileWatcher,
                hybridHealer: !!this.hybridHealer,
                database: !!this.sequelize
            },
            config: this.config,
            pendingTests: this.pendingTests.size,
            testHistory: this.testHistory.length,
            learningModules: this.learningDatabase.size
        };
    }

    /**
     * Ejecutar test de todos los módulos
     */
    async runFullSystemTest() {
        console.log('🚀 [BRAIN-PHASE4] Ejecutando test completo del sistema...');

        const modules = this.workflowGenerator?.getConfiguredModules() || [];
        const results = [];

        for (const moduleKey of modules) {
            const result = await this.queueSmartTest(moduleKey, 'full_system_test');
            results.push({ module: moduleKey, testId: result });
        }

        return {
            startedAt: new Date().toISOString(),
            modulesQueued: results.length,
            tests: results
        };
    }
}

module.exports = BrainPhase4Integration;
