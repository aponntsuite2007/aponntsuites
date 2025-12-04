/**
 * Script para agregar el módulo hours-cube-dashboard a system_modules
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Usar la configuración del sistema (localhost)
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  dialect: 'postgres',
  logging: false
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

async function addHoursCubeModule() {
  try {
    console.log('🔧 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    // Verificar si ya existe
    const [existing] = await sequelize.query(
      `SELECT id FROM system_modules WHERE module_key = 'hours-cube-dashboard'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing) {
      console.log('⚠️  El módulo hours-cube-dashboard ya existe, actualizando...');
      await sequelize.query(`
        UPDATE system_modules SET
          name = 'Panel Ejecutivo de Horas',
          icon = 'fas fa-cube',
          category = 'analytics',
          is_core = true,
          is_active = true,
          base_price = 0,
          description = 'Panel ejecutivo con cubo de horas, costos de reposición y optimizador de vacaciones. Basado en LCT Argentina.',
          available_in = 'both',
          display_order = 15,
          updated_at = NOW()
        WHERE module_key = 'hours-cube-dashboard'
      `);
      console.log('✅ Módulo actualizado');
    } else {
      console.log('📦 Insertando nuevo módulo hours-cube-dashboard...');
      await sequelize.query(`
        INSERT INTO system_modules (
          id,
          module_key,
          name,
          icon,
          category,
          is_core,
          is_active,
          base_price,
          description,
          available_in,
          display_order,
          version,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          'hours-cube-dashboard',
          'Panel Ejecutivo de Horas',
          'fas fa-cube',
          'analytics',
          true,
          true,
          0,
          'Panel ejecutivo con cubo de horas, costos de reposición y optimizador de vacaciones. Basado en LCT Argentina.',
          'both',
          15,
          '1.0.0',
          NOW(),
          NOW()
        )
      `);
      console.log('✅ Módulo insertado');
    }

    // Agregar a active_modules de todas las empresas (opcional, pero útil para testing)
    console.log('📋 Agregando módulo a empresas activas...');
    const companies = await sequelize.query(
      `SELECT company_id, name, active_modules FROM companies WHERE is_active = true`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const company of companies) {
      let activeModules = [];
      if (company.active_modules) {
        if (typeof company.active_modules === 'string') {
          try {
            activeModules = JSON.parse(company.active_modules);
          } catch (e) {
            activeModules = [];
          }
        } else if (Array.isArray(company.active_modules)) {
          activeModules = company.active_modules;
        }
      }

      if (!activeModules.includes('hours-cube-dashboard')) {
        activeModules.push('hours-cube-dashboard');
        await sequelize.query(
          `UPDATE companies SET active_modules = :modules WHERE company_id = :id`,
          {
            replacements: {
              modules: JSON.stringify(activeModules),
              id: company.company_id
            }
          }
        );
        console.log(`  ✅ ${company.name}: módulo agregado`);
      } else {
        console.log(`  ⏭️  ${company.name}: ya tiene el módulo`);
      }
    }

    console.log('\n🎉 ¡Proceso completado!');
    console.log('📌 Recuerda reiniciar el servidor para que tome los cambios');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

addHoursCubeModule();
