/**
 * ============================================================================
 * BIOMETRIC SCENARIO ENGINE
 * ============================================================================
 *
 * Genera escenarios de prueba para testing biométrico masivo.
 * Cada escenario simula un tipo diferente de fichaje.
 *
 * @version 1.0.0
 * @date 2024-12-14
 * ============================================================================
 */

const crypto = require('crypto');

class BiometricScenarioEngine {
    constructor(config = {}) {
        this.config = config;

        // Definición de escenarios y comportamientos esperados
        this.scenarioDefinitions = {
            HAPPY_PATH: {
                description: 'Fichaje exitoso normal',
                expectedSuccess: true,
                expectedReason: null,
                userState: 'active',
                timing: 'on_time',
                quality: 'good'
            },
            USER_NOT_FOUND: {
                description: 'Rostro no reconocido en el sistema',
                expectedSuccess: false,
                expectedReason: 'NO_MATCH',
                userState: 'unknown',
                timing: 'any',
                quality: 'good'
            },
            LATE_ARRIVAL: {
                description: 'Llegada después del tiempo de tolerancia',
                expectedSuccess: 'conditional', // Depende de política
                expectedReason: 'LATE_ARRIVAL',
                userState: 'active',
                timing: 'late',
                quality: 'good'
            },
            EARLY_ARRIVAL: {
                description: 'Llegada antes del inicio del turno',
                expectedSuccess: 'conditional',
                expectedReason: 'EARLY_ARRIVAL',
                userState: 'active',
                timing: 'early',
                quality: 'good'
            },
            OUTSIDE_SHIFT: {
                description: 'Fichaje fuera del horario del turno asignado',
                expectedSuccess: false,
                expectedReason: 'OUTSIDE_SHIFT',
                userState: 'active',
                timing: 'outside',
                quality: 'good'
            },
            DUPLICATE_SHORT: {
                description: 'Intento de fichaje duplicado en menos de 5 minutos',
                expectedSuccess: false,
                expectedReason: 'DUPLICATE_DETECTED',
                userState: 'active',
                timing: 'duplicate_short',
                quality: 'good'
            },
            DUPLICATE_MEDIUM: {
                description: 'Múltiples fichajes en menos de 30 minutos',
                expectedSuccess: false,
                expectedReason: 'DUPLICATE_DETECTED',
                userState: 'active',
                timing: 'duplicate_medium',
                quality: 'good'
            },
            LOW_QUALITY: {
                description: 'Imagen de baja calidad para reconocimiento',
                expectedSuccess: false,
                expectedReason: 'LOW_QUALITY',
                userState: 'active',
                timing: 'on_time',
                quality: 'low'
            },
            SUSPENDED_USER: {
                description: 'Usuario con suspensión disciplinaria activa',
                expectedSuccess: false,
                expectedReason: 'employee_suspended',
                userState: 'suspended',
                timing: 'on_time',
                quality: 'good'
            },
            RAPID_FIRE: {
                description: 'Ráfaga de requests para stress testing',
                expectedSuccess: 'any', // Solo verificamos que no crashee
                expectedReason: null,
                userState: 'active',
                timing: 'rapid',
                quality: 'good'
            }
        };
    }

    /**
     * Generar lista de escenarios según distribución
     */
    generateScenarios(count, distribution, testUsers) {
        const scenarios = [];

        // Calcular cantidad de cada tipo según distribución
        const scenarioTypes = Object.keys(distribution);
        const scenarioCounts = {};

        scenarioTypes.forEach(type => {
            scenarioCounts[type] = Math.floor(count * distribution[type]);
        });

        // Ajustar para llegar exactamente a count
        let totalAssigned = Object.values(scenarioCounts).reduce((a, b) => a + b, 0);
        while (totalAssigned < count) {
            const randomType = scenarioTypes[Math.floor(Math.random() * scenarioTypes.length)];
            scenarioCounts[randomType]++;
            totalAssigned++;
        }

        // Generar escenarios de cada tipo
        scenarioTypes.forEach(type => {
            for (let i = 0; i < scenarioCounts[type]; i++) {
                scenarios.push(this.createScenario(type, testUsers, i));
            }
        });

        // Mezclar aleatoriamente (Fisher-Yates shuffle)
        for (let i = scenarios.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [scenarios[i], scenarios[j]] = [scenarios[j], scenarios[i]];
        }

        return scenarios;
    }

    /**
     * Crear un escenario individual
     */
    createScenario(type, testUsers, index) {
        const definition = this.scenarioDefinitions[type];
        const scenarioId = `${type}-${Date.now()}-${index}-${crypto.randomBytes(4).toString('hex')}`;

        // Seleccionar usuario según el tipo de escenario
        let user = null;
        let embedding = null;

        switch (definition.userState) {
            case 'active':
                // Usuario válido y activo
                user = this.selectRandomUser(testUsers, 'active');
                embedding = user?.embedding;
                break;

            case 'suspended':
                // Usuario suspendido
                user = this.selectRandomUser(testUsers, 'suspended');
                embedding = user?.embedding;
                break;

            case 'unknown':
                // Generar embedding falso que no matcheará
                embedding = this.generateFakeEmbedding();
                user = null;
                break;
        }

        // Calcular timing
        const timing = this.calculateTiming(definition.timing);

        // Calcular quality score
        const qualityScore = this.calculateQualityScore(definition.quality);

        return {
            id: scenarioId,
            type: type,
            definition: definition,
            user: user,
            embedding: embedding,
            timing: timing,
            qualityScore: qualityScore,
            metadata: {
                createdAt: new Date().toISOString(),
                index: index
            }
        };
    }

    /**
     * Seleccionar usuario aleatorio según estado
     */
    selectRandomUser(testUsers, state) {
        const filteredUsers = testUsers.filter(u => {
            if (state === 'active') return !u.isSuspended;
            if (state === 'suspended') return u.isSuspended;
            return true;
        });

        if (filteredUsers.length === 0) {
            return testUsers[Math.floor(Math.random() * testUsers.length)];
        }

        return filteredUsers[Math.floor(Math.random() * filteredUsers.length)];
    }

    /**
     * Generar embedding falso para USER_NOT_FOUND
     */
    generateFakeEmbedding() {
        // Generar array de 128 floats aleatorios (formato face-api.js)
        return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    }

    /**
     * Calcular timing según tipo
     */
    calculateTiming(timingType) {
        const now = new Date();
        const shiftStart = new Date(now);
        shiftStart.setHours(9, 0, 0, 0); // Turno empieza a las 9:00

        const toleranceMs = (this.config.shiftConfig?.toleranceMinutes || 15) * 60 * 1000;
        const earlyEntryMs = (this.config.shiftConfig?.earlyEntryMinutes || 30) * 60 * 1000;

        let clockInTime;
        let minutesOffset;

        switch (timingType) {
            case 'on_time':
                // Entre 0 y tolerancia
                minutesOffset = Math.floor(Math.random() * 15);
                clockInTime = new Date(shiftStart.getTime() + minutesOffset * 60000);
                break;

            case 'late':
                // Después de tolerancia (15-60 min tarde)
                minutesOffset = 15 + Math.floor(Math.random() * 45);
                clockInTime = new Date(shiftStart.getTime() + minutesOffset * 60000);
                break;

            case 'early':
                // Antes del turno (1-60 min antes)
                minutesOffset = 1 + Math.floor(Math.random() * 60);
                clockInTime = new Date(shiftStart.getTime() - minutesOffset * 60000);
                break;

            case 'outside':
                // Completamente fuera del turno (3+ horas antes o después)
                const direction = Math.random() > 0.5 ? 1 : -1;
                minutesOffset = 180 + Math.floor(Math.random() * 120);
                clockInTime = new Date(shiftStart.getTime() + (direction * minutesOffset * 60000));
                break;

            case 'duplicate_short':
                // Será procesado por el orchestrator
                clockInTime = now;
                minutesOffset = 0;
                break;

            case 'duplicate_medium':
                // Será procesado por el orchestrator
                clockInTime = now;
                minutesOffset = 0;
                break;

            case 'rapid':
                // Ahora mismo
                clockInTime = now;
                minutesOffset = 0;
                break;

            default:
                clockInTime = now;
                minutesOffset = 0;
        }

        return {
            type: timingType,
            clockInTime: clockInTime,
            minutesOffset: minutesOffset,
            shiftStart: shiftStart,
            isLate: clockInTime > new Date(shiftStart.getTime() + toleranceMs),
            isEarly: clockInTime < new Date(shiftStart.getTime() - earlyEntryMs)
        };
    }

    /**
     * Calcular quality score según tipo
     */
    calculateQualityScore(qualityType) {
        switch (qualityType) {
            case 'good':
                // Entre 0.8 y 1.0
                return 0.8 + Math.random() * 0.2;

            case 'low':
                // Entre 0.3 y 0.6
                return 0.3 + Math.random() * 0.3;

            case 'medium':
                // Entre 0.6 y 0.8
                return 0.6 + Math.random() * 0.2;

            default:
                return 0.9;
        }
    }

    /**
     * Preparar request para un escenario
     */
    prepareRequest(scenario) {
        const endpoint = '/api/v2/biometric-attendance/verify-test';

        // Preparar body según escenario
        const body = {
            // Datos del escenario
            scenarioId: scenario.id,
            scenarioType: scenario.type,

            // Datos biométricos
            embedding: scenario.embedding,
            qualityScore: scenario.qualityScore,

            // Metadata
            deviceInfo: {
                type: 'kiosk',
                model: 'test-device',
                os: 'android'
            },

            // Timing simulado
            timestamp: scenario.timing.clockInTime.toISOString(),

            // Flags para testing
            testMode: true,
            bypassCamera: true
        };

        // Si hay usuario, agregar su ID para validación
        if (scenario.user) {
            body.expectedUserId = scenario.user.id;
            body.userId = scenario.user.id;
        }

        return {
            method: 'POST',
            endpoint: endpoint,
            body: body,
            headers: {
                'X-Scenario-Type': scenario.type,
                'X-Test-Scenario-Id': scenario.id
            }
        };
    }

    /**
     * Obtener comportamiento esperado para un tipo de escenario
     */
    getExpectedBehavior(type) {
        return this.scenarioDefinitions[type] || {
            description: 'Escenario desconocido',
            expectedSuccess: null,
            expectedReason: null
        };
    }

    /**
     * Validar distribución (debe sumar 1.0)
     */
    validateDistribution(distribution) {
        const sum = Object.values(distribution).reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1.0) > 0.001) {
            throw new Error(`Distribución inválida: suma ${sum}, debe ser 1.0`);
        }
        return true;
    }

    /**
     * Obtener estadísticas de escenarios generados
     */
    getScenarioStats(scenarios) {
        const stats = {};

        scenarios.forEach(s => {
            stats[s.type] = (stats[s.type] || 0) + 1;
        });

        return {
            total: scenarios.length,
            byType: stats,
            distribution: Object.entries(stats).map(([type, count]) => ({
                type,
                count,
                percentage: ((count / scenarios.length) * 100).toFixed(2) + '%'
            }))
        };
    }
}

module.exports = BiometricScenarioEngine;
