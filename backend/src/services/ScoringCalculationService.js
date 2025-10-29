/**
 * SERVICE: ScoringCalculationService
 *
 * Servicio para cálculo diario de scoring de partners.
 * Ejecutado por CRON job cada día a las 2:00 AM.
 *
 * FÓRMULA DE SCORING (0-5 estrellas):
 * - Rating promedio de clientes: 40%
 * - Tiempo de respuesta promedio: 20%
 * - Tickets resueltos vs totales: 20%
 * - Ventas exitosas: 10%
 * - Antigüedad como partner: 10%
 *
 * ACCIONES AUTOMÁTICAS:
 * - Si scoring < 2.0 → Crear subasta de paquete de soporte
 * - Si scoring < 1.5 → Suspender temporalmente
 * - Si scoring >= 4.5 → Bonus en comisiones
 */

const { sequelize, PartnerReview, Partner } = require('../config/database');

class ScoringCalculationService {
  /**
   * Calcula scoring para todos los partners
   * @returns {Promise<Object>} Resultado del cálculo
   */
  async calculateAllScores() {
    try {
      console.log(`\n⭐ [SCORING] Iniciando cálculo diario de scoring...`);

      // 1. Obtener todos los partners activos
      const partners = await sequelize.query(
        `SELECT * FROM partners WHERE status = 'activo' ORDER BY id`,
        {
          type: sequelize.QueryTypes.SELECT
        }
      );

      console.log(`   📊 ${partners.length} partners activos encontrados`);

      const results = {
        success: true,
        total_partners: partners.length,
        scores_updated: 0,
        auctions_created: 0,
        suspensions: 0,
        bonuses: 0,
        details: []
      };

      // 2. Por cada partner, calcular scoring
      for (const partner of partners) {
        try {
          const score = await this.calculatePartnerScore(partner);

          // Actualizar scoring en tabla partners
          await sequelize.query(
            `UPDATE partners
             SET current_score = :score,
                 score_updated_at = CURRENT_TIMESTAMP
             WHERE id = :partnerId`,
            {
              replacements: { score: score.total_score, partnerId: partner.id },
              type: sequelize.QueryTypes.UPDATE
            }
          );

          results.scores_updated++;

          // Ejecutar acciones automáticas según score
          const actions = await this.executeAutoActions(partner, score);

          results.auctions_created += actions.auction_created ? 1 : 0;
          results.suspensions += actions.suspended ? 1 : 0;
          results.bonuses += actions.bonus_applied ? 1 : 0;

          results.details.push({
            partner_id: partner.id,
            partner_name: partner.name,
            previous_score: partner.current_score,
            new_score: score.total_score,
            change: (score.total_score - (partner.current_score || 0)).toFixed(2),
            actions: actions
          });

          console.log(`   ✅ Partner ${partner.name}: ${score.total_score.toFixed(2)} ⭐ (${actions.status})`);

        } catch (error) {
          console.error(`   ❌ Error calculando score para partner ${partner.id}:`, error.message);
        }
      }

      console.log(`\n✅ [SCORING] Cálculo completado:`);
      console.log(`   ⭐ Scores actualizados: ${results.scores_updated}`);
      console.log(`   🔨 Subastas creadas: ${results.auctions_created}`);
      console.log(`   ⏸️  Suspensiones: ${results.suspensions}`);
      console.log(`   🎁 Bonificaciones: ${results.bonuses}`);

      return results;

    } catch (error) {
      console.error('❌ [SCORING] Error en cálculo masivo:', error);
      throw error;
    }
  }

  /**
   * Calcula scoring de un partner específico
   * @param {Object} partner - Datos del partner
   * @returns {Promise<Object>} Desglose del scoring
   */
  async calculatePartnerScore(partner) {
    try {
      // 1. Rating promedio de clientes (40%)
      const ratingScore = await this.calculateRatingScore(partner.id);

      // 2. Tiempo de respuesta promedio (20%)
      const responseTimeScore = await this.calculateResponseTimeScore(partner.id);

      // 3. Tickets resueltos vs totales (20%)
      const resolutionScore = await this.calculateResolutionScore(partner.id);

      // 4. Ventas exitosas (10%)
      const salesScore = await this.calculateSalesScore(partner.id);

      // 5. Antigüedad como partner (10%)
      const tenureScore = await this.calculateTenureScore(partner);

      // Total (escala 0-5)
      const totalScore = (
        (ratingScore.score * 0.40) +
        (responseTimeScore.score * 0.20) +
        (resolutionScore.score * 0.20) +
        (salesScore.score * 0.10) +
        (tenureScore.score * 0.10)
      );

      return {
        partner_id: partner.id,
        total_score: parseFloat(totalScore.toFixed(2)),
        breakdown: {
          rating: ratingScore,
          response_time: responseTimeScore,
          resolution: resolutionScore,
          sales: salesScore,
          tenure: tenureScore
        }
      };

    } catch (error) {
      console.error(`❌ Error calculando score para partner ${partner.id}:`, error);
      throw error;
    }
  }

  /**
   * 1. Calcula score basado en ratings de clientes (0-5)
   */
  async calculateRatingScore(partnerId) {
    try {
      const [result] = await sequelize.query(
        `SELECT
          AVG(rating) as avg_rating,
          COUNT(*) as total_ratings
        FROM partner_ratings
        WHERE rated_partner_id = :partnerId
        AND created_at >= CURRENT_DATE - INTERVAL '90 days'`,
        {
          replacements: { partnerId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const avgRating = parseFloat(result.avg_rating) || 0;
      const totalRatings = parseInt(result.total_ratings) || 0;

      // Penalizar si tiene pocos ratings
      let score = avgRating;
      if (totalRatings < 3) {
        score *= 0.5; // 50% si tiene menos de 3 ratings
      }

      return {
        score: Math.min(5, Math.max(0, score)),
        avg_rating: avgRating,
        total_ratings: totalRatings,
        weight: 0.40
      };

    } catch (error) {
      console.error('Error calculando rating score:', error);
      return { score: 0, avg_rating: 0, total_ratings: 0, weight: 0.40 };
    }
  }

  /**
   * 2. Calcula score basado en tiempo de respuesta (0-5)
   * < 1 hora: 5 estrellas
   * 1-4 horas: 4 estrellas
   * 4-24 horas: 3 estrellas
   * 1-3 días: 2 estrellas
   * > 3 días: 1 estrella
   */
  async calculateResponseTimeScore(partnerId) {
    try {
      const [result] = await sequelize.query(
        `SELECT
          AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600) as avg_hours
        FROM support_tickets
        WHERE assigned_to = :partnerId
        AND first_response_at IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
        {
          replacements: { partnerId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const avgHours = parseFloat(result.avg_hours) || 24;

      let score = 0;
      if (avgHours < 1) score = 5;
      else if (avgHours < 4) score = 4;
      else if (avgHours < 24) score = 3;
      else if (avgHours < 72) score = 2;
      else score = 1;

      return {
        score,
        avg_hours: avgHours.toFixed(2),
        weight: 0.20
      };

    } catch (error) {
      console.error('Error calculando response time score:', error);
      return { score: 3, avg_hours: 0, weight: 0.20 };
    }
  }

  /**
   * 3. Calcula score basado en tasa de resolución (0-5)
   * 100%: 5 estrellas
   * 80-99%: 4 estrellas
   * 60-79%: 3 estrellas
   * 40-59%: 2 estrellas
   * < 40%: 1 estrella
   */
  async calculateResolutionScore(partnerId) {
    try {
      const [result] = await sequelize.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) as total
        FROM support_tickets
        WHERE assigned_to = :partnerId
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
        {
          replacements: { partnerId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const resolved = parseInt(result.resolved) || 0;
      const total = parseInt(result.total) || 0;

      if (total === 0) {
        return { score: 3, resolution_rate: 0, total_tickets: 0, weight: 0.20 };
      }

      const resolutionRate = (resolved / total) * 100;

      let score = 0;
      if (resolutionRate >= 100) score = 5;
      else if (resolutionRate >= 80) score = 4;
      else if (resolutionRate >= 60) score = 3;
      else if (resolutionRate >= 40) score = 2;
      else score = 1;

      return {
        score,
        resolution_rate: resolutionRate.toFixed(2),
        resolved_tickets: resolved,
        total_tickets: total,
        weight: 0.20
      };

    } catch (error) {
      console.error('Error calculando resolution score:', error);
      return { score: 3, resolution_rate: 0, total_tickets: 0, weight: 0.20 };
    }
  }

  /**
   * 4. Calcula score basado en ventas exitosas (0-5)
   */
  async calculateSalesScore(partnerId) {
    try {
      const [result] = await sequelize.query(
        `SELECT
          COUNT(DISTINCT c.company_id) as companies_sold,
          SUM(co.commission_amount) as total_commissions
        FROM companies c
        LEFT JOIN commissions co ON co.company_id = c.company_id AND co.commission_type = 'sale'
        WHERE c.seller_id = :partnerId
        AND c.created_at >= CURRENT_DATE - INTERVAL '90 days'`,
        {
          replacements: { partnerId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const companiesSold = parseInt(result.companies_sold) || 0;
      const totalCommissions = parseFloat(result.total_commissions) || 0;

      // Escala lineal: 0 ventas = 0, 10+ ventas = 5
      let score = Math.min(5, companiesSold * 0.5);

      return {
        score,
        companies_sold: companiesSold,
        total_commissions: totalCommissions.toFixed(2),
        weight: 0.10
      };

    } catch (error) {
      console.error('Error calculando sales score:', error);
      return { score: 0, companies_sold: 0, total_commissions: 0, weight: 0.10 };
    }
  }

  /**
   * 5. Calcula score basado en antigüedad (0-5)
   * < 1 mes: 1 estrella
   * 1-3 meses: 2 estrellas
   * 3-6 meses: 3 estrellas
   * 6-12 meses: 4 estrellas
   * > 12 meses: 5 estrellas
   */
  async calculateTenureScore(partner) {
    try {
      const createdAt = new Date(partner.created_at);
      const now = new Date();
      const monthsDiff = (now - createdAt) / (1000 * 60 * 60 * 24 * 30);

      let score = 0;
      if (monthsDiff >= 12) score = 5;
      else if (monthsDiff >= 6) score = 4;
      else if (monthsDiff >= 3) score = 3;
      else if (monthsDiff >= 1) score = 2;
      else score = 1;

      return {
        score,
        months: monthsDiff.toFixed(1),
        weight: 0.10
      };

    } catch (error) {
      console.error('Error calculando tenure score:', error);
      return { score: 1, months: 0, weight: 0.10 };
    }
  }

  /**
   * Ejecuta acciones automáticas según el scoring
   */
  async executeAutoActions(partner, scoreData) {
    const actions = {
      status: 'ok',
      auction_created: false,
      suspended: false,
      bonus_applied: false,
      notifications: []
    };

    try {
      const score = scoreData.total_score;

      // ACCIÓN 1: Score < 2.0 → Crear subasta de paquete de soporte
      if (score < 2.0) {
        actions.status = 'low_score';

        // Verificar si tiene paquetes de soporte activos
        const [packages] = await sequelize.query(
          `SELECT * FROM support_packages
           WHERE current_support_id = :partnerId
           AND status = 'active'
           LIMIT 1`,
          {
            replacements: { partnerId: partner.id },
            type: sequelize.QueryTypes.SELECT
          }
        );

        if (packages) {
          // Crear subasta del paquete
          await this.createSupportPackageAuction(packages, partner, score);
          actions.auction_created = true;
          actions.notifications.push('Paquete de soporte puesto en subasta por bajo scoring');
        }
      }

      // ACCIÓN 2: Score < 1.5 → Suspender temporalmente
      if (score < 1.5) {
        await sequelize.query(
          `UPDATE partners
           SET status = 'suspendido_temporalmente',
               suspension_reason = 'Scoring crítico < 1.5'
           WHERE id = :partnerId`,
          {
            replacements: { partnerId: partner.id },
            type: sequelize.QueryTypes.UPDATE
          }
        );

        actions.suspended = true;
        actions.status = 'suspended';
        actions.notifications.push('Partner suspendido por scoring crítico');
      }

      // ACCIÓN 3: Score >= 4.5 → Bonus en comisiones
      if (score >= 4.5) {
        await sequelize.query(
          `UPDATE partners
           SET bonus_rate = 5,
               bonus_reason = 'Excelente scoring >= 4.5',
               bonus_expires_at = CURRENT_DATE + INTERVAL '30 days'
           WHERE id = :partnerId`,
          {
            replacements: { partnerId: partner.id },
            type: sequelize.QueryTypes.UPDATE
          }
        );

        actions.bonus_applied = true;
        actions.status = 'excellent';
        actions.notifications.push('Bonus de 5% aplicado por excelente desempeño');
      }

      return actions;

    } catch (error) {
      console.error(`❌ Error ejecutando acciones automáticas para partner ${partner.id}:`, error);
      return actions;
    }
  }

  /**
   * Crea subasta de paquete de soporte
   */
  async createSupportPackageAuction(supportPackage, currentPartner, score) {
    try {
      console.log(`\n   🔨 [AUCTION] Creando subasta para paquete ID ${supportPackage.id}`);

      await sequelize.query(
        `INSERT INTO support_package_auctions (
          support_package_id,
          current_support_id,
          auction_start_date,
          auction_end_date,
          starting_commission_rate,
          current_best_bid,
          auction_status,
          reason,
          created_at
        ) VALUES (
          :packageId,
          :currentSupportId,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP + INTERVAL '7 days',
          :startingRate,
          :startingRate,
          'active',
          :reason,
          CURRENT_TIMESTAMP
        )`,
        {
          replacements: {
            packageId: supportPackage.id,
            currentSupportId: currentPartner.id,
            startingRate: supportPackage.monthly_commission_rate,
            reason: `Scoring bajo: ${score.toFixed(2)} estrellas`
          },
          type: sequelize.QueryTypes.INSERT
        }
      );

      console.log(`   ✅ Subasta creada exitosamente`);

    } catch (error) {
      console.error('❌ Error creando subasta:', error);
      throw error;
    }
  }

  /**
   * Obtiene partners con scoring bajo
   */
  async getLowScorePartners(threshold = 2.5) {
    try {
      const partners = await sequelize.query(
        `SELECT
          p.*,
          COUNT(sp.id) as support_packages_count
        FROM partners p
        LEFT JOIN support_packages sp ON sp.current_support_id = p.id AND sp.status = 'active'
        WHERE p.current_score < :threshold
        AND p.status = 'activo'
        GROUP BY p.id
        ORDER BY p.current_score ASC`,
        {
          replacements: { threshold },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return partners;
    } catch (error) {
      console.error('❌ Error obteniendo partners con scoring bajo:', error);
      throw error;
    }
  }
}

module.exports = new ScoringCalculationService();
