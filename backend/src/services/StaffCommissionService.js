/**
 * ============================================================================
 * SERVICE: StaffCommissionService
 * ============================================================================
 *
 * Servicio de cálculo de comisiones para el sistema de jerarquía de Aponnt Staff.
 *
 * CARACTERÍSTICAS:
 * - Comisiones piramidales recursivas (CEO → Regional → Supervisor → Leader → Vendor)
 * - Comisiones directas (ventas y soporte)
 * - Integración con funciones PostgreSQL optimizadas
 * - Soporte multi-país y multi-tenant
 * - Reportes mensuales y anuales
 *
 * TIPOS DE COMISIONES:
 * 1. DIRECTA DE VENTAS: % sobre sales_commission_usd de empresas vendidas
 * 2. DIRECTA DE SOPORTE: % sobre support_commission_usd de empresas soportadas
 * 3. PIRAMIDAL: % sobre ventas de TODOS los subordinados en la jerarquía
 *
 * REGLAS:
 * - Solo roles de VENTAS tienen comisión piramidal
 * - Staff puede tener override del % del rol (pyramid_commission_percentage_override)
 * - Porcentajes por defecto: CEO=0.5%, Regional=1%, Supervisor=1.5%, Leader=2%
 * - Los vendedores NO tienen comisión piramidal (solo directa)
 *
 * Autor: Claude Code
 * Fecha: 2025-01-22
 */

const { sequelize, Sequelize } = require('../config/database');
const { QueryTypes } = Sequelize;

class StaffCommissionService {

  /**
   * Calcula comisión piramidal de un staff usando función PostgreSQL
   * @param {string} staffId - UUID del staff
   * @param {number|null} month - Mes (1-12) o null para total
   * @param {number|null} year - Año o null para total
   * @returns {Promise<number>} Comisión piramidal en USD
   */
  async calculatePyramidCommission(staffId, month = null, year = null) {
    try {
      const [result] = await sequelize.query(
        'SELECT calculate_pyramid_commission(:staffId, :month, :year) as pyramid_commission',
        {
          replacements: { staffId, month, year },
          type: QueryTypes.SELECT
        }
      );

      return parseFloat(result?.pyramid_commission || 0);
    } catch (error) {
      console.error(`❌ [STAFF COMMISSIONS] Error calculando comisión piramidal para staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene resumen completo de comisiones de un staff
   * @param {string} staffId - UUID del staff
   * @param {number|null} month - Mes (1-12) o null para total
   * @param {number|null} year - Año o null para total
   * @returns {Promise<Object>} Resumen de comisiones
   */
  async getStaffCommissionSummary(staffId, month = null, year = null) {
    try {
      console.log(`📊 [STAFF COMMISSIONS] Obteniendo resumen para staff ${staffId}, mes: ${month}, año: ${year}`);

      const [result] = await sequelize.query(
        'SELECT * FROM get_staff_commission_summary(:staffId, :month, :year)',
        {
          replacements: { staffId, month, year },
          type: QueryTypes.SELECT
        }
      );

      if (!result) {
        console.log(`⚠️  [STAFF COMMISSIONS] Staff ${staffId} no encontrado`);
        return null;
      }

      const summary = {
        staff_id: result.staff_id,
        staff_name: result.staff_name,
        role_code: result.role_code,
        role_name: result.role_name,
        commissions: {
          direct_sales: parseFloat(result.direct_sales_commission || 0),
          direct_support: parseFloat(result.direct_support_commission || 0),
          pyramid: parseFloat(result.pyramid_commission || 0),
          total: parseFloat(result.total_commission || 0)
        },
        stats: {
          companies_count: parseInt(result.companies_count || 0),
          subordinates_count: parseInt(result.subordinates_count || 0)
        },
        period: {
          month: month,
          year: year
        }
      };

      console.log(`✅ [STAFF COMMISSIONS] Resumen calculado: Total = ${summary.commissions.total} USD`);
      return summary;

    } catch (error) {
      console.error(`❌ [STAFF COMMISSIONS] Error obteniendo resumen para staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene todos los subordinados recursivos de un staff
   * @param {string} staffId - UUID del staff
   * @param {number} maxDepth - Profundidad máxima (default: 10)
   * @returns {Promise<Array>} Array de subordinados con depth y path
   */
  async getStaffSubordinatesRecursive(staffId, maxDepth = 10) {
    try {
      const subordinates = await sequelize.query(
        'SELECT * FROM get_staff_subordinates_recursive(:staffId, :maxDepth)',
        {
          replacements: { staffId, maxDepth },
          type: QueryTypes.SELECT
        }
      );

      return subordinates.map(sub => ({
        staff_id: sub.staff_id,
        staff_name: sub.staff_name,
        role_code: sub.role_code,
        level: parseInt(sub.level),
        depth: parseInt(sub.depth),
        path: sub.path // Array de UUIDs de la ruta jerárquica
      }));

    } catch (error) {
      console.error(`❌ [STAFF COMMISSIONS] Error obteniendo subordinados para staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene porcentaje piramidal efectivo de un staff
   * @param {string} staffId - UUID del staff
   * @returns {Promise<Object>} Porcentaje efectivo y detalles
   */
  async getStaffPyramidPercentage(staffId) {
    try {
      const [result] = await sequelize.query(
        `SELECT * FROM v_staff_pyramid_percentage WHERE staff_id = :staffId`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );

      if (!result) {
        return null;
      }

      return {
        staff_id: result.staff_id,
        staff_name: `${result.first_name} ${result.last_name}`,
        role_code: result.role_code,
        role_name: result.role_name,
        percentages: {
          role_default: parseFloat(result.role_default_percentage || 0),
          staff_override: result.staff_override_percentage ? parseFloat(result.staff_override_percentage) : null,
          effective: parseFloat(result.effective_pyramid_percentage || 0)
        },
        is_active: result.is_active
      };

    } catch (error) {
      console.error(`❌ [STAFF COMMISSIONS] Error obteniendo % piramidal para staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene resumen de comisiones de todo el equipo de ventas
   * @param {string} country - Código ISO-2 del país (AR, BR, CL, MX, etc.) o null para todos
   * @param {number|null} month - Mes (1-12) o null para total
   * @param {number|null} year - Año o null para total
   * @returns {Promise<Array>} Array de resúmenes por staff
   */
  async getSalesTeamCommissionsSummary(country = null, month = null, year = null) {
    try {
      console.log(`📊 [STAFF COMMISSIONS] Obteniendo resumen del equipo de ventas (País: ${country || 'TODOS'})`);

      // Obtener todos los staff de ventas activos
      let query = `
        SELECT s.staff_id
        FROM aponnt_staff s
        INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
        WHERE s.is_active = true AND r.role_area = 'ventas'
      `;

      const replacements = {};
      if (country) {
        query += ' AND s.country = :country';
        replacements.country = country;
      }

      query += ' ORDER BY s.level ASC, s.last_name ASC';

      const salesStaff = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      console.log(`   Encontrados ${salesStaff.length} staff de ventas activos`);

      // Obtener resumen de cada uno
      const summaries = [];
      for (const staff of salesStaff) {
        const summary = await this.getStaffCommissionSummary(staff.staff_id, month, year);
        if (summary) {
          summaries.push(summary);
        }
      }

      // Calcular totales generales
      const totals = summaries.reduce((acc, summary) => ({
        direct_sales: acc.direct_sales + summary.commissions.direct_sales,
        direct_support: acc.direct_support + summary.commissions.direct_support,
        pyramid: acc.pyramid + summary.commissions.pyramid,
        total: acc.total + summary.commissions.total
      }), { direct_sales: 0, direct_support: 0, pyramid: 0, total: 0 });

      console.log(`✅ [STAFF COMMISSIONS] Resumen del equipo completado - Total: ${totals.total} USD`);

      return {
        country: country || 'ALL',
        period: { month, year },
        staff_count: summaries.length,
        summaries,
        totals
      };

    } catch (error) {
      console.error('❌ [STAFF COMMISSIONS] Error obteniendo resumen del equipo:', error);
      throw error;
    }
  }

  /**
   * Actualiza el override de porcentaje piramidal de un staff
   * @param {string} staffId - UUID del staff
   * @param {number|null} newPercentage - Nuevo % (0-100) o null para usar % del rol
   * @returns {Promise<Object>} Staff actualizado
   */
  async updateStaffPyramidPercentageOverride(staffId, newPercentage) {
    try {
      if (newPercentage !== null && (newPercentage < 0 || newPercentage > 100)) {
        throw new Error('El porcentaje debe estar entre 0 y 100');
      }

      console.log(`🔧 [STAFF COMMISSIONS] Actualizando override de staff ${staffId}: ${newPercentage}%`);

      await sequelize.query(
        `UPDATE aponnt_staff
         SET pyramid_commission_percentage_override = :percentage,
             updated_at = CURRENT_TIMESTAMP
         WHERE staff_id = :staffId`,
        {
          replacements: { staffId, percentage: newPercentage },
          type: QueryTypes.UPDATE
        }
      );

      console.log(`✅ [STAFF COMMISSIONS] Override actualizado exitosamente`);

      // Retornar porcentaje efectivo actualizado
      return await this.getStaffPyramidPercentage(staffId);

    } catch (error) {
      console.error(`❌ [STAFF COMMISSIONS] Error actualizando override:`, error);
      throw error;
    }
  }

  /**
   * Obtiene ranking de staff por comisiones totales
   * @param {number|null} month - Mes (1-12) o null
   * @param {number|null} year - Año o null
   * @param {number} limit - Cantidad de resultados (default: 10)
   * @returns {Promise<Array>} Top staff por comisiones
   */
  async getTopStaffByCommissions(month = null, year = null, limit = 10) {
    try {
      console.log(`🏆 [STAFF COMMISSIONS] Obteniendo top ${limit} staff por comisiones`);

      // Obtener todos los staff de ventas
      const salesStaff = await sequelize.query(
        `SELECT s.staff_id
         FROM aponnt_staff s
         INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
         WHERE s.is_active = true AND r.role_area = 'ventas'`,
        { type: QueryTypes.SELECT }
      );

      // Calcular comisiones de cada uno
      const staffWithCommissions = [];
      for (const staff of salesStaff) {
        const summary = await this.getStaffCommissionSummary(staff.staff_id, month, year);
        if (summary && summary.commissions.total > 0) {
          staffWithCommissions.push(summary);
        }
      }

      // Ordenar por total descendente
      staffWithCommissions.sort((a, b) => b.commissions.total - a.commissions.total);

      // Retornar top N
      const top = staffWithCommissions.slice(0, limit);

      console.log(`✅ [STAFF COMMISSIONS] Top ${top.length} staff obtenidos`);
      return top;

    } catch (error) {
      console.error('❌ [STAFF COMMISSIONS] Error obteniendo top staff:', error);
      throw error;
    }
  }

  /**
   * Calcula proyección de comisiones para el mes actual
   * @param {string} staffId - UUID del staff
   * @returns {Promise<Object>} Proyección basada en días transcurridos
   */
  async getMonthlyCommissionProjection(staffId) {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const currentDay = now.getDate();

      // Días totales del mes
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      // Comisiones acumuladas hasta ahora
      const summary = await this.getStaffCommissionSummary(staffId, currentMonth, currentYear);

      if (!summary) {
        return null;
      }

      // Proyección lineal: (comisión_actual / días_transcurridos) * días_totales
      const projectionFactor = daysInMonth / currentDay;

      const projection = {
        staff_id: staffId,
        staff_name: summary.staff_name,
        role: summary.role_code,
        current_period: {
          month: currentMonth,
          year: currentYear,
          days_elapsed: currentDay,
          days_total: daysInMonth,
          progress_percentage: ((currentDay / daysInMonth) * 100).toFixed(2)
        },
        accumulated: summary.commissions,
        projected: {
          direct_sales: (summary.commissions.direct_sales * projectionFactor).toFixed(2),
          direct_support: (summary.commissions.direct_support * projectionFactor).toFixed(2),
          pyramid: (summary.commissions.pyramid * projectionFactor).toFixed(2),
          total: (summary.commissions.total * projectionFactor).toFixed(2)
        }
      };

      return projection;

    } catch (error) {
      console.error(`❌ [STAFF COMMISSIONS] Error calculando proyección:`, error);
      throw error;
    }
  }
}

module.exports = new StaffCommissionService();
