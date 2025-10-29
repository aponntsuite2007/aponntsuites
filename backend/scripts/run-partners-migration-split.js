/**
 * SCRIPT: Ejecutar migración del Sistema de Partners (4 PARTES)
 *
 * Ejecuta las 4 migraciones SQL en orden para evitar errores de foreign keys
 *
 * Uso:
 *   node scripts/run-partners-migration-split.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runPartnersMigrationSplit() {
  console.log('🚀 [PARTNERS MIGRATION SPLIT] Iniciando migración del Sistema de Partners...\n');

  // Conectar a la base de datos
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Drop existing tables if they exist (reverse order due to foreign keys)
    console.log('🗑️  Eliminando tablas existentes (si existen)...\n');
    const dropTablesSQL = `
      DROP TABLE IF EXISTS partner_commissions_log CASCADE;
      DROP TABLE IF EXISTS partner_legal_consents CASCADE;
      DROP TABLE IF EXISTS partner_mediation_cases CASCADE;
      DROP TABLE IF EXISTS partner_service_conversations CASCADE;
      DROP TABLE IF EXISTS partner_reviews CASCADE;
      DROP TABLE IF EXISTS partner_availability CASCADE;
      DROP TABLE IF EXISTS partner_service_requests CASCADE;
      DROP TABLE IF EXISTS partner_notifications CASCADE;
      DROP TABLE IF EXISTS partner_documents CASCADE;
      DROP TABLE IF EXISTS partners CASCADE;
      DROP TABLE IF EXISTS partner_roles CASCADE;
    `;
    await client.query(dropTablesSQL);
    console.log('✅ Tablas eliminadas correctamente\n');

    // Ejecutar las 4 partes EN ORDEN
    const migrationParts = [
      {
        name: 'PARTE 1 - Tablas Base',
        file: '20251024_partners_part1_base_tables.sql',
        description: 'partner_roles, partners'
      },
      {
        name: 'PARTE 2 - Tablas Dependientes',
        file: '20251024_partners_part2_dependent_tables.sql',
        description: 'documents, notifications, availability, service_requests'
      },
      {
        name: 'PARTE 3 - Tablas de Interacción',
        file: '20251024_partners_part3_interaction_tables.sql',
        description: 'reviews, conversations'
      },
      {
        name: 'PARTE 4 - Tablas Finales y Triggers',
        file: '20251024_partners_part4_final_and_triggers.sql',
        description: 'mediation, consents, commissions + 5 triggers'
      }
    ];

    for (const part of migrationParts) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 ${part.name}`);
      console.log(`   Archivo: ${part.file}`);
      console.log(`   Contenido: ${part.description}`);
      console.log(`${'='.repeat(60)}\n`);

      const migrationPath = path.join(__dirname, '..', 'migrations', part.file);

      if (!fs.existsSync(migrationPath)) {
        console.error(`❌ ERROR: Archivo no encontrado: ${migrationPath}`);
        process.exit(1);
      }

      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      console.log(`   Tamaño: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
      console.log(`   Ejecutando...`);

      const startTime = Date.now();

      try {
        await client.query(migrationSQL);

        const duration = Date.now() - startTime;
        console.log(`   ✅ ${part.name} completada (${duration}ms)\n`);
      } catch (partError) {
        console.error(`\n❌ ERROR en ${part.name}:`);
        console.error(`   Mensaje: ${partError.message}`);
        console.error(`   Stack: ${partError.stack?.substring(0, 500)}`);
        throw partError; // Re-throw para ser capturado por el catch principal
      }
    }

    console.log('\n✅ TODAS LAS MIGRACIONES EJECUTADAS EXITOSAMENTE!\n');

    // Verificar que las tablas se crearon
    console.log('🔍 Verificando tablas creadas...\n');

    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'partner%'
      ORDER BY table_name;
    `;

    const result = await client.query(verifyQuery);

    console.log('📊 Tablas de Partners creadas:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    console.log(`\n✅ Total: ${result.rows.length} tablas\n`);

    // Verificar datos iniciales insertados
    const rolesQuery = 'SELECT COUNT(*) as count FROM partner_roles';
    const rolesResult = await client.query(rolesQuery);
    console.log(`✅ Roles de Partners insertados: ${rolesResult.rows[0].count}\n`);

    // Verificar triggers
    const triggersQuery = `
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%partner%'
      ORDER BY trigger_name;
    `;
    const triggersResult = await client.query(triggersQuery);

    if (triggersResult.rows.length > 0) {
      console.log('🔧 Triggers instalados:');
      triggersResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.trigger_name} → ${row.event_object_table}`);
      });
      console.log(`\n✅ Total: ${triggersResult.rows.length} triggers\n`);
    }

    console.log('🎉 Sistema de Partners instalado correctamente!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Crear modelos Sequelize (Partner, PartnerRole, etc.)');
    console.log('   2. Crear API REST (/api/partners)');
    console.log('   3. Crear formulario de registro público');
    console.log('   4. Implementar sistema de firma digital');
    console.log('   5. Crear sección admin en panel-administrativo.html');
    console.log('   6. Crear marketplace en panel-empresa.html\n');

  } catch (error) {
    console.error('\n❌ ERROR EJECUTANDO MIGRACIÓN:');
    console.error(`   Mensaje: ${error.message}`);
    console.error(`\n   Stack completo:`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runPartnersMigrationSplit()
    .then(() => {
      console.log('✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { runPartnersMigrationSplit };
