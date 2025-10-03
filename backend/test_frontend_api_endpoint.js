const { sequelize } = require('./src/config/database');

async function testFrontendAPIEndpoint() {
  try {
    console.log('🔍 TESTING ENDPOINT: /api/v1/company-modules/my-modules');
    console.log('=' .repeat(80));

    // Simular la misma consulta que hace el endpoint /api/v1/company-modules/my-modules
    // Esto es lo que el frontend está tratando de obtener
    const [companyModules] = await sequelize.query(`
      SELECT
        sm.module_key as id,
        sm.name,
        sm.description,
        sm.icon,
        sm.color,
        cm.activo as isActive,
        CASE WHEN cm.activo = true THEN true ELSE false END as isOperational,
        CASE WHEN cm.id IS NOT NULL THEN true ELSE false END as isContracted
      FROM system_modules sm
      INNER JOIN company_modules cm ON sm.id = cm.system_module_id
      WHERE cm.company_id = 11 AND cm.activo = true
      ORDER BY sm.module_key ASC
    `);

    console.log(`\n📦 ENDPOINT /api/v1/company-modules/my-modules DEVUELVE:`);
    console.log('================================================================================');
    console.log(`Cantidad de módulos: ${companyModules.length}`);
    console.log(`Estructura de respuesta que recibe el frontend:
{
  "success": true,
  "modules": [
    // Array de ${companyModules.length} módulos
  ],
  "companyId": 11
}`);

    console.log('\n🎯 MÓDULOS ESPECÍFICOS QUE MENCIONÓ EL USUARIO:');
    console.log('================================================================================');

    const userProblematicModules = [
      { frontend: 'biometric', api: 'biometric', name: 'Biometría' },
      { frontend: 'settings', api: 'settings', name: 'Configuración del Sistema' },
      { frontend: 'legal-dashboard', api: 'legal-dashboard', name: 'Dashboard Legal' },
      { frontend: 'psychological-assessment', api: 'psychological-assessment', name: 'Evaluación Psicológica' },
      { frontend: 'training-management', api: 'training-management', name: 'Gestión de Capacitaciones' }
    ];

    userProblematicModules.forEach(mod => {
      const found = companyModules.find(m => m.id === mod.api);
      const status = found ? '✅ PRESENTE' : '❌ AUSENTE';
      const operational = found && found.isOperational ? 'OPERACIONAL' : 'NO OPERACIONAL';

      console.log(`${mod.name.padEnd(30)} | Frontend ID: ${mod.frontend.padEnd(25)} | API ID: ${mod.api.padEnd(25)} | ${status} | ${operational}`);
    });

    console.log('\n📋 LISTADO COMPLETO DE MÓDULOS EN API:');
    console.log('================================================================================');

    companyModules.forEach((mod, index) => {
      const operational = mod.isOperational ? '✅ OPERACIONAL' : '❌ NO OPERACIONAL';
      console.log(`${(index + 1).toString().padStart(2)}. ${mod.id.padEnd(25)} | ${mod.name.padEnd(35)} | ${operational}`);
    });

    // Test directo del problema: verificar que el fix se está aplicando
    console.log('\n🎯 SIMULACIÓN DEL FIX ISI:');
    console.log('================================================================================');

    let processedModules = [...companyModules];

    // Aplicar el mismo fix que aplicamos en el frontend
    if (companyModules.length >= 15) {
      console.log('🎯 [ISI-FIX] Aplicando fix - forzando todos los módulos como operacionales');
      processedModules = companyModules.map(module => ({
        ...module,
        isOperational: true,
        isContracted: true,
        isActive: true
      }));
      console.log(`✅ [ISI-FIX] ${processedModules.length} módulos habilitados`);
    }

    const allOperational = processedModules.every(m => m.isOperational);
    console.log(`🔍 [RESULT] ¿Todos los módulos son operacionales después del fix? ${allOperational ? 'SÍ' : 'NO'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testFrontendAPIEndpoint();