/**
 * CONTEXTUAL HELP SERVICE v2.0
 * Sistema de ayuda contextual con integración Ollama
 *
 * Features v2.0:
 * - Detección automática de módulo activo desde frontend
 * - Burbujas emergentes de ayuda
 * - Tooltips contextuales
 * - Asistente IA en tiempo real con Ollama
 * - Verificación de dependencias antes de CRUD
 * - Guías paso a paso (walkthroughs)
 * - Sugerencias proactivas basadas en contexto
 *
 * Integración:
 * - Frontend: contextual-help-system.js
 * - Panel: panel-empresa.html -> showTab() -> setCurrentModule()
 *
 * @version 2.0
 * @date 2025-12-06
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const axios = require('axios');

// Configuración Ollama
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 30000;

class ContextualHelpService {

    // =====================================================
    // AYUDA ESTÁTICA (desde BD)
    // =====================================================

    /**
     * Obtener ayuda para un módulo completo
     *
     * @param {string} moduleKey - Clave del módulo
     */
    static async getModuleHelp(moduleKey) {
        try {
            const [module] = await sequelize.query(`
                SELECT
                    module_key, module_name, description, category,
                    help_title, help_description, help_getting_started,
                    help_common_tasks, prerequisite_data,
                    available_actions, available_scopes
                FROM module_definitions
                WHERE module_key = $1
            `, {
                bind: [moduleKey],
                type: QueryTypes.SELECT
            });

            if (!module) {
                return null;
            }

            // Obtener todos los tooltips del módulo
            const tooltips = await sequelize.query(`
                SELECT *
                FROM contextual_help
                WHERE module_key = $1 AND is_active = true
                ORDER BY screen_key, priority DESC
            `, {
                bind: [moduleKey],
                type: QueryTypes.SELECT
            });

            return {
                ...module,
                tooltips,
                hasWalkthrough: tooltips.some(t => t.help_type === 'walkthrough')
            };

        } catch (error) {
            console.error('[HELP] Error getting module help:', error);
            return null;
        }
    }

    /**
     * Obtener tooltip específico para un elemento
     *
     * @param {string} moduleKey - Clave del módulo
     * @param {string} screenKey - Clave de pantalla
     * @param {string} elementKey - Clave del elemento
     */
    static async getElementTooltip(moduleKey, screenKey, elementKey) {
        try {
            const [tooltip] = await sequelize.query(`
                SELECT *
                FROM contextual_help
                WHERE module_key = $1
                  AND screen_key = $2
                  AND element_key = $3
                  AND is_active = true
            `, {
                bind: [moduleKey, screenKey, elementKey],
                type: QueryTypes.SELECT
            });

            if (tooltip) {
                // Incrementar contador de vistas
                await sequelize.query(`
                    UPDATE contextual_help
                    SET view_count = view_count + 1
                    WHERE id = $1
                `, { bind: [tooltip.id] });
            }

            return tooltip;

        } catch (error) {
            console.error('[HELP] Error getting tooltip:', error);
            return null;
        }
    }

    /**
     * Obtener walkthrough (tutorial paso a paso)
     *
     * @param {string} moduleKey - Clave del módulo
     * @param {string} screenKey - Clave de pantalla
     */
    static async getWalkthrough(moduleKey, screenKey = 'main') {
        try {
            const steps = await sequelize.query(`
                SELECT *
                FROM contextual_help
                WHERE module_key = $1
                  AND (screen_key = $2 OR screen_key IS NULL)
                  AND help_type = 'walkthrough'
                  AND is_active = true
                ORDER BY step_order
            `, {
                bind: [moduleKey, screenKey],
                type: QueryTypes.SELECT
            });

            return steps;

        } catch (error) {
            console.error('[HELP] Error getting walkthrough:', error);
            return [];
        }
    }

    /**
     * Registrar feedback de ayuda (útil/no útil)
     *
     * @param {number} helpId - ID del registro de ayuda
     * @param {boolean} wasHelpful - Si fue útil o no
     */
    static async recordHelpFeedback(helpId, wasHelpful) {
        try {
            const field = wasHelpful ? 'helpful_count' : 'not_helpful_count';

            await sequelize.query(`
                UPDATE contextual_help
                SET ${field} = ${field} + 1
                WHERE id = $1
            `, { bind: [helpId] });

            return { success: true };

        } catch (error) {
            console.error('[HELP] Error recording feedback:', error);
            return { success: false };
        }
    }

    // =====================================================
    // VERIFICACIÓN DE DEPENDENCIAS
    // =====================================================

    /**
     * Verificar si el módulo está listo para usar
     *
     * @param {string} moduleKey - Clave del módulo
     * @param {number} companyId - ID de la empresa
     */
    static async checkModuleReadiness(moduleKey, companyId) {
        try {
            // Obtener definición del módulo
            const [module] = await sequelize.query(`
                SELECT prerequisite_data, help_getting_started
                FROM module_definitions
                WHERE module_key = $1
            `, {
                bind: [moduleKey],
                type: QueryTypes.SELECT
            });

            if (!module) {
                return { isReady: true, issues: [], warnings: [] };
            }

            const prereqs = module.prerequisite_data || {};
            const issues = [];
            const warnings = [];

            // Verificar tablas requeridas
            if (prereqs.required_tables && prereqs.min_records) {
                for (const tableName of prereqs.required_tables) {
                    const minRecords = prereqs.min_records[tableName] || 1;

                    try {
                        // Query dinámica para contar registros
                        const [result] = await sequelize.query(`
                            SELECT COUNT(*) as count FROM "${tableName}"
                            WHERE company_id = $1
                        `, {
                            bind: [companyId],
                            type: QueryTypes.SELECT
                        });

                        const actualCount = parseInt(result?.count || 0);

                        if (actualCount < minRecords) {
                            issues.push({
                                type: 'missing_data',
                                table: tableName,
                                required: minRecords,
                                actual: actualCount,
                                message: this._getTableMessage(tableName, minRecords, actualCount),
                                action: this._getTableAction(tableName)
                            });
                        }
                    } catch (e) {
                        // Tabla puede no existir o no tener company_id
                        console.warn(`[HELP] Cannot check table ${tableName}:`, e.message);
                    }
                }
            }

            // Verificar si requiere asociado
            if (prereqs.associate_category) {
                const [contract] = await sequelize.query(`
                    SELECT cac.id
                    FROM company_associate_contracts cac
                    JOIN aponnt_associates aa ON aa.id = cac.associate_id
                    WHERE cac.company_id = $1
                      AND cac.status = 'active'
                      AND aa.category = $2
                    LIMIT 1
                `, {
                    bind: [companyId, prereqs.associate_category],
                    type: QueryTypes.SELECT
                });

                if (!contract) {
                    warnings.push({
                        type: 'associate_recommended',
                        category: prereqs.associate_category,
                        message: this._getAssociateMessage(prereqs.associate_category),
                        action: {
                            text: 'Contratar profesional',
                            module: 'associate-marketplace',
                            filter: prereqs.associate_category
                        }
                    });
                }
            }

            return {
                isReady: issues.length === 0,
                issues,
                warnings,
                gettingStarted: module.help_getting_started
            };

        } catch (error) {
            console.error('[HELP] Error checking module readiness:', error);
            return { isReady: true, issues: [], warnings: [] };
        }
    }

    /**
     * Obtener mensaje amigable para tabla faltante
     * @private
     */
    static _getTableMessage(tableName, required, actual) {
        const messages = {
            'departments': `Necesitas crear al menos ${required} departamento(s) antes de continuar. Actualmente tienes ${actual}.`,
            'branches': `Necesitas configurar al menos ${required} sucursal(es). Actualmente tienes ${actual}.`,
            'shifts': `Necesitas definir al menos ${required} turno(s) de trabajo. Actualmente tienes ${actual}.`,
            'users': `Necesitas tener al menos ${required} empleado(s) registrado(s). Actualmente tienes ${actual}.`,
            'salary_categories_v2': `Configura al menos ${required} categoría(s) salarial(es) antes de continuar.`,
            'vacation_configurations': `Configura las reglas de vacaciones antes de gestionar solicitudes.`
        };
        return messages[tableName] || `Faltan registros en ${tableName} (requeridos: ${required}, actuales: ${actual})`;
    }

    /**
     * Obtener acción para completar dependencia
     * @private
     */
    static _getTableAction(tableName) {
        const actions = {
            'departments': { text: 'Crear Departamento', module: 'organizational', tab: 'departments' },
            'branches': { text: 'Configurar Sucursales', module: 'organizational', tab: 'branches' },
            'shifts': { text: 'Definir Turnos', module: 'organizational', tab: 'shifts' },
            'users': { text: 'Agregar Empleado', module: 'users', action: 'create' },
            'salary_categories_v2': { text: 'Configurar Categorías', module: 'organizational', tab: 'salary-categories' },
            'vacation_configurations': { text: 'Configurar Vacaciones', module: 'vacation-management', tab: 'config' }
        };
        return actions[tableName] || { text: 'Completar configuración', module: 'organizational' };
    }

    /**
     * Obtener mensaje para asociado faltante
     * @private
     */
    static _getAssociateMessage(category) {
        const messages = {
            'medical': 'Para funcionalidad completa de salud ocupacional, contrata un médico laboral verificado.',
            'legal': 'Para gestionar casos legales y sanciones con revisión legal, contrata un abogado.',
            'safety': 'Para análisis de riesgos profesional, contrata un asesor de seguridad industrial.'
        };
        return messages[category] || `Considera contratar un profesional de tipo "${category}".`;
    }

    // =====================================================
    // ASISTENTE IA CON OLLAMA
    // =====================================================

    /**
     * Obtener respuesta del asistente IA
     *
     * @param {string} question - Pregunta del usuario
     * @param {Object} context - Contexto actual
     */
    static async getAIAssistance(question, context = {}) {
        try {
            const { moduleKey, screenKey, companyId, userId, role } = context;

            // Construir contexto para el prompt
            let contextInfo = '';

            // Obtener info del módulo actual
            if (moduleKey) {
                const moduleHelp = await this.getModuleHelp(moduleKey);
                if (moduleHelp) {
                    contextInfo += `
MÓDULO ACTUAL: ${moduleHelp.module_name}
DESCRIPCIÓN: ${moduleHelp.description}
CÓMO EMPEZAR: ${moduleHelp.help_getting_started || 'N/A'}
`;
                }

                // Verificar dependencias
                if (companyId) {
                    const readiness = await this.checkModuleReadiness(moduleKey, companyId);
                    if (!readiness.isReady) {
                        contextInfo += `
PROBLEMAS DETECTADOS:
${readiness.issues.map(i => `- ${i.message}`).join('\n')}
`;
                    }
                }
            }

            // Prompt del sistema
            const systemPrompt = `Eres el asistente de ayuda del Sistema de Asistencia Biométrico APONNT.
Tu rol es ayudar a los usuarios a entender y usar el sistema de manera efectiva.

REGLAS:
1. Responde en español, de forma clara y concisa
2. Si detectas un problema, sugiere la solución paso a paso
3. Usa emojis moderadamente para hacer las respuestas más amigables
4. Si no sabes algo, dilo honestamente
5. Prioriza la seguridad y buenas prácticas

${contextInfo ? 'CONTEXTO ACTUAL:\n' + contextInfo : ''}

ROL DEL USUARIO: ${role || 'desconocido'}
`;

            // Llamar a Ollama
            const response = await axios.post(
                `${OLLAMA_BASE_URL}/api/generate`,
                {
                    model: OLLAMA_MODEL,
                    prompt: question,
                    system: systemPrompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 500
                    }
                },
                { timeout: OLLAMA_TIMEOUT }
            );

            if (response.data && response.data.response) {
                return {
                    success: true,
                    answer: response.data.response.trim(),
                    model: OLLAMA_MODEL,
                    context: {
                        moduleKey,
                        hadIssues: context.issues?.length > 0
                    }
                };
            }

            return {
                success: false,
                error: 'No se recibió respuesta del modelo'
            };

        } catch (error) {
            console.error('[HELP] Error getting AI assistance:', error.message);

            // Fallback a respuesta estática si Ollama no está disponible
            return await this.getFallbackResponse(question, context);
        }
    }

    /**
     * Respuesta fallback cuando Ollama no está disponible
     *
     * @param {string} question - Pregunta del usuario
     * @param {Object} context - Contexto
     */
    static async getFallbackResponse(question, context = {}) {
        const { moduleKey } = context;
        const questionLower = question.toLowerCase();

        // Respuestas predefinidas para preguntas comunes
        const commonQuestions = [
            {
                patterns: ['cómo agreg', 'cómo añad', 'cómo creo', 'nuevo empleado', 'agregar usuario'],
                answer: '📝 Para agregar un nuevo empleado:\n\n1. Ve al módulo **Usuarios**\n2. Haz clic en el botón **+ Nuevo Usuario**\n3. Completa los datos requeridos\n4. Haz clic en **Guardar**\n\n💡 Asegúrate de tener configurados primero: Departamentos, Turnos y Sucursales.'
            },
            {
                patterns: ['permiso', 'acceso', 'no puedo ver', 'no tengo acceso'],
                answer: '🔐 Los permisos se gestionan desde **Roles y Permisos**:\n\n1. Ve a Estructura Organizacional > Roles y Permisos\n2. Busca el rol del usuario\n3. Activa/desactiva permisos por módulo\n\n💡 Solo los administradores pueden modificar permisos.'
            },
            {
                patterns: ['vacacion', 'días libre', 'solicitar vacaciones'],
                answer: '🏖️ Para solicitar vacaciones:\n\n1. Ve al módulo **Vacaciones**\n2. Haz clic en **Nueva Solicitud**\n3. Selecciona las fechas\n4. Envía la solicitud\n\nTu supervisor recibirá una notificación para aprobar.'
            },
            {
                patterns: ['médico', 'examen', 'salud ocupacional'],
                answer: '🏥 El módulo de Salud Ocupacional requiere un **médico asociado**:\n\n1. Ve a **Servicios Profesionales**\n2. Busca médicos laborales\n3. Contrata uno (permanente o eventual)\n4. El médico tendrá acceso al Dashboard Médico'
            },
            {
                patterns: ['error', 'no funciona', 'problema', 'falla'],
                answer: '🔧 Si algo no funciona:\n\n1. **Recarga la página** (F5)\n2. **Verifica tu conexión** a internet\n3. **Revisa los permisos** de tu usuario\n4. Si persiste, **contacta al administrador**\n\n💡 Los errores se registran automáticamente para diagnóstico.'
            }
        ];

        // Buscar coincidencia
        for (const q of commonQuestions) {
            if (q.patterns.some(p => questionLower.includes(p))) {
                return {
                    success: true,
                    answer: q.answer,
                    source: 'fallback',
                    ollamaAvailable: false
                };
            }
        }

        // Respuesta genérica
        let genericAnswer = '🤔 No encontré una respuesta específica para tu pregunta.';

        if (moduleKey) {
            const moduleHelp = await this.getModuleHelp(moduleKey);
            if (moduleHelp) {
                genericAnswer += `\n\n📖 **${moduleHelp.help_title || moduleHelp.module_name}**\n${moduleHelp.help_description || moduleHelp.description}`;

                if (moduleHelp.help_getting_started) {
                    genericAnswer += `\n\n🚀 **Cómo empezar:**\n${moduleHelp.help_getting_started}`;
                }
            }
        }

        genericAnswer += '\n\n💡 **Tip:** Intenta reformular tu pregunta o contacta al administrador si necesitas ayuda específica.';

        return {
            success: true,
            answer: genericAnswer,
            source: 'fallback',
            ollamaAvailable: false
        };
    }

    /**
     * Verificar si Ollama está disponible
     */
    static async checkOllamaStatus() {
        try {
            const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
                timeout: 5000
            });

            const models = response.data?.models || [];
            const hasModel = models.some(m => m.name.includes(OLLAMA_MODEL.split(':')[0]));

            return {
                available: true,
                models: models.map(m => m.name),
                hasRequiredModel: hasModel,
                requiredModel: OLLAMA_MODEL
            };

        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }

    // =====================================================
    // SUGERENCIAS PROACTIVAS
    // =====================================================

    /**
     * Obtener sugerencias basadas en el contexto actual
     *
     * @param {string} moduleKey - Módulo actual
     * @param {number} companyId - ID de la empresa
     * @param {string} userRole - Rol del usuario
     */
    static async getProactiveSuggestions(moduleKey, companyId, userRole) {
        try {
            const suggestions = [];

            // Verificar dependencias del módulo
            const readiness = await this.checkModuleReadiness(moduleKey, companyId);

            // Agregar sugerencias por dependencias faltantes
            for (const issue of readiness.issues) {
                suggestions.push({
                    type: 'action_required',
                    priority: 'high',
                    icon: '⚠️',
                    title: 'Acción requerida',
                    message: issue.message,
                    action: issue.action
                });
            }

            // Agregar advertencias
            for (const warning of readiness.warnings) {
                suggestions.push({
                    type: 'recommendation',
                    priority: 'medium',
                    icon: '💡',
                    title: 'Recomendación',
                    message: warning.message,
                    action: warning.action
                });
            }

            // Sugerencias específicas por módulo
            const moduleSuggestions = await this._getModuleSpecificSuggestions(moduleKey, companyId, userRole);
            suggestions.push(...moduleSuggestions);

            return suggestions;

        } catch (error) {
            console.error('[HELP] Error getting proactive suggestions:', error);
            return [];
        }
    }

    /**
     * Sugerencias específicas por módulo
     * @private
     */
    static async _getModuleSpecificSuggestions(moduleKey, companyId, userRole) {
        const suggestions = [];

        switch (moduleKey) {
            case 'users':
                // Verificar si hay usuarios sin departamento
                const [orphanUsers] = await sequelize.query(`
                    SELECT COUNT(*) as count FROM users
                    WHERE company_id = $1 AND is_active = true AND department_id IS NULL
                `, { bind: [companyId], type: QueryTypes.SELECT });

                if (parseInt(orphanUsers?.count || 0) > 0) {
                    suggestions.push({
                        type: 'info',
                        priority: 'low',
                        icon: 'ℹ️',
                        title: 'Empleados sin departamento',
                        message: `Hay ${orphanUsers.count} empleado(s) sin departamento asignado.`,
                        action: { text: 'Ver empleados', filter: 'no_department' }
                    });
                }
                break;

            case 'attendance':
                // Verificar ausentes hoy
                const [absents] = await sequelize.query(`
                    SELECT COUNT(DISTINCT u.user_id) as count
                    FROM users u
                    LEFT JOIN attendances a ON a.user_id = u.user_id
                        AND DATE(a."clockIn") = CURRENT_DATE
                    WHERE u.company_id = $1 AND u.is_active = true AND a.id IS NULL
                `, { bind: [companyId], type: QueryTypes.SELECT });

                if (parseInt(absents?.count || 0) > 3) {
                    suggestions.push({
                        type: 'info',
                        priority: 'medium',
                        icon: '📊',
                        title: 'Ausencias hoy',
                        message: `${absents.count} empleado(s) no han fichado hoy.`,
                        action: { text: 'Ver ausentes', tab: 'absences' }
                    });
                }
                break;

            case 'roles-permissions':
                if (userRole !== 'admin') {
                    suggestions.push({
                        type: 'info',
                        priority: 'medium',
                        icon: '🔒',
                        title: 'Permisos limitados',
                        message: 'Solo los administradores pueden crear o modificar roles.',
                        action: null
                    });
                }
                break;
        }

        return suggestions;
    }
}

module.exports = ContextualHelpService;
