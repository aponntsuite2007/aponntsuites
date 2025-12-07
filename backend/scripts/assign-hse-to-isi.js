/**
 * Script para registrar modulo HSE y asignarlo a ISI
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  username: 'postgres',
  password: 'Aedr15150302',
  logging: false
});

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL local');

    // 1. Insertar modulo HSE en system_modules
    console.log('\n1. Registrando modulo HSE...');
    await sequelize.query(`
      INSERT INTO system_modules (
        id, module_key, name, description, icon, color, category,
        base_price, is_active, is_core, display_order, features,
        requirements, version, rubro, available_in, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'hse-management',
        'Seguridad e Higiene Laboral (HSE)',
        'Sistema completo de gestion de Seguridad e Higiene Laboral con estandares ISO 45001, OSHA, EU-OSHA y SRT. Gestion de EPP, matriz rol-EPP, entregas, inspecciones y notificaciones automaticas de vencimiento.',
        'shield-alt',
        '#e74c3c',
        'compliance',
        99.00,
        true,
        false,
        65,
        '["Catalogo de EPP por empresa", "Matriz rol-EPP automatica", "Entregas con firma digital", "Inspecciones periodicas", "Notificaciones automaticas de vencimiento", "Dashboard de cumplimiento", "Soporte ISO 45001/OSHA/SRT"]'::jsonb,
        '["users", "organizational-structure"]'::jsonb,
        '1.0.0',
        'Seguridad Industrial',
        'empresa',
        NOW(),
        NOW()
      ) ON CONFLICT (module_key) DO UPDATE SET updated_at = NOW()
      RETURNING id, module_key, name
    `);
    console.log('   Modulo HSE registrado');

    // 2. Obtener ID del modulo
    const [modules] = await sequelize.query(`SELECT id FROM system_modules WHERE module_key = 'hse-management'`);
    const moduleId = modules[0].id;
    console.log('   Module ID:', moduleId);

    // 3. Asignar a ISI (company_id = 11)
    console.log('\n2. Asignando a ISI (company_id = 11)...');
    await sequelize.query(`
      INSERT INTO company_modules (company_id, system_module_id, is_active, created_at, updated_at)
      VALUES (11, '${moduleId}', true, NOW(), NOW())
      ON CONFLICT (company_id, system_module_id) DO UPDATE SET is_active = true, updated_at = NOW()
    `);
    console.log('   Modulo asignado a ISI');

    // 4. Verificar
    console.log('\n3. Verificacion:');
    const [verify] = await sequelize.query(`
      SELECT c.name as company_name, sm.name as module_name, cm.is_active
      FROM company_modules cm
      JOIN companies c ON cm.company_id = c.company_id
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11 AND sm.module_key = 'hse-management'
    `);
    console.log('   ', verify[0]);

    console.log('\n✅ Modulo HSE asignado exitosamente a ISI');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
