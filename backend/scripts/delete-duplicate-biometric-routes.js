/**
 * FASE 3: ELIMINAR ARCHIVOS BACKEND DUPLICADOS/HUÉRFANOS
 *
 * ELIMINAR (8 archivos):
 * - biometric-api.js (duplicado)
 * - biometric-hub.js (duplicado)
 * - biometric-management-routes.js (huérfano)
 * - biometricRoutes.js (huérfano)
 * - biometric_v2.js (huérfano)
 * - consentRoutes.js (duplicado simple)
 * - consentManagementRoutes.js (duplicado)
 * - real-biometric-api.js (duplicado - aunque tiene servicio)
 *
 * MANTENER:
 * - biometric-enterprise-routes.js (registro biométrico)
 * - biometricConsentRoutes.js (consentimientos)
 * - emotionalAnalysisRoutes.js (análisis)
 * - biometric-attendance-api.js (clock-in/out para apps)
 */

const fs = require('fs');
const path = require('path');

function deleteBackupAndRemove(filepath, filename) {
  if (fs.existsSync(filepath)) {
    // Crear backup
    const backupPath = filepath + '.backup';
    fs.copyFileSync(filepath, backupPath);
    console.log(`   📦 Backup creado: ${filename}.backup`);

    // Eliminar original
    fs.unlinkSync(filepath);
    console.log(`   ✅ Eliminado: ${filename}`);

    return true;
  } else {
    console.log(`   ⚠️  No existe: ${filename}`);
    return false;
  }
}

async function deleteDuplicateRoutes() {
  console.log('🗑️  ELIMINANDO RUTAS BACKEND DUPLICADAS\n');

  const routesDir = path.join(__dirname, '../src/routes');

  const ROUTES_TO_DELETE = [
    'biometric-api.js',
    'biometric-hub.js',
    'biometric-management-routes.js',
    'biometricRoutes.js',
    'biometric_v2.js',
    'consentRoutes.js',
    'consentManagementRoutes.js',
    'real-biometric-api.js'
  ];

  const ROUTES_TO_KEEP = [
    'biometric-enterprise-routes.js',
    'biometricConsentRoutes.js',
    'emotionalAnalysisRoutes.js',
    'biometric-attendance-api.js'
  ];

  let deletedCount = 0;

  console.log('📋 ARCHIVOS A ELIMINAR:\n');

  for (const filename of ROUTES_TO_DELETE) {
    const filepath = path.join(routesDir, filename);
    console.log(`🔍 ${filename}...`);

    if (deleteBackupAndRemove(filepath, filename)) {
      deletedCount++;
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`✅ ELIMINADOS: ${deletedCount} de ${ROUTES_TO_DELETE.length} archivos`);
  console.log('='.repeat(80));

  console.log('\n📁 ARCHIVOS MANTENIDOS:\n');

  for (const filename of ROUTES_TO_KEEP) {
    const filepath = path.join(routesDir, filename);

    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   ✅ ${filename} (${sizeKB} KB)`);
    } else {
      console.log(`   ⚠️  ${filename} (NO EXISTE - VERIFICAR)`);
    }
  }

  console.log('\n='.repeat(80));
  console.log('✅ ELIMINACIÓN DE ARCHIVOS COMPLETADA');
  console.log('='.repeat(80));
  console.log('\n📝 PRÓXIMO PASO:');
  console.log('   Limpiar server.js para quitar registro de rutas eliminadas\n');

  process.exit(0);
}

deleteDuplicateRoutes();
