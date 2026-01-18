/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEST MODULE FULL AUDIT - Auditoría Completa de Módulo
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Script ejecutable que realiza auditoría completa de un módulo:
 * 1. ✅ Inventario de TODOS los elementos UI (por tab)
 * 2. ✅ Mapeo de campos a PostgreSQL (SSOT)
 * 3. ✅ Verificación Multi-Tenant (company_id)
 * 4. ✅ Generación de metadata para Brain
 * 5. ✅ Tests de rendimiento
 *
 * USO:
 *   node scripts/test-module-full-audit.js [moduleKey]
 *
 * EJEMPLOS:
 *   node scripts/test-module-full-audit.js users
 *   node scripts/test-module-full-audit.js attendance
 *   node scripts/test-module-full-audit.js medical
 *
 * @version 1.0.0
 * @date 2026-01-16
 * ═══════════════════════════════════════════════════════════════════════════
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const ModuleAuditor = require('../src/testing/ModuleAuditor');
const fs = require('fs').promises;
const path = require('path');

// Módulo por defecto o desde argumentos
const moduleKey = process.argv[2] || 'users';

// Configuración de login
const loginConfig = {
  empresa: 'isi',
  usuario: 'admin',
  password: 'admin123'
};

async function runFullAudit() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔍 SISTEMA DE AUDITORÍA COMPLETA DE MÓDULOS');
  console.log('═'.repeat(80));
  console.log(`\n📦 Módulo seleccionado: ${moduleKey}`);
  console.log(`📅 Fecha: ${new Date().toISOString()}\n`);

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 120000,
    learningMode: false,
    brainIntegration: false
  });

  let auditResults = null;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // FASE 1: INICIALIZACIÓN Y LOGIN
    // ═══════════════════════════════════════════════════════════════════════
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ FASE 1: INICIALIZACIÓN                                      │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    console.log('📦 Inicializando AutonomousQAAgent...');
    await agent.init();
    console.log('   ✅ Agent inicializado\n');

    console.log('🔐 Haciendo login...');
    await agent.login(loginConfig);
    console.log('   ✅ Login exitoso\n');

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 2: NAVEGACIÓN AL MÓDULO
    // ═══════════════════════════════════════════════════════════════════════
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ FASE 2: NAVEGACIÓN AL MÓDULO                                │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    console.log(`🧭 Navegando a módulo: ${moduleKey}...`);
    await agent.navigateToModule(moduleKey);
    console.log(`   ✅ En módulo ${moduleKey}\n`);

    // Para módulo users, abrir employeeFileModal
    if (moduleKey === 'users') {
      console.log('👤 Módulo Users detectado - Abriendo employeeFileModal...\n');

      const modalOpened = await openEmployeeFileModal(agent);
      if (!modalOpened) {
        throw new Error('No se pudo abrir employeeFileModal');
      }
      console.log('   ✅ employeeFileModal abierto\n');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 3: AUDITORÍA COMPLETA
    // ═══════════════════════════════════════════════════════════════════════
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ FASE 3: EJECUTANDO AUDITORÍA COMPLETA                       │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    const auditor = new ModuleAuditor({
      agent: agent,
      moduleKey: moduleKey
    });

    // Opciones: skipCRUD=false para ejecutar tests CRUD reales
    const skipCRUD = process.argv.includes('--skip-crud');
    auditResults = await auditor.runFullAudit({ skipCRUD });

    // ═══════════════════════════════════════════════════════════════════════
    // FASE 4: GUARDAR RESULTADOS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│ FASE 4: GUARDANDO RESULTADOS                                │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    // Guardar resultados completos
    const resultsDir = path.join(__dirname, '..', 'audit-results');
    await fs.mkdir(resultsDir, { recursive: true });

    const resultsFile = path.join(resultsDir, `${moduleKey}-full-audit-${Date.now()}.json`);
    await fs.writeFile(resultsFile, JSON.stringify(auditResults, null, 2));
    console.log(`   ✅ Resultados guardados en: ${resultsFile}\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════════════════
    printFinalSummary(auditResults);

  } catch (error) {
    console.error('\n❌ Error en auditoría:', error.message);
    console.error(error.stack);

    auditResults = {
      success: false,
      moduleKey: moduleKey,
      error: error.message,
      errorStack: error.stack
    };
  } finally {
    // Cerrar browser
    try {
      await agent.close();
      console.log('\n🧹 Browser cerrado correctamente');
    } catch (e) {
      // Ignorar errores de cleanup
    }
  }

  return auditResults;
}

/**
 * Abrir employeeFileModal para auditar sus tabs
 */
async function openEmployeeFileModal(agent) {
  const page = agent.page;

  // Estrategia 1: Botón con clase específica
  const buttonFound = await page.evaluate(() => {
    // Buscar por clase users-action-btn view
    const viewBtn = document.querySelector('button.users-action-btn.view');
    if (viewBtn) {
      viewBtn.click();
      return { success: true, method: 'class-selector' };
    }

    // Buscar por onclick viewUser
    const buttons = Array.from(document.querySelectorAll('button'));
    const verUsuarioBtn = buttons.find(btn =>
      btn.getAttribute('onclick')?.includes('viewUser')
    );

    if (verUsuarioBtn) {
      verUsuarioBtn.click();
      return { success: true, method: 'onclick-viewUser' };
    }

    // Buscar icono de ojo
    const eyeIcon = document.querySelector('button i.fa-eye');
    if (eyeIcon && eyeIcon.closest('button')) {
      eyeIcon.closest('button').click();
      return { success: true, method: 'eye-icon' };
    }

    return { success: false };
  });

  if (!buttonFound.success) {
    // Fallback: abrir programáticamente
    const modalOpened = await page.evaluate(() => {
      if (typeof viewUser === 'function') {
        const firstRow = document.querySelector('.users-table tbody tr');
        if (firstRow) {
          const viewButton = firstRow.querySelector('button[onclick*="viewUser"]');
          if (viewButton) {
            const onclickAttr = viewButton.getAttribute('onclick');
            const userIdMatch = onclickAttr.match(/viewUser\('([^']+)'\)/);
            if (userIdMatch) {
              viewUser(userIdMatch[1]);
              return true;
            }
          }
        }
      }
      return false;
    });

    if (!modalOpened) return false;
  }

  // Esperar a que se abra el modal
  await page.waitForTimeout(2000);

  const modalOpen = await page.$('#employeeFileModal');
  return !!modalOpen;
}

/**
 * Imprimir resumen final
 */
function printFinalSummary(auditResults) {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RESUMEN FINAL DE AUDITORÍA');
  console.log('═'.repeat(80));

  if (!auditResults || !auditResults.success) {
    console.log('\n❌ AUDITORÍA FALLIDA');
    console.log(`   Error: ${auditResults?.error || 'Desconocido'}`);
    return;
  }

  const results = auditResults.results;

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│ MÓDULO: ${auditResults.moduleKey.toUpperCase().padEnd(50)}│
│ TIEMPO: ${(auditResults.totalTime + 'ms').padEnd(50)}│
└─────────────────────────────────────────────────────────────┘

📋 INVENTARIO UI
   ├── Tabs:       ${results.ui.tabs.length}
   ├── Inputs:     ${results.ui.inputs.length}
   ├── Selects:    ${results.ui.selects.length}
   ├── Textareas:  ${results.ui.textareas.length}
   ├── Buttons:    ${results.ui.buttons.length}
   ├── Labels:     ${results.ui.labels.length}
   ├── Tables:     ${results.ui.tables.length}
   ├── Modals:     ${results.ui.modals.length}
   └── TOTAL:      ${results.ui.totalElements} elementos

🗄️  MAPEO A BASE DE DATOS (SSOT)
   ├── Campos mapeados: ${results.dbMapping.fields.length}
   ├── Tablas relacionadas: ${results.dbMapping.tables.length}
   └── Verificados: ${results.brainMetadata?.ssot?.verifiedFields || 0}/${results.brainMetadata?.ssot?.totalFields || 0}

🏢 MULTI-TENANT
   ├── Verificado: ${results.multiTenant.verified ? '✅ SÍ' : '❌ NO'}
   ├── Endpoints analizados: ${results.multiTenant.endpoints.length}
   └── Issues encontrados: ${results.multiTenant.issues.length}

⚡ RENDIMIENTO
   ├── Page Load: ${results.performance.pageLoad || 'N/A'}ms
   ├── Avg API Response: ${results.performance.avgResponseTime}ms
   ├── Slow Endpoints (>1s): ${results.performance.slowEndpoints.length}
   └── Tabs testeados: ${results.performance.apiCalls.length}

🧠 BRAIN METADATA
   └── ${results.brainMetadata ? '✅ Generada y guardada' : '❌ No generada'}
`);

  // Status final
  const uiOk = results.ui.totalElements > 10;
  const ssotOk = results.dbMapping.fields.length > 5;
  const multiTenantOk = results.multiTenant.verified;
  const perfOk = results.performance.avgResponseTime < 2000;

  const allOk = uiOk && ssotOk && multiTenantOk && perfOk;

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ STATUS FINAL: ${allOk ? '✅ AUDITORÍA COMPLETADA' : '⚠️  REVISAR ISSUES'}`.padEnd(61) + '│');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│ UI Inventory:      ${uiOk ? '✅ PASS' : '❌ FAIL'}`.padEnd(61) + '│');
  console.log(`│ SSOT Mapping:      ${ssotOk ? '✅ PASS' : '❌ FAIL'}`.padEnd(61) + '│');
  console.log(`│ Multi-Tenant:      ${multiTenantOk ? '✅ PASS' : '❌ FAIL'}`.padEnd(61) + '│');
  console.log(`│ Performance:       ${perfOk ? '✅ PASS' : '⚠️  SLOW'}`.padEnd(61) + '│');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // Si hay issues de multi-tenant, mostrarlos
  if (results.multiTenant.issues.length > 0) {
    console.log('⚠️  ISSUES DE MULTI-TENANT:');
    results.multiTenant.issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue.file || issue.endpoint}: ${issue.issue}`);
    });
    console.log('');
  }

  // Si hay endpoints lentos, mostrarlos
  if (results.performance.slowEndpoints.length > 0) {
    console.log('⚠️  ENDPOINTS LENTOS (>1s):');
    results.performance.slowEndpoints.forEach((ep, i) => {
      console.log(`   ${i + 1}. ${ep.url}: ${ep.time}ms`);
    });
    console.log('');
  }
}

// Ejecutar
runFullAudit()
  .then(results => {
    if (results && results.success) {
      console.log('✅ Auditoría completada exitosamente');
      process.exit(0);
    } else {
      console.log('❌ Auditoría con errores');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
