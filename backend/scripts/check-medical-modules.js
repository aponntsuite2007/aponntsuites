/**
 * VERIFICACIÓN DE MÓDULOS MÉDICOS
 */

const db = require('../src/config/database');

async function checkMedicalModules() {
  console.log('🔍 VERIFICANDO MÓDULOS MÉDICOS\n');

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // Buscar todos los módulos con "medical" en su nombre
    const [modules] = await db.sequelize.query(`
      SELECT module_key, name, is_core, base_price, description, is_active, icon
      FROM system_modules
      WHERE module_key LIKE '%medical%' OR name ILIKE '%médic%'
      ORDER BY module_key
    `);

    console.log(`📋 MÓDULOS ENCONTRADOS: ${modules.length}\n`);

    modules.forEach(m => {
      const type = m.is_core ? 'CORE' : 'PREMIUM';
      console.log(`${m.icon || '📄'} ${m.module_key}`);
      console.log(`   Nombre: ${m.name}`);
      console.log(`   Tipo: ${type} | Precio: $${m.base_price}`);
      console.log(`   Activo: ${m.is_active ? 'Sí' : 'No'}`);
      console.log(`   Descripción: ${m.description || 'N/A'}`);
      console.log('');
    });

    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await db.sequelize.close();
    process.exit(1);
  }
}

checkMedicalModules();
