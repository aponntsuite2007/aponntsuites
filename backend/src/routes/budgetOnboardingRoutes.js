/**
 * ROUTES: Budget Onboarding (Presupuestos Alta de Empresa)
 *
 * Endpoints REST para workflow altaEmpresa - FASE 1
 * Tablas: budgets, companies
 * Trace ID: ONBOARDING-{UUID}
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { auth: authMiddleware } = require('../middleware/auth');

// 🔔 Servicio de Notificaciones Enterprise (altaEmpresa workflow)
// TEMP COMMENTED: const AltaEmpresaNotificationService = require('../services/AltaEmpresaNotificationService');

// Conexión PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB || 'attendance_system',
  port: 5432
});

/**
 * POST /api/budgets/onboarding/create
 * Crear presupuesto para alta de empresa (FASE 1)
 *
 * Body:
 * {
 *   company_id: number,
 *   vendor_id: uuid,
 *   selected_modules: [{module_key, price, employees}],
 *   contracted_employees: number,
 *   discount_percentage?: number,
 *   discount_reason?: string,
 *   payment_terms?: string,
 *   valid_days?: number
 * }
 */
router.post('/onboarding/create', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      company_id,
      vendor_id,
      selected_modules,
      contracted_employees,
      discount_percentage = 0,
      discount_reason,
      payment_terms = 'MENSUAL',
      valid_days = 30,
      notes
    } = req.body;

    // Validaciones
    if (!company_id || !vendor_id || !selected_modules || !contracted_employees) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: company_id, vendor_id, selected_modules, contracted_employees'
      });
    }

    await client.query('BEGIN');

    // Generar trace_id único
    const trace_id = `ONBOARDING-${uuidv4()}`;

    // Calcular totales
    const total_monthly = selected_modules.reduce((sum, mod) => sum + (mod.price || 0), 0);
    const total_after_discount = total_monthly * (1 - (discount_percentage / 100));
    const total_annual = total_after_discount * 12;

    // Generar budget_code
    const budgetCodeResult = await client.query(`
      SELECT generate_budget_code() AS code
    `);
    const budget_code = budgetCodeResult.rows[0].code;

    // Calcular valid_until
    const valid_until = new Date();
    valid_until.setDate(valid_until.getDate() + valid_days);

    // Insertar budget
    const budgetResult = await client.query(`
      INSERT INTO budgets (
        trace_id,
        company_id,
        vendor_id,
        budget_code,
        selected_modules,
        contracted_employees,
        total_monthly,
        total_annual,
        discount_percentage,
        discount_reason,
        payment_terms,
        currency,
        status,
        valid_until,
        notes,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'USD', 'PENDING', $12, $13, $3
      )
      RETURNING *
    `, [
      trace_id,
      company_id,
      vendor_id,
      budget_code,
      JSON.stringify(selected_modules),
      contracted_employees,
      total_monthly,
      total_annual,
      discount_percentage,
      discount_reason,
      payment_terms,
      valid_until.toISOString().split('T')[0],
      notes
    ]);

    // Actualizar empresa con trace_id
    await client.query(`
      UPDATE companies
      SET onboarding_trace_id = $1,
          onboarding_status = 'BUDGET_SENT',
          vendor_id = $2
      WHERE company_id = $3
    `, [trace_id, vendor_id, company_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Presupuesto creado exitosamente',
      budget: budgetResult.rows[0],
      trace_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [BUDGET ONBOARDING] Error creando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/budgets/onboarding/:id/accept
 * Aceptar presupuesto (cliente acepta)
 */
router.put('/onboarding/:id/accept', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { accepted_by_name, accepted_by_email } = req.body;

    await client.query('BEGIN');

    // Actualizar budget
    const budgetResult = await client.query(`
      UPDATE budgets
      SET status = 'ACCEPTED',
          accepted_at = CURRENT_TIMESTAMP,
          responded_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (budgetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Presupuesto no encontrado'
      });
    }

    const budget = budgetResult.rows[0];

    // Actualizar empresa
    await client.query(`
      UPDATE companies
      SET onboarding_status = 'BUDGET_ACCEPTED'
      WHERE company_id = $1
    `, [budget.company_id]);

    // TODO: Generar contrato automáticamente (FASE 2)

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Presupuesto aceptado. Generando contrato...',
      budget: budgetResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [BUDGET ONBOARDING] Error aceptando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/budgets/onboarding/:id/resend
 * Re-enviar presupuesto (por email)
 */
router.post('/onboarding/:id/resend', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    // Actualizar sent_at
    const budgetResult = await client.query(`
      UPDATE budgets
      SET sent_at = CURRENT_TIMESTAMP,
          status = CASE
            WHEN status = 'PENDING' THEN 'SENT'
            ELSE status
          END
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Presupuesto no encontrado'
      });
    }

    // TODO: Enviar email con presupuesto PDF

    res.json({
      success: true,
      message: 'Presupuesto re-enviado por email',
      budget: budgetResult.rows[0]
    });

  } catch (error) {
    console.error('❌ [BUDGET ONBOARDING] Error re-enviando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/budgets/onboarding/:id
 * Obtener detalle de presupuesto
 */
router.get('/onboarding/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        b.*,
        c.name AS company_name,
        c.contact_email AS company_email,
        CONCAT(v.first_name, ' ', v.last_name) AS vendor_name,
        v.email AS vendor_email
      FROM budgets b
      JOIN companies c ON b.company_id = c.company_id
      JOIN aponnt_staff v ON b.vendor_id = v.staff_id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Presupuesto no encontrado'
      });
    }

    res.json({
      success: true,
      budget: result.rows[0]
    });

  } catch (error) {
    console.error('❌ [BUDGET ONBOARDING] Error obteniendo presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/budgets/onboarding/company/:companyId
 * Obtener presupuestos de una empresa
 */
router.get('/onboarding/company/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT
        b.*,
        CONCAT(v.first_name, ' ', v.last_name) AS vendor_name
      FROM budgets b
      JOIN aponnt_staff v ON b.vendor_id = v.staff_id
      WHERE b.company_id = $1
    `;

    const params = [companyId];

    if (status) {
      query += ` AND b.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      budgets: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ [BUDGET ONBOARDING] Error obteniendo presupuestos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
