/**
 * TEST FIX 75: Field Discovery con Tie-Breaking por DOM Index
 *
 * ROOT CAUSE:
 * - employeeFileModal y educationModal tienen MISMO z-index (10000)
 * - Sin tie-breaking, se selecciona employeeFileModal en vez de educationModal
 * - Al buscar campos en employeeFileModal, NO se encuentran (están en tab inactivo)
 *
 * FIX 75:
 * - Agregar tie-breaking por DOM index en segunda evaluación de page.evaluate()
 * - Cuando z-index es igual, priorizar modal más reciente (último en DOM)
 *
 * TEST PLAN:
 * 1. Login
 * 2. Abrir employeeFileModal
 * 3. Activar personal-tab con showFileTab()
 * 4. Click en botón "+ Agregar" (addEducation)
 * 5. Esperar a que aparezca educationModal (z-index: 10000, creado DESPUÉS de employeeFileModal)
 * 6. Ejecutar discoverFormFields('insideEmployeeFileModal')
 * 7. VALIDAR: campos descubiertos > 0 (debería encontrar 4 inputs, 2 selects, 1 textarea)
 */

const { chromium } = require('playwright');
const path = require('path');

async function testFix75() {
  console.log('\n🔍 TEST FIX 75: Field discovery con tie-breaking por DOM index\n');

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

    // Abrir employeeFileModal
    console.log('⭐ Abriendo employeeFileModal...\n');
    const viewUserBtn = await page.$('#employeeFileModal-open-btn, button[onclick*="openEmployeeFileModal"], .user-row .btn-view, button:has(i.fa-eye)');

    if (!viewUserBtn) {
      throw new Error('No se encontró botón para abrir employeeFileModal');
    }

    const btnInfo = await viewUserBtn.evaluate(btn => ({
      onclick: btn.getAttribute('onclick'),
      id: btn.id,
      text: btn.textContent?.trim()
    }));

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

        // Extraer nombre del tab desde data-target (ej: "#personal-tab" → "personal")
        let tabName = null;
        const dataTarget = clickedTab.getAttribute('data-target');
        if (dataTarget) {
          tabName = dataTarget.replace('#', '').replace('-tab', '');
        }

        // Si no tiene data-target, intentar desde onclick
        if (!tabName) {
          const onclick = clickedTab.getAttribute('onclick');
          if (onclick) {
            const match = onclick.match(/showFileTab\('([^']+)'/);
            if (match) tabName = match[1];
          }
        }

        if (!tabName) return { success: false, reason: 'tab-name-not-found' };

        // Ejecutar showFileTab()
        window.showFileTab(tabName, clickedTab);
        return { success: true, tabName };
      }
      return { success: false, reason: 'showFileTab-not-defined' };
    }, 1); // Index 1 = personal-tab (0=admin, 1=personal, 2=work, ...)

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
    console.log('   ✅ educationModal abierto (z-index: 10000, creado DESPUÉS de employeeFileModal)\n');

    // EJECUTAR discoverFormFields('insideEmployeeFileModal')
    console.log('🔍 Ejecutando discoverFormFields("insideEmployeeFileModal")...\n');

    // Replicar la lógica de discoverFormFields - segunda evaluación
    const fields = await page.evaluate((context) => {
      const inputs = [];
      let container = null;

      // Buscar TODOS los modales visibles
      const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"], [id*="Modal"]');
      const visibleModals = [];

      for (const m of allModals) {
        const style = window.getComputedStyle(m);
        const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        (m.offsetParent !== null || style.position === 'fixed');

        if (isVisible) {
          const zIndex = parseInt(style.zIndex) || 0;
          visibleModals.push({ element: m, zIndex });
        }
      }

      console.log(`[TEST] Total modales visibles: ${visibleModals.length}`);
      visibleModals.forEach(m => {
        console.log(`   - ${m.element.id}: z-index ${m.zIndex}`);
      });

      // Filtrado condicional según contexto
      const reportModalIds = ['generateReportModal', 'reportModal', 'exportModal', 'printModal'];
      const excludedModalIds = context === 'insideEmployeeFileModal'
        ? reportModalIds
        : [...reportModalIds, 'employeeFileModal'];

      const formModals = visibleModals.filter(m => !excludedModalIds.includes(m.element.id));
      console.log(`[TEST] Modales después de filtro: ${formModals.length}`);
      formModals.forEach(m => {
        console.log(`   - ${m.element.id}: z-index ${m.zIndex}`);
      });

      // Usar modales de formulario si existen, sino todos
      const modalsToSearch = formModals.length > 0 ? formModals : visibleModals;

      // ⭐ FIX 75: Ordenar por z-index DESCENDENTE con tie-breaking por DOM index
      modalsToSearch.sort((a, b) => {
        // Si tienen z-index diferente, priorizar mayor z-index
        if (a.zIndex !== b.zIndex) {
          return b.zIndex - a.zIndex;
        }

        // ⭐ FIX 75: Si tienen MISMO z-index, priorizar el último creado (último en DOM)
        const indexA = Array.from(document.body.children).indexOf(a.element);
        const indexB = Array.from(document.body.children).indexOf(b.element);
        console.log(`[FIX 75] Mismo z-index (${a.zIndex}): ${a.element.id} (DOM index ${indexA}) vs ${b.element.id} (DOM index ${indexB})`);
        return indexB - indexA; // Mayor index = más reciente = prioridad
      });

      // Tomar el modal con mayor z-index (o más reciente si empate)
      if (modalsToSearch.length > 0) {
        container = modalsToSearch[0].element;
        console.log(`[FIELDS] Usando modal "${container.id || 'unknown'}" con z-index ${modalsToSearch[0].zIndex}`);
      }

      // Si aún no hay modal, buscar en toda la página
      if (!container) {
        container = document;
      }

      // Buscar en contenedores específicos
      const searchContainers = [
        container.querySelector('.modal-body'),
        container.querySelector('.modal-content'),
        container.querySelector('form'),
        container.querySelector('.form-group'),
        container // Fallback al modal completo
      ].filter(c => c !== null);

      console.log(`[TEST] Contenedores de búsqueda: ${searchContainers.length}`);

      // Todos los tipos de campos
      const fieldSelectors = [
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
        'select',
        'textarea'
      ];

      // Buscar en TODOS los contenedores posibles
      searchContainers.forEach(cont => {
        fieldSelectors.forEach(selector => {
          cont.querySelectorAll(selector).forEach(field => {
            // Evitar duplicados
            if (inputs.find(i => i.id === field.id && field.id)) {
              return;
            }

            const rect = field.getBoundingClientRect();

            inputs.push({
              tag: field.tagName.toLowerCase(),
              type: field.type || 'text',
              name: field.name || field.id || '',
              id: field.id || '',
              placeholder: field.placeholder || '',
              required: field.required || field.hasAttribute('required'),
              value: field.value || '',
              visible: rect.width > 0 && rect.height > 0
            });
          });
        });
      });

      console.log(`[TEST] Campos encontrados: ${inputs.length}`);
      inputs.slice(0, 5).forEach(f => {
        console.log(`   - ${f.tag} (${f.type}): ${f.name || f.id}, visible: ${f.visible}`);
      });

      return inputs;
    }, 'insideEmployeeFileModal');

    console.log(`\n📊 RESULTADO:\n`);
    console.log(`   ✅ Campos descubiertos: ${fields.length}`);

    if (fields.length > 0) {
      console.log(`\n   🎯 Tipos de campos:`);
      const inputCount = fields.filter(f => f.tag === 'input').length;
      const selectCount = fields.filter(f => f.tag === 'select').length;
      const textareaCount = fields.filter(f => f.tag === 'textarea').length;

      console.log(`      - Inputs: ${inputCount}`);
      console.log(`      - Selects: ${selectCount}`);
      console.log(`      - Textareas: ${textareaCount}`);

      console.log(`\n   📋 Primeros 5 campos:`);
      fields.slice(0, 5).forEach((f, i) => {
        console.log(`      ${i + 1}. ${f.tag} (${f.type}): ${f.name || f.id}`);
      });
    }

    console.log(`\n📊 VALIDACIÓN:\n`);

    if (fields.length === 0) {
      console.log(`   ❌ FIX 75 FALLÓ`);
      console.log(`   ❌ No se encontraron campos (esperado: 7 campos en educationModal)`);
      console.log(`\n📸 Screenshot guardado: debug-fix75-failed.png\n`);
      await page.screenshot({ path: path.join(__dirname, 'debug-fix75-failed.png'), fullPage: true });
    } else {
      console.log(`   ✅ FIX 75 EXITOSO`);
      console.log(`   ✅ Se encontraron ${fields.length} campos`);
      console.log(`   ✅ discoverFormFields() seleccionó educationModal (modal más reciente)`);
      console.log(`\n📸 Screenshot guardado: debug-fix75-success.png\n`);
      await page.screenshot({ path: path.join(__dirname, 'debug-fix75-success.png'), fullPage: true });
    }

  } catch (error) {
    console.error(`\n❌ ERROR:`, error.message);
    await page.screenshot({ path: path.join(__dirname, 'debug-fix75-error.png'), fullPage: true });
    throw error;
  } finally {
    console.log('\n👋 Navegador cerrado\n');
    await browser.close();
  }
}

// Ejecutar test
testFix75().catch(error => {
  console.error('❌ Test falló:', error);
  process.exit(1);
});
