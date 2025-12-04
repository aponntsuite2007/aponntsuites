/**
 * CONSOLIDAR MÓDULOS COMERCIALES EN ENGINEERING-METADATA.JS
 * Versión simple (sin BD)
 */

const fs = require('fs').promises;
const path = require('path');

async function consolidateModules() {
  console.log('🎯 CONSOLIDACIÓN DE MÓDULOS EN ENGINEERING-METADATA.JS (Simple)');
  console.log('='.repeat(80));

  try {
    // 1. LEER MODULES-REGISTRY.JSON
    console.log('\n📋 PASO 1: Leyendo modules-registry.json...');
    const registryPath = path.join(__dirname, '../src/config/modules-registry.json');
    const registryData = JSON.parse(await fs.readFile(registryPath, 'utf8'));
    console.log(`✅ Leídos ${registryData.modules.length} módulos del registry`);

    // 2. LEER ENGINEERING-METADATA.JS ACTUAL
    console.log('\n📋 PASO 2: Leyendo engineering-metadata.js...');
    const metadataPath = path.join(__dirname, '../engineering-metadata.js');
    let metadataContent = await fs.readFile(metadataPath, 'utf8');

    // Extraer solo el último objeto module.exports
    const lastExportMatch = metadataContent.match(/module\.exports\s*=\s*({[\s\S]*});?\s*$/m);
    if (!lastExportMatch) {
      throw new Error('No se pudo parsear engineering-metadata.js');
    }

    // Evaluar usando Function para evitar problemas
    const engineeringData = new Function('return ' + lastExportMatch[1])();
    console.log(`✅ Engineering metadata cargado`);

    // 3. CONSOLIDAR DATOS
    console.log('\n📋 PASO 3: Consolidando módulos comerciales...');

    const commercialModules = {};
    let core = 0, premium = 0;

    // Recorrer registry
    for (const mod of registryData.modules) {
      const moduleKey = mod.key;
      const techModule = engineeringData.modules?.[moduleKey];

      commercialModules[moduleKey] = {
        // Identificación
        id: mod.id,
        key: mod.key,
        name: mod.name,
        nameAlt: mod.name_alt || null,
        icon: mod.icon,

        // Categorización
        category: mod.category,
        isCore: mod.is_core,

        // Pricing
        basePrice: mod.base_price,
        pricingTiers: {
          tier1: { min: 1, max: 50, multiplier: 1.0, discount: '0%' },
          tier2: { min: 51, max: 100, multiplier: 0.85, discount: '15%' },
          tier3: { min: 101, max: 999999, multiplier: 0.70, discount: '30%' }
        },

        // Descripción
        description: mod.description,

        // Disponibilidad
        availableIn: mod.is_core ? 'both' : 'company',

        // Dependencies
        dependencies: {
          required: mod.dependencies?.required || [],
          optional: mod.dependencies?.optional || [],
          providesTo: mod.dependencies?.provides_to || [],
          integratesWith: []
        },

        // Relación con módulo técnico
        technicalModule: techModule ? {
          hasImplementation: true,
          status: techModule.status || 'UNKNOWN',
          progress: techModule.progress || 0,
          files: techModule.files || [],
          tables: techModule.tables || [],
          apiEndpoints: techModule.apiEndpoints || []
        } : {
          hasImplementation: false,
          status: 'NOT_IMPLEMENTED',
          progress: 0
        },

        // Metadata
        version: '1.0.0',
        displayOrder: 999,
        isActive: true,

        // Auditoría
        lastUpdated: new Date().toISOString()
      };

      if (mod.is_core) core++;
      else premium++;
    }

    console.log(`✅ Consolidados ${registryData.modules.length} módulos`);
    console.log(`   - Core: ${core}`);
    console.log(`   - Premium: ${premium}`);

    // 4. AGREGAR SECCIÓN
    console.log('\n📋 PASO 4: Agregando sección commercialModules...');

    engineeringData.commercialModules = {
      _description: "MÓDULOS COMERCIALES CONTRATABLES - FUENTE ÚNICA DE VERDAD",
      _version: "1.0.0",
      _lastSync: new Date().toISOString(),
      _stats: {
        total: registryData.modules.length,
        core: core,
        premium: premium
      },
      _sources: {
        primary: "src/config/modules-registry.json"
      },
      _syncCommand: "node scripts/consolidate-modules-simple.js",
      modules: commercialModules,
      bundles: registryData.bundles || {},
      licensesTiers: registryData.licensesTiers || {}
    };

    // 5. CREAR RELACIÓN BIDIRECCIONAL
    console.log('\n📋 PASO 5: Linking módulos técnicos ↔ comerciales...');
    let linked = 0;

    for (const [key, techModule] of Object.entries(engineeringData.modules || {})) {
      if (commercialModules[key]) {
        engineeringData.modules[key].commercialModule = {
          linked: true,
          moduleKey: key,
          basePrice: commercialModules[key].basePrice,
          isCore: commercialModules[key].isCore,
          category: commercialModules[key].category
        };
        linked++;
      }
    }

    console.log(`✅ Linked ${linked} módulos técnicos con comerciales`);

    // 6. GUARDAR
    console.log('\n📋 PASO 6: Guardando engineering-metadata.js...');

    const newContent = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(engineeringData, null, 2)};
`;

    await fs.writeFile(metadataPath, newContent, 'utf8');
    console.log(`✅ engineering-metadata.js actualizado (${(newContent.length / 1024 / 1024).toFixed(2)} MB)`);

    // REPORTE
    console.log('\n' + '='.repeat(80));
    console.log('✅ CONSOLIDACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log(`\n📊 Total módulos comerciales: ${registryData.modules.length}`);
    console.log(`   CORE: ${core}`);
    console.log(`   PREMIUM: ${premium}`);
    console.log(`   Linked: ${linked}`);
    console.log('\n📁 ESTRUCTURA CREADA:');
    console.log('   engineering-metadata.js:');
    console.log('   ├─ modules (técnicos) ← PRESERVADO');
    console.log('   ├─ commercialModules ← ✨ AGREGADO');
    console.log('   │  ├─ modules (46)');
    console.log('   │  ├─ bundles');
    console.log('   │  └─ licensesTiers');
    console.log('   └─ [resto...]');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

consolidateModules();
