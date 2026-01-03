/**
 * Verificar que inbox no aparece en el API de módulos activos
 */
const axios = require('axios');

(async () => {
  try {
    console.log('\n🔍 VERIFICANDO FILTRADO DE INBOX EN API\n');
    console.log('='.repeat(80) + '\n');

    const response = await axios.get('http://localhost:9998/api/modules/active?company_id=11');
    const modules = response.data.modules || [];

    console.log(`📊 Total módulos activos para ISI: ${modules.length}\n`);

    // Buscar módulos relacionados con notificaciones
    const notifRelated = modules.filter(m =>
      m.moduleKey && (
        m.moduleKey.includes('inbox') ||
        m.moduleKey.includes('notification') ||
        m.moduleKey.includes('espacio')
      )
    );

    console.log('📋 MÓDULOS RELACIONADOS CON NOTIFICACIONES/MI-ESPACIO:\n');

    if (notifRelated.length === 0) {
      console.log('  ⚠️  No se encontraron módulos relacionados\n');
    } else {
      notifRelated.forEach(m => {
        const parent = m.parentModuleKey || m.parent_module_key;
        const status = parent ? `(SUB-MÓDULO de ${parent})` : '(RAÍZ)';
        console.log(`  ${parent ? '  └──' : '✓'} ${m.moduleKey}`);
        console.log(`      Nombre: ${m.name}`);
        console.log(`      Estado: ${status}`);
        console.log('');
      });
    }

    // Verificación específica de inbox
    console.log('='.repeat(80));
    console.log('\n🎯 VERIFICACIÓN ESPECÍFICA:\n');

    const inbox = modules.find(m => m.moduleKey === 'inbox');
    const miEspacio = modules.find(m => m.moduleKey === 'mi-espacio');
    const notifCenter = modules.find(m => m.moduleKey === 'notification-center');

    if (inbox) {
      console.log('❌ ERROR: "inbox" TODAVÍA APARECE en el API');
      console.log(`   → ${inbox.name}`);
      console.log(`   → Parent: ${inbox.parentModuleKey || inbox.parent_module_key || 'null'}`);
      console.log('\n⚠️  El filtro de jerarquía NO está funcionando correctamente');
    } else {
      console.log('✅ CORRECTO: "inbox" NO aparece en el API (filtrado por parent_module_key)');
    }

    if (miEspacio) {
      console.log(`✅ CORRECTO: "mi-espacio" SÍ aparece (${miEspacio.name})`);
    } else {
      console.log('❌ ERROR: "mi-espacio" NO aparece en el API');
    }

    if (notifCenter) {
      console.log(`✅ CORRECTO: "notification-center" SÍ aparece (${notifCenter.name})`);
    } else {
      console.log('❌ ERROR: "notification-center" NO aparece en el API');
    }

    console.log('\n' + '='.repeat(80));

    if (!inbox && miEspacio && notifCenter) {
      console.log('\n🎉 VERIFICACIÓN EXITOSA - Todo funciona correctamente\n');
    } else {
      console.log('\n⚠️  HAY PROBLEMAS - Revisar configuración\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response) {
      console.error('Response:', err.response.data);
    }
    process.exit(1);
  }
})();
