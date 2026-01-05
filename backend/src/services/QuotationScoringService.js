/**
 * QuotationScoringService.js
 * Servicio de scoring y comparación automática de cotizaciones
 *
 * Algoritmo de evaluación multi-criterio para RFQ:
 * - Precio (configurable, default 60%)
 * - Calidad/Reputación del proveedor (default 20%)
 * - Tiempo de entrega (default 20%)
 * - Compliance (términos de pago, garantía, etc.)
 *
 * Output: Score 0-100 por cotización + recomendación automática
 */

class QuotationScoringService {
    constructor(pool) {
        this.pool = pool;

        // Criterios de evaluación por defecto
        this.DEFAULT_CRITERIA = {
            price: 60,          // Peso del precio en la evaluación
            quality: 20,        // Peso de calidad/reputación
            delivery: 20,       // Peso de tiempo de entrega
            payment_terms: 0,   // Peso de términos de pago (opcional)
            warranty: 0         // Peso de garantía (opcional)
        };
    }

    /**
     * Evaluar todas las cotizaciones de un RFQ y recomendar la mejor
     */
    async evaluateRfqQuotations(rfqId, companyId) {
        try {
            // Obtener RFQ y sus criterios de evaluación
            const rfqResult = await this.pool.query(`
                SELECT
                    rfq.*,
                    (SELECT COUNT(*) FROM supplier_quotations WHERE rfq_id = rfq.id AND status = 'submitted') as quotations_count
                FROM request_for_quotations rfq
                WHERE rfq.id = $1 AND rfq.company_id = $2
            `, [rfqId, companyId]);

            if (rfqResult.rows.length === 0) {
                throw new Error('RFQ no encontrada');
            }

            const rfq = rfqResult.rows[0];

            if (rfqResult.rows[0].quotations_count === 0) {
                return {
                    success: false,
                    error: 'No hay cotizaciones para evaluar',
                    rfq_id: rfqId,
                    quotations: []
                };
            }

            // Obtener criterios personalizados o usar defaults
            const criteria = rfq.evaluation_criteria || this.DEFAULT_CRITERIA;

            // Obtener todas las cotizaciones del RFQ
            const quotationsResult = await this.pool.query(`
                SELECT
                    q.*,
                    s.name as supplier_name,
                    s.rating_score as supplier_rating,
                    s.delivery_time_avg_days as supplier_delivery_avg,
                    s.on_time_delivery_percent,
                    s.quality_score,
                    s.contracts_count,
                    s.last_delivery_date,
                    (SELECT COUNT(*) FROM supplier_quotation_items WHERE quotation_id = q.id) as items_count
                FROM supplier_quotations q
                JOIN wms_suppliers s ON q.supplier_id = s.id
                WHERE q.rfq_id = $1 AND q.status = 'submitted'
                ORDER BY q.submitted_at
            `, [rfqId]);

            if (quotationsResult.rows.length === 0) {
                return {
                    success: false,
                    error: 'No hay cotizaciones en estado "submitted"',
                    rfq_id: rfqId,
                    quotations: []
                };
            }

            const quotations = quotationsResult.rows;

            // Calcular scores para cada cotización
            const scoredQuotations = await Promise.all(
                quotations.map(q => this.scoreQuotation(q, quotations, criteria, rfqId))
            );

            // Ordenar por score descendente
            scoredQuotations.sort((a, b) => b.total_score - a.total_score);

            // Marcar la mejor cotización
            if (scoredQuotations.length > 0) {
                scoredQuotations[0].is_recommended = true;
                scoredQuotations[0].recommendation_reason = this.getRecommendationReason(
                    scoredQuotations[0],
                    scoredQuotations
                );
            }

            // Guardar scores en base de datos
            for (const scored of scoredQuotations) {
                await this.pool.query(`
                    UPDATE supplier_quotations
                    SET
                        score_price = $1,
                        score_quality = $2,
                        score_delivery = $3,
                        score_total = $4,
                        score_breakdown = $5,
                        scored_at = NOW()
                    WHERE id = $6
                `, [
                    scored.score_price,
                    scored.score_quality,
                    scored.score_delivery,
                    scored.total_score,
                    JSON.stringify(scored.score_breakdown),
                    scored.id
                ]);
            }

            return {
                success: true,
                rfq_id: rfqId,
                rfq_number: rfq.rfq_number,
                rfq_title: rfq.title,
                quotations_evaluated: scoredQuotations.length,
                criteria_used: criteria,
                quotations: scoredQuotations,
                recommended_quotation: scoredQuotations[0] || null,
                evaluated_at: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ [SCORING] Error evaluando cotizaciones:', error.message);
            throw error;
        }
    }

    /**
     * Calcular score de una cotización individual
     */
    async scoreQuotation(quotation, allQuotations, criteria, rfqId) {
        // 1. SCORE DE PRECIO (0-100)
        const priceScore = this.calculatePriceScore(quotation, allQuotations);

        // 2. SCORE DE CALIDAD/REPUTACIÓN (0-100)
        const qualityScore = this.calculateQualityScore(quotation);

        // 3. SCORE DE TIEMPO DE ENTREGA (0-100)
        const deliveryScore = await this.calculateDeliveryScore(quotation, rfqId);

        // 4. SCORE TOTAL PONDERADO
        const totalScore = (
            (priceScore * (criteria.price || 0) / 100) +
            (qualityScore * (criteria.quality || 0) / 100) +
            (deliveryScore * (criteria.delivery || 0) / 100)
        );

        return {
            ...quotation,
            score_price: parseFloat(priceScore.toFixed(2)),
            score_quality: parseFloat(qualityScore.toFixed(2)),
            score_delivery: parseFloat(deliveryScore.toFixed(2)),
            total_score: parseFloat(totalScore.toFixed(2)),
            score_breakdown: {
                price: {
                    score: priceScore,
                    weight: criteria.price,
                    contribution: (priceScore * criteria.price / 100).toFixed(2)
                },
                quality: {
                    score: qualityScore,
                    weight: criteria.quality,
                    contribution: (qualityScore * criteria.quality / 100).toFixed(2)
                },
                delivery: {
                    score: deliveryScore,
                    weight: criteria.delivery,
                    contribution: (deliveryScore * criteria.delivery / 100).toFixed(2)
                }
            }
        };
    }

    /**
     * Calcular score de precio (el más barato = 100, el más caro = 0)
     */
    calculatePriceScore(quotation, allQuotations) {
        const prices = allQuotations.map(q => parseFloat(q.total_amount) || 0).filter(p => p > 0);

        if (prices.length === 0) return 50; // Neutral si no hay precios

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const currentPrice = parseFloat(quotation.total_amount) || maxPrice;

        if (maxPrice === minPrice) return 100; // Todos tienen el mismo precio

        // Score lineal inverso: precio más bajo = 100, precio más alto = 0
        const score = 100 - ((currentPrice - minPrice) / (maxPrice - minPrice) * 100);

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calcular score de calidad basado en reputación del proveedor
     */
    calculateQualityScore(quotation) {
        let score = 50; // Base neutra

        // 1. Rating del proveedor (0-5 estrellas → 0-30 puntos)
        if (quotation.supplier_rating) {
            score += (quotation.supplier_rating / 5) * 30;
        }

        // 2. Quality score histórico (0-100 → 0-30 puntos)
        if (quotation.quality_score) {
            score += (quotation.quality_score / 100) * 30;
        }

        // 3. Entregas a tiempo (0-100% → 0-20 puntos)
        if (quotation.on_time_delivery_percent) {
            score += (quotation.on_time_delivery_percent / 100) * 20;
        }

        // 4. Experiencia (número de contratos → 0-20 puntos)
        if (quotation.contracts_count) {
            const experienceScore = Math.min(quotation.contracts_count / 10, 1) * 20;
            score += experienceScore;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calcular score de tiempo de entrega
     */
    async calculateDeliveryScore(quotation, rfqId) {
        // Obtener fecha de entrega requerida del RFQ
        const rfqResult = await this.pool.query(`
            SELECT delivery_deadline FROM request_for_quotations WHERE id = $1
        `, [rfqId]);

        if (rfqResult.rows.length === 0 || !rfqResult.rows[0].delivery_deadline) {
            // Si no hay fecha requerida, usar tiempo promedio del proveedor
            if (quotation.supplier_delivery_avg) {
                // Menos días = mejor score
                // 1-7 días = 100, 30+ días = 0
                const score = Math.max(0, 100 - (quotation.supplier_delivery_avg - 7) * 3);
                return Math.max(0, Math.min(100, score));
            }
            return 50; // Neutral
        }

        const requiredDate = new Date(rfqResult.rows[0].delivery_deadline);
        const quotedDate = quotation.estimated_delivery_date
            ? new Date(quotation.estimated_delivery_date)
            : new Date(Date.now() + (quotation.delivery_time_days || 30) * 24 * 60 * 60 * 1000);

        const daysDifference = Math.ceil((quotedDate - requiredDate) / (1000 * 60 * 60 * 24));

        // Entrega antes = 100
        // Entrega en fecha = 80
        // Entrega después = penalización (cada día -5 puntos)
        if (daysDifference < 0) {
            // Entrega anticipada
            return 100;
        } else if (daysDifference === 0) {
            // Entrega exacta
            return 80;
        } else {
            // Entrega retrasada
            const score = 80 - (daysDifference * 5);
            return Math.max(0, score);
        }
    }

    /**
     * Generar razón de recomendación
     */
    getRecommendationReason(bestQuotation, allQuotations) {
        const reasons = [];

        // ¿Es el más barato?
        const prices = allQuotations.map(q => parseFloat(q.total_amount));
        const minPrice = Math.min(...prices);
        if (parseFloat(bestQuotation.total_amount) === minPrice) {
            reasons.push('Precio más competitivo');
        }

        // ¿Tiene la mejor calidad?
        const qualityScores = allQuotations.map(q => q.score_quality);
        const maxQuality = Math.max(...qualityScores);
        if (bestQuotation.score_quality === maxQuality && maxQuality > 70) {
            reasons.push('Mejor reputación del proveedor');
        }

        // ¿Tiene la mejor entrega?
        const deliveryScores = allQuotations.map(q => q.score_delivery);
        const maxDelivery = Math.max(...deliveryScores);
        if (bestQuotation.score_delivery === maxDelivery && maxDelivery > 80) {
            reasons.push('Mejor tiempo de entrega');
        }

        // Score general superior
        if (reasons.length === 0) {
            reasons.push('Balance óptimo entre precio, calidad y entrega');
        }

        return reasons.join(' | ');
    }

    /**
     * Comparar dos cotizaciones específicas
     */
    async compareQuotations(quotationId1, quotationId2, companyId) {
        const q1Result = await this.pool.query(`
            SELECT q.*, s.name as supplier_name
            FROM supplier_quotations q
            JOIN wms_suppliers s ON q.supplier_id = s.id
            JOIN request_for_quotations rfq ON q.rfq_id = rfq.id
            WHERE q.id = $1 AND rfq.company_id = $2
        `, [quotationId1, companyId]);

        const q2Result = await this.pool.query(`
            SELECT q.*, s.name as supplier_name
            FROM supplier_quotations q
            JOIN wms_suppliers s ON q.supplier_id = s.id
            JOIN request_for_quotations rfq ON q.rfq_id = rfq.id
            WHERE q.id = $1 AND rfq.company_id = $2
        `, [quotationId2, companyId]);

        if (q1Result.rows.length === 0 || q2Result.rows.length === 0) {
            throw new Error('Una o ambas cotizaciones no fueron encontradas');
        }

        const q1 = q1Result.rows[0];
        const q2 = q2Result.rows[0];

        // Comparación detallada
        return {
            quotation_1: {
                id: q1.id,
                supplier: q1.supplier_name,
                total_amount: q1.total_amount,
                total_score: q1.score_total,
                price_score: q1.score_price,
                quality_score: q1.score_quality,
                delivery_score: q1.score_delivery
            },
            quotation_2: {
                id: q2.id,
                supplier: q2.supplier_name,
                total_amount: q2.total_amount,
                total_score: q2.score_total,
                price_score: q2.score_price,
                quality_score: q2.score_quality,
                delivery_score: q2.score_delivery
            },
            comparison: {
                price_difference: parseFloat(q2.total_amount) - parseFloat(q1.total_amount),
                price_difference_percent: ((parseFloat(q2.total_amount) - parseFloat(q1.total_amount)) / parseFloat(q1.total_amount) * 100).toFixed(2),
                better_price: parseFloat(q1.total_amount) < parseFloat(q2.total_amount) ? q1.id : q2.id,
                better_quality: (q1.score_quality || 0) > (q2.score_quality || 0) ? q1.id : q2.id,
                better_delivery: (q1.score_delivery || 0) > (q2.score_delivery || 0) ? q1.id : q2.id,
                better_overall: (q1.score_total || 0) > (q2.score_total || 0) ? q1.id : q2.id
            },
            recommendation: (q1.score_total || 0) > (q2.score_total || 0)
                ? `Se recomienda cotización #${q1.id} de ${q1.supplier_name}`
                : `Se recomienda cotización #${q2.id} de ${q2.supplier_name}`
        };
    }

    /**
     * Generar reporte de comparación para dashboard
     */
    async generateComparisonReport(rfqId, companyId) {
        const evaluation = await this.evaluateRfqQuotations(rfqId, companyId);

        if (!evaluation.success) {
            return evaluation;
        }

        const quotations = evaluation.quotations;

        // Estadísticas generales
        const stats = {
            total_quotations: quotations.length,
            price_range: {
                min: Math.min(...quotations.map(q => parseFloat(q.total_amount))),
                max: Math.max(...quotations.map(q => parseFloat(q.total_amount))),
                avg: quotations.reduce((sum, q) => sum + parseFloat(q.total_amount), 0) / quotations.length
            },
            score_range: {
                min: Math.min(...quotations.map(q => q.total_score)),
                max: Math.max(...quotations.map(q => q.total_score)),
                avg: quotations.reduce((sum, q) => sum + q.total_score, 0) / quotations.length
            }
        };

        return {
            ...evaluation,
            stats,
            generated_at: new Date().toISOString()
        };
    }
}

module.exports = QuotationScoringService;
