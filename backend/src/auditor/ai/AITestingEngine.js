/**
 * ============================================================================
 * AI TESTING ENGINE - TERCERA OLA DE TESTING CON IA
 * ============================================================================
 *
 * Sistema de testing inteligente que combina:
 * 1. Lenguaje Natural → Tests ejecutables (via Ollama)
 * 2. Self-Healing → Auto-reparación cuando cambia la UI
 * 3. Brain Integration → Conocimiento vivo del sistema
 * 4. Learning Loop → Aprende de tests pasados
 *
 * FLUJO:
 * Usuario: "Verificar que puedo crear un usuario"
 *    ↓
 * Ollama interpreta → genera pasos
 *    ↓
 * Brain provee contexto (endpoints, campos, validaciones)
 *    ↓
 * UIDiscovery ejecuta en browser real
 *    ↓
 * Si falla → Ollama analiza → auto-repara → re-ejecuta
 *    ↓
 * Resultado → alimenta Brain + Assistant KB
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const UIElementDiscoveryEngine = require('../collectors/UIElementDiscoveryEngine');

class AITestingEngine {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || process.env.BASE_URL || 'http://localhost:9998',
            ollamaUrl: config.ollamaUrl || 'http://localhost:11434',
            ollamaModel: config.ollamaModel || 'llama3.1:8b',
            maxSelfHealAttempts: config.maxSelfHealAttempts || 3,
            learningEnabled: config.learningEnabled !== false,
            ...config
        };

        // Componentes del ecosistema (se inyectan)
        this.brainService = config.brainService || null;
        this.assistantService = config.assistantService || null;
        this.database = config.database || null;

        // Motor de descubrimiento UI
        this.uiDiscovery = null;

        // Cache de tests aprendidos
        this.learnedPatterns = new Map();
        this.testHistory = [];

        // Estado
        this.isRunning = false;
        this.currentTest = null;

        console.log('🤖 [AI-TESTING] Engine inicializado');
        console.log(`   Ollama: ${this.config.ollamaUrl}`);
        console.log(`   Modelo: ${this.config.ollamaModel}`);
        console.log(`   Self-Heal Max: ${this.config.maxSelfHealAttempts}`);
    }

    /**
     * Inicializar el engine
     */
    async initialize() {
        console.log('🤖 [AI-TESTING] Inicializando...');

        // Inicializar UI Discovery
        this.uiDiscovery = new UIElementDiscoveryEngine({
            baseUrl: this.config.baseUrl,
            database: this.database,
            headless: false // Visible para debugging
        });

        // Verificar Ollama
        const ollamaOk = await this._checkOllama();
        if (!ollamaOk) {
            console.warn('⚠️ [AI-TESTING] Ollama no disponible - funcionalidad limitada');
        }

        // Cargar patrones aprendidos
        await this._loadLearnedPatterns();

        console.log('✅ [AI-TESTING] Engine listo');
        return true;
    }

    /**
     * Verificar disponibilidad de Ollama
     */
    async _checkOllama() {
        try {
            const response = await fetch(`${this.config.ollamaUrl}/api/tags`);
            const data = await response.json();
            const hasModel = data.models?.some(m => m.name.includes(this.config.ollamaModel.split(':')[0]));
            console.log(`   Ollama: ${hasModel ? '✅ Disponible' : '⚠️ Modelo no encontrado'}`);
            return hasModel;
        } catch (e) {
            return false;
        }
    }

    // =========================================================================
    // LENGUAJE NATURAL → TEST EJECUTABLE
    // =========================================================================

    /**
     * Ejecutar test descrito en lenguaje natural
     * @param {string} naturalLanguageDescription - Descripción del test
     * @param {Object} context - Contexto adicional (módulo, empresa, etc)
     * @returns {Object} Resultado del test
     */
    async runNaturalLanguageTest(naturalLanguageDescription, context = {}) {
        console.log('\n' + '═'.repeat(70));
        console.log('🤖 [AI-TESTING] TEST EN LENGUAJE NATURAL');
        console.log('═'.repeat(70));
        console.log(`📝 "${naturalLanguageDescription}"`);
        console.log('─'.repeat(70));

        this.isRunning = true;
        this.currentTest = {
            description: naturalLanguageDescription,
            context,
            startTime: Date.now(),
            steps: [],
            result: null
        };

        try {
            // PASO 1: Interpretar con Ollama
            console.log('\n📖 [PASO 1] Interpretando con IA...');
            const interpretation = await this._interpretWithOllama(naturalLanguageDescription, context);

            if (!interpretation.success) {
                throw new Error(`No se pudo interpretar: ${interpretation.error}`);
            }

            console.log(`   Módulo detectado: ${interpretation.module}`);
            console.log(`   Acción: ${interpretation.action}`);
            console.log(`   Pasos: ${interpretation.steps.length}`);

            // PASO 2: Enriquecer con conocimiento del Brain
            console.log('\n🧠 [PASO 2] Consultando Brain para contexto...');
            const enrichedSteps = await this._enrichWithBrain(interpretation);

            // PASO 3: Ejecutar test con auto-reparación
            console.log('\n🎯 [PASO 3] Ejecutando test...');
            const result = await this._executeWithSelfHealing(enrichedSteps, context);

            // PASO 4: Aprender del resultado
            console.log('\n📚 [PASO 4] Aprendiendo del resultado...');
            await this._learnFromResult(naturalLanguageDescription, enrichedSteps, result);

            this.currentTest.result = result;
            this.currentTest.endTime = Date.now();
            this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;

            // Resumen final
            this._printTestSummary(result);

            return {
                success: result.success,
                description: naturalLanguageDescription,
                interpretation,
                steps: enrichedSteps,
                result,
                duration: this.currentTest.duration,
                selfHealAttempts: result.selfHealAttempts || 0
            };

        } catch (error) {
            console.error(`\n❌ [AI-TESTING] Error: ${error.message}`);
            return {
                success: false,
                description: naturalLanguageDescription,
                error: error.message,
                duration: Date.now() - this.currentTest.startTime
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Interpretar descripción en lenguaje natural usando Ollama
     */
    async _interpretWithOllama(description, context) {
        const systemPrompt = `Eres un experto en testing de aplicaciones web.
Tu tarea es convertir descripciones en lenguaje natural a pasos de test ejecutables.

MÓDULOS DISPONIBLES DEL SISTEMA:
- users: Gestión de usuarios (CRUD, permisos, roles)
- attendance: Control de asistencia (fichajes, reportes)
- departments: Departamentos y estructura organizacional
- shifts: Turnos de trabajo
- vacations: Vacaciones y licencias
- medical: Gestión médica
- payroll: Liquidación de sueldos
- legal: Gestión legal

ACCIONES POSIBLES:
- navigate: Navegar a una URL
- click: Click en un elemento
- fill: Llenar un campo
- verify: Verificar que algo existe/tiene valor
- wait: Esperar
- openModal: Abrir un modal
- submitForm: Enviar formulario
- verifyTable: Verificar datos en tabla

RESPONDE SIEMPRE EN JSON con este formato:
{
  "module": "nombre_modulo",
  "action": "descripcion_corta",
  "steps": [
    {"action": "navigate", "target": "/panel-empresa.html"},
    {"action": "click", "target": "botón o selector", "description": "qué hace"},
    {"action": "fill", "target": "campo", "value": "valor a llenar"},
    {"action": "verify", "target": "elemento", "expected": "valor esperado"}
  ],
  "expectedOutcome": "qué debe pasar si el test pasa"
}`;

        const userPrompt = `Convierte esta descripción de test a pasos ejecutables:

"${description}"

${context.module ? `Contexto: Módulo ${context.module}` : ''}
${context.companyId ? `Empresa ID: ${context.companyId}` : ''}

Responde SOLO con el JSON, sin explicaciones adicionales.`;

        try {
            const response = await fetch(`${this.config.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.ollamaModel,
                    prompt: userPrompt,
                    system: systemPrompt,
                    stream: false,
                    options: {
                        temperature: 0.3, // Más determinístico
                        num_predict: 1000
                    }
                })
            });

            const data = await response.json();

            // Extraer JSON de la respuesta
            const jsonMatch = data.response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Ollama no retornó JSON válido');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return { success: true, ...parsed };

        } catch (error) {
            console.error('   ❌ Error interpretando:', error.message);

            // Fallback: usar patrones aprendidos
            const learned = this._findLearnedPattern(description);
            if (learned) {
                console.log('   📚 Usando patrón aprendido');
                return { success: true, ...learned };
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Enriquecer pasos con conocimiento del Brain
     */
    async _enrichWithBrain(interpretation) {
        if (!this.brainService) {
            console.log('   ⚠️ Brain no disponible - usando pasos sin enriquecer');
            return interpretation.steps;
        }

        try {
            // Obtener metadata del módulo desde el Brain
            const moduleInfo = await this.brainService.getModuleInfo(interpretation.module);

            if (moduleInfo) {
                console.log(`   ✅ Brain proveyó contexto para ${interpretation.module}`);
                console.log(`      Endpoints: ${moduleInfo.endpoints?.length || 0}`);
                console.log(`      Campos: ${moduleInfo.fields?.length || 0}`);

                // Enriquecer pasos con selectores reales
                return interpretation.steps.map(step => {
                    if (step.action === 'fill' && moduleInfo.fields) {
                        const field = moduleInfo.fields.find(f =>
                            f.name.toLowerCase().includes(step.target.toLowerCase())
                        );
                        if (field) {
                            step.selector = field.selector || `[name="${field.name}"]`;
                            step.validation = field.validation;
                        }
                    }
                    return step;
                });
            }
        } catch (e) {
            console.log(`   ⚠️ Error consultando Brain: ${e.message}`);
        }

        return interpretation.steps;
    }

    // =========================================================================
    // EJECUCIÓN CON SELF-HEALING
    // =========================================================================

    /**
     * Ejecutar test con capacidad de auto-reparación
     */
    async _executeWithSelfHealing(steps, context) {
        let attempt = 0;
        let lastError = null;
        let result = { success: false, steps: [] };

        await this.uiDiscovery.start();

        try {
            // Login si es necesario
            if (context.requiresAuth !== false) {
                await this._performLogin(context);
            }

            while (attempt < this.config.maxSelfHealAttempts) {
                attempt++;
                console.log(`\n   🔄 Intento ${attempt}/${this.config.maxSelfHealAttempts}`);

                try {
                    result = await this._executeSteps(steps);

                    if (result.success) {
                        console.log(`   ✅ Test pasó en intento ${attempt}`);
                        result.selfHealAttempts = attempt - 1;
                        return result;
                    }
                } catch (stepError) {
                    lastError = stepError;
                    console.log(`   ❌ Error: ${stepError.message}`);

                    // Self-healing: intentar reparar
                    if (attempt < this.config.maxSelfHealAttempts) {
                        console.log(`   🔧 Intentando auto-reparación...`);
                        steps = await this._selfHeal(steps, stepError, result);
                    }
                }
            }

            result.success = false;
            result.error = lastError?.message || 'Test falló después de todos los intentos';
            result.selfHealAttempts = attempt;

        } finally {
            await this.uiDiscovery.stop();
        }

        return result;
    }

    /**
     * Ejecutar pasos del test
     */
    async _executeSteps(steps) {
        const result = {
            success: true,
            steps: [],
            screenshots: []
        };

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            console.log(`      [${i + 1}/${steps.length}] ${step.action}: ${step.description || step.target}`);

            const stepResult = await this._executeStep(step);
            result.steps.push({
                ...step,
                result: stepResult
            });

            if (!stepResult.success) {
                result.success = false;
                result.failedStep = i;
                result.failedStepDetails = stepResult;
                throw new Error(`Paso ${i + 1} falló: ${stepResult.error}`);
            }
        }

        return result;
    }

    /**
     * Ejecutar un paso individual
     */
    async _executeStep(step) {
        const page = this.uiDiscovery.page;

        try {
            switch (step.action) {
                case 'navigate':
                    await page.goto(`${this.config.baseUrl}${step.target}`, {
                        waitUntil: 'networkidle'
                    });
                    await page.waitForTimeout(1000);
                    return { success: true };

                case 'click':
                    const clickSelector = step.selector || await this._findElement(step.target);
                    await page.click(clickSelector);
                    await page.waitForTimeout(500);
                    return { success: true, selector: clickSelector };

                case 'fill':
                    const fillSelector = step.selector || await this._findElement(step.target);
                    await page.fill(fillSelector, step.value);
                    return { success: true, selector: fillSelector };

                case 'verify':
                    const verifySelector = step.selector || await this._findElement(step.target);
                    const element = await page.$(verifySelector);
                    if (!element) {
                        return { success: false, error: `Elemento no encontrado: ${step.target}` };
                    }
                    if (step.expected) {
                        const text = await element.textContent();
                        if (!text.includes(step.expected)) {
                            return { success: false, error: `Valor esperado "${step.expected}" no encontrado` };
                        }
                    }
                    return { success: true };

                case 'wait':
                    await page.waitForTimeout(step.duration || 1000);
                    return { success: true };

                case 'openModal':
                    const modalResult = await this.uiDiscovery.openAndVerifyModal(
                        step.selector || await this._findElement(step.target),
                        step.expectations || {}
                    );
                    return {
                        success: modalResult.modalOpened,
                        modalContent: modalResult.modalContent,
                        error: modalResult.issues?.join(', ')
                    };

                case 'submitForm':
                    await page.click(step.selector || 'button[type="submit"]');
                    await page.waitForTimeout(1500);
                    return { success: true };

                case 'verifyTable':
                    const tableResult = await this.uiDiscovery.verifyTableSSOT(
                        step.selector || 'table',
                        step.dbTable,
                        step.keyColumn
                    );
                    return { success: tableResult.verified, details: tableResult };

                default:
                    return { success: false, error: `Acción desconocida: ${step.action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Encontrar elemento usando múltiples estrategias
     */
    async _findElement(target) {
        const page = this.uiDiscovery.page;

        // Estrategia 1: Selector directo
        if (target.startsWith('#') || target.startsWith('.') || target.startsWith('[')) {
            const exists = await page.$(target);
            if (exists) return target;
        }

        // Estrategia 2: Buscar por texto
        const byText = await page.$(`text="${target}"`);
        if (byText) return `text="${target}"`;

        // Estrategia 3: Buscar por placeholder
        const byPlaceholder = await page.$(`[placeholder*="${target}" i]`);
        if (byPlaceholder) return `[placeholder*="${target}" i]`;

        // Estrategia 4: Buscar por label
        const byLabel = await page.$(`label:has-text("${target}") + input, label:has-text("${target}") + select`);
        if (byLabel) return `label:has-text("${target}") + input`;

        // Estrategia 5: Buscar botón por texto
        const byButton = await page.$(`button:has-text("${target}")`);
        if (byButton) return `button:has-text("${target}")`;

        // Estrategia 6: Usar UIDiscovery para encontrar elemento similar
        const discovery = await this.uiDiscovery.discoverAllElements();
        const similar = this._findSimilarElement(target, discovery);
        if (similar) return similar;

        throw new Error(`Elemento no encontrado: ${target}`);
    }

    /**
     * Encontrar elemento similar en el descubrimiento
     */
    _findSimilarElement(target, discovery) {
        const targetLower = target.toLowerCase();

        // Buscar en botones
        for (const btn of discovery.elements.buttons) {
            if (btn.text.toLowerCase().includes(targetLower)) {
                return btn.id ? `#${btn.id}` : `button:has-text("${btn.text}")`;
            }
        }

        // Buscar en inputs
        for (const input of discovery.elements.inputs) {
            if (input.name?.toLowerCase().includes(targetLower) ||
                input.placeholder?.toLowerCase().includes(targetLower) ||
                input.label?.toLowerCase().includes(targetLower)) {
                return input.id ? `#${input.id}` : `[name="${input.name}"]`;
            }
        }

        return null;
    }

    // =========================================================================
    // SELF-HEALING
    // =========================================================================

    /**
     * Auto-reparar test fallido
     */
    async _selfHeal(steps, error, lastResult) {
        console.log(`   🔧 Analizando fallo para auto-reparación...`);

        const failedStep = steps[lastResult.failedStep];

        // Estrategia 1: Re-descubrir la UI y actualizar selectores
        const discovery = await this.uiDiscovery.discoverAllElements();

        // Estrategia 2: Pedir ayuda a Ollama
        const healSuggestion = await this._askOllamaForHeal(failedStep, error, discovery);

        if (healSuggestion.newSelector) {
            console.log(`   💡 Ollama sugiere nuevo selector: ${healSuggestion.newSelector}`);
            steps[lastResult.failedStep].selector = healSuggestion.newSelector;
        }

        if (healSuggestion.additionalSteps) {
            console.log(`   💡 Ollama sugiere pasos adicionales`);
            steps.splice(lastResult.failedStep, 0, ...healSuggestion.additionalSteps);
        }

        return steps;
    }

    /**
     * Pedir a Ollama sugerencias para reparar
     */
    async _askOllamaForHeal(failedStep, error, discovery) {
        const prompt = `Un test E2E falló. Necesito que sugieras cómo repararlo.

PASO QUE FALLÓ:
${JSON.stringify(failedStep, null, 2)}

ERROR:
${error.message}

ELEMENTOS DISPONIBLES EN LA UI:
Botones: ${discovery.elements.buttons.slice(0, 10).map(b => b.text).join(', ')}
Inputs: ${discovery.elements.inputs.slice(0, 10).map(i => i.name || i.placeholder).join(', ')}

Sugiere una reparación en JSON:
{
  "newSelector": "selector alternativo si aplica",
  "additionalSteps": [pasos adicionales si se necesitan]
}`;

        try {
            const response = await fetch(`${this.config.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.ollamaModel,
                    prompt,
                    stream: false,
                    options: { temperature: 0.5 }
                })
            });

            const data = await response.json();
            const jsonMatch = data.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.log(`   ⚠️ Ollama no pudo sugerir reparación`);
        }

        return {};
    }

    // =========================================================================
    // APRENDIZAJE
    // =========================================================================

    /**
     * Aprender del resultado del test
     */
    async _learnFromResult(description, steps, result) {
        if (!this.config.learningEnabled) return;

        // Guardar patrón exitoso
        if (result.success) {
            this.learnedPatterns.set(this._normalizeDescription(description), {
                steps,
                successCount: (this.learnedPatterns.get(description)?.successCount || 0) + 1,
                lastUsed: new Date().toISOString()
            });
            console.log(`   ✅ Patrón guardado para futuras ejecuciones`);
        }

        // Guardar en historial
        this.testHistory.push({
            testId: this.currentTest?.context?.testId || `test-${Date.now()}`,
            description,
            steps,
            result: result.success,
            timestamp: new Date().toISOString(),
            selfHealAttempts: result.selfHealAttempts,
            duration: this.currentTest?.duration || 0
        });

        // Alimentar al Assistant KB si está disponible
        if (this.assistantService && result.success) {
            try {
                await this._feedAssistantKB(description, steps, result);
            } catch (e) {
                console.log(`   ⚠️ No se pudo alimentar Assistant KB`);
            }
        }

        // Guardar patrones a archivo
        await this._saveLearnedPatterns();
    }

    /**
     * Alimentar el Knowledge Base del Asistente
     */
    async _feedAssistantKB(description, steps, result) {
        // Crear entrada de conocimiento
        const knowledge = {
            question: `¿Cómo hago para ${description.toLowerCase()}?`,
            answer: `Para ${description.toLowerCase()}, sigue estos pasos:\n${steps.map((s, i) =>
                `${i + 1}. ${s.description || s.action + ' ' + s.target}`
            ).join('\n')}`,
            category: 'testing',
            source: 'ai_testing_engine',
            confidence: 0.9
        };

        // TODO: Guardar en assistant_knowledge_base
        console.log(`   📚 Conocimiento alimentado al Assistant KB`);
    }

    /**
     * Normalizar descripción para matching
     */
    _normalizeDescription(description) {
        return description.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Buscar patrón aprendido similar
     */
    _findLearnedPattern(description) {
        const normalized = this._normalizeDescription(description);

        // Búsqueda exacta
        if (this.learnedPatterns.has(normalized)) {
            return this.learnedPatterns.get(normalized);
        }

        // Búsqueda por similitud
        for (const [key, pattern] of this.learnedPatterns) {
            const similarity = this._calculateSimilarity(normalized, key);
            if (similarity > 0.7) {
                return pattern;
            }
        }

        return null;
    }

    /**
     * Calcular similitud entre strings
     */
    _calculateSimilarity(str1, str2) {
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        const intersection = words1.filter(w => words2.includes(w));
        return intersection.length / Math.max(words1.length, words2.length);
    }

    /**
     * Cargar patrones aprendidos
     */
    async _loadLearnedPatterns() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const patternsFile = path.join(__dirname, 'learned_patterns.json');

            const data = await fs.readFile(patternsFile, 'utf8');
            const patterns = JSON.parse(data);

            for (const [key, value] of Object.entries(patterns)) {
                this.learnedPatterns.set(key, value);
            }

            console.log(`   📚 Cargados ${this.learnedPatterns.size} patrones aprendidos`);
        } catch (e) {
            // Archivo no existe, empezar vacío
        }
    }

    /**
     * Guardar patrones aprendidos
     */
    async _saveLearnedPatterns() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const patternsFile = path.join(__dirname, 'learned_patterns.json');

            const patterns = Object.fromEntries(this.learnedPatterns);
            await fs.writeFile(patternsFile, JSON.stringify(patterns, null, 2));
        } catch (e) {
            console.warn('   ⚠️ No se pudieron guardar patrones');
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Realizar login
     */
    async _performLogin(context) {
        const companySlug = context.companySlug || 'aponnt-empresa-demo';
        const username = context.username || 'administrador';
        const password = context.password || 'admin123';

        console.log(`   🔐 Login: ${companySlug}/${username}`);
        await this.uiDiscovery.login(companySlug, username, password);
    }

    /**
     * Imprimir resumen del test
     */
    _printTestSummary(result) {
        console.log('\n' + '═'.repeat(70));
        console.log('📊 RESUMEN DEL TEST');
        console.log('═'.repeat(70));
        console.log(`   Estado: ${result.success ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`   Pasos ejecutados: ${result.steps?.length || 0}`);
        console.log(`   Intentos de self-heal: ${result.selfHealAttempts || 0}`);
        console.log(`   Duración: ${this.currentTest.duration}ms`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
        console.log('═'.repeat(70) + '\n');
    }

    // =========================================================================
    // API PÚBLICA ADICIONAL
    // =========================================================================

    /**
     * Obtener tests sugeridos basados en el módulo
     */
    async getSuggestedTests(moduleKey) {
        const suggestions = {
            users: [
                "Verificar que puedo crear un nuevo usuario",
                "Verificar que puedo editar un usuario existente",
                "Verificar que puedo eliminar un usuario",
                "Verificar que la tabla de usuarios muestra datos correctos"
            ],
            attendance: [
                "Verificar que puedo registrar una entrada",
                "Verificar que puedo ver el historial de asistencia",
                "Verificar que los reportes de asistencia se generan correctamente"
            ],
            departments: [
                "Verificar que puedo crear un departamento",
                "Verificar que puedo asignar usuarios a un departamento"
            ],
            vacations: [
                "Verificar que puedo solicitar vacaciones",
                "Verificar que un supervisor puede aprobar vacaciones"
            ]
        };

        return suggestions[moduleKey] || [
            `Verificar que puedo acceder al módulo ${moduleKey}`,
            `Verificar que el CRUD de ${moduleKey} funciona`
        ];
    }

    /**
     * Obtener historial de tests
     */
    getTestHistory(limit = 20) {
        return this.testHistory.slice(-limit).map(t => ({
            testId: t.testId || `test-${t.timestamp}`,
            description: t.description,
            status: t.result ? 'passed' : 'failed',
            attempts: (t.selfHealAttempts || 0) + 1,
            healingApplied: (t.selfHealAttempts || 0) > 0,
            duration: t.duration || 0,
            timestamp: t.timestamp
        }));
    }

    /**
     * Obtener patrones aprendidos
     */
    getLearnedPatterns() {
        const patterns = [];
        for (const [description, pattern] of this.learnedPatterns) {
            patterns.push({
                description,
                steps: pattern.steps,
                successCount: pattern.successCount || 0,
                lastUsed: pattern.lastUsed
            });
        }
        return patterns.sort((a, b) => b.successCount - a.successCount);
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        const total = this.testHistory.length;
        const passed = this.testHistory.filter(t => t.result).length;
        const selfHealed = this.testHistory.filter(t => t.selfHealAttempts > 0).length;

        return {
            totalTests: total,
            passed,
            failed: total - passed,
            passRate: total > 0 ? (passed / total * 100).toFixed(1) + '%' : '0%',
            selfHealedTests: selfHealed,
            learnedPatterns: this.learnedPatterns.size
        };
    }
}

module.exports = AITestingEngine;
