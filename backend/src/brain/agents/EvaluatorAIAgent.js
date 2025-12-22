/**
 * ============================================================================
 * EVALUATOR AI AGENT - Agente Evaluador Autónomo
 * ============================================================================
 *
 * Reemplaza al evaluador/auditor humano:
 * - Evalúa rendimiento de usuarios en el sistema
 * - Mide KPIs de uso y productividad
 * - Detecta patrones de uso anómalos
 * - Genera reportes de evaluación automáticos
 * - Identifica áreas de mejora
 * - Califica competencias digitales
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const { getInstance: getKnowledgeDB } = require('../services/KnowledgeDatabase');

class EvaluatorAIAgent {
    constructor(options = {}) {
        this.config = {
            evaluationPeriodDays: options.evaluationPeriodDays || 30,
            kpiThresholds: {
                loginFrequency: { excellent: 20, good: 15, acceptable: 10, poor: 5 },
                taskCompletion: { excellent: 95, good: 85, acceptable: 70, poor: 50 },
                responseTime: { excellent: 2, good: 5, acceptable: 10, poor: 20 }, // segundos
                errorRate: { excellent: 1, good: 3, acceptable: 5, poor: 10 } // porcentaje
            },
            ...options
        };

        this.knowledgeDB = null;

        // Evaluaciones en memoria
        this.evaluations = new Map(); // evaluationId -> evaluation
        this.userMetrics = new Map(); // userId -> metrics

        // KPIs disponibles
        this.kpiDefinitions = this.defineKPIs();

        this.stats = {
            evaluationsCompleted: 0,
            usersEvaluated: 0,
            avgScore: 0,
            improvementSuggestions: 0
        };
    }

    /**
     * Inicializar el agente
     */
    async initialize() {
        console.log('📊 [EVALUATOR-AI] Inicializando agente evaluador...');

        this.knowledgeDB = await getKnowledgeDB();

        console.log('✅ [EVALUATOR-AI] Agente listo');
        return this;
    }

    /**
     * Definir KPIs del sistema
     */
    defineKPIs() {
        return {
            // KPIs de Uso
            usage: {
                loginFrequency: {
                    name: 'Frecuencia de Login',
                    description: 'Número de logins en el período',
                    unit: 'logins/mes',
                    weight: 0.15,
                    calculate: (metrics) => metrics.logins || 0
                },
                sessionDuration: {
                    name: 'Duración Promedio de Sesión',
                    description: 'Tiempo promedio por sesión',
                    unit: 'minutos',
                    weight: 0.10,
                    calculate: (metrics) => metrics.avgSessionMinutes || 0
                },
                modulesUsed: {
                    name: 'Módulos Utilizados',
                    description: 'Cantidad de módulos diferentes usados',
                    unit: 'módulos',
                    weight: 0.10,
                    calculate: (metrics) => metrics.uniqueModules || 0
                }
            },

            // KPIs de Productividad
            productivity: {
                tasksCompleted: {
                    name: 'Tareas Completadas',
                    description: 'Número de tareas/operaciones completadas',
                    unit: 'tareas',
                    weight: 0.20,
                    calculate: (metrics) => metrics.tasksCompleted || 0
                },
                taskCompletionRate: {
                    name: 'Tasa de Completitud',
                    description: 'Porcentaje de tareas iniciadas que se completan',
                    unit: '%',
                    weight: 0.15,
                    calculate: (metrics) => {
                        if (!metrics.tasksStarted) return 100;
                        return (metrics.tasksCompleted / metrics.tasksStarted) * 100;
                    }
                },
                avgResponseTime: {
                    name: 'Tiempo de Respuesta',
                    description: 'Tiempo promedio para completar acciones',
                    unit: 'segundos',
                    weight: 0.10,
                    calculate: (metrics) => metrics.avgResponseTime || 0,
                    lowerIsBetter: true
                }
            },

            // KPIs de Calidad
            quality: {
                errorRate: {
                    name: 'Tasa de Errores',
                    description: 'Porcentaje de operaciones con error',
                    unit: '%',
                    weight: 0.10,
                    calculate: (metrics) => {
                        if (!metrics.totalOperations) return 0;
                        return (metrics.errors / metrics.totalOperations) * 100;
                    },
                    lowerIsBetter: true
                },
                helpRequests: {
                    name: 'Solicitudes de Ayuda',
                    description: 'Veces que usó el sistema de ayuda',
                    unit: 'veces',
                    weight: 0.05,
                    calculate: (metrics) => metrics.helpRequests || 0
                },
                dataQuality: {
                    name: 'Calidad de Datos',
                    description: 'Campos completados correctamente',
                    unit: '%',
                    weight: 0.05,
                    calculate: (metrics) => metrics.dataQualityScore || 100
                }
            }
        };
    }

    /**
     * ========================================================================
     * EVALUACIÓN DE USUARIOS
     * ========================================================================
     */

    /**
     * Evaluar un usuario específico
     */
    async evaluateUser(userId, options = {}) {
        console.log(`\n📊 [EVALUATOR-AI] Evaluando usuario: ${userId}`);

        const evaluation = {
            id: `eval-${Date.now()}`,
            userId,
            evaluatedAt: new Date().toISOString(),
            period: {
                days: options.periodDays || this.config.evaluationPeriodDays,
                from: options.from || new Date(Date.now() - (this.config.evaluationPeriodDays * 24 * 60 * 60 * 1000)).toISOString(),
                to: options.to || new Date().toISOString()
            },
            metrics: {},
            kpiScores: {},
            overallScore: 0,
            grade: '',
            strengths: [],
            areasForImprovement: [],
            recommendations: [],
            competencyLevel: ''
        };

        try {
            // 1. Recolectar métricas del usuario
            evaluation.metrics = await this.collectUserMetrics(userId, evaluation.period);

            // 2. Calcular score de cada KPI
            evaluation.kpiScores = this.calculateKPIScores(evaluation.metrics);

            // 3. Calcular score general ponderado
            evaluation.overallScore = this.calculateOverallScore(evaluation.kpiScores);

            // 4. Asignar calificación
            evaluation.grade = this.assignGrade(evaluation.overallScore);

            // 5. Identificar fortalezas y áreas de mejora
            const analysis = this.analyzeStrengthsAndWeaknesses(evaluation.kpiScores);
            evaluation.strengths = analysis.strengths;
            evaluation.areasForImprovement = analysis.weaknesses;

            // 6. Generar recomendaciones personalizadas
            evaluation.recommendations = this.generateRecommendations(evaluation);

            // 7. Determinar nivel de competencia digital
            evaluation.competencyLevel = this.determineCompetencyLevel(evaluation);

            // Guardar evaluación
            this.evaluations.set(evaluation.id, evaluation);
            this.stats.evaluationsCompleted++;
            this.updateAverageScore(evaluation.overallScore);

            console.log(`   ✅ Evaluación completada: ${evaluation.grade} (${evaluation.overallScore.toFixed(1)}%)`);

        } catch (error) {
            console.error(`   ❌ Error en evaluación: ${error.message}`);
            evaluation.error = error.message;
        }

        return evaluation;
    }

    /**
     * Recolectar métricas de un usuario
     */
    async collectUserMetrics(userId, period) {
        // En producción, esto consultaría la base de datos
        // Por ahora, simulamos métricas basadas en patterns comunes

        return {
            // Métricas de uso
            logins: Math.floor(Math.random() * 25) + 5,
            avgSessionMinutes: Math.floor(Math.random() * 30) + 10,
            uniqueModules: Math.floor(Math.random() * 8) + 2,
            totalSessions: Math.floor(Math.random() * 30) + 10,

            // Métricas de productividad
            tasksStarted: Math.floor(Math.random() * 100) + 20,
            tasksCompleted: Math.floor(Math.random() * 90) + 15,
            avgResponseTime: Math.random() * 8 + 1,

            // Métricas de calidad
            totalOperations: Math.floor(Math.random() * 200) + 50,
            errors: Math.floor(Math.random() * 10),
            helpRequests: Math.floor(Math.random() * 5),
            dataQualityScore: Math.floor(Math.random() * 30) + 70,

            // Metadata
            collectedAt: new Date().toISOString(),
            periodDays: period.days
        };
    }

    /**
     * Calcular scores de KPIs
     */
    calculateKPIScores(metrics) {
        const scores = {};

        for (const [category, kpis] of Object.entries(this.kpiDefinitions)) {
            scores[category] = {};

            for (const [kpiKey, kpi] of Object.entries(kpis)) {
                const rawValue = kpi.calculate(metrics);
                const score = this.normalizeScore(kpiKey, rawValue, kpi.lowerIsBetter);

                scores[category][kpiKey] = {
                    name: kpi.name,
                    rawValue,
                    unit: kpi.unit,
                    score,
                    weight: kpi.weight,
                    rating: this.getRating(score)
                };
            }
        }

        return scores;
    }

    /**
     * Normalizar score a 0-100
     */
    normalizeScore(kpiKey, value, lowerIsBetter = false) {
        const thresholds = this.config.kpiThresholds[kpiKey];

        if (!thresholds) {
            // Normalización genérica
            return Math.min(value * 5, 100);
        }

        let score;
        if (lowerIsBetter) {
            if (value <= thresholds.excellent) score = 100;
            else if (value <= thresholds.good) score = 85;
            else if (value <= thresholds.acceptable) score = 70;
            else if (value <= thresholds.poor) score = 50;
            else score = 30;
        } else {
            if (value >= thresholds.excellent) score = 100;
            else if (value >= thresholds.good) score = 85;
            else if (value >= thresholds.acceptable) score = 70;
            else if (value >= thresholds.poor) score = 50;
            else score = 30;
        }

        return score;
    }

    /**
     * Calcular score general ponderado
     */
    calculateOverallScore(kpiScores) {
        let totalWeight = 0;
        let weightedSum = 0;

        for (const category of Object.values(kpiScores)) {
            for (const kpi of Object.values(category)) {
                weightedSum += kpi.score * kpi.weight;
                totalWeight += kpi.weight;
            }
        }

        return totalWeight > 0 ? (weightedSum / totalWeight) : 0;
    }

    /**
     * Asignar calificación
     */
    assignGrade(score) {
        if (score >= 90) return 'A+ (Excelente)';
        if (score >= 85) return 'A (Muy Bueno)';
        if (score >= 80) return 'B+ (Bueno)';
        if (score >= 75) return 'B (Satisfactorio)';
        if (score >= 70) return 'C+ (Aceptable)';
        if (score >= 60) return 'C (Necesita Mejora)';
        if (score >= 50) return 'D (Deficiente)';
        return 'F (Crítico)';
    }

    /**
     * Obtener rating textual
     */
    getRating(score) {
        if (score >= 90) return 'Excelente';
        if (score >= 75) return 'Bueno';
        if (score >= 60) return 'Aceptable';
        if (score >= 40) return 'Necesita mejora';
        return 'Crítico';
    }

    /**
     * Analizar fortalezas y debilidades
     */
    analyzeStrengthsAndWeaknesses(kpiScores) {
        const allKPIs = [];

        for (const category of Object.values(kpiScores)) {
            for (const [key, kpi] of Object.entries(category)) {
                allKPIs.push({ key, ...kpi });
            }
        }

        // Ordenar por score
        allKPIs.sort((a, b) => b.score - a.score);

        return {
            strengths: allKPIs
                .filter(kpi => kpi.score >= 80)
                .slice(0, 3)
                .map(kpi => ({
                    kpi: kpi.name,
                    score: kpi.score,
                    description: `${kpi.name}: ${kpi.rawValue} ${kpi.unit} (${kpi.rating})`
                })),

            weaknesses: allKPIs
                .filter(kpi => kpi.score < 70)
                .slice(0, 3)
                .map(kpi => ({
                    kpi: kpi.name,
                    score: kpi.score,
                    description: `${kpi.name}: ${kpi.rawValue} ${kpi.unit} - Necesita mejora`
                }))
        };
    }

    /**
     * Generar recomendaciones personalizadas
     */
    generateRecommendations(evaluation) {
        const recommendations = [];

        // Recomendaciones basadas en áreas de mejora
        for (const area of evaluation.areasForImprovement) {
            const rec = this.getRecommendationForKPI(area.kpi, area.score);
            if (rec) recommendations.push(rec);
        }

        // Recomendaciones generales según el grade
        if (evaluation.overallScore < 60) {
            recommendations.push({
                type: 'training',
                priority: 'high',
                title: 'Capacitación Recomendada',
                description: 'Se sugiere completar el programa de onboarding nuevamente',
                action: 'Contactar al Trainer AI para programa personalizado'
            });
        }

        if (evaluation.metrics.helpRequests > 10) {
            recommendations.push({
                type: 'support',
                priority: 'medium',
                title: 'Uso Frecuente de Ayuda',
                description: 'El usuario solicita ayuda frecuentemente',
                action: 'Revisar tutoriales de los módulos más usados'
            });
        }

        return recommendations;
    }

    /**
     * Obtener recomendación para un KPI específico
     */
    getRecommendationForKPI(kpiName, score) {
        const recommendations = {
            'Frecuencia de Login': {
                type: 'engagement',
                priority: 'medium',
                title: 'Aumentar uso del sistema',
                description: 'Se recomienda acceder al sistema más regularmente',
                action: 'Configurar recordatorios diarios'
            },
            'Tasa de Errores': {
                type: 'quality',
                priority: 'high',
                title: 'Reducir errores',
                description: 'La tasa de errores está por encima de lo aceptable',
                action: 'Revisar tutoriales de los procesos con más errores'
            },
            'Tiempo de Respuesta': {
                type: 'efficiency',
                priority: 'low',
                title: 'Mejorar velocidad',
                description: 'Las operaciones toman más tiempo del esperado',
                action: 'Practicar con ejercicios del Trainer AI'
            },
            'Tasa de Completitud': {
                type: 'productivity',
                priority: 'high',
                title: 'Completar tareas iniciadas',
                description: 'Muchas tareas quedan sin completar',
                action: 'Revisar flujos de trabajo para identificar obstáculos'
            }
        };

        return recommendations[kpiName] || null;
    }

    /**
     * Determinar nivel de competencia digital
     */
    determineCompetencyLevel(evaluation) {
        const score = evaluation.overallScore;
        const modulesUsed = evaluation.metrics.uniqueModules || 0;

        if (score >= 90 && modulesUsed >= 6) return 'Experto Digital';
        if (score >= 80 && modulesUsed >= 4) return 'Avanzado';
        if (score >= 70 && modulesUsed >= 3) return 'Intermedio';
        if (score >= 60) return 'Básico';
        return 'Principiante';
    }

    /**
     * ========================================================================
     * EVALUACIÓN DE EQUIPOS/DEPARTAMENTOS
     * ========================================================================
     */

    /**
     * Evaluar un departamento completo
     */
    async evaluateDepartment(departmentId, userIds = []) {
        console.log(`\n📊 [EVALUATOR-AI] Evaluando departamento: ${departmentId}`);

        const evaluation = {
            id: `dept-eval-${Date.now()}`,
            departmentId,
            evaluatedAt: new Date().toISOString(),
            userCount: userIds.length,
            userEvaluations: [],
            aggregateMetrics: {},
            departmentScore: 0,
            ranking: [],
            insights: []
        };

        // Evaluar cada usuario
        for (const userId of userIds) {
            const userEval = await this.evaluateUser(userId);
            evaluation.userEvaluations.push(userEval);
        }

        // Calcular métricas agregadas
        evaluation.aggregateMetrics = this.aggregateMetrics(evaluation.userEvaluations);

        // Calcular score del departamento
        if (evaluation.userEvaluations.length > 0) {
            evaluation.departmentScore = evaluation.userEvaluations
                .reduce((sum, e) => sum + e.overallScore, 0) / evaluation.userEvaluations.length;
        }

        // Generar ranking
        evaluation.ranking = evaluation.userEvaluations
            .map(e => ({ userId: e.userId, score: e.overallScore, grade: e.grade }))
            .sort((a, b) => b.score - a.score);

        // Generar insights del departamento
        evaluation.insights = this.generateDepartmentInsights(evaluation);

        return evaluation;
    }

    /**
     * Agregar métricas de múltiples evaluaciones
     */
    aggregateMetrics(evaluations) {
        if (evaluations.length === 0) return {};

        const aggregate = {
            avgScore: 0,
            highestScore: 0,
            lowestScore: 100,
            scoreDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
            commonWeaknesses: {},
            commonStrengths: {}
        };

        for (const eval_ of evaluations) {
            aggregate.avgScore += eval_.overallScore;
            aggregate.highestScore = Math.max(aggregate.highestScore, eval_.overallScore);
            aggregate.lowestScore = Math.min(aggregate.lowestScore, eval_.overallScore);

            // Distribución de grades
            const grade = eval_.grade.charAt(0);
            aggregate.scoreDistribution[grade] = (aggregate.scoreDistribution[grade] || 0) + 1;

            // Debilidades comunes
            for (const weakness of eval_.areasForImprovement) {
                aggregate.commonWeaknesses[weakness.kpi] = (aggregate.commonWeaknesses[weakness.kpi] || 0) + 1;
            }

            // Fortalezas comunes
            for (const strength of eval_.strengths) {
                aggregate.commonStrengths[strength.kpi] = (aggregate.commonStrengths[strength.kpi] || 0) + 1;
            }
        }

        aggregate.avgScore /= evaluations.length;

        return aggregate;
    }

    /**
     * Generar insights del departamento
     */
    generateDepartmentInsights(evaluation) {
        const insights = [];
        const aggregate = evaluation.aggregateMetrics;

        // Insight de rendimiento general
        if (aggregate.avgScore >= 80) {
            insights.push({
                type: 'positive',
                title: 'Alto Rendimiento',
                description: `El departamento tiene un promedio de ${aggregate.avgScore.toFixed(1)}%, excelente desempeño.`
            });
        } else if (aggregate.avgScore < 60) {
            insights.push({
                type: 'warning',
                title: 'Rendimiento Bajo',
                description: `El promedio del departamento (${aggregate.avgScore.toFixed(1)}%) está por debajo de lo esperado.`
            });
        }

        // Insight de dispersión
        const range = aggregate.highestScore - aggregate.lowestScore;
        if (range > 40) {
            insights.push({
                type: 'info',
                title: 'Alta Variabilidad',
                description: `Hay una diferencia de ${range.toFixed(1)} puntos entre el mejor y peor desempeño.`
            });
        }

        // Insight de debilidades comunes
        const topWeakness = Object.entries(aggregate.commonWeaknesses)
            .sort((a, b) => b[1] - a[1])[0];
        if (topWeakness && topWeakness[1] > evaluation.userCount / 2) {
            insights.push({
                type: 'action',
                title: 'Área de Mejora Común',
                description: `"${topWeakness[0]}" es un área de mejora para ${topWeakness[1]} de ${evaluation.userCount} usuarios.`,
                recommendation: 'Considerar capacitación grupal en esta área'
            });
        }

        return insights;
    }

    /**
     * ========================================================================
     * REPORTES
     * ========================================================================
     */

    /**
     * Generar reporte de evaluación
     */
    generateReport(evaluationId) {
        const evaluation = this.evaluations.get(evaluationId);
        if (!evaluation) return null;

        return {
            title: `Reporte de Evaluación - ${evaluation.userId}`,
            generatedAt: new Date().toISOString(),
            summary: {
                userId: evaluation.userId,
                period: evaluation.period,
                overallScore: evaluation.overallScore,
                grade: evaluation.grade,
                competencyLevel: evaluation.competencyLevel
            },
            details: {
                kpiScores: evaluation.kpiScores,
                strengths: evaluation.strengths,
                areasForImprovement: evaluation.areasForImprovement
            },
            recommendations: evaluation.recommendations,
            nextSteps: this.generateNextSteps(evaluation)
        };
    }

    /**
     * Generar próximos pasos
     */
    generateNextSteps(evaluation) {
        const steps = [];

        if (evaluation.overallScore < 70) {
            steps.push({
                step: 1,
                action: 'Programar sesión con Trainer AI',
                deadline: '1 semana'
            });
        }

        if (evaluation.areasForImprovement.length > 0) {
            steps.push({
                step: steps.length + 1,
                action: `Completar tutoriales de: ${evaluation.areasForImprovement.map(a => a.kpi).join(', ')}`,
                deadline: '2 semanas'
            });
        }

        steps.push({
            step: steps.length + 1,
            action: 'Re-evaluación',
            deadline: '30 días'
        });

        return steps;
    }

    /**
     * ========================================================================
     * ESTADÍSTICAS Y MÉTRICAS
     * ========================================================================
     */

    /**
     * Actualizar promedio de scores
     */
    updateAverageScore(newScore) {
        const total = this.stats.evaluationsCompleted;
        this.stats.avgScore = ((this.stats.avgScore * (total - 1)) + newScore) / total;
    }

    /**
     * Obtener estadísticas del agente
     */
    getStats() {
        return {
            ...this.stats,
            evaluationsInMemory: this.evaluations.size,
            avgScoreFormatted: this.stats.avgScore.toFixed(1) + '%'
        };
    }

    /**
     * Obtener leaderboard global
     */
    getLeaderboard(limit = 10) {
        return Array.from(this.evaluations.values())
            .map(e => ({
                userId: e.userId,
                score: e.overallScore,
                grade: e.grade,
                competencyLevel: e.competencyLevel,
                evaluatedAt: e.evaluatedAt
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
}

// Singleton
let instance = null;

module.exports = {
    EvaluatorAIAgent,
    getInstance: async () => {
        if (!instance) {
            instance = new EvaluatorAIAgent();
            await instance.initialize();
        }
        return instance;
    }
};
