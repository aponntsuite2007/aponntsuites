/**
 * =====================================================================
 * RUTAS: Vendor Commissions Routes (Sistema de Roles y Comisiones)
 * =====================================================================
 *
 * Nuevas rutas para el sistema de roles jerárquicos y comisiones piramidales.
 *
 * IMPORTANTE:
 * - Estas rutas SON NUEVAS, NO modifican rutas existentes
 * - Son 100% ADICIONALES a la funcionalidad existente
 * - NO rompen panel-empresa.html ni panel-administrativo.html
 *
 * Base Path: /api/vendors/*
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const VendorHierarchyService = require('../services/VendorHierarchyService');

// Middleware de autenticación Aponnt Staff (implementar según necesidad)
const requireAponntAuth = (req, res, next) => {
  // TODO: Implementar autenticación real cuando se integre con frontend
  // Por ahora solo pasa, ya que esto es backend-only
  next();
};

/**
 * GET /api/vendors/statistics/:vendorId
 * Obtiene estadísticas completas de un vendedor
 */
router.get('/statistics/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    const stats = await sequelize.query(
      `SELECT * FROM vendor_statistics WHERE vendor_id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    if (stats.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estadísticas no encontradas'
      });
    }

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Error getting vendor statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/companies/:vendorId
 * Obtiene empresas visibles para un vendedor según su rol
 */
router.get('/companies/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Obtener rol del vendedor
    const vendor = await sequelize.query(
      `SELECT r.role_code as role FROM aponnt_staff s
       JOIN aponnt_staff_roles r ON s.role_id = r.role_id
       WHERE s.staff_id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    if (vendor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }

    const { role } = vendor[0];

    // Obtener IDs de empresas visibles
    const visibleIds = await VendorHierarchyService.getVisibleCompanyIds(vendorId, role);

    // Si no tiene empresas visibles, devolver array vacío
    if (visibleIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Obtener datos completos de las empresas
    const companies = await sequelize.query(
      `SELECT company_id, name, slug, is_active, monthly_total,
              assigned_vendor_id, support_vendor_id,
              sales_commission_usd, support_commission_usd
       FROM companies
       WHERE company_id = ANY(:visibleIds)
       ORDER BY name ASC`,
      {
        replacements: { visibleIds },
        type: QueryTypes.SELECT
      }
    );

    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Error getting vendor companies:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empresas',
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/subordinates/:vendorId
 * Obtiene subordinados de un vendedor según su rol
 */
router.get('/subordinates/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Obtener rol del vendedor
    const vendor = await sequelize.query(
      `SELECT r.role_code as role FROM aponnt_staff s
       JOIN aponnt_staff_roles r ON s.role_id = r.role_id
       WHERE s.staff_id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    if (vendor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }

    const { role } = vendor[0];

    // Obtener IDs de subordinados
    const subordinateIds = await VendorHierarchyService.getSubordinateIds(vendorId, role);

    // Si no tiene subordinados, devolver array vacío
    if (subordinateIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Obtener datos completos de los subordinados
    const subordinates = await sequelize.query(
      `SELECT s.staff_id as id, s.first_name, s.last_name, s.email, r.role_name as role, s.is_active
       FROM aponnt_staff s
       JOIN aponnt_staff_roles r ON s.role_id = r.role_id
       WHERE s.staff_id = ANY(:subordinateIds)
       ORDER BY s.first_name ASC, s.last_name ASC`,
      {
        replacements: { subordinateIds },
        type: QueryTypes.SELECT
      }
    );

    res.json({ success: true, data: subordinates });
  } catch (error) {
    console.error('Error getting vendor subordinates:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener subordinados',
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/commission-summary/:vendorId
 * Obtiene resumen de comisiones de un vendedor (usa función PostgreSQL)
 */
router.get('/commission-summary/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { month, year } = req.query;

    const summary = await sequelize.query(
      `SELECT * FROM get_staff_commission_summary(:vendorId, :month, :year)`,
      {
        replacements: {
          vendorId,
          month: month || null,
          year: year || null
        },
        type: QueryTypes.SELECT
      }
    );

    if (summary.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado o sin comisiones'
      });
    }

    res.json({ success: true, data: summary[0] });
  } catch (error) {
    console.error('Error getting commission summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de comisiones',
      error: error.message
    });
  }
});

/**
 * POST /api/vendors/refresh-statistics/:vendorId
 * Recalcula estadísticas de un vendedor (llamando a función PostgreSQL)
 */
router.post('/refresh-statistics/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    await sequelize.query(
      `SELECT refresh_vendor_statistics(:vendorId)`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    // Obtener estadísticas actualizadas
    const stats = await sequelize.query(
      `SELECT * FROM vendor_statistics WHERE vendor_id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      message: 'Estadísticas actualizadas correctamente',
      data: stats[0] || null
    });
  } catch (error) {
    console.error('Error refreshing vendor statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estadísticas',
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/can-view-company/:vendorId/:companyId
 * Verifica si un vendedor puede ver una empresa específica
 */
router.get('/can-view-company/:vendorId/:companyId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId, companyId } = req.params;

    // Obtener rol del vendedor
    const vendor = await sequelize.query(
      `SELECT r.role_code as role FROM aponnt_staff s
       JOIN aponnt_staff_roles r ON s.role_id = r.role_id
       WHERE s.staff_id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    if (vendor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }

    const { role } = vendor[0];

    // Verificar permiso
    const canView = await VendorHierarchyService.canViewCompany(vendorId, role, parseInt(companyId));

    res.json({ success: true, canView });
  } catch (error) {
    console.error('Error checking company access:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso',
      error: error.message
    });
  }
});

// =====================================================================
// ENDPOINTS PARA vendor-invoicing-system.js (Frontend)
// =====================================================================

/**
 * GET /api/vendors/stats
 * Estadísticas generales para el dashboard
 */
router.get('/stats', requireAponntAuth, async (req, res) => {
  try {
    const [stats] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM aponnt_staff s JOIN aponnt_staff_roles r ON s.role_id = r.role_id WHERE s.is_active = true AND r.is_sales_role = true) as total_vendors,
        (SELECT COUNT(*) FROM aponnt_staff s JOIN aponnt_staff_roles r ON s.role_id = r.role_id WHERE s.is_active = true AND r.is_sales_role = true) as active_vendors,
        (SELECT COALESCE(SUM(monthly_total), 0) FROM companies WHERE is_active = true) as total_revenue,
        (SELECT COUNT(*) FROM invoices WHERE status = 'pending') as pending_invoices,
        (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_invoices
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, stats: stats || {} });
  } catch (error) {
    console.error('Error getting vendor stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vendors/partners
 * Lista de vendedores/partners (type=seller)
 */
router.get('/partners', requireAponntAuth, async (req, res) => {
  try {
    const { type } = req.query;

    let roleFilter = "r.is_sales_role = true";
    if (type === 'seller') {
      roleFilter = "r.role_code = 'VEND'";
    }

    const partners = await sequelize.query(`
      SELECT
        s.staff_id as id,
        s.first_name || ' ' || s.last_name as name,
        s.email,
        s.phone,
        r.role_name as role,
        s.is_active,
        (SELECT COUNT(*) FROM companies c WHERE c.vendor_id = s.staff_id) as total_companies,
        COALESCE((SELECT SUM(vc.monthly_amount) FROM vendor_commissions vc WHERE vc.vendor_id = s.staff_id AND vc.is_active = true), 0) as total_commissions,
        COALESCE(s.global_rating, 3.0) as current_score,
        CASE WHEN s.is_active THEN 'activo' ELSE 'inactivo' END as status
      FROM aponnt_staff s
      JOIN aponnt_staff_roles r ON s.role_id = r.role_id
      WHERE ${roleFilter}
      ORDER BY s.first_name, s.last_name
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, partners });
  } catch (error) {
    console.error('Error getting partners:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vendors/quotes
 * Lista de presupuestos
 */
router.get('/quotes', requireAponntAuth, async (req, res) => {
  try {
    const { status, month } = req.query;

    let whereClause = 'WHERE 1=1';
    if (status) whereClause += ` AND b.status = '${status}'`;
    if (month) whereClause += ` AND EXTRACT(MONTH FROM b.created_at) = ${month}`;

    const quotes = await sequelize.query(`
      SELECT
        b.id,
        b.budget_code as quote_number,
        c.name as company_name,
        COALESCE(s.first_name || ' ' || s.last_name, 'Sin asignar') as seller_name,
        b.created_at as issue_date,
        b.valid_until,
        b.total_monthly as total_amount,
        b.status
      FROM budgets b
      LEFT JOIN companies c ON b.company_id = c.company_id
      LEFT JOIN aponnt_staff s ON b.vendor_id = s.staff_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT 100
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, quotes });
  } catch (error) {
    console.error('Error getting quotes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vendors/contracts
 * Lista de contratos
 */
router.get('/contracts', requireAponntAuth, async (req, res) => {
  try {
    const { status, month } = req.query;

    let whereClause = 'WHERE 1=1';
    if (status) whereClause += ` AND ct.status = '${status}'`;
    if (month) whereClause += ` AND EXTRACT(MONTH FROM ct.created_at) = ${month}`;

    const contracts = await sequelize.query(`
      SELECT
        ct.id,
        ct.contract_code as contract_number,
        c.name as company_name,
        COALESCE(s.first_name || ' ' || s.last_name, 'Sin asignar') as seller_name,
        ct.contract_date as start_date,
        ct.valid_until as end_date,
        ct.total_monthly as total_amount,
        ct.status
      FROM contracts ct
      LEFT JOIN companies c ON ct.company_id = c.company_id
      LEFT JOIN budgets b ON ct.budget_id = b.id
      LEFT JOIN aponnt_staff s ON b.vendor_id = s.staff_id
      ${whereClause}
      ORDER BY ct.created_at DESC
      LIMIT 100
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, contracts });
  } catch (error) {
    console.error('Error getting contracts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vendors/invoices
 * Lista de facturas
 */
router.get('/invoices', requireAponntAuth, async (req, res) => {
  try {
    const { status, month } = req.query;

    let whereClause = 'WHERE 1=1';
    if (status) whereClause += ` AND i.status = '${status}'`;
    if (month) whereClause += ` AND EXTRACT(MONTH FROM i.issue_date) = ${month}`;

    const invoices = await sequelize.query(`
      SELECT
        i.id,
        i.invoice_number,
        c.name as company_name,
        i.billing_period_month,
        i.billing_period_year,
        i.total_amount,
        i.status,
        i.due_date,
        i.issue_date
      FROM invoices i
      LEFT JOIN companies c ON i.company_id = c.company_id
      ${whereClause}
      ORDER BY i.issue_date DESC
      LIMIT 100
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, invoices });
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vendors/payments
 * Lista de pagos
 */
router.get('/payments', requireAponntAuth, async (req, res) => {
  try {
    const { status, month } = req.query;

    let whereClause = "WHERE i.status = 'paid'";
    if (month) whereClause += ` AND EXTRACT(MONTH FROM i.paid_at) = ${month}`;

    const payments = await sequelize.query(`
      SELECT
        i.id,
        i.invoice_number,
        c.name as company_name,
        i.total_amount as amount,
        'TRANSFERENCIA' as payment_method,
        i.paid_at as payment_date,
        '' as payment_proof_url
      FROM invoices i
      LEFT JOIN companies c ON i.company_id = c.company_id
      ${whereClause}
      ORDER BY i.paid_at DESC
      LIMIT 100
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, payments });
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vendors/commissions
 * Lista de comisiones
 */
router.get('/commissions', requireAponntAuth, async (req, res) => {
  try {
    const { status, month } = req.query;

    let whereClause = 'WHERE 1=1';
    if (status) whereClause += ` AND pct.status = '${status}'`;
    if (month) whereClause += ` AND EXTRACT(MONTH FROM pct.transaction_date) = ${month}`;

    const commissions = await sequelize.query(`
      SELECT
        pct.id,
        p.first_name || ' ' || p.last_name as partner_name,
        c.name as company_name,
        pct.billable_amount,
        pct.commission_percentage,
        pct.commission_amount,
        pct.net_amount,
        pct.status,
        pct.transaction_date
      FROM partner_commission_transactions pct
      LEFT JOIN partners p ON pct.partner_id = p.id
      LEFT JOIN companies c ON pct.company_id = c.company_id
      ${whereClause}
      ORDER BY pct.transaction_date DESC
      LIMIT 100
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, commissions });
  } catch (error) {
    console.error('Error getting commissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vendors/quotes/:id/accept
 * Aceptar presupuesto
 */
router.post('/quotes/:id/accept', requireAponntAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await sequelize.query(`
      UPDATE budgets SET status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id }, type: QueryTypes.UPDATE });

    res.json({ success: true, message: 'Presupuesto aceptado' });
  } catch (error) {
    console.error('Error accepting quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vendors/quotes/:id/reject
 * Rechazar presupuesto
 */
router.post('/quotes/:id/reject', requireAponntAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await sequelize.query(`
      UPDATE budgets SET status = 'REJECTED', updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id }, type: QueryTypes.UPDATE });

    res.json({ success: true, message: 'Presupuesto rechazado' });
  } catch (error) {
    console.error('Error rejecting quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vendors/quotes/:id/convert-to-contract
 * Convertir presupuesto a contrato
 */
router.post('/quotes/:id/convert-to-contract', requireAponntAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos del presupuesto
    const [budget] = await sequelize.query(`
      SELECT * FROM budgets WHERE id = :id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (!budget) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    // Crear contrato
    const contractNumber = `CTR-${Date.now()}`;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Template básico del contrato
    const templateContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>CONTRATO DE SERVICIO ${contractNumber}</h1>
        <p>Fecha: ${startDate.toLocaleDateString('es-AR')}</p>
        <p>Vigencia: ${startDate.toLocaleDateString('es-AR')} - ${endDate.toLocaleDateString('es-AR')}</p>
        <p>Monto mensual: USD ${budget.total_monthly}</p>
      </div>
    `;

    await sequelize.query(`
      INSERT INTO contracts (
        company_id, vendor_id, contract_number, budget_id,
        monthly_amount, start_date, end_date, status, created_at, template_content, selected_modules,
        contracted_employees, total_monthly, contract_type, template_version, contract_date, contract_code, trace_id
      ) VALUES (
        :company_id, :vendor_id, :contract_number, :budget_id,
        :monthly_amount, :start_date, :end_date, 'active', NOW(), :template_content, :selected_modules,
        :contracted_employees, :total_monthly, 'EULA', '1.0', CURRENT_DATE, :contract_code, :trace_id
      )
    `, {
      replacements: {
        company_id: budget.company_id,
        vendor_id: budget.vendor_id,
        contract_number: contractNumber,
        contract_code: contractNumber,
        budget_id: budget.id,
        monthly_amount: budget.total_monthly,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        template_content: templateContent,
        selected_modules: JSON.stringify(budget.selected_modules || []),
        contracted_employees: budget.contracted_employees || 1,
        total_monthly: budget.total_monthly || 0,
        trace_id: budget.trace_id || `BUDGET-${budget.id}`
      },
      type: QueryTypes.INSERT
    });

    // Actualizar presupuesto
    await sequelize.query(`
      UPDATE budgets SET status = 'CONVERTED', updated_at = NOW() WHERE id = :id
    `, { replacements: { id }, type: QueryTypes.UPDATE });

    res.json({ success: true, message: 'Contrato creado exitosamente', contract_number: contractNumber });
  } catch (error) {
    console.error('Error converting quote to contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vendors/invoices/generate-monthly
 * Generar facturas mensuales
 */
router.post('/invoices/generate-monthly', requireAponntAuth, async (req, res) => {
  try {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Obtener contratos activos
    const contracts = await sequelize.query(`
      SELECT ct.*, c.name as company_name
      FROM contracts ct
      JOIN companies c ON ct.company_id = c.company_id
      WHERE ct.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.company_id = ct.company_id
            AND i.billing_period_month = :month
            AND i.billing_period_year = :year
        )
    `, { replacements: { month, year }, type: QueryTypes.SELECT });

    let generated = 0;
    for (const contract of contracts) {
      const invoiceNumber = `INV-${year}${String(month).padStart(2, '0')}-${contract.company_id}`;
      const dueDate = new Date(year, month, 15); // Vence el 15 del próximo mes

      await sequelize.query(`
        INSERT INTO invoices (
          company_id, contract_id, invoice_number,
          billing_period_month, billing_period_year,
          amount_usd, currency, status, due_date, created_at
        ) VALUES (
          :company_id, :contract_id, :invoice_number,
          :month, :year, :amount, 'USD', 'pending', :due_date, NOW()
        )
      `, {
        replacements: {
          company_id: contract.company_id,
          contract_id: contract.id,
          invoice_number: invoiceNumber,
          month, year,
          amount: contract.monthly_amount || 0,
          due_date: dueDate.toISOString().split('T')[0]
        },
        type: QueryTypes.INSERT
      });
      generated++;
    }

    res.json({
      success: true,
      message: `${generated} facturas generadas para ${month}/${year}`,
      generated
    });
  } catch (error) {
    console.error('Error generating monthly invoices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
