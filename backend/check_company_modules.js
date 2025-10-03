const { sequelize } = require('./src/config/database');

async function checkCompanyModules() {
  try {
    console.log('🔍 [INVESTIGACIÓN] Relación módulos-empresas...\n');

    // 0. Verificar estructura de tabla companies
    const [structure] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `);
    console.log('📋 [COMPANIES] Estructura de tabla:');
    structure.forEach(col => console.log(`   ${col.column_name}: ${col.data_type}`));

    // 1. Verificar datos de empresa 11 - primero intentemos encontrar el campo correcto
    let company11Query = "SELECT * FROM companies LIMIT 5";
    const [companies] = await sequelize.query(company11Query);
    console.log('\n🏢 [COMPANIES] Primeras 5 empresas para ver estructura:');
    companies.forEach((comp, idx) => {
      console.log(`   ${idx+1}. Campos disponibles:`, Object.keys(comp));
      if (idx === 0) {
        // Mostrar los valores del primer registro para entender la estructura
        Object.keys(comp).forEach(key => {
          if (key.toLowerCase().includes('id') || key.toLowerCase().includes('name') || key.toLowerCase().includes('module')) {
            console.log(`      ${key}: ${comp[key]}`);
          }
        });
      }
    });
    if (company11.length > 0) {
      const company = company11[0];
      console.log('🏢 [EMPRESA-11] Datos básicos:');
      console.log('   ID:', company.id);
      console.log('   Nombre:', company.name);
      console.log('   Slug:', company.slug);

      // Verificar campos relacionados con módulos
      console.log('\n📦 [EMPRESA-11] Campos de módulos:');
      Object.keys(company).forEach(key => {
        if (key.includes('module') || key.includes('pricing') || key.includes('active') || key.includes('contract')) {
          console.log(`   ${key}:`, typeof company[key] === 'string' ? company[key].substring(0, 100) + '...' : company[key]);
        }
      });
    }

    // 2. Verificar si existe tabla company_modules
    const [tableExists] = await sequelize.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_modules')");
    console.log('\n🔍 [TABLAS] company_modules existe:', tableExists[0].exists);

    if (tableExists[0].exists) {
      // Verificar módulos de la empresa 11
      const [companyModules] = await sequelize.query(`
        SELECT cm.*, sm.name, sm.module_key
        FROM company_modules cm
        JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = 11
      `);
      console.log('\n📦 [MÓDULOS] Asignados a empresa 11:');
      companyModules.forEach(cm => console.log(`   ${cm.module_key} | ${cm.name} | Activo: ${cm.activo}`));
    }

    // 3. Ver qué campo usa el frontend para cargar módulos
    console.log('\n🔍 [ANÁLISIS] Campos que podrían contener módulos de empresa 11...');
    if (company11.length > 0) {
      const company = company11[0];

      // Verificar modules_data
      if (company.modules_data) {
        console.log('\n📋 [modules_data]:');
        try {
          const modulesData = JSON.parse(company.modules_data);
          console.log('   Tipo:', Array.isArray(modulesData) ? 'Array' : 'Object');
          console.log('   Contenido:', JSON.stringify(modulesData, null, 2).substring(0, 300) + '...');
        } catch {
          console.log('   Formato:', typeof company.modules_data);
        }
      }

      // Verificar active_modules
      if (company.active_modules) {
        console.log('\n📋 [active_modules]:');
        try {
          const activeModules = JSON.parse(company.active_modules);
          console.log('   Tipo:', Array.isArray(activeModules) ? 'Array' : 'Object');
          console.log('   Contenido:', JSON.stringify(activeModules, null, 2).substring(0, 300) + '...');
        } catch {
          console.log('   Formato:', typeof company.active_modules);
        }
      }

      // Verificar modules
      if (company.modules) {
        console.log('\n📋 [modules]:');
        try {
          const modules = JSON.parse(company.modules);
          console.log('   Tipo:', Array.isArray(modules) ? 'Array' : 'Object');
          console.log('   Contenido:', JSON.stringify(modules, null, 2).substring(0, 300) + '...');
        } catch {
          console.log('   Formato:', typeof company.modules);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkCompanyModules();