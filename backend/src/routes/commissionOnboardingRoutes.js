/**
 * ROUTES: Commission Onboarding (Comisiones Alta de Empresa)
 *
 * Endpoints REST para workflow altaEmpresa - FASE 5
 * Tablas: commission_liquidations, commission_payments
 * Liquidación inmediata al activar empresa
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { auth: authMiddleware } = require('../middleware/auth');

// Conexión PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB || 'attendance_system',
  port: 5432
});

/**
 * POST /api/commissions/onboarding/liquidate
 * Liquidar comisiones inmediatas al activar empresa
 *
 * Body:
 * {
 *   company_id: number,
 *   invoice_amount: number,
 *   vendor_id: uuid, // Vendedor que cerró la venta
 *   payment_method?: string
 * }
 */
router.post('/onboarding/liquidate', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      company_id,
      invoice_amount,
      vendor_id,
      payment_method = 'TRANSFERENCIA'
    } = req.body;

    if (!company_id || !invoice_amount || !vendor_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: company_id, invoice_amount, vendor_id'
      });
    }

    await client.query('BEGIN');

    // Obtener trace_id de la empresa
    const companyResult = await client.query(`
      SELECT onboarding_trace_id FROM companies WHERE company_id = $1
    `, [company_id]);

    if (companyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const onboarding_trace_id = companyResult.rows[0].onboarding_trace_id;

    // Generar trace_id para comisión
    const commission_trace_id = `COMMISSION-${uuidv4()}`;

    // Generar liquidation_code
    const liquidationCodeResult = await client.query(`
      SELECT generate_liquidation_code() AS code
    `);
    const liquidation_code = liquidationCodeResult.rows[0].code;

    // Calcular comisiones piramidales usando función PostgreSQL
    const commissionsResult = await client.query(`
      SELECT * FROM calculate_pyramid_commissions($1, $2)
    `, [vendor_id, invoice_amount]);

    const commissions = commissionsResult.rows;
    const total_commission_amount = commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

    // Crear commission_breakdown JSONB
    const commission_breakdown = commissions.map(c => ({
      vendor_id: c.vendor_id,
      vendor_name: c.vendor_name,
      level: c.level,
      percentage: parseFloat(c.percentage),
      amount: parseFloat(c.amount),
      payment_status: 'PENDING'
    }));

    // Crear liquidación
    const liquidationResult = await client.query(`
      INSERT INTO commission_liquidations (
        trace_id,
        company_id,
        liquidation_type,
        liquidation_code,
        liquidation_date,
        period_start,
        period_end,
        invoice_amount,
        total_commissionable,
        total_commission_amount,
        commission_breakdown,
        status,
        payment_method,
        created_by
      ) VALUES (
        $1, $2, 'ONBOARDING_IMMEDIATE', $3, CURRENT_DATE,
        CURRENT_DATE, CURRENT_DATE, $4, $4, $5, $6, 'CALCULATED', $7, $8
      )
      RETURNING *
    `, [
      commission_trace_id,
      company_id,
      liquidation_code,
      invoice_amount,
      total_commission_amount,
      JSON.stringify(commission_breakdown),
      payment_method,
      req.user?.staff_id || null
    ]);

    const liquidation = liquidationResult.rows[0];

    // Crear pagos individuales para cada vendedor
    const payments = [];
    for (const comm of commissions) {
      const payment_code_result = await client.query(`SELECT generate_payment_code() AS code`);
      const payment_code = payment_code_result.rows[0].code;
      const payment_trace_id = `PAYMENT-${uuidv4()}`;

      // Obtener datos bancarios del vendedor
      const vendorBankResult = await client.query(`
        SELECT cbu, alias_cbu, bank_name, payment_method_preference
        FROM aponnt_staff
        WHERE staff_id = $1
      `, [comm.vendor_id]);

      const vendorBank = vendorBankResult.rows[0] || {};

      const paymentResult = await client.query(`
        INSERT INTO commission_payments (
          trace_id,
          liquidation_id,
          vendor_id,
          company_id,
          payment_code,
          payment_date,
          commission_amount,
          net_amount,
          commission_type,
          commission_percentage,
          payment_method,
          bank_name,
          cbu,
          alias,
          status,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, CURRENT_DATE, $6, $6, $7, $8, $9, $10, $11, $12, 'PENDING', $13
        )
        RETURNING *
      `, [
        payment_trace_id,
        liquidation.id,
        comm.vendor_id,
        company_id,
        payment_code,
        comm.amount,
        comm.level,
        comm.percentage,
        vendorBank.payment_method_preference || payment_method,
        vendorBank.bank_name,
        vendorBank.cbu,
        vendorBank.alias_cbu,
        req.user?.staff_id || null
      ]);

      payments.push(paymentResult.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Comisiones liquidadas: ${commissions.length} vendedores`,
      liquidation: liquidation,
      payments: payments,
      total_commission_amount: total_commission_amount,
      commission_breakdown: commission_breakdown
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [COMMISSION ONBOARDING] Error liquidando comisiones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/commissions/onboarding/liquidation/:id
 * Obtener detalle de liquidación
 */
router.get('/onboarding/liquidation/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        cl.*,
        c.name AS company_name
      FROM commission_liquidations cl
      JOIN companies c ON cl.company_id = c.company_id
      WHERE cl.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Liquidación no encontrada'
      });
    }

    res.json({
      success: true,
      liquidation: result.rows[0]
    });

  } catch (error) {
    console.error('❌ [COMMISSION ONBOARDING] Error obteniendo liquidación:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commissions/onboarding/payments/vendor/:vendorId
 * Obtener pagos pendientes de un vendedor
 */
router.get('/onboarding/payments/vendor/:vendorId', authMiddleware, async (req, res) => {
  try {
    const { vendorId } = req.params;

    const result = await pool.query(`
      SELECT * FROM get_vendor_pending_payments_detailed($1)
    `, [vendorId]);

    res.json({
      success: true,
      payments: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ [COMMISSION ONBOARDING] Error obteniendo pagos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/commissions/onboarding/payment/:id/complete
 * Marcar pago como completado
 */
router.put('/onboarding/payment/:id/complete', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      confirmation_code,
      transaction_id
    } = req.body;

    await client.query('BEGIN');

    const paymentResult = await client.query(`
      UPDATE commission_payments
      SET
        status = 'COMPLETED',
        executed_date = CURRENT_DATE,
        confirmation_code = $1,
        transaction_id = $2
      WHERE id = $3
      RETURNING *
    `, [confirmation_code, transaction_id, id]);

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Pago marcado como completado',
      payment: paymentResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [COMMISSION ONBOARDING] Error completando pago:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
