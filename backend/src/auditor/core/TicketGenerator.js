/**
 * ============================================================================
 * TICKET GENERATOR - Context Assembly para Auto-Reparación
 * ============================================================================
 *
 * Genera tickets completos con todo el contexto necesario para que Claude Code
 * pueda reparar el código automáticamente.
 *
 * RESPONSABILIDADES:
 * - Ensamblar contexto completo (archivos, logs, estructura)
 * - Generar instrucciones claras para Claude Code
 * - Calcular prioridad del ticket
 * - Incluir diagnosis de Ollama
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');

class TicketGenerator {
    constructor() {
        this.ticketCounter = 0;
    }

    /**
     * Generar ticket con contexto completo para Claude Code
     */
    async generateTicket(testData, diagnosis) {
        return await this.generate(testData, diagnosis);
    }

    /**
     * Generar ticket con contexto completo para Claude Code (método original)
     */
    async generate(failedTest, diagnosis) {
        this.ticketCounter++;

        const ticket = {
            id: `REPAIR-${Date.now()}-${this.ticketCounter}`,
            created_at: new Date().toISOString(),
            priority: this.calculatePriority(failedTest),

            // Test info
            test: {
                module: failedTest.module_name,
                test_name: failedTest.test_name,
                status: failedTest.status,
                error_message: failedTest.error_message,
                error_stack: failedTest.error_stack
            },

            // Diagnosis from Ollama (puede ser null si Ollama falló)
            diagnosis: diagnosis ? {
                root_cause: diagnosis.root_cause || 'No disponible',
                suggested_fix: diagnosis.suggested_fix || 'No disponible',
                files_to_modify: diagnosis.files_to_modify || [],
                fix_code_example: diagnosis.fix_code_example || ''
            } : {
                root_cause: 'Ollama no disponible o timeout',
                suggested_fix: 'Verificar logs del servidor y estado de Ollama',
                files_to_modify: [],
                fix_code_example: ''
            },

            // Context assembly
            context: await this.assembleContext(failedTest, diagnosis),

            // Instructions for Claude Code
            instructions: this.generateInstructions(failedTest, diagnosis)
        };

        return ticket;
    }

    /**
     * Ensamblar contexto completo (archivos relevantes, logs, etc.)
     */
    async assembleContext(failedTest, diagnosis) {
        const context = {
            files_content: {},
            related_logs: [],
            module_structure: {}
        };

        // Leer contenido de archivos a modificar (con null-check)
        const filesToRead = (diagnosis && diagnosis.files_to_modify) ? diagnosis.files_to_modify : [];

        for (const file of filesToRead) {
            try {
                const fullPath = path.join(process.cwd(), file);
                const content = await fs.readFile(fullPath, 'utf-8');
                context.files_content[file] = content;
            } catch (error) {
                context.files_content[file] = `Error leyendo archivo: ${error.message}`;
            }
        }

        // Si no hay archivos específicos, agregar archivos del módulo por defecto
        if (filesToRead.length === 0) {
            const defaultFiles = this.getDefaultModuleFiles(failedTest.module_name);
            for (const file of defaultFiles) {
                try {
                    const fullPath = path.join(process.cwd(), file);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    context.files_content[file] = content.substring(0, 5000); // Limitar a 5000 chars
                } catch (error) {
                    // Archivo no existe, skip
                }
            }
        }

        // Agregar logs relacionados
        context.related_logs = [
            `Test fallido: ${failedTest.test_name}`,
            `Módulo: ${failedTest.module_name}`,
            `Error: ${failedTest.error_message}`,
            `Stack: ${failedTest.error_stack?.substring(0, 500) || 'N/A'}...`
        ];

        // Agregar estructura del módulo
        context.module_structure = {
            collector: `src/auditor/collectors/${this.capitalizeFirst(failedTest.module_name)}ModuleCollector.js`,
            frontend: `public/js/modules/${failedTest.module_name}.js`,
            routes: `src/routes/${failedTest.module_name}Routes.js`,
            html: `public/${failedTest.module_name}.html`
        };

        return context;
    }

    /**
     * Obtener archivos por defecto de un módulo
     */
    getDefaultModuleFiles(moduleName) {
        return [
            `src/auditor/collectors/${this.capitalizeFirst(moduleName)}ModuleCollector.js`,
            `public/js/modules/${moduleName}.js`
        ];
    }

    /**
     * Generar instrucciones claras para Claude Code
     */
    generateInstructions(failedTest, diagnosis) {
        // ✅ FIX: Validar que diagnosis no sea undefined/null
        const safeRootCause = (diagnosis && diagnosis.root_cause) || 'Ollama no disponible o timeout';
        const safeSuggestedFix = (diagnosis && diagnosis.suggested_fix) || 'Revisar logs y stack trace manualmente';
        const safeFilesToModify = (diagnosis && diagnosis.files_to_modify) || [];
        const safeFixExample = (diagnosis && diagnosis.fix_code_example) || '';

        const filesSection = safeFilesToModify.length > 0
            ? `### Archivos a modificar\n${safeFilesToModify.map(f => `- ${f}`).join('\n')}`
            : `### Archivos del módulo\n- Collector: src/auditor/collectors/${this.capitalizeFirst(failedTest.module_name)}ModuleCollector.js\n- Frontend: public/js/modules/${failedTest.module_name}.js`;

        const fixSection = safeFixExample
            ? `### Fix sugerido\n\`\`\`javascript\n${safeFixExample}\n\`\`\``
            : '';

        return `
## 🔧 AUTO-REPAIR TICKET: ${failedTest.test_name}

### 📛 Problema
Test **${failedTest.test_name}** en módulo **${failedTest.module_name}** está fallando.

**Error**: ${failedTest.error_message}

**Stack trace**:
\`\`\`
${failedTest.error_stack?.substring(0, 500) || 'N/A'}
\`\`\`

### 🧠 Diagnosis (Ollama AI)
**Causa raíz**: ${safeRootCause}

**Solución sugerida**: ${safeSuggestedFix}

${filesSection}

${fixSection}

### 📝 Instrucciones
1. Revisar el error y stack trace completo arriba
2. Leer los archivos indicados (contexto incluido en ticket.context.files_content)
3. Aplicar el fix sugerido (o mejorar si es necesario)
4. Validar que no rompa otros tests
5. Confirmar cuando el fix esté aplicado

### ⚠️ IMPORTANTE
Este ticket es parte de un ciclo de auto-reparación. El test se re-ejecutará automáticamente después de aplicar el fix para validar la reparación.

**Prioridad**: ${this.calculatePriority(failedTest).toUpperCase()}
**Ticket ID**: ${this.ticketCounter}
**Timestamp**: ${new Date().toISOString()}
`;
    }

    /**
     * Calcular prioridad del ticket
     */
    calculatePriority(failedTest) {
        // Módulos críticos tienen prioridad alta
        const criticalModules = ['users', 'attendance', 'auth', 'departments', 'shifts'];

        if (failedTest && failedTest.module_name && criticalModules.includes(failedTest.module_name)) {
            return 'high';
        }

        // Tests de CRUD tienen prioridad media-alta
        if (failedTest && failedTest.test_name && failedTest.test_name.includes('crud')) {
            return 'medium-high';
        }

        return 'medium';
    }

    /**
     * Capitalizar primera letra
     */
    capitalizeFirst(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = TicketGenerator;
