const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db', {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  try {
    // Primero ver las tablas y columnas
    const [tables] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('companies', 'users') LIMIT 10");
    console.log('Tablas encontradas:', tables.map(t => t.table_name));

    // Ver columnas de companies
    const [compCols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' LIMIT 20");
    console.log('\nColumnas de companies:', compCols.map(c => c.column_name).join(', '));

    // Ver columnas de users
    const [userCols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' LIMIT 20");
    console.log('Columnas de users:', userCols.map(c => c.column_name).join(', '));

    // Buscar empresas activas (sin especificar columnas primero)
    const [companies] = await sequelize.query('SELECT * FROM companies WHERE is_active = true LIMIT 5');
    console.log('\n=== EMPRESAS ACTIVAS EN PRODUCCIÓN ===');
    companies.forEach(c => {
      const id = c.id || c.company_id || Object.values(c)[0];
      const name = c.name || c.company_name || c.legal_name;
      const slug = c.slug || c.company_slug;
      console.log('ID:', id, '| Nombre:', name, '| Slug:', slug);
    });

    // Buscar usuarios
    if (companies.length > 0) {
      const companyId = companies[0].id || companies[0].company_id || Object.values(companies[0])[0];
      const [users] = await sequelize.query(`SELECT * FROM users WHERE company_id = ${companyId} LIMIT 10`);
      console.log('\n=== USUARIOS ===');
      users.forEach(u => {
        const username = u.username || u.user_name || u.email;
        const role = u.role || u.user_role;
        console.log('  Usuario:', username, '| Email:', u.email, '| Rol:', role);
      });
    }

    await sequelize.close();
  } catch (e) {
    console.error('Error:', e.message, e.stack);
  }
}
main();
