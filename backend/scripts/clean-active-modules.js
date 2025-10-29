/**
 * Script para limpiar datos corruptos en active_modules
 * Elimina elementos [object Object] y otros datos no válidos
 */

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

async function cleanActiveModules() {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔧 [CLEANUP] Conectando a PostgreSQL...');
    await client.connect();

    // Obtener todas las empresas con active_modules
    console.log('📋 [CLEANUP] Obteniendo empresas con active_modules...');
    const companiesResult = await client.query(`
      SELECT company_id, name, active_modules
      FROM companies
      WHERE active_modules IS NOT NULL
      ORDER BY company_id
    `);

    console.log(`🏢 [CLEANUP] Encontradas ${companiesResult.rows.length} empresas con active_modules`);

    for (const company of companiesResult.rows) {
      console.log(`\n🔍 [EMPRESA ${company.company_id}] ${company.name}`);
      console.log(`   Original:`, company.active_modules);

      let activeModules = company.active_modules;

      // Si es array
      if (Array.isArray(activeModules)) {
        const originalLength = activeModules.length;
        console.log(`   Tipo: Array con ${originalLength} elementos`);

        // Filtrar solo strings válidos
        const cleanModules = activeModules.filter(module => {
          if (typeof module !== 'string') {
            console.log(`   ❌ Eliminando elemento no-string:`, module);
            return false;
          }
          if (module.trim() === '') {
            console.log(`   ❌ Eliminando string vacío`);
            return false;
          }
          if (module === '[object Object]') {
            console.log(`   ❌ Eliminando [object Object] corrupto`);
            return false;
          }
          return true;
        });

        if (originalLength !== cleanModules.length) {
          console.log(`   🧹 Limpieza necesaria: ${originalLength} → ${cleanModules.length}`);
          console.log(`   Módulos limpios:`, cleanModules);

          // Actualizar en la base de datos
          await client.query(`
            UPDATE companies
            SET active_modules = $1, updated_at = NOW()
            WHERE company_id = $2
          `, [JSON.stringify(cleanModules), company.company_id]);

          console.log(`   ✅ Base de datos actualizada`);
        } else {
          console.log(`   ✨ Sin corrupción detectada`);
        }
      } else {
        console.log(`   Tipo: ${typeof activeModules} (no es array)`);
        if (typeof activeModules === 'object' && activeModules !== null) {
          // Convertir objeto a array vacío
          console.log(`   🔄 Convirtiendo objeto a array vacío`);
          await client.query(`
            UPDATE companies
            SET active_modules = $1, updated_at = NOW()
            WHERE company_id = $2
          `, [JSON.stringify([]), company.company_id]);
          console.log(`   ✅ Base de datos actualizada`);
        }
      }
    }

    console.log('\n🎉 [CLEANUP] Limpieza completada');
    console.log('\n📊 [RESUMEN] Verificando resultados...');

    // Verificar empresa ISI específicamente
    const isiResult = await client.query(`
      SELECT company_id, name, active_modules
      FROM companies
      WHERE company_id = 11
    `);

    if (isiResult.rows.length > 0) {
      const isi = isiResult.rows[0];
      console.log(`\n🏢 [ISI] Empresa verificada:`);
      console.log(`   ID: ${isi.company_id}`);
      console.log(`   Nombre: ${isi.name}`);
      console.log(`   Active modules:`, isi.active_modules);

      if (Array.isArray(isi.active_modules)) {
        const hasAuditor = isi.active_modules.includes('auditor-dashboard');
        console.log(`   🔍 ¿Tiene auditor-dashboard? ${hasAuditor}`);
        console.log(`   📊 Total módulos: ${isi.active_modules.length}`);
      }
    }

  } catch (error) {
    console.error('❌ [ERROR] Error durante la limpieza:', error.message);
  } finally {
    await client.end();
    console.log('\n🔧 [CLEANUP] Conexión cerrada');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  cleanActiveModules()
    .then(() => {
      console.log('🎉 [COMPLETE] Script de limpieza completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 [FATAL] Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { cleanActiveModules };