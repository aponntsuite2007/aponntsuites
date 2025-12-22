/**
 * ============================================================================
 * FLOW RECORDER - Grabador de Flujos de Usuario
 * ============================================================================
 *
 * Genera flujos de usuario automáticamente basados en:
 * - Conocimiento del UI (StaticHTMLAnalyzer)
 * - Patrones CRUD estándar
 * - Endpoints API conocidos
 *
 * Los flujos sirven para:
 * - Generar tutoriales automáticos
 * - Crear tests E2E
 * - Entrenar al Soporte AI
 * - Demos del Vendedor AI
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

class FlowRecorder {
    constructor(options = {}) {
        this.config = {
            knowledgeDir: options.knowledgeDir || path.join(__dirname, '../knowledge'),
            outputDir: options.outputDir || path.join(__dirname, '../knowledge/flows'),
            ...options
        };

        this.flows = new Map();
        this.templates = this.initializeTemplates();

        // Ensure output directory exists
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }
    }

    /**
     * Inicializar plantillas de flujos CRUD
     */
    initializeTemplates() {
        return {
            // Flujo: Crear entidad
            create: {
                name: 'create-{entity}',
                description: 'Crear un nuevo {entity}',
                steps: [
                    { action: 'navigate', target: 'module-{entity}', description: 'Ir al módulo de {entities}' },
                    { action: 'click', target: 'btn-new-{entity}', description: 'Click en "Nuevo {Entity}"' },
                    { action: 'wait', target: 'modal-{entity}', description: 'Esperar que abra el modal' },
                    { action: 'fill-form', target: 'form-{entity}', description: 'Completar formulario' },
                    { action: 'click', target: 'btn-save', description: 'Click en "Guardar"' },
                    { action: 'verify', target: 'success-message', description: 'Verificar mensaje de éxito' },
                    { action: 'verify', target: 'table-{entity}', contains: '{entity-name}', description: 'Verificar en lista' }
                ],
                preconditions: ['logged-in', 'has-permission-create-{entity}'],
                postconditions: ['{entity}-created']
            },

            // Flujo: Editar entidad
            edit: {
                name: 'edit-{entity}',
                description: 'Editar un {entity} existente',
                steps: [
                    { action: 'navigate', target: 'module-{entity}', description: 'Ir al módulo de {entities}' },
                    { action: 'click', target: 'row-{entity}', description: 'Seleccionar {entity} de la lista' },
                    { action: 'click', target: 'btn-edit', description: 'Click en "Editar"' },
                    { action: 'wait', target: 'modal-{entity}', description: 'Esperar que abra el modal' },
                    { action: 'modify-form', target: 'form-{entity}', description: 'Modificar campos' },
                    { action: 'click', target: 'btn-save', description: 'Click en "Guardar"' },
                    { action: 'verify', target: 'success-message', description: 'Verificar mensaje de éxito' }
                ],
                preconditions: ['logged-in', '{entity}-exists', 'has-permission-edit-{entity}'],
                postconditions: ['{entity}-updated']
            },

            // Flujo: Eliminar entidad
            delete: {
                name: 'delete-{entity}',
                description: 'Eliminar un {entity}',
                steps: [
                    { action: 'navigate', target: 'module-{entity}', description: 'Ir al módulo de {entities}' },
                    { action: 'click', target: 'row-{entity}', description: 'Seleccionar {entity} de la lista' },
                    { action: 'click', target: 'btn-delete', description: 'Click en "Eliminar"' },
                    { action: 'wait', target: 'confirm-dialog', description: 'Esperar diálogo de confirmación' },
                    { action: 'click', target: 'btn-confirm', description: 'Confirmar eliminación' },
                    { action: 'verify', target: 'success-message', description: 'Verificar mensaje de éxito' },
                    { action: 'verify-not', target: 'table-{entity}', contains: '{entity-name}', description: 'Verificar que no está en lista' }
                ],
                preconditions: ['logged-in', '{entity}-exists', 'has-permission-delete-{entity}'],
                postconditions: ['{entity}-deleted']
            },

            // Flujo: Buscar/Filtrar
            search: {
                name: 'search-{entity}',
                description: 'Buscar {entities}',
                steps: [
                    { action: 'navigate', target: 'module-{entity}', description: 'Ir al módulo de {entities}' },
                    { action: 'fill', target: 'input-search', value: '{search-term}', description: 'Escribir término de búsqueda' },
                    { action: 'click', target: 'btn-search', description: 'Click en buscar (o Enter)' },
                    { action: 'wait', target: 'table-{entity}', description: 'Esperar resultados' },
                    { action: 'verify', target: 'table-{entity}', contains: '{search-term}', description: 'Verificar resultados' }
                ],
                preconditions: ['logged-in'],
                postconditions: ['results-displayed']
            },

            // Flujo: Ver detalles
            view: {
                name: 'view-{entity}',
                description: 'Ver detalles de {entity}',
                steps: [
                    { action: 'navigate', target: 'module-{entity}', description: 'Ir al módulo de {entities}' },
                    { action: 'click', target: 'row-{entity}', description: 'Click en {entity} de la lista' },
                    { action: 'wait', target: 'detail-panel', description: 'Esperar panel de detalles' },
                    { action: 'verify', target: 'detail-panel', hasContent: true, description: 'Verificar que muestra datos' }
                ],
                preconditions: ['logged-in', '{entity}-exists'],
                postconditions: ['details-visible']
            }
        };
    }

    /**
     * Generar flujos para todos los módulos conocidos
     */
    async generateAllFlows() {
        console.log('\n' + '═'.repeat(60));
        console.log('🎬 FLOW RECORDER - Generando Flujos');
        console.log('═'.repeat(60));

        // Cargar conocimiento del UI
        const uiKnowledge = this.loadUIKnowledge();
        const modules = this.loadModulesKnowledge();

        // Generar flujos para cada módulo
        for (const [moduleKey, moduleData] of Object.entries(modules)) {
            await this.generateModuleFlows(moduleKey, moduleData, uiKnowledge);
        }

        // Guardar todos los flujos
        await this.saveFlows();

        console.log(`\n✅ Generados ${this.flows.size} flujos para ${Object.keys(modules).length} módulos`);

        return {
            flowCount: this.flows.size,
            moduleCount: Object.keys(modules).length,
            flows: Array.from(this.flows.values())
        };
    }

    /**
     * Cargar conocimiento del UI
     */
    loadUIKnowledge() {
        try {
            const uiPath = path.join(this.config.knowledgeDir, 'ui', 'static-analysis.json');
            if (fs.existsSync(uiPath)) {
                return JSON.parse(fs.readFileSync(uiPath, 'utf8'));
            }
        } catch (e) {
            console.log('   ⚠️ No se pudo cargar UI knowledge');
        }
        return { modules: {}, globalElements: { buttons: [], inputs: [] } };
    }

    /**
     * Cargar conocimiento de módulos
     */
    loadModulesKnowledge() {
        try {
            const summaryPath = path.join(this.config.knowledgeDir, 'ui', 'modules-summary.json');
            if (fs.existsSync(summaryPath)) {
                return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
            }
        } catch (e) {
            console.log('   ⚠️ No se pudo cargar modules summary');
        }

        // Fallback: usar registry
        try {
            const registryPath = path.join(__dirname, '../../auditor/registry/modules-registry.json');
            const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            const modules = {};
            for (const mod of registry.modules) {
                modules[mod.id] = {
                    name: mod.name,
                    category: mod.category,
                    hasUI: true
                };
            }
            return modules;
        } catch (e) {
            return {};
        }
    }

    /**
     * Generar flujos para un módulo específico
     */
    async generateModuleFlows(moduleKey, moduleData, uiKnowledge) {
        console.log(`\n📦 Generando flujos para: ${moduleKey}`);

        const entityName = this.moduleKeyToEntityName(moduleKey);
        const entityPlural = this.pluralize(entityName);

        // Determinar qué operaciones CRUD soporta el módulo
        const supportedOps = this.inferSupportedOperations(moduleKey, moduleData, uiKnowledge);

        // Generar flujo para cada operación soportada
        for (const op of supportedOps) {
            const template = this.templates[op];
            if (!template) continue;

            const flow = this.instantiateFlowTemplate(template, {
                entity: entityName,
                entities: entityPlural,
                Entity: this.capitalize(entityName),
                module: moduleKey
            });

            // Agregar metadata del módulo
            flow.module = moduleKey;
            flow.generatedAt = new Date().toISOString();
            flow.source = 'auto-generated';

            const flowId = `${moduleKey}-${op}`;
            this.flows.set(flowId, flow);
        }

        console.log(`   ✅ ${supportedOps.length} flujos generados`);
    }

    /**
     * Inferir operaciones soportadas por un módulo
     */
    inferSupportedOperations(moduleKey, moduleData, uiKnowledge) {
        const ops = [];

        // Módulos core generalmente soportan CRUD completo
        const coreModules = ['users', 'departments', 'shifts', 'kiosks', 'attendance', 'companies'];
        if (coreModules.includes(moduleKey)) {
            return ['create', 'edit', 'delete', 'search', 'view'];
        }

        // Para otros módulos, inferir de los endpoints API
        if (moduleData.apiEndpoints && Array.isArray(moduleData.apiEndpoints)) {
            for (const endpoint of moduleData.apiEndpoints) {
                if (typeof endpoint === 'string') {
                    if (endpoint.includes('POST') || endpoint.includes('/create')) ops.push('create');
                    if (endpoint.includes('PUT') || endpoint.includes('/update')) ops.push('edit');
                    if (endpoint.includes('DELETE')) ops.push('delete');
                }
            }
        }

        // Si tiene hasUI, al menos puede ver
        if (moduleData.hasUI) {
            if (!ops.includes('view')) ops.push('view');
            if (!ops.includes('search')) ops.push('search');
        }

        return [...new Set(ops)]; // Eliminar duplicados
    }

    /**
     * Instanciar una plantilla de flujo con valores específicos
     */
    instantiateFlowTemplate(template, replacements) {
        const flow = JSON.parse(JSON.stringify(template)); // Deep clone

        // Reemplazar placeholders en todo el objeto
        const replaceInObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    for (const [placeholder, value] of Object.entries(replacements)) {
                        obj[key] = obj[key].replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    replaceInObject(obj[key]);
                }
            }
        };

        replaceInObject(flow);
        return flow;
    }

    /**
     * Convertir module key a entity name
     */
    moduleKeyToEntityName(moduleKey) {
        // users -> user, departments -> department, etc.
        let name = moduleKey.replace(/-/g, '_');
        if (name.endsWith('s') && !name.endsWith('ss')) {
            name = name.slice(0, -1);
        }
        return name;
    }

    /**
     * Pluralizar
     */
    pluralize(word) {
        if (word.endsWith('y')) {
            return word.slice(0, -1) + 'ies';
        }
        if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch')) {
            return word + 'es';
        }
        return word + 's';
    }

    /**
     * Capitalizar
     */
    capitalize(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    /**
     * Guardar todos los flujos
     */
    async saveFlows() {
        console.log('\n💾 Guardando flujos...');

        const allFlows = {
            generatedAt: new Date().toISOString(),
            count: this.flows.size,
            flows: {}
        };

        for (const [id, flow] of this.flows) {
            allFlows.flows[id] = flow;

            // También guardar cada flujo individualmente
            const flowPath = path.join(this.config.outputDir, `${id}.json`);
            fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2));
        }

        // Guardar índice de todos los flujos
        const indexPath = path.join(this.config.outputDir, 'flows-index.json');
        fs.writeFileSync(indexPath, JSON.stringify(allFlows, null, 2));

        console.log(`   ✅ Guardados ${this.flows.size} flujos en: ${this.config.outputDir}`);
    }

    /**
     * Obtener flujo por ID
     */
    getFlow(flowId) {
        if (this.flows.has(flowId)) {
            return this.flows.get(flowId);
        }

        // Intentar cargar desde archivo
        const flowPath = path.join(this.config.outputDir, `${flowId}.json`);
        if (fs.existsSync(flowPath)) {
            return JSON.parse(fs.readFileSync(flowPath, 'utf8'));
        }

        return null;
    }

    /**
     * Listar todos los flujos disponibles
     */
    listFlows() {
        const indexPath = path.join(this.config.outputDir, 'flows-index.json');
        if (fs.existsSync(indexPath)) {
            const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            return Object.keys(index.flows);
        }
        return Array.from(this.flows.keys());
    }

    /**
     * Convertir flujo a formato de tutorial
     */
    flowToTutorial(flowId) {
        const flow = this.getFlow(flowId);
        if (!flow) return null;

        return {
            id: `tutorial-${flowId}`,
            title: flow.description,
            module: flow.module,
            estimatedTime: `${flow.steps.length * 10}s`,
            steps: flow.steps.map((step, i) => ({
                number: i + 1,
                instruction: step.description,
                action: step.action,
                target: step.target,
                tip: this.generateTip(step)
            })),
            prerequisites: flow.preconditions,
            outcome: flow.postconditions
        };
    }

    /**
     * Generar tip para un paso
     */
    generateTip(step) {
        const tips = {
            click: 'Haz click en el elemento indicado',
            fill: 'Escribe el valor en el campo',
            'fill-form': 'Completa todos los campos requeridos',
            wait: 'Espera a que el elemento aparezca',
            verify: 'Confirma que ves el resultado esperado',
            navigate: 'Ve a la sección indicada'
        };
        return tips[step.action] || '';
    }

    /**
     * Convertir flujo a formato de test E2E
     */
    flowToE2ETest(flowId) {
        const flow = this.getFlow(flowId);
        if (!flow) return null;

        const testSteps = flow.steps.map(step => {
            switch (step.action) {
                case 'click':
                    return `await page.click('${step.target}');`;
                case 'fill':
                    return `await page.fill('${step.target}', '${step.value || 'test'}');`;
                case 'wait':
                    return `await page.waitForSelector('${step.target}');`;
                case 'verify':
                    return `await expect(page.locator('${step.target}')).toBeVisible();`;
                case 'navigate':
                    return `await page.goto('/${step.target}');`;
                default:
                    return `// ${step.description}`;
            }
        });

        return {
            testName: `test_${flowId.replace(/-/g, '_')}`,
            code: `
test('${flow.description}', async ({ page }) => {
    // Preconditions: ${flow.preconditions.join(', ')}

${testSteps.map(s => '    ' + s).join('\n')}

    // Postconditions: ${flow.postconditions.join(', ')}
});
            `.trim()
        };
    }
}

module.exports = FlowRecorder;
