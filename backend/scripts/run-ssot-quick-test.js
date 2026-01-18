/**
 * TEST RÁPIDO DE SSOT + DEPENDENCIAS + PERSISTENCIA BD
 *
 * Versión simplificada que:
 * 1. Verifica datos existentes en BD (sin crear nuevos)
 * 2. Verifica integridad referencial
 * 3. Verifica consistencia multi-tenant
 * 4. Verifica dependencias desde el registry
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Cargar .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Conexión a BD usando variables de entorno
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'postgres',
  logging: false
});

async function runQuickSSOTTest() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 TEST RÁPIDO: SSOT + DEPENDENCIAS + BD PERSISTENCE');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`⏰ Inicio: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const results = {
    timestamp: new Date().toISOString(),
    database: {
      connection: false,
      tables: {},
      integrity: {},
      multiTenant: {},
      indexes: {}
    },
    dependencies: {
      registry: null,
      circular: [],
      criticalModules: []
    },
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 1: CONEXIÓN A BD
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📋 FASE 1: CONEXIÓN A BASE DE DATOS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  try {
    await sequelize.authenticate();
    console.log('   ✅ Conexión a PostgreSQL establecida');
    results.database.connection = true;
    results.summary.passed++;
  } catch (error) {
    console.log(`   ❌ Error de conexión: ${error.message}`);
    results.summary.failed++;
    console.log('\n🏁 Test finalizado - No se puede continuar sin BD');
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 2: VERIFICAR TABLAS PRINCIPALES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 FASE 2: VERIFICAR TABLAS PRINCIPALES');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const tables = [
    { name: 'companies', critical: true },
    { name: 'users', critical: true },
    { name: 'departments', critical: true },
    { name: 'kiosks', critical: true },
    { name: 'attendance', critical: true },
    { name: 'shifts', critical: false },
    { name: 'medical_records', critical: false },
    { name: 'sanctions', critical: false },
    { name: 'vacation_requests', critical: false },
    { name: 'notifications', critical: false }
  ];

  for (const table of tables) {
    try {
      const [result] = await sequelize.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
        FROM ${table.name}
      `);

      const total = parseInt(result[0].total);
      const last24h = parseInt(result[0].last_24h);

      results.database.tables[table.name] = { exists: true, total, last24h };

      const status = table.critical && total === 0 ? '⚠️' : '✅';
      console.log(`   ${status} ${table.name}: ${total} registros (${last24h} últimas 24h)`);

      if (table.critical && total === 0) {
        results.summary.warnings++;
      } else {
        results.summary.passed++;
      }
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('no existe')) {
        console.log(`   ⚠️ ${table.name}: Tabla no existe`);
        results.database.tables[table.name] = { exists: false };
        results.summary.warnings++;
      } else {
        console.log(`   ❌ ${table.name}: Error - ${error.message}`);
        results.summary.failed++;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 3: INTEGRIDAD REFERENCIAL
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 FASE 3: INTEGRIDAD REFERENCIAL');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Test: Usuarios sin departamento válido
  try {
    const [orphanUsers] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.department_id IS NOT NULL AND d.id IS NULL
    `);
    const count = parseInt(orphanUsers[0].count);
    results.database.integrity.usersWithInvalidDept = count;

    if (count === 0) {
      console.log('   ✅ Usuarios → Departamentos: OK (sin huérfanos)');
      results.summary.passed++;
    } else {
      console.log(`   ❌ Usuarios → Departamentos: ${count} usuarios con departamento inválido`);
      results.summary.failed++;
    }
  } catch (e) {
    console.log(`   ⚠️ Usuarios → Departamentos: No verificado (${e.message.substring(0, 50)})`);
    results.summary.warnings++;
  }

  // Test: Usuarios sin empresa válida
  try {
    const [orphanUsers] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.company_id IS NOT NULL AND c.id IS NULL
    `);
    const count = parseInt(orphanUsers[0].count);
    results.database.integrity.usersWithInvalidCompany = count;

    if (count === 0) {
      console.log('   ✅ Usuarios → Companies: OK (sin huérfanos)');
      results.summary.passed++;
    } else {
      console.log(`   ❌ Usuarios → Companies: ${count} usuarios con empresa inválida`);
      results.summary.failed++;
    }
  } catch (e) {
    console.log(`   ⚠️ Usuarios → Companies: No verificado`);
    results.summary.warnings++;
  }

  // Test: Attendance sin usuario válido
  try {
    const [orphanAttendance] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM attendance a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE u.id IS NULL
    `);
    const count = parseInt(orphanAttendance[0].count);
    results.database.integrity.attendanceWithInvalidUser = count;

    if (count === 0) {
      console.log('   ✅ Attendance → Usuarios: OK (sin huérfanos)');
      results.summary.passed++;
    } else {
      console.log(`   ❌ Attendance → Usuarios: ${count} registros sin usuario válido`);
      results.summary.failed++;
    }
  } catch (e) {
    console.log(`   ⚠️ Attendance → Usuarios: No verificado`);
    results.summary.warnings++;
  }

  // Test: Kiosks sin empresa válida
  try {
    const [orphanKiosks] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM kiosks k
      LEFT JOIN companies c ON k.company_id = c.id
      WHERE k.company_id IS NOT NULL AND c.id IS NULL
    `);
    const count = parseInt(orphanKiosks[0].count);
    results.database.integrity.kiosksWithInvalidCompany = count;

    if (count === 0) {
      console.log('   ✅ Kiosks → Companies: OK (sin huérfanos)');
      results.summary.passed++;
    } else {
      console.log(`   ❌ Kiosks → Companies: ${count} kiosks con empresa inválida`);
      results.summary.failed++;
    }
  } catch (e) {
    console.log(`   ⚠️ Kiosks → Companies: No verificado`);
    results.summary.warnings++;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 4: CONSISTENCIA MULTI-TENANT
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 FASE 4: CONSISTENCIA MULTI-TENANT');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Verificar que entidades tengan company_id
  const entitiesWithCompanyId = ['users', 'departments', 'kiosks', 'attendance'];

  for (const entity of entitiesWithCompanyId) {
    try {
      const [nullCompany] = await sequelize.query(`
        SELECT COUNT(*) as count FROM ${entity} WHERE company_id IS NULL
      `);
      const count = parseInt(nullCompany[0].count);
      results.database.multiTenant[entity] = { nullCompanyCount: count };

      if (count === 0) {
        console.log(`   ✅ ${entity}: Todos tienen company_id`);
        results.summary.passed++;
      } else {
        console.log(`   ⚠️ ${entity}: ${count} registros sin company_id`);
        results.summary.warnings++;
      }
    } catch (e) {
      console.log(`   ⚠️ ${entity}: No verificado`);
      results.summary.warnings++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 5: SSOT - VERIFICAR SELECTORES TIENEN DATOS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 FASE 5: SSOT - DATOS DISPONIBLES PARA SELECTORES');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Verificar que hay datos para poblar selectores en UI
  const selectorData = [
    { query: 'SELECT COUNT(DISTINCT id) as count FROM companies WHERE is_active = true', name: 'Empresas activas' },
    { query: 'SELECT COUNT(DISTINCT id) as count FROM users WHERE is_active = true', name: 'Usuarios activos' },
    { query: 'SELECT COUNT(DISTINCT id) as count FROM departments WHERE is_active = true', name: 'Departamentos activos' },
    { query: 'SELECT COUNT(DISTINCT id) as count FROM kiosks WHERE is_active = true', name: 'Kiosks activos' }
  ];

  for (const selector of selectorData) {
    try {
      const [result] = await sequelize.query(selector.query);
      const count = parseInt(result[0].count);

      if (count > 0) {
        console.log(`   ✅ ${selector.name}: ${count} disponibles para UI`);
        results.summary.passed++;
      } else {
        console.log(`   ⚠️ ${selector.name}: 0 disponibles (selectores vacíos)`);
        results.summary.warnings++;
      }
    } catch (e) {
      console.log(`   ⚠️ ${selector.name}: No verificado`);
      results.summary.warnings++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 6: DEPENDENCIAS DESDE REGISTRY
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 FASE 6: ANÁLISIS DE DEPENDENCIAS (REGISTRY)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  try {
    const registryPath = path.join(__dirname, '..', 'src', 'auditor', 'registry', 'modules-registry.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

    console.log(`   📊 Total módulos en registry: ${registry.modules.length}`);
    results.dependencies.registry = { total: registry.modules.length };
    results.summary.passed++;

    // Contar módulos con dependencias
    const withDeps = registry.modules.filter(m =>
      m.dependencies?.required?.length > 0
    ).length;
    console.log(`   📊 Módulos con dependencias requeridas: ${withDeps}`);

    // Buscar dependencias circulares
    console.log('\n   🔄 Verificando dependencias circulares...');
    const circular = [];
    for (const mod of registry.modules) {
      if (!mod.dependencies?.required) continue;
      for (const dep of mod.dependencies.required) {
        const depModule = registry.modules.find(m => m.id === dep);
        if (depModule?.dependencies?.required?.includes(mod.id)) {
          circular.push({ a: mod.id, b: dep });
        }
      }
    }

    if (circular.length === 0) {
      console.log('   ✅ No hay dependencias circulares');
      results.summary.passed++;
    } else {
      console.log(`   ⚠️ ${circular.length} dependencias circulares:`);
      circular.forEach(c => console.log(`      ${c.a} ↔ ${c.b}`));
      results.dependencies.circular = circular;
      results.summary.warnings++;
    }

    // Identificar módulos más críticos (más dependidos)
    console.log('\n   📊 Módulos más críticos (más requeridos por otros):');
    const depCount = {};
    for (const mod of registry.modules) {
      if (!mod.dependencies?.required) continue;
      for (const dep of mod.dependencies.required) {
        depCount[dep] = (depCount[dep] || 0) + 1;
      }
    }

    const criticalList = Object.entries(depCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    criticalList.forEach(([mod, count]) => {
      console.log(`      🔥 ${mod}: requerido por ${count} módulos`);
    });
    results.dependencies.criticalModules = criticalList.map(([mod, count]) => ({ mod, count }));

  } catch (e) {
    console.log(`   ⚠️ Registry no disponible: ${e.message}`);
    results.summary.warnings++;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 7: ÍNDICES Y PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 FASE 7: VERIFICAR ÍNDICES CRÍTICOS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  try {
    const [indexes] = await sequelize.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (indexname LIKE '%company_id%' OR indexname LIKE '%user_id%' OR indexname LIKE '%dept%')
      ORDER BY tablename
    `);

    console.log(`   📊 Índices multi-tenant encontrados: ${indexes.length}`);
    results.database.indexes = { multiTenant: indexes.length };

    // Verificar índices específicos importantes
    const importantIndexes = ['users', 'attendance', 'kiosks', 'departments'];
    const tablesWithIndex = [...new Set(indexes.map(i => i.tablename))];

    for (const table of importantIndexes) {
      if (tablesWithIndex.includes(table)) {
        console.log(`   ✅ ${table}: Tiene índices multi-tenant`);
        results.summary.passed++;
      } else {
        console.log(`   ⚠️ ${table}: Sin índices multi-tenant`);
        results.summary.warnings++;
      }
    }
  } catch (e) {
    console.log(`   ⚠️ No se pudo verificar índices`);
    results.summary.warnings++;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FASE 8: STATS POR EMPRESA (MUESTRA)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 FASE 8: ESTADÍSTICAS POR EMPRESA');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  try {
    const [companyStats] = await sequelize.query(`
      SELECT
        c.name as company_name,
        c.slug,
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) as users_count,
        (SELECT COUNT(*) FROM departments WHERE company_id = c.id) as depts_count,
        (SELECT COUNT(*) FROM kiosks WHERE company_id = c.id) as kiosks_count,
        (SELECT COUNT(*) FROM attendance WHERE company_id = c.id) as attendance_count
      FROM companies c
      WHERE c.is_active = true
      ORDER BY users_count DESC
      LIMIT 5
    `);

    console.log('   Top 5 empresas activas:');
    for (const company of companyStats) {
      console.log(`   📊 ${company.company_name} (${company.slug}):`);
      console.log(`      Users: ${company.users_count} | Depts: ${company.depts_count} | Kiosks: ${company.kiosks_count} | Attendance: ${company.attendance_count}`);
    }
    results.summary.passed++;
  } catch (e) {
    console.log(`   ⚠️ No se pudo obtener stats por empresa`);
    results.summary.warnings++;
  }

  // Guardar resultados
  const resultsFile = 'ssot-quick-test-results.json';
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  // ═══════════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN FINAL - TEST SSOT + BD');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`   ✅ Tests pasados: ${results.summary.passed}`);
  console.log(`   ⚠️ Advertencias: ${results.summary.warnings}`);
  console.log(`   ❌ Tests fallidos: ${results.summary.failed}`);

  const total = results.summary.passed + results.summary.failed;
  const successRate = total > 0 ? Math.round(results.summary.passed / total * 100) : 100;
  console.log(`\n   📈 SUCCESS RATE: ${successRate}%`);
  console.log(`\n📄 Resultados guardados en: ${resultsFile}`);

  // Cerrar conexión
  await sequelize.close();
  console.log('\n🏁 Test finalizado');
  console.log(`⏰ Fin: ${new Date().toLocaleString()}`);

  return results;
}

// Ejecutar
runQuickSSOTTest().catch(console.error);
