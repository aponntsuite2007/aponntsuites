/**
 * ============================================================================
 * TRAINER AI AGENT - Agente Capacitador Autónomo
 * ============================================================================
 *
 * Reemplaza al capacitador humano:
 * - Onboarding automático de nuevos usuarios
 * - Tours interactivos personalizados por rol
 * - Tutoriales paso a paso
 * - Evaluación de comprensión
 * - Gamificación (badges, progreso)
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const { getInstance: getKnowledgeDB } = require('../services/KnowledgeDatabase');
const FlowRecorder = require('../crawlers/FlowRecorder');

class TrainerAIAgent {
    constructor(options = {}) {
        this.config = {
            defaultRole: 'employee',
            ...options
        };

        this.knowledgeDB = null;
        this.flowRecorder = null;

        // Progreso de usuarios
        this.userProgress = new Map(); // userId -> { completedTutorials, badges, currentLevel }

        // Definición de programas de capacitación por rol
        this.trainingPrograms = this.defineTrainingPrograms();

        this.stats = {
            tutorialsStarted: 0,
            tutorialsCompleted: 0,
            avgCompletionTime: 0,
            badgesAwarded: 0
        };
    }

    /**
     * Inicializar el agente
     */
    async initialize() {
        console.log('🎓 [TRAINER-AI] Inicializando agente capacitador...');

        this.knowledgeDB = await getKnowledgeDB();
        this.flowRecorder = new FlowRecorder();

        console.log('✅ [TRAINER-AI] Agente listo');
        return this;
    }

    /**
     * Definir programas de capacitación por rol
     */
    defineTrainingPrograms() {
        return {
            admin: {
                name: 'Programa Administrador',
                description: 'Capacitación completa para administradores del sistema',
                levels: [
                    {
                        level: 1,
                        name: 'Fundamentos',
                        modules: ['dashboard', 'users', 'departments'],
                        requiredTutorials: ['users-create', 'users-edit', 'departments-create'],
                        badge: '🏅 Admin Novato'
                    },
                    {
                        level: 2,
                        name: 'Gestión Avanzada',
                        modules: ['shifts', 'kiosks', 'attendance'],
                        requiredTutorials: ['shifts-create', 'kiosks-create', 'attendance-view'],
                        badge: '🥈 Admin Competente'
                    },
                    {
                        level: 3,
                        name: 'Experto',
                        modules: ['reports', 'notifications', 'audit'],
                        requiredTutorials: ['reports-generate', 'notifications-config'],
                        badge: '🥇 Admin Experto'
                    }
                ]
            },
            operator: {
                name: 'Programa Operador',
                description: 'Capacitación para operadores de empresa',
                levels: [
                    {
                        level: 1,
                        name: 'Operaciones Básicas',
                        modules: ['dashboard', 'attendance', 'users-view'],
                        requiredTutorials: ['attendance-view', 'users-search'],
                        badge: '🏅 Operador Novato'
                    },
                    {
                        level: 2,
                        name: 'Gestión de Personal',
                        modules: ['vacation', 'medical', 'shifts'],
                        requiredTutorials: ['vacation-approve', 'medical-view'],
                        badge: '🥇 Operador Experto'
                    }
                ]
            },
            employee: {
                name: 'Programa Empleado',
                description: 'Capacitación básica para empleados',
                levels: [
                    {
                        level: 1,
                        name: 'Primeros Pasos',
                        modules: ['mi-espacio', 'attendance'],
                        requiredTutorials: ['attendance-view', 'profile-edit'],
                        badge: '🎯 Usuario Activo'
                    }
                ]
            }
        };
    }

    /**
     * ========================================================================
     * ONBOARDING
     * ========================================================================
     */

    /**
     * Iniciar onboarding para un nuevo usuario
     */
    async startOnboarding(userId, userRole, userName) {
        console.log(`\n🎓 [TRAINER-AI] Iniciando onboarding para ${userName} (${userRole})`);

        const program = this.trainingPrograms[userRole] || this.trainingPrograms.employee;

        // Crear registro de progreso
        this.userProgress.set(userId, {
            userId,
            userName,
            role: userRole,
            program: program.name,
            currentLevel: 1,
            completedTutorials: [],
            badges: [],
            startedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        });

        // Generar plan de onboarding personalizado
        const onboardingPlan = {
            welcome: this.generateWelcomeMessage(userName, userRole),
            program: program.name,
            levels: program.levels.map(level => ({
                ...level,
                tutorials: level.requiredTutorials.map(tutId =>
                    this.flowRecorder.flowToTutorial(tutId)
                ).filter(Boolean)
            })),
            estimatedTime: this.estimateTrainingTime(program),
            firstTutorial: this.getNextTutorial(userId)
        };

        this.stats.tutorialsStarted++;

        return onboardingPlan;
    }

    /**
     * Generar mensaje de bienvenida personalizado
     */
    generateWelcomeMessage(userName, role) {
        const roleMessages = {
            admin: `¡Bienvenido/a ${userName}! Como administrador, tendrás acceso completo al sistema. Empezaremos con los fundamentos de gestión de usuarios y departamentos.`,
            operator: `¡Hola ${userName}! Como operador, podrás gestionar la asistencia y el personal de tu empresa. Vamos a comenzar con las operaciones básicas.`,
            employee: `¡Bienvenido/a ${userName}! Este sistema te ayudará a gestionar tu asistencia, solicitar vacaciones y más. ¡Empecemos!`
        };

        return roleMessages[role] || roleMessages.employee;
    }

    /**
     * Estimar tiempo de capacitación
     */
    estimateTrainingTime(program) {
        const tutorialsCount = program.levels.reduce(
            (sum, level) => sum + level.requiredTutorials.length, 0
        );
        return `${tutorialsCount * 5} - ${tutorialsCount * 10} minutos`;
    }

    /**
     * ========================================================================
     * TUTORIALES
     * ========================================================================
     */

    /**
     * Obtener siguiente tutorial para un usuario
     */
    getNextTutorial(userId) {
        const progress = this.userProgress.get(userId);
        if (!progress) return null;

        const program = this.trainingPrograms[progress.role];
        if (!program) return null;

        // Encontrar el nivel actual
        const currentLevelData = program.levels.find(l => l.level === progress.currentLevel);
        if (!currentLevelData) return null;

        // Encontrar el primer tutorial no completado
        for (const tutId of currentLevelData.requiredTutorials) {
            if (!progress.completedTutorials.includes(tutId)) {
                return this.flowRecorder.flowToTutorial(tutId);
            }
        }

        // Si completó todos, subir de nivel
        if (progress.currentLevel < program.levels.length) {
            progress.currentLevel++;
            return this.getNextTutorial(userId);
        }

        return null; // Completó todo el programa
    }

    /**
     * Obtener tutorial específico
     */
    getTutorial(tutorialId) {
        return this.flowRecorder.flowToTutorial(tutorialId);
    }

    /**
     * Marcar tutorial como completado
     */
    async completeTutorial(userId, tutorialId, score = 100) {
        const progress = this.userProgress.get(userId);
        if (!progress) return { success: false, error: 'Usuario no encontrado' };

        // Agregar a completados
        if (!progress.completedTutorials.includes(tutorialId)) {
            progress.completedTutorials.push(tutorialId);
        }

        progress.lastActivity = new Date().toISOString();

        // Verificar si completó el nivel
        const levelUpResult = this.checkLevelUp(userId);

        this.stats.tutorialsCompleted++;

        return {
            success: true,
            tutorialId,
            score,
            levelUp: levelUpResult,
            nextTutorial: this.getNextTutorial(userId),
            progress: this.getUserProgress(userId)
        };
    }

    /**
     * Verificar si el usuario sube de nivel
     */
    checkLevelUp(userId) {
        const progress = this.userProgress.get(userId);
        if (!progress) return null;

        const program = this.trainingPrograms[progress.role];
        const currentLevelData = program.levels.find(l => l.level === progress.currentLevel);

        if (!currentLevelData) return null;

        // Verificar si completó todos los tutoriales del nivel
        const allCompleted = currentLevelData.requiredTutorials.every(
            tutId => progress.completedTutorials.includes(tutId)
        );

        if (allCompleted) {
            // Otorgar badge
            if (currentLevelData.badge && !progress.badges.includes(currentLevelData.badge)) {
                progress.badges.push(currentLevelData.badge);
                this.stats.badgesAwarded++;
            }

            // Subir de nivel si hay más
            if (progress.currentLevel < program.levels.length) {
                progress.currentLevel++;
                return {
                    leveledUp: true,
                    newLevel: progress.currentLevel,
                    badge: currentLevelData.badge,
                    message: `¡Felicidades! Has completado el nivel ${currentLevelData.name} y obtenido el badge ${currentLevelData.badge}`
                };
            } else {
                return {
                    leveledUp: false,
                    programCompleted: true,
                    badge: currentLevelData.badge,
                    message: `¡Excelente! Has completado todo el programa de capacitación ${program.name}`
                };
            }
        }

        return null;
    }

    /**
     * ========================================================================
     * PROGRESO Y GAMIFICACIÓN
     * ========================================================================
     */

    /**
     * Obtener progreso del usuario
     */
    getUserProgress(userId) {
        const progress = this.userProgress.get(userId);
        if (!progress) return null;

        const program = this.trainingPrograms[progress.role];
        const totalTutorials = program.levels.reduce(
            (sum, level) => sum + level.requiredTutorials.length, 0
        );

        return {
            ...progress,
            completedCount: progress.completedTutorials.length,
            totalTutorials,
            percentComplete: ((progress.completedTutorials.length / totalTutorials) * 100).toFixed(0),
            currentLevelName: program.levels.find(l => l.level === progress.currentLevel)?.name || 'Completado',
            nextBadge: program.levels.find(l => l.level === progress.currentLevel)?.badge
        };
    }

    /**
     * Obtener leaderboard
     */
    getLeaderboard(limit = 10) {
        return Array.from(this.userProgress.values())
            .map(p => ({
                userName: p.userName,
                badges: p.badges.length,
                tutorialsCompleted: p.completedTutorials.length,
                level: p.currentLevel
            }))
            .sort((a, b) => b.tutorialsCompleted - a.tutorialsCompleted)
            .slice(0, limit);
    }

    /**
     * ========================================================================
     * TOURS INTERACTIVOS
     * ========================================================================
     */

    /**
     * Generar tour para un módulo específico
     */
    async generateModuleTour(moduleKey, userRole) {
        const moduleKnowledge = this.knowledgeDB.getModuleKnowledge(moduleKey);

        const tour = {
            id: `tour-${moduleKey}`,
            module: moduleKey,
            role: userRole,
            steps: [],
            estimatedTime: '2-3 minutos'
        };

        // Paso 1: Introducción
        tour.steps.push({
            step: 1,
            type: 'intro',
            title: `Bienvenido al módulo ${moduleKey}`,
            content: `En este tour aprenderás a usar las funciones principales de ${moduleKey}.`,
            target: null
        });

        // Pasos basados en flujos conocidos
        if (moduleKnowledge.flows?.length > 0) {
            for (const flow of moduleKnowledge.flows.slice(0, 3)) {
                tour.steps.push({
                    step: tour.steps.length + 1,
                    type: 'action',
                    title: flow.description || flow.name,
                    content: `Aprende a ${flow.description?.toLowerCase() || flow.name}`,
                    flowId: flow.id
                });
            }
        }

        // Paso final: Práctica
        tour.steps.push({
            step: tour.steps.length + 1,
            type: 'practice',
            title: '¡Ahora es tu turno!',
            content: 'Intenta realizar las acciones que aprendiste. Estaré aquí para ayudarte.',
            target: null
        });

        return tour;
    }

    /**
     * ========================================================================
     * ESTADÍSTICAS
     * ========================================================================
     */

    /**
     * Obtener estadísticas del agente
     */
    getStats() {
        return {
            ...this.stats,
            activeUsers: this.userProgress.size,
            completionRate: this.stats.tutorialsStarted > 0
                ? ((this.stats.tutorialsCompleted / this.stats.tutorialsStarted) * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }
}

// Singleton
let instance = null;

module.exports = {
    TrainerAIAgent,
    getInstance: async () => {
        if (!instance) {
            instance = new TrainerAIAgent();
            await instance.initialize();
        }
        return instance;
    }
};
