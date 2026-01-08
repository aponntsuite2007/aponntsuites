/**
 * Script para integrar automáticamente las clases de notificaciones
 * en los archivos de rutas correspondientes
 */

const fs = require('fs');
const path = require('path');

// Mapeo de módulos a archivos de rutas y clases de notificación
const MODULE_INTEGRATIONS = {
  payroll: {
    routeFile: 'backend/src/routes/payrollRoutes.js',
    notificationClass: 'PayrollNotifications',
    importPath: '../services/integrations/payroll-notifications'
  },
  staff: {
    routeFile: 'backend/src/routes/staffCommissionsRoutes.js',
    notificationClass: 'StaffNotifications',
    importPath: '../services/integrations/staff-notifications'
  },
  suppliers: {
    routeFile: 'backend/src/routes/supplierPortalRoutes.js',
    notificationClass: 'SuppliersNotifications',
    importPath: '../services/integrations/suppliers-notifications'
  },
  training: {
    routeFile: 'backend/src/routes/trainingRoutes.js',
    notificationClass: 'TrainingNotifications',
    importPath: '../services/integrations/training-notifications'
  },
  documents: {
    routeFile: 'backend/src/routes/documentRoutes.js',
    notificationClass: 'DocumentsNotifications',
    importPath: '../services/integrations/documents-notifications'
  },
  procedures: {
    routeFile: 'backend/src/routes/proceduresRoutes.js',
    notificationClass: 'ProceduresNotifications',
    importPath: '../services/integrations/procedures-notifications'
  },
  onboarding: {
    routeFile: 'backend/src/routes/onboardingRoutes.js',
    notificationClass: 'OnboardingNotifications',
    importPath: '../services/integrations/onboarding-notifications'
  },
  engineering: {
    routeFile: 'backend/src/routes/engineeringRoutes.js',
    notificationClass: 'EngineeringNotifications',
    importPath: '../services/integrations/engineering-notifications'
  },
  security: {
    routeFile: 'backend/src/routes/military-security-api.js',
    notificationClass: 'SecurityNotifications',
    importPath: '../services/integrations/security-notifications'
  }
};

function integrateNotifications() {
  console.log('🔧 INTEGRADOR AUTOMÁTICO DE NOTIFICACIONES EN RUTAS\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const [module, config] of Object.entries(MODULE_INTEGRATIONS)) {
    console.log(`\n📦 Procesando módulo: ${module.toUpperCase()}`);
    console.log('─'.repeat(60));

    const routePath = path.join(__dirname, '..', '..', config.routeFile);

    // Verificar si el archivo de rutas existe
    if (!fs.existsSync(routePath)) {
      console.log(`  ⚠️  Archivo no encontrado: ${config.routeFile}`);
      skipCount++;
      continue;
    }

    try {
      // Leer contenido actual
      let content = fs.readFileSync(routePath, 'utf8');

      // Verificar si ya está integrado
      if (content.includes(config.notificationClass)) {
        console.log(`  ✅ Ya integrado: ${config.notificationClass}`);
        successCount++;
        continue;
      }

      // Buscar la primera línea de require (para insertar después)
      const requireRegex = /^const\s+.*\s*=\s*require\(['"]/m;
      const match = content.match(requireRegex);

      if (!match) {
        console.log(`  ⚠️  No se encontró ningún require() para insertar el import`);
        skipCount++;
        continue;
      }

      // Encontrar la posición después del último require
      const lines = content.split('\n');
      let lastRequireIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^const\s+.*\s*=\s*require\(['"]/)) {
          lastRequireIndex = i;
        }
        // Si encontramos una línea vacía después de requires, insertamos ahí
        if (lastRequireIndex >= 0 && lines[i].trim() === '') {
          break;
        }
      }

      if (lastRequireIndex === -1) {
        console.log(`  ⚠️  No se pudo determinar dónde insertar el import`);
        skipCount++;
        continue;
      }

      // Agregar el import después del último require
      const importLine = `\n// Integración NCE - Notificaciones\nconst ${config.notificationClass} = require('${config.importPath}');`;
      lines.splice(lastRequireIndex + 1, 0, importLine);

      // Escribir el archivo modificado
      const newContent = lines.join('\n');
      fs.writeFileSync(routePath, newContent);

      console.log(`  ✅ Import agregado: ${config.notificationClass}`);
      console.log(`  📝 Archivo actualizado: ${config.routeFile}`);
      successCount++;

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n\n✅ INTEGRACIÓN COMPLETADA`);
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ⏭️  Saltados: ${skipCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log(`\n⚠️  SIGUIENTE PASO: Usar las clases de notificación en los endpoints apropiados`);
  console.log(`\nEjemplo de uso:`);
  console.log(`  await PayrollNotifications.notifyLiquidationGenerated({`);
  console.log(`    companyId: company.id,`);
  console.log(`    recipientId: employee.user_id,`);
  console.log(`    data: { ... }`);
  console.log(`  });`);
}

integrateNotifications();
