/**
 * 🚀 TEST MEGA-UPGRADE: Detección Masiva de Errores + WebSocket en Tiempo Real
 *
 * Este script ejecuta 1 ciclo de auditoría con:
 * ✅ 100+ tipos de errores detectados
 * ✅ Listener de 60s post-login (errores dinámicos)
 * ✅ Notificaciones WebSocket en tiempo real al dashboard
 * ✅ Clasificación por categoría y severidad
 * ✅ Auto-fix detection
 */

const { execSync } = require('child_process');

console.log(`
═══════════════════════════════════════════════════════════════
🚀 MEGA-UPGRADE TEST - Detección Masiva + WebSocket Real-Time
═══════════════════════════════════════════════════════════════
`);

console.log(`📋 Configuración del test:`);
console.log(`  • Ciclos: 1 (prueba rápida)`);
console.log(`  • Company ID: 11`);
console.log(`  • Detección: 100+ tipos de errores`);
console.log(`  • Post-login listener: 60 segundos`);
console.log(`  • WebSocket: Notificaciones en tiempo real`);
console.log(`  • Dashboard: http://localhost:9998/panel-empresa.html`);
console.log(``);

console.log(`⏳ Iniciando test en 3 segundos...`);
console.log(`   💡 TIP: Abre el dashboard y ve al módulo "Auditor" para ver errores en tiempo real`);
console.log(``);

setTimeout(() => {
  console.log(`🚀 [MEGA-UPGRADE] Lanzando auditoría...`);
  console.log(``);

  try {
    // Ejecutar auditoría con run-iterative-audit.js
    execSync(
      `cd C:\\Bio\\sistema_asistencia_biometrico\\backend && PORT=9998 MAX_CYCLES=1 TARGET=100 COMPANY_ID=11 DEEP_TEST=true node run-iterative-audit.js`,
      {
        stdio: 'inherit', // Mostrar output en tiempo real
        env: {
          ...process.env,
          PORT: '9998',
          MAX_CYCLES: '1',
          TARGET: '100',
          COMPANY_ID: '11',
          DEEP_TEST: 'true'
        }
      }
    );

    console.log(``);
    console.log(`✅ [MEGA-UPGRADE] Test completado!`);
    console.log(``);
    console.log(`📊 Ver resultados:`);
    console.log(`   1. Abre http://localhost:9998/panel-empresa.html`);
    console.log(`   2. Login con: soporte / admin123`);
    console.log(`   3. Ve al módulo "Auditor Dashboard"`);
    console.log(`   4. Revisa la sección "🚨 Detección de Errores en Tiempo Real"`);
    console.log(``);

  } catch (error) {
    console.error(`❌ [MEGA-UPGRADE] Error ejecutando test:`, error.message);
    process.exit(1);
  }

}, 3000);
