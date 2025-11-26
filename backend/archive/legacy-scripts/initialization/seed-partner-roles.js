/**
 * seed-partner-roles.js
 *
 * Script para insertar los 10 roles de partners iniciales
 *
 * Ejecutar: node seed-partner-roles.js
 */

const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Verificar si ya existen roles
    const checkResult = await client.query('SELECT COUNT(*) as count FROM partner_roles');
    const existingCount = parseInt(checkResult.rows[0].count);

    if (existingCount > 0) {
      console.log(`⚠️  Ya existen ${existingCount} roles de partners en la base de datos`);
      console.log('   No se insertarán datos duplicados');
      return;
    }

    console.log('\n🌱 Insertando 10 roles de partners iniciales...\n');

    // Insertar los 10 roles (usando categorías válidas: legal, medical, safety, coaching, audit, emergency, health, transport)
    const insertQuery = `
      INSERT INTO partner_roles (role_name, category, description, requires_license, requires_insurance, is_active) VALUES
      ('Abogado Laboralista', 'legal', 'Asesoramiento legal en temas laborales y relaciones con empleados', true, true, true),
      ('Médico Laboral', 'medical', 'Exámenes médicos pre-ocupacionales y seguimiento de salud laboral', true, true, true),
      ('Responsable de Seguridad e Higiene', 'safety', 'Gestión de seguridad e higiene en el trabajo', true, true, true),
      ('Coach Empresarial', 'coaching', 'Coaching y desarrollo de equipos', false, false, true),
      ('Auditor Externo', 'audit', 'Auditorías de procesos y sistemas', false, true, true),
      ('Contador Público', 'audit', 'Servicios contables y de auditoría financiera', true, true, true),
      ('Especialista en RRHH', 'coaching', 'Gestión integral de recursos humanos', false, false, true),
      ('Técnico en Sistemas Biométricos', 'safety', 'Instalación y mantenimiento de sistemas biométricos', false, true, true),
      ('Consultor de Compliance', 'legal', 'Asesoramiento en cumplimiento normativo y regulatorio', false, true, true),
      ('Psicólogo Organizacional', 'health', 'Evaluaciones psicológicas y desarrollo organizacional', true, false, true)
    `;

    await client.query(insertQuery);

    // Verificar inserción
    const result = await client.query(`
      SELECT id, role_name, category, requires_license, requires_insurance
      FROM partner_roles
      ORDER BY id
    `);

    console.log('✅ Roles de partners insertados exitosamente!\n');
    console.log('📊 Roles creados:\n');

    result.rows.forEach((row, index) => {
      const license = row.requires_license ? '📜' : '  ';
      const insurance = row.requires_insurance ? '🛡️' : '  ';
      console.log(`   ${index + 1}. ${license}${insurance} ${row.role_name} (${row.category})`);
    });

    console.log('\n📝 Leyenda:');
    console.log('   📜 = Requiere licencia profesional');
    console.log('   🛡️  = Requiere seguro');
    console.log('\n🎉 ¡Sistema de Partners listo para usar!');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
