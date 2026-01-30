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

  const t = await sequelize.transaction();

  try {
    console.log(`🧹 [CLEANUP] Iniciando limpieza. Conservar: ${keep}`);

    // Obtener empresa a conservar
    const [keepCompany] = await sequelize.query(
      `SELECT company_id, name, slug FROM companies WHERE LOWER(slug) = LOWER($1) OR LOWER(name) LIKE LOWER($2)`,
      { bind: [keep, `%${keep}%`], type: QueryTypes.SELECT, transaction: t }
    );

    if (!keepCompany) {
      await t.rollback();
      return res.status(404).json({ error: `Empresa "${keep}" no encontrada` });
    }

    const keepId = keepCompany.company_id;
    console.log(`✅ Conservando empresa: ${keepCompany.name} (${keepId})`);

    const results = { deleted: {}, kept: { company: keepCompany.name } };

    // ═══════════════════════════════════════════════════════════════════
    // FASE 1: Eliminar datos dependientes (hijos)
    // ═══════════════════════════════════════════════════════════════════

    // Biometric data
    try {
      const [r] = await sequelize.query(
        `DELETE FROM biometric_data WHERE user_id IN (SELECT user_id FROM users WHERE company_id != $1)`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.biometric_data = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ biometric_data:', e.message); }

    // Facial biometric data
    try {
      const [r] = await sequelize.query(
        `DELETE FROM facial_biometric_data WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.facial_biometric_data = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ facial_biometric_data:', e.message); }

    // Attendances
    try {
      const [r] = await sequelize.query(
        `DELETE FROM attendances WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.attendances = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ attendances:', e.message); }

    // Notifications
    try {
      const [r] = await sequelize.query(
        `DELETE FROM notifications WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.notifications = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ notifications:', e.message); }

    // Visitors
    try {
      const [r] = await sequelize.query(
        `DELETE FROM visitors WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.visitors = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ visitors:', e.message); }

    // Sanctions
    try {
      const [r] = await sequelize.query(
        `DELETE FROM sanctions WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.sanctions = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ sanctions:', e.message); }

    // Vacation requests
    try {
      const [r] = await sequelize.query(
        `DELETE FROM vacation_requests WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.vacation_requests = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ vacation_requests:', e.message); }

    // Documents
    try {
      const [r] = await sequelize.query(
        `DELETE FROM documents WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.documents = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ documents:', e.message); }

    // Kiosks
    try {
      const [r] = await sequelize.query(
        `DELETE FROM kiosks WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.kiosks = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ kiosks:', e.message); }

    // Shifts
    try {
      const [r] = await sequelize.query(
        `DELETE FROM shifts WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.shifts = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ shifts:', e.message); }

    // Branches
    try {
      const [r] = await sequelize.query(
        `DELETE FROM branches WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.branches = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ branches:', e.message); }

    // ═══════════════════════════════════════════════════════════════════
    // FASE 2: Eliminar usuarios de otras empresas
    // ═══════════════════════════════════════════════════════════════════

    try {
      const [r] = await sequelize.query(
        `DELETE FROM users WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.users = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ users:', e.message); }

    // ═══════════════════════════════════════════════════════════════════
    // FASE 3: Eliminar departamentos de otras empresas
    // ═══════════════════════════════════════════════════════════════════

    try {
      const [r] = await sequelize.query(
        `DELETE FROM departments WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.departments = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ departments:', e.message); }

    // ═══════════════════════════════════════════════════════════════════
    // FASE 4: Eliminar otras empresas (mantener ISI)
    // ═══════════════════════════════════════════════════════════════════

    try {
      const [r] = await sequelize.query(
        `DELETE FROM companies WHERE company_id != $1`,
        { bind: [keepId], type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.companies = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ companies:', e.message); }

    // ═══════════════════════════════════════════════════════════════════
    // FASE 5: Limpiar staff de Aponnt de prueba (opcional)
    // ═══════════════════════════════════════════════════════════════════

    try {
      const [r] = await sequelize.query(
        `DELETE FROM aponnt_staff WHERE email LIKE '%test%' OR email LIKE '%demo%'`,
        { type: QueryTypes.DELETE, transaction: t }
      );
      results.deleted.aponnt_staff_test = r?.rowCount || 0;
    } catch (e) { console.log('  ⚠️ aponnt_staff:', e.message); }

    // Commit transaction
    await t.commit();

    console.log('✅ [CLEANUP] Limpieza completada');
    console.log('   Resultados:', JSON.stringify(results.deleted));

    res.json({
      success: true,
      message: `Limpieza completada. Solo queda empresa: ${keepCompany.name}`,
      results
    });

  } catch (error) {
    await t.rollback();
    console.error('❌ [CLEANUP] Error:', error);
    res.status(500).json({ error: error.message, hint: 'Transaction rolled back' });
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
