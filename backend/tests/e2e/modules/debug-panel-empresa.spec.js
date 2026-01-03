// @ts-check
const { test, expect } = require('@playwright/test');

test('Debug panel-empresa errors', async ({ page }) => {
  const errors = [];

  // Capturar todos los errores de consola
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`💥 PAGE ERROR: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    errors.push(error.message);
  });

  // Navegar a la página
  console.log('📂 Cargando panel-empresa.html...');
  await page.goto('http://localhost:9998/panel-empresa.html', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Esperar un poco para que carguen los scripts
  await page.waitForTimeout(3000);

  console.log('\n📋 ERRORES ENCONTRADOS:');
  if (errors.length === 0) {
    console.log('✅ No se encontraron errores de JavaScript');
  } else {
    errors.forEach((err, i) => console.log(`  ${i+1}. ${err}`));
  }

  // Verificar si el login modal está visible
  const loginModal = await page.locator('#companyLoginModal').isVisible();
  console.log(`\n🔐 Login modal visible: ${loginModal}`);

  // Verificar si hay módulos
  const moduleCount = await page.locator('.module-card, [onclick*="openModuleDirect"]').count();
  console.log(`📦 Módulos encontrados: ${moduleCount}`);
});
