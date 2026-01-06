/**
 * Test RÁPIDO: Solo verificar el filtro de módulos (sin Playwright)
 */
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const database = require('../src/config/database');

async function testFilterOnly() {
  console.log('🔍 TEST RÁPIDO - Verificando filtro de módulos...\n');

  try {
    await database.sequelize.authenticate();
    console.log('✅ PostgreSQL conectado\n');

    const systemRegistry = new SystemRegistry(database);
    await systemRegistry.initialize();

    const allModules = systemRegistry.getAllModules();
    console.log(`📊 Registry tiene ${allModules.length} módulos total\n`);

    // Aplicar el mismo filtro que FrontendCollector
    const availableForValues = ['panel-empresa', 'both', 'company'];
    const backendOnlyModules = ['kiosks-apk', 'api-gateway', 'webhooks', 'integrations-api'];

    const filtered = allModules.filter(m => {
      const isForPanelEmpresa = availableForValues.includes(m.available_for);
      const isNotInternal = m.is_internal !== true;
      const isNotBackendOnly = !backendOnlyModules.includes(m.id);
      const isValid = m.id && m.name;

      return isForPanelEmpresa && isNotInternal && isNotBackendOnly && isValid;
    });

    console.log(`🎯 Módulos filtrados: ${filtered.length}\n`);

    // Mostrar primeros 10 módulos filtrados
    console.log('✅ Primeros 10 módulos que PASARON el filtro:');
    filtered.slice(0, 10).forEach(m => {
      console.log(`   - ${m.id} (${m.name}) [available_for="${m.available_for}" is_internal=${m.is_internal}]`);
    });

    // Mostrar primeros 5 que NO pasaron
    const skipped = allModules.filter(m => !filtered.includes(m));
    console.log(`\n❌ Primeros 5 módulos que NO pasaron (${skipped.length} total):`);
    skipped.slice(0, 5).forEach(m => {
      const isForPanelEmpresa = availableForValues.includes(m.available_for);
      const isNotInternal = m.is_internal !== true;
      const isNotBackendOnly = !backendOnlyModules.includes(m.id);

      console.log(`   - ${m.id}: available_for="${m.available_for}" (✓=${isForPanelEmpresa}) is_internal=${m.is_internal} (✓=${isNotInternal}) backend_only=${!isNotBackendOnly}`);
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

testFilterOnly();
