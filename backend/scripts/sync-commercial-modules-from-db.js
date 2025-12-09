/**
 * ============================================================================
 * SYNC COMMERCIAL MODULES FROM DATABASE - FUENTE ÚNICA DE VERDAD
 * ============================================================================
 *
 * Este script sincroniza los módulos comerciales desde la BD (system_modules)
 * hacia engineering-metadata.js, convirtiéndolo en la FUENTE ÚNICA DE VERDAD.
 *
 * FLUJO:
 * 1. Lee módulos de ISI (company_id=11) desde system_modules + company_modules
 * 2. Mapea cada módulo a estructura commercialModules
 * 3. Genera bundles (CORE bundle + opcionales)
 * 4. Actualiza engineering-metadata.js
 * 5. Todas las solapas del sistema leen de aquí
 *
 * USO:
 *   node scripts/sync-commercial-modules-from-db.js
 *   node scripts/sync-commercial-modules-from-db.js --company-id=11
 *   node scripts/sync-commercial-modules-from-db.js --dry-run
 *
 * ============================================================================
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const COMPANY_ID = parseInt(process.argv.find(arg => arg.startsWith('--company-id='))?.split('=')[1] || '11');
const DRY_RUN = process.argv.includes('--dry-run');

console.log('\n' + '='.repeat(80));
console.log('🔄 SYNC COMMERCIAL MODULES FROM DATABASE');
console.log('='.repeat(80));
console.log(`📊 Company ID: ${COMPANY_ID} (ISI)`);
console.log(`🔍 Dry run: ${DRY_RUN ? 'YES (no escribirá)' : 'NO (escribirá metadata)'}`);
console.log('='.repeat(80) + '\n');

// ============================================================================
// CONEXIÓN BD
// ============================================================================

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Aedr15150302',
  logging: false
});

// ============================================================================
// MAPEO DE CATEGORÍAS A ICONOS/COLORES
// ============================================================================

const CATEGORY_CONFIG = {
  core: { icon: '⚙️', color: '#3b82f6', displayName: 'Core' },
  rrhh: { icon: '👥', color: '#8b5cf6', displayName: 'RRHH' },
  medical: { icon: '🏥', color: '#ec4899', displayName: 'Médico' },
  payroll: { icon: '💰', color: '#14b8a6', displayName: 'Nómina' },
  siac: { icon: '🏢', color: '#f97316', displayName: 'SIAC' },
  hardware: { icon: '🖥️', color: '#84cc16', displayName: 'Hardware' },
  compliance: { icon: '📋', color: '#f59e0b', displayName: 'Cumplimiento' },
  communication: { icon: '📬', color: '#10b981', displayName: 'Comunicación' },
  analytics: { icon: '📊', color: '#6366f1', displayName: 'Analytics' },
  admin: { icon: '🛠️', color: '#64748b', displayName: 'Admin' }
};

// ============================================================================
// MAPEO DE MODULE_KEY A CONFIG TÉCNICO
// ============================================================================

const MODULE_KEY_MAP = {
  // CORE
  'users': { fileJs: 'users.js', status: 'PRODUCTION', progress: 100 },
  'attendance': { fileJs: 'attendance.js', status: 'PRODUCTION', progress: 100 },
  'company-account': { fileJs: 'company-account.js', status: 'PRODUCTION', progress: 100 },
  'dms-dashboard': { fileJs: 'dms-dashboard.js', status: 'PRODUCTION', progress: 100 },
  'mi-espacio': { fileJs: 'mi-espacio.js', status: 'PRODUCTION', progress: 100 },

  // MEDICAL
  'medical': { fileJs: 'medical-dashboard-professional.js', status: 'PRODUCTION', progress: 100 },
  'art-management': { fileJs: 'art-management.js', status: 'PRODUCTION', progress: 100 },

  // PAYROLL
  'payroll-liquidation': { fileJs: 'payroll-liquidation.js', status: 'PRODUCTION', progress: 100 },

  // SIAC
  'clientes': { fileJs: 'clientes.js', status: 'PRODUCTION', progress: 100 },
  'facturacion': { fileJs: 'facturacion.js', status: 'PRODUCTION', progress: 100 },
  'plantillas-fiscales': { fileJs: 'plantillas-fiscales.js', status: 'PRODUCTION', progress: 100 },

  // RRHH
  'job-postings': { fileJs: 'job-postings.js', status: 'PRODUCTION', progress: 100 },
  'organizational-structure': { fileJs: 'organizational-structure.js', status: 'PRODUCTION', progress: 100 },
  'employee-360': { fileJs: 'employee-360.js', status: 'PRODUCTION', progress: 100 },
  'training-management': { fileJs: 'training-management.js', status: 'PRODUCTION', progress: 100 },
  'sanctions-management': { fileJs: 'sanctions-management.js', status: 'PRODUCTION', progress: 100 },
  'vacation-management': { fileJs: 'vacation-management.js', status: 'PRODUCTION', progress: 100 },
  'procedures-manual': { fileJs: 'procedures-manual.js', status: 'PRODUCTION', progress: 100 },

  // HARDWARE
  'kiosks': { fileJs: 'kiosks.js', status: 'PRODUCTION', progress: 100 },

  // COMPLIANCE
  'biometric-consent': { fileJs: 'biometric-consent.js', status: 'PRODUCTION', progress: 100 },
  'legal-dashboard': { fileJs: 'legal-dashboard.js', status: 'PRODUCTION', progress: 100 },
  'compliance-dashboard': { fileJs: 'compliance-dashboard.js', status: 'PRODUCTION', progress: 100 },
  'hse-management': { fileJs: 'hse-management.js', status: 'PRODUCTION', progress: 100 },

  // COMMUNICATION
  'notification-center': { fileJs: 'notification-center.js', status: 'PRODUCTION', progress: 100 },
  'notifications-enterprise': { fileJs: 'notifications-enterprise.js', status: 'PRODUCTION', progress: 100 },

  // ANALYTICS
  'employee-map': { fileJs: 'employee-map.js', status: 'PRODUCTION', progress: 100 },

  // OTROS (módulos base del sistema)
  'departments': { fileJs: 'departments.js', status: 'PRODUCTION', progress: 100 },
  'shifts': { fileJs: 'shifts.js', status: 'PRODUCTION', progress: 100 }
};

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  try {
    // 1. Conectar a BD
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    // 2. Query para obtener módulos de ISI (EXCLUYENDO "Gestión de Licencias")
    const [modules] = await sequelize.query(`
      SELECT
        sm.id,
        sm.name,
        sm.category,
        sm.icon,
        sm.description,
        cm.activo,
        cm.precio_mensual,
        cm.contracted_price
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = :companyId
        AND cm.activo = true
        AND sm.name != 'Gestión de Licencias'
      ORDER BY sm.category, sm.name
    `, {
      replacements: { companyId: COMPANY_ID }
    });

    console.log(`📊 Módulos encontrados: ${modules.length}\n`);

    if (modules.length === 0) {
      console.error('❌ No se encontraron módulos para esta empresa');
      process.exit(1);
    }

    // 3. Convertir módulos a estructura commercialModules
    const commercialModules = {};
    const categoriesStats = {};

    modules.forEach((mod, index) => {
      const moduleKey = convertToModuleKey(mod.name);
      const category = mod.category || 'otros';
      const isCore = category === 'core';

      // Generar pricing tiers
      const basePrice = parseFloat(mod.contracted_price || mod.precio_mensual || 0);

      // Detectar config técnico
      const technicalConfig = MODULE_KEY_MAP[moduleKey] || {
        fileJs: null,
        status: 'NOT_IMPLEMENTED',
        progress: 0
      };

      commercialModules[moduleKey] = {
        id: moduleKey,
        key: moduleKey,
        name: mod.name,
        nameAlt: null,
        icon: mod.icon || '📦',
        category: category,
        isCore: isCore,
        basePrice: basePrice,
        pricingTiers: generatePricingTiers(basePrice),
        description: mod.description || `Módulo ${mod.name}`,
        availableIn: 'both', // panel-empresa, panel-administrativo

        // NUEVO: Bundling configuration
        bundleConfig: {
          isBundleable: true,
          bundlesWith: [], // Se llenará después si aplica
          bundleDiscount: 0.15 // 15% descuento si se bundlea
        },

        dependencies: {
          required: [],
          optional: [],
          providesTo: [],
          integratesWith: []
        },

        technicalModule: {
          hasImplementation: !!technicalConfig.fileJs,
          frontendFile: technicalConfig.fileJs,
          status: technicalConfig.status,
          progress: technicalConfig.progress
        },

        version: '1.0.0',
        displayOrder: index + 1,
        isActive: true,
        lastUpdated: new Date().toISOString()
      };

      // Stats por categoría
      if (!categoriesStats[category]) {
        categoriesStats[category] = { total: 0, core: 0, premium: 0 };
      }
      categoriesStats[category].total++;
      if (isCore) {
        categoriesStats[category].core++;
      } else {
        categoriesStats[category].premium++;
      }

      console.log(`  ✓ ${moduleKey.padEnd(30)} | ${category.padEnd(12)} | $${basePrice.toString().padStart(6)} | ${technicalConfig.status}`);
    });

    console.log('');

    // 4. Generar bundles
    const bundles = generateBundles(commercialModules);

    // 5. Calcular stats globales
    const totalModules = Object.keys(commercialModules).length;
    const coreModules = Object.values(commercialModules).filter(m => m.isCore).length;
    const premiumModules = totalModules - coreModules;

    const stats = {
      total: totalModules,
      core: coreModules,
      premium: premiumModules,
      byCategory: categoriesStats
    };

    // 6. Estructura final
    const commercialModulesSection = {
      _description: 'MÓDULOS COMERCIALES CONTRATABLES - FUENTE ÚNICA DE VERDAD',
      _version: '2.0.0',
      _lastSync: new Date().toISOString(),
      _syncedFrom: `system_modules (company_id=${COMPANY_ID})`,
      _stats: stats,
      _sources: {
        primary: 'PostgreSQL - system_modules + company_modules',
        script: 'scripts/sync-commercial-modules-from-db.js'
      },
      _syncCommand: 'node scripts/sync-commercial-modules-from-db.js',
      modules: commercialModules,
      bundles: bundles,
      licensesTiers: {
        tier1: { min: 1, max: 50, label: 'Pequeña Empresa', multiplier: 1.0 },
        tier2: { min: 51, max: 200, label: 'Mediana Empresa', multiplier: 0.85 },
        tier3: { min: 201, max: 999999, label: 'Gran Empresa', multiplier: 0.70 }
      }
    };

    console.log('📊 STATS:');
    console.log(`   Total: ${stats.total} módulos`);
    console.log(`   CORE: ${stats.core} módulos`);
    console.log(`   PREMIUM: ${stats.premium} módulos`);
    console.log(`   Bundles: ${Object.keys(bundles).length}\n`);

    // 7. Actualizar engineering-metadata.js
    if (!DRY_RUN) {
      await updateEngineeringMetadata(commercialModulesSection);
      console.log('✅ engineering-metadata.js actualizado correctamente\n');
    } else {
      console.log('🔍 DRY RUN: No se escribió engineering-metadata.js\n');
      console.log('Vista previa (primeros 3 módulos):');
      console.log(JSON.stringify(
        Object.fromEntries(Object.entries(commercialModules).slice(0, 3)),
        null,
        2
      ));
    }

    console.log('='.repeat(80));
    console.log('✅ SINCRONIZACIÓN COMPLETADA');
    console.log('='.repeat(80));

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Convierte nombre de módulo a module_key
 * "Gestión de Usuarios" → "users"
 */
function convertToModuleKey(name) {
  const map = {
    'Control de Asistencia': 'attendance',
    'Cuenta Comercial': 'company-account',
    'Gestión de Usuarios': 'users',
    'Gestión Documental (DMS)': 'dms-dashboard',
    'Mi Espacio': 'mi-espacio',
    'Gestión de ART': 'art-management',
    'Gestión Médica': 'medical',
    'Liquidación de Sueldos': 'payroll-liquidation',
    'Clientes SIAC': 'clientes',
    'Facturación SIAC': 'facturacion',
    'Plantillas Fiscales': 'plantillas-fiscales',
    'Búsquedas Laborales': 'job-postings',
    'Estructura Organizacional': 'organizational-structure',
    'Expediente 360°': 'employee-360',
    'Gestión de Capacitaciones': 'training-management',
    'Gestión de Sanciones': 'sanctions-management',
    'Gestión de Vacaciones': 'vacation-management',
    'Manual de Procedimientos': 'procedures-manual',
    'Gestión de Kioscos': 'kiosks',
    'Consentimientos y Privacidad': 'biometric-consent',
    'Gestión Legal': 'legal-dashboard',
    'Risk Intelligence Dashboard': 'compliance-dashboard',
    'Seguridad e Higiene Laboral (HSE)': 'hse-management',
    'Centro de Notificaciones': 'notification-center',
    'Mapa de Empleados': 'employee-map',
    'Gestión de Licencias': 'licensing-management'
  };

  return map[name] || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Genera pricing tiers basados en precio base
 */
function generatePricingTiers(basePrice) {
  return {
    tier1: {
      min: 1,
      max: 50,
      multiplier: 1.0,
      discount: '0%',
      price: basePrice
    },
    tier2: {
      min: 51,
      max: 100,
      multiplier: 0.85,
      discount: '15%',
      price: Math.round(basePrice * 0.85 * 100) / 100
    },
    tier3: {
      min: 101,
      max: 999999,
      multiplier: 0.70,
      discount: '30%',
      price: Math.round(basePrice * 0.70 * 100) / 100
    }
  };
}

/**
 * Genera bundles inteligentes
 */
function generateBundles(modules) {
  const coreModules = Object.values(modules).filter(m => m.isCore);
  const rhhhModules = Object.values(modules).filter(m => m.category === 'rrhh');
  const medicalModules = Object.values(modules).filter(m => m.category === 'medical');
  const siacModules = Object.values(modules).filter(m => m.category === 'siac');

  const bundles = {};

  // Bundle CORE (obligatorio)
  if (coreModules.length > 0) {
    const regularPrice = coreModules.reduce((sum, m) => sum + m.basePrice, 0);
    bundles.core = {
      id: 'core',
      name: 'Bundle CORE Completo',
      description: 'Funcionalidades esenciales del sistema (obligatorio)',
      modules: coreModules.map(m => m.key),
      regular_price: regularPrice,
      bundle_price: regularPrice, // CORE no tiene descuento (es obligatorio)
      discount_percentage: 0,
      is_mandatory: true,
      category: 'core'
    };
  }

  // Bundle RRHH
  if (rhhhModules.length > 0) {
    const regularPrice = rhhhModules.reduce((sum, m) => sum + m.basePrice, 0);
    const discount = 0.20; // 20% descuento
    bundles.rrhh = {
      id: 'rrhh',
      name: 'Bundle RRHH Completo',
      description: 'Todos los módulos de Recursos Humanos',
      modules: rhhhModules.map(m => m.key),
      regular_price: regularPrice,
      bundle_price: Math.round(regularPrice * (1 - discount)),
      discount_percentage: Math.round(discount * 100),
      is_mandatory: false,
      category: 'rrhh'
    };
  }

  // Bundle Médico
  if (medicalModules.length > 0) {
    const regularPrice = medicalModules.reduce((sum, m) => sum + m.basePrice, 0);
    const discount = 0.15;
    bundles.medical = {
      id: 'medical',
      name: 'Bundle Médico',
      description: 'Gestión médica y ART',
      modules: medicalModules.map(m => m.key),
      regular_price: regularPrice,
      bundle_price: Math.round(regularPrice * (1 - discount)),
      discount_percentage: Math.round(discount * 100),
      is_mandatory: false,
      category: 'medical'
    };
  }

  // Bundle SIAC
  if (siacModules.length > 0) {
    const regularPrice = siacModules.reduce((sum, m) => sum + m.basePrice, 0);
    const discount = 0.25; // 25% descuento
    bundles.siac = {
      id: 'siac',
      name: 'Bundle SIAC/ERP',
      description: 'Sistema completo de facturación y clientes',
      modules: siacModules.map(m => m.key),
      regular_price: regularPrice,
      bundle_price: Math.round(regularPrice * (1 - discount)),
      discount_percentage: Math.round(discount * 100),
      is_mandatory: false,
      category: 'siac'
    };
  }

  return bundles;
}

/**
 * Actualiza engineering-metadata.js con la nueva sección commercialModules
 */
async function updateEngineeringMetadata(commercialModulesSection) {
  const metadataPath = path.join(__dirname, '../engineering-metadata.js');

  // Leer metadata actual
  delete require.cache[require.resolve('../engineering-metadata.js')];
  const currentMetadata = require('../engineering-metadata.js');

  // Reemplazar sección commercialModules
  currentMetadata.commercialModules = commercialModulesSection;

  // Actualizar lastUpdated del proyecto
  if (currentMetadata.project) {
    currentMetadata.project.lastUpdated = new Date().toISOString();

    // Agregar entrada en latestChanges
    if (!currentMetadata.project.latestChanges) {
      currentMetadata.project.latestChanges = [];
    }
    currentMetadata.project.latestChanges.unshift(
      `🔄 COMMERCIAL MODULES v2.0: Sincronizados ${commercialModulesSection._stats.total} módulos desde BD (ISI) - FUENTE ÚNICA DE VERDAD (${new Date().toISOString().split('T')[0]})`
    );

    // Mantener solo últimas 50 entradas
    currentMetadata.project.latestChanges = currentMetadata.project.latestChanges.slice(0, 50);
  }

  // Escribir archivo
  const content = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 *
 * ⚠️ ESTE ARCHIVO ES EL CEREBRO DEL SISTEMA
 * ⚠️ LEER claudeInstructions.mandatoryIntegrations ANTES de desarrollar
 * ⚠️ Cualquier módulo con documentos DEBE usar DMS (ver mandatoryIntegrations.DMS)
 */

module.exports = ${JSON.stringify(currentMetadata, null, 2)};
`;

  fs.writeFileSync(metadataPath, content, 'utf8');

  console.log(`📝 Archivo escrito: ${metadataPath}`);
  console.log(`📦 Tamaño: ${(fs.statSync(metadataPath).size / 1024 / 1024).toFixed(2)} MB`);
}

// ============================================================================
// EJECUTAR
// ============================================================================

main();
