/**
 * ============================================================================
 * DYNAMIC WORKFLOW INTROSPECTOR
 * ============================================================================
 *
 * Sistema de introspección REAL de código vivo para detectar workflows
 * dinámicamente analizando el código fuente y sus dependencias.
 *
 * DIFERENCIA CON EL SISTEMA ANTERIOR:
 * - ANTES: static STAGES = {...} definido manualmente, Brain solo lo lee
 * - AHORA: Analiza el código real, detecta flujos, construye workflow dinámico
 *
 * CAPACIDADES:
 * 1. AST Parsing - Analiza estructura del código
 * 2. Dependency Tracing - Detecta llamadas entre servicios
 * 3. Flow Detection - Identifica if/else, try/catch, await chains
 * 4. Auto-regeneration - Reconstruye workflow cuando cambia el código
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DynamicWorkflowIntrospector {
    constructor() {
        // Cache de análisis por archivo
        this.analysisCache = new Map();

        // Hash de archivos para detectar cambios
        this.fileHashes = new Map();

        // Workflows detectados dinámicamente
        this.detectedWorkflows = new Map();

        // Patrones de código que indican stages/pasos
        this.stagePatterns = {
            // Funciones async que representan pasos
            asyncFunction: /async\s+(\w+)\s*\([^)]*\)\s*\{/g,

            // Llamadas a otros servicios
            serviceCall: /await\s+(\w+Service)\.(\w+)\s*\(/g,

            // Validaciones (if/throw)
            validation: /if\s*\([^)]+\)\s*\{?\s*(throw|return\s+\{[^}]*error)/g,

            // Transiciones (return con estado)
            transition: /return\s*\{[^}]*status:\s*['"](\w+)['"]/g,

            // Try/catch blocks
            errorHandling: /try\s*\{[\s\S]*?\}\s*catch/g,

            // Emit events
            eventEmit: /emit\s*\(\s*['"](\w+)['"]/g
        };

        // Servicios conocidos del workflow de fichaje
        this.attendanceServices = [
            'BiometricService',
            'LateArrivalAuthorizationService',
            'ShiftCalculatorService',
            'CalendarioLaboralService',
            'OrganizationalHierarchyService',
            'NotificationService'
        ];
    }

    /**
     * ========================================================================
     * MÉTODO PRINCIPAL: Analizar workflow desde código fuente
     * ========================================================================
     */
    async analyzeWorkflow(entryPointFile, workflowName) {
        console.log(`🔍 [INTROSPECTOR] Analizando workflow: ${workflowName}`);
        console.log(`   Entry point: ${entryPointFile}`);

        const startTime = Date.now();

        try {
            // 1. Leer archivo de entrada
            const entryCode = fs.readFileSync(entryPointFile, 'utf8');
            const entryHash = this.hashCode(entryCode);

            // 2. Verificar si cambió desde último análisis
            const cachedHash = this.fileHashes.get(entryPointFile);
            if (cachedHash === entryHash && this.detectedWorkflows.has(workflowName)) {
                console.log(`   ♻️ Usando cache (archivo sin cambios)`);
                return this.detectedWorkflows.get(workflowName);
            }

            // 3. Analizar código y extraer flujo
            const analysis = await this.analyzeCode(entryCode, entryPointFile);

            // 4. Detectar dependencias (otros servicios llamados)
            const dependencies = await this.traceDependencies(entryCode, entryPointFile);

            // 5. Construir workflow dinámico
            const workflow = this.buildDynamicWorkflow(analysis, dependencies, workflowName);

            // 6. Guardar en cache
            this.fileHashes.set(entryPointFile, entryHash);
            this.detectedWorkflows.set(workflowName, workflow);

            console.log(`   ✅ Workflow construido: ${workflow.stages.length} stages detectados`);
            console.log(`   ⏱️ Tiempo: ${Date.now() - startTime}ms`);

            return workflow;

        } catch (error) {
            console.error(`   ❌ Error analizando workflow: ${error.message}`);
            throw error;
        }
    }

    /**
     * ========================================================================
     * Analizar código y extraer estructura
     * ========================================================================
     */
    async analyzeCode(code, filePath) {
        const analysis = {
            file: filePath,
            functions: [],
            serviceCalls: [],
            validations: [],
            transitions: [],
            errorHandlers: [],
            events: []
        };

        // Extraer funciones async (potenciales stages)
        let match;
        const asyncFuncRegex = /async\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
        while ((match = asyncFuncRegex.exec(code)) !== null) {
            const funcName = match[1];
            const params = match[2];
            const startPos = match.index;

            // Encontrar el cuerpo de la función
            const funcBody = this.extractFunctionBody(code, startPos);

            analysis.functions.push({
                name: funcName,
                params: params.split(',').map(p => p.trim()).filter(p => p),
                startLine: this.getLineNumber(code, startPos),
                body: funcBody,
                callsServices: this.extractServiceCalls(funcBody),
                hasValidations: this.hasValidations(funcBody),
                transitions: this.extractTransitions(funcBody)
            });
        }

        // Extraer llamadas a servicios globales
        const serviceCallRegex = /await\s+(?:this\.)?(\w+(?:Service)?)\s*\.\s*(\w+)\s*\(/g;
        while ((match = serviceCallRegex.exec(code)) !== null) {
            analysis.serviceCalls.push({
                service: match[1],
                method: match[2],
                line: this.getLineNumber(code, match.index)
            });
        }

        // Extraer validaciones (if + throw/error)
        const validationRegex = /if\s*\(([^)]+)\)\s*\{?\s*(throw\s+new\s+Error|return\s*\{[^}]*(?:error|success:\s*false))/g;
        while ((match = validationRegex.exec(code)) !== null) {
            analysis.validations.push({
                condition: match[1].trim(),
                action: match[2].includes('throw') ? 'throw' : 'return_error',
                line: this.getLineNumber(code, match.index)
            });
        }

        // Extraer transiciones de estado
        const transitionRegex = /(?:status|state|stage)\s*[=:]\s*['"](\w+)['"]/g;
        while ((match = transitionRegex.exec(code)) !== null) {
            analysis.transitions.push({
                state: match[1],
                line: this.getLineNumber(code, match.index)
            });
        }

        return analysis;
    }

    /**
     * ========================================================================
     * Trazar dependencias entre servicios
     * ========================================================================
     */
    async traceDependencies(code, filePath) {
        const dependencies = {
            imports: [],
            requires: [],
            serviceCalls: [],
            externalServices: []
        };

        // Extraer requires
        const requireRegex = /(?:const|let|var)\s+(?:\{([^}]+)\}|(\w+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        let match;

        while ((match = requireRegex.exec(code)) !== null) {
            const destructured = match[1];
            const single = match[2];
            const modulePath = match[3];

            if (destructured) {
                destructured.split(',').forEach(name => {
                    dependencies.requires.push({
                        name: name.trim(),
                        module: modulePath
                    });
                });
            } else if (single) {
                dependencies.requires.push({
                    name: single,
                    module: modulePath
                });
            }
        }

        // Identificar servicios externos llamados
        const serviceNames = [...new Set(
            (code.match(/\b(\w+Service)\b/g) || [])
        )];

        for (const serviceName of serviceNames) {
            if (this.attendanceServices.includes(serviceName)) {
                dependencies.externalServices.push({
                    name: serviceName,
                    isCore: true
                });
            }
        }

        return dependencies;
    }

    /**
     * ========================================================================
     * Construir workflow dinámico desde análisis
     * ========================================================================
     */
    buildDynamicWorkflow(analysis, dependencies, workflowName) {
        const stages = [];
        const transitions = new Map();

        // Convertir funciones detectadas en stages
        for (const func of analysis.functions) {
            // Filtrar funciones privadas/helpers
            if (func.name.startsWith('_') || func.name.startsWith('get') || func.name.startsWith('set')) {
                continue;
            }

            const stage = {
                id: this.toStageId(func.name),
                name: this.toStageName(func.name),
                description: `Auto-detectado desde ${func.name}()`,
                source: {
                    function: func.name,
                    file: analysis.file,
                    line: func.startLine
                },
                validations: func.hasValidations ? this.extractValidationRules(func.body) : [],
                callsServices: func.callsServices,
                possibleTransitions: func.transitions,
                isAutoDetected: true,
                detectedAt: new Date().toISOString()
            };

            stages.push(stage);

            // Mapear transiciones
            if (func.transitions.length > 0) {
                transitions.set(stage.id, func.transitions);
            }
        }

        // Ordenar stages por aparición en código
        stages.sort((a, b) => a.source.line - b.source.line);

        // Construir grafo de flujo
        const flowGraph = this.buildFlowGraph(stages, transitions);

        return {
            name: workflowName,
            version: '1.0.0-dynamic',
            generatedAt: new Date().toISOString(),
            source: analysis.file,
            isAutoGenerated: true,

            stages: stages,
            stageCount: stages.length,

            dependencies: {
                internal: dependencies.requires.filter(r => r.module.startsWith('.')),
                external: dependencies.externalServices
            },

            flowGraph: flowGraph,

            metadata: {
                totalFunctions: analysis.functions.length,
                totalValidations: analysis.validations.length,
                totalServiceCalls: analysis.serviceCalls.length,
                analysisTime: new Date().toISOString()
            }
        };
    }

    /**
     * ========================================================================
     * Construir grafo de flujo
     * ========================================================================
     */
    buildFlowGraph(stages, transitions) {
        const nodes = stages.map(s => ({
            id: s.id,
            name: s.name,
            type: this.inferStageType(s)
        }));

        const edges = [];

        // Conectar stages secuencialmente por defecto
        for (let i = 0; i < stages.length - 1; i++) {
            edges.push({
                from: stages[i].id,
                to: stages[i + 1].id,
                type: 'sequential'
            });
        }

        // Agregar transiciones detectadas
        for (const [stageId, trans] of transitions) {
            for (const t of trans) {
                const targetStage = stages.find(s =>
                    s.id.toLowerCase().includes(t.toLowerCase()) ||
                    s.name.toLowerCase().includes(t.toLowerCase())
                );

                if (targetStage && targetStage.id !== stageId) {
                    edges.push({
                        from: stageId,
                        to: targetStage.id,
                        type: 'conditional',
                        condition: t
                    });
                }
            }
        }

        return { nodes, edges };
    }

    /**
     * ========================================================================
     * WATCHER: Detectar cambios en archivos
     * ========================================================================
     */
    watchForChanges(files, workflowName, callback) {
        console.log(`👁️ [INTROSPECTOR] Watching ${files.length} files for changes...`);

        const watchers = [];

        for (const file of files) {
            if (!fs.existsSync(file)) continue;

            const watcher = fs.watch(file, async (eventType, filename) => {
                if (eventType === 'change') {
                    console.log(`📝 [INTROSPECTOR] File changed: ${filename}`);

                    // Invalidar cache
                    this.fileHashes.delete(file);
                    this.detectedWorkflows.delete(workflowName);

                    // Re-analizar
                    try {
                        const newWorkflow = await this.analyzeWorkflow(file, workflowName);
                        callback(null, newWorkflow, file);
                    } catch (error) {
                        callback(error, null, file);
                    }
                }
            });

            watchers.push(watcher);
        }

        return {
            stop: () => watchers.forEach(w => w.close())
        };
    }

    /**
     * ========================================================================
     * Comparar dos versiones del workflow
     * ========================================================================
     */
    compareWorkflows(oldWorkflow, newWorkflow) {
        const changes = {
            added: [],
            removed: [],
            modified: [],
            unchanged: []
        };

        const oldStageIds = new Set(oldWorkflow.stages.map(s => s.id));
        const newStageIds = new Set(newWorkflow.stages.map(s => s.id));

        // Stages agregados
        for (const stage of newWorkflow.stages) {
            if (!oldStageIds.has(stage.id)) {
                changes.added.push(stage);
            }
        }

        // Stages eliminados
        for (const stage of oldWorkflow.stages) {
            if (!newStageIds.has(stage.id)) {
                changes.removed.push(stage);
            }
        }

        // Stages modificados
        for (const newStage of newWorkflow.stages) {
            const oldStage = oldWorkflow.stages.find(s => s.id === newStage.id);
            if (oldStage) {
                if (JSON.stringify(oldStage.validations) !== JSON.stringify(newStage.validations) ||
                    JSON.stringify(oldStage.callsServices) !== JSON.stringify(newStage.callsServices)) {
                    changes.modified.push({
                        stage: newStage.id,
                        old: oldStage,
                        new: newStage
                    });
                } else {
                    changes.unchanged.push(newStage.id);
                }
            }
        }

        return {
            hasChanges: changes.added.length > 0 || changes.removed.length > 0 || changes.modified.length > 0,
            summary: {
                added: changes.added.length,
                removed: changes.removed.length,
                modified: changes.modified.length,
                unchanged: changes.unchanged.length
            },
            details: changes
        };
    }

    /**
     * ========================================================================
     * Generar documentación automática del workflow
     * ========================================================================
     */
    generateDocumentation(workflow) {
        let doc = `# ${workflow.name}\n\n`;
        doc += `> Auto-generado el ${workflow.generatedAt}\n\n`;
        doc += `## Stages Detectados (${workflow.stageCount})\n\n`;

        for (const stage of workflow.stages) {
            doc += `### ${stage.name}\n\n`;
            doc += `- **ID**: \`${stage.id}\`\n`;
            doc += `- **Fuente**: \`${stage.source.function}()\` en línea ${stage.source.line}\n`;

            if (stage.validations.length > 0) {
                doc += `- **Validaciones**:\n`;
                stage.validations.forEach(v => {
                    doc += `  - ${v}\n`;
                });
            }

            if (stage.callsServices.length > 0) {
                doc += `- **Servicios llamados**: ${stage.callsServices.join(', ')}\n`;
            }

            doc += '\n';
        }

        doc += `## Dependencias\n\n`;
        for (const dep of workflow.dependencies.external) {
            doc += `- ${dep.name}${dep.isCore ? ' (core)' : ''}\n`;
        }

        return doc;
    }

    /**
     * ========================================================================
     * HELPERS
     * ========================================================================
     */

    hashCode(str) {
        return crypto.createHash('md5').update(str).digest('hex');
    }

    getLineNumber(code, position) {
        return code.substring(0, position).split('\n').length;
    }

    extractFunctionBody(code, startPos) {
        let braceCount = 0;
        let started = false;
        let endPos = startPos;

        for (let i = startPos; i < code.length; i++) {
            if (code[i] === '{') {
                braceCount++;
                started = true;
            } else if (code[i] === '}') {
                braceCount--;
            }

            if (started && braceCount === 0) {
                endPos = i + 1;
                break;
            }
        }

        return code.substring(startPos, endPos);
    }

    extractServiceCalls(funcBody) {
        const calls = [];
        const regex = /await\s+(?:this\.)?(\w+(?:Service)?)\s*\.\s*(\w+)/g;
        let match;

        while ((match = regex.exec(funcBody)) !== null) {
            calls.push(`${match[1]}.${match[2]}`);
        }

        return [...new Set(calls)];
    }

    hasValidations(funcBody) {
        return /if\s*\([^)]+\)\s*\{?\s*(throw|return\s*\{[^}]*error)/.test(funcBody);
    }

    extractTransitions(funcBody) {
        const transitions = [];
        const regex = /(?:status|state|stage|reason(?:Code)?)\s*[=:]\s*['"](\w+)['"]/g;
        let match;

        while ((match = regex.exec(funcBody)) !== null) {
            transitions.push(match[1]);
        }

        return [...new Set(transitions)];
    }

    extractValidationRules(funcBody) {
        const rules = [];
        const regex = /if\s*\(!?\s*([^)]+)\)\s*\{?\s*(?:throw|return)/g;
        let match;

        while ((match = regex.exec(funcBody)) !== null) {
            rules.push(match[1].trim());
        }

        return rules;
    }

    toStageId(funcName) {
        return funcName
            .replace(/([A-Z])/g, '_$1')
            .toUpperCase()
            .replace(/^_/, '');
    }

    toStageName(funcName) {
        return funcName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    inferStageType(stage) {
        const name = stage.name.toLowerCase();

        if (name.includes('valid') || name.includes('check')) return 'validation';
        if (name.includes('auth')) return 'authorization';
        if (name.includes('notify') || name.includes('send')) return 'notification';
        if (name.includes('save') || name.includes('create') || name.includes('register')) return 'persistence';
        if (name.includes('reject') || name.includes('error')) return 'rejection';
        if (name.includes('success') || name.includes('complete')) return 'success';

        return 'process';
    }
}

module.exports = DynamicWorkflowIntrospector;
