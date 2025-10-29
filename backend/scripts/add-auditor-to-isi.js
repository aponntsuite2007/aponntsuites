/**
 * Script para agregar el módulo auditor-dashboard a la empresa ISI
 */

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

async function addAuditorToISI() {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔧 [UPDATE] Conectando a PostgreSQL...');
    await client.connect();

    // Obtener módulos actuales de la empresa ISI
    const currentResult = await client.query(`
      SELECT active_modules
      FROM companies
      WHERE company_id = 11
    `);

    if (currentResult.rows.length === 0) {
      console.log('❌ [ERROR] Empresa con ID 11 no encontrada');
      return;
    }

    let currentModules = currentResult.rows[0].active_modules || [];
    console.log('📦 [CURRENT] Módulos actuales:', currentModules);

    // Asegurar que tenemos un array
    if (!Array.isArray(currentModules)) {
      if (typeof currentModules === 'object') {
        currentModules = Object.keys(currentModules).length === 0 ? [] : [currentModules];
      } else {
        currentModules = [];
      }
    }

    // Agregar auditor-dashboard si no está presente
    if (!currentModules.includes('auditor-dashboard')) {
      currentModules.push('auditor-dashboard');
      console.log('➕ [ADD] Agregando auditor-dashboard');
    } else {
      console.log('✅ [EXISTS] auditor-dashboard ya está presente');
      return;
    }

    // También agregar otros módulos esenciales si no están
    const essentialModules = [
      'dashboard',
      'users',
      'attendance',
      'departments',
      'settings'
    ];

    essentialModules.forEach(module => {
      if (!currentModules.includes(module)) {
        currentModules.push(module);
        console.log(`➕ [ADD] Agregando módulo esencial: ${module}`);
      }
    });

    // Actualizar la empresa
    await client.query(`
      UPDATE companies
      SET active_modules = $1,
          updated_at = NOW()
      WHERE company_id = 11
    `, [JSON.stringify(currentModules)]);

    console.log('✅ [SUCCESS] Empresa ISI actualizada exitosamente');
    console.log('📦 [NEW] Módulos después de la actualización:', currentModules);
    console.log(`📊 [TOTAL] Total de módulos: ${currentModules.length}`);

  } catch (error) {
    console.error('❌ [ERROR] Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔧 [UPDATE] Conexión cerrada');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  addAuditorToISI()
    .then(() => {
      console.log('🎉 [COMPLETE] Actualización completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 [FATAL] Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { addAuditorToISI };