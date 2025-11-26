const { sequelize } = require('./src/config/database');

async function generateInconsistencyReport() {
  try {
    console.log('🔍 REPORTE COMPLETO DE INCONSISTENCIAS DE MÓDULOS');
    console.log('=' .repeat(80));

    // 1. MAPEO DE MÓDULOS EN BASE DE DATOS
    const [systemModules] = await sequelize.query(`
      SELECT module_key, name FROM system_modules ORDER BY module_key
    `);

    // 2. CONFIGURACIÓN DEL PANEL-ADMINISTRATIVO (líneas 2917-2932)
    const panelAdminModules = {
      'users': 'Usuarios',
      'departments': 'Departamentos',
      'shifts': 'Turnos',
      'attendance': 'Asistencia',
      'facial-biometric': 'Biometría',
      'medical-dashboard': 'Médico',
      'art-management': 'ART',
      'document-management': 'Documentos',
      'legal-dashboard': 'Legal',
      'payroll-liquidation': 'Liquidación',
      'employee-map': 'Mapa Empleados',
      'training-management': 'Capacitaciones',
      'notifications': 'Notificaciones',
      'job-postings': 'Postulaciones',
      'settings': 'Configuración'
    };

    // 3. CONFIGURACIÓN DEL PANEL-EMPRESA (líneas 1881-1898)
    const panelEmpresaModules = {
      'users': 'Usuarios',
      'departments': 'Departamentos',
      'shifts': 'Turnos',
      'attendance': 'Asistencia',
      'facial-biometric': 'Biometría',
      'evaluacion-biometrica': 'Evaluación Biométrica',
      'medical-dashboard': 'Médico',
      'art-management': 'ART',
      'document-management': 'Documentos',
      'legal-dashboard': 'Legal',
      'payroll-liquidation': 'Liquidación',
      'employee-map': 'Mapa Empleados',
      'training-management': 'Capacitaciones',
      'notifications': 'Notificaciones',
      'job-postings': 'Postulaciones',
      'settings': 'Configuración'
    };

    console.log('\n📊 ANÁLISIS DE CONSISTENCIA:');
    console.log('================================================================================');

    // 4. IDENTIFICAR INCONSISTENCIAS
    const bdModules = systemModules.map(m => m.module_key);
    const adminKeys = Object.keys(panelAdminModules);
    const empresaKeys = Object.keys(panelEmpresaModules);

    console.log('\n🔴 MÓDULOS EN BD QUE NO ESTÁN EN PANEL-ADMIN:');
    const missingInAdmin = bdModules.filter(key => !adminKeys.includes(key));
    missingInAdmin.forEach(key => {
      const bdModule = systemModules.find(m => m.module_key === key);
      console.log(`  - ${key} | "${bdModule.name}"`);
    });

    console.log('\n🔴 MÓDULOS EN BD QUE NO ESTÁN EN PANEL-EMPRESA:');
    const missingInEmpresa = bdModules.filter(key => !empresaKeys.includes(key));
    missingInEmpresa.forEach(key => {
      const bdModule = systemModules.find(m => m.module_key === key);
      console.log(`  - ${key} | "${bdModule.name}"`);
    });

    console.log('\n🔴 MÓDULOS EN PANEL-EMPRESA QUE NO ESTÁN EN BD:');
    const extraInEmpresa = empresaKeys.filter(key => !bdModules.includes(key));
    extraInEmpresa.forEach(key => {
      console.log(`  - ${key} | "${panelEmpresaModules[key]}"`);
    });

    console.log('\n🔴 DIFERENCIAS DE NOMBRES ENTRE BD Y PANEL-ADMIN:');
    adminKeys.forEach(key => {
      const bdModule = systemModules.find(m => m.module_key === key);
      if (bdModule && bdModule.name !== panelAdminModules[key]) {
        console.log(`  - ${key}:`);
        console.log(`    BD: "${bdModule.name}"`);
        console.log(`    Admin: "${panelAdminModules[key]}"`);
      }
    });

    console.log('\n🔴 DIFERENCIAS DE NOMBRES ENTRE BD Y PANEL-EMPRESA:');
    empresaKeys.forEach(key => {
      const bdModule = systemModules.find(m => m.module_key === key);
      if (bdModule && bdModule.name !== panelEmpresaModules[key]) {
        console.log(`  - ${key}:`);
        console.log(`    BD: "${bdModule.name}"`);
        console.log(`    Empresa: "${panelEmpresaModules[key]}"`);
      }
    });

    console.log('\n📋 RESUMEN DE PROBLEMAS:');
    console.log(`  - Módulos faltantes en panel-admin: ${missingInAdmin.length}`);
    console.log(`  - Módulos faltantes en panel-empresa: ${missingInEmpresa.length}`);
    console.log(`  - Módulos extra en panel-empresa: ${extraInEmpresa.length}`);

    console.log('\n🎯 ACCIONES REQUERIDAS:');
    if (missingInAdmin.length > 0) {
      console.log('  1. Agregar módulos faltantes al panel-administrativo');
    }
    if (missingInEmpresa.length > 0) {
      console.log('  2. Agregar módulos faltantes al panel-empresa');
    }
    if (extraInEmpresa.length > 0) {
      console.log('  3. Remover o agregar a BD los módulos extra del panel-empresa');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generando reporte:', error.message);
    process.exit(1);
  }
}

generateInconsistencyReport();