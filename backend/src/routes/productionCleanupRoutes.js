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
      // FASE 0: Tablas médicas que bloquean users
      { name: 'medical_records', sql: `DELETE FROM medical_records WHERE company_id != ${keepId}` },
      { name: 'user_medical_exams', sql: `DELETE FROM user_medical_exams WHERE company_id != ${keepId}` },
      { name: 'user_medical_documents', sql: `DELETE FROM user_medical_documents WHERE company_id != ${keepId}` },
      { name: 'user_allergies', sql: `DELETE FROM user_allergies WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'user_chronic_conditions', sql: `DELETE FROM user_chronic_conditions WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'user_vaccinations', sql: `DELETE FROM user_vaccinations WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },

      // FASE 1: Tablas de usuario profundas
      { name: 'user_work_arrangements', sql: `DELETE FROM user_work_arrangements WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'hour_bank_balances', sql: `DELETE FROM hour_bank_balances WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'hour_bank_transactions', sql: `DELETE FROM hour_bank_transactions WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'biometric_data', sql: `DELETE FROM biometric_data WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'facial_biometric_data', sql: `DELETE FROM facial_biometric_data WHERE company_id != ${keepId}` },
      { name: 'biometric_consents', sql: `DELETE FROM biometric_consents WHERE company_id != ${keepId}` },
      { name: 'user_documents', sql: `DELETE FROM user_documents WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'user_shift_assignments', sql: `DELETE FROM user_shift_assignments WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },

      // FASE 2: Tablas con company_id directo
      { name: 'attendances', sql: `DELETE FROM attendances WHERE company_id != ${keepId}` },
      { name: 'notifications', sql: `DELETE FROM notifications WHERE company_id != ${keepId}` },
      { name: 'visitors', sql: `DELETE FROM visitors WHERE company_id != ${keepId}` },
      { name: 'sanctions', sql: `DELETE FROM sanctions WHERE company_id != ${keepId}` },
      { name: 'vacation_requests', sql: `DELETE FROM vacation_requests WHERE company_id != ${keepId}` },
      { name: 'kiosks', sql: `DELETE FROM kiosks WHERE company_id != ${keepId}` },
      { name: 'shifts', sql: `DELETE FROM shifts WHERE company_id != ${keepId}` },
      { name: 'branches', sql: `DELETE FROM branches WHERE company_id != ${keepId}` },

      // FASE 3: Tablas que bloquean labor_agreements, support_tickets y salary_categories
      { name: 'user_payroll_assignment', sql: `DELETE FROM user_payroll_assignment WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'salary_categories_v2', sql: `DELETE FROM salary_categories_v2 WHERE labor_agreement_id IN (SELECT id FROM labor_agreements_v2 WHERE company_id != ${keepId})` },
      { name: 'payroll_templates', sql: `DELETE FROM payroll_templates WHERE company_id != ${keepId}` },
      { name: 'support_ticket_escalations', sql: `DELETE FROM support_ticket_escalations WHERE ticket_id IN (SELECT id FROM support_tickets WHERE company_id != ${keepId})` },
      { name: 'work_arrangement_history', sql: `DELETE FROM work_arrangement_history WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },

      // FASE 4: Limpiar FK de users hacia organizational_positions antes de borrar
      { name: 'users_clear_position', sql: `UPDATE users SET organizational_position_id = NULL WHERE company_id != ${keepId}` },

      // FASE 5: Tablas que bloquean companies (FK directa)
      { name: 'labor_agreements_v2', sql: `DELETE FROM labor_agreements_v2 WHERE company_id != ${keepId}` },
      { name: 'organizational_positions', sql: `DELETE FROM organizational_positions WHERE company_id != ${keepId}` },
      { name: 'siac_facturas', sql: `DELETE FROM siac_facturas WHERE company_id != ${keepId}` },
      { name: 'siac_remitos', sql: `DELETE FROM siac_remitos WHERE company_id != ${keepId}` },
      { name: 'invoices', sql: `DELETE FROM invoices WHERE company_id != ${keepId}` },
      { name: 'budgets', sql: `DELETE FROM budgets WHERE company_id != ${keepId}` },
      { name: 'company_modules', sql: `DELETE FROM company_modules WHERE company_id != ${keepId}` },
      { name: 'company_tasks', sql: `DELETE FROM company_tasks WHERE company_id != ${keepId}` },
      { name: 'support_tickets', sql: `DELETE FROM support_tickets WHERE company_id != ${keepId}` },
      { name: 'trainings', sql: `DELETE FROM trainings WHERE company_id != ${keepId}` },

      // FASE 6: Usuarios
      { name: 'users', sql: `DELETE FROM users WHERE company_id != ${keepId}` },

      // FASE 7: Departamentos
      { name: 'departments', sql: `DELETE FROM departments WHERE company_id != ${keepId}` },

      // FASE 8: Empresas
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

    // Contar empresas (retornar todas las filas)
    const companies = await sequelize.query(
      `SELECT company_id, name, slug, is_active FROM companies ORDER BY name`,
      { type: QueryTypes.SELECT }
    );
    status.companies = companies;
    status.totalCompanies = companies.length;

    // Contar usuarios por empresa (retornar todas las filas)
    const userCounts = await sequelize.query(
      `SELECT c.name, c.company_id, COUNT(u.user_id) as user_count
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

/**
 * POST /api/cleanup/force
 * Limpieza forzada con DROP/RECREATE de FKs (⚠️ MUY DESTRUCTIVO)
 */
router.post('/force', requireCleanupAuth, async (req, res) => {
  const { keep = 'isi', confirm } = req.body;

  if (confirm !== 'FORCE_CLEANUP_' + keep.toUpperCase()) {
    return res.status(400).json({
      error: 'Confirmación requerida',
      hint: `Enviar body: { "keep": "${keep}", "confirm": "FORCE_CLEANUP_${keep.toUpperCase()}" }`
    });
  }

  try {
    console.log(`🔥 [CLEANUP] Iniciando limpieza FORZADA. Conservar: ${keep}`);

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

    const results = { deleted: {}, kept: { company: keepCompany.name }, errors: [], droppedFKs: [], warnings: [] };

    // Obtener lista de FKs a dropear temporalmente
    const fksToHandle = [
      { table: 'users', constraint: 'users_organizational_position_id_fkey' },
      { table: 'user_payroll_assignment', constraint: 'user_payroll_assignment_category_id_fkey' },
      { table: 'salary_categories_v2', constraint: 'salary_categories_v2_labor_agreement_id_fkey' },
      { table: 'support_ticket_escalations', constraint: 'support_ticket_escalations_ticket_id_fkey' },
    ];

    // Dropear FKs problemáticas
    for (const fk of fksToHandle) {
      try {
        await sequelize.query(`ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${fk.constraint}`);
        results.droppedFKs.push(fk.constraint);
        console.log(`  🔓 FK dropeada: ${fk.constraint}`);
      } catch (e) {
        results.warnings.push(`No se pudo dropear ${fk.constraint}: ${e.message}`);
      }
    }

    // Lista de tablas a limpiar en orden
    const deleteQueries = [
      // Tablas con user_id FK
      { name: 'user_payroll_assignment', sql: `DELETE FROM user_payroll_assignment WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'hour_bank_balances', sql: `DELETE FROM hour_bank_balances WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'hour_bank_transactions', sql: `DELETE FROM hour_bank_transactions WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'biometric_data', sql: `DELETE FROM biometric_data WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'user_documents', sql: `DELETE FROM user_documents WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'user_shift_assignments', sql: `DELETE FROM user_shift_assignments WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'user_work_arrangements', sql: `DELETE FROM user_work_arrangements WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      { name: 'work_arrangement_history', sql: `DELETE FROM work_arrangement_history WHERE user_id IN (SELECT user_id FROM users WHERE company_id != ${keepId})` },
      // Tablas médicas
      { name: 'user_medical_exams', sql: `DELETE FROM user_medical_exams WHERE company_id != ${keepId}` },
      { name: 'user_medical_documents', sql: `DELETE FROM user_medical_documents WHERE company_id != ${keepId}` },
      { name: 'medical_records', sql: `DELETE FROM medical_records WHERE company_id != ${keepId}` },
      // Tablas con company_id
      { name: 'salary_categories_v2', sql: `DELETE FROM salary_categories_v2 WHERE labor_agreement_id IN (SELECT id FROM labor_agreements_v2 WHERE company_id != ${keepId})` },
      { name: 'labor_agreements_v2', sql: `DELETE FROM labor_agreements_v2 WHERE company_id != ${keepId}` },
      { name: 'payroll_templates', sql: `DELETE FROM payroll_templates WHERE company_id != ${keepId}` },
      { name: 'organizational_positions', sql: `DELETE FROM organizational_positions WHERE company_id != ${keepId}` },
      { name: 'support_ticket_escalations', sql: `DELETE FROM support_ticket_escalations WHERE ticket_id IN (SELECT id FROM support_tickets WHERE company_id != ${keepId})` },
      { name: 'support_tickets', sql: `DELETE FROM support_tickets WHERE company_id != ${keepId}` },
      { name: 'attendances', sql: `DELETE FROM attendances WHERE company_id != ${keepId}` },
      { name: 'notifications', sql: `DELETE FROM notifications WHERE company_id != ${keepId}` },
      { name: 'visitors', sql: `DELETE FROM visitors WHERE company_id != ${keepId}` },
      { name: 'sanctions', sql: `DELETE FROM sanctions WHERE company_id != ${keepId}` },
      { name: 'vacation_requests', sql: `DELETE FROM vacation_requests WHERE company_id != ${keepId}` },
      { name: 'kiosks', sql: `DELETE FROM kiosks WHERE company_id != ${keepId}` },
      { name: 'shifts', sql: `DELETE FROM shifts WHERE company_id != ${keepId}` },
      { name: 'branches', sql: `DELETE FROM branches WHERE company_id != ${keepId}` },
      { name: 'facial_biometric_data', sql: `DELETE FROM facial_biometric_data WHERE company_id != ${keepId}` },
      { name: 'biometric_consents', sql: `DELETE FROM biometric_consents WHERE company_id != ${keepId}` },
      { name: 'siac_facturas', sql: `DELETE FROM siac_facturas WHERE company_id != ${keepId}` },
      { name: 'siac_remitos', sql: `DELETE FROM siac_remitos WHERE company_id != ${keepId}` },
      { name: 'invoices', sql: `DELETE FROM invoices WHERE company_id != ${keepId}` },
      { name: 'budgets', sql: `DELETE FROM budgets WHERE company_id != ${keepId}` },
      { name: 'company_modules', sql: `DELETE FROM company_modules WHERE company_id != ${keepId}` },
      { name: 'company_tasks', sql: `DELETE FROM company_tasks WHERE company_id != ${keepId}` },
      { name: 'trainings', sql: `DELETE FROM trainings WHERE company_id != ${keepId}` },
      { name: 'payroll_run_items', sql: `DELETE FROM payroll_run_items WHERE payroll_run_id IN (SELECT id FROM payroll_runs WHERE company_id != ${keepId})` },
      { name: 'payroll_runs', sql: `DELETE FROM payroll_runs WHERE company_id != ${keepId}` },
      // Usuarios, departamentos, empresas
      { name: 'users', sql: `DELETE FROM users WHERE company_id != ${keepId}` },
      { name: 'departments', sql: `DELETE FROM departments WHERE company_id != ${keepId}` },
      { name: 'companies', sql: `DELETE FROM companies WHERE company_id != ${keepId}` },
    ];

    // Ejecutar deletes
    for (const q of deleteQueries) {
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

    // Recrear FKs
    const fksToRecreate = [
      { sql: `ALTER TABLE users ADD CONSTRAINT users_organizational_position_id_fkey FOREIGN KEY (organizational_position_id) REFERENCES organizational_positions(id)` },
      { sql: `ALTER TABLE user_payroll_assignment ADD CONSTRAINT user_payroll_assignment_category_id_fkey FOREIGN KEY (category_id) REFERENCES salary_categories_v2(id)` },
      { sql: `ALTER TABLE salary_categories_v2 ADD CONSTRAINT salary_categories_v2_labor_agreement_id_fkey FOREIGN KEY (labor_agreement_id) REFERENCES labor_agreements_v2(id)` },
      { sql: `ALTER TABLE support_ticket_escalations ADD CONSTRAINT support_ticket_escalations_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)` },
    ];

    for (const fk of fksToRecreate) {
      try {
        await sequelize.query(fk.sql);
        results.warnings.push(`FK recreada: ${fk.sql.split('ADD CONSTRAINT ')[1]?.split(' ')[0]}`);
      } catch (e) {
        results.warnings.push(`No se pudo recrear FK: ${e.message}`);
      }
    }

    console.log('✅ [CLEANUP] Limpieza forzada completada');

    res.json({
      success: true,
      message: `Limpieza forzada completada. Solo queda empresa: ${keepCompany.name}`,
      results
    });

  } catch (error) {
    console.error('❌ [CLEANUP] Error en limpieza forzada:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
