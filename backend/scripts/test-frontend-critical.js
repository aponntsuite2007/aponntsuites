/**
 * TEST CRÍTICO DE FRONTEND
 *
 * Verifica que los recursos del frontend cargan correctamente
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:9998';

async function test(name, url, expectedContent = null) {
  try {
    const res = await axios.get(url, { timeout: 5000 });
    const ok = res.status === 200;
    const hasContent = expectedContent ? res.data.includes(expectedContent) : true;

    if (ok && hasContent) {
      console.log(`  ✅ ${name}`);
      return true;
    } else {
      console.log(`  ❌ ${name} - ${!hasContent ? 'Contenido esperado no encontrado' : 'Error'}`);
      return false;
    }
  } catch (e) {
    console.log(`  ❌ ${name} - ${e.response?.status || e.message}`);
    return false;
  }
}

async function run() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          TEST CRÍTICO DE FRONTEND                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  console.log('📄 Páginas principales:');
  if (await test('panel-empresa.html', `${BASE_URL}/panel-empresa.html`, 'MULTI-TENANT')) passed++; else failed++;
  if (await test('panel-administrativo.html', `${BASE_URL}/panel-administrativo.html`)) passed++; else failed++;
  if (await test('index.html', `${BASE_URL}/index.html`)) passed++; else failed++;
  if (await test('kiosk.html', `${BASE_URL}/kiosk.html`)) passed++; else failed++;

  console.log('\n📂 CSS:');
  if (await test('CSS folder accesible', `${BASE_URL}/css/styles.css`)) passed++; else failed++;

  console.log('\n📜 Módulos JS críticos:');
  const jsModules = [
    'admin.js',
    'modules/ai-assistant-chat.js',
    'modules/attendance-module.js',
    'modules/payroll-liquidation.js',
    'core/ModuleHelpSystem.js'
  ];

  for (const mod of jsModules) {
    if (await test(mod, `${BASE_URL}/js/${mod}`)) passed++; else failed++;
  }

  console.log('\n🖼️ Imágenes:');
  if (await test('favicon.svg', `${BASE_URL}/favicon.svg`)) passed++; else failed++;

  console.log('\n🔌 API Health:');
  if (await test('API Health', `${BASE_URL}/api/v1/health`)) passed++; else failed++;

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`TOTAL: ${passed}/${passed + failed} tests`);

  if (failed === 0) {
    console.log('🎉 FRONTEND LISTO');
  } else {
    console.log('⚠️ HAY RECURSOS FALTANTES');
  }
}

run().catch(console.error);
