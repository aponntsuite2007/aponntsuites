/**
 * Script para verificar los módulos de la empresa ISI
 */

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

async function checkCompanyModules() {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔧 [CHECK] Conectando a PostgreSQL...');
    await client.connect();

    // Mostrar estructura de la tabla companies
    console.log('📋 [STRUCTURE] Columnas de la tabla companies:');
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `);

    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Buscar la empresa ISI (company_id 11)
    const companyResult = await client.query(`
      SELECT *
      FROM companies
      WHERE company_id = 11
    `);

    if (companyResult.rows.length === 0) {
      console.log('❌ [ERROR] Empresa con ID 11 no encontrada');
      return;
    }

    const company = companyResult.rows[0];
    console.log('🏢 [COMPANY] Empresa encontrada:');
    console.log(`   - ID: ${company.company_id}`);
    console.log(`   - Nombre: ${company.name}`);
    console.log(`   - Slug: ${company.slug}`);

    // Mostrar módulos
    console.log('\n📦 [MODULES] Módulos configurados:');

    if (company.modules) {
      const modules = Array.isArray(company.modules) ? company.modules : JSON.parse(company.modules || '[]');
      console.log(`   - Total módulos: ${modules.length}`);
      modules.forEach(module => {
        console.log(`   - ${module}`);
      });

      console.log(`\n🔍 [AUDITOR] ¿Tiene auditor-dashboard? ${modules.includes('auditor-dashboard')}`);
    } else {
      console.log('   - Sin módulos configurados');
    }

    if (company.active_modules) {
      const activeModules = Array.isArray(company.active_modules) ? company.active_modules : JSON.parse(company.active_modules || '[]');
      console.log(`\n✅ [ACTIVE] Módulos activos: ${activeModules.length}`);
      activeModules.forEach(module => {
        console.log(`   - ${module}`);
      });

      console.log(`\n🔍 [AUDITOR] ¿Activo auditor-dashboard? ${activeModules.includes('auditor-dashboard')}`);
    }

  } catch (error) {
    console.error('❌ [ERROR] Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔧 [CHECK] Conexión cerrada');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  checkCompanyModules()
    .then(() => {
      console.log('🎉 [COMPLETE] Verificación completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 [FATAL] Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { checkCompanyModules };