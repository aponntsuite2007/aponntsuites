/**
 * REPORTE FINAL - ESTADO COMPLETO DEL SISTEMA
 * Verifica sincronización entre BD, Registry y Engineering Metadata
 */

const db = require('../src/config/database');
const registry = require('../src/config/modules-registry.json');
const metadata = require('../engineering-metadata.js');

async function generateFinalReport() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('          📊 REPORTE FINAL - SINCRONIZACIÓN COMPLETA DEL SISTEMA');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  try {
    await db.sequelize.authenticate();

    // 1. BD STATE
    const [bdModules] = await db.sequelize.query(`
      SELECT module_key, name, is_core, category
      FROM system_modules
      WHERE is_active = true
      ORDER BY is_core DESC, module_key
    `);

    const bdCore = bdModules.filter(m => m.is_core);
    const bdPremium = bdModules.filter(m => !m.is_core);

    console.log('1️⃣  BASE DE DATOS (PostgreSQL system_modules)');
    console.log('─'.repeat(70));
    console.log(`   Total módulos: ${bdModules.length}`);
    console.log(`   CORE: ${bdCore.length}`);
    console.log(`   PREMIUM: ${bdPremium.length}\n`);

    // 2. REGISTRY STATE
    const registryCore = registry.modules.filter(m => m.is_core);
    const registryPremium = registry.modules.filter(m => !m.is_core);

    console.log('2️⃣  REGISTRY (modules-registry.json)');
    console.log('─'.repeat(70));
    console.log(`   Version: ${registry.version}`);
    console.log(`   Total módulos: ${registry.modules.length}`);
    console.log(`   CORE: ${registryCore.length}`);
    console.log(`   PREMIUM: ${registryPremium.length}\n`);

    // 3. ENGINEERING METADATA STATE
    const commercialModules = metadata.commercialModules?.modules || {};
    const commercialModulesArray = Object.values(commercialModules);
    const metadataCore = commercialModulesArray.filter(m => m.isCore);
    const metadataPremium = commercialModulesArray.filter(m => !m.isCore);

    console.log('3️⃣  ENGINEERING METADATA (engineering-metadata.js)');
    console.log('─'.repeat(70));
    console.log(`   Version: ${metadata.commercialModules?._version || 'N/A'}`);
    console.log(`   Total módulos: ${commercialModulesArray.length}`);
    console.log(`   CORE: ${metadataCore.length}`);
    console.log(`   PREMIUM: ${metadataPremium.length}\n`);

    // 4. VERIFICAR CORRECCIONES ESPECÍFICAS
    console.log('4️⃣  VERIFICACIÓN DE LAS 4 CORRECCIONES APLICADAS');
    console.log('─'.repeat(70));

    const corrections = ['attendance', 'departments', 'inbox', 'shifts'];
    let allCorrect = true;

    for (const key of corrections) {
      // BD
      const bdMod = bdModules.find(m => m.module_key === key);
      // Registry
      const regMod = registry.modules.find(m => m.key === key);
      // Metadata
      const metaMod = commercialModules[key];

      const bdOk = bdMod?.is_core === true;
      const regOk = regMod?.is_core === true;
      const metaOk = metaMod?.isCore === true;

      const status = (bdOk && regOk && metaOk) ? '✅' : '❌';

      if (!bdOk || !regOk || !metaOk) allCorrect = false;

      console.log(`   ${status} ${key.padEnd(20)} | BD: ${bdOk} | Registry: ${regOk} | Metadata: ${metaOk}`);
    }

    console.log('');

    // 5. SINCRONIZACIÓN GENERAL
    console.log('5️⃣  ESTADO DE SINCRONIZACIÓN');
    console.log('─'.repeat(70));

    const bdRegistrySync = (bdCore.length === registryCore.length && bdPremium.length === registryPremium.length);
    const registryMetadataSync = (registryCore.length === metadataCore.length && registryPremium.length === metadataPremium.length);
    const fullSync = bdRegistrySync && registryMetadataSync && allCorrect;

    console.log(`   BD ↔ Registry:           ${bdRegistrySync ? '✅ SINCRONIZADO' : '❌ DESINCRONIZADO'}`);
    console.log(`   Registry ↔ Metadata:     ${registryMetadataSync ? '✅ SINCRONIZADO' : '❌ DESINCRONIZADO'}`);
    console.log(`   Correcciones aplicadas:  ${allCorrect ? '✅ TODAS OK' : '❌ FALTAN ALGUNAS'}`);
    console.log(`   ESTADO GENERAL:          ${fullSync ? '✅ SISTEMA COMPLETAMENTE SINCRONIZADO' : '❌ REQUIERE ATENCIÓN'}\n`);

    // 6. CATEGORÍAS DETECTADAS
    const categories = new Set();
    bdModules.forEach(m => categories.add(m.category));

    console.log('6️⃣  CATEGORÍAS DETECTADAS EN BD');
    console.log('─'.repeat(70));
    console.log(`   Total categorías: ${categories.size}`);
    console.log(`   Categorías: ${Array.from(categories).sort().join(', ')}\n`);

    // 7. MÓDULOS CORE FINALES
    console.log('7️⃣  MÓDULOS CORE FINALES (17 TOTAL)');
    console.log('─'.repeat(70));
    bdCore.forEach(m => {
      console.log(`   ✓ ${m.module_key.padEnd(35)} | ${m.name}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    if (fullSync) {
      console.log('                   ✅ SISTEMA COMPLETAMENTE SINCRONIZADO');
    } else {
      console.log('                   ⚠️  REQUIERE SINCRONIZACIÓN ADICIONAL');
    }
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

generateFinalReport();
