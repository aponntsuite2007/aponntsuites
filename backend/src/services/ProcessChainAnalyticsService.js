/**
 * ============================================================================
 * PROCESS CHAIN ANALYTICS SERVICE
 * ============================================================================
 *
 * Servicio para tracking y análisis de uso de process chains:
 * - Track cuando se genera una cadena
 * - Track cuando el usuario empieza/completa/abandona
 * - Calcular métricas (top actions, completion rates, bottlenecks)
 * - Identificar patrones y tendencias
 * - Alimentar dashboard de analytics
 * - Proveer data para auto-mejora con ML
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const { QueryTypes } = require('sequelize');

class ProcessChainAnalyticsService {
    constructor(sequelize) {
        this.db = sequelize;
        console.log('📊 [ANALYTICS] ProcessChainAnalyticsService inicializado');
    }

    /**
     * ========================================================================
     * TRACKING METHODS - Registran eventos de process chains
     * ========================================================================
     */

    /**
     * Track cuando se genera una process chain
     */
    async trackGeneration(data) {
        const startTime = Date.now();

        try {
            const {
                companyId,
                userId,
                actionKey,
                actionName,
                moduleName,
                processChain,
                userAgent,
                ipAddress,
                referrerModule
            } = data;

            // Extraer metadata del processChain
            const totalSteps = processChain.processSteps?.length || 0;
            const prerequisitesCount = processChain.prerequisiteSteps?.length || 0;
            const prerequisitesMissing = processChain.prerequisiteSteps?.filter(p => !p.fulfilled).length || 0;
            const prerequisitesFulfilled = prerequisitesCount - prerequisitesMissing;
            const canProceed = processChain.canProceed || false;
            const warningsCount = processChain.warnings?.length || 0;
            const tipsCount = processChain.tips?.length || 0;
            const hasAlternativeRoute = !!processChain.alternativeRoute;

            const generationTimeMs = Date.now() - startTime;

            const record = await this.db.models.ProcessChainAnalytics.create({
                company_id: companyId,
                user_id: userId,
                action_key: actionKey,
                action_name: actionName,
                module_name: moduleName,
                total_steps: totalSteps,
                prerequisites_count: prerequisitesCount,
                prerequisites_fulfilled: prerequisitesFulfilled,
                prerequisites_missing: prerequisitesMissing,
                can_proceed: canProceed,
                generated_at: new Date(),
                status: 'generated',
                generation_time_ms: generationTimeMs,
                user_agent: userAgent,
                ip_address: ipAddress,
                referrer_module: referrerModule,
                warnings_count: warningsCount,
                tips_count: tipsCount,
                has_alternative_route: hasAlternativeRoute
            });

            console.log(`📊 [ANALYTICS] Tracked generation: ${actionKey} (ID: ${record.id})`);

            return record;

        } catch (error) {
            console.error('❌ [ANALYTICS] Error tracking generation:', error.message);
            throw error;
        }
    }

    /**
     * Track cuando un usuario EMPIEZA un process chain
     */
    async trackStart(analyticsId) {
        try {
            await this.db.models.ProcessChainAnalytics.update({
                status: 'started',
                started_at: new Date()
            }, {
                where: { id: analyticsId }
            });

            console.log(`📊 [ANALYTICS] Tracked start: ID ${analyticsId}`);

        } catch (error) {
            console.error('❌ [ANALYTICS] Error tracking start:', error.message);
            throw error;
        }
    }

    /**
     * Track cuando un usuario COMPLETA un process chain
     */
    async trackCompletion(analyticsId) {
        try {
            const record = await this.db.models.ProcessChainAnalytics.findByPk(analyticsId);

            if (!record) {
                throw new Error(`Analytics record ${analyticsId} not found`);
            }

            // Calcular completion_time_ms si hay started_at
            let completionTimeMs = null;
            if (record.started_at) {
                completionTimeMs = Date.now() - new Date(record.started_at).getTime();
            }

            await record.update({
                status: 'completed',
                completed_at: new Date(),
                completion_time_ms: completionTimeMs
            });

            console.log(`📊 [ANALYTICS] Tracked completion: ID ${analyticsId} (${completionTimeMs}ms)`);

        } catch (error) {
            console.error('❌ [ANALYTICS] Error tracking completion:', error.message);
            throw error;
        }
    }

    /**
     * Track cuando un usuario ABANDONA un process chain
     */
    async trackAbandonment(analyticsId) {
        try {
            await this.db.models.ProcessChainAnalytics.update({
                status: 'abandoned',
                abandoned_at: new Date()
            }, {
                where: { id: analyticsId }
            });

            console.log(`📊 [ANALYTICS] Tracked abandonment: ID ${analyticsId}`);

        } catch (error) {
            console.error('❌ [ANALYTICS] Error tracking abandonment:', error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * ANALYTICS METHODS - Calculan métricas y estadísticas
     * ========================================================================
     */

    /**
     * Obtiene las TOP N acciones más solicitadas
     */
    async getTopRequestedActions(companyId, options = {}) {
        const {
            limit = 10,
            days = 30
        } = options;

        try {
            const results = await this.db.query(
                `SELECT * FROM get_top_requested_actions(:companyId, :limit, :days)`,
                {
                    replacements: { companyId, limit, days },
                    type: QueryTypes.SELECT
                }
            );

            return results;

        } catch (error) {
            console.error('❌ [ANALYTICS] Error getting top requested actions:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas por módulo
     */
    async getModuleUsageStats(companyId, options = {}) {
        const { days = 30 } = options;

        try {
            const results = await this.db.query(
                `SELECT * FROM get_module_usage_stats(:companyId, :days)`,
                {
                    replacements: { companyId, days },
                    type: QueryTypes.SELECT
                }
            );

            return results;

        } catch (error) {
            console.error('❌ [ANALYTICS] Error getting module usage stats:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene tendencias temporales (por día)
     */
    async getTimeTrends(companyId, options = {}) {
        const { days = 30 } = options;

        try {
            const results = await this.db.query(
                `SELECT * FROM get_time_trends(:companyId, :days)`,
                {
                    replacements: { companyId, days },
                    type: QueryTypes.SELECT
                }
            );

            return results;

        } catch (error) {
            console.error('❌ [ANALYTICS] Error getting time trends:', error.message);
            throw error;
        }
    }

    /**
     * Identifica bottlenecks (acciones problemáticas)
     */
    async identifyBottlenecks(companyId, options = {}) {
        const {
            minRequests = 5,
            days = 30
        } = options;

        try {
            const results = await this.db.query(
                `SELECT * FROM identify_bottlenecks(:companyId, :minRequests, :days)`,
                {
                    replacements: { companyId, minRequests, days },
                    type: QueryTypes.SELECT
                }
            );

            return results;

        } catch (error) {
            console.error('❌ [ANALYTICS] Error identifying bottlenecks:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas generales de la empresa
     */
    async getOverallStats(companyId, options = {}) {
        const { days = 30 } = options;

        try {
            const results = await this.db.query(
                `SELECT
                    COUNT(*)::INTEGER as total_requests,
                    COUNT(DISTINCT user_id)::INTEGER as unique_users,
                    COUNT(DISTINCT action_key)::INTEGER as unique_actions,
                    COUNT(DISTINCT module_name)::INTEGER as unique_modules,
                    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_count,
                    COUNT(*) FILTER (WHERE status = 'abandoned')::INTEGER as abandoned_count,
                    COUNT(*) FILTER (WHERE status = 'started')::INTEGER as started_count,
                    COUNT(*) FILTER (WHERE can_proceed = false)::INTEGER as blocked_count,
                    ROUND(
                        (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
                        NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
                        2
                    ) as completion_rate,
                    ROUND(
                        AVG(generation_time_ms) FILTER (WHERE generation_time_ms IS NOT NULL),
                        2
                    ) as avg_generation_time_ms,
                    ROUND(
                        AVG(completion_time_ms) FILTER (WHERE completion_time_ms IS NOT NULL),
                        2
                    ) as avg_completion_time_ms,
                    ROUND(AVG(prerequisites_missing), 2) as avg_prerequisites_missing
                FROM process_chain_analytics
                WHERE
                    company_id = :companyId
                    AND generated_at >= NOW() - INTERVAL '1 day' * :days`,
                {
                    replacements: { companyId, days },
                    type: QueryTypes.SELECT
                }
            );

            return results[0];

        } catch (error) {
            console.error('❌ [ANALYTICS] Error getting overall stats:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene comparación period-over-period (MoM, WoW, etc.)
     */
    async getPeriodComparison(companyId, options = {}) {
        const { days = 7 } = options; // Default: week-over-week

        try {
            const results = await this.db.query(
                `WITH current_period AS (
                    SELECT
                        COUNT(*)::INTEGER as requests,
                        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed,
                        ROUND(AVG(completion_time_ms) / 60000.0, 2) as avg_time_minutes
                    FROM process_chain_analytics
                    WHERE
                        company_id = :companyId
                        AND generated_at >= NOW() - INTERVAL '1 day' * :days
                ),
                previous_period AS (
                    SELECT
                        COUNT(*)::INTEGER as requests,
                        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed,
                        ROUND(AVG(completion_time_ms) / 60000.0, 2) as avg_time_minutes
                    FROM process_chain_analytics
                    WHERE
                        company_id = :companyId
                        AND generated_at >= NOW() - INTERVAL '1 day' * (:days * 2)
                        AND generated_at < NOW() - INTERVAL '1 day' * :days
                )
                SELECT
                    cp.requests as current_requests,
                    pp.requests as previous_requests,
                    ROUND(
                        ((cp.requests::NUMERIC - pp.requests::NUMERIC) /
                        NULLIF(pp.requests::NUMERIC, 0)) * 100,
                        2
                    ) as requests_change_pct,
                    cp.completed as current_completed,
                    pp.completed as previous_completed,
                    ROUND(
                        ((cp.completed::NUMERIC - pp.completed::NUMERIC) /
                        NULLIF(pp.completed::NUMERIC, 0)) * 100,
                        2
                    ) as completed_change_pct,
                    cp.avg_time_minutes as current_avg_time,
                    pp.avg_time_minutes as previous_avg_time
                FROM current_period cp, previous_period pp`,
                {
                    replacements: { companyId, days },
                    type: QueryTypes.SELECT
                }
            );

            return results[0];

        } catch (error) {
            console.error('❌ [ANALYTICS] Error getting period comparison:', error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * FEEDBACK METHODS - Gestión de feedback de usuarios
     * ========================================================================
     */

    /**
     * Registra feedback de un usuario (rating 1-5 + comment)
     */
    async submitFeedback(analyticsId, rating, comment = null) {
        try {
            if (rating < 1 || rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }

            await this.db.models.ProcessChainAnalytics.update({
                feedback_rating: rating,
                feedback_comment: comment
            }, {
                where: { id: analyticsId }
            });

            console.log(`📊 [ANALYTICS] Feedback submitted: ID ${analyticsId}, Rating: ${rating}/5`);

        } catch (error) {
            console.error('❌ [ANALYTICS] Error submitting feedback:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene promedio de ratings por acción
     */
    async getActionRatings(companyId, options = {}) {
        const { days = 30, minFeedbacks = 3 } = options;

        try {
            const results = await this.db.query(
                `SELECT
                    action_key,
                    action_name,
                    module_name,
                    COUNT(*) FILTER (WHERE feedback_rating IS NOT NULL)::INTEGER as feedback_count,
                    ROUND(AVG(feedback_rating), 2) as avg_rating,
                    COUNT(*) FILTER (WHERE feedback_rating = 5)::INTEGER as excellent_count,
                    COUNT(*) FILTER (WHERE feedback_rating <= 2)::INTEGER as poor_count
                FROM process_chain_analytics
                WHERE
                    company_id = :companyId
                    AND generated_at >= NOW() - INTERVAL '1 day' * :days
                    AND feedback_rating IS NOT NULL
                GROUP BY action_key, action_name, module_name
                HAVING COUNT(*) FILTER (WHERE feedback_rating IS NOT NULL) >= :minFeedbacks
                ORDER BY avg_rating DESC, feedback_count DESC`,
                {
                    replacements: { companyId, days, minFeedbacks },
                    type: QueryTypes.SELECT
                }
            );

            return results;

        } catch (error) {
            console.error('❌ [ANALYTICS] Error getting action ratings:', error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * DASHBOARD DATA - Data completa para dashboard de analytics
     * ========================================================================
     */

    /**
     * Obtiene TODA la data necesaria para el dashboard en un solo call
     */
    async getDashboardData(companyId, options = {}) {
        const { days = 30 } = options;

        try {
            const [
                overallStats,
                topActions,
                moduleStats,
                timeTrends,
                bottlenecks,
                periodComparison,
                actionRatings
            ] = await Promise.all([
                this.getOverallStats(companyId, { days }),
                this.getTopRequestedActions(companyId, { limit: 10, days }),
                this.getModuleUsageStats(companyId, { days }),
                this.getTimeTrends(companyId, { days }),
                this.identifyBottlenecks(companyId, { minRequests: 3, days }),
                this.getPeriodComparison(companyId, { days: 7 }), // Week-over-week
                this.getActionRatings(companyId, { days, minFeedbacks: 2 })
            ]);

            return {
                period: {
                    days,
                    startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                },
                overall: overallStats,
                topActions,
                moduleStats,
                timeTrends,
                bottlenecks,
                periodComparison,
                actionRatings,
                generatedAt: new Date()
            };

        } catch (error) {
            console.error('❌ [ANALYTICS] Error getting dashboard data:', error.message);
            throw error;
        }
    }
}

module.exports = ProcessChainAnalyticsService;
