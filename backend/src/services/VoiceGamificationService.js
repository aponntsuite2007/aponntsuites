/**
 * ============================================================================
 * VOICE GAMIFICATION SERVICE
 * ============================================================================
 *
 * Servicio para sistema de gamificación:
 * - Puntos por acciones
 * - Badges y niveles
 * - Leaderboards (global, departamento, mensual)
 * - Reconocimientos por implementación
 *
 * @version 1.0.0
 * @date 2025-12-22
 * ============================================================================
 */

const { sequelize, ExperienceRecognition, User } = require('../config/database');

class VoiceGamificationService {
  constructor() {
    // Configuración de puntos base (puede sobrescribirse por empresa)
    this.defaultPointsConfig = {
      SUBMIT_SUGGESTION: 10,
      SUBMIT_PROBLEM: 8,
      SUBMIT_SOLUTION: 12,
      UPVOTE_RECEIVED: 5,
      COMMENT_ON_SUGGESTION: 2,
      HELPFUL_COMMENT: 5,
      SUGGESTION_APPROVED: 25,
      SUGGESTION_IN_PILOT: 50,
      SUGGESTION_IMPLEMENTED: 100,
      CLUSTER_ORIGINAL: 15,
      CLUSTER_CONTRIBUTOR: 10,
      FIRST_SUGGESTION: 20,
      MONTHLY_CONTRIBUTOR: 30
    };

    // Configuración de reconocimientos
    this.recognitionTypes = {
      QUICK_WIN: { points: 50, badge: 'QUICK_WIN', description: 'Implementada en < 1 mes' },
      IMPACT_SAVER: { points: 100, badge: 'IMPACT_SAVER', description: 'Ahorro > $10k/año' },
      SAFETY_STAR: { points: 150, badge: 'SAFETY_STAR', description: 'Mejora seguridad' },
      INNOVATION_AWARD: { points: 200, badge: 'INNOVATION_AWARD', description: 'Idea disruptiva' },
      TEAM_BOOSTER: { points: 75, badge: 'TEAM_BOOSTER', description: 'Mejora clima laboral' },
      CLUSTER_CONTRIBUTOR: { points: 50, badge: 'CLUSTER_CONTRIBUTOR', description: 'Parte de cluster implementado' }
    };

    // Niveles
    this.levels = {
      BRONZE: { min: 0, max: 100, title: 'Contributor' },
      SILVER: { min: 100, max: 500, title: 'Active Innovator' },
      GOLD: { min: 500, max: 1000, title: 'Innovation Leader' },
      PLATINUM: { min: 1000, max: null, title: 'Change Agent' }
    };
  }

  /**
   * Otorgar puntos a un usuario
   * @param {number} userId
   * @param {number} companyId
   * @param {string} action - Tipo de acción (ej: 'SUBMIT_SUGGESTION')
   * @param {number} customPoints - Puntos custom (opcional)
   */
  async awardPoints(userId, companyId, action, customPoints = null) {
    try {
      const points = customPoints || this.defaultPointsConfig[action] || 0;

      if (points === 0) {
        console.log(`⚠️ [GAMIFICATION] Acción "${action}" no tiene puntos configurados`);
        return;
      }

      // Actualizar voice_user_stats
      await sequelize.query(`
        INSERT INTO voice_user_stats (user_id, company_id, total_points, updated_at)
        VALUES (:userId, :companyId, :points, NOW())
        ON CONFLICT (user_id, company_id)
        DO UPDATE SET
          total_points = voice_user_stats.total_points + :points,
          updated_at = NOW()
      `, {
        replacements: { userId, companyId, points }
      });

      // Recalcular nivel
      await this.updateUserLevel(userId, companyId);

      console.log(`✅ [GAMIFICATION] +${points} pts a user ${userId} por ${action}`);

      return { points, action };

    } catch (error) {
      console.error('❌ [GAMIFICATION] Error otorgando puntos:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar nivel del usuario basado en puntos
   */
  async updateUserLevel(userId, companyId) {
    try {
      // Obtener puntos actuales
      const result = await sequelize.query(`
        SELECT total_points FROM voice_user_stats
        WHERE user_id = :userId AND company_id = :companyId
      `, {
        replacements: { userId, companyId },
        type: sequelize.QueryTypes.SELECT
      });

      if (result.length === 0) return;

      const totalPoints = result[0].total_points;
      const newLevel = this.calculateLevel(totalPoints);

      // Actualizar nivel
      await sequelize.query(`
        UPDATE voice_user_stats
        SET current_level = :level
        WHERE user_id = :userId AND company_id = :companyId
      `, {
        replacements: { userId, companyId, level: newLevel }
      });

    } catch (error) {
      console.error('❌ [GAMIFICATION] Error actualizando nivel:', error.message);
    }
  }

  /**
   * Calcular nivel basado en puntos
   */
  calculateLevel(points) {
    if (points >= 1000) return 'PLATINUM';
    if (points >= 500) return 'GOLD';
    if (points >= 100) return 'SILVER';
    return 'BRONZE';
  }

  /**
   * Otorgar reconocimiento por implementación
   * @param {Object} experience - EmployeeExperience implementada
   * @param {number} awardedBy - ID del admin que otorga
   */
  async awardImplementationRecognition(experience, awardedBy) {
    console.log(`\n🏆 [GAMIFICATION] Otorgando reconocimiento por implementación...`);

    try {
      // Determinar tipo de reconocimiento
      let recognitionType = 'INNOVATION_AWARD';  // Default

      // Quick Win: implementada en < 1 mes
      const daysSinceCreated = (new Date() - new Date(experience.created_at)) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated <= 30) {
        recognitionType = 'QUICK_WIN';
      }

      // Impact Saver: ahorro > $10k
      if (experience.actual_savings && experience.actual_savings >= 10000) {
        recognitionType = 'IMPACT_SAVER';
      }

      // Safety Star: mejora seguridad
      if (experience.safety_impact_notes) {
        recognitionType = 'SAFETY_STAR';
      }

      const config = this.recognitionTypes[recognitionType];

      // 1. Otorgar reconocimiento al autor original
      if (experience.employee_id) {
        const recognition = await ExperienceRecognition.create({
          experience_id: experience.id,
          user_id: experience.employee_id,
          company_id: experience.company_id,
          recognition_type: recognitionType,
          points_awarded: config.points,
          badge_name: config.badge,
          awarded_by: awardedBy,
          notes: config.description
        });

        // Otorgar puntos
        await this.awardPoints(
          experience.employee_id,
          experience.company_id,
          'SUGGESTION_IMPLEMENTED',
          config.points
        );

        // Agregar badge
        await this.awardBadge(experience.employee_id, experience.company_id, config.badge);

        console.log(`   ✅ Reconocimiento ${recognitionType} a user ${experience.employee_id}`);
        console.log(`      Puntos: ${config.points}`);
        console.log(`      Badge: ${config.badge}`);
      }

      // 2. Si pertenece a un cluster, otorgar puntos a miembros del cluster
      if (experience.cluster_id) {
        const { EmployeeExperience } = require('../models');

        const clusterMembers = await EmployeeExperience.findAll({
          where: {
            cluster_id: experience.cluster_id,
            id: { [sequelize.Op.ne]: experience.id },  // Excluir la original
            employee_id: { [sequelize.Op.ne]: null }
          }
        });

        console.log(`   🔗 Cluster members: ${clusterMembers.length}`);

        for (const member of clusterMembers) {
          const memberRecognition = await ExperienceRecognition.create({
            experience_id: experience.id,
            user_id: member.employee_id,
            company_id: member.company_id,
            recognition_type: 'CLUSTER_CONTRIBUTOR',
            points_awarded: this.recognitionTypes.CLUSTER_CONTRIBUTOR.points,
            badge_name: this.recognitionTypes.CLUSTER_CONTRIBUTOR.badge,
            awarded_by: awardedBy,
            notes: 'Contribución a cluster implementado'
          });

          await this.awardPoints(
            member.employee_id,
            member.company_id,
            'CLUSTER_CONTRIBUTOR',
            this.recognitionTypes.CLUSTER_CONTRIBUTOR.points
          );
        }
      }

      // 3. Actualizar experience.total_points_awarded
      experience.total_points_awarded = config.points;
      if (!experience.badges_earned) experience.badges_earned = [];
      if (!experience.badges_earned.includes(config.badge)) {
        experience.badges_earned.push(config.badge);
      }
      await experience.save();

      return {
        recognition_type: recognitionType,
        points_awarded: config.points,
        badge: config.badge
      };

    } catch (error) {
      console.error('❌ [GAMIFICATION] Error otorgando reconocimiento:', error.message);
      throw error;
    }
  }

  /**
   * Otorgar badge a usuario
   */
  async awardBadge(userId, companyId, badgeName) {
    try {
      await sequelize.query(`
        UPDATE voice_user_stats
        SET badges = COALESCE(badges, '[]'::jsonb) || jsonb_build_array(:badgeName)
        WHERE user_id = :userId AND company_id = :companyId
          AND NOT (badges @> jsonb_build_array(:badgeName))
      `, {
        replacements: { userId, companyId, badgeName }
      });

      console.log(`   🎖️ Badge "${badgeName}" otorgado a user ${userId}`);

    } catch (error) {
      console.error('❌ [GAMIFICATION] Error otorgando badge:', error.message);
    }
  }

  /**
   * Obtener leaderboard global
   * @param {number} companyId
   * @param {number} limit - Top N (default: 10)
   */
  async getGlobalLeaderboard(companyId, limit = 10) {
    try {
      const result = await sequelize.query(`
        SELECT
          ROW_NUMBER() OVER (ORDER BY vs.total_points DESC) as rank,
          vs.user_id,
          COALESCE(u.display_name, u.usuario, u.email) as user_name,
          vs.total_points,
          vs.suggestions_implemented,
          vs.current_level,
          d.name as department_name,
          vs.badges
        FROM voice_user_stats vs
        JOIN users u ON vs.user_id = u.user_id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE vs.company_id = :companyId
        ORDER BY vs.total_points DESC
        LIMIT :limit
      `, {
        replacements: { companyId, limit },
        type: sequelize.QueryTypes.SELECT
      });

      return result;

    } catch (error) {
      console.error('❌ [GAMIFICATION] Error obteniendo leaderboard:', error.message);
      throw error;
    }
  }

  /**
   * Obtener leaderboard por departamento
   */
  async getDepartmentLeaderboard(companyId, departmentId, limit = 10) {
    try {
      const result = await sequelize.query(`
        SELECT
          ROW_NUMBER() OVER (ORDER BY vs.total_points DESC) as rank,
          vs.user_id,
          COALESCE(u.display_name, u.usuario, u.email) as user_name,
          vs.total_points,
          vs.suggestions_implemented,
          vs.current_level,
          vs.badges
        FROM voice_user_stats vs
        JOIN users u ON vs.user_id = u.user_id
        WHERE vs.company_id = :companyId
          AND u.department_id = :departmentId
        ORDER BY vs.total_points DESC
        LIMIT :limit
      `, {
        replacements: { companyId, departmentId, limit },
        type: sequelize.QueryTypes.SELECT
      });

      return result;

    } catch (error) {
      console.error('❌ [GAMIFICATION] Error obteniendo leaderboard departamento:', error.message);
      throw error;
    }
  }

  /**
   * Obtener leaderboard mensual
   */
  async getMonthlyLeaderboard(companyId, limit = 10) {
    try {
      const result = await sequelize.query(`
        SELECT
          ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank,
          e.employee_id as user_id,
          COALESCE(u.display_name, u.usuario, u.email) as user_name,
          COUNT(*) as monthly_contributions,
          COUNT(*) FILTER (WHERE e.status = 'IMPLEMENTED') as implemented,
          COALESCE(SUM(e.total_points_awarded), 0) as monthly_points
        FROM employee_experiences e
        JOIN users u ON e.employee_id = u.user_id
        WHERE e.company_id = :companyId
          AND e.created_at >= date_trunc('month', CURRENT_DATE)
        GROUP BY e.employee_id, COALESCE(u.display_name, u.usuario, u.email)
        ORDER BY COUNT(*) DESC
        LIMIT :limit
      `, {
        replacements: { companyId, limit },
        type: sequelize.QueryTypes.SELECT
      });

      return result;

    } catch (error) {
      console.error('❌ [GAMIFICATION] Error obteniendo leaderboard mensual:', error.message);
      throw error;
    }
  }

  /**
   * Obtener stats de un usuario
   */
  async getUserStats(userId, companyId) {
    try {
      const result = await sequelize.query(`
        SELECT
          vs.*,
          COALESCE(u.display_name, u.usuario, u.email) as user_name,
          d.name as department_name
        FROM voice_user_stats vs
        JOIN users u ON vs.user_id = u.user_id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE vs.user_id = :userId AND vs.company_id = :companyId
      `, {
        replacements: { userId, companyId },
        type: sequelize.QueryTypes.SELECT
      });

      if (result.length === 0) {
        // Inicializar stats si no existen
        await sequelize.query(`
          INSERT INTO voice_user_stats (user_id, company_id)
          VALUES (:userId, :companyId)
        `, {
          replacements: { userId, companyId }
        });

        return this.getUserStats(userId, companyId);  // Retry
      }

      return result[0];

    } catch (error) {
      console.error('❌ [GAMIFICATION] Error obteniendo stats usuario:', error.message);
      throw error;
    }
  }
}

module.exports = new VoiceGamificationService();
