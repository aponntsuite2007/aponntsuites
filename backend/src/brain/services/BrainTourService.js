/**
 * ============================================================================
 * BRAIN TOUR SERVICE - Tours Guiados Dinámicos desde Código VIVO
 * ============================================================================
 *
 * Genera tours interactivos basados en:
 * 1. Conocimiento del Brain (módulos, capacidades, workflows)
 * 2. Rol del usuario (admin, operator, employee)
 * 3. Módulos activos de la empresa
 * 4. Historial del usuario (tours completados)
 *
 * Los tours son STEP-BY-STEP guides que resaltan elementos de la UI
 * y guían al usuario con tooltips interactivos.
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const { sequelize } = require('../../config/database');

class BrainTourService {
    constructor() {
        this.brainHub = null;
        this.tours = new Map();
        this.initialized = false;
    }

    /**
     * Inicializar con BrainIntegrationHub
     */
    async initialize() {
        if (this.initialized) return this;

        try {
            this.brainHub = require('./BrainIntegrationHub');
            if (!this.brainHub.isInitialized) {
                await this.brainHub.initialize();
            }
            this.initialized = true;
            console.log('[BRAIN-TOUR] Servicio de tours inicializado');
        } catch (e) {
            console.error('[BRAIN-TOUR] Error inicializando:', e.message);
        }

        return this;
    }

    /**
     * ========================================================================
     * GENERACIÓN DE TOURS DESDE CÓDIGO VIVO
     * ========================================================================
     */

    /**
     * Generar tour de onboarding para un rol
     * @param {string} role - admin, operator, employee
     * @param {Array} activeModules - Módulos activos de la empresa
     */
    generateOnboardingTour(role = 'employee', activeModules = []) {
        const steps = [];
        let stepIndex = 1;

        // Paso 1: Bienvenida
        steps.push({
            id: `onboarding-${stepIndex++}`,
            element: '#sidebar-toggle, .sidebar-toggle, [data-tour="sidebar"]',
            title: 'Bienvenido al Sistema',
            description: 'Este es tu panel principal. Desde aquí podrás acceder a todas las funcionalidades.',
            position: 'right',
            action: 'highlight'
        });

        // Paso 2: Menú de navegación
        steps.push({
            id: `onboarding-${stepIndex++}`,
            element: '.sidebar, #main-sidebar, nav[role="navigation"]',
            title: 'Menú de Navegación',
            description: 'Usa el menú lateral para moverte entre las diferentes secciones del sistema.',
            position: 'right',
            action: 'highlight'
        });

        // Pasos basados en rol
        if (role === 'admin') {
            steps.push(...this._getAdminOnboardingSteps(stepIndex, activeModules));
        } else if (role === 'operator') {
            steps.push(...this._getOperatorOnboardingSteps(stepIndex, activeModules));
        } else {
            steps.push(...this._getEmployeeOnboardingSteps(stepIndex));
        }

        // Paso final
        steps.push({
            id: `onboarding-final`,
            element: '.help-button, #help-btn, [data-tour="help"]',
            title: 'Ayuda Disponible',
            description: 'Si necesitas ayuda en cualquier momento, usa el botón de ayuda o el chat con IA.',
            position: 'left',
            action: 'highlight',
            isLast: true
        });

        return {
            id: `tour-onboarding-${role}`,
            name: `Tour de Bienvenida (${role})`,
            type: 'onboarding',
            role,
            steps,
            totalSteps: steps.length,
            estimatedTime: `${Math.ceil(steps.length * 0.5)} minutos`,
            generatedAt: new Date().toISOString(),
            source: 'brain-live'
        };
    }

    /**
     * Generar tour para un módulo específico
     * @param {string} moduleKey - Clave del módulo
     */
    generateModuleTour(moduleKey) {
        if (!this.brainHub) {
            return { error: 'Brain no inicializado' };
        }

        // Obtener información del módulo desde el Brain (código VIVO)
        const context = this.brainHub.getAssistantContext(moduleKey);
        if (!context.found) {
            return { error: `Módulo '${moduleKey}' no encontrado`, suggestions: context.suggestions };
        }

        const module = context.module;
        const steps = [];
        let stepIndex = 1;

        // Paso 1: Introducción al módulo
        steps.push({
            id: `${moduleKey}-intro`,
            element: `[data-module="${moduleKey}"], #module-${moduleKey}, .module-${moduleKey}`,
            title: module.name,
            description: module.description || `Bienvenido al módulo ${module.name}`,
            position: 'bottom',
            action: 'highlight'
        });

        // Pasos basados en capacidades (provides)
        const provides = context.dependencies.provides || [];
        for (const capability of provides.slice(0, 5)) {
            const capName = this._formatCapabilityName(capability);
            steps.push({
                id: `${moduleKey}-cap-${stepIndex++}`,
                element: `[data-capability="${capability}"], .${capability.replace(/:/g, '-')}`,
                title: capName,
                description: `Esta funcionalidad te permite ${this._describeCapability(capability)}`,
                position: 'bottom',
                action: 'highlight'
            });
        }

        // Pasos de ayuda
        const tips = context.help.tips || [];
        if (tips.length > 0) {
            steps.push({
                id: `${moduleKey}-tips`,
                element: '.module-content, .main-content, #content',
                title: 'Tips Importantes',
                description: tips.slice(0, 3).join('\n'),
                position: 'center',
                action: 'info'
            });
        }

        // Advertencias si hay
        const warnings = context.help.warnings || [];
        if (warnings.length > 0) {
            steps.push({
                id: `${moduleKey}-warnings`,
                element: '.module-content, .main-content, #content',
                title: 'Ten en cuenta',
                description: warnings[0],
                position: 'center',
                action: 'warning'
            });
        }

        // Paso de integraciones
        const relatedModules = context.relatedModules;
        if (relatedModules.upstream?.length > 0 || relatedModules.downstream?.length > 0) {
            const integrations = [
                ...relatedModules.upstream.map(r => r.key),
                ...relatedModules.downstream.map(r => r.key)
            ].slice(0, 3);

            steps.push({
                id: `${moduleKey}-integrations`,
                element: '.sidebar-menu, #main-sidebar',
                title: 'Módulos Relacionados',
                description: `Este módulo se integra con: ${integrations.join(', ')}`,
                position: 'right',
                action: 'info'
            });
        }

        return {
            id: `tour-module-${moduleKey}`,
            name: `Tour: ${module.name}`,
            type: 'module',
            moduleKey,
            category: module.category,
            difficulty: context.tutorialSummary?.difficulty || 'intermediate',
            steps,
            totalSteps: steps.length,
            estimatedTime: context.tutorialSummary?.estimatedTime || `${steps.length} minutos`,
            prerequisites: context.dependencies.requires || [],
            generatedAt: new Date().toISOString(),
            source: 'brain-live'
        };
    }

    /**
     * Generar tour de flujo de trabajo (workflow)
     * @param {string} workflowName - Nombre del workflow
     */
    generateWorkflowTour(workflowName) {
        const workflows = {
            'crear-usuario': this._getCrearUsuarioWorkflow(),
            'registrar-asistencia': this._getRegistrarAsistenciaWorkflow(),
            'gestionar-vacaciones': this._getGestionarVacacionesWorkflow(),
            'configurar-kiosko': this._getConfigurarKioskoWorkflow(),
            'generar-liquidacion': this._getGenerarLiquidacionWorkflow()
        };

        const workflow = workflows[workflowName];
        if (!workflow) {
            return {
                error: `Workflow '${workflowName}' no encontrado`,
                available: Object.keys(workflows)
            };
        }

        return {
            id: `tour-workflow-${workflowName}`,
            name: workflow.name,
            type: 'workflow',
            workflowKey: workflowName,
            steps: workflow.steps,
            totalSteps: workflow.steps.length,
            estimatedTime: workflow.estimatedTime,
            requirements: workflow.requirements || [],
            generatedAt: new Date().toISOString(),
            source: 'brain-live'
        };
    }

    /**
     * Obtener todos los tours disponibles
     */
    getAvailableTours(role = 'employee', activeModules = []) {
        const tours = [];

        // Tours de onboarding
        tours.push({
            id: `tour-onboarding-${role}`,
            name: 'Tour de Bienvenida',
            type: 'onboarding',
            description: 'Conoce las funcionalidades básicas del sistema',
            estimatedTime: '3 minutos',
            priority: 1
        });

        // Tours de módulos (basados en Brain)
        if (this.brainHub?.isInitialized) {
            const modules = this.brainHub.getAllModules();
            for (const mod of modules.slice(0, 20)) {
                // Solo módulos activos o core
                if (mod.isCore || activeModules.includes(mod.key)) {
                    tours.push({
                        id: `tour-module-${mod.key}`,
                        name: `Tour: ${mod.name}`,
                        type: 'module',
                        moduleKey: mod.key,
                        category: mod.category,
                        description: mod.description?.substring(0, 100) + '...',
                        estimatedTime: '5 minutos',
                        priority: mod.isCore ? 2 : 3
                    });
                }
            }
        }

        // Tours de workflows
        tours.push(
            { id: 'tour-workflow-crear-usuario', name: 'Cómo crear un usuario', type: 'workflow', estimatedTime: '4 minutos', priority: 2 },
            { id: 'tour-workflow-registrar-asistencia', name: 'Registro de asistencia', type: 'workflow', estimatedTime: '2 minutos', priority: 2 },
            { id: 'tour-workflow-gestionar-vacaciones', name: 'Gestión de vacaciones', type: 'workflow', estimatedTime: '3 minutos', priority: 3 }
        );

        return tours.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Obtener tour por ID
     */
    getTour(tourId) {
        const [, type, key] = tourId.split('-');

        if (type === 'onboarding') {
            return this.generateOnboardingTour(key);
        } else if (type === 'module') {
            return this.generateModuleTour(key);
        } else if (type === 'workflow') {
            return this.generateWorkflowTour(key);
        }

        return { error: 'Tour no encontrado' };
    }

    /**
     * ========================================================================
     * HELPERS PRIVADOS
     * ========================================================================
     */

    _getAdminOnboardingSteps(startIndex, activeModules) {
        let idx = startIndex;
        return [
            {
                id: `onboarding-${idx++}`,
                element: '[data-module="users"], #menu-users, .menu-item-users',
                title: 'Gestión de Usuarios',
                description: 'Desde aquí puedes crear, editar y gestionar todos los usuarios de tu empresa.',
                position: 'right',
                action: 'highlight'
            },
            {
                id: `onboarding-${idx++}`,
                element: '[data-module="departments"], #menu-departments',
                title: 'Estructura Organizacional',
                description: 'Configura departamentos, sectores y la jerarquía de tu empresa.',
                position: 'right',
                action: 'highlight'
            },
            {
                id: `onboarding-${idx++}`,
                element: '[data-module="shifts"], #menu-shifts',
                title: 'Turnos y Horarios',
                description: 'Define los turnos de trabajo y asígnalos a los empleados.',
                position: 'right',
                action: 'highlight'
            },
            {
                id: `onboarding-${idx++}`,
                element: '[data-module="dashboard"], #menu-dashboard',
                title: 'Dashboard de Métricas',
                description: 'Visualiza las métricas clave de tu empresa en tiempo real.',
                position: 'right',
                action: 'highlight'
            }
        ];
    }

    _getOperatorOnboardingSteps(startIndex, activeModules) {
        let idx = startIndex;
        return [
            {
                id: `onboarding-${idx++}`,
                element: '[data-module="attendance"], #menu-attendance',
                title: 'Control de Asistencia',
                description: 'Revisa y gestiona los registros de asistencia de los empleados.',
                position: 'right',
                action: 'highlight'
            },
            {
                id: `onboarding-${idx++}`,
                element: '[data-module="users"], #menu-users',
                title: 'Usuarios',
                description: 'Consulta la información de los empleados asignados a tu área.',
                position: 'right',
                action: 'highlight'
            }
        ];
    }

    _getEmployeeOnboardingSteps(startIndex) {
        let idx = startIndex;
        return [
            {
                id: `onboarding-${idx++}`,
                element: '[data-module="mi-espacio"], #menu-mi-espacio, .mi-espacio',
                title: 'Mi Espacio',
                description: 'Tu dashboard personal con toda tu información: asistencia, vacaciones, documentos.',
                position: 'right',
                action: 'highlight'
            },
            {
                id: `onboarding-${idx++}`,
                element: '[data-module="inbox"], #menu-notifications, .notifications',
                title: 'Notificaciones',
                description: 'Aquí recibirás todas las notificaciones importantes sobre tu trabajo.',
                position: 'right',
                action: 'highlight'
            }
        ];
    }

    _formatCapabilityName(capability) {
        // data:users -> Datos de Usuarios
        // notification:email -> Notificaciones por Email
        const parts = capability.split(':');
        const type = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const name = parts[1] ? parts[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
        return `${type}: ${name}`;
    }

    _describeCapability(capability) {
        const descriptions = {
            'data:users': 'gestionar información de usuarios',
            'data:attendance': 'registrar y consultar asistencia',
            'data:departments': 'organizar la estructura de departamentos',
            'notification:email': 'enviar notificaciones por email',
            'notification:push': 'enviar notificaciones push',
            'report:attendance': 'generar reportes de asistencia',
            'report:payroll': 'generar reportes de nómina'
        };
        return descriptions[capability] || `usar ${capability}`;
    }

    // Workflows predefinidos
    _getCrearUsuarioWorkflow() {
        return {
            name: 'Crear un Usuario Nuevo',
            estimatedTime: '4 minutos',
            requirements: ['Rol admin o operator'],
            steps: [
                { id: 'w1-1', element: '[data-module="users"]', title: 'Ir a Usuarios', description: 'Click en el menú Usuarios', position: 'right', action: 'click' },
                { id: 'w1-2', element: '#btn-new-user, .btn-new-user', title: 'Nuevo Usuario', description: 'Click en el botón "Nuevo Usuario"', position: 'bottom', action: 'click' },
                { id: 'w1-3', element: '#firstName, [name="firstName"]', title: 'Datos Personales', description: 'Completa el nombre y apellido del usuario', position: 'right', action: 'input' },
                { id: 'w1-4', element: '#email, [name="email"]', title: 'Email', description: 'Ingresa el email corporativo', position: 'right', action: 'input' },
                { id: 'w1-5', element: '#department, [name="department_id"]', title: 'Departamento', description: 'Selecciona el departamento', position: 'right', action: 'select' },
                { id: 'w1-6', element: '#shift, [name="shift_id"]', title: 'Turno', description: 'Asigna un turno de trabajo', position: 'right', action: 'select' },
                { id: 'w1-7', element: '#btn-save, .btn-save', title: 'Guardar', description: 'Click en Guardar para crear el usuario', position: 'top', action: 'click', isLast: true }
            ]
        };
    }

    _getRegistrarAsistenciaWorkflow() {
        return {
            name: 'Registrar Asistencia Manual',
            estimatedTime: '2 minutos',
            steps: [
                { id: 'w2-1', element: '[data-module="attendance"]', title: 'Ir a Asistencia', description: 'Click en el menú Asistencia', position: 'right', action: 'click' },
                { id: 'w2-2', element: '#btn-manual-entry', title: 'Entrada Manual', description: 'Click en "Registrar Entrada Manual"', position: 'bottom', action: 'click' },
                { id: 'w2-3', element: '#employee-search', title: 'Buscar Empleado', description: 'Busca y selecciona el empleado', position: 'bottom', action: 'search' },
                { id: 'w2-4', element: '#entry-time', title: 'Hora', description: 'Confirma o ajusta la hora de entrada', position: 'right', action: 'input' },
                { id: 'w2-5', element: '#btn-confirm', title: 'Confirmar', description: 'Click en Confirmar', position: 'top', action: 'click', isLast: true }
            ]
        };
    }

    _getGestionarVacacionesWorkflow() {
        return {
            name: 'Gestionar Solicitud de Vacaciones',
            estimatedTime: '3 minutos',
            steps: [
                { id: 'w3-1', element: '[data-module="vacation-management"]', title: 'Ir a Vacaciones', description: 'Click en Gestión de Vacaciones', position: 'right', action: 'click' },
                { id: 'w3-2', element: '.pending-requests', title: 'Solicitudes Pendientes', description: 'Revisa las solicitudes pendientes', position: 'bottom', action: 'highlight' },
                { id: 'w3-3', element: '.request-detail', title: 'Ver Detalle', description: 'Click en una solicitud para ver detalles', position: 'right', action: 'click' },
                { id: 'w3-4', element: '#btn-approve, #btn-reject', title: 'Aprobar o Rechazar', description: 'Decide aprobar o rechazar la solicitud', position: 'top', action: 'click', isLast: true }
            ]
        };
    }

    _getConfigurarKioskoWorkflow() {
        return {
            name: 'Configurar un Kiosko Biométrico',
            estimatedTime: '5 minutos',
            requirements: ['Rol admin', 'Módulo kiosks activo'],
            steps: [
                { id: 'w4-1', element: '[data-module="kiosks"]', title: 'Ir a Kioscos', description: 'Click en Gestión de Kioscos', position: 'right', action: 'click' },
                { id: 'w4-2', element: '#btn-new-kiosk', title: 'Nuevo Kiosko', description: 'Click en "Agregar Kiosko"', position: 'bottom', action: 'click' },
                { id: 'w4-3', element: '#kiosk-name', title: 'Nombre', description: 'Ingresa un nombre identificativo', position: 'right', action: 'input' },
                { id: 'w4-4', element: '#kiosk-location', title: 'Ubicación', description: 'Selecciona la sucursal donde estará', position: 'right', action: 'select' },
                { id: 'w4-5', element: '#kiosk-type', title: 'Tipo de Kiosko', description: 'Elige facial, huella o mixto', position: 'right', action: 'select' },
                { id: 'w4-6', element: '#btn-generate-config', title: 'Generar Config', description: 'Genera la configuración para la APK', position: 'bottom', action: 'click', isLast: true }
            ]
        };
    }

    _getGenerarLiquidacionWorkflow() {
        return {
            name: 'Generar Liquidación de Sueldos',
            estimatedTime: '6 minutos',
            requirements: ['Rol admin', 'Módulo payroll activo'],
            steps: [
                { id: 'w5-1', element: '[data-module="payroll"]', title: 'Ir a Liquidaciones', description: 'Click en Liquidación de Sueldos', position: 'right', action: 'click' },
                { id: 'w5-2', element: '#period-select', title: 'Seleccionar Período', description: 'Elige el mes a liquidar', position: 'bottom', action: 'select' },
                { id: 'w5-3', element: '#btn-calculate', title: 'Calcular', description: 'Click en "Calcular Liquidaciones"', position: 'bottom', action: 'click' },
                { id: 'w5-4', element: '.preview-table', title: 'Revisar', description: 'Revisa el preview de los cálculos', position: 'center', action: 'highlight' },
                { id: 'w5-5', element: '#btn-approve-batch', title: 'Aprobar', description: 'Aprueba las liquidaciones', position: 'top', action: 'click' },
                { id: 'w5-6', element: '#btn-generate-files', title: 'Generar Archivos', description: 'Genera recibos y archivos bancarios', position: 'top', action: 'click', isLast: true }
            ]
        };
    }

    /**
     * Guardar progreso de tour del usuario
     */
    async saveTourProgress(userId, tourId, progress) {
        try {
            await sequelize.query(`
                INSERT INTO user_tour_progress (user_id, tour_id, completed_steps, is_completed, started_at, completed_at)
                VALUES (:userId, :tourId, :completedSteps, :isCompleted, NOW(), :completedAt)
                ON CONFLICT (user_id, tour_id)
                DO UPDATE SET
                    completed_steps = :completedSteps,
                    is_completed = :isCompleted,
                    completed_at = :completedAt
            `, {
                replacements: {
                    userId,
                    tourId,
                    completedSteps: JSON.stringify(progress.completedSteps || []),
                    isCompleted: progress.isCompleted || false,
                    completedAt: progress.isCompleted ? new Date() : null
                },
                type: sequelize.QueryTypes.INSERT
            });
            return true;
        } catch (e) {
            // Tabla puede no existir, ignorar
            console.log('[BRAIN-TOUR] Progreso no guardado:', e.message);
            return false;
        }
    }

    /**
     * Obtener progreso de tours del usuario
     */
    async getUserTourProgress(userId) {
        try {
            const [results] = await sequelize.query(`
                SELECT tour_id, completed_steps, is_completed, started_at, completed_at
                FROM user_tour_progress
                WHERE user_id = :userId
            `, {
                replacements: { userId },
                type: sequelize.QueryTypes.SELECT
            });
            return results || [];
        } catch (e) {
            return [];
        }
    }
}

// Singleton
const brainTourService = new BrainTourService();

module.exports = brainTourService;
