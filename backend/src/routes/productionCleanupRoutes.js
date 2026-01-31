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

/**
 * POST /api/cleanup/sync-schema
 * Sincronizar esquema de BD con modelos Sequelize (tabla por tabla)
 */
router.post('/sync-schema', requireCleanupAuth, async (req, res) => {
  const { confirm } = req.body;

  if (confirm !== 'SYNC_ALL_TABLES') {
    return res.status(400).json({
      error: 'Confirmación requerida',
      hint: 'Enviar body: { "confirm": "SYNC_ALL_TABLES" }'
    });
  }

  try {
    console.log('🔄 [SYNC-SCHEMA] Iniciando sincronización de esquema...');
    const startTime = Date.now();
    const results = { synced: [], errors: [] };

    // Obtener todos los modelos
    const models = Object.keys(sequelize.models);

    for (const modelName of models) {
      try {
        const model = sequelize.models[modelName];
        await model.sync({ alter: true });
        results.synced.push(modelName);
        console.log(`  ✅ ${modelName} sincronizado`);
      } catch (e) {
        results.errors.push({ model: modelName, error: e.message });
        console.log(`  ⚠️ ${modelName}: ${e.message.substring(0, 100)}...`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [SYNC-SCHEMA] Sincronización completada en ${duration}s`);

    res.json({
      success: true,
      message: `Esquema sincronizado en ${duration} segundos`,
      results: {
        total: models.length,
        synced: results.synced.length,
        errors: results.errors.length,
        syncedModels: results.synced,
        errorDetails: results.errors
      }
    });

  } catch (error) {
    console.error('❌ [SYNC-SCHEMA] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cleanup/setup-admin
 * Crear o actualizar usuario admin principal
 */
router.post('/setup-admin', requireCleanupAuth, async (req, res) => {
  try {
    console.log('👤 [SETUP-ADMIN] Configurando usuario admin...');
    const bcrypt = require('bcrypt');

    // Datos del admin
    const adminData = {
      first_name: 'PABLO',
      last_name: 'RIVAS JORDAN',
      email: 'admin@aponnt.com',
      username: 'admin',
      dni: '22062075',
      password: await bcrypt.hash('admin123', 10),
      is_active: true,
      country: 'AR',
      level: 0, // Nivel más alto (CEO/SuperAdmin)
      area: 'direccion'
    };

    // Primero verificar si existe el rol de superadmin
    let roleId = null;
    const [roles] = await sequelize.query(
      `SELECT role_id, role_name, role_code FROM aponnt_staff_roles ORDER BY level ASC LIMIT 5`,
      { type: QueryTypes.SELECT }
    );

    if (roles && roles.role_id) {
      roleId = roles.role_id;
      console.log(`  ✅ Usando rol existente: ${roles.role_name} (${roles.role_code})`);
    } else {
      // Crear rol de superadmin si no existe
      const [newRole] = await sequelize.query(
        `INSERT INTO aponnt_staff_roles (role_id, role_name, role_code, description, level, area, permissions, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), 'Super Administrador', 'SUPERADMIN', 'Control total del sistema', 0, 'direccion', '{"all": true}'::jsonb, true, NOW(), NOW())
         RETURNING role_id`,
        { type: QueryTypes.SELECT }
      );
      roleId = newRole.role_id;
      console.log(`  ✅ Rol SUPERADMIN creado: ${roleId}`);
    }

    // Verificar si ya existe el admin
    const [existingAdmin] = await sequelize.query(
      `SELECT staff_id FROM aponnt_staff WHERE email = 'admin@aponnt.com' OR username = 'admin' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    let result;
    if (existingAdmin && existingAdmin.staff_id) {
      // Actualizar admin existente
      await sequelize.query(
        `UPDATE aponnt_staff SET
          first_name = $1, last_name = $2, username = $3, dni = $4,
          password = $5, is_active = true, role_id = $6, level = 0, area = 'direccion',
          updated_at = NOW()
         WHERE staff_id = $7`,
        { bind: [adminData.first_name, adminData.last_name, adminData.username, adminData.dni, adminData.password, roleId, existingAdmin.staff_id] }
      );
      result = { action: 'updated', staff_id: existingAdmin.staff_id };
      console.log(`  ✅ Admin actualizado: ${existingAdmin.staff_id}`);
    } else {
      // Crear nuevo admin
      const [newAdmin] = await sequelize.query(
        `INSERT INTO aponnt_staff (staff_id, first_name, last_name, email, username, dni, password, is_active, role_id, country, level, area, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, 'AR', 0, 'direccion', NOW(), NOW())
         RETURNING staff_id`,
        { bind: [adminData.first_name, adminData.last_name, adminData.email, adminData.username, adminData.dni, adminData.password, roleId], type: QueryTypes.SELECT }
      );
      result = { action: 'created', staff_id: newAdmin.staff_id };
      console.log(`  ✅ Admin creado: ${newAdmin.staff_id}`);
    }

    res.json({
      success: true,
      message: 'Usuario admin configurado correctamente',
      admin: {
        ...result,
        email: 'admin@aponnt.com',
        username: 'admin',
        password: 'admin123 (hasheada en BD)',
        nombre: 'PABLO RIVAS JORDAN',
        dni: '22062075',
        rol: 'Super Administrador (nivel 0)'
      }
    });

  } catch (error) {
    console.error('❌ [SETUP-ADMIN] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cleanup/create-missing-tables
 * Crear tablas faltantes sin FKs problemáticas
 */
router.post('/create-missing-tables', requireCleanupAuth, async (req, res) => {
  try {
    console.log('📦 [CREATE-TABLES] Creando tablas faltantes...');
    const results = { created: [], errors: [] };

    // SQL para crear tabla quotes (sin FK a partners)
    const createQuotesSQL = `
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        quote_number VARCHAR(50) UNIQUE NOT NULL,
        company_id INTEGER,
        seller_id INTEGER,
        lead_id INTEGER,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        client_phone VARCHAR(50),
        client_company VARCHAR(255),
        client_cuit VARCHAR(20),
        status VARCHAR(20) DEFAULT 'draft',
        currency VARCHAR(3) DEFAULT 'ARS',
        subtotal DECIMAL(15,2) DEFAULT 0,
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        tax_percentage DECIMAL(5,2) DEFAULT 21,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        valid_until DATE,
        sent_date TIMESTAMP,
        accepted_date TIMESTAMP,
        rejected_date TIMESTAMP,
        rejection_reason TEXT,
        notes TEXT,
        internal_notes TEXT,
        payment_terms TEXT,
        delivery_terms TEXT,
        warranty_terms TEXT,
        has_trial BOOLEAN DEFAULT false,
        trial_start_date DATE,
        trial_end_date DATE,
        trial_converted BOOLEAN DEFAULT false,
        items JSONB DEFAULT '[]',
        modules JSONB DEFAULT '[]',
        pricing_breakdown JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_seller_id ON quotes(seller_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
    `;

    try {
      await sequelize.query(createQuotesSQL);
      results.created.push('quotes');
      console.log('  ✅ quotes creada');
    } catch (e) {
      results.errors.push({ table: 'quotes', error: e.message });
      console.log('  ⚠️ quotes:', e.message);
    }

    // SQL para crear tabla module_trials
    const createModuleTrialsSQL = `
      CREATE TABLE IF NOT EXISTS module_trials (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER,
        company_id INTEGER,
        module_key VARCHAR(100) NOT NULL,
        module_name VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        converted_to_paid BOOLEAN DEFAULT false,
        conversion_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_module_trials_company_id ON module_trials(company_id);
      CREATE INDEX IF NOT EXISTS idx_module_trials_quote_id ON module_trials(quote_id);
    `;

    try {
      await sequelize.query(createModuleTrialsSQL);
      results.created.push('module_trials');
      console.log('  ✅ module_trials creada');
    } catch (e) {
      results.errors.push({ table: 'module_trials', error: e.message });
      console.log('  ⚠️ module_trials:', e.message);
    }

    res.json({ success: true, message: 'Tablas creadas', results });

  } catch (error) {
    console.error('❌ [CREATE-TABLES] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cleanup/reset-schema
 * DROPEAR TODO y recrear esquema desde cero (⚠️ BORRA TODOS LOS DATOS)
 */
router.post('/reset-schema', requireCleanupAuth, async (req, res) => {
  const { confirm } = req.body;

  if (confirm !== 'RESET_ALL_DATA_AND_SCHEMA') {
    return res.status(400).json({
      error: 'Confirmación requerida',
      hint: 'Enviar body: { "confirm": "RESET_ALL_DATA_AND_SCHEMA" }'
    });
  }

  try {
    console.log('💣 [RESET-SCHEMA] Iniciando reset completo...');
    const startTime = Date.now();

    // 1. Dropear todas las vistas primero
    console.log('  🔧 Dropeando vistas...');
    const views = await sequelize.query(`
      SELECT viewname FROM pg_views WHERE schemaname = 'public'
    `, { type: QueryTypes.SELECT });
    for (const view of views) {
      try {
        await sequelize.query(`DROP VIEW IF EXISTS "${view.viewname}" CASCADE`);
      } catch (e) {}
    }
    console.log(`    ✅ ${views.length} vistas dropeadas`);

    // 2. Dropear tablas una por una (evitar out of memory)
    console.log('  🔧 Dropeando tablas...');
    const tables = await sequelize.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `, { type: QueryTypes.SELECT });

    let droppedCount = 0;
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
        droppedCount++;
      } catch (e) {}
    }
    console.log(`    ✅ ${droppedCount} tablas dropeadas`);

    // 3. Dropear tipos ENUM
    console.log('  🔧 Dropeando tipos ENUM...');
    const enums = await sequelize.query(`
      SELECT typname FROM pg_type WHERE typtype = 'e'
    `, { type: QueryTypes.SELECT });
    for (const enumType of enums) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType.typname}" CASCADE`);
      } catch (e) {}
    }
    console.log(`    ✅ ${enums.length} tipos ENUM dropeados`);

    // 4. Dropear secuencias
    console.log('  🔧 Dropeando secuencias...');
    const sequences = await sequelize.query(`
      SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    `, { type: QueryTypes.SELECT });
    for (const seq of sequences) {
      try {
        await sequelize.query(`DROP SEQUENCE IF EXISTS "${seq.sequencename}" CASCADE`);
      } catch (e) {}
    }
    console.log(`    ✅ ${sequences.length} secuencias dropeadas`);

    // 5. Crear extensiones necesarias
    console.log('  🔧 Creando extensiones...');
    try {
      await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
      console.log('    ✅ uuid-ossp');
    } catch (e) { console.log('    ⚠️ uuid-ossp:', e.message); }
    try {
      await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
      console.log('    ✅ postgis');
    } catch (e) { console.log('    ⚠️ postgis:', e.message); }

    // 6. Usar sequelize.sync({ force: true }) para TODOS los modelos a la vez
    // Esto maneja automáticamente el orden de dependencias
    console.log('  🔧 Ejecutando sequelize.sync({ force: true }) para TODOS los modelos...');

    const syncErrors = [];
    let modelsSynced = 0;

    try {
      // Sincronizar TODOS los modelos de una vez
      // sequelize.sync({ force: true }) dropea y recrea todas las tablas
      // y maneja automáticamente el orden de FK
      await sequelize.sync({ force: true });
      modelsSynced = Object.keys(sequelize.models).length;
      console.log(`    ✅ Todos los modelos sincronizados exitosamente`);
    } catch (syncError) {
      console.log(`    ⚠️ Error en sync global: ${syncError.message}`);

      // Si falla el sync global, intentar modelo por modelo
      console.log('  🔧 Fallback: sincronizando modelo por modelo...');
      const models = Object.keys(sequelize.models);
      const synced = new Set();
      const maxPasses = 20;

      for (let pass = 1; pass <= maxPasses; pass++) {
        const pendingBefore = models.length - synced.size;
        if (pendingBefore === 0) break;

        for (const modelName of models) {
          if (synced.has(modelName)) continue;
          try {
            await sequelize.models[modelName].sync({ force: true });
            synced.add(modelName);
          } catch (e) {
            // Ignorar, intentar en siguiente pasada
          }
        }

        const pendingAfter = models.length - synced.size;
        console.log(`    Pasada ${pass}: ${synced.size}/${models.length} sincronizados`);
        if (pendingAfter === pendingBefore && pass > 5) break;
      }

      // Registrar errores finales
      for (const modelName of models) {
        if (!synced.has(modelName)) {
          try {
            await sequelize.models[modelName].sync({ force: true });
            synced.add(modelName);
          } catch (e) {
            syncErrors.push({ model: modelName, error: e.message.substring(0, 100) });
          }
        }
      }

      modelsSynced = synced.size;
    }

    const models = Object.keys(sequelize.models);

    console.log(`    ✅ ${synced.size}/${models.length} modelos sincronizados`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [RESET-SCHEMA] Completado en ${duration}s`);

    res.json({
      success: true,
      message: `Esquema reseteado y recreado en ${duration} segundos`,
      details: {
        viewsDropped: views.length,
        tablesDropped: droppedCount,
        enumsDropped: enums.length,
        sequencesDropped: sequences.length,
        modelsSynced: synced.size,
        modelsTotal: models.length,
        syncErrors: syncErrors.length > 0 ? syncErrors : undefined
      },
      warning: 'TODOS los datos fueron eliminados. El esquema ahora es idéntico al local.'
    });

  } catch (error) {
    console.error('❌ [RESET-SCHEMA] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cleanup/apply-schema
 * Aplicar esquema SQL recibido por chunks
 */
router.post('/apply-schema', requireCleanupAuth, async (req, res) => {
  const { sql, chunk, totalChunks, isFirst, isLast } = req.body;

  if (!sql) {
    return res.status(400).json({ error: 'SQL requerido' });
  }

  try {
    // Si es el primer chunk, primero dropear todo
    if (isFirst) {
      console.log('💣 [APPLY-SCHEMA] Dropeando objetos existentes...');

      // Dropear vistas
      const views = await sequelize.query(`
        SELECT viewname FROM pg_views WHERE schemaname = 'public'
      `, { type: QueryTypes.SELECT });
      for (const v of views) {
        try { await sequelize.query(`DROP VIEW IF EXISTS "${v.viewname}" CASCADE`); } catch (e) {}
      }

      // Dropear tablas
      const tables = await sequelize.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `, { type: QueryTypes.SELECT });
      for (const t of tables) {
        try { await sequelize.query(`DROP TABLE IF EXISTS "${t.tablename}" CASCADE`); } catch (e) {}
      }

      // Dropear tipos
      const types = await sequelize.query(`
        SELECT typname FROM pg_type WHERE typtype = 'e'
      `, { type: QueryTypes.SELECT });
      for (const t of types) {
        try { await sequelize.query(`DROP TYPE IF EXISTS "${t.typname}" CASCADE`); } catch (e) {}
      }

      console.log(`  ✅ Dropeados: ${views.length} vistas, ${tables.length} tablas, ${types.length} tipos`);
    }

    // Ejecutar el SQL del chunk
    console.log(`📝 [APPLY-SCHEMA] Ejecutando chunk ${chunk}/${totalChunks}...`);

    // Dividir SQL en statements individuales
    const statements = sql.split(';').filter(s => s.trim());
    let executed = 0;
    let errors = [];

    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('\\')) continue;

      try {
        await sequelize.query(trimmed);
        executed++;
      } catch (e) {
        errors.push({ sql: trimmed.substring(0, 100), error: e.message.substring(0, 100) });
      }
    }

    console.log(`  ✅ Chunk ${chunk}: ${executed} statements ejecutados, ${errors.length} errores`);

    res.json({
      success: true,
      message: `Chunk ${chunk}/${totalChunks} aplicado`,
      details: {
        chunk,
        totalChunks,
        statementsExecuted: executed,
        errors: errors.length,
        errorDetails: errors.slice(0, 10) // Solo primeros 10 errores
      }
    });

  } catch (error) {
    console.error('❌ [APPLY-SCHEMA] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cleanup/import-local-schema
 * Descargar e importar esquema desde URL
 */
router.post('/import-local-schema', requireCleanupAuth, async (req, res) => {
  const { schemaUrl } = req.body;

  if (!schemaUrl) {
    return res.status(400).json({
      error: 'URL del esquema requerida',
      hint: 'Subir schema_local.sql a algún lugar accesible (gist, pastebin, etc.)'
    });
  }

  try {
    console.log('📥 [IMPORT-SCHEMA] Descargando esquema desde:', schemaUrl);

    const https = require('https');
    const http = require('http');
    const client = schemaUrl.startsWith('https') ? https : http;

    const schemaContent = await new Promise((resolve, reject) => {
      client.get(schemaUrl, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
        response.on('error', reject);
      }).on('error', reject);
    });

    console.log(`  📄 Esquema descargado: ${schemaContent.length} caracteres`);

    // Dropear todo primero
    console.log('  💣 Dropeando objetos existentes...');

    const views = await sequelize.query(`SELECT viewname FROM pg_views WHERE schemaname = 'public'`, { type: QueryTypes.SELECT });
    for (const v of views) { try { await sequelize.query(`DROP VIEW IF EXISTS "${v.viewname}" CASCADE`); } catch (e) {} }

    const tables = await sequelize.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`, { type: QueryTypes.SELECT });
    for (const t of tables) { try { await sequelize.query(`DROP TABLE IF EXISTS "${t.tablename}" CASCADE`); } catch (e) {} }

    const types = await sequelize.query(`SELECT typname FROM pg_type WHERE typtype = 'e'`, { type: QueryTypes.SELECT });
    for (const t of types) { try { await sequelize.query(`DROP TYPE IF EXISTS "${t.typname}" CASCADE`); } catch (e) {} }

    console.log(`  ✅ Dropeados: ${views.length} vistas, ${tables.length} tablas, ${types.length} tipos`);

    // Ejecutar esquema
    console.log('  📝 Aplicando esquema...');
    const statements = schemaContent.split(';').filter(s => {
      const t = s.trim();
      return t && !t.startsWith('--') && !t.startsWith('\\') && t.length > 5;
    });

    let executed = 0;
    let errors = [];

    for (const stmt of statements) {
      try {
        await sequelize.query(stmt.trim());
        executed++;
      } catch (e) {
        errors.push({ sql: stmt.trim().substring(0, 80), error: e.message.substring(0, 80) });
      }
    }

    console.log(`✅ [IMPORT-SCHEMA] Completado: ${executed} statements, ${errors.length} errores`);

    res.json({
      success: true,
      message: `Esquema importado: ${executed} statements ejecutados`,
      details: {
        totalStatements: statements.length,
        executed,
        errors: errors.length,
        sampleErrors: errors.slice(0, 20)
      }
    });

  } catch (error) {
    console.error('❌ [IMPORT-SCHEMA] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cleanup/emergency-admin-setup
 * Endpoint TEMPORAL para crear admin cuando no se puede autenticar
 * ELIMINAR DESPUÉS DE USAR
 */
router.get('/emergency-admin-setup', async (req, res) => {
  const { key } = req.query;

  // Clave temporal de emergencia
  if (key !== 'EMERGENCY_SETUP_2024_TEMP') {
    return res.status(403).json({ error: 'Clave inválida' });
  }

  try {
    const bcrypt = require('bcrypt');
    console.log('🚨 [EMERGENCY] Configurando admin de emergencia...');

    // Ver estructura de la tabla aponnt_staff_roles
    const [roleColumns] = await sequelize.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'aponnt_staff_roles' ORDER BY ordinal_position
    `);
    console.log('Columnas de aponnt_staff_roles:', roleColumns);

    // Ver estructura de aponnt_staff
    const [staffColumns] = await sequelize.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'aponnt_staff' ORDER BY ordinal_position
    `);
    console.log('Columnas de aponnt_staff:', staffColumns);

    // Buscar rol existente
    let roleId = null;
    try {
      const [roles] = await sequelize.query(
        `SELECT role_id FROM aponnt_staff_roles LIMIT 1`,
        { type: QueryTypes.SELECT }
      );
      if (roles) roleId = roles.role_id;
    } catch (e) {
      console.log('No se pudo buscar roles:', e.message);
    }

    // Si no hay rol, crear uno básico
    if (!roleId) {
      try {
        // Detectar columnas disponibles
        const roleColNames = roleColumns.map(c => c.column_name);

        let insertSQL;
        if (roleColNames.includes('role_area')) {
          insertSQL = `INSERT INTO aponnt_staff_roles (role_id, role_name, role_code, description, level, role_area, permissions, is_active, created_at, updated_at)
             VALUES (gen_random_uuid(), 'Super Administrador', 'SUPERADMIN', 'Control total', 0, 'direccion', '{"all": true}'::jsonb, true, NOW(), NOW())
             ON CONFLICT (role_code) DO NOTHING RETURNING role_id`;
        } else if (roleColNames.includes('area')) {
          insertSQL = `INSERT INTO aponnt_staff_roles (role_id, role_name, role_code, description, level, area, permissions, is_active, created_at, updated_at)
             VALUES (gen_random_uuid(), 'Super Administrador', 'SUPERADMIN', 'Control total', 0, 'direccion', '{"all": true}'::jsonb, true, NOW(), NOW())
             ON CONFLICT (role_code) DO NOTHING RETURNING role_id`;
        } else {
          insertSQL = `INSERT INTO aponnt_staff_roles (role_id, role_name, role_code, description, level, permissions, is_active, created_at, updated_at)
             VALUES (gen_random_uuid(), 'Super Administrador', 'SUPERADMIN', 'Control total', 0, '{"all": true}'::jsonb, true, NOW(), NOW())
             ON CONFLICT (role_code) DO NOTHING RETURNING role_id`;
        }

        const [newRole] = await sequelize.query(insertSQL, { type: QueryTypes.SELECT });
        if (newRole) roleId = newRole.role_id;

        // Si ON CONFLICT no retornó, buscar el existente
        if (!roleId) {
          const [existingRole] = await sequelize.query(
            `SELECT role_id FROM aponnt_staff_roles WHERE role_code = 'SUPERADMIN' LIMIT 1`,
            { type: QueryTypes.SELECT }
          );
          if (existingRole) roleId = existingRole.role_id;
        }
      } catch (e) {
        console.log('Error creando rol:', e.message);
      }
    }

    if (!roleId) {
      return res.status(500).json({ error: 'No se pudo crear/encontrar rol', roleColumns });
    }

    // Hash del password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Crear o actualizar admin
    const staffColNames = staffColumns.map(c => c.column_name);

    // Verificar si existe
    const [existing] = await sequelize.query(
      `SELECT staff_id FROM aponnt_staff WHERE email = 'admin@aponnt.com' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (existing) {
      // Update
      await sequelize.query(
        `UPDATE aponnt_staff SET
           password = $1,
           is_active = true,
           role_id = $2,
           updated_at = NOW()
         WHERE staff_id = $3`,
        { bind: [hashedPassword, roleId, existing.staff_id] }
      );

      return res.json({
        success: true,
        action: 'updated',
        admin: {
          staff_id: existing.staff_id,
          email: 'admin@aponnt.com',
          password: 'admin123'
        },
        roleId,
        roleColumns: roleColNames,
        staffColumns: staffColNames
      });
    }

    // Insert nuevo admin
    let insertStaffSQL;
    if (staffColNames.includes('area')) {
      insertStaffSQL = `INSERT INTO aponnt_staff
        (staff_id, first_name, last_name, email, username, dni, password, is_active, role_id, country, level, area, created_at, updated_at)
        VALUES (gen_random_uuid(), 'PABLO', 'RIVAS JORDAN', 'admin@aponnt.com', 'admin', '22062075', $1, true, $2, 'AR', 0, 'direccion', NOW(), NOW())
        RETURNING staff_id`;
    } else {
      insertStaffSQL = `INSERT INTO aponnt_staff
        (staff_id, first_name, last_name, email, username, dni, password, is_active, role_id, country, level, created_at, updated_at)
        VALUES (gen_random_uuid(), 'PABLO', 'RIVAS JORDAN', 'admin@aponnt.com', 'admin', '22062075', $1, true, $2, 'AR', 0, NOW(), NOW())
        RETURNING staff_id`;
    }

    const [newAdmin] = await sequelize.query(insertStaffSQL, { bind: [hashedPassword, roleId], type: QueryTypes.SELECT });

    res.json({
      success: true,
      action: 'created',
      admin: {
        staff_id: newAdmin.staff_id,
        email: 'admin@aponnt.com',
        password: 'admin123'
      },
      roleId,
      roleColumns: roleColNames,
      staffColumns: staffColNames
    });

  } catch (error) {
    console.error('❌ [EMERGENCY] Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;
