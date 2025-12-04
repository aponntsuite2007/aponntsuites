/**
 * CONSOLIDAR MÓDULOS COMERCIALES EN ENGINEERING-METADATA.JS
 *
 * Este script:
 * 1. Lee modules-registry.json (fuente más completa)
 * 2. Lee system_modules de PostgreSQL (datos reales)
 * 3. Lee company_modules para ver qué está activo en ISI
 * 4. Crea sección commercialModules en engineering-metadata.js
 * 5. Mantiene módulos técnicos existentes
 * 6. Crea relación entre módulos técnicos y comerciales
 */

const fs = require('fs').promises;
const path = require('path');
const { Sequelize } = require('sequelize');

// Configuración BD
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
  {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);

async function consolidateModules() {
  console.log('🎯 CONSOLIDACIÓN DE MÓDULOS EN ENGINEERING-METADATA.JS');
  console.log('='.repeat(80));

  try {
    // 1. LEER MODULES-REGISTRY.JSON
    console.log('\n📋 PASO 1: Leyendo modules-registry.json...');
    const registryPath = path.join(__dirname, '../src/config/modules-registry.json');
    const registryData = JSON.parse(await fs.readFile(registryPath, 'utf8'));
    console.log(`✅ Leídos ${registryData.modules.length} módulos del registry`);

    // 2. LEER SYSTEM_MODULES DE BD
    console.log('\n📋 PASO 2: Leyendo system_modules de PostgreSQL...');
    await sequelize.authenticate();
    const [systemModules] = await sequelize.query(`
      SELECT
        module_key, name, description, icon, color, category,
        base_price, is_active, is_core, display_order,
        features, requirements, bundled_modules,
        available_in, provides_to, integrates_with,
        metadata, version, min_employees, max_employees, rubro
      FROM system_modules
      WHERE is_active = true
      ORDER BY display_order
    `);
    console.log(`✅ Leídos ${systemModules.length} módulos de system_modules (BD)`);

    // 3. LEER MÓDULOS ACTIVOS DE ISI (company_id = 11)
    console.log('\n📋 PASO 3: Leyendo módulos activos de ISI...');
    const [isiModules] = await sequelize.query(`
      SELECT
        sm.module_key, sm.name, cm.is_active, cm.price_usd,
        cm.contracted_date, cm.activation_date
      FROM company_modules cm
      JOIN system_modules sm ON cm.module_id = sm.id
      WHERE cm.company_id = 11
      ORDER BY cm.contracted_date DESC
    `);
    console.log(`✅ ISI tiene ${isiModules.length} módulos contratados`);

    // 4. LEER ENGINEERING-METADATA.JS ACTUAL
    console.log('\n📋 PASO 4: Leyendo engineering-metadata.js...');
    const metadataPath = path.join(__dirname, '../engineering-metadata.js');
    const metadataContent = await fs.readFile(metadataPath, 'utf8');

    // Extraer el objeto modules.exports = {...}
    const moduleExportsMatch = metadataContent.match(/module\.exports\s*=\s*({[\s\S]*});?\s*$/m);
    if (!moduleExportsMatch) {
      throw new Error('No se pudo parsear engineering-metadata.js');
    }

    // Evaluar el objeto (cuidado: solo funciona si no hay código ejecutable)
    const engineeringData = eval('(' + moduleExportsMatch[1] + ')');
    console.log(`✅ Engineering metadata cargado (${Object.keys(engineeringData).length} secciones)`);

    // 5. CONSOLIDAR DATOS
    console.log('\n📋 PASO 5: Consolidando módulos comerciales...');

    const commercialModules = {};
    const moduleStats = {
      total: 0,
      core: 0,
      premium: 0,
      inBD: 0,
      inRegistry: 0,
      activeInISI: 0
    };

    // Recorrer registry (fuente más completa)
    for (const mod of registryData.modules) {
      const moduleKey = mod.key;

      // Buscar en BD
      const bdModule = systemModules.find(m => m.module_key === moduleKey);

      // Buscar en ISI
      const isiModule = isiModules.find(m => m.module_key === moduleKey);

      // Buscar en módulos técnicos de engineering
      const techModule = engineeringData.modules?.[moduleKey];

      // Consolidar información
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
        basePrice: bdModule?.base_price || mod.base_price,
        pricingTiers: {
          tier1: { min: 1, max: 50, multiplier: 1.0 },
          tier2: { min: 51, max: 100, multiplier: 0.85 },
          tier3: { min: 101, max: 999999, multiplier: 0.70 }
        },

        // Descripción
        description: bdModule?.description || mod.description,

        // Disponibilidad
        availableIn: bdModule?.available_in || (mod.is_core ? 'both' : 'company'),
        minEmployees: bdModule?.min_employees || null,
        maxEmployees: bdModule?.max_employees || null,
        rubro: bdModule?.rubro || null,

        // Features
        features: bdModule?.features || [],

        // Dependencias
        dependencies: {
          required: mod.dependencies?.required || [],
          optional: mod.dependencies?.optional || [],
          providesTo: mod.dependencies?.provides_to || bdModule?.provides_to || [],
          integratesWith: bdModule?.integrates_with || []
        },

        // Bundled modules (si este módulo activa otros gratis)
        bundledModules: bdModule?.bundled_modules || [],

        // Metadata
        version: bdModule?.version || '1.0.0',
        color: bdModule?.color || null,
        displayOrder: bdModule?.display_order || 999,

        // Estado
        isActive: bdModule?.is_active !== false,

        // Relación con módulos técnicos
        technicalModule: techModule ? {
          hasImplementation: true,
          status: techModule.status,
          progress: techModule.progress,
          files: techModule.files || [],
          tables: techModule.tables || [],
          apiEndpoints: techModule.apiEndpoints || []
        } : {
          hasImplementation: false,
          status: 'NOT_IMPLEMENTED',
          progress: 0
        },

        // Testing en ISI
        activeInISI: isiModule ? {
          isActive: isiModule.is_active,
          priceContracted: parseFloat(isiModule.price_usd),
          contractedDate: isiModule.contracted_date,
          activationDate: isiModule.activation_date
        } : null,

        // Metadata adicional
        metadata: bdModule?.metadata || {},

        // Auditoría
        lastUpdated: new Date().toISOString(),
        sources: {
          registry: !!mod,
          database: !!bdModule,
          technical: !!techModule,
          activeInISI: !!isiModule
        }
      };

      // Stats
      moduleStats.total++;
      if (mod.is_core) moduleStats.core++;
      else moduleStats.premium++;
      if (bdModule) moduleStats.inBD++;
      if (mod) moduleStats.inRegistry++;
      if (isiModule?.is_active) moduleStats.activeInISI++;
    }

    console.log(`✅ Consolidados ${moduleStats.total} módulos comerciales`);
    console.log(`   - Core: ${moduleStats.core}`);
    console.log(`   - Premium: ${moduleStats.premium}`);
    console.log(`   - En BD: ${moduleStats.inBD}`);
    console.log(`   - En Registry: ${moduleStats.inRegistry}`);
    console.log(`   - Activos en ISI: ${moduleStats.activeInISI}`);

    // 6. AGREGAR A ENGINEERING-METADATA
    console.log('\n📋 PASO 6: Agregando sección commercialModules...');

    engineeringData.commercialModules = {
      _description: "MÓDULOS COMERCIALES CONTRATABLES - FUENTE ÚNICA DE VERDAD",
      _version: "1.0.0",
      _lastSync: new Date().toISOString(),
      _stats: moduleStats,
      _sources: {
        primary: "src/config/modules-registry.json",
        secondary: "system_modules (PostgreSQL)",
        testing: "ISI company (company_id = 11)"
      },
      _syncInstructions: {
        command: "node scripts/consolidate-modules-to-engineering.js",
        whenToSync: [
          "Al agregar/modificar módulos en modules-registry.json",
          "Al cambiar precios en system_modules",
          "Al activar módulos nuevos en ISI para testing"
        ]
      },
      modules: commercialModules,
      bundles: registryData.bundles || {},
      licensesTiers: registryData.licensesTiers || {}
    };

    // 7. CREAR RELACIÓN BIDIRECCIONAL
    console.log('\n📋 PASO 7: Creando relación bidireccional modules ↔ commercialModules...');

    // Agregar link en módulos técnicos hacia comerciales
    for (const [key, techModule] of Object.entries(engineeringData.modules || {})) {
      if (commercialModules[key]) {
        engineeringData.modules[key].commercialModule = {
          linked: true,
          moduleKey: key,
          basePrice: commercialModules[key].basePrice,
          isCore: commercialModules[key].isCore,
          category: commercialModules[key].category
        };
      }
    }

    console.log(`✅ Linked ${Object.keys(engineeringData.modules || {}).length} módulos técnicos con comerciales`);

    // 8. GUARDAR ENGINEERING-METADATA.JS
    console.log('\n📋 PASO 8: Guardando engineering-metadata.js...');

    const newContent = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(engineeringData, null, 2)};
`;

    await fs.writeFile(metadataPath, newContent, 'utf8');
    console.log(`✅ engineering-metadata.js actualizado`);

    // 9. REPORTE FINAL
    console.log('\n' + '='.repeat(80));
    console.log('✅ CONSOLIDACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log('\n📊 RESUMEN:');
    console.log(`   Total módulos comerciales: ${moduleStats.total}`);
    console.log(`   Módulos CORE: ${moduleStats.core}`);
    console.log(`   Módulos PREMIUM: ${moduleStats.premium}`);
    console.log(`   Activos en ISI: ${moduleStats.activeInISI}`);
    console.log('\n📁 ESTRUCTURA CREADA:');
    console.log('   engineering-metadata.js:');
    console.log('   ├─ modules (técnicos) ← YA EXISTÍA');
    console.log('   ├─ commercialModules ← ✨ NUEVA SECCIÓN');
    console.log('   │  ├─ modules (46 módulos contratables)');
    console.log('   │  ├─ bundles (paquetes con descuento)');
    console.log('   │  └─ licensesTiers');
    console.log('   └─ [otras secciones existentes...]');
    console.log('\n🔗 PRÓXIMOS PASOS:');
    console.log('   1. Crear API /api/engineering/commercial-modules');
    console.log('   2. Conectar panel-administrativo a nueva API');
    console.log('   3. Conectar panel-empresa a nueva API');
    console.log('   4. Conectar index.html features a nueva API');
    console.log('   5. Deprecar pricingConfig hardcoded en HTML');

    await sequelize.close();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
consolidateModules();
