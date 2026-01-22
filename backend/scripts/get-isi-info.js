/**
 * Script para obtener información de ISI para crear usuario Pablo Rivas
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  { host: 'localhost', dialect: 'postgres', logging: false }
);

async function getISIInfo() {
  await sequelize.authenticate();

  // Obtener empresa ISI
  const [company] = await sequelize.query(`
    SELECT company_id, name, slug, country
    FROM companies
    WHERE slug = 'isi' OR name ILIKE '%isi%'
    LIMIT 1
  `);
  console.log('=== EMPRESA ISI ===');
  console.log(JSON.stringify(company[0], null, 2));

  const companyId = company[0]?.company_id;
  if (!companyId) {
    console.log('ISI no encontrada');
    await sequelize.close();
    return;
  }

  // Sucursales y país
  const [branches] = await sequelize.query(`
    SELECT cb.id, cb.name, cb.country_id, cb.is_main,
           pc.name as country_name, pc.code as country_code,
           pc.privacy_law_name, pc.consent_renewal_months
    FROM company_branches cb
    LEFT JOIN payroll_countries pc ON cb.country_id = pc.id
    WHERE cb.company_id = ${companyId}
  `);
  console.log('\n=== SUCURSALES ===');
  branches.forEach(b => console.log(JSON.stringify(b)));

  // Departamentos
  const [depts] = await sequelize.query(`
    SELECT id, name FROM departments
    WHERE company_id = ${companyId}
    ORDER BY name LIMIT 10
  `);
  console.log('\n=== DEPARTAMENTOS ===');
  depts.forEach(d => console.log(' -', d.id, d.name));

  // Posiciones
  const [positions] = await sequelize.query(`
    SELECT id, name FROM positions
    WHERE company_id = ${companyId}
    ORDER BY name LIMIT 10
  `);
  console.log('\n=== POSICIONES ===');
  positions.forEach(p => console.log(' -', p.id, p.name));

  // Sectores (si existe tabla)
  try {
    const [sectors] = await sequelize.query(`
      SELECT id, name FROM sectors
      WHERE company_id = ${companyId}
      ORDER BY name LIMIT 10
    `);
    console.log('\n=== SECTORES ===');
    sectors.forEach(s => console.log(' -', s.id, s.name));
  } catch(e) {
    console.log('\n=== SECTORES: tabla no existe ===');
  }

  // Verificar si existe Pablo Rivas
  const [existing] = await sequelize.query(`
    SELECT user_id, "firstName", "lastName", email
    FROM users
    WHERE company_id = ${companyId}
    AND (email = 'pablorivasjordan52@gmail.com' OR "lastName" ILIKE '%rivas%')
  `);
  console.log('\n=== VERIFICAR SI EXISTE PABLO RIVAS ===');
  if (existing.length > 0) {
    console.log('Usuario encontrado:', JSON.stringify(existing[0]));
  } else {
    console.log('No existe - listo para crear');
  }

  await sequelize.close();
}

getISIInfo().catch(e => console.error('Error:', e.message));
