/**
 * ============================================================================
 * INTEGRACIÓN: Risk Intelligence → Training
 * ============================================================================
 *
 * CIRCUITO DE INTEGRACIÓN:
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │                  RISK INTELLIGENCE → TRAINING                         │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                       │
 *  │  ┌─────────────────────────────────────────────────────────────────┐ │
 *  │  │                    SCORE CRÍTICO                                │ │
 *  │  ├─────────────────────────────────────────────────────────────────┤ │
 *  │  │                                                                  │ │
 *  │  │  CÁLCULO           SCORE            CAPACITACIÓN                │ │
 *  │  │  DE RIESGO   ──▶   CRÍTICO    ──▶   PREVENTIVA                  │ │
 *  │  │     │               (≥80)               │                        │ │
 *  │  │     ▼                │                  ▼                        │ │
 *  │  │  • Asistencia       ▼               • Auto-asignar              │ │
 *  │  │  • Sanciones    Categoría:          • Prioridad según           │ │
 *  │  │  • HSE          • attendance_risk     score                     │ │
 *  │  │  • Desempeño    • safety_risk       • Notificar manager         │ │
 *  │  │  • Médico       • compliance_risk                               │ │
 *  │  │                                                                  │ │
 *  │  └─────────────────────────────────────────────────────────────────┘ │
 *  │                                                                       │
 *  │  ┌─────────────────────────────────────────────────────────────────┐ │
 *  │  │                    ALERTA ACTIVA                                │ │
 *  │  ├─────────────────────────────────────────────────────────────────┤ │
 *  │  │                                                                  │ │
 *  │  │  ALERTA            CATEGORÍA         CAPACITACIÓN               │ │
 *  │  │  DISPARADA    ──▶  DE RIESGO   ──▶   ESPECÍFICA                 │ │
 *  │  │     │                  │                  │                      │ │
 *  │  │     ▼                  ▼                  ▼                      │ │
 *  │  │  • 3+ tardanzas   attendance_risk   "Gestión del tiempo"        │ │
 *  │  │  • HSE repeat     safety_risk       "Seguridad laboral"         │ │
 *  │  │  • Sanción grave  compliance_risk   "Cumplimiento normativo"    │ │
 *  │  │  • Bajo rendim.   performance_risk  "Mejora desempeño"          │ │
 *  │  │                                                                  │ │
 *  │  └─────────────────────────────────────────────────────────────────┘ │
 *  │                                                                       │
 *  │  ┌─────────────────────────────────────────────────────────────────┐ │
 *  │  │                    TREND NEGATIVO                               │ │
 *  │  ├─────────────────────────────────────────────────────────────────┤ │
 *  │  │                                                                  │ │
 *  │  │  ANÁLISIS         TREND           INTERVENCIÓN                  │ │
 *  │  │  HISTÓRICO  ──▶   NEGATIVO  ──▶   TEMPRANA                      │ │
 *  │  │     │               (3 meses)          │                         │ │
 *  │  │     ▼                  │               ▼                         │ │
 *  │  │  • Comparar           ▼            • Capacitación                │ │
 *  │  │    con período     Deterioro         preventiva                  │ │
 *  │  │    anterior        sostenido       • Antes de llegar             │ │
 *  │  │                                      a score crítico             │ │
 *  │  │                                                                  │ │
 *  │  └─────────────────────────────────────────────────────────────────┘ │
 *  │                                                                       │
 *  │  MAPEO CATEGORÍA → CAPACITACIÓN:                                     │
 *  │  ───────────────────────────────                                     │
 *  │  • attendance_risk    → "Gestión tiempo", "Puntualidad"              │
 *  │  • safety_risk        → "Seguridad laboral", "EPP"                   │
 *  │  • compliance_risk    → "Cumplimiento normativo", "Políticas"        │
 *  │  • performance_risk   → "Mejora desempeño", "Productividad"          │
 *  │  • medical_risk       → "Salud ocupacional", "Prevención"            │
 *  │  • flight_risk        → "Desarrollo carrera", "Engagement"           │
 *  │                                                                       │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

const TrainingEcosystemHub = require('./TrainingEcosystemHub');
const { sequelize } = require('../../config/database');

class RiskTrainingIntegration {

    /**
     * Mapeo de categorías de riesgo a capacitaciones
     */
    static RISK_TRAINING_MAP = {
        attendance_risk: {
            keywords: ['gestión tiempo', 'puntualidad', 'asistencia'],
            priority_thresholds: { 80: 'critical', 60: 'high', 40: 'normal' }
        },
        safety_risk: {
            keywords: ['seguridad laboral', 'EPP', 'prevención'],
            priority_thresholds: { 80: 'critical', 60: 'high', 40: 'normal' }
        },
        compliance_risk: {
            keywords: ['cumplimiento', 'normativa', 'políticas'],
            priority_thresholds: { 80: 'critical', 60: 'high', 40: 'normal' }
        },
        performance_risk: {
            keywords: ['desempeño', 'productividad', 'mejora continua'],
            priority_thresholds: { 80: 'high', 60: 'normal', 40: 'low' }
        },
        medical_risk: {
            keywords: ['salud ocupacional', 'prevención', 'bienestar'],
            priority_thresholds: { 80: 'high', 60: 'normal', 40: 'low' }
        },
        flight_risk: {
            keywords: ['desarrollo', 'carrera', 'engagement', 'liderazgo'],
            priority_thresholds: { 80: 'high', 60: 'normal', 40: 'low' }
        }
    };

    /**
     * Hook: Cuando se detecta un score de riesgo crítico
     * Llamar desde: Risk Intelligence al calcular score
     */
    static async onCriticalRiskScore(params) {
        const { userId, companyId, riskCategory, riskScore, alertId, riskFactors } = params;

        console.log(`📊 [RISK→TRAINING] Score crítico: ${riskCategory} = ${riskScore} para user ${userId}`);

        const mapping = this.RISK_TRAINING_MAP[riskCategory];

        if (!mapping) {
            console.warn(`⚠️ [RISK→TRAINING] Categoría no mapeada: ${riskCategory}`);
            return { success: false, error: 'Categoría de riesgo no mapeada' };
        }

        // Determinar prioridad según score
        let priority = 'normal';
        for (const [threshold, prio] of Object.entries(mapping.priority_thresholds).sort((a, b) => b[0] - a[0])) {
            if (riskScore >= parseInt(threshold)) {
                priority = prio;
                break;
            }
        }

        return TrainingEcosystemHub.onCriticalRiskScore({
            userId,
            companyId,
            riskCategory,
            riskScore,
            alertId
        });
    }

    /**
     * Hook: Cuando se activa una alerta de riesgo
     */
    static async onRiskAlert(alert) {
        console.log(`🚨 [RISK→TRAINING] Alerta activada: ${alert.type} para user ${alert.user_id}`);

        const alertTypeMapping = {
            // Alertas de asistencia
            'multiple_tardiness': { category: 'attendance_risk', score: 70 },
            'excessive_absences': { category: 'attendance_risk', score: 80 },
            'pattern_monday_friday': { category: 'attendance_risk', score: 60 },

            // Alertas de seguridad
            'repeated_hse_violations': { category: 'safety_risk', score: 85 },
            'no_epp_detected': { category: 'safety_risk', score: 75 },
            'safety_incident': { category: 'safety_risk', score: 90 },

            // Alertas de compliance
            'policy_violation': { category: 'compliance_risk', score: 70 },
            'pending_trainings': { category: 'compliance_risk', score: 60 },
            'expired_certifications': { category: 'compliance_risk', score: 75 },

            // Alertas de desempeño
            'low_productivity': { category: 'performance_risk', score: 65 },
            'missed_deadlines': { category: 'performance_risk', score: 70 },

            // Alertas médicas
            'expired_medical_cert': { category: 'medical_risk', score: 80 },
            'health_concern': { category: 'medical_risk', score: 70 },

            // Alertas de retención
            'high_flight_risk': { category: 'flight_risk', score: 75 },
            'engagement_drop': { category: 'flight_risk', score: 65 }
        };

        const mapping = alertTypeMapping[alert.type];

        if (!mapping) {
            console.warn(`⚠️ [RISK→TRAINING] Tipo de alerta no mapeado: ${alert.type}`);
            return { success: false, error: 'Tipo de alerta no mapeado' };
        }

        return this.onCriticalRiskScore({
            userId: alert.user_id,
            companyId: alert.company_id,
            riskCategory: mapping.category,
            riskScore: mapping.score,
            alertId: alert.id,
            riskFactors: [alert.type]
        });
    }

    /**
     * Hook: Cuando se detecta un trend negativo sostenido
     */
    static async onNegativeTrend(params) {
        const { userId, companyId, trendCategory, trendDelta, periodMonths, alertId } = params;

        console.log(`📉 [RISK→TRAINING] Trend negativo: ${trendCategory} Δ${trendDelta}% en ${periodMonths} meses`);

        // Solo intervenir si el deterioro es significativo (>15%)
        if (Math.abs(trendDelta) < 15) {
            return { success: true, message: 'Deterioro no significativo, sin intervención' };
        }

        // Calcular score simulado basado en el deterioro
        const simulatedScore = Math.min(90, 50 + Math.abs(trendDelta));

        return this.onCriticalRiskScore({
            userId,
            companyId,
            riskCategory: trendCategory,
            riskScore: simulatedScore,
            alertId,
            riskFactors: [`trend_negativo_${periodMonths}m`]
        });
    }

    /**
     * Obtiene recomendaciones de capacitación basadas en riesgo
     */
    static async getTrainingRecommendations(userId, companyId) {
        console.log(`💡 [RISK→TRAINING] Generando recomendaciones para user ${userId}`);

        try {
            // Obtener scores de riesgo actuales
            const riskScores = await this.getCurrentRiskScores(userId, companyId);

            const recommendations = [];

            for (const [category, score] of Object.entries(riskScores)) {
                if (score < 40) continue; // Sin riesgo significativo

                const mapping = this.RISK_TRAINING_MAP[category];
                if (!mapping) continue;

                // Determinar prioridad
                let priority = 'low';
                for (const [threshold, prio] of Object.entries(mapping.priority_thresholds).sort((a, b) => b[0] - a[0])) {
                    if (score >= parseInt(threshold)) {
                        priority = prio;
                        break;
                    }
                }

                // Buscar capacitación apropiada
                const training = await this.findRecommendedTraining(companyId, mapping.keywords);

                if (training) {
                    recommendations.push({
                        category,
                        riskScore: score,
                        priority,
                        training: {
                            id: training.id,
                            title: training.title,
                            duration: training.duration,
                            category: training.category
                        },
                        reason: `Score de ${category}: ${score}%`
                    });
                }
            }

            // Ordenar por prioridad
            const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
            recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

            return recommendations;

        } catch (error) {
            console.error('❌ [RISK→TRAINING] Error generando recomendaciones:', error);
            return [];
        }
    }

    /**
     * Obtiene scores de riesgo actuales del usuario
     */
    static async getCurrentRiskScores(userId, companyId) {
        // Simulación: En producción esto vendría del módulo Risk Intelligence
        try {
            // Intentar obtener de la tabla de risk scores si existe
            const [scores] = await sequelize.query(`
                SELECT
                    COALESCE(attendance_score, 0) as attendance_risk,
                    COALESCE(safety_score, 0) as safety_risk,
                    COALESCE(compliance_score, 0) as compliance_risk,
                    COALESCE(performance_score, 0) as performance_risk
                FROM risk_intelligence_scores
                WHERE user_id = $1 AND company_id = $2
                ORDER BY calculated_at DESC
                LIMIT 1
            `, { bind: [userId, companyId], type: sequelize.QueryTypes.SELECT });

            if (scores) {
                return scores;
            }

            // Si no hay datos, retornar vacío
            return {};

        } catch (error) {
            // Tabla puede no existir
            return {};
        }
    }

    /**
     * Busca una capacitación recomendada por keywords
     */
    static async findRecommendedTraining(companyId, keywords) {
        const { Training } = require('../../config/database');

        const trainings = await Training.findAll({
            where: {
                company_id: companyId,
                status: 'active'
            }
        });

        let bestMatch = null;
        let bestScore = 0;

        for (const training of trainings) {
            const titleLower = training.title.toLowerCase();
            const descLower = (training.description || '').toLowerCase();
            let score = 0;

            for (const keyword of keywords) {
                const kw = keyword.toLowerCase();
                if (titleLower.includes(kw)) score += 3;
                if (descLower.includes(kw)) score += 1;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = training;
            }
        }

        return bestMatch;
    }

    /**
     * Prioriza capacitaciones existentes basado en riesgo
     */
    static async reprioritizeByRisk(userId, companyId) {
        console.log(`🔄 [RISK→TRAINING] Re-priorizando capacitaciones para user ${userId}`);

        try {
            const riskScores = await this.getCurrentRiskScores(userId, companyId);

            // Mapeo de categoría de training a categoría de riesgo
            const categoryRiskMap = {
                safety: 'safety_risk',
                compliance: 'compliance_risk',
                quality: 'performance_risk',
                soft_skills: 'performance_risk'
            };

            // Actualizar prioridades
            const updates = [];

            for (const [trainingCategory, riskCategory] of Object.entries(categoryRiskMap)) {
                const riskScore = riskScores[riskCategory] || 0;

                if (riskScore >= 80) {
                    // Subir a critical
                    await sequelize.query(`
                        UPDATE training_assignments ta
                        SET priority = 'critical'
                        FROM trainings t
                        WHERE ta.training_id = t.id
                          AND ta.user_id = $1
                          AND ta.company_id = $2
                          AND t.category = $3
                          AND ta.status IN ('assigned', 'in_progress')
                          AND ta.priority != 'critical'
                    `, { bind: [userId, companyId, trainingCategory] });

                    updates.push({ category: trainingCategory, newPriority: 'critical' });
                }
            }

            return {
                success: true,
                updates
            };

        } catch (error) {
            console.error('❌ [RISK→TRAINING] Error re-priorizando:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Dashboard: Obtiene vista de riesgo vs capacitaciones
     */
    static async getRiskTrainingDashboard(companyId) {
        try {
            const stats = await sequelize.query(`
                WITH risk_data AS (
                    SELECT
                        user_id,
                        GREATEST(
                            COALESCE(attendance_score, 0),
                            COALESCE(safety_score, 0),
                            COALESCE(compliance_score, 0)
                        ) as max_risk_score
                    FROM risk_intelligence_scores
                    WHERE company_id = $1
                )
                SELECT
                    CASE
                        WHEN rd.max_risk_score >= 80 THEN 'critical'
                        WHEN rd.max_risk_score >= 60 THEN 'high'
                        WHEN rd.max_risk_score >= 40 THEN 'medium'
                        ELSE 'low'
                    END as risk_level,
                    COUNT(DISTINCT rd.user_id) as users_count,
                    COUNT(DISTINCT ta.id) as pending_trainings,
                    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'completed') as completed_trainings
                FROM risk_data rd
                LEFT JOIN training_assignments ta ON ta.user_id = rd.user_id
                    AND ta.company_id = $1
                    AND ta.source_module = 'risk_intelligence'
                GROUP BY 1
                ORDER BY 1
            `, { bind: [companyId], type: sequelize.QueryTypes.SELECT });

            return stats;

        } catch (error) {
            console.error('❌ [RISK→TRAINING] Error en dashboard:', error);
            return [];
        }
    }
}

module.exports = RiskTrainingIntegration;
