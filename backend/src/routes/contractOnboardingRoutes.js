/**
 * ROUTES: Contract Onboarding (Contratos Alta de Empresa)
 *
 * Endpoints REST para workflow altaEmpresa - FASE 2
 * Tablas: contracts, budgets, companies
 * Trace ID: ONBOARDING-{UUID} (mismo que budget)
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const crypto = require('crypto');
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
 * POST /api/contracts/onboarding/generate
 * Generar contrato EULA automáticamente desde presupuesto aceptado
 *
 * Body:
 * {
 *   budget_id: uuid,
 *   contract_type?: string, // Default: 'EULA'
 *   eula_version?: string, // Default: '1.0'
 *   legal_representative_name?: string,
 *   legal_representative_id?: string
 * }
 */
router.post('/onboarding/generate', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      budget_id,
      contract_type = 'EULA',
      eula_version = '1.0',
      legal_representative_name,
      legal_representative_id
    } = req.body;

    if (!budget_id) {
      return res.status(400).json({
        success: false,
        error: 'budget_id es requerido'
      });
    }

    await client.query('BEGIN');

    // Obtener budget
    const budgetResult = await client.query(`
      SELECT b.*, c.name AS company_name, c.tax_id AS company_tax_id
      FROM budgets b
      JOIN companies c ON b.company_id = c.company_id
      WHERE b.id = $1
    `, [budget_id]);

    if (budgetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Presupuesto no encontrado'
      });
    }

    const budget = budgetResult.rows[0];

    if (budget.status !== 'ACCEPTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'El presupuesto debe estar aceptado para generar contrato'
      });
    }

    // Generar contract_code
    const contractCodeResult = await client.query(`
      SELECT generate_contract_code() AS code
    `);
    const contract_code = contractCodeResult.rows[0].code;

    // Calcular effective_date (hoy) y expiration_date (1 año)
    const effective_date = new Date();
    const expiration_date = new Date();
    expiration_date.setFullYear(expiration_date.getFullYear() + 1);

    // Generar template_content del contrato
    const templateContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align: center; color: #333;">CONTRATO DE LICENCIA DE USO</h1>
        <h2 style="text-align: center; color: #666;">${contract_code}</h2>

        <p><strong>Fecha:</strong> ${effective_date.toLocaleDateString('es-AR')}</p>
        <p><strong>Empresa:</strong> ${budget.company_name}</p>
        <p><strong>CUIT/CUIL:</strong> ${budget.company_tax_id || 'No especificado'}</p>
        <p><strong>Representante Legal:</strong> ${legal_representative_name}</p>
        <p><strong>DNI:</strong> ${legal_representative_id}</p>

        <h3>TÉRMINOS Y CONDICIONES</h3>
        <p>Por medio del presente contrato, APONNT otorga licencia de uso del software
        de gestión empresarial bajo los términos aquí especificados.</p>

        <h3>VIGENCIA</h3>
        <p>Desde: ${effective_date.toLocaleDateString('es-AR')}</p>
        <p>Hasta: ${expiration_date.toLocaleDateString('es-AR')}</p>
        <p>Renovación automática: Sí</p>

        <h3>VERSIÓN EULA</h3>
        <p>${eula_version}</p>

        <p style="margin-top: 40px; font-size: 12px; color: #666;">
          Este contrato fue generado electrónicamente y tiene validez legal según
          la Ley de Firma Digital N° 25.506.
        </p>
      </div>
    `;

    // Insertar contrato
    const contractResult = await client.query(`
      INSERT INTO contracts (
        trace_id,
        budget_id,
        company_id,
        contract_code,
        contract_type,
        eula_version,
        effective_date,
        expiration_date,
        auto_renew,
        renewal_notice_days,
        status,
        legal_representative_name,
        legal_representative_id,
        company_legal_name,
        company_tax_id,
        esignature_provider,
        created_by,
        template_content
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, TRUE, 30, 'GENERATED',
        $9, $10, $11, $12, 'APONNT_INTERNAL', $13, $14
      )
      RETURNING *
    `, [
      budget.trace_id,
      budget_id,
      budget.company_id,
      contract_code,
      contract_type,
      eula_version,
      effective_date.toISOString().split('T')[0],
      expiration_date.toISOString().split('T')[0],
      legal_representative_name,
      legal_representative_id,
      budget.company_name,
      budget.company_tax_id,
      req.user?.staff_id || null,
      templateContent
    ]);

    // Actualizar empresa
    await client.query(`
      UPDATE companies
      SET onboarding_status = 'CONTRACT_GENERATED'
      WHERE company_id = $1
    `, [budget.company_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Contrato generado exitosamente',
      contract: contractResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [CONTRACT ONBOARDING] Error generando contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * Function helper para generar contract_code (CTRCT-YYYY-NNNN)
 */
async function generateContractCode(client) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  const result = await client.query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(contract_code FROM 'CTRCT-\\d{4}-\\d{2}-(\\d+)') AS INTEGER)
    ), 0) + 1 AS next_num
    FROM contracts
    WHERE contract_code LIKE 'CTRCT-' || $1 || '-' || $2 || '-%'
  `, [year, month]);

  const nextNum = result.rows[0].next_num;
  return `CTRCT-${year}-${month}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * POST /api/contracts/onboarding/:id/sign
 * Firmar contrato digitalmente
 *
 * Body:
 * {
 *   signed_by_name: string,
 *   signed_by_email: string,
 *   signed_by_role: string,
 *   contract_text: string // Texto completo del contrato
 * }
 */
router.post('/onboarding/:id/sign', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      signed_by_name,
      signed_by_email,
      signed_by_role = 'Representante Legal',
      contract_text
    } = req.body;

    if (!signed_by_name || !signed_by_email || !contract_text) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: signed_by_name, signed_by_email, contract_text'
      });
    }

    await client.query('BEGIN');

    // Obtener contrato
    const contractResult = await client.query(`
      SELECT * FROM contracts WHERE id = $1
    `, [id]);

    if (contractResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    const contract = contractResult.rows[0];

    if (contract.status === 'SIGNED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'El contrato ya está firmado'
      });
    }

    // Generar hash SHA-256 del contrato
    const signature_hash = crypto
      .createHash('sha256')
      .update(contract_text + signed_by_name + signed_by_email + new Date().toISOString())
      .digest('hex');

    // Obtener IP del cliente
    const signature_ip = req.ip || req.connection.remoteAddress;
    const signature_user_agent = req.headers['user-agent'];

    // Actualizar contrato
    const updatedContractResult = await client.query(`
      UPDATE contracts
      SET
        signature_hash = $1,
        signature_ip = $2,
        signature_user_agent = $3,
        signed_by_name = $4,
        signed_by_email = $5,
        signed_by_role = $6,
        signed_at = CURRENT_TIMESTAMP,
        status = 'SIGNED'
      WHERE id = $7
      RETURNING *
    `, [
      signature_hash,
      signature_ip,
      signature_user_agent,
      signed_by_name,
      signed_by_email,
      signed_by_role,
      id
    ]);

    // Actualizar empresa
    await client.query(`
      UPDATE companies
      SET onboarding_status = 'CONTRACT_SIGNED'
      WHERE company_id = $1
    `, [contract.company_id]);

    // TODO: Generar factura automáticamente (FASE 3)

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Contrato firmado exitosamente. Generando factura...',
      contract: updatedContractResult.rows[0],
      signature_hash
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [CONTRACT ONBOARDING] Error firmando contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/contracts/onboarding/:id
 * Obtener detalle de contrato
 */
router.get('/onboarding/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        ct.*,
        c.name AS company_name,
        b.budget_code,
        b.total_monthly,
        b.selected_modules
      FROM contracts ct
      JOIN companies c ON ct.company_id = c.company_id
      JOIN budgets b ON ct.budget_id = b.id
      WHERE ct.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    res.json({
      success: true,
      contract: result.rows[0]
    });

  } catch (error) {
    console.error('❌ [CONTRACT ONBOARDING] Error obteniendo contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/onboarding/company/:companyId
 * Obtener contratos de una empresa
 */
router.get('/onboarding/company/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT
        ct.*,
        b.budget_code,
        b.total_monthly
      FROM contracts ct
      JOIN budgets b ON ct.budget_id = b.id
      WHERE ct.company_id = $1
    `;

    const params = [companyId];

    if (status) {
      query += ` AND ct.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY ct.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      contracts: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ [CONTRACT ONBOARDING] Error obteniendo contratos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
