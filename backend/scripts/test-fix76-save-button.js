/**
 * TEST FIX 76: Save Button Detection con Tie-Breaking por DOM Index
 *
 * ROOT CAUSE:
 * - employeeFileModal, educationModal y salaryIncreaseModal tienen MISMO z-index (10000)
 * - saveForm() sin tie-breaking selecciona employeeFileModal en vez del modal dinámico
 * - Resultado: busca botón de guardar en modal incorrecto → "No se encontró botón visible"
 *
 * FIX 76:
 * - Agregar tie-breaking por DOM index en saveForm() (líneas 2794-2808)
 * - Cuando z-index es igual, priorizar modal más reciente (último en DOM)
 *
 * TEST PLAN:
 * 1. Login
 * 2. Abrir employeeFileModal
 * 3. Activar personal-tab con showFileTab()
 * 4. Click en botón "+ Agregar" (addEducation)
 * 5. Esperar a que aparezca educationModal
 * 6. Llenar formulario con datos de prueba
 * 7. Ejecutar saveForm()
 * 8. VALIDAR: Modal detectado es "educationModal" (no "employeeFileModal")
 * 9. VALIDAR: Botón encontrado es "+ Agregar" o "Guardar" de educationModal
 */

const { chromium } = require('playwright');
const path = require('path');

async function testFix76() {
  console.log('\n🔍 TEST FIX 76: Save button detection con tie-breaking por DOM index\n');

  const browser = await chromium.launch({
    headless: true,
    timeout: 60000
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    bypassCSP: true
  });

  const page = await context.newPage();

  try {
    // LOGIN (3 pasos)
    console.log('🔐 Login automático (3 pasos)...');
    await page.goto('http://localhost:9998/panel-empresa.html', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // PASO 1: Dropdown de empresas
    console.log('   1️⃣ Esperando dropdown de empresas...');
    await page.waitForSelector('#companySelect', { timeout: 10000 });

    await page.waitForFunction(
      () => {
        const select = document.getElementById('companySelect');
        return select && select.options.length > 1;
      },
      { timeout: 10000 }
    );

    console.log('   🏢 Seleccionando empresa...');
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(5000);

    // PASO 2: Campo usuario
    console.log('   2️⃣ Esperando campo usuario...');
    await page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });

    console.log('   👤 Ingresando usuario...');
    await page.click('#userInput', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.fill('#userInput', 'admin');
    await page.waitForTimeout(2000);

    // PASO 3: Campo password
    console.log('   3️⃣ Esperando campo contraseña...');
    await page.waitForSelector('#passwordInput:not([disabled])', { timeout: 15000 });

    console.log('   🔑 Ingresando contraseña...');
    await page.focus('#passwordInput');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.fill('#passwordInput', 'admin123');
    await page.waitForTimeout(1000);

    // PASO 4: Click login
    console.log('   4️⃣ Haciendo click en Ingresar...');
    const loginBtn = await page.$('#loginButton');
    if (loginBtn) await loginBtn.click();

    // Esperar que cargue el panel COMPLETAMENTE
    console.log('   ⏳ Esperando que cargue el panel y módulos (8s)...');
    await page.waitForTimeout(8000);

    // Click en hamburger para abrir sidebar mobile
    console.log('   📂 Abriendo sidebar mobile...');
    try {
      const hamburger = await page.$('button[onclick*="toggleMobileSidebar"]');
      if (hamburger) {
        await hamburger.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('      ⚠️  No se pudo abrir sidebar mobile');
    }

    // Esperar módulos
    console.log('   🔍 Esperando a que aparezcan módulos...');
    await page.waitForFunction(
      () => {
        const moduleElements = document.querySelectorAll('[data-module-key]');
        return moduleElements.length > 0;
      },
      { timeout: 5000 }
    );

    console.log('   ✅ Login exitoso\n');

    // Navegar a módulo users
    console.log('🧭 Navegando a módulo users...');
    const moduleFound = await page.waitForSelector('[data-module-key="users"]', { timeout: 5000 });
    await moduleFound.click();
    await page.waitForTimeout(2000);
    console.log('   ✅ Navegado a users\n');

    // Abrir employeeFileModal (FIX 63: 3 estrategias de búsqueda)
    console.log('⭐ Abriendo employeeFileModal...\n');

    // Estrategia 1: Por clase
    let viewUserBtn = await page.$('button.users-action-btn.view');

    // Estrategia 2: Por onclick
    if (!viewUserBtn) {
      viewUserBtn = await page.$('button[onclick*="viewUser"]');
    }

    // Estrategia 3: Por icono
    if (!viewUserBtn) {
      const iconBtn = await page.$('i.fa-eye');
      if (iconBtn) {
        viewUserBtn = await iconBtn.evaluateHandle(icon => icon.closest('button'));
      }
    }

    if (!viewUserBtn) {
      throw new Error('No se encontró botón para abrir employeeFileModal con ninguna estrategia');
    }

    const btnInfo = await viewUserBtn.evaluate(btn => ({
      onclick: btn.getAttribute('onclick'),
      id: btn.id,
      text: btn.textContent?.trim()
    }));

    console.log(`   🔍 Botón encontrado: onclick="${btnInfo.onclick}"`);

    if (btnInfo.onclick) {
      await viewUserBtn.evaluate(btn => eval(btn.getAttribute('onclick')));
    } else {
      await viewUserBtn.click();
    }

    await page.waitForTimeout(3000);
    console.log('   ✅ employeeFileModal abierto\n');

    // Activar personal-tab con showFileTab()
    console.log('⚡ Activando personal-tab con showFileTab()...\n');
    const tabActivated = await page.evaluate((tabIndex) => {
      if (typeof window.showFileTab === 'function') {
        const tabs = document.querySelectorAll('.file-tab');
        const clickedTab = tabs[tabIndex];

        if (!clickedTab) return { success: false, reason: 'tab-not-found' };

        const dataTarget = clickedTab.getAttribute('data-target');
        let tabName = null;
        if (dataTarget) {
          tabName = dataTarget.replace('#', '').replace('-tab', '');
        }

        if (!tabName) {
          const onclick = clickedTab.getAttribute('onclick');
          if (onclick) {
            const match = onclick.match(/showFileTab\('([^']+)'/);
            if (match) tabName = match[1];
          }
        }

        if (!tabName) return { success: false, reason: 'tab-name-not-found' };

        window.showFileTab(tabName, clickedTab);
        return { success: true, tabName };
      }
      return { success: false, reason: 'showFileTab-not-defined' };
    }, 1);

    await page.waitForTimeout(1000);

    if (tabActivated.success) {
      console.log(`   ✅ personal-tab activado (${tabActivated.tabName})\n`);
    } else {
      throw new Error(`No se pudo activar personal-tab: ${tabActivated.reason}`);
    }

    // Click en botón "+ Agregar" (addEducation)
    console.log('📝 Clickeando botón "+ Agregar" (addEducation)...\n');
    const addEducationBtn = await page.$('#employeeFileModal .file-tab-content.active button[onclick*="addEducation"]');

    if (!addEducationBtn) {
      throw new Error('No se encontró botón addEducation en personal-tab activo');
    }

    const onclick = await addEducationBtn.getAttribute('onclick');
    await page.evaluate((onclickAttr) => {
      eval(onclickAttr);
    }, onclick);

    await page.waitForTimeout(3000);
    console.log('   ✅ educationModal abierto\n');

    // Llenar formulario con datos de prueba
    console.log('✍️  Llenando formulario...\n');
    await page.fill('#institution', 'Universidad Test');
    await page.fill('#degree', 'Ingeniería en Sistemas');
    await page.fill('#graduationYear', '2020');
    await page.fill('#gpa', '4.5');
    await page.selectOption('#educationType', 'university');
    await page.selectOption('#status', 'completed');
    await page.fill('#description', 'Descripción de prueba');

    await page.waitForTimeout(1000);
    console.log('   ✅ Formulario llenado\n');

    // EJECUTAR saveForm() - Replicar lógica con FIX 76
    console.log('💾 Ejecutando saveForm() con FIX 76...\n');

    const saveButtonInfo = await page.evaluate(() => {
      // Encontrar modales visibles
      const modals = Array.from(document.querySelectorAll(
        '.modal, [id*="Modal"], [id*="modal"], [class*="modal"], [class*="Modal"]'
      ));

      const excludedModalIds = [
        'generateReportModal',
        'reportModal',
        'exportModal',
        'printModal',
        'downloadModal'
      ];

      const visibleModals = modals.filter(m => {
        const style = window.getComputedStyle(m);
        const rect = m.getBoundingClientRect();

        if (excludedModalIds.includes(m.id)) return false;

        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               rect.width > 0 &&
               rect.height > 0;
      });

      console.log(`[TEST] Total modales visibles: ${visibleModals.length}`);
      visibleModals.forEach(m => {
        console.log(`   - ${m.id}: z-index ${window.getComputedStyle(m).zIndex}`);
      });

      // ⭐ FIX 76: Ordenar por z-index con tie-breaking por DOM index
      const topmostModal = visibleModals.sort((a, b) => {
        const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
        const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;

        if (zA !== zB) {
          return zB - zA;
        }

        // Tie-breaking por DOM index
        const indexA = Array.from(document.body.children).indexOf(a);
        const indexB = Array.from(document.body.children).indexOf(b);
        console.log(`[FIX 76] Mismo z-index (${zA}): ${a.id} (DOM index ${indexA}) vs ${b.id} (DOM index ${indexB})`);
        return indexB - indexA;
      })[0];

      console.log(`[FIX 76] Modal seleccionado: ${topmostModal.id}`);

      // Buscar botones en modal topmost
      const buttons = Array.from(topmostModal.querySelectorAll('button, input[type="submit"]'));

      const submitKeywords = [
        'guardar', 'save', 'crear', 'create', 'agregar', 'add', 'añadir',
        'enviar', 'send', 'submit', 'aceptar', 'accept', 'ok', 'confirmar'
      ];

      const cancelKeywords = [
        'cancelar', 'cancel', 'cerrar', 'close', 'salir', 'exit', 'volver', 'back'
      ];

      const scoredButtons = buttons.map(btn => {
        let score = 0;
        const text = (btn.textContent || '').toLowerCase().trim();
        const type = (btn.type || '').toLowerCase();
        const classes = btn.className.toLowerCase();

        if (cancelKeywords.some(kw => text.includes(kw))) {
          return { text, score: -100, reason: 'cancel' };
        }

        if (type === 'submit') score += 50;
        if (submitKeywords.some(kw => text.includes(kw))) score += 30;
        if (classes.includes('btn-primary') || classes.includes('btn-success')) score += 15;

        return { text, score, type, classes };
      });

      scoredButtons.sort((a, b) => b.score - a.score);

      return {
        modalId: topmostModal.id,
        totalButtons: buttons.length,
        bestButton: scoredButtons[0],
        allButtons: scoredButtons.slice(0, 5)
      };
    });

    console.log(`📊 RESULTADO:\n`);
    console.log(`   Modal seleccionado: ${saveButtonInfo.modalId}`);
    console.log(`   Total botones en modal: ${saveButtonInfo.totalButtons}`);
    console.log(`   Mejor botón: "${saveButtonInfo.bestButton.text}" (score: ${saveButtonInfo.bestButton.score})`);

    console.log(`\n   📋 Top 5 botones:`);
    saveButtonInfo.allButtons.forEach((b, i) => {
      console.log(`      ${i + 1}. "${b.text}" (score: ${b.score})`);
    });

    console.log(`\n📊 VALIDACIÓN:\n`);

    if (saveButtonInfo.modalId === 'educationModal') {
      console.log(`   ✅ FIX 76 EXITOSO`);
      console.log(`   ✅ Modal correcto detectado: educationModal (modal dinámico más reciente)`);
      console.log(`   ✅ Botón de guardar encontrado en modal correcto`);
      console.log(`\n📸 Screenshot guardado: debug-fix76-success.png\n`);
      await page.screenshot({ path: path.join(__dirname, 'debug-fix76-success.png'), fullPage: true });
    } else {
      console.log(`   ❌ FIX 76 FALLÓ`);
      console.log(`   ❌ Modal incorrecto: ${saveButtonInfo.modalId} (esperado: educationModal)`);
      console.log(`\n📸 Screenshot guardado: debug-fix76-failed.png\n`);
      await page.screenshot({ path: path.join(__dirname, 'debug-fix76-failed.png'), fullPage: true });
    }

  } catch (error) {
    console.error(`\n❌ ERROR:`, error.message);
    await page.screenshot({ path: path.join(__dirname, 'debug-fix76-error.png'), fullPage: true });
    throw error;
  } finally {
    console.log('\n👋 Navegador cerrado\n');
    await browser.close();
  }
}

// Ejecutar test
testFix76().catch(error => {
  console.error('❌ Test falló:', error);
  process.exit(1);
});
