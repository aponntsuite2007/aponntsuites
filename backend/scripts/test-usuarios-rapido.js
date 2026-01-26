/**
 * TEST RÁPIDO - Solo módulo Usuarios
 * Verifica: un solo botón "Ver" y departamento sin [object Object]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { company: 'isi', user: 'admin', password: 'admin123' };
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n🔍 TEST RÁPIDO: MÓDULO USUARIOS\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    slowMo: 50
  });

  const page = await browser.newPage();

  try {
    // LOGIN
    console.log('🔐 Login...');
    await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    await page.select('#companySelect', CREDENTIALS.company);
    await sleep(1500);

    await page.evaluate((user, pass) => {
      const userInput = document.getElementById('userInput');
      const passInput = document.getElementById('passwordInput');
      if (userInput) { userInput.disabled = false; userInput.value = user; }
      if (passInput) { passInput.disabled = false; passInput.value = pass; }
    }, CREDENTIALS.user, CREDENTIALS.password);
    await sleep(500);

    await page.evaluate(() => {
      const form = document.getElementById('multiTenantLoginForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
    });
    await sleep(3000);
    console.log('✅ Login OK\n');

    // NAVEGAR A USUARIOS
    console.log('📂 Navegando a Usuarios...');
    await page.evaluate(() => showTab('users'));
    await sleep(3000);

    // TOMAR SCREENSHOT
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'TEST-usuarios-actual.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot: ${screenshotPath}\n`);

    // VERIFICAR BOTONES EN ACCIONES
    const verificacion = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const results = [];

      rows.forEach((row, idx) => {
        if (idx > 4) return; // Solo primeras 5 filas

        const actionCell = row.querySelector('td:last-child');
        const buttons = actionCell ? actionCell.querySelectorAll('button') : [];
        const deptCell = row.querySelector('td:nth-child(3)');
        const deptText = deptCell ? deptCell.textContent.trim() : 'N/A';

        results.push({
          fila: idx + 1,
          botones: buttons.length,
          tiposBotones: Array.from(buttons).map(b => b.title || b.className || 'sin-titulo'),
          departamento: deptText.substring(0, 30)
        });
      });

      return results;
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('  VERIFICACIÓN DE TABLA DE USUARIOS');
    console.log('═══════════════════════════════════════════════════\n');

    verificacion.forEach(v => {
      const botonOK = v.botones === 1 ? '✅' : '❌';
      const deptOK = !v.departamento.includes('[object') ? '✅' : '❌';

      console.log(`Fila ${v.fila}:`);
      console.log(`  ${botonOK} Botones: ${v.botones} (esperado: 1)`);
      console.log(`  ${deptOK} Depto: "${v.departamento}"`);
      console.log(`     Tipos: ${v.tiposBotones.join(', ')}`);
      console.log('');
    });

    // RESUMEN
    const allBotonesOK = verificacion.every(v => v.botones === 1);
    const allDeptosOK = verificacion.every(v => !v.departamento.includes('[object'));

    console.log('═══════════════════════════════════════════════════');
    console.log('  RESULTADO:');
    console.log(`  ${allBotonesOK ? '✅' : '❌'} Botones: ${allBotonesOK ? 'SOLO 1 BOTÓN VER' : 'MÚLTIPLES BOTONES'}`);
    console.log(`  ${allDeptosOK ? '✅' : '❌'} Departamento: ${allDeptosOK ? 'TEXTO CORRECTO' : '[object Object] DETECTADO'}`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('🖥️ Navegador abierto. Ctrl+C para cerrar.\n');
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    await new Promise(() => {});
  }
}

main().catch(console.error);
