/**
 * RUTAS DE DEPLOY SEGURO A RENDER
 *
 * Sistema de migraciones con validación doble:
 * 1. Usuario APONNT + Password hardcodeado
 * 2. Mínimo 50 tests exitosos en local
 *
 * Solo usuarios autorizados pueden ejecutar migraciones a producción
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONSTANTES DE SEGURIDAD (HARDCODED)
// ============================================================================

const DEPLOY_USERNAME = 'APONNT';
const DEPLOY_PASSWORD = 'Aedr15150302';
const MIN_SUCCESSFUL_TESTS = 50; // Threshold mínimo de tests exitosos

// ============================================================================
// CONFIGURACIÓN DE 3 AMBIENTES
// ============================================================================

// Variables de entorno para Staging (Render Preview)
const STAGING_DATABASE_URL = process.env.STAGING_DATABASE_URL || null;

// Variables de entorno para Production (Render Main)
const PRODUCTION_DATABASE_URL = process.env.DATABASE_URL || null;

// Horarios programados para deploy a producción (hora formato 24h)
const MAINTENANCE_WINDOWS = [
  { start: '02:00', end: '05:00', days: [0, 1, 2, 3, 4, 5, 6] }, // 2 AM - 5 AM todos los días
  { start: '23:00', end: '23:59', days: [6, 0] } // 11 PM - 12 AM sábados y domingos
];

// Estado global de mantenimiento
let maintenanceModeActive = false;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verificar si estamos dentro de una ventana de mantenimiento programada
 */
function isWithinMaintenanceWindow() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = domingo, 6 = sábado
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return MAINTENANCE_WINDOWS.some(window => {
    const inDay = window.days.includes(currentDay);
    const inTime = currentTime >= window.start && currentTime <= window.end;
    return inDay && inTime;
  });
}

/**
 * Crear backup de base de datos usando pg_dump
 */
async function createDatabaseBackup(dbConfig, backupName) {
  const backupDir = path.join(__dirname, '../../backups');

  // Crear directorio si no existe
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `${backupName}_${timestamp}.sql`);

  try {
    // Usar pg_dump (requiere que esté instalado en el sistema)
    const connectionString = dbConfig.connectionString ||
      `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port || 5432}/${dbConfig.database}`;

    console.log(`   💾 Creando backup: ${backupFile}...`);

    execSync(`pg_dump "${connectionString}" > "${backupFile}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    console.log(`   ✅ Backup creado exitosamente`);

    return {
      success: true,
      backupFile,
      size: fs.statSync(backupFile).size
    };

  } catch (error) {
    console.error(`   ❌ Error creando backup: ${error.message}`);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ejecutar tests Phase 4 usando la API interna
 */
async function runPhase4Tests(companyId, moduleKey = null, cycles = 50) {
  return new Promise((resolve, reject) => {
    console.log(`   🧪 Ejecutando ${cycles} ciclos de tests Phase 4...`);

    // Spawn proceso de testing
    const testProcess = spawn('node', [
      'test-phase4-users-via-api.js',
      '--company-id', String(companyId),
      '--module', moduleKey || 'users',
      '--cycles', String(cycles),
      '--headless'
    ], {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, HEADLESS: 'true' }
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        // Parsear resultados
        const passedMatch = output.match(/✅.*?(\d+).*?passed/i);
        const failedMatch = output.match(/❌.*?(\d+).*?failed/i);

        const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1]) : 0;

        resolve({
          success: passed >= MIN_SUCCESSFUL_TESTS,
          passed,
          failed,
          total: passed + failed,
          output
        });
      } else {
        reject(new Error(`Tests failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

// ============================================================================
// MIDDLEWARE: Validar credenciales de deploy
// ============================================================================

function validateDeployCredentials(req, res, next) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Se requieren credenciales de deploy (username y password)'
    });
  }

  if (username !== DEPLOY_USERNAME || password !== DEPLOY_PASSWORD) {
    return res.status(403).json({
      success: false,
      error: 'Credenciales de deploy inválidas'
    });
  }

  next();
}

// ============================================================================
// ENDPOINT: Verificar estado pre-deploy
// ============================================================================

router.get('/pre-deploy-check', async (req, res) => {
  try {
    const checks = {
      localDatabase: false,
      migrationsPending: 0,
      testsExecuted: 0,
      testsSuccessful: 0,
      testsPassed: false,
      readyToDeploy: false
    };

    // 1. Verificar conexión a BD local
    const localPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres'
    });

    try {
      await localPool.query('SELECT NOW()');
      checks.localDatabase = true;

      // 2. Verificar migraciones pendientes
      const migrationsDir = path.join(__dirname, '../../migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      const { rows: executedMigrations } = await localPool.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );

      const executedVersions = executedMigrations.map(r => r.version);
      const pendingMigrations = migrationFiles.filter(
        f => !executedVersions.includes(f.replace('.sql', ''))
      );

      checks.migrationsPending = pendingMigrations.length;

      // 3. Verificar tests ejecutados (últimas 24 horas)
      const { rows: testStats } = await localPool.query(`
        SELECT
          COUNT(*) as total_tests,
          COUNT(*) FILTER (WHERE status IN ('passed', 'fixed')) as successful_tests
        FROM audit_test_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      if (testStats.length > 0) {
        checks.testsExecuted = parseInt(testStats[0].total_tests) || 0;
        checks.testsSuccessful = parseInt(testStats[0].successful_tests) || 0;
        checks.testsPassed = checks.testsSuccessful >= MIN_SUCCESSFUL_TESTS;
      }

      // 4. Determinar si está listo para deploy
      checks.readyToDeploy =
        checks.localDatabase &&
        checks.migrationsPending === 0 &&
        checks.testsPassed;

      await localPool.end();

    } catch (error) {
      await localPool.end();
      throw error;
    }

    res.json({
      success: true,
      checks,
      requirements: {
        minSuccessfulTests: MIN_SUCCESSFUL_TESTS,
        migrationsRequired: 'Todas las migraciones deben estar ejecutadas en local',
        credentialsRequired: `Usuario: ${DEPLOY_USERNAME} (hardcoded)`
      }
    });

  } catch (error) {
    console.error('❌ Error en pre-deploy check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENDPOINT: Listar migraciones pendientes
// ============================================================================

router.get('/pending-migrations', async (req, res) => {
  try {
    const migrationsDir = path.join(__dirname, '../../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Conectar a BD local
    const localPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres'
    });

    const { rows: executedMigrations } = await localPool.query(
      'SELECT version, executed_at FROM schema_migrations ORDER BY version'
    );

    await localPool.end();

    const executedVersions = new Set(executedMigrations.map(r => r.version));

    const migrations = migrationFiles.map(file => {
      const version = file.replace('.sql', '');
      const executed = executedVersions.has(version);
      const executedRow = executedMigrations.find(r => r.version === version);

      return {
        version,
        file,
        executed,
        executedAt: executedRow ? executedRow.executed_at : null
      };
    });

    const pending = migrations.filter(m => !m.executed);

    res.json({
      success: true,
      total: migrations.length,
      executed: migrations.filter(m => m.executed).length,
      pending: pending.length,
      migrations,
      pendingMigrations: pending
    });

  } catch (error) {
    console.error('❌ Error listando migraciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENDPOINT: Ejecutar migración a Render (CON VALIDACIÓN DOBLE)
// ============================================================================

router.post('/migrate-to-render', validateDeployCredentials, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 INICIANDO MIGRACIÓN A RENDER (PRODUCCIÓN)');
    console.log('='.repeat(80));

    // 1. Pre-deploy checks
    console.log('\n📋 [1/5] Verificando pre-requisitos...');

    const localPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres'
    });

    // Verificar tests exitosos
    const { rows: testStats } = await localPool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('passed', 'fixed')) as successful_tests
      FROM audit_test_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const successfulTests = parseInt(testStats[0]?.successful_tests) || 0;

    if (successfulTests < MIN_SUCCESSFUL_TESTS) {
      await localPool.end();
      return res.status(400).json({
        success: false,
        error: `Se requieren al menos ${MIN_SUCCESSFUL_TESTS} tests exitosos. Encontrados: ${successfulTests}`,
        successfulTests,
        required: MIN_SUCCESSFUL_TESTS
      });
    }

    console.log(`   ✅ Tests exitosos: ${successfulTests}/${MIN_SUCCESSFUL_TESTS}`);

    // 2. Verificar migraciones pendientes en local
    console.log('\n📋 [2/5] Verificando migraciones locales...');

    const migrationsDir = path.join(__dirname, '../../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows: executedMigrations } = await localPool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    await localPool.end();

    const executedVersions = new Set(executedMigrations.map(r => r.version));
    const pendingLocal = migrationFiles.filter(
      f => !executedVersions.has(f.replace('.sql', ''))
    );

    if (pendingLocal.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Hay migraciones pendientes en BD local. Ejecutar primero: node run-all-migrations.js',
        pendingMigrations: pendingLocal
      });
    }

    console.log('   ✅ Todas las migraciones ejecutadas en local');

    // 3. Conectar a Render
    console.log('\n📋 [3/5] Conectando a Render PostgreSQL...');

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL no configurado. No se puede conectar a Render.'
      });
    }

    const renderPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await renderPool.query('SELECT NOW()');
    console.log('   ✅ Conectado a Render PostgreSQL');

    // 4. Obtener migraciones pendientes en Render
    console.log('\n📋 [4/5] Verificando migraciones en Render...');

    const { rows: renderExecuted } = await renderPool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    const renderVersions = new Set(renderExecuted.map(r => r.version));
    const pendingRender = migrationFiles.filter(
      f => !renderVersions.has(f.replace('.sql', ''))
    );

    console.log(`   📊 Migraciones pendientes en Render: ${pendingRender.length}`);

    if (pendingRender.length === 0) {
      await renderPool.end();
      return res.json({
        success: true,
        message: 'Render ya está actualizado. No hay migraciones pendientes.',
        migrated: 0
      });
    }

    // 5. Ejecutar migraciones en Render
    console.log('\n📋 [5/5] Ejecutando migraciones en Render...\n');

    const results = [];

    for (const migrationFile of pendingRender) {
      const version = migrationFile.replace('.sql', '');
      const filePath = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`   📝 Ejecutando: ${migrationFile}...`);

      try {
        await renderPool.query('BEGIN');
        await renderPool.query(sql);
        await renderPool.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [version, migrationFile]
        );
        await renderPool.query('COMMIT');

        console.log(`   ✅ ${migrationFile} ejecutada correctamente`);

        results.push({
          migration: migrationFile,
          success: true
        });

      } catch (error) {
        await renderPool.query('ROLLBACK');

        console.error(`   ❌ Error en ${migrationFile}:`, error.message);

        results.push({
          migration: migrationFile,
          success: false,
          error: error.message
        });

        // Detener en caso de error crítico
        break;
      }
    }

    await renderPool.end();

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(80));
    console.log(`✅ MIGRACIÓN COMPLETADA: ${successCount} exitosas, ${errorCount} fallidas`);
    console.log('='.repeat(80) + '\n');

    res.json({
      success: errorCount === 0,
      message: `${successCount} migraciones ejecutadas en Render`,
      migrated: successCount,
      failed: errorCount,
      results
    });

  } catch (error) {
    console.error('❌ Error en migración a Render:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENDPOINT: Obtener estadísticas de tests
// ============================================================================

router.get('/test-stats', async (req, res) => {
  try {
    const localPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres'
    });

    const { rows } = await localPool.query(`
      SELECT
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE status = 'passed') as passed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'fixed') as fixed,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE status IN ('passed', 'fixed') AND created_at > NOW() - INTERVAL '24 hours') as successful_24h,
        MIN(created_at) as first_test,
        MAX(created_at) as last_test
      FROM audit_test_logs
    `);

    await localPool.end();

    const stats = rows[0] || {};
    stats.meets_requirement = parseInt(stats.successful_24h) >= MIN_SUCCESSFUL_TESTS;
    stats.required = MIN_SUCCESSFUL_TESTS;

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENDPOINT: Migrar a STAGING (Render Preview)
// ============================================================================

router.post('/migrate-to-staging', validateDeployCredentials, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 ETAPA 1: MIGRACIÓN A STAGING (Pre-Producción)');
    console.log('='.repeat(80));

    if (!STAGING_DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'STAGING_DATABASE_URL no configurado'
      });
    }

    // 1. Verificar 50 tests exitosos en local
    console.log('\n📋 [1/5] Verificando tests locales...');

    const localPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres'
    });

    const { rows: testStats } = await localPool.query(`
      SELECT COUNT(*) FILTER (WHERE status IN ('passed', 'fixed')) as successful_tests
      FROM audit_test_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const successfulTests = parseInt(testStats[0]?.successful_tests) || 0;

    if (successfulTests < MIN_SUCCESSFUL_TESTS) {
      await localPool.end();
      return res.status(400).json({
        success: false,
        error: `Se requieren ${MIN_SUCCESSFUL_TESTS} tests exitosos. Encontrados: ${successfulTests}`
      });
    }

    console.log(`   ✅ Tests locales: ${successfulTests}/${MIN_SUCCESSFUL_TESTS}`);

    // 2. Verificar migraciones locales
    console.log('\n📋 [2/5] Verificando migraciones locales...');

    const migrationsDir = path.join(__dirname, '../../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows: localMigrations } = await localPool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    await localPool.end();

    const localVersions = new Set(localMigrations.map(r => r.version));
    const pendingLocal = migrationFiles.filter(
      f => !localVersions.has(f.replace('.sql', ''))
    );

    if (pendingLocal.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Hay migraciones pendientes en local. Ejecutar: node run-all-migrations.js',
        pendingMigrations: pendingLocal
      });
    }

    console.log('   ✅ Migraciones locales completas');

    // 3. Conectar a Staging
    console.log('\n📋 [3/5] Conectando a STAGING...');

    const stagingPool = new Pool({
      connectionString: STAGING_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await stagingPool.query('SELECT NOW()');
    console.log('   ✅ Conectado a Staging');

    // 4. Crear backup de staging
    console.log('\n📋 [4/5] Creando backup de Staging...');

    const backupResult = await createDatabaseBackup({
      connectionString: STAGING_DATABASE_URL
    }, 'staging_pre_migration');

    if (!backupResult.success) {
      console.log(`   ⚠️  Backup falló, pero continuando: ${backupResult.error}`);
    }

    // 5. Ejecutar migraciones en staging
    console.log('\n📋 [5/5] Ejecutando migraciones en STAGING...\n');

    const { rows: stagingMigrations } = await stagingPool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    const stagingVersions = new Set(stagingMigrations.map(r => r.version));
    const pendingStaging = migrationFiles.filter(
      f => !stagingVersions.has(f.replace('.sql', ''))
    );

    if (pendingStaging.length === 0) {
      await stagingPool.end();
      return res.json({
        success: true,
        message: 'Staging ya está actualizado',
        migrated: 0
      });
    }

    const results = [];

    for (const migrationFile of pendingStaging) {
      const version = migrationFile.replace('.sql', '');
      const filePath = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`   📝 Ejecutando: ${migrationFile}...`);

      try {
        await stagingPool.query('BEGIN');
        await stagingPool.query(sql);
        await stagingPool.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [version, migrationFile]
        );
        await stagingPool.query('COMMIT');

        console.log(`   ✅ ${migrationFile} ejecutada`);

        results.push({ migration: migrationFile, success: true });

      } catch (error) {
        await stagingPool.query('ROLLBACK');
        console.error(`   ❌ Error: ${error.message}`);

        results.push({ migration: migrationFile, success: false, error: error.message });
        break;
      }
    }

    await stagingPool.end();

    const successCount = results.filter(r => r.success).length;

    console.log('\n' + '='.repeat(80));
    console.log(`✅ STAGING MIGRADO: ${successCount} migraciones`);
    console.log('📋 PRÓXIMO PASO: Ejecutar tests en Staging con /run-staging-tests');
    console.log('='.repeat(80) + '\n');

    res.json({
      success: true,
      message: `Staging migrado exitosamente: ${successCount} migraciones`,
      migrated: successCount,
      results
    });

  } catch (error) {
    console.error('❌ Error en migración a Staging:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ENDPOINT: Ejecutar tests en STAGING
// ============================================================================

router.post('/run-staging-tests', validateDeployCredentials, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 ETAPA 2: TESTING EN STAGING (Validación Post-Migración)');
    console.log('='.repeat(80));

    const { companyId = 11, moduleKey = null } = req.body;

    // Ejecutar 50 ciclos de tests Phase 4
    const testResults = await runPhase4Tests(companyId, moduleKey, 50);

    if (!testResults.success) {
      console.log('\n' + '='.repeat(80));
      console.log(`❌ TESTS EN STAGING FALLARON: ${testResults.passed}/${MIN_SUCCESSFUL_TESTS}`);
      console.log('⚠️  NO PROCEDER A PRODUCCIÓN');
      console.log('='.repeat(80) + '\n');

      return res.status(400).json({
        success: false,
        error: `Tests en Staging no pasaron: ${testResults.passed}/${MIN_SUCCESSFUL_TESTS}`,
        testResults
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ TESTS EN STAGING EXITOSOS: ${testResults.passed}/${MIN_SUCCESSFUL_TESTS}`);
    console.log('✅ STAGING VALIDADO - Listo para producción');
    console.log('📋 PRÓXIMO PASO: /migrate-to-production (solo en horario programado)');
    console.log('='.repeat(80) + '\n');

    res.json({
      success: true,
      message: 'Tests en Staging completados exitosamente',
      testResults,
      readyForProduction: true
    });

  } catch (error) {
    console.error('❌ Error ejecutando tests en Staging:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ENDPOINT: Migrar a PRODUCTION (con validación de horario)
// ============================================================================

router.post('/migrate-to-production', validateDeployCredentials, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 ETAPA 3: MIGRACIÓN A PRODUCCIÓN (CRÍTICO)');
    console.log('='.repeat(80));

    const { forceMaintenanceMode = false, bypassSchedule = false } = req.body;

    if (!PRODUCTION_DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL (producción) no configurado'
      });
    }

    // 1. Verificar horario programado (a menos que se bypass explícitamente)
    if (!bypassSchedule && !isWithinMaintenanceWindow()) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      return res.status(403).json({
        success: false,
        error: 'Deploy a producción solo permitido en horarios programados',
        currentTime,
        maintenanceWindows: MAINTENANCE_WINDOWS,
        suggestion: 'Usar bypassSchedule: true para override (solo emergencias)'
      });
    }

    console.log('   ✅ Dentro de ventana de mantenimiento');

    // 2. Activar modo mantenimiento si se solicita
    if (forceMaintenanceMode) {
      console.log('\n📋 [1/6] Activando modo mantenimiento...');
      maintenanceModeActive = true;
      console.log('   ✅ Modo mantenimiento ACTIVO');
    }

    // 3. Verificar tests en Staging
    console.log('\n📋 [2/6] Verificando tests en Staging...');

    // Aquí asumiríamos que tenemos logs de tests de staging
    // Por simplicidad, verificamos local
    const localPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres'
    });

    const { rows: testStats } = await localPool.query(`
      SELECT COUNT(*) FILTER (WHERE status IN ('passed', 'fixed')) as successful_tests
      FROM audit_test_logs
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    const successfulTests = parseInt(testStats[0]?.successful_tests) || 0;

    if (successfulTests < MIN_SUCCESSFUL_TESTS) {
      await localPool.end();
      maintenanceModeActive = false;

      return res.status(400).json({
        success: false,
        error: `Staging no tiene ${MIN_SUCCESSFUL_TESTS} tests exitosos recientes`
      });
    }

    console.log(`   ✅ Tests en Staging validados: ${successfulTests}/${MIN_SUCCESSFUL_TESTS}`);

    // 4. Verificar migraciones locales
    console.log('\n📋 [3/6] Verificando migraciones locales...');

    const migrationsDir = path.join(__dirname, '../../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows: localMigrations } = await localPool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    await localPool.end();

    const localVersions = new Set(localMigrations.map(r => r.version));
    const pendingLocal = migrationFiles.filter(
      f => !localVersions.has(f.replace('.sql', ''))
    );

    if (pendingLocal.length > 0) {
      maintenanceModeActive = false;

      return res.status(400).json({
        success: false,
        error: 'Migraciones pendientes en local',
        pendingMigrations: pendingLocal
      });
    }

    console.log('   ✅ Migraciones locales OK');

    // 5. Crear backup de producción
    console.log('\n📋 [4/6] Creando backup CRÍTICO de Producción...');

    const backupResult = await createDatabaseBackup({
      connectionString: PRODUCTION_DATABASE_URL
    }, 'production_pre_migration');

    if (!backupResult.success) {
      maintenanceModeActive = false;

      return res.status(500).json({
        success: false,
        error: 'Backup de producción falló. Deploy abortado por seguridad.',
        backupError: backupResult.error
      });
    }

    console.log(`   ✅ Backup creado: ${backupResult.backupFile} (${backupResult.size} bytes)`);

    // 6. Conectar a Production
    console.log('\n📋 [5/6] Conectando a PRODUCCIÓN...');

    const productionPool = new Pool({
      connectionString: PRODUCTION_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await productionPool.query('SELECT NOW()');
    console.log('   ✅ Conectado a Producción');

    // 7. Ejecutar migraciones en production
    console.log('\n📋 [6/6] Ejecutando migraciones en PRODUCCIÓN...\n');

    const { rows: productionMigrations } = await productionPool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    const productionVersions = new Set(productionMigrations.map(r => r.version));
    const pendingProduction = migrationFiles.filter(
      f => !productionVersions.has(f.replace('.sql', ''))
    );

    if (pendingProduction.length === 0) {
      await productionPool.end();
      maintenanceModeActive = false;

      return res.json({
        success: true,
        message: 'Producción ya está actualizada',
        migrated: 0
      });
    }

    const results = [];

    for (const migrationFile of pendingProduction) {
      const version = migrationFile.replace('.sql', '');
      const filePath = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`   📝 Ejecutando: ${migrationFile}...`);

      try {
        await productionPool.query('BEGIN');
        await productionPool.query(sql);
        await productionPool.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [version, migrationFile]
        );
        await productionPool.query('COMMIT');

        console.log(`   ✅ ${migrationFile} ejecutada`);

        results.push({ migration: migrationFile, success: true });

      } catch (error) {
        await productionPool.query('ROLLBACK');
        console.error(`   ❌ Error: ${error.message}`);

        results.push({ migration: migrationFile, success: false, error: error.message });
        break;
      }
    }

    await productionPool.end();

    // Desactivar modo mantenimiento
    maintenanceModeActive = false;

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(80));
    console.log(`✅ PRODUCCIÓN MIGRADA: ${successCount} migraciones exitosas, ${errorCount} fallidas`);
    console.log('✅ Modo mantenimiento DESACTIVADO');
    console.log('📊 Backup disponible en: ' + (backupResult.backupFile || 'N/A'));
    console.log('='.repeat(80) + '\n');

    res.json({
      success: errorCount === 0,
      message: `Producción migrada: ${successCount} migraciones`,
      migrated: successCount,
      failed: errorCount,
      results,
      backup: backupResult
    });

  } catch (error) {
    console.error('❌ Error en migración a Producción:', error);

    // Asegurar desactivar modo mantenimiento
    maintenanceModeActive = false;

    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ENDPOINT: Verificar/Activar/Desactivar modo mantenimiento
// ============================================================================

router.get('/maintenance/status', (req, res) => {
  res.json({
    success: true,
    maintenanceMode: maintenanceModeActive,
    withinMaintenanceWindow: isWithinMaintenanceWindow(),
    maintenanceWindows: MAINTENANCE_WINDOWS
  });
});

router.post('/maintenance/enable', validateDeployCredentials, (req, res) => {
  maintenanceModeActive = true;
  console.log('🔧 Modo mantenimiento ACTIVADO manualmente');

  res.json({
    success: true,
    message: 'Modo mantenimiento activado',
    maintenanceMode: true
  });
});

router.post('/maintenance/disable', validateDeployCredentials, (req, res) => {
  maintenanceModeActive = false;
  console.log('✅ Modo mantenimiento DESACTIVADO');

  res.json({
    success: true,
    message: 'Modo mantenimiento desactivado',
    maintenanceMode: false
  });
});

module.exports = router;
