/**
 * =====================================================================
 * SERVICIO: VendorHierarchyService
 * =====================================================================
 *
 * Helper functions para queries jerárquicas del sistema de roles y comisiones.
 * Implementa la lógica de filtrado según rol del vendedor.
 *
 * IMPORTANTE: SOLO agrega funcionalidad NUEVA, NO modifica funcionalidad existente.
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class VendorHierarchyService {
  /**
   * Obtiene todas las empresas que un staff puede ver según su rol
   *
   * @param {UUID} staffId - ID del staff
   * @param {String} role - Rol del staff
   * @returns {Promise<Array>} - IDs de empresas visibles
   */
  static async getVisibleCompanyIds(staffId, role) {
    // CEO ve TODO
    if (role === 'ceo') {
      const result = await sequelize.query(
        `SELECT company_id FROM companies WHERE is_active = true`,
        { type: QueryTypes.SELECT }
      );
      return result.map(r => r.company_id);
    }

    // Regional Manager ve empresas de sus supervisores
    if (role === 'regional_sales_manager' || role === 'regional_support_manager') {
      const vendorField = role === 'regional_sales_manager' ? 'assigned_vendor_id' : 'support_vendor_id';

      const result = await sequelize.query(
        `SELECT DISTINCT c.company_id
         FROM companies c
         JOIN aponnt_staff s ON c.${vendorField} = s.id
         WHERE s.regional_manager_id = :staffId AND c.is_active = true`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.company_id);
    }

    // Supervisor ve empresas de sus líderes
    if (role === 'sales_supervisor' || role === 'support_supervisor') {
      const vendorField = role === 'sales_supervisor' ? 'assigned_vendor_id' : 'support_vendor_id';

      const result = await sequelize.query(
        `SELECT DISTINCT c.company_id
         FROM companies c
         JOIN aponnt_staff s ON c.${vendorField} = s.id
         WHERE s.supervisor_id = :staffId AND c.is_active = true`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.company_id);
    }

    // Líder ve empresas de sus vendedores
    if (role === 'sales_leader') {
      const result = await sequelize.query(
        `SELECT DISTINCT c.company_id
         FROM companies c
         JOIN aponnt_staff s ON c.assigned_vendor_id = s.id
         WHERE s.leader_id = :staffId AND c.is_active = true`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.company_id);
    }

    // Sales Rep ve SOLO sus empresas de venta
    if (role === 'sales_rep') {
      const result = await sequelize.query(
        `SELECT company_id FROM companies
         WHERE assigned_vendor_id = :staffId AND is_active = true`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.company_id);
    }

    // Support Agent ve SOLO sus empresas de soporte
    if (role === 'support_agent') {
      const result = await sequelize.query(
        `SELECT company_id FROM companies
         WHERE support_vendor_id = :staffId AND is_active = true`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.company_id);
    }

    // Roles sin acceso a empresas (admin, marketing, accounting)
    return [];
  }

  /**
   * Obtiene todos los subordinados de un staff (recursivo)
   *
   * @param {UUID} staffId - ID del staff
   * @param {String} role - Rol del staff
   * @returns {Promise<Array>} - IDs de subordinados
   */
  static async getSubordinateIds(staffId, role) {
    // CEO ve a TODOS
    if (role === 'ceo') {
      const result = await sequelize.query(
        `SELECT id FROM aponnt_staff WHERE is_active = true AND id != :staffId`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.id);
    }

    // Regional Manager ve a todos bajo su línea
    if (role === 'regional_sales_manager' || role === 'regional_support_manager') {
      const result = await sequelize.query(
        `WITH RECURSIVE subordinates AS (
          -- Base: supervisores directos
          SELECT id FROM aponnt_staff
          WHERE regional_manager_id = :staffId AND is_active = true

          UNION

          -- Recursivo: líderes de los supervisores
          SELECT s.id FROM aponnt_staff s
          INNER JOIN subordinates sub ON s.supervisor_id = sub.id
          WHERE s.is_active = true

          UNION

          -- Recursivo: vendedores de los líderes
          SELECT s.id FROM aponnt_staff s
          INNER JOIN subordinates sub ON s.leader_id = sub.id
          WHERE s.is_active = true
        )
        SELECT id FROM subordinates`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.id);
    }

    // Supervisor ve a sus líderes y vendedores
    if (role === 'sales_supervisor' || role === 'support_supervisor') {
      const result = await sequelize.query(
        `WITH RECURSIVE subordinates AS (
          -- Base: líderes directos
          SELECT id FROM aponnt_staff
          WHERE supervisor_id = :staffId AND is_active = true

          UNION

          -- Recursivo: vendedores de los líderes
          SELECT s.id FROM aponnt_staff s
          INNER JOIN subordinates sub ON s.leader_id = sub.id
          WHERE s.is_active = true
        )
        SELECT id FROM subordinates`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.id);
    }

    // Líder ve a sus vendedores
    if (role === 'sales_leader') {
      const result = await sequelize.query(
        `SELECT id FROM aponnt_staff
         WHERE leader_id = :staffId AND is_active = true`,
        {
          replacements: { staffId },
          type: QueryTypes.SELECT
        }
      );
      return result.map(r => r.id);
    }

    // Sales Rep, Support Agent, otros roles: sin subordinados
    return [];
  }

  /**
   * Verifica si un staff puede ver una empresa específica
   *
   * @param {UUID} staffId - ID del staff
   * @param {String} role - Rol del staff
   * @param {Number} companyId - ID de la empresa
   * @returns {Promise<Boolean>}
   */
  static async canViewCompany(staffId, role, companyId) {
    const visibleIds = await this.getVisibleCompanyIds(staffId, role);
    return visibleIds.includes(companyId);
  }
}

module.exports = VendorHierarchyService;
