const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Script para ejecutar migración del Knowledge Base
 * Lee el archivo SQL y lo ejecuta contra la base de datos
 */

async function runMigration() {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`🗄️  EJECUTANDO MIGRACIÓN - Sistema Auto-Evolutivo`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  try {
    // 1. Conectar a la base de datos
    console.log(`🔗 Conectando a base de datos...`);

    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false, // Silenciar logs de Sequelize
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    // Verificar conexión
    await sequelize.authenticate();
    console.log(`✅ Conectado a PostgreSQL\n`);

    // 2. Leer archivo SQL
    const migrationPath = path.join(__dirname, 'migrations', '20251026_create_auditor_knowledge_base.sql');

    console.log(`📄 Leyendo migración: ${path.basename(migrationPath)}`);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // 3. Ejecutar migración
    console.log(`⚙️  Ejecutando migración...\n`);

    await sequelize.query(migrationSQL);

    console.log(`\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n`);

    // 4. Verificar tablas creadas
    console.log(`🔍 Verificando tablas creadas...`);

    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'auditor%'
      ORDER BY table_name
    `);

    console.log(`\n📊 Tablas del sistema de aprendizaje:`);
    tables.forEach(t => {
      console.log(`   ✓ ${t.table_name}`);
    });

    // 5. Verificar funciones creadas
    console.log(`\n🔍 Verificando funciones helper...`);

    const [functions] = await sequelize.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name LIKE 'get_%' OR routine_name LIKE 'update_%'
      ORDER BY routine_name
    `);

    console.log(`\n⚙️  Funciones SQL:`);
    functions.forEach(f => {
      console.log(`   ✓ ${f.routine_name}()`);
    });

    // 6. Verificar datos semilla
    console.log(`\n🔍 Verificando datos semilla...`);

    const [seedData] = await sequelize.query(`
      SELECT knowledge_type, key, confidence_score, occurrences
      FROM auditor_knowledge_base
      ORDER BY id
    `);

    if (seedData.length > 0) {
      console.log(`\n🌱 Datos semilla insertados:`);
      seedData.forEach(d => {
        console.log(`   ✓ ${d.knowledge_type}: ${d.key}`);
        console.log(`     - Confidence: ${d.confidence_score}, Occurrences: ${d.occurrences}`);
      });
    } else {
      console.log(`\n⚠️  No se encontraron datos semilla (esto es normal si la migración ya se ejecutó antes)`);
    }

    // 7. Cerrar conexión
    await sequelize.close();

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`✅ SISTEMA AUTO-EVOLUTIVO LISTO PARA USAR`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ ERROR ejecutando migración:`, error.message);

    if (error.message.includes('already exists')) {
      console.log(`\nℹ️  La migración ya fue ejecutada anteriormente.`);
      console.log(`   Las tablas ya existen en la base de datos.\n`);
      process.exit(0);
    } else {
      console.error(`\nStack trace:`, error.stack);
      process.exit(1);
    }
  }
}

runMigration();
