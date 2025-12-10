/**
 * Script para aplicar el esquema SQL completo (exportado por pg_dump) a Render
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// BASE DE PRODUCCIÓN (tiene empresa DEMO) - URL COMPLETA
const RENDER_DB_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com/aponnt_db';

async function applySchemaToRender() {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando a Render PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión establecida\n');

    const schemaPath = path.join(__dirname, '..', 'migrations', 'LOCAL_SCHEMA_FULL.sql');
    console.log(`📄 Leyendo esquema de: ${schemaPath}\n`);

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log(`📊 Tamaño del archivo: ${(schemaSql.length / 1024).toFixed(2)} KB\n`);
    console.log('🚀 Aplicando esquema completo a Render...\n');
    console.log('⏳ Esto puede tardar 2-3 minutos...\n');

    // Dividir en statements individuales y ejecutar uno por uno
    const statements = schemaSql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SET'));

    console.log(`📄 Total statements a ejecutar: ${statements.length}\n`);

    let executed = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await client.query(statement + ';');

        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE (\w+)/i)?.[1];
          console.log(`   ✅ [${i + 1}/${statements.length}] Tabla creada: ${tableName}`);
        } else if (statement.includes('CREATE SEQUENCE')) {
          const seqName = statement.match(/CREATE SEQUENCE (\w+)/i)?.[1];
          console.log(`   ✅ [${i + 1}/${statements.length}] Sequence creada: ${seqName}`);
        }
        executed++;
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('ya existe')) {
          skipped++;
        } else {
          const preview = statement.substring(0, 100).replace(/\n/g, ' ');
          console.log(`   ⚠️  [${i + 1}/${statements.length}] Error: ${error.message.substring(0, 60)}`);
          errors++;
        }
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Ejecutados: ${executed}`);
    console.log(`   ⏭️  Saltados (ya existían): ${skipped}`);
    console.log(`   ⚠️  Errores (continuando): ${errors}`);

    // Verificar tablas creadas
    console.log('📊 Verificando tablas en Render:\n');
    const result = await client.query(`
      SELECT COUNT(*) as total
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    console.log(`   Total tablas en Render: ${result.rows[0].total}`);
    console.log('\n🎉 SINCRONIZACIÓN COMPLETA');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

applySchemaToRender();
