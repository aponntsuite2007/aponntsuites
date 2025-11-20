/**
 * Script para agregar secciones `help` a los workflows en engineering-metadata.js
 *
 * IMPORTANTE: Este script modifica engineering-metadata.js
 * Asegurarse de que ninguna otra sesión lo esté modificando antes de ejecutar.
 */

const fs = require('fs');
const path = require('path');

// Cargar metadata actual
const metadataPath = path.join(__dirname, '../engineering-metadata.js');
const helpSectionsPath = path.join(__dirname, '../workflows-help-sections.js');

console.log('📝 Agregando secciones help a workflows...\n');

// Leer contenido actual
let content = fs.readFileSync(metadataPath, 'utf8');
const helpSections = require(helpSectionsPath);

// Verificar que sea module.exports
if (!content.includes('module.exports = {')) {
  console.error('❌ Error: engineering-metadata.js no tiene formato esperado');
  process.exit(1);
}

// Contador de cambios
let changesCount = 0;

// ==================== WORKFLOW 1: contractModification ====================
console.log('1. Agregando help a contractModification...');
const help1 = JSON.stringify(helpSections.contractModification.help, null, 6);
const search1 = `      lastUpdated: "2025-01-19T18:30:00Z"
    },

    monthlyInvoicing: {`;

const replace1 = `      lastUpdated: "2025-01-19T18:30:00Z",

      // ✨ AYUDA CONTEXTUAL PARA AI ASSISTANT
      help: ${help1}
    },

    monthlyInvoicing: {`;

if (content.includes(search1)) {
  content = content.replace(search1, replace1);
  changesCount++;
  console.log('   ✅ contractModification.help agregado');
} else {
  console.log('   ⏭️  Ya existe o no se encontró el patrón');
}

// ==================== WORKFLOW 2: monthlyInvoicing ====================
console.log('2. Agregando help a monthlyInvoicing...');
const help2 = JSON.stringify(helpSections.monthlyInvoicing.help, null, 6);
const search2 = `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    monthlyCommissionLiquidation: {`;

const replace2 = `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      // ✨ AYUDA CONTEXTUAL PARA AI ASSISTANT
      help: ${help2}
    },

    monthlyCommissionLiquidation: {`;

if (content.includes(search2)) {
  content = content.replace(search2, replace2);
  changesCount++;
  console.log('   ✅ monthlyInvoicing.help agregado');
} else {
  console.log('   ⏭️  Ya existe o no se encontró el patrón');
}

// ==================== WORKFLOW 3: monthlyCommissionLiquidation ====================
console.log('3. Agregando help a monthlyCommissionLiquidation...');
const help3 = JSON.stringify(helpSections.monthlyCommissionLiquidation.help, null, 6);
const search3 = `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    walletChangeConfirmation: {`;

const replace3 = `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      // ✨ AYUDA CONTEXTUAL PARA AI ASSISTANT
      help: ${help3}
    },

    walletChangeConfirmation: {`;

if (content.includes(search3)) {
  content = content.replace(search3, replace3);
  changesCount++;
  console.log('   ✅ monthlyCommissionLiquidation.help agregado');
} else {
  console.log('   ⏭️  Ya existe o no se encontró el patrón');
}

// ==================== WORKFLOW 4: walletChangeConfirmation ====================
console.log('4. Agregando help a walletChangeConfirmation...');
const help4 = JSON.stringify(helpSections.walletChangeConfirmation.help, null, 6);
const search4 = `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    vendorOnboarding: {`;

const replace4 = `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      // ✨ AYUDA CONTEXTUAL PARA AI ASSISTANT
      help: ${help4}
    },

    vendorOnboarding: {`;

if (content.includes(search4)) {
  content = content.replace(search4, replace4);
  changesCount++;
  console.log('   ✅ walletChangeConfirmation.help agregado');
} else {
  console.log('   ⏭️  Ya existe o no se encontró el patrón');
}

// ==================== WORKFLOW 5: vendorOnboarding ====================
console.log('5. Agregando help a vendorOnboarding...');
const help5 = JSON.stringify(helpSections.vendorOnboarding.help, null, 6);
const search5 = `      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    companyModulesChange: {`;

const replace5 = `      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z",

      // ✨ AYUDA CONTEXTUAL PARA AI ASSISTANT
      help: ${help5}
    },

    companyModulesChange: {`;

if (content.includes(search5)) {
  content = content.replace(search5, replace5);
  changesCount++;
  console.log('   ✅ vendorOnboarding.help agregado');
} else {
  console.log('   ⏭️  Ya existe o no se encontró el patrón');
}

// ==================== WORKFLOW 6: companyModulesChange ====================
console.log('6. Agregando help a companyModulesChange...');
const help6 = JSON.stringify(helpSections.companyModulesChange.help, null, 6);
const search6 = `      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z"
    }
  },

  // ==================== BASE DE DATOS ====================`;

const replace6 = `      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z",

      // ✨ AYUDA CONTEXTUAL PARA AI ASSISTANT
      help: ${help6}
    }
  },

  // ==================== BASE DE DATOS ====================`;

if (content.includes(search6)) {
  content = content.replace(search6, replace6);
  changesCount++;
  console.log('   ✅ companyModulesChange.help agregado');
} else {
  console.log('   ⏭️  Ya existe o no se encontró el patrón');
}

// Guardar cambios
if (changesCount > 0) {
  fs.writeFileSync(metadataPath, content, 'utf8');
  console.log(`\n✅ Completado! ${changesCount} secciones help agregadas.`);
  console.log(`📁 Archivo actualizado: ${metadataPath}`);
} else {
  console.log('\n⚠️  No se realizaron cambios (todas las secciones ya existen o patrones no encontrados)');
}

console.log('\n🎯 SIGUIENTE PASO:');
console.log('   - Verificar visualmente engineering-metadata.js');
console.log('   - Testear AssistantService con nuevas secciones help');
console.log('   - Ejecutar: node scripts/sync-metadata-registry.js (cuando esté listo)');
