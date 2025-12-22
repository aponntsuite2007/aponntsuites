/**
 * ============================================================================
 * TUTORIAL GENERATOR
 * ============================================================================
 *
 * Generador automático de tutoriales y autoevaluaciones basado en el Brain.
 * Usa el conocimiento de módulos, capacidades y workflows para crear:
 * 1. Tutoriales paso a paso
 * 2. Quick start guides
 * 3. Autoevaluaciones con preguntas generadas
 * 4. Flujos de onboarding
 *
 * Created: 2025-12-17
 * Phase: 6 - Tutorial Generator
 */

class TutorialGenerator {
    constructor(brain) {
        this.brain = brain;
    }

    /**
     * Generar tutorial completo para un módulo
     * @param {string} moduleKey
     */
    generateModuleTutorial(moduleKey) {
        const node = this.brain.getNode(moduleKey);
        if (!node) {
            return { error: `Módulo '${moduleKey}' no encontrado` };
        }

        const tutorial = {
            id: `tutorial_${moduleKey}_${Date.now()}`,
            module: moduleKey,
            title: `Tutorial: ${node.name}`,
            description: node.description || `Aprende a usar ${node.name}`,
            difficulty: this._calculateDifficulty(node),
            estimatedTime: this._estimateTime(node),
            prerequisites: this._getPrerequisites(node),
            sections: [],
            assessment: null,
            generatedAt: new Date().toISOString()
        };

        // Sección 1: Introducción
        tutorial.sections.push({
            order: 1,
            title: '¿Qué es ' + node.name + '?',
            type: 'introduction',
            content: this._generateIntroduction(node)
        });

        // Sección 2: Primeros pasos
        tutorial.sections.push({
            order: 2,
            title: 'Primeros Pasos',
            type: 'quickstart',
            content: this._generateQuickStart(node)
        });

        // Sección 3: Funcionalidades principales (basado en provides)
        const features = this._generateFeaturesSections(node);
        features.forEach((section, idx) => {
            tutorial.sections.push({
                order: 3 + idx,
                ...section
            });
        });

        // Sección 4: Integraciones (basado en consumes/emits)
        if (node.consumes.length > 0 || node.emits.length > 0) {
            tutorial.sections.push({
                order: tutorial.sections.length + 1,
                title: 'Integraciones',
                type: 'integration',
                content: this._generateIntegrationsSection(node)
            });
        }

        // Generar autoevaluación
        tutorial.assessment = this.generateAssessment(moduleKey);

        return tutorial;
    }

    /**
     * Calcular dificultad del módulo
     */
    _calculateDifficulty(node) {
        let score = 0;
        score += node.provides.length * 2;
        score += node.consumes.length * 3;
        score += node.emits.length;

        if (score < 5) return 'beginner';
        if (score < 15) return 'intermediate';
        return 'advanced';
    }

    /**
     * Estimar tiempo de tutorial
     */
    _estimateTime(node) {
        const baseTime = 10; // 10 minutos base
        const perCapability = 3;
        const total = baseTime + (node.provides.length * perCapability);
        return `${total} minutos`;
    }

    /**
     * Obtener prerrequisitos
     */
    _getPrerequisites(node) {
        const prereqs = [];

        // Dependencias requeridas
        for (const consume of node.consumes) {
            if (consume.required) {
                const provider = this.brain.whoProvides(consume.capability)[0];
                if (provider && provider.key !== node.key) {
                    prereqs.push({
                        module: provider.key,
                        name: provider.name,
                        reason: `Necesario para ${consume.capability}`
                    });
                }
            }
        }

        return prereqs.slice(0, 5); // Máximo 5 prerrequisitos
    }

    /**
     * Generar introducción
     */
    _generateIntroduction(node) {
        return {
            overview: node.description || `${node.name} es un módulo del sistema.`,
            benefits: this._inferBenefits(node),
            useCases: this._inferUseCases(node)
        };
    }

    /**
     * Inferir beneficios del módulo
     */
    _inferBenefits(node) {
        const benefits = [];

        if (node.provides.some(p => p.capability.includes('report'))) {
            benefits.push('Genera reportes automáticamente');
        }
        if (node.provides.some(p => p.capability.includes('notification'))) {
            benefits.push('Envía notificaciones a usuarios');
        }
        if (node.provides.some(p => p.capability.includes('workflow'))) {
            benefits.push('Automatiza flujos de trabajo');
        }
        if (node.provides.some(p => p.capability.includes('data'))) {
            benefits.push('Gestiona información de forma centralizada');
        }

        return benefits.length > 0 ? benefits : ['Simplifica procesos del negocio'];
    }

    /**
     * Inferir casos de uso
     */
    _inferUseCases(node) {
        const useCases = [];
        const key = node.key.toLowerCase();

        if (key.includes('attendance')) {
            useCases.push('Control de entrada y salida de empleados');
            useCases.push('Registro de horas trabajadas');
        }
        if (key.includes('vacation')) {
            useCases.push('Solicitud de vacaciones');
            useCases.push('Aprobación de permisos');
        }
        if (key.includes('payroll')) {
            useCases.push('Liquidación de sueldos');
            useCases.push('Cálculo de haberes');
        }
        if (key.includes('invoice') || key.includes('factur')) {
            useCases.push('Emisión de facturas');
            useCases.push('Gestión de cobranzas');
        }

        return useCases.length > 0 ? useCases : [`Uso general de ${node.name}`];
    }

    /**
     * Generar quickstart
     */
    _generateQuickStart(node) {
        const steps = [];

        // Paso 1: Acceso
        steps.push({
            step: 1,
            title: 'Acceder al módulo',
            instructions: `Navega a la sección "${node.name}" desde el menú principal.`,
            tip: 'Asegúrate de tener los permisos necesarios.'
        });

        // Paso 2: Vista general
        steps.push({
            step: 2,
            title: 'Explorar la interfaz',
            instructions: 'Familiarízate con las opciones disponibles en el dashboard.',
            tip: 'Los botones principales están en la barra superior.'
        });

        // Paso 3: Primera acción
        if (node.provides.some(p => p.capability.includes('write'))) {
            steps.push({
                step: 3,
                title: 'Crear tu primer registro',
                instructions: 'Haz clic en "Nuevo" y completa los campos requeridos.',
                tip: 'Los campos con * son obligatorios.'
            });
        }

        return { steps };
    }

    /**
     * Generar secciones de funcionalidades
     */
    _generateFeaturesSections(node) {
        const sections = [];

        for (const provide of node.provides.slice(0, 5)) { // Max 5 features
            const capName = provide.capability.split(':')[1] || provide.capability;
            sections.push({
                title: this._capabilityToTitle(provide.capability),
                type: 'feature',
                content: {
                    capability: provide.capability,
                    description: this._describeCapability(provide.capability),
                    howTo: this._generateHowTo(provide.capability)
                }
            });
        }

        return sections;
    }

    /**
     * Convertir capability a título legible
     */
    _capabilityToTitle(capability) {
        const titles = {
            'data:read': 'Consultar información',
            'data:write': 'Crear y editar registros',
            'data:delete': 'Eliminar registros',
            'data:export': 'Exportar datos',
            'report:generate': 'Generar reportes',
            'workflow:approve': 'Aprobar solicitudes',
            'notification:send': 'Enviar notificaciones'
        };
        return titles[capability] || capability.replace(/[_:-]/g, ' ');
    }

    /**
     * Describir una capability
     */
    _describeCapability(capability) {
        const descriptions = {
            'data:read': 'Permite consultar y visualizar registros existentes.',
            'data:write': 'Permite crear nuevos registros y modificar los existentes.',
            'data:delete': 'Permite eliminar registros del sistema.',
            'data:export': 'Permite exportar datos a formatos como Excel o PDF.',
            'report:generate': 'Genera reportes con información consolidada.',
            'workflow:approve': 'Permite aprobar o rechazar solicitudes pendientes.',
            'notification:send': 'Envía notificaciones a los usuarios correspondientes.'
        };
        return descriptions[capability] || `Funcionalidad: ${capability}`;
    }

    /**
     * Generar instrucciones how-to
     */
    _generateHowTo(capability) {
        const howTos = {
            'data:read': ['Usa los filtros para encontrar registros específicos', 'Haz clic en un registro para ver detalles'],
            'data:write': ['Haz clic en "Nuevo" o "Editar"', 'Completa los campos del formulario', 'Haz clic en "Guardar"'],
            'data:delete': ['Selecciona el registro a eliminar', 'Haz clic en "Eliminar"', 'Confirma la acción'],
            'data:export': ['Aplica los filtros deseados', 'Haz clic en "Exportar"', 'Selecciona el formato'],
            'report:generate': ['Selecciona el tipo de reporte', 'Configura los parámetros', 'Haz clic en "Generar"']
        };
        return howTos[capability] || ['Accede a la funcionalidad desde el menú'];
    }

    /**
     * Generar sección de integraciones
     */
    _generateIntegrationsSection(node) {
        const integrations = [];

        for (const consume of node.consumes) {
            const providers = this.brain.whoProvides(consume.capability);
            if (providers.length > 0) {
                integrations.push({
                    capability: consume.capability,
                    type: 'receives_from',
                    modules: providers.slice(0, 3).map(p => ({ key: p.key, name: p.name })),
                    required: consume.required
                });
            }
        }

        for (const emit of node.emits) {
            const listeners = this.brain.whoListens(emit.event);
            if (listeners.length > 0) {
                integrations.push({
                    event: emit.event,
                    type: 'sends_to',
                    modules: listeners.slice(0, 3).map(l => ({ key: l.key, name: l.name }))
                });
            }
        }

        return { integrations };
    }

    /**
     * Generar autoevaluación para un módulo
     * @param {string} moduleKey
     */
    generateAssessment(moduleKey) {
        const node = this.brain.getNode(moduleKey);
        if (!node) return null;

        const questions = [];

        // Pregunta sobre propósito
        questions.push({
            id: `q_${moduleKey}_purpose`,
            type: 'multiple_choice',
            question: `¿Cuál es el propósito principal de ${node.name}?`,
            options: this._generatePurposeOptions(node),
            correctAnswer: 0,
            points: 10
        });

        // Preguntas sobre capacidades
        for (const provide of node.provides.slice(0, 3)) {
            questions.push({
                id: `q_${moduleKey}_${provide.capability.replace(/[:-]/g, '_')}`,
                type: 'true_false',
                question: `${node.name} permite ${this._capabilityToTitle(provide.capability).toLowerCase()}.`,
                correctAnswer: true,
                points: 5
            });
        }

        // Pregunta sobre dependencias
        if (node.consumes.length > 0) {
            questions.push({
                id: `q_${moduleKey}_deps`,
                type: 'multiple_select',
                question: `¿De qué módulos depende ${node.name}?`,
                options: this._generateDependencyOptions(node),
                correctAnswers: [0, 1].slice(0, Math.min(2, node.consumes.length)),
                points: 15
            });
        }

        return {
            id: `assessment_${moduleKey}`,
            module: moduleKey,
            title: `Evaluación: ${node.name}`,
            passingScore: 60,
            totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
            questions,
            timeLimit: questions.length * 2 // 2 minutos por pregunta
        };
    }

    /**
     * Generar opciones de propósito
     */
    _generatePurposeOptions(node) {
        const correct = node.description || `Gestionar ${node.name.toLowerCase()}`;
        const options = [correct];

        // Opciones incorrectas basadas en otros módulos
        const otherNodes = this.brain.getAllNodes()
            .filter(n => n.key !== node.key)
            .slice(0, 3);

        for (const other of otherNodes) {
            options.push(other.description || `Gestionar ${other.name.toLowerCase()}`);
        }

        return options;
    }

    /**
     * Generar opciones de dependencias
     */
    _generateDependencyOptions(node) {
        const options = [];

        // Opciones correctas (dependencias reales)
        for (const consume of node.consumes.slice(0, 2)) {
            const providers = this.brain.whoProvides(consume.capability);
            if (providers.length > 0) {
                options.push(providers[0].name);
            }
        }

        // Opciones incorrectas
        const otherNodes = this.brain.getAllNodes()
            .filter(n => n.key !== node.key && !options.includes(n.name))
            .slice(0, 2);

        for (const other of otherNodes) {
            options.push(other.name);
        }

        return options;
    }

    /**
     * Generar flujo de onboarding
     */
    generateOnboardingFlow() {
        const criticalModules = this.brain.getAllNodes()
            .filter(n => n.commercial?.is_core || n.key.includes('auth'))
            .slice(0, 5);

        const flow = {
            id: `onboarding_${Date.now()}`,
            title: 'Bienvenido al Sistema',
            steps: [],
            totalEstimatedTime: 0
        };

        flow.steps.push({
            order: 1,
            type: 'welcome',
            title: 'Bienvenido',
            content: 'Te guiaremos por los módulos principales del sistema.'
        });

        let order = 2;
        for (const module of criticalModules) {
            const tutorial = this.generateModuleTutorial(module.key);
            flow.steps.push({
                order: order++,
                type: 'module_intro',
                module: module.key,
                title: module.name,
                tutorial: tutorial.sections[0], // Solo introducción
                assessment: tutorial.assessment?.questions?.slice(0, 2) // Solo 2 preguntas
            });
            flow.totalEstimatedTime += parseInt(tutorial.estimatedTime) || 10;
        }

        flow.steps.push({
            order: order,
            type: 'completion',
            title: '¡Felicitaciones!',
            content: 'Has completado el onboarding. Ya puedes usar el sistema.'
        });

        return flow;
    }

    /**
     * Exportar todos los tutoriales
     */
    exportAllTutorials() {
        const tutorials = [];
        const nodes = this.brain.getAllNodes();

        for (const node of nodes) {
            tutorials.push({
                moduleKey: node.key,
                moduleName: node.name,
                tutorial: this.generateModuleTutorial(node.key)
            });
        }

        return {
            generatedAt: new Date().toISOString(),
            totalTutorials: tutorials.length,
            tutorials
        };
    }
}

module.exports = { TutorialGenerator };
