/**
 * TEST RÁPIDO: Resumen de estado de todos los tabs
 * Solo verifica si cada tab carga sin errores
 */

const { chromium } = require('playwright');

const TABS = [
  { name: 'admin', label: 'Administración' },
  { name: 'personal', label: 'Datos Personales' },
  { name: 'work', label: 'Antecedentes Laborales' },
  { name: 'family', label: 'Grupo Familiar' },
  { name: 'medical', label: 'Antecedentes Médicos' },
  { name: 'attendance', label: 'Asistencias/Permisos' },
  { name: 'calendar', label: 'Calendario' },
  { name: 'disciplinary', label: 'Disciplinarios' },
  { name: 'biometric', label: 'Registro Biométrico' },
  { name: 'notifications', label: 'Notificaciones' }
];

async function testAllTabs() {
  console.log('🧪 TEST RESUMEN: Estado de todos los tabs del employeeFileModal');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = {};
  const errors = [];

  // Capturar errores JS
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('404') && !msg.text().includes('401')) {
      errors.push(msg.text().substring(0, 100));
    }
  });

  try {
    // Login
    console.log('\n📋 Login...');
    await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#companySelect', { timeout: 10000 });
    await page.waitForFunction(() => {
      const sel = document.getElementById('companySelect');
      return sel && sel.options.length > 1;
    }, { timeout: 10000 });
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(3000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(5000);
    console.log('   ✅ Login OK');

    // Users module
    await page.evaluate(() => document.querySelector('[data-module-key="users"]').click());
    await page.waitForTimeout(2000);

    // Abrir modal
    await page.evaluate(() => document.querySelector('table tbody tr:first-child button.users-action-btn.view').click());
    await page.waitForTimeout(2000);
    console.log('   ✅ Modal abierto');

    // Test cada tab
    console.log('\n📊 Verificando tabs...\n');

    for (const tab of TABS) {
      errors.length = 0; // Reset errores

      try {
        // Activar tab
        await page.evaluate((tabName) => {
          const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
          const targetTab = tabs.find(t => t.getAttribute('onclick').includes(`'${tabName}'`));
          if (targetTab) targetTab.click();
        }, tab.name);
        await page.waitForTimeout(2000);

        // Verificar que el tab está visible
        const tabVisible = await page.evaluate((tabName) => {
          const tabContent = document.getElementById(`${tabName}-tab`);
          if (!tabContent) return { visible: false, error: 'Tab no encontrado' };
          const style = getComputedStyle(tabContent);
          return {
            visible: style.display !== 'none',
            hasContent: tabContent.innerHTML.length > 100
          };
        }, tab.name);

        // Verificar errores JS durante la carga
        const hasErrors = errors.length > 0;

        results[tab.name] = {
          label: tab.label,
          loaded: tabVisible.visible,
          hasContent: tabVisible.hasContent,
          errors: hasErrors ? errors.slice(0, 2) : []
        };

        const status = tabVisible.visible && !hasErrors ? '✅' : (tabVisible.visible ? '⚠️' : '❌');
        console.log(`   ${status} Tab ${tab.name}: ${tab.label}`);
        if (hasErrors) {
          console.log(`      Errores: ${errors[0].substring(0, 60)}...`);
        }

      } catch (e) {
        results[tab.name] = {
          label: tab.label,
          loaded: false,
          error: e.message
        };
        console.log(`   ❌ Tab ${tab.name}: Error - ${e.message.substring(0, 50)}`);
      }
    }

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');

    const passed = Object.values(results).filter(r => r.loaded && r.errors.length === 0).length;
    const warnings = Object.values(results).filter(r => r.loaded && r.errors.length > 0).length;
    const failed = Object.values(results).filter(r => !r.loaded).length;

    console.log(`   ✅ OK: ${passed}/${TABS.length}`);
    console.log(`   ⚠️ Warnings: ${warnings}/${TABS.length}`);
    console.log(`   ❌ Failed: ${failed}/${TABS.length}`);
    console.log(`\n   Tasa de éxito: ${Math.round((passed / TABS.length) * 100)}%`);

  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await browser.close();
  }
}

testAllTabs();
