/**
 * PRODUCTION CLEANUP ROUTES
 * Endpoints para limpieza de datos de producción.
 *
 * ⚠️ PELIGRO: Estas rutas eliminan datos permanentemente.
 * Solo usar para preparar ambiente de producción.
 *
 * @version 1.0.0
 * @date 2026-01-29
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Password de autorización (debe coincidir con .env)
const CLEANUP_PASSWORD = process.env.DB_ADMIN_PASSWORD || process.env.DEPLOY_PASSWORD;

/**
 * Middleware de autorización
 */
function requireCleanupAuth(req, res, next) {
  const providedPassword = req.headers['x-cleanup-password'] || req.body?.password;

  if (!providedPassword) {
    return res.status(401).json({ error: 'Password requerido', hint: 'Header x-cleanup-password o body.password' });
  }

  if (providedPassword !== CLEANUP_PASSWORD) {
    console.warn(`⚠️ [CLEANUP] Intento con password incorrecto desde ${req.ip}`);
    return res.status(403).json({ error: 'Password incorrecto' });
  }

  next();
}

/**
 * GET /api/cleanup/preview
 * Vista previa de lo que se eliminará (sin eliminar nada)
 */
router.get('/preview', requireCleanupAuth, async (req, res) => {
  try {
    const keepCompanySlug = req.query.keep || 'isi';

    // Obtener empresa a conservar
    const [keepCompany] = await sequelize.query(
      `SELECT company_id, name, slug FROM companies WHERE LOWER(slug) = LOWER($1) OR LOWER(name) LIKE LOWER($2)`,
      { bind: [keepCompanySlug, `%${keepCompanySlug}%`], type: QueryTypes.SELECT }
    );

    if (!keepCompany) {
      return res.status(404).json({ error: `Empresa "${keepCompanySlug}" no encontrada` });
    }

    // Contar registros por tabla que serían eliminados
    const preview = {
      keepCompany: keepCompany,
      toDelete: {}
    };

    // Empresas a eliminar
    const [companiesCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM companies WHERE company_id != $1`,
      { bind: [keepCompany.company_id], type: QueryTypes.SELECT }
    );
    preview.toDelete.companies = parseInt(companiesCount.count);

    // Usuarios a eliminar (de otras empresas)
    const [usersCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM users WHERE company_id != $1`,
      { bind: [keepCompany.company_id], type: QueryTypes.SELECT }
    );
    preview.toDelete.users = parseInt(usersCount.count);

    // Asistencias a eliminar
    const [attendancesCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM attendances WHERE company_id != $1`,
      { bind: [keepCompany.company_id], type: QueryTypes.SELECT }
    );
    preview.toDelete.attendances = parseInt(attendancesCount.count);

    // Departamentos
    const [deptsCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM departments WHERE company_id != $1`,
      { bind: [keepCompany.company_id], type: QueryTypes.SELECT }
    );
    preview.toDelete.departments = parseInt(deptsCount.count);

    // Usuarios de ISI a conservar
    const [keepUsersCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM users WHERE company_id = $1`,
      { bind: [keepCompany.company_id], type: QueryTypes.SELECT }
    );
    preview.keepUsers = parseInt(keepUsersCount.count);

    res.json({
      success: true,
      message: 'Vista previa - NO se eliminó nada',
      preview
    });

  } catch (error) {
    console.error('❌ [CLEANUP] Error en preview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cleanup/execute
 * Ejecutar limpieza real (⚠️ DESTRUCTIVO)
 */
router.post('/execute', requireCleanupAuth, async (req, res) => {
  const { keep = 'isi', confirm } = req.body;

  if (confirm !== 'ELIMINAR_TODO_EXCEPTO_' + keep.toUpperCase()) {
    return res.status(400).json({
      error: 'Confirmación requerida',
      hint: `Enviar body: { "keep": "${keep}", "confirm": "ELIMINAR_TODO_EXCEPTO_${keep.toUpperCase()}" }`
    });
  }

  try {
    console.log(`🧹 [CLEANUP] Iniciando limpieza. Conservar: ${keep}`);

    // Obtener empresa a conservar
    const [keepCompany] = await sequelize.query(
      `SELECT company_id, name, slug FROM companies WHERE LOWER(slug) = LOWER($1) OR LOWER(name) LIKE LOWER($2)`,
      { bind: [keep, `%${keep}%`], type: QueryTypes.SELECT }
    );

    if (!keepCompany) {
      return res.status(404).json({ error: `Empresa "${keep}" no encontrada` });
    }

    const keepId = keepCompany.company_id;
    console.log(`✅ Conservando empresa: ${keepCompany.name} (${keepId})`);

    const results = { deleted: {}, kept: { company: keepCompany.name }, errors: [] };

    // Lista de tablas a limpiar con sus queries (orden crítico por FK)
    const cleanupQueries = [
      // FASE 1: Tablas dependientes profundas (sin FK hacia ellas)
      { name: 'hour_bank_balances', sql: `DELETE FROM hour_bank_balances WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'hour_bank_transactions', sql: `DELETE FROM hour_bank_transactions WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'biometric_data', sql: `DELETE FROM biometric_data WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'facial_biometric_data', sql: `DELETE FROM facial_biometric_data WHERE company_id != ${keepId}` },
      { name: 'biometric_consents', sql: `DELETE FROM biometric_consents WHERE company_id != ${keepId}` },
      { name: 'user_documents', sql: `DELETE FROM user_documents WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'user_shift_assignments', sql: `DELETE FROM user_shift_assignments WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },

      // FASE 2: Tablas con company_id directo
      { name: 'attendances', sql: `DELETE FROM attendances WHERE company_id != ${keepId}` },
      { name: 'attendance_batches', sql: `DELETE FROM attendance_batches WHERE company_id != ${keepId}` },
      { name: 'notifications', sql: `DELETE FROM notifications WHERE company_id != ${keepId}` },
      { name: 'visitors', sql: `DELETE FROM visitors WHERE company_id != ${keepId}` },
      { name: 'sanctions', sql: `DELETE FROM sanctions WHERE company_id != ${keepId}` },
      { name: 'vacation_requests', sql: `DELETE FROM vacation_requests WHERE company_id != ${keepId}` },
      { name: 'kiosks', sql: `DELETE FROM kiosks WHERE company_id != ${keepId}` },
      { name: 'shifts', sql: `DELETE FROM shifts WHERE company_id != ${keepId}` },
      { name: 'branches', sql: `DELETE FROM branches WHERE company_id != ${keepId}` },

      // FASE 3: Tablas financieras/SIAC que bloquean companies
      { name: 'siac_facturas', sql: `DELETE FROM siac_facturas WHERE company_id != ${keepId}` },
      { name: 'siac_remitos', sql: `DELETE FROM siac_remitos WHERE company_id != ${keepId}` },
      { name: 'invoices', sql: `DELETE FROM invoices WHERE company_id != ${keepId}` },
      { name: 'finance_payment_orders', sql: `DELETE FROM finance_payment_orders WHERE company_id != ${keepId}` },

      // FASE 4: Usuarios
      { name: 'users', sql: `DELETE FROM users WHERE company_id != ${keepId}` },

      // FASE 5: Departamentos
      { name: 'departments', sql: `DELETE FROM departments WHERE company_id != ${keepId}` },

      // FASE 6: Empresas
      { name: 'companies', sql: `DELETE FROM companies WHERE company_id != ${keepId}` },
    ];

    // Ejecutar cada query individualmente (sin transacción para evitar locks)
    for (const q of cleanupQueries) {
      try {
        const [, metadata] = await sequelize.query(q.sql);
        results.deleted[q.name] = metadata?.rowCount || 0;
        console.log(`  ✅ ${q.name}: ${results.deleted[q.name]} eliminados`);
      } catch (e) {
        results.deleted[q.name] = 0;
        results.errors.push({ table: q.name, error: e.message });
        console.log(`  ⚠️ ${q.name}: ${e.message}`);
      }
    }

    console.log('✅ [CLEANUP] Limpieza completada');

    res.json({
      success: true,
      message: `Limpieza completada. Solo queda empresa: ${keepCompany.name}`,
      results
    });

  } catch (error) {
    console.error('❌ [CLEANUP] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cleanup/status
 * Ver estado actual de la BD
 */
router.get('/status', requireCleanupAuth, async (req, res) => {
  try {
    const status = {};

    // Contar empresas
    const [companies] = await sequelize.query(
      `SELECT company_id, name, slug, is_active FROM companies ORDER BY name`,
      { type: QueryTypes.SELECT }
    );
    status.companies = companies;

    // Contar usuarios por empresa
    const [userCounts] = await sequelize.query(
      `SELECT c.name, COUNT(u.user_id) as user_count
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.company_id
       GROUP BY c.company_id, c.name
       ORDER BY c.name`,
      { type: QueryTypes.SELECT }
    );
    status.usersByCompany = userCounts;

    res.json({ success: true, status });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
