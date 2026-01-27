/**
 * TEST DE MÓDULOS PROBLEMÁTICOS - Captura errores de consola
 */
const puppeteer = require('puppeteer');

const MODULES_TO_TEST = [
  'biometric-consent',
  'logistics-dashboard',
  'notifications-enterprise',
  'engineering-dashboard',
  'employee-map',
  'employee-360',
  'facturacion'
];

async function testModules() {
  console.log('\n🧪 TESTING PROBLEMATIC MODULES\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  // Capturar errores de consola
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ module: 'global', text: msg.text() });
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push({ module: 'global', text: err.message });
  });

  // Login
  console.log('🔐 Logging in...');
  await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle0' });

  await page.type('#loginCompanySlug', 'aponnt-empresa-demo');
  await page.click('#btnContinueLogin');
  await new Promise(r => setTimeout(r, 1000));

  await page.type('#loginEmail', 'administrador');
  await page.type('#loginPassword', 'admin123');
  await page.click('#btnSubmitLogin');
  await new Promise(r => setTimeout(r, 3000));

  console.log('✅ Logged in\n');

  // Testear cada módulo
  for (const moduleId of MODULES_TO_TEST) {
    console.log(`\n📦 Testing: ${moduleId}`);
    consoleErrors.length = 0; // Reset errors

    try {
      // Intentar cargar el módulo
      const loaded = await page.evaluate((modId) => {
        return new Promise((resolve) => {
          try {
            if (typeof window.showModuleContent === 'function') {
              window.showModuleContent(modId, modId);
              setTimeout(() => resolve(true), 2000);
            } else if (typeof window.showTab === 'function') {
              window.showTab(modId);
              setTimeout(() => resolve(true), 2000);
            } else {
              resolve(false);
            }
          } catch (e) {
            console.error('Error loading module:', e);
            resolve(false);
          }
        });
      }, moduleId);

      await new Promise(r => setTimeout(r, 2000));

      // Verificar contenido
      const contentCheck = await page.evaluate(() => {
        const main = document.getElementById('mainContent');
        if (!main) return { found: false, text: '' };
        const text = main.innerText.trim();
        return {
          found: true,
          length: text.length,
          hasError: text.toLowerCase().includes('error'),
          hasLoading: text.includes('Cargando'),
          sample: text.substring(0, 200)
        };
      });

      // Capturar errores de consola del módulo
      const moduleErrors = await page.evaluate(() => {
        return window.__consoleErrors || [];
      });

      if (contentCheck.found && contentCheck.length > 100 && !contentCheck.hasError && !contentCheck.hasLoading) {
        console.log(`   ✅ OK - ${contentCheck.length} chars`);
      } else if (contentCheck.hasLoading) {
        console.log(`   ⏳ Still loading...`);
      } else if (contentCheck.hasError) {
        console.log(`   ❌ Shows error in content`);
      } else {
        console.log(`   ⚠️  Partial - ${contentCheck.length} chars`);
        console.log(`   Sample: ${contentCheck.sample.substring(0, 100)}...`);
      }

      // Mostrar errores de consola
      if (consoleErrors.length > 0) {
        console.log(`   🔴 Console errors:`);
        consoleErrors.forEach(e => console.log(`      - ${e.text.substring(0, 100)}`));
      }

    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }
  }

  console.log('\n\n🖥️  Browser open - check manually. Press Ctrl+C to close.\n');

  // Keep browser open
  await new Promise(() => {});
}

testModules().catch(console.error);
