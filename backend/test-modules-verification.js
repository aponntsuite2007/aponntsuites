/**
 * SCRIPT DE VERIFICACIÓN - Comprueba qué módulos se devuelven REALMENTE
 */
const axios = require('axios');

const URL = 'http://localhost:9998/api/modules/active?company_id=11&panel=empresa';

console.log('\n🔍 VERIFICANDO MÓDULOS EN TIEMPO REAL...\n');
console.log('URL:', URL);
console.log('Timestamp:', new Date().toISOString());
console.log('\n' + '='.repeat(80) + '\n');

axios.get(URL)
  .then(res => {
    const data = res.data;

    console.log('✅ Respuesta recibida:');
    console.log('  - Total módulos:', data.total_modules);
    console.log('  - Company:', data.company_name);
    console.log('  - Panel:', data.panel);

    // Buscar los 3 problemáticos
    const problematic = ['departments', 'shifts', 'roles-permissions'];
    const found = [];

    problematic.forEach(key => {
      const matches = data.modules.filter(m => m.module_key === key);
      if (matches.length > 0) {
        found.push({ key, count: matches.length, modules: matches });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎯 RESULTADO DE VERIFICACIÓN:');
    console.log('='.repeat(80) + '\n');

    if (found.length === 0) {
      console.log('✅ ✅ ✅ ÉXITO TOTAL ✅ ✅ ✅');
      console.log('');
      console.log('Los 3 módulos problemáticos NO están en la respuesta:');
      console.log('  ✓ departments - NO ENCONTRADO');
      console.log('  ✓ shifts - NO ENCONTRADO');
      console.log('  ✓ roles-permissions - NO ENCONTRADO');
      console.log('');
      console.log('🎉 El API está LIMPIO. Si todavía ves las tarjetas en el navegador,');
      console.log('   el problema es CACHE del navegador. Presiona Ctrl+Shift+R');
    } else {
      console.log('❌ ❌ ❌ PROBLEMA DETECTADO ❌ ❌ ❌');
      console.log('');
      console.log('Los siguientes módulos TODAVÍA aparecen en la respuesta:');
      found.forEach(f => {
        console.log(`\n  ❌ ${f.key} (${f.count} veces):`);
        f.modules.forEach(m => {
          console.log(`      - name: ${m.name}`);
          console.log(`        description: ${m.description}`);
        });
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('📋 TODOS LOS MÓDULOS EN LA RESPUESTA:');
    console.log('='.repeat(80) + '\n');

    data.modules.forEach((m, i) => {
      console.log(`${i + 1}. ${m.module_key} - ${m.name}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

    process.exit(found.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('❌ ERROR en la petición:', err.message);
    process.exit(1);
  });
