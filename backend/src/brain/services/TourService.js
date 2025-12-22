/**
 * ============================================================================
 * TOUR SERVICE - Servicio de Tours Interactivos
 * ============================================================================
 *
 * Gestiona las definiciones de tours, progreso y conexión con Support AI.
 *
 * Características:
 * - Definiciones de tours por módulo
 * - Tracking de progreso por usuario
 * - Integración con Support AI para preguntas
 * - Persistencia de estado
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

class TourService {
    constructor() {
        // Tours registrados por módulo
        this.tours = new Map();

        // Progreso por usuario (userId -> { tourId, stepIndex, startedAt, ... })
        this.userProgress = new Map();

        // Configuración
        this.config = {
            autoSaveProgress: true,
            defaultVoice: 'es-ES',
            bubbleDelay: 1500,
            highlightColor: 'rgba(59, 130, 246, 0.3)'
        };

        // Estadísticas
        this.stats = {
            toursStarted: 0,
            toursCompleted: 0,
            questionsAsked: 0,
            avgCompletionRate: 0
        };

        // Registrar tours predefinidos
        this._registerBuiltInTours();
    }

    /**
     * ========================================================================
     * REGISTRO DE TOURS
     * ========================================================================
     */

    /**
     * Registrar un nuevo tour
     */
    registerTour(tourId, tourData) {
        if (!tourData.module || !tourData.steps || !Array.isArray(tourData.steps)) {
            throw new Error('Tour must have module and steps array');
        }

        const tour = {
            id: tourId,
            ...tourData,
            createdAt: new Date(),
            version: tourData.version || '1.0.0'
        };

        this.tours.set(tourId, tour);
        console.log(`📚 [TOUR] Registrado: ${tourId} (${tourData.steps.length} pasos)`);

        return tour;
    }

    /**
     * Obtener tour por ID
     */
    getTour(tourId) {
        return this.tours.get(tourId);
    }

    /**
     * Obtener tours de un módulo
     */
    getToursByModule(module) {
        const result = [];
        for (const [id, tour] of this.tours) {
            if (tour.module === module) {
                result.push(tour);
            }
        }
        return result;
    }

    /**
     * Listar todos los tours disponibles
     */
    listTours() {
        return Array.from(this.tours.values()).map(t => ({
            id: t.id,
            name: t.name,
            module: t.module,
            actionKey: t.actionKey || null, // 🧠 Para verificación de prerrequisitos
            steps: t.steps.length,
            estimatedTime: t.estimatedTime,
            difficulty: t.difficulty
        }));
    }

    /**
     * ========================================================================
     * GESTIÓN DE PROGRESO
     * ========================================================================
     */

    /**
     * Iniciar tour para usuario
     */
    startTour(userId, tourId) {
        const tour = this.tours.get(tourId);
        if (!tour) {
            return { error: `Tour ${tourId} not found` };
        }

        const progress = {
            tourId,
            userId,
            stepIndex: 0,
            startedAt: new Date(),
            completedSteps: [],
            questionsAsked: [],
            paused: false,
            pausedAt: null
        };

        this.userProgress.set(userId, progress);
        this.stats.toursStarted++;

        console.log(`🎬 [TOUR] Usuario ${userId} inició tour: ${tour.name}`);

        return {
            success: true,
            tour: {
                id: tour.id,
                name: tour.name,
                totalSteps: tour.steps.length,
                currentStep: 0
            },
            step: tour.steps[0]
        };
    }

    /**
     * Avanzar al siguiente paso
     */
    advanceStep(userId) {
        const progress = this.userProgress.get(userId);
        if (!progress) {
            return { error: 'No active tour for this user' };
        }

        const tour = this.tours.get(progress.tourId);
        if (!tour) {
            return { error: 'Tour not found' };
        }

        // Marcar paso actual como completado
        progress.completedSteps.push({
            stepIndex: progress.stepIndex,
            completedAt: new Date()
        });

        // Avanzar
        progress.stepIndex++;

        // ¿Tour completado?
        if (progress.stepIndex >= tour.steps.length) {
            return this._completeTour(userId, progress, tour);
        }

        this.userProgress.set(userId, progress);

        return {
            success: true,
            currentStep: progress.stepIndex,
            totalSteps: tour.steps.length,
            step: tour.steps[progress.stepIndex],
            progress: Math.round((progress.stepIndex / tour.steps.length) * 100)
        };
    }

    /**
     * Retroceder al paso anterior
     */
    goBack(userId) {
        const progress = this.userProgress.get(userId);
        if (!progress || progress.stepIndex === 0) {
            return { error: 'Cannot go back' };
        }

        const tour = this.tours.get(progress.tourId);
        progress.stepIndex--;
        this.userProgress.set(userId, progress);

        return {
            success: true,
            currentStep: progress.stepIndex,
            step: tour.steps[progress.stepIndex]
        };
    }

    /**
     * Ir a paso específico
     */
    goToStep(userId, stepIndex) {
        const progress = this.userProgress.get(userId);
        if (!progress) {
            return { error: 'No active tour' };
        }

        const tour = this.tours.get(progress.tourId);
        if (stepIndex < 0 || stepIndex >= tour.steps.length) {
            return { error: 'Invalid step index' };
        }

        progress.stepIndex = stepIndex;
        this.userProgress.set(userId, progress);

        return {
            success: true,
            currentStep: stepIndex,
            step: tour.steps[stepIndex]
        };
    }

    /**
     * Pausar tour
     */
    pauseTour(userId) {
        const progress = this.userProgress.get(userId);
        if (!progress) {
            return { error: 'No active tour' };
        }

        progress.paused = true;
        progress.pausedAt = new Date();
        this.userProgress.set(userId, progress);

        console.log(`⏸️ [TOUR] Usuario ${userId} pausó tour en paso ${progress.stepIndex}`);

        return {
            success: true,
            paused: true,
            stepIndex: progress.stepIndex
        };
    }

    /**
     * Reanudar tour
     */
    resumeTour(userId) {
        const progress = this.userProgress.get(userId);
        if (!progress) {
            return { error: 'No active tour' };
        }

        const tour = this.tours.get(progress.tourId);
        progress.paused = false;
        progress.pausedAt = null;
        this.userProgress.set(userId, progress);

        console.log(`▶️ [TOUR] Usuario ${userId} reanudó tour en paso ${progress.stepIndex}`);

        return {
            success: true,
            currentStep: progress.stepIndex,
            step: tour.steps[progress.stepIndex]
        };
    }

    /**
     * Obtener progreso actual
     */
    getProgress(userId) {
        const progress = this.userProgress.get(userId);
        if (!progress) {
            return { hasTour: false };
        }

        const tour = this.tours.get(progress.tourId);

        return {
            hasTour: true,
            tourId: progress.tourId,
            tourName: tour?.name,
            currentStep: progress.stepIndex,
            totalSteps: tour?.steps.length || 0,
            completedSteps: progress.completedSteps.length,
            progress: tour ? Math.round((progress.stepIndex / tour.steps.length) * 100) : 0,
            paused: progress.paused,
            startedAt: progress.startedAt
        };
    }

    /**
     * Registrar pregunta hecha durante tour
     */
    recordQuestion(userId, question, answer) {
        const progress = this.userProgress.get(userId);
        if (progress) {
            progress.questionsAsked.push({
                stepIndex: progress.stepIndex,
                question,
                answer: answer?.substring(0, 200), // Guardar resumen
                askedAt: new Date()
            });
            this.userProgress.set(userId, progress);
            this.stats.questionsAsked++;
        }
    }

    /**
     * Completar tour
     */
    _completeTour(userId, progress, tour) {
        const duration = Date.now() - progress.startedAt.getTime();
        const durationMinutes = Math.round(duration / 60000);

        this.stats.toursCompleted++;

        // Calcular estadísticas
        const result = {
            success: true,
            completed: true,
            tourId: progress.tourId,
            tourName: tour.name,
            stepsCompleted: tour.steps.length,
            questionsAsked: progress.questionsAsked.length,
            duration: `${durationMinutes} minutos`,
            completedAt: new Date()
        };

        // Limpiar progreso (o guardarlo en historial)
        this.userProgress.delete(userId);

        console.log(`✅ [TOUR] Usuario ${userId} completó tour: ${tour.name} (${durationMinutes}min)`);

        return result;
    }

    /**
     * ========================================================================
     * TOURS PREDEFINIDOS
     * ========================================================================
     */

    _registerBuiltInTours() {
        // Tour: Gestión de Usuarios (módulo users)
        this.registerTour('users-overview', this._getUsersTour());

        // Tour: Dashboard principal
        this.registerTour('dashboard-intro', this._getDashboardTour());

        // Tour: Asistencia
        this.registerTour('attendance-basics', this._getAttendanceTour());

        // Tour: Primeros pasos (onboarding)
        this.registerTour('first-steps', this._getFirstStepsTour());
    }

    /**
     * Tour REAL del módulo de Usuarios - Navega y abre elementos reales
     */
    _getUsersTour() {
        return {
            id: 'users-overview',
            name: 'Gestión de Usuarios - Tour Interactivo',
            module: 'users',
            actionKey: 'create-employee', // 🧠 Para verificación de prerrequisitos
            description: 'Tour interactivo que te guía por el módulo de usuarios abriendo pantallas reales',
            estimatedTime: '3-5 minutos',
            difficulty: 'básico',

            steps: [
                // ========== PASO 1: INTRO ==========
                {
                    id: 'intro',
                    title: '🎯 Tour: Módulo de Usuarios',
                    content: 'Te voy a mostrar el módulo de usuarios navegando por la interfaz REAL. Voy a abrir pantallas, hacer clicks y mostrarte cada sección.',
                    target: null,
                    position: 'center',
                    tips: [
                        'Este tour navega automáticamente',
                        'Haz clic en "Siguiente" para continuar'
                    ],
                    voiceText: 'Vamos a explorar el módulo de usuarios. Te mostraré cada sección en vivo.'
                },

                // ========== PASO 2: NAVEGAR AL MÓDULO ==========
                {
                    id: 'navigate-to-users',
                    title: '📂 Abriendo módulo de Usuarios...',
                    content: 'Navegando al módulo de usuarios donde puedes ver y gestionar todos los empleados de la empresa.',
                    preAction: {
                        type: 'navigate',
                        module: 'users',
                        moduleName: 'Gestión de Usuarios',
                        waitAfter: 1500
                    },
                    expectedState: { activeModule: 'users', modalOpen: false },
                    target: '#mainContent, .users-container, .module-content',
                    position: 'center',
                    timeout: 5000,
                    tips: ['Aquí se listan todos los empleados'],
                    voiceText: 'Este es el módulo de usuarios con la lista de empleados.'
                },

                // ========== PASO 3: LISTA DE USUARIOS ==========
                {
                    id: 'users-table',
                    title: '📋 Lista de Empleados',
                    content: 'Esta tabla muestra todos los empleados. Puedes buscar, filtrar por departamento, y hacer clic en el botón azul "Ver" para abrir la ficha.',
                    target: '.users-table, table.users-table',
                    position: 'bottom',
                    timeout: 5000,
                    expectedState: { activeModule: 'users', modalOpen: false },
                    preAction: {
                        type: 'scroll',
                        target: '.users-table',
                        waitAfter: 3500  // Esperar 3.5s para que desaparezcan los carteles de éxito
                    },
                    tips: [
                        'El botón azul 👁️ abre la ficha completa',
                        'Usa el buscador para encontrar rápido',
                        'Ordena por columna haciendo clic en el encabezado'
                    ],
                    voiceText: 'En esta tabla puedes ver todos los empleados. Haz clic en el botón Ver para abrir la ficha.'
                },

                // ========== PASO 4: ABRIR UN USUARIO ==========
                {
                    id: 'open-user',
                    title: '👤 Abriendo ficha de empleado...',
                    content: 'Voy a hacer clic en el botón "Ver" de un empleado para mostrarte la ficha completa.',
                    preAction: {
                        type: 'click',
                        target: '.users-table tbody tr:nth-child(2) .users-action-btn.view',
                        waitAfter: 2000
                    },
                    expectedState: { modalOpen: true },
                    target: '.employee-file-modal, .modal-content, .employee-modal, [role="dialog"]',
                    position: 'center',
                    timeout: 5000,
                    tips: ['La ficha tiene múltiples pestañas con información organizada'],
                    voiceText: 'Esta es la ficha completa del empleado con todas sus pestañas.'
                },

                // ========== PASO 5: TABS DISPONIBLES ==========
                {
                    id: 'show-tabs',
                    title: '📑 Pestañas de la Ficha',
                    content: 'La ficha tiene 10 pestañas: Administración, Datos Personales, Antecedentes Laborales, Familia, Médico, Asistencia, Calendario, Disciplinarios, Biométrico y Notificaciones.',
                    target: '.file-tabs-container, .employee-file-modal .file-tab',
                    position: 'top',
                    timeout: 3000,
                    expectedState: { modalOpen: true, activeTab: 'admin' },
                    tips: [
                        'Cada pestaña tiene información específica',
                        'Los campos obligatorios tienen asterisco *'
                    ],
                    voiceText: 'Estas son las pestañas disponibles. Cada una tiene información específica del empleado.'
                },

                // ========== PASO 6: TAB DATOS PERSONALES ==========
                {
                    id: 'tab-personal-demo',
                    title: '👤 Datos Personales',
                    content: 'Aquí están los datos básicos: nombre, email, teléfono, documento de identidad, fecha de nacimiento y foto de perfil.',
                    preAction: {
                        type: 'click',
                        target: '.employee-file-modal .file-tab:nth-child(2)',
                        waitAfter: 800
                    },
                    expectedState: { modalOpen: true, activeTab: 'personal' },
                    target: '#personal-tab',
                    position: 'center',
                    timeout: 3000,
                    tips: ['El email debe ser único', 'La foto se usa para reconocimiento facial'],
                    voiceText: 'Los datos personales incluyen nombre, documento y foto del empleado.'
                },

                // ========== PASO 7: TAB ASISTENCIA ==========
                {
                    id: 'tab-attendance-demo',
                    title: '📅 Asistencia y Permisos',
                    content: 'Historial de marcaciones, tardanzas, ausencias y permisos. Con calendario visual y estadísticas.',
                    preAction: {
                        type: 'click',
                        target: '.employee-file-modal .file-tab:nth-child(6)',
                        waitAfter: 800
                    },
                    expectedState: { modalOpen: true, activeTab: 'attendance' },
                    target: '#attendance-tab',
                    position: 'center',
                    timeout: 3000,
                    tips: [
                        'Verde = asistencia perfecta',
                        'Rojo = ausencia',
                        'Exporta a Excel desde aquí'
                    ],
                    voiceText: 'En asistencia ves el historial completo de marcaciones y permisos.'
                },

                // ========== PASO 8: TAB BIOMÉTRICO ==========
                {
                    id: 'tab-biometric-demo',
                    title: '📸 Registro Biométrico',
                    content: 'Gestión de huellas dactilares, foto para reconocimiento facial y dispositivos autorizados.',
                    preAction: {
                        type: 'click',
                        target: '.employee-file-modal .file-tab:nth-child(9)',
                        waitAfter: 800
                    },
                    expectedState: { modalOpen: true, activeTab: 'biometric' },
                    target: '#biometric-tab',
                    position: 'center',
                    timeout: 3000,
                    tips: [
                        'Se pueden registrar hasta 10 huellas',
                        'La foto debe tener buena iluminación'
                    ],
                    voiceText: 'El registro biométrico gestiona las huellas y el reconocimiento facial.'
                },

                // ========== PASO 9: CIERRE ==========
                {
                    id: 'tour-complete',
                    title: '✅ ¡Tour Completado!',
                    content: '¡Excelente! Ya conoces el módulo de usuarios. Explora las demás pestañas cuando quieras. Si tienes dudas, pregúntame.',
                    preAction: {
                        type: 'closeModal',
                        waitAfter: 300
                    },
                    expectedState: { modalOpen: false },
                    target: null,
                    position: 'center',
                    tips: [
                        'Puedes repetir este tour cuando quieras',
                        'Hay tours para otros módulos también'
                    ],
                    voiceText: 'Felicidades, ya conoces el módulo de usuarios. Estoy aquí si necesitas ayuda.'
                }
            ]
        };
    }

    /**
     * Tour del Dashboard
     */
    _getDashboardTour() {
        return {
            id: 'dashboard-intro',
            name: 'Dashboard - Introducción',
            module: 'dashboard',
            actionKey: null, // Dashboard no requiere prerrequisitos específicos
            description: 'Conoce el panel principal y sus métricas clave',
            estimatedTime: '3-4 minutos',
            difficulty: 'básico',

            steps: [
                {
                    id: 'intro',
                    title: 'Tu Panel de Control',
                    content: 'El dashboard te muestra un resumen en tiempo real de la asistencia, alertas y métricas importantes.',
                    target: '.dashboard-container, #dashboard',
                    position: 'center',
                    tips: ['Los datos se actualizan cada minuto'],
                    voiceText: 'Bienvenido a tu panel de control con métricas en tiempo real.'
                },
                {
                    id: 'metrics',
                    title: 'Métricas Principales',
                    content: 'Aquí ves el total de empleados, presentes hoy, ausentes y tardanzas.',
                    target: '.dashboard-metrics, .metrics-cards',
                    position: 'bottom',
                    highlight: true,
                    tips: ['Haz clic en cada tarjeta para ver detalles'],
                    voiceText: 'Las métricas principales muestran asistencia del día.'
                },
                {
                    id: 'alerts',
                    title: 'Alertas',
                    content: 'Las alertas importantes aparecen aquí: vacaciones pendientes, documentos por vencer, etc.',
                    target: '.dashboard-alerts, .alerts-panel',
                    position: 'left',
                    highlight: true,
                    tips: ['Las alertas rojas requieren acción inmediata'],
                    voiceText: 'Las alertas te mantienen informado de situaciones que requieren atención.'
                },
                {
                    id: 'complete',
                    title: '¡Listo!',
                    content: 'Ya conoces tu dashboard. Explora cada sección para más detalles.',
                    target: null,
                    position: 'center',
                    voiceText: 'Has completado la introducción al dashboard.'
                }
            ]
        };
    }

    /**
     * Tour de Asistencia
     */
    _getAttendanceTour() {
        return {
            id: 'attendance-basics',
            name: 'Asistencia - Lo Básico',
            module: 'attendance',
            actionKey: 'check-in', // 🧠 Requiere empresa con estructura configurada
            description: 'Aprende a ver y gestionar la asistencia diaria',
            estimatedTime: '4-5 minutos',
            difficulty: 'básico',

            steps: [
                {
                    id: 'intro',
                    title: 'Control de Asistencia',
                    content: 'Este módulo te permite ver marcaciones en tiempo real, generar reportes y gestionar incidencias.',
                    target: '.attendance-container, #attendance-module',
                    position: 'center',
                    tips: ['La asistencia se sincroniza con los kioscos biométricos'],
                    voiceText: 'Bienvenido al módulo de control de asistencia.'
                },
                {
                    id: 'today',
                    title: 'Asistencia de Hoy',
                    content: 'Vista de quién ha marcado entrada, quién falta y quién llegó tarde.',
                    target: '.today-attendance, .attendance-today',
                    position: 'bottom',
                    highlight: true,
                    voiceText: 'Aquí ves la asistencia del día actual en tiempo real.'
                },
                {
                    id: 'reports',
                    title: 'Reportes',
                    content: 'Genera reportes por período, departamento o empleado. Exporta a Excel o PDF.',
                    target: '.attendance-reports, #btn-reports',
                    position: 'left',
                    highlight: true,
                    voiceText: 'Los reportes te permiten analizar patrones de asistencia.'
                },
                {
                    id: 'complete',
                    title: '¡Tour Completo!',
                    content: 'Ya conoces lo básico de asistencia. Hay tours avanzados para reportes y análisis.',
                    target: null,
                    position: 'center',
                    voiceText: 'Has completado el tour básico de asistencia.'
                }
            ]
        };
    }

    /**
     * Tour de Primeros Pasos (Onboarding)
     */
    _getFirstStepsTour() {
        return {
            id: 'first-steps',
            name: 'Primeros Pasos',
            module: 'onboarding',
            actionKey: null, // Onboarding no requiere prerrequisitos
            description: 'Tour de bienvenida para nuevos usuarios',
            estimatedTime: '5-6 minutos',
            difficulty: 'básico',

            steps: [
                {
                    id: 'welcome',
                    title: '¡Bienvenido al Sistema!',
                    content: 'Te guiaré por las funciones principales para que comiences a usar el sistema rápidamente.',
                    target: null,
                    position: 'center',
                    tips: [
                        'Puedes pausar el tour en cualquier momento',
                        'Escribe una pregunta si necesitas ayuda'
                    ],
                    voiceText: 'Bienvenido. Te mostraré las funciones principales del sistema.'
                },
                {
                    id: 'menu',
                    title: 'Menú Principal',
                    content: 'El menú lateral te da acceso a todos los módulos. Los que ves dependen de tus permisos.',
                    target: '.sidebar, #main-menu, .main-nav',
                    position: 'right',
                    highlight: true,
                    tips: ['Puedes colapsar el menú para más espacio'],
                    voiceText: 'El menú lateral es tu navegación principal entre módulos.'
                },
                {
                    id: 'profile',
                    title: 'Tu Perfil',
                    content: 'Aquí puedes ver tus datos, cambiar contraseña y configurar preferencias.',
                    target: '.user-profile, #profile-menu, .profile-dropdown',
                    position: 'bottom-left',
                    highlight: true,
                    voiceText: 'Tu perfil te permite personalizar tu experiencia.'
                },
                {
                    id: 'notifications',
                    title: 'Notificaciones',
                    content: 'Las notificaciones te avisan de aprobaciones pendientes, alertas y mensajes.',
                    target: '.notifications, #notifications-bell',
                    position: 'bottom',
                    highlight: true,
                    voiceText: 'Las notificaciones te mantienen informado de eventos importantes.'
                },
                {
                    id: 'help',
                    title: 'Ayuda Siempre Disponible',
                    content: 'El botón de ayuda te permite hacer preguntas. Escribes tu duda y te respondo al instante.',
                    target: '.help-button, #ai-assistant-button, .assistant-toggle',
                    position: 'left',
                    highlight: true,
                    tips: ['Puedo responder dudas sobre cualquier función'],
                    voiceText: 'El asistente de ayuda está disponible cuando lo necesites.'
                },
                {
                    id: 'complete',
                    title: '¡Estás Listo!',
                    content: '¡Perfecto! Ya conoces lo esencial. Explora a tu ritmo y recuerda que siempre puedo ayudarte.',
                    target: null,
                    position: 'center',
                    tips: [
                        'Hay tours específicos para cada módulo',
                        'Pregúntame "muéstrame el tour de usuarios" para empezar otro tour'
                    ],
                    voiceText: 'Excelente, ya estás listo para usar el sistema. Estoy aquí si necesitas ayuda.'
                }
            ]
        };
    }

    /**
     * ========================================================================
     * ESTADÍSTICAS
     * ========================================================================
     */

    getStats() {
        const toursAvailable = this.tours.size;
        const activeToursCount = this.userProgress.size;

        return {
            toursAvailable,
            activeToursNow: activeToursCount,
            toursStarted: this.stats.toursStarted,
            toursCompleted: this.stats.toursCompleted,
            questionsAsked: this.stats.questionsAsked,
            completionRate: this.stats.toursStarted > 0
                ? `${Math.round((this.stats.toursCompleted / this.stats.toursStarted) * 100)}%`
                : 'N/A'
        };
    }
}

// Singleton
let instance = null;

module.exports = {
    TourService,
    getInstance: () => {
        if (!instance) {
            instance = new TourService();
        }
        return instance;
    }
};
