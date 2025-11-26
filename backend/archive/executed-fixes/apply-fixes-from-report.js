/**
 * APPLY FIXES FROM AUDIT REPORT
 *
 * Lee el último reporte de auditoría y aplica fixes automáticos
 * basándose en los errores detectados.
 */

const fs = require('fs').promises;
const path = require('path');

// ═══════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  reportPath: './audit-reports/2025-10-24_22-57-29/errors-by-severity.json',
  backupEnabled: true,
  dryRun: false // true = solo simula, false = aplica cambios reales
};

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🔧 AUTO-REPAIR FROM AUDIT REPORT                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Leer reporte
    const reportData = await fs.readFile(CONFIG.reportPath, 'utf8');
    const report = JSON.parse(reportData);

    const allErrors = [
      ...report.critical,
      ...report.high,
      ...report.medium,
      ...report.low
    ];

    console.log(`📋 Total de errores encontrados: ${allErrors.length}\n`);

    if (allErrors.length === 0) {
      console.log('✅ No hay errores para reparar\n');
      return;
    }

    // Agrupar errores por tipo
    const errorsByType = groupErrorsByType(allErrors);

    console.log('📊 ERRORES POR TIPO:\n');
    Object.entries(errorsByType).forEach(([type, errors]) => {
      console.log(`   ${type}: ${errors.length} errores`);
    });
    console.log('');

    // Aplicar fixes
    let fixed = 0;
    let failed = 0;
    let skipped = 0;

    // FIX 1: Naming conventions (funciones con guiones)
    if (errorsByType['naming_convention']) {
      console.log('\n🔧 Aplicando fixes de NAMING CONVENTIONS...\n');
      const result = await fixNamingConventions(errorsByType['naming_convention']);
      fixed += result.fixed;
      failed += result.failed;
      skipped += result.skipped;
    }

    // FIX 2: Missing modals
    if (errorsByType['missing_modal']) {
      console.log('\n🔧 Aplicando fixes de MISSING MODALS...\n');
      const result = await fixMissingModals(errorsByType['missing_modal']);
      fixed += result.fixed;
      failed += result.failed;
      skipped += result.skipped;
    }

    // FIX 3: HTTP 500 errors
    if (errorsByType['http_500']) {
      console.log('\n🔧 Aplicando fixes de HTTP 500...\n');
      const result = await fixHTTP500Errors(errorsByType['http_500']);
      fixed += result.fixed;
      failed += result.failed;
      skipped += result.skipped;
    }

    // Resumen final
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📊 RESUMEN DE REPARACIONES                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Reparados: ${fixed}`);
    console.log(`❌ Fallidos: ${failed}`);
    console.log(`⏭️  Omitidos: ${skipped}`);
    console.log(`📊 Total procesados: ${fixed + failed + skipped}\n`);

    if (CONFIG.dryRun) {
      console.log('🔍 [DRY RUN] NO se aplicaron cambios reales\n');
      console.log('Para aplicar cambios, edita el archivo y cambia dryRun: false\n');
    } else if (fixed > 0) {
      console.log('🔄 PRÓXIMO PASO: Re-ejecutar auditoría para verificar fixes\n');
      console.log('Ejecuta:');
      console.log('  PORT=9998 MAX_CYCLES=1 TARGET=100 COMPANY_ID=11 DEEP_TEST=true node run-iterative-audit.js\n');
    }

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════
// AGRUPAR ERRORES POR TIPO
// ═══════════════════════════════════════════════════════════

function groupErrorsByType(errors) {
  const groups = {
    naming_convention: [],
    missing_modal: [],
    http_500: [],
    empty_list: [],
    console_error: [],
    other: []
  };

  errors.forEach(error => {
    const errorMsg = error.error?.toLowerCase() || '';
    const contextErrors = error.context?.errors || [];

    // Detectar tipo de error
    if (errorMsg.includes('lista') && errorMsg.includes('no carga')) {
      groups.naming_convention.push(error);
    } else if (errorMsg.includes('botón') && errorMsg.includes('no funciona')) {
      groups.missing_modal.push(error);
    } else if (error.context?.http_errors?.length > 0) {
      const hasHttp500 = error.context.http_errors.some(e => e.status === 500);
      if (hasHttp500) {
        groups.http_500.push(error);
      }
    } else if (errorMsg.includes('no se encontraron filas')) {
      groups.empty_list.push(error);
    } else if (errorMsg.includes('errores críticos de consola')) {
      groups.console_error.push(error);
    } else {
      groups.other.push(error);
    }
  });

  return groups;
}

// ═══════════════════════════════════════════════════════════
// FIX 1: NAMING CONVENTIONS
// ═══════════════════════════════════════════════════════════

async function fixNamingConventions(errors) {
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  // Este fix requiere identificar qué módulos tienen funciones con guiones
  // Ejemplo: loadPayroll-liquidation() → loadPayrollLiquidation()

  console.log('   ℹ️  Este fix requiere análisis manual de los módulos JS');
  console.log('   ℹ️  Los errores de naming están en el frontend (panel-empresa.html)');
  console.log('   ℹ️  Se requiere refactorizar nombres de funciones\n');

  skipped = errors.length;

  return { fixed, failed, skipped };
}

// ═══════════════════════════════════════════════════════════
// FIX 2: MISSING MODALS
// ═══════════════════════════════════════════════════════════

async function fixMissingModals(errors) {
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  console.log('   ℹ️  Este fix requiere crear funciones de modales faltantes');
  console.log('   ℹ️  Ejemplo: openAddpayroll-liquidationModal()');
  console.log('   ℹ️  Se requiere agregar funciones en módulos JS\n');

  skipped = errors.length;

  return { fixed, failed, skipped };
}

// ═══════════════════════════════════════════════════════════
// FIX 3: HTTP 500 ERRORS
// ═══════════════════════════════════════════════════════════

async function fixHTTP500Errors(errors) {
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (const error of errors) {
    const httpErrors = error.context?.http_errors || [];

    for (const httpError of httpErrors) {
      if (httpError.status === 500) {
        console.log(`   🔍 HTTP 500: ${httpError.url}`);

        // Analizar qué endpoint falló
        if (httpError.url.includes('/api/audit/status')) {
          console.log('   ℹ️  Error en /api/audit/status');
          console.log('   💡 Fix sugerido: Verificar autenticación en auditorRoutes.js');
          skipped++;
        } else {
          console.log('   ℹ️  Error desconocido, requiere análisis manual');
          skipped++;
        }
      }
    }
  }

  return { fixed, failed, skipped };
}

// ═══════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════

main().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
