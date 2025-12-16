/**
 * ============================================================================
 * WORKFLOW AUTO-GENERATOR
 * ============================================================================
 *
 * Genera y mantiene sincronizado el archivo AttendanceWorkflowService.js
 * basándose en el análisis del código REAL de los servicios relacionados.
 *
 * CUMPLE CON LAS REGLAS DE BRAIN:
 * - Brain busca `static STAGES = {...}` en archivos
 * - Este generador crea/actualiza ese archivo automáticamente
 * - Cuando cambia código real → se regenera → Brain detecta el cambio
 *
 * FLUJO:
 * 1. Analiza código de: LateArrivalAuthorizationService, CalendarioLaboralService, etc.
 * 2. Extrae funciones, validaciones, transiciones
 * 3. Genera `static STAGES = {...}` automáticamente
 * 4. Actualiza AttendanceWorkflowService.js si hay cambios
 * 5. Brain detecta el archivo actualizado con `source: 'LIVE_CODE_SCAN'`
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WorkflowAutoGenerator {
    constructor(options = {}) {
        // SIEMPRE usar la ruta absoluta del directorio services actual
        this.servicesDir = options.servicesDir || __dirname;
        this.baseDir = options.baseDir || path.dirname(this.servicesDir);
        this.outputFile = path.join(this.servicesDir, 'AttendanceWorkflowService.js');

        // Archivos fuente del workflow de fichaje
        this.sourceFiles = [
            'LateArrivalAuthorizationService.js',
            'CalendarioLaboralService.js',
            'ShiftCalculatorService.js',
            'OrganizationalHierarchyService.js'
        ];

        // Cache de hashes para detectar cambios
        this.fileHashes = new Map();

        // Mapeo de funciones a stages
        this.functionToStageMapping = {
            // LateArrivalAuthorizationService - FLUJO PRINCIPAL
            'processLateArrival': 'LATE_ARRIVAL_DETECTED',
            'findAuthorizersByHierarchy': 'FIND_AUTHORIZER',
            'checkSupervisorAvailability': 'CHECK_AVAILABILITY',
            'createAuthorizationRequest': 'CREATE_REQUEST',
            'notifyAuthorizers': 'NOTIFY_AUTHORIZERS',
            'processAuthorizationResponse': 'PROCESS_RESPONSE',
            'handleApproval': 'AUTHORIZED',
            'handleRejection': 'REJECTED',
            'handleExpiration': 'EXPIRED',

            // LateArrivalAuthorizationService - VERIFICACIÓN MISMO TURNO (2025-12-14)
            'checkSupervisorSameShift': 'VERIFY_SAME_SHIFT',
            '_findSupervisorWithSameShift': 'ESCALATE_SAME_SHIFT',

            // LateArrivalAuthorizationService - NOTIFICACIONES CENTRALES (2025-12-14)
            '_sendViaUnifiedNotificationSystem': 'SEND_UNIFIED_NOTIFICATION',
            '_notifyEmployeeRequestSent': 'NOTIFY_EMPLOYEE_WAITING',
            'sendAuthorizationRequest': 'SEND_AUTHORIZATION_REQUEST',
            'notifyAuthorizationResult': 'NOTIFY_AUTHORIZATION_RESULT',

            // CalendarioLaboralService
            'isWorkingDay': 'CHECK_WORKING_DAY',
            'checkHoliday': 'CHECK_HOLIDAY',
            'checkCompanyNonWorkingDay': 'CHECK_COMPANY_DAY',

            // ShiftCalculatorService
            'calculateUserShiftForDate': 'CALCULATE_SHIFT',
            'calculateRotativeShift': 'CALCULATE_ROTATION',

            // OrganizationalHierarchyService
            'getImmediateSupervisor': 'GET_SUPERVISOR',
            'getEscalationChain': 'GET_ESCALATION_CHAIN'
        };
    }

    /**
     * ========================================================================
     * MÉTODO PRINCIPAL: Regenerar workflow si hay cambios
     * ========================================================================
     */
    async regenerateIfChanged() {
        console.log('🔄 [WORKFLOW-GEN] Verificando cambios en código fuente...');

        let hasChanges = false;
        const analysisResults = [];

        // Analizar cada archivo fuente
        for (const sourceFile of this.sourceFiles) {
            const filePath = path.join(this.servicesDir, sourceFile);

            if (!fs.existsSync(filePath)) {
                console.log(`   ⚠️ ${sourceFile} no existe, saltando...`);
                continue;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const currentHash = this.hashContent(content);
            const previousHash = this.fileHashes.get(sourceFile);

            if (currentHash !== previousHash) {
                console.log(`   📝 Cambio detectado en: ${sourceFile}`);
                hasChanges = true;
                this.fileHashes.set(sourceFile, currentHash);
            }

            // Analizar el archivo
            const analysis = this.analyzeSourceFile(content, sourceFile);
            analysisResults.push(analysis);
        }

        if (!hasChanges && fs.existsSync(this.outputFile)) {
            console.log('   ✅ Sin cambios, workflow actualizado');
            return { regenerated: false, reason: 'No changes detected' };
        }

        // Generar nuevo workflow
        console.log('🔧 [WORKFLOW-GEN] Regenerando AttendanceWorkflowService.js...');
        const workflow = this.generateWorkflow(analysisResults);
        const fileContent = this.generateFileContent(workflow);

        // Escribir archivo
        fs.writeFileSync(this.outputFile, fileContent);
        console.log(`   ✅ Archivo regenerado: ${this.outputFile}`);

        return {
            regenerated: true,
            stagesCount: workflow.stages.length,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * ========================================================================
     * Analizar archivo fuente
     * ========================================================================
     */
    analyzeSourceFile(content, fileName) {
        const analysis = {
            file: fileName,
            service: fileName.replace('.js', ''),
            functions: [],
            validations: [],
            serviceCalls: [],
            transitions: []
        };

        // Extraer funciones async
        const asyncFuncRegex = /async\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
        let match;

        while ((match = asyncFuncRegex.exec(content)) !== null) {
            const funcName = match[1];
            const params = match[2];
            const startPos = match.index;

            // Extraer cuerpo de la función
            const funcBody = this.extractFunctionBody(content, startPos);

            // Analizar contenido
            const funcAnalysis = {
                name: funcName,
                params: params.split(',').map(p => p.trim()).filter(p => p),
                line: this.getLineNumber(content, startPos),
                validations: this.extractValidations(funcBody),
                serviceCalls: this.extractServiceCalls(funcBody),
                transitions: this.extractTransitions(funcBody),
                errorHandling: this.hasErrorHandling(funcBody)
            };

            analysis.functions.push(funcAnalysis);
        }

        return analysis;
    }

    /**
     * ========================================================================
     * Generar workflow desde análisis
     * ========================================================================
     */
    generateWorkflow(analysisResults) {
        const stages = [];
        const processedFunctions = new Set();

        // Stages predefinidos del flujo principal
        const coreStages = [
            {
                id: 'BIOMETRIC_CAPTURE',
                name: 'Captura Biométrica',
                order: 1,
                category: 'identification',
                description: 'Captura de rostro en kiosko',
                transitions_to: ['IDENTIFICATION', 'REJECTED_QUALITY'],
                isCore: true
            },
            {
                id: 'IDENTIFICATION',
                name: 'Identificación',
                order: 2,
                category: 'identification',
                description: 'Match biométrico contra BD',
                transitions_to: ['USER_VALIDATION', 'REJECTED_NO_MATCH'],
                isCore: true
            },
            {
                id: 'USER_VALIDATION',
                name: 'Validación de Usuario',
                order: 3,
                category: 'validation',
                description: 'Verificar estado del usuario',
                transitions_to: ['SCHEDULE_VALIDATION', 'REJECTED_SUSPENDED'],
                isCore: true
            }
        ];

        stages.push(...coreStages);

        // Agregar stages derivados del código
        for (const analysis of analysisResults) {
            for (const func of analysis.functions) {
                // Verificar si esta función mapea a un stage
                const mappedStage = this.functionToStageMapping[func.name];

                if (mappedStage && !processedFunctions.has(func.name)) {
                    processedFunctions.add(func.name);

                    const stage = {
                        id: mappedStage,
                        name: this.formatStageName(mappedStage),
                        order: stages.length + 1,
                        category: this.inferCategory(func.name),
                        description: `Auto-detectado desde ${analysis.service}.${func.name}()`,
                        source: {
                            file: analysis.file,
                            function: func.name,
                            line: func.line
                        },
                        validations: func.validations,
                        transitions_to: this.inferTransitions(func),
                        serviceCalls: func.serviceCalls,
                        isAutoGenerated: true,
                        generatedAt: new Date().toISOString()
                    };

                    stages.push(stage);
                }
            }
        }

        // Agregar stages de rechazo estándar
        const rejectionStages = [
            { id: 'REJECTED_QUALITY', name: 'Rechazado - Calidad', category: 'rejection', is_final: true },
            { id: 'REJECTED_NO_MATCH', name: 'Rechazado - No Match', category: 'rejection', is_final: true },
            { id: 'REJECTED_SUSPENDED', name: 'Rechazado - Suspendido', category: 'rejection', is_final: true },
            { id: 'REJECTED_NO_SHIFT', name: 'Rechazado - Sin Turno', category: 'rejection', is_final: true },
            { id: 'REJECTED_LATE_NO_AUTH', name: 'Rechazado - Sin Autorización', category: 'rejection', is_final: true },
            { id: 'REGISTERED', name: 'Fichaje Registrado', category: 'success', is_final: true }
        ];

        for (const rejection of rejectionStages) {
            if (!stages.find(s => s.id === rejection.id)) {
                stages.push({
                    ...rejection,
                    order: 100 + rejectionStages.indexOf(rejection),
                    description: rejection.is_final ? 'Estado final' : '',
                    transitions_to: [],
                    is_rejection: rejection.category === 'rejection',
                    is_success: rejection.category === 'success'
                });
            }
        }

        // Ordenar por order
        stages.sort((a, b) => a.order - b.order);

        return {
            name: 'Workflow de Fichaje Biométrico',
            version: this.generateVersion(),
            generatedAt: new Date().toISOString(),
            isAutoGenerated: true,
            stages: stages,
            sourceFiles: this.sourceFiles
        };
    }

    /**
     * ========================================================================
     * Generar contenido del archivo
     * ========================================================================
     */
    generateFileContent(workflow) {
        const stagesCode = this.generateStagesCode(workflow.stages);

        return `/**
 * ============================================================================
 * ATTENDANCE WORKFLOW SERVICE
 * ============================================================================
 *
 * ⚠️ ARCHIVO AUTO-GENERADO - NO EDITAR MANUALMENTE
 *
 * Este archivo es regenerado automáticamente por WorkflowAutoGenerator.js
 * cuando cambia el código de los servicios relacionados.
 *
 * FUENTES:
 * ${workflow.sourceFiles.map(f => `* - ${f}`).join('\n * ')}
 *
 * Brain detecta este archivo via LIVE_CODE_SCAN y extrae los STAGES.
 * Cualquier cambio en los servicios fuente regenerará este archivo.
 *
 * Generado: ${workflow.generatedAt}
 * Versión: ${workflow.version}
 *
 * ============================================================================
 */

class AttendanceWorkflowService {
    /**
     * STAGES - Detectados automáticamente por Brain via LIVE_CODE_SCAN
     *
     * Fuente: Análisis de código de servicios relacionados
     * Total: ${workflow.stages.length} stages
     * Auto-generados: ${workflow.stages.filter(s => s.isAutoGenerated).length}
     */
    static STAGES = {
${stagesCode}
    };

    /**
     * WORKFLOW METADATA
     */
    static WORKFLOW_METADATA = {
        name: '${workflow.name}',
        version: '${workflow.version}',
        module: 'attendance',
        isAutoGenerated: true,
        generatedAt: '${workflow.generatedAt}',
        sourceFiles: ${JSON.stringify(workflow.sourceFiles)},
        entry_point: 'BIOMETRIC_CAPTURE',
        final_states: {
            success: ['REGISTERED'],
            rejection: ${JSON.stringify(workflow.stages.filter(s => s.is_rejection).map(s => s.id))}
        }
    };

    /**
     * Obtener stages en orden
     */
    static getStagesInOrder() {
        return Object.entries(this.STAGES)
            .map(([key, stage]) => ({ key, ...stage }))
            .sort((a, b) => (a.order || 999) - (b.order || 999));
    }

    /**
     * Obtener stages finales
     */
    static getFinalStages() {
        return Object.entries(this.STAGES)
            .filter(([_, stage]) => stage.is_final)
            .map(([key, stage]) => ({ key, ...stage }));
    }

    /**
     * Validar transición
     */
    static isValidTransition(fromStage, toStage) {
        const from = this.STAGES[fromStage];
        if (!from || !from.transitions_to) return false;
        return from.transitions_to.includes(toStage);
    }
}

module.exports = AttendanceWorkflowService;
`;
    }

    /**
     * ========================================================================
     * Generar código de STAGES
     * ========================================================================
     */
    generateStagesCode(stages) {
        const lines = [];

        for (const stage of stages) {
            lines.push(`        ${stage.id}: {`);
            lines.push(`            name: '${stage.name}',`);
            lines.push(`            order: ${stage.order},`);
            lines.push(`            category: '${stage.category || 'process'}',`);

            if (stage.description) {
                lines.push(`            description: '${stage.description.replace(/'/g, "\\'")}',`);
            }

            if (stage.source) {
                lines.push(`            source: {`);
                lines.push(`                file: '${stage.source.file}',`);
                lines.push(`                function: '${stage.source.function}',`);
                lines.push(`                line: ${stage.source.line}`);
                lines.push(`            },`);
            }

            if (stage.validations && stage.validations.length > 0) {
                lines.push(`            validations: ${JSON.stringify(stage.validations)},`);
            }

            lines.push(`            transitions_to: ${JSON.stringify(stage.transitions_to || [])},`);

            if (stage.is_final) lines.push(`            is_final: true,`);
            if (stage.is_rejection) lines.push(`            is_rejection: true,`);
            if (stage.is_success) lines.push(`            is_success: true,`);
            if (stage.isAutoGenerated) lines.push(`            isAutoGenerated: true,`);
            if (stage.isCore) lines.push(`            isCore: true,`);

            lines.push(`        },\n`);
        }

        return lines.join('\n');
    }

    /**
     * ========================================================================
     * HELPERS
     * ========================================================================
     */

    hashContent(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    generateVersion() {
        const now = new Date();
        return `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-auto`;
    }

    getLineNumber(content, position) {
        return content.substring(0, position).split('\n').length;
    }

    extractFunctionBody(content, startPos) {
        let braceCount = 0;
        let started = false;
        let endPos = startPos;

        for (let i = startPos; i < content.length && i < startPos + 5000; i++) {
            if (content[i] === '{') {
                braceCount++;
                started = true;
            } else if (content[i] === '}') {
                braceCount--;
            }

            if (started && braceCount === 0) {
                endPos = i + 1;
                break;
            }
        }

        return content.substring(startPos, endPos);
    }

    extractValidations(funcBody) {
        const validations = [];
        const regex = /if\s*\(!?\s*([^)]{1,100})\)\s*\{?\s*(?:throw|return)/g;
        let match;

        while ((match = regex.exec(funcBody)) !== null) {
            validations.push(match[1].trim().substring(0, 80));
        }

        return validations.slice(0, 5); // Máximo 5 validaciones
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

    extractTransitions(funcBody) {
        const transitions = [];
        const regex = /(?:status|state|reason(?:Code)?)\s*[=:]\s*['"](\w+)['"]/g;
        let match;

        while ((match = regex.exec(funcBody)) !== null) {
            transitions.push(match[1]);
        }

        return [...new Set(transitions)];
    }

    hasErrorHandling(funcBody) {
        return /try\s*\{/.test(funcBody) && /catch\s*\(/.test(funcBody);
    }

    inferTransitions(func) {
        const transitions = [];

        // Basado en las transiciones detectadas
        for (const t of func.transitions) {
            if (t.toUpperCase().includes('SUCCESS') || t.toUpperCase().includes('APPROVED')) {
                transitions.push('REGISTERED');
            } else if (t.toUpperCase().includes('REJECT') || t.toUpperCase().includes('ERROR')) {
                transitions.push('REJECTED_' + t.toUpperCase());
            }
        }

        return transitions;
    }

    inferCategory(funcName) {
        const name = funcName.toLowerCase();

        if (name.includes('valid') || name.includes('check')) return 'validation';
        if (name.includes('auth')) return 'authorization';
        if (name.includes('notify') || name.includes('send')) return 'notification';
        if (name.includes('find') || name.includes('get')) return 'lookup';
        if (name.includes('create') || name.includes('save')) return 'persistence';

        return 'process';
    }

    formatStageName(stageId) {
        return stageId
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    }
}

module.exports = WorkflowAutoGenerator;
