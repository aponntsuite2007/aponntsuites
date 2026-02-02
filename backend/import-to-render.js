const { Client } = require('pg');
const fs = require('fs');

async function importData() {
  const client = new Client({
    connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com:5432/attendance_system_866u',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado a Render');

    const data = JSON.parse(fs.readFileSync('essential-data.json', 'utf8'));

    // Limpiar tablas primero
    await client.query('DELETE FROM system_modules WHERE 1=1');
    await client.query("DELETE FROM aponnt_staff_roles WHERE role_code != 'SUPERADMIN'");
    console.log('Tablas limpiadas');

    // Insertar system_modules
    let modulesInserted = 0;
    for (const m of data.system_modules) {
      try {
        await client.query(`
          INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at, rubro, bundled_modules, available_in, provides_to, integrates_with)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (module_key) DO UPDATE SET name = $3, description = $4, is_active = $9
        `, [m.id, m.module_key, m.name, m.description, m.icon, m.color, m.category, m.base_price, m.is_active, m.is_core, m.display_order, JSON.stringify(m.features || []), JSON.stringify(m.requirements || []), m.version, m.min_employees, m.max_employees, m.created_at, m.updated_at, m.rubro, JSON.stringify(m.bundled_modules || []), m.available_in, JSON.stringify(m.provides_to || []), JSON.stringify(m.integrates_with || [])]);
        modulesInserted++;
      } catch (e) {
        console.log('Error módulo ' + m.module_key + ': ' + e.message.substring(0, 80));
      }
    }
    console.log('Módulos insertados: ' + modulesInserted);

    // Insertar roles
    let rolesInserted = 0;
    for (const r of data.aponnt_staff_roles) {
      if (r.role_code === 'SUPERADMIN') continue;
      try {
        await client.query(`
          INSERT INTO aponnt_staff_roles (role_id, role_code, role_name, role_name_i18n, role_area, level, description, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (role_code) DO NOTHING
        `, [r.role_id, r.role_code, r.role_name, JSON.stringify(r.role_name_i18n || {}), r.role_area, r.level, r.description, r.created_at, r.updated_at]);
        rolesInserted++;
      } catch (e) {
        console.log('Error rol ' + r.role_code + ': ' + e.message.substring(0, 80));
      }
    }
    console.log('Roles insertados: ' + rolesInserted);

    await client.end();
    console.log('Importación completada');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

importData();
