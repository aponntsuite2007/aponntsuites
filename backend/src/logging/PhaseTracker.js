/**
 * ============================================================================
 * PHASE TRACKER - TRACKING DE FASES DEL CICLO VIRTUOSO
 * ============================================================================
 *
 * Tracking sistemático de las fases del ciclo de testing/auto-repair:
 * INIT → TEST → ANALYZE → REPAIR → VALIDATE → COMPLETE
 *
 * @version 1.0.0
 * @date 2025-11-01
 * ============================================================================
 */

const EventEmitter = require('events');

const Phases = {
    INIT: {
        name: 'INIT',
        order: 1,
        icon: '🚀',
        description: 'Inicialización del sistema',
        nextPhases: ['TEST']
    },
    TEST: {
        name: 'TEST',
        order: 2,
        icon: '🧪',
        description: 'Ejecución de tests',
        nextPhases: ['ANALYZE', 'COMPLETE']
    },
    ANALYZE: {
        name: 'ANALYZE',
        order: 3,
        icon: '🧠',
        description: 'Análisis de errores con Ollama',
        nextPhases: ['REPAIR']
    },
    REPAIR: {
        name: 'REPAIR',
        order: 4,
        icon: '🔧',
        description: 'Aplicación de fixes automáticos',
        nextPhases: ['VALIDATE']
    },
    VALIDATE: {
        name: 'VALIDATE',
        order: 5,
        icon: '✓',
        description: 'Validación del fix aplicado',
        nextPhases: ['TEST', 'COMPLETE']
    },
    COMPLETE: {
        name: 'COMPLETE',
        order: 6,
        icon: '🎉',
        description: 'Ciclo completado',
        nextPhases: []
    }
};

class PhaseTracker extends EventEmitter {
    constructor() {
        super();
        this.currentPhase = null;
        this.phaseHistory = [];
        this.phaseStartTimes = new Map();
        this.executionId = null;
    }

    /**
     * Iniciar un nuevo ciclo
     */
    startCycle(executionId) {
        this.executionId = executionId;
        this.currentPhase = null;
        this.phaseHistory = [];
        this.phaseStartTimes.clear();

        this.emit('cycle-started', { executionId });
        return this;
    }

    /**
     * Entrar a una nueva fase
     */
    enterPhase(phaseName) {
        const phase = Phases[phaseName.toUpperCase()];

        if (!phase) {
            throw new Error(`Fase inválida: ${phaseName}`);
        }

        // Validar transición
        if (this.currentPhase) {
            const currentPhaseObj = Phases[this.currentPhase];
            if (!currentPhaseObj.nextPhases.includes(phase.name)) {
                console.warn(`⚠️ Transición inválida: ${this.currentPhase} → ${phase.name}`);
            }
        }

        this.currentPhase = phase.name;
        this.phaseStartTimes.set(phase.name, Date.now());
        this.phaseHistory.push({
            phase: phase.name,
            enteredAt: new Date().toISOString(),
            icon: phase.icon
        });

        this.emit('phase-changed', {
            executionId: this.executionId,
            phase: phase.name,
            icon: phase.icon,
            description: phase.description
        });

        return this;
    }

    /**
     * Salir de la fase actual
     */
    exitPhase() {
        if (!this.currentPhase) return this;

        const startTime = this.phaseStartTimes.get(this.currentPhase);
        const duration = startTime ? Date.now() - startTime : 0;

        this.emit('phase-exited', {
            executionId: this.executionId,
            phase: this.currentPhase,
            duration
        });

        return this;
    }

    /**
     * Obtener la fase actual
     */
    getCurrentPhase() {
        return this.currentPhase ? Phases[this.currentPhase] : null;
    }

    /**
     * Obtener historial de fases
     */
    getHistory() {
        return [...this.phaseHistory];
    }

    /**
     * Obtener duración de una fase
     */
    getPhaseDuration(phaseName) {
        const startTime = this.phaseStartTimes.get(phaseName.toUpperCase());
        if (!startTime) return null;

        const endTime = Date.now();
        return endTime - startTime;
    }

    /**
     * Completar el ciclo
     */
    completeCycle() {
        this.enterPhase('COMPLETE');

        const totalDuration = this.phaseHistory.length > 0
            ? Date.now() - new Date(this.phaseHistory[0].enteredAt).getTime()
            : 0;

        this.emit('cycle-completed', {
            executionId: this.executionId,
            duration: totalDuration,
            phases: this.getHistory()
        });

        return this;
    }

    /**
     * Obtener resumen del ciclo
     */
    getSummary() {
        return {
            executionId: this.executionId,
            currentPhase: this.currentPhase,
            phaseCount: this.phaseHistory.length,
            history: this.getHistory(),
            durations: Array.from(this.phaseStartTimes.entries()).map(([phase, start]) => ({
                phase,
                duration: Date.now() - start
            }))
        };
    }
}

PhaseTracker.Phases = Phases;

module.exports = PhaseTracker;
