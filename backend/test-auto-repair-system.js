/**
 * TEST AUTO-REPAIR SYSTEM
 *
 * Ejecuta auditoría completa con sistema de auto-reparación activado
 */

const database = require('./src/config/database');
const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
const FrontendCollector = require('./src/auditor/collectors/FrontendCollector');
const AutoAuditTicketSystem = require('./src/auditor/core/AutoAuditTicketSystem');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🤖 TEST: SISTEMA DE AUTO-REPARACIÓN AUTÓNOMA           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // 1. Inicializar sistema
    console.log('📋 [1/5] Inicializando Auto Audit Ticket System...');
    await AutoAuditTicketSystem.init();
    console.log('✅ Sistema inicializado');
    console.log('');

    // 2. Login y obtener token
    console.log('🔐 [2/5] Obteniendo token de autenticación...');
    const axios = require('axios');
    const port = process.env.PORT || 9998;
    const loginResponse = await axios.post(`http://localhost:${port}/api/v1/auth/login`, {
      identifier: 'admin',
      password: 'admin123',
      companyId: 11
    });
    const authToken = loginResponse.data.token;
    console.log('✅ Token obtenido');
    console.log('');

    // 3. Preparar auditoría
    console.log('🎯 [3/5] Preparando auditoría frontend...');
    const registry = new SystemRegistry(database);
    const frontendCollector = new FrontendCollector(database, registry);

    const execution_id = `auto-repair-test-${Date.now()}`;
    const config = {
      company_id: 11,
      authToken: authToken,
      // Probar solo 3 módulos para la demo
      moduleFilter: null // null = todos los módulos
    };

    console.log(`   Execution ID: ${execution_id}`);
    console.log(`   Company ID: ${config.company_id}`);
    console.log('');

    // 4. Ejecutar auditoría (esto generará tickets automáticos si hay errores)
    console.log('🔍 [4/5] Ejecutando auditoría con Puppeteer...');
    console.log('   ⚠️  El navegador se abrirá en modo VISIBLE');
    console.log('   ⚠️  Podrás ver todo el proceso en tiempo real');
    console.log('');

    const results = await frontendCollector.collect(execution_id, config);

    console.log('');
    console.log('✅ [4/5] Auditoría completada');
    console.log(`   Total módulos testeados: ${results.length}`);
    console.log('');

    // 5. Ver tickets generados
    console.log('🎫 [5/5] Verificando tickets automáticos generados...');

    const { SupportTicketV2 } = database;
    const autoTickets = await SupportTicketV2.findAll({
      where: {
        ticket_number: {
          [database.sequelize.Sequelize.Op.like]: 'AUDIT-%'
        }
      },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE TICKETS AUTOMÁTICOS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    if (autoTickets.length === 0) {
      console.log('✨ ¡Excelente! No se generaron tickets automáticos.');
      console.log('   Esto significa que NO se detectaron errores en los módulos.');
      console.log('');
    } else {
      console.log(`🎫 Total tickets generados: ${autoTickets.length}`);
      console.log('');

      autoTickets.forEach((ticket, index) => {
        console.log(`${index + 1}. ${ticket.ticket_number}`);
        console.log(`   Subject: ${ticket.subject}`);
        console.log(`   Status: ${ticket.status}`);
        console.log(`   Created: ${ticket.created_at}`);
        console.log('');
      });

      console.log('───────────────────────────────────────────────────────────');
      console.log('📁 Archivos .repair.md generados en:');
      console.log('   backend/.claude-repairs/');
      console.log('');
      console.log('🤖 Próximos pasos:');
      console.log('   1. Lee los archivos .repair.md');
      console.log('   2. Aplica las reparaciones sugeridas');
      console.log('   3. El sistema re-testeará automáticamente');
      console.log('');
    }

    // 6. Estadísticas
    const stats = await AutoAuditTicketSystem.getStats(11);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 ESTADÍSTICAS DEL SISTEMA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`   Total tickets: ${stats.total}`);
    console.log(`   Resueltos: ${stats.resolved}`);
    console.log(`   No resueltos: ${stats.unresolved}`);
    console.log(`   En progreso: ${stats.in_progress}`);
    console.log(`   Tasa de éxito: ${stats.success_rate}%`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    console.log('✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR EN TEST:');
    console.error(error);
    console.error('');
    process.exit(1);
  }

  process.exit(0);
}

main();
