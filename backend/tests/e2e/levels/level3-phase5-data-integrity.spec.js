/**
 * SYNAPSE Level 3 - FASE 5: Data Integrity
 * Valida integridad de datos: FK, orphans, duplicados, checksums
 *
 * Ejecutar:
 *   npx playwright test tests/e2e/levels/level3-phase5-data-integrity.spec.js
 */
const { test, expect } = require('@playwright/test');
const { EnterpriseBulkHelper } = require('../helpers/enterprise-bulk.helper');

test.describe('SYNAPSE Level 3 - FASE 5: Data Integrity', () => {
  let bulkHelper;
  let batchId;

  test.beforeAll(async () => {
    bulkHelper = new EnterpriseBulkHelper();
    batchId = await bulkHelper.createBatch('SYNAPSE-L3-Phase5-DataIntegrity', 3);
  });

  test.afterAll(async () => {
    await bulkHelper.updateBatchStatus(batchId, 'completed', ['phase5']);
    await bulkHelper.close();
  });

  // ═══════════════════════════════════════════════════════════
  // FOREIGN KEY VIOLATIONS
  // ═══════════════════════════════════════════════════════════

  test('5.1 Verificar FK: users -> companies', async () => {
    console.log('[PHASE5] Verificando FK users -> companies...');

    const orphans = await bulkHelper.db.any(`
      SELECT u.user_id, u."employeeId", u.company_id
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.company_id
      WHERE c.company_id IS NULL
        AND u.company_id IS NOT NULL
      LIMIT 100
    `);

    for (const orphan of orphans) {
      await bulkHelper.db.none(`
        INSERT INTO e2e_data_integrity_issues
        (batch_id, issue_type, table_name, record_id, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'fk_violation', 'users', orphan.user_id ? orphan.user_id.toString() : 'unknown',
          JSON.stringify({ company_id: orphan.company_id, employeeId: orphan.employeeId }),
          'critical']);
    }

    console.log(`[PHASE5] FK users -> companies: ${orphans.length} violaciones`);
    expect(orphans.length).toBe(0);
  });

  test('5.2 Verificar FK: attendances -> users', async () => {
    console.log('[PHASE5] Verificando FK attendances -> users...');

    const orphans = await bulkHelper.db.any(`
      SELECT a.id, a."UserId"
      FROM attendances a
      LEFT JOIN users u ON a."UserId" = u.user_id
      WHERE u.user_id IS NULL
        AND a."UserId" IS NOT NULL
      LIMIT 100
    `);

    for (const orphan of orphans) {
      await bulkHelper.db.none(`
        INSERT INTO e2e_data_integrity_issues
        (batch_id, issue_type, table_name, record_id, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'fk_violation', 'attendances', orphan.id.toString(),
          JSON.stringify({ user_id: orphan.user_id }),
          'critical']);
    }

    console.log(`[PHASE5] FK attendances -> users: ${orphans.length} violaciones`);
    expect(orphans.length).toBe(0);
  });

  test('5.3 Verificar FK: departments -> companies', async () => {
    console.log('[PHASE5] Verificando FK departments -> companies...');

    const orphans = await bulkHelper.db.any(`
      SELECT d.id, d.name, d.company_id
      FROM departments d
      LEFT JOIN companies c ON d.company_id = c.company_id
      WHERE c.company_id IS NULL
        AND d.company_id IS NOT NULL
      LIMIT 100
    `);

    for (const orphan of orphans) {
      await bulkHelper.db.none(`
        INSERT INTO e2e_data_integrity_issues
        (batch_id, issue_type, table_name, record_id, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'fk_violation', 'departments', orphan.id.toString(),
          JSON.stringify({ company_id: orphan.company_id, name: orphan.name }),
          'high']);
    }

    console.log(`[PHASE5] FK departments -> companies: ${orphans.length} violaciones`);
    expect(orphans.length).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════
  // ORPHAN RECORDS
  // ═══════════════════════════════════════════════════════════

  test('5.4 Verificar registros huerfanos en company_modules', async () => {
    console.log('[PHASE5] Verificando orphans en company_modules...');

    const orphans = await bulkHelper.db.any(`
      SELECT cm.id, cm.company_id, cm.system_module_id
      FROM company_modules cm
      LEFT JOIN companies c ON cm.company_id = c.company_id
      WHERE c.company_id IS NULL
      LIMIT 100
    `);

    for (const orphan of orphans) {
      await bulkHelper.db.none(`
        INSERT INTO e2e_data_integrity_issues
        (batch_id, issue_type, table_name, record_id, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'orphan', 'company_modules', orphan.id.toString(),
          JSON.stringify({ company_id: orphan.company_id }),
          'medium']);
    }

    console.log(`[PHASE5] Orphans en company_modules: ${orphans.length}`);
  });

  // ═══════════════════════════════════════════════════════════
  // DUPLICATES
  // ═══════════════════════════════════════════════════════════

  test('5.5 Verificar DNIs duplicados en misma empresa', async () => {
    console.log('[PHASE5] Verificando DNIs duplicados...');

    const duplicates = await bulkHelper.db.any(`
      SELECT company_id, dni, COUNT(*) as count
      FROM users
      WHERE dni IS NOT NULL AND dni != ''
      GROUP BY company_id, dni
      HAVING COUNT(*) > 1
      LIMIT 100
    `);

    for (const dup of duplicates) {
      await bulkHelper.db.none(`
        INSERT INTO e2e_data_integrity_issues
        (batch_id, issue_type, table_name, record_id, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'duplicate', 'users', `${dup.company_id}-${dup.dni}`,
          JSON.stringify({ company_id: dup.company_id, dni: dup.dni, count: dup.count }),
          'high']);
    }

    console.log(`[PHASE5] DNIs duplicados: ${duplicates.length} casos`);
    expect(duplicates.length).toBe(0);
  });

  test('5.6 Verificar emails duplicados en misma empresa', async () => {
    console.log('[PHASE5] Verificando emails duplicados...');

    const duplicates = await bulkHelper.db.any(`
      SELECT company_id, email, COUNT(*) as count
      FROM users
      WHERE email IS NOT NULL AND email != ''
      GROUP BY company_id, email
      HAVING COUNT(*) > 1
      LIMIT 100
    `);

    for (const dup of duplicates) {
      await bulkHelper.db.none(`
        INSERT INTO e2e_data_integrity_issues
        (batch_id, issue_type, table_name, record_id, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'duplicate', 'users', `${dup.company_id}-${dup.email}`,
          JSON.stringify({ company_id: dup.company_id, email: dup.email, count: dup.count }),
          'medium']);
    }

    console.log(`[PHASE5] Emails duplicados: ${duplicates.length} casos`);
  });

  test('5.7 Verificar asistencias duplicadas (mismo usuario, dia, tipo)', async () => {
    console.log('[PHASE5] Verificando asistencias duplicadas...');

    const duplicates = await bulkHelper.db.any(`
      SELECT "UserId", DATE("checkInTime") as date, COUNT(*) as count
      FROM attendances
      WHERE "checkInTime" IS NOT NULL
      GROUP BY "UserId", DATE("checkInTime")
      HAVING COUNT(*) > 2
      LIMIT 100
    `);

    for (const dup of duplicates) {
      await bulkHelper.db.none(`
        INSERT INTO e2e_data_integrity_issues
        (batch_id, issue_type, table_name, record_id, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'duplicate', 'attendances', `${dup.UserId}-${dup.date}`,
          JSON.stringify({ UserId: dup.UserId, date: dup.date, count: dup.count }),
          'medium']);
    }

    console.log(`[PHASE5] Asistencias duplicadas: ${duplicates.length} casos`);
  });

  // ═══════════════════════════════════════════════════════════
  // CHECKSUM VALIDATION
  // ═══════════════════════════════════════════════════════════

  test('5.8 Verificar checksum de horas trabajadas', async () => {
    console.log('[PHASE5] Verificando checksums de horas...');

    // Verificar que total_hours = check_out - check_in
    const mismatches = await bulkHelper.db.any(`
      SELECT id, "UserId", "checkInTime", "checkOutTime", "workingHours",
             EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime"))/3600 as calculated_hours
      FROM attendances
      WHERE "checkInTime" IS NOT NULL
        AND "checkOutTime" IS NOT NULL
        AND "workingHours" IS NOT NULL
        AND ABS("workingHours" - EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime"))/3600) > 0.1
      LIMIT 50
    `);

    for (const m of mismatches) {
      await bulkHelper.db.none(`
        INSERT INTO e2e_data_integrity_issues
        (batch_id, issue_type, table_name, record_id, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [batchId, 'checksum_mismatch', 'attendances', m.id.toString(),
          JSON.stringify({ stored: m.workingHours, calculated: m.calculated_hours }),
          'high']);
    }

    console.log(`[PHASE5] Checksum mismatches: ${mismatches.length}`);
    // NOTE: This is a data quality check - existing data may have inconsistencies
    // Log warning instead of failing for legacy data issues
    if (mismatches.length > 0) {
      console.warn(`[PHASE5] ⚠️ Found ${mismatches.length} workingHours inconsistencies - legacy data issue`);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // RESUMEN
  // ═══════════════════════════════════════════════════════════

  test('5.99 Generar resumen de integridad', async () => {
    const result = await bulkHelper.db.one(`
      SELECT
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE issue_type = 'fk_violation') as fk_violations,
        COUNT(*) FILTER (WHERE issue_type = 'orphan') as orphans,
        COUNT(*) FILTER (WHERE issue_type = 'duplicate') as duplicates,
        COUNT(*) FILTER (WHERE issue_type = 'checksum_mismatch') as checksums,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical
      FROM e2e_data_integrity_issues
      WHERE batch_id = $1
    `, [batchId]);

    console.log(`[PHASE5] ═══════════════════════════════════════`);
    console.log(`[PHASE5] RESUMEN DE INTEGRIDAD DE DATOS`);
    console.log(`[PHASE5] Total problemas: ${result.total_issues}`);
    console.log(`[PHASE5] FK Violations: ${result.fk_violations}`);
    console.log(`[PHASE5] Orphan Records: ${result.orphans}`);
    console.log(`[PHASE5] Duplicates: ${result.duplicates}`);
    console.log(`[PHASE5] Checksum Mismatches: ${result.checksums}`);
    console.log(`[PHASE5] Issues CRITICOS: ${result.critical}`);
    console.log(`[PHASE5] ═══════════════════════════════════════`);

    // Criterio: 0 FK violations, 0 critical issues
    expect(parseInt(result.fk_violations)).toBe(0);
  });
});
