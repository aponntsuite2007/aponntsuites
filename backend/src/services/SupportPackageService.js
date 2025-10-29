/**
 * SERVICE: SupportPackageService
 *
 * Servicio para gestión completa de paquetes de soporte.
 * Maneja asignación, transferencia, subastas y pérdida de paquetes.
 *
 * FUNCIONALIDADES:
 * - Crear paquete de soporte al activar empresa
 * - Gestionar subastas cuando partner tiene bajo rating
 * - Transferir paquete a nuevo partner (ganador de subasta)
 * - Registrar pérdida de paquete
 * - Actualizar ratings de paquetes
 */

const { sequelize } = require('../config/database');
const SupportPackage = require('../models/SupportPackage');

class SupportPackageService {
  /**
   * Crea un paquete de soporte al activar una empresa nueva
   * @param {Object} params
   * @param {number} params.company_id - ID de empresa
   * @param {number} params.seller_id - ID del vendedor
   * @param {number} params.support_id - ID del partner de soporte inicial
   * @param {number} params.commission_rate - Tasa de comisión mensual
   * @param {number} params.monthly_amount - Monto mensual estimado
   * @returns {Promise<Object>} Paquete creado
   */
  async createSupportPackage({ company_id, seller_id, support_id, commission_rate, monthly_amount }) {
    const transaction = await sequelize.transaction();

    try {
      console.log(`\n📦 [SUPPORT PKG] Creando paquete de soporte...`);
      console.log(`   Empresa: ${company_id}`);
      console.log(`   Soporte: ${support_id}`);
      console.log(`   Comisión: ${commission_rate}%`);

      const supportPackage = await SupportPackage.create({
        company_id,
        current_support_id: support_id,
        original_support_id: support_id,
        seller_id,
        status: 'active',
        monthly_commission_rate: commission_rate,
        estimated_monthly_amount: monthly_amount,
        current_rating: 0.00,
        ratings_count: 0,
        assigned_at: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`   ✅ Paquete de soporte creado ID: ${supportPackage.id}`);

      return {
        success: true,
        package: supportPackage
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [SUPPORT PKG] Error creando paquete:', error);
      throw error;
    }
  }

  /**
   * Transfiere paquete de soporte a nuevo partner
   * @param {number} packageId - ID del paquete
   * @param {number} newSupportId - ID del nuevo partner de soporte
   * @param {string} reason - Razón de la transferencia
   * @param {number} newCommissionRate - Nueva tasa de comisión (opcional)
   * @returns {Promise<Object>} Resultado
   */
  async transferPackage(packageId, newSupportId, reason, newCommissionRate = null) {
    const transaction = await sequelize.transaction();

    try {
      console.log(`\n🔄 [SUPPORT PKG] Transfiriendo paquete ID ${packageId}...`);

      // 1. Obtener paquete actual
      const supportPackage = await SupportPackage.findByPk(packageId, { transaction });

      if (!supportPackage) {
        throw new Error(`Paquete ID ${packageId} no encontrado`);
      }

      const oldSupportId = supportPackage.current_support_id;

      // 2. Actualizar paquete
      await supportPackage.update({
        current_support_id: newSupportId,
        monthly_commission_rate: newCommissionRate || supportPackage.monthly_commission_rate,
        last_support_change_at: new Date(),
        last_support_change_reason: reason,
        current_rating: 0.00,  // Resetear rating
        ratings_count: 0
      }, { transaction });

      // 3. Actualizar empresa
      await sequelize.query(
        `UPDATE companies
         SET support_id = :newSupportId,
             support_commission_rate = :newRate
         WHERE company_id = :companyId`,
        {
          replacements: {
            newSupportId,
            newRate: newCommissionRate || supportPackage.monthly_commission_rate,
            companyId: supportPackage.company_id
          },
          type: sequelize.QueryTypes.UPDATE,
          transaction
        }
      );

      // 4. Crear notificaciones
      await this.createTransferNotifications(supportPackage, oldSupportId, newSupportId, reason, transaction);

      await transaction.commit();

      console.log(`   ✅ Paquete transferido exitosamente`);
      console.log(`   De: Partner ${oldSupportId} → A: Partner ${newSupportId}`);

      return {
        success: true,
        package_id: packageId,
        old_support_id: oldSupportId,
        new_support_id: newSupportId,
        reason
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [SUPPORT PKG] Error transfiriendo paquete:', error);
      throw error;
    }
  }

  /**
   * Marca paquete como perdido por el partner actual
   * @param {number} packageId - ID del paquete
   * @param {string} reason - Razón de la pérdida
   * @returns {Promise<Object>} Resultado
   */
  async markPackageAsLost(packageId, reason) {
    const transaction = await sequelize.transaction();

    try {
      console.log(`\n❌ [SUPPORT PKG] Marcando paquete ID ${packageId} como perdido...`);

      const supportPackage = await SupportPackage.findByPk(packageId, { transaction });

      if (!supportPackage) {
        throw new Error(`Paquete ID ${packageId} no encontrado`);
      }

      await supportPackage.update({
        status: 'lost',
        lost_at: new Date(),
        lost_reason: reason
      }, { transaction });

      await transaction.commit();

      console.log(`   ✅ Paquete marcado como perdido`);

      return {
        success: true,
        package_id: packageId,
        reason
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [SUPPORT PKG] Error marcando paquete como perdido:', error);
      throw error;
    }
  }

  /**
   * Actualiza rating de un paquete de soporte
   * @param {number} packageId - ID del paquete
   * @param {number} rating - Rating (1-5)
   * @returns {Promise<Object>} Paquete actualizado
   */
  async updatePackageRating(packageId, rating) {
    try {
      console.log(`\n⭐ [SUPPORT PKG] Actualizando rating paquete ID ${packageId}: ${rating}`);

      const supportPackage = await SupportPackage.findByPk(packageId);

      if (!supportPackage) {
        throw new Error(`Paquete ID ${packageId} no encontrado`);
      }

      // Calcular nuevo promedio
      const currentTotal = supportPackage.current_rating * supportPackage.ratings_count;
      const newTotal = currentTotal + rating;
      const newCount = supportPackage.ratings_count + 1;
      const newAverage = newTotal / newCount;

      await supportPackage.update({
        current_rating: newAverage.toFixed(2),
        ratings_count: newCount
      });

      console.log(`   ✅ Rating actualizado: ${newAverage.toFixed(2)} (${newCount} ratings)`);

      // Si rating < 2.0, disparar alerta
      if (newAverage < 2.0) {
        console.log(`   ⚠️  ALERTA: Rating bajo, considerar crear subasta`);
      }

      return {
        success: true,
        package_id: packageId,
        new_rating: parseFloat(newAverage.toFixed(2)),
        ratings_count: newCount
      };

    } catch (error) {
      console.error('❌ [SUPPORT PKG] Error actualizando rating:', error);
      throw error;
    }
  }

  /**
   * Obtiene paquetes de un partner específico
   * @param {number} partnerId - ID del partner
   * @param {string} status - Estado de paquetes (opcional)
   * @returns {Promise<Array>} Lista de paquetes
   */
  async getPartnerPackages(partnerId, status = 'active') {
    try {
      const packages = await sequelize.query(
        `SELECT
          sp.*,
          c.name as company_name,
          c.slug as company_slug,
          c.status as company_status
        FROM support_packages sp
        INNER JOIN companies c ON c.company_id = sp.company_id
        WHERE sp.current_support_id = :partnerId
        ${status ? 'AND sp.status = :status' : ''}
        ORDER BY sp.current_rating ASC, sp.assigned_at DESC`,
        {
          replacements: { partnerId, status },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return packages;
    } catch (error) {
      console.error('❌ [SUPPORT PKG] Error obteniendo paquetes:', error);
      throw error;
    }
  }

  /**
   * Obtiene paquetes con rating bajo
   * @param {number} threshold - Umbral de rating (default: 2.0)
   * @returns {Promise<Array>} Paquetes con rating bajo
   */
  async getLowRatingPackages(threshold = 2.0) {
    try {
      const packages = await sequelize.query(
        `SELECT
          sp.*,
          c.name as company_name,
          c.slug as company_slug,
          p.name as support_partner_name,
          p.email as support_partner_email
        FROM support_packages sp
        INNER JOIN companies c ON c.company_id = sp.company_id
        INNER JOIN partners p ON p.id = sp.current_support_id
        WHERE sp.current_rating < :threshold
        AND sp.status = 'active'
        AND sp.ratings_count >= 3
        ORDER BY sp.current_rating ASC`,
        {
          replacements: { threshold },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return packages;
    } catch (error) {
      console.error('❌ [SUPPORT PKG] Error obteniendo paquetes con rating bajo:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de paquetes
   * @returns {Promise<Object>} Estadísticas generales
   */
  async getPackagesStats() {
    try {
      const [stats] = await sequelize.query(
        `SELECT
          COUNT(*) as total_packages,
          COUNT(*) FILTER (WHERE status = 'active') as active_packages,
          COUNT(*) FILTER (WHERE status = 'lost') as lost_packages,
          COUNT(*) FILTER (WHERE current_rating < 2.0 AND status = 'active') as low_rating_packages,
          AVG(current_rating) FILTER (WHERE status = 'active') as avg_rating,
          SUM(estimated_monthly_amount) FILTER (WHERE status = 'active') as total_monthly_value
        FROM support_packages`,
        {
          type: sequelize.QueryTypes.SELECT
        }
      );

      return {
        success: true,
        stats: {
          total_packages: parseInt(stats.total_packages) || 0,
          active_packages: parseInt(stats.active_packages) || 0,
          lost_packages: parseInt(stats.lost_packages) || 0,
          low_rating_packages: parseInt(stats.low_rating_packages) || 0,
          avg_rating: parseFloat(stats.avg_rating || 0).toFixed(2),
          total_monthly_value: parseFloat(stats.total_monthly_value || 0).toFixed(2)
        }
      };

    } catch (error) {
      console.error('❌ [SUPPORT PKG] Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Crea notificaciones de transferencia de paquete
   */
  async createTransferNotifications(supportPackage, oldSupportId, newSupportId, reason, transaction) {
    try {
      // Notificación al partner anterior
      await sequelize.query(
        `INSERT INTO notifications (
          recipient_type,
          recipient_id,
          type,
          title,
          message,
          priority,
          data,
          created_at,
          is_read
        ) VALUES (
          'partner',
          :oldSupportId,
          'package_lost',
          'Paquete de Soporte Transferido',
          :message,
          'high',
          :data,
          CURRENT_TIMESTAMP,
          false
        )`,
        {
          replacements: {
            oldSupportId,
            message: `Has perdido el paquete de soporte de la empresa ID ${supportPackage.company_id}. Razón: ${reason}`,
            data: JSON.stringify({
              package_id: supportPackage.id,
              company_id: supportPackage.company_id,
              reason,
              transferred_to: newSupportId
            })
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );

      // Notificación al nuevo partner
      await sequelize.query(
        `INSERT INTO notifications (
          recipient_type,
          recipient_id,
          type,
          title,
          message,
          priority,
          data,
          created_at,
          is_read
        ) VALUES (
          'partner',
          :newSupportId,
          'package_won',
          'Nuevo Paquete de Soporte Asignado',
          :message,
          'high',
          :data,
          CURRENT_TIMESTAMP,
          false
        )`,
        {
          replacements: {
            newSupportId,
            message: `Has recibido un nuevo paquete de soporte de la empresa ID ${supportPackage.company_id}. Comisión: ${supportPackage.monthly_commission_rate}%`,
            data: JSON.stringify({
              package_id: supportPackage.id,
              company_id: supportPackage.company_id,
              commission_rate: supportPackage.monthly_commission_rate,
              estimated_monthly: supportPackage.estimated_monthly_amount
            })
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );

    } catch (error) {
      console.error('❌ Error creando notificaciones de transferencia:', error);
      // No lanzar error, solo log
    }
  }
}

module.exports = new SupportPackageService();
