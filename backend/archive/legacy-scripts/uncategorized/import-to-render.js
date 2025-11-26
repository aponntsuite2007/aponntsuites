/**
 * Script para importar datos a PostgreSQL de Render
 * Usa DATABASE_URL para conectar a producción
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');

async function importData() {
  try {
    // Obtener nombre del archivo
    const filename = process.argv[2];

    if (!filename) {
      console.error('❌ ERROR: Debes especificar el archivo SQL');
      console.log('');
      console.log('Uso:');
      console.log('  node import-to-render.js migration-data-XXXXX.sql');
      console.log('');
      process.exit(1);
    }

    if (!fs.existsSync(filename)) {
      console.error(`❌ ERROR: Archivo ${filename} no encontrado`);
      process.exit(1);
    }

    // Leer DATABASE_URL de Render
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
      console.error('❌ ERROR: DATABASE_URL no está configurado');
      console.log('');
      console.log('Solución:');
      console.log('1. Ve a Render Dashboard → PostgreSQL service');
      console.log('2. Copia "External Database URL"');
      console.log('3. Ejecuta:');
      console.log('   DATABASE_URL="postgresql://..." node import-to-render.js ' + filename);
      console.log('');
      process.exit(1);
    }

    console.log('🔄 Conectando a PostgreSQL de Render...');
    console.log(`   Host: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}`);

    const sequelize = new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Conectado a Render PostgreSQL');
    console.log('');

    // Leer archivo SQL
    console.log(`📖 Leyendo ${filename}...`);
    const sqlContent = fs.readFileSync(filename, 'utf-8');

    // Separar por statements (cada línea INSERT)
    const statements = sqlContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('--'))
      .filter(line => line.includes('INSERT') || line.includes('SELECT setval'));

    console.log(`   ${statements.length} operaciones a ejecutar`);
    console.log('');

    // Ejecutar cada statement
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log('🚀 Importando datos...');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await sequelize.query(statement);
        successCount++;

        // Mostrar progreso cada 10 registros
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`   Procesados: ${i + 1}/${statements.length}\r`);
        }
      } catch (error) {
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          skipCount++;
        } else {
          errorCount++;
          console.error(`\n⚠️  Error en línea ${i + 1}:`, error.message);
        }
      }
    }

    console.log('');
    console.log('');
    console.log('✅ IMPORTACIÓN COMPLETADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Resumen:`);
    console.log(`   ✅ Insertados: ${successCount}`);
    console.log(`   ⏭️  Omitidos (ya existen): ${skipCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log('');

    // Verificar datos importados
    console.log('🔍 Verificando datos en Render...');

    const [companies] = await sequelize.query('SELECT COUNT(*) as count FROM companies');
    const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    const [departments] = await sequelize.query('SELECT COUNT(*) as count FROM departments');
    const [shifts] = await sequelize.query('SELECT COUNT(*) as count FROM shifts');
    const [kiosks] = await sequelize.query('SELECT COUNT(*) as count FROM kiosks');

    console.log(`   📋 Empresas: ${companies[0].count}`);
    console.log(`   👥 Usuarios: ${users[0].count}`);
    console.log(`   🏢 Departamentos: ${departments[0].count}`);
    console.log(`   ⏰ Turnos: ${shifts[0].count}`);
    console.log(`   🖥️  Kiosks: ${kiosks[0].count}`);
    console.log('');

    console.log('✅ MIGRACIÓN EXITOSA');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Abre https://aponntsuites.onrender.com/panel-administrativo.html');
    console.log('   2. Verifica que las empresas aparezcan en el dropdown');
    console.log('   3. Prueba hacer login con tus usuarios reales');
    console.log('');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

importData();
