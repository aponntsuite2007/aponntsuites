/**
 * EJECUTAR MIGRACIÓN: SLA, Escalamiento y Asistente Dual
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 MIGRACIÓN: SLA + Escalamiento + Asistente Dual       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    await client.connect();
    console.log('✅ Conectado a PostgreSQL');
    console.log('');

    const migrationPath = path.join(__dirname, '..', 'migrations', '20251023_add_support_sla_escalation.sql');
    console.log(`📄 Leyendo: ${migrationPath}`);
    const sql = await fs.readFile(migrationPath, 'utf8');
    console.log('✅ Archivo leído');
    console.log('');

    console.log('⚙️  Ejecutando migración...');
    console.log('');
    console.log('   📋 Creando:');
    console.log('      • support_sla_plans (planes Standard/Pro/Premium)');
    console.log('      • support_vendor_supervisors (jerarquía)');
    console.log('      • support_escalations (log de escalamientos)');
    console.log('      • support_assistant_attempts (log asistente IA)');
    console.log('');
    console.log('   🔧 Modificando:');
    console.log('      • companies (agregar support_sla_plan_id)');
    console.log('      • support_tickets (agregar campos SLA)');
    console.log('');
    console.log('   🎯 Funciones:');
    console.log('      • calculate_sla_deadlines()');
    console.log('      • get_vendor_supervisor()');
    console.log('      • auto_escalate_tickets()');
    console.log('      • get_company_assistant_type()');
    console.log('');

    await client.query(sql);

    console.log('✅ Migración ejecutada exitosamente');
    console.log('');

    // Verificar planes creados
    const plansResult = await client.query('SELECT plan_name, display_name, price_monthly, has_ai_assistant FROM support_sla_plans ORDER BY price_monthly');

    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 PLANES DE SLA CREADOS:');
    console.log('');
    plansResult.rows.forEach(plan => {
      const aiIcon = plan.has_ai_assistant ? '🤖' : '📝';
      console.log(`   ${aiIcon} ${plan.display_name}`);
      console.log(`      Precio: $${plan.price_monthly}/mes`);
      console.log(`      Asistente IA: ${plan.has_ai_assistant ? 'Sí (Ollama)' : 'No (Fallback)'}`);
      console.log('');
    });

    // Verificar empresas con plan asignado
    const companiesResult = await client.query(`
      SELECT c.name, sp.plan_name
      FROM companies c
      INNER JOIN support_sla_plans sp ON c.support_sla_plan_id = sp.plan_id
      LIMIT 5
    `);

    console.log('════════════════════════════════════════════════════════════');
    console.log('🏢 EMPRESAS CON PLAN ASIGNADO (primeras 5):');
    console.log('');
    companiesResult.rows.forEach(row => {
      console.log(`   • ${row.name}: Plan ${row.plan_name}`);
    });
    console.log('');

    console.log('════════════════════════════════════════════════════════════');
    console.log('🎉 MIGRACIÓN COMPLETADA');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Sistema SLA activo');
    console.log('✅ Escalamiento automático configurado');
    console.log('✅ Asistente dual (fallback/IA) listo');
    console.log('✅ Todas las empresas tienen plan Standard asignado');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:');
    console.error(error.message);
    console.error('');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
