/**
 * STANDALONE DISCOVERY SCRIPT
 * Inspecciona un módulo como lo haría un humano
 *
 * Uso: node scripts/discover-module-structure.js users
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MODULE_TO_DISCOVER = process.argv[2] || 'users';

async function discover() {
  console.log(`\n🔍 DISCOVERY: Inspeccionando módulo "${MODULE_TO_DISCOVER}"\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); // Viewport estándar
  const page = await context.newPage();

  // Capturar logs del browser para debug
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`   🔴 [BROWSER ERROR] ${msg.text()}`);
    } else if (msg.text().includes('LOGIN') || msg.text().includes('ERROR') || msg.text().includes('Auth')) {
      console.log(`   📢 [BROWSER] ${msg.text()}`);
    }
  });

  const results = {
    module: MODULE_TO_DISCOVER,
    discoveredAt: new Date().toISOString(),
    entryPoint: {},
    actions: [],
    modals: [],
    relationships: [],
    validations: []
  };

  try {
    // ===== PASO 1: LOGIN =====
    console.log('🔐 PASO 1: Login...');
    await page.goto('http://localhost:9998/panel-empresa.html');
    await page.waitForTimeout(2000);

    // Esperar a que carguen las empresas (cuando hay más de 1 option)
    console.log('   ⏳ Esperando que carguen las empresas...');
    await page.waitForFunction(() => {
      const select = document.querySelector('#companySelect');
      return select && select.options.length > 1;
    }, { timeout: 15000 });

    // Ver qué opciones están disponibles
    const availableCompanies = await page.evaluate(() => {
      const select = document.querySelector('#companySelect');
      return Array.from(select.options).map(opt => ({ value: opt.value, label: opt.textContent.trim() }));
    });
    console.log('   📋 Empresas disponibles:', availableCompanies.map(c => c.label).join(', '));

    // Seleccionar empresa ISI (tiene bypass y credenciales conocidas)
    const companySelect = page.locator('#companySelect').first();
    const isiCompany = availableCompanies.find(c => c.label && c.label.toUpperCase().includes('ISI'));

    if (!isiCompany) {
      console.log('   ⚠️  No se encontró empresa ISI, usando primera disponible');
      const firstCompany = availableCompanies.find(c => c.value && c.value !== '');
      if (!firstCompany) throw new Error('No hay empresas disponibles');
      console.log(`   ✅ Seleccionando empresa: "${firstCompany.label}"`);
      await companySelect.selectOption({ value: firstCompany.value });
    } else {
      console.log(`   ✅ Seleccionando empresa ISI: "${isiCompany.label}"`);
      await companySelect.selectOption({ value: isiCompany.value });
    }

    await page.waitForTimeout(500);

    // Esperar a que el campo de usuario se HABILITE (el campo está disabled al inicio)
    console.log('   ⏳ Esperando que se habilite el campo de usuario...');
    await page.waitForSelector('#userInput:not([disabled])', { timeout: 10000 });

    // Usuario
    await page.locator('#userInput').fill('admin');
    await page.waitForTimeout(500);

    // Esperar a que el campo de password se habilite
    await page.waitForSelector('#passwordInput:not([disabled])', { timeout: 10000 });

    // Password (ISI usa admin123, no admin)
    await page.locator('#passwordInput').fill('admin123');
    await page.waitForTimeout(500);

    // Submit
    const loginBtn = page.locator('button[type="submit"], .btn-login, #loginButton').first();
    await loginBtn.click();
    console.log('   ⏳ Esperando que cargue el dashboard...');

    // Esperar a que desaparezca el botón de login (señal de que logueó)
    await page.waitForFunction(() => {
      const btn = document.querySelector('#loginButton');
      return !btn || !btn.offsetParent; // No existe o no está visible
    }, { timeout: 10000 }).catch(() => console.log('   ⚠️  Login button still visible'));

    // Esperar elementos del dashboard
    await page.waitForTimeout(3000);

    // Verificar si hay elementos de dashboard/sidebar
    const hasDashboard = await page.locator('.dashboard, #dashboard, .content-wrapper, #content').count() > 0;
    console.log(`   ${hasDashboard ? '✅' : '⚠️ '} Dashboard ${hasDashboard ? 'cargado' : 'NO detectado'}`);

    console.log('✅ Login completado');

    // Intentar expandir sidebar si está colapsado
    const sidebarToggle = page.locator('.sidebar-toggle, #sidebarCollapse, [data-toggle="sidebar"], .toggle-sidebar, .hamburger').first();
    if (await sidebarToggle.isVisible().catch(() => false)) {
      console.log('   🔧 Expandiendo sidebar...');
      await sidebarToggle.click();
      await page.waitForTimeout(1500);
    }

    // Screenshot para debug
    await page.screenshot({ path: 'discovery-screenshot-after-login.png', fullPage: true });
    console.log('   📸 Screenshot guardado: discovery-screenshot-after-login.png\n');

    // ===== PASO 2: BUSCAR PUNTO DE ENTRADA AL MÓDULO =====
    console.log('🔍 PASO 2: Buscando punto de entrada al módulo...');

    const possibleEntries = await page.locator('button, a, [onclick], [data-module]').all();

    for (const entry of possibleEntries) {
      const text = await entry.textContent().catch(() => '');
      const onclick = await entry.getAttribute('onclick').catch(() => null);
      const dataModule = await entry.getAttribute('data-module').catch(() => null);
      const id = await entry.getAttribute('id').catch(() => null);

      const textLower = (text || '').toLowerCase().trim();
      const moduleLower = MODULE_TO_DISCOVER.toLowerCase();

      // Buscar match con el módulo
      if (
        textLower.includes(moduleLower) ||
        (onclick && onclick.includes(moduleLower)) ||
        dataModule === MODULE_TO_DISCOVER ||
        id === `btn-${MODULE_TO_DISCOVER}`
      ) {
        results.entryPoint = {
          text: text.trim(),
          onclick,
          dataModule,
          id,
          selector: id ? `#${id}` : null
        };

        console.log(`✅ Punto de entrada: "${text.trim()}" [${id || onclick.substring(0, 40)}]`);

        // Click para abrir el módulo
        await entry.click();
        console.log('   ⏳ Esperando que cargue el contenido del módulo...');
        await page.waitForTimeout(4000); // Más tiempo para que cargue el módulo completamente

        // Esperar a que aparezcan elementos del módulo (tabla o botones)
        await page.waitForFunction(() => {
          const hasTable = document.querySelector('table tbody tr, .table-row, [class*="row-"]');
          const hasButtons = document.querySelector('button.btn-add, .btn-create, button[onclick*="add"], button[onclick*="create"]');
          return hasTable || hasButtons;
        }, { timeout: 5000 }).catch(() => {
          console.log('   ⚠️  Timeout esperando elementos del módulo (puede ser normal si es dashboard)');
        });

        await page.waitForTimeout(1000); // Tiempo extra de estabilización

        // Screenshot después de cargar módulo
        const screenshotPath = `discovery-screenshot-module-${MODULE_TO_DISCOVER}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`   📸 Screenshot guardado: ${screenshotPath}`);

        break;
      }
    }

    if (!results.entryPoint.text) {
      console.log('⚠️  No se encontró punto de entrada específico para módulo "' + MODULE_TO_DISCOVER + '"');
      console.log('   💡 Estrategia: Descubriré TODOS los botones visibles y determinaré cuál corresponde al módulo');

      // Descubrir TODOS los botones visibles en toda la página
      const allVisibleButtons = await page.locator('button:visible, a:visible[onclick], a:visible[href*="javascript"]').all();

      console.log('\n   📋 TODOS los botones visibles en pantalla:');
      const buttonsList = [];
      for (const btn of allVisibleButtons) {
        const btnText = await btn.textContent().catch(() => '');
        const btnId = await btn.getAttribute('id').catch(() => null);
        const btnOnclick = await btn.getAttribute('onclick').catch(() => null);

        if (btnText && btnText.trim().length > 0 && btnText.trim().length < 100) {
          const info = `"${btnText.trim()}"${btnId ? ` [id=${btnId}]` : ''}${btnOnclick ? ` [onclick=${btnOnclick.substring(0, 40)}...]` : ''}`;
          buttonsList.push(info);
          console.log(`      - ${info}`);
        }
      }

      console.log(`\n   ✅ Total botones visibles: ${buttonsList.length}`);

      // Intentar con variaciones del nombre del módulo
      const moduleVariations = [
        MODULE_TO_DISCOVER,
        'usuarios', // users en español
        'gestión de usuarios',
        'crud users',
        'administrar usuarios'
      ];

      for (const variation of moduleVariations) {
        const btn = page.getByText(new RegExp(variation, 'i')).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(2000);
          results.entryPoint = { text: await btn.textContent(), method: 'variation', searchTerm: variation };
          console.log(`\n   ✅ Entrada encontrada por variación "${variation}": "${results.entryPoint.text}"`);
          break;
        }
      }
    }

    // ===== PASO 3: DESCUBRIR ACCIONES =====
    console.log('\n🔍 PASO 3: Descubriendo acciones...');

    const actionElements = await page.locator('button:visible, a.btn:visible, [role="button"]:visible').all();
    const seenTexts = new Set();

    for (const actionEl of actionElements) {
      const text = await actionEl.textContent().catch(() => '');
      const textClean = (text || '').trim();

      if (textClean && textClean.length > 1 && textClean.length < 50 && !seenTexts.has(textClean)) {
        seenTexts.add(textClean);

        const onclick = await actionEl.getAttribute('onclick').catch(() => null);
        const id = await actionEl.getAttribute('id').catch(() => null);
        const className = await actionEl.getAttribute('class').catch(() => null);

        // Clasificar por keywords
        let actionType = 'UNKNOWN';
        const combined = (textClean + ' ' + (onclick || '') + ' ' + (id || '') + ' ' + (className || '')).toLowerCase();

        if (/crear|nuevo|agregar|add|new|create/i.test(combined)) actionType = 'CREATE';
        else if (/editar|modificar|edit|update/i.test(combined)) actionType = 'EDIT';
        else if (/eliminar|borrar|delete|remove/i.test(combined)) actionType = 'DELETE';
        else if (/ver|detalle|detail|view|show|visualizar/i.test(combined)) actionType = 'VIEW';
        else if (/exportar|export|descargar|download/i.test(combined)) actionType = 'EXPORT';
        else if (/importar|import|cargar|upload/i.test(combined)) actionType = 'IMPORT';
        else if (/buscar|search|filtrar|filter/i.test(combined)) actionType = 'SEARCH';

        results.actions.push({
          type: actionType,
          text: textClean,
          id,
          className,
          onclick: onclick ? onclick.substring(0, 100) : null
        });

        console.log(`   [${actionType}] "${textClean}"`);
      }
    }

    console.log(`\n✅ Total acciones: ${results.actions.length}`);

    // ===== PASO 4: BUSCAR BOTONES EN LISTA PRIMERO (antes de abrir modales) =====
    console.log('\n🔍 PASO 4: Buscando botones de acción en registros (Ver/Editar/Eliminar)...\n');
    await discoverActionButtonsInList(page, results);

    // ===== PASO 5: DESCUBRIR MODAL CREATE =====
    console.log('\n🔍 PASO 5: Descubriendo modal CREATE...\n');
    const createAction = results.actions.find(a => a.type === 'CREATE');
    if (createAction) {
      await discoverModalComplete(page, createAction, results, 'CREATE');
    }

    // Descubrir modal EDIT
    const editAction = results.actions.find(a => a.type === 'EDIT');
    if (editAction) {
      await discoverModalComplete(page, editAction, results, 'EDIT');
    }

  } catch (error) {
    console.error('\n❌ Error durante discovery:', error.message);
    results.error = error.message;
  } finally {
    // Guardar resultados
    const outputDir = path.join(__dirname, '../tests/e2e/discovery-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `${MODULE_TO_DISCOVER}.discovery.json`);
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

    console.log(`\n\n📊 ========== RESUMEN ==========`);
    console.log(`   Módulo: ${results.module}`);
    console.log(`   Punto de entrada: ${results.entryPoint.text || 'NO ENCONTRADO'}`);
    console.log(`   Acciones: ${results.actions.length}`);
    console.log(`   Modales: ${results.modals.length}`);
    console.log(`   Campos totales: ${results.modals.reduce((sum, m) => sum + m.fields.length, 0)}`);
    console.log(`   Tabs totales: ${results.modals.reduce((sum, m) => sum + m.tabs.length, 0)}`);
    console.log(`   Relaciones: ${results.modals.reduce((sum, m) => sum + (m.relationships?.length || 0), 0)}`);
    console.log(`\n   📁 ${outputFile}`);
    console.log(`================================\n`);

    await browser.close();
  }
}

// Función para descubrir botones de acción en las filas de la tabla
async function discoverActionButtonsInList(page, results) {
  try {
    // Buscar filas de tabla
    const tableRows = await page.locator('table tbody tr, .table-row, [class*="row-"]').all();

    if (tableRows.length === 0) {
      console.log('   ⚠️  No se encontraron filas de tabla');
      return;
    }

    console.log(`   📋 Encontradas ${tableRows.length} filas en la tabla`);

    // Analizar primera fila para ver qué botones tiene
    const firstRow = tableRows[0];
    const actionButtons = await firstRow.locator('button, a.btn, [onclick], .action-btn').all();

    console.log(`   🔍 Botones de acción por fila: ${actionButtons.length}`);

    for (const btn of actionButtons) {
      const text = await btn.textContent().catch(() => '');
      const onclick = await btn.getAttribute('onclick').catch(() => null);
      const className = await btn.getAttribute('class').catch(() => null);

      // Clasificar tipo de acción
      let actionType = 'UNKNOWN';
      const combined = (text + ' ' + (onclick || '') + ' ' + (className || '')).toLowerCase();

      if (/ver|view|detail|show|visualizar/i.test(combined)) actionType = 'VIEW';
      else if (/editar|edit|modify|update/i.test(combined)) actionType = 'EDIT';
      else if (/eliminar|delete|remove|borrar/i.test(combined)) actionType = 'DELETE';

      console.log(`      [${actionType}] "${text.trim()}" → Probando modal...`);

      // Intentar abrir el modal de esta acción
      if (actionType === 'VIEW' || actionType === 'EDIT') {
        await btn.click();
        await page.waitForTimeout(2000);

        // Buscar modal
        const modal = await findVisibleModal(page);
        if (modal) {
          console.log(`      ✅ Modal ${actionType} encontrado desde botón de fila`);

          // Descubrir este modal completamente
          await discoverModalStructure(page, modal, results, actionType, text.trim());

          // Cerrar modal
          await closeModal(page, modal);
        }

        break; // Solo probar el primer botón VIEW o EDIT
      }
    }

  } catch (error) {
    console.log(`   ⚠️  Error buscando botones en lista: ${error.message}`);
  }
}

// Helper: Encontrar modal visible
async function findVisibleModal(page) {
  const modalSelectors = [
    '.modal.show',
    '.modal.in',
    '.modal[style*="display: block"]',
    '[role="dialog"]',
    '#userModal',
    '#editModal',
    '#viewModal',
    '#employeeFileModal',  // Fullscreen modal de ficha de empleado
    '[data-version*="FULLSCREEN"]',  // Cualquier modal fullscreen
    '.fullscreen-modal'
  ];

  for (const selector of modalSelectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) {
      const modalId = await candidate.getAttribute('id').catch(() => null);
      console.log(`      🔍 Modal encontrado: ${modalId || selector}`);
      return candidate;
    }
  }

  // Buscar TODOS los .modal y ver cuál está visible
  const allModals = await page.locator('.modal, [class*="modal"]').all();
  for (const modal of allModals) {
    const display = await modal.evaluate(el => window.getComputedStyle(el).display).catch(() => 'none');
    if (display === 'block' || await modal.isVisible().catch(() => false)) {
      const modalId = await modal.getAttribute('id').catch(() => null);
      console.log(`      🔍 Modal encontrado (genérico): ${modalId || 'sin ID'}`);
      return modal;
    }
  }

  console.log('      ⚠️  No se encontró ningún modal visible');
  return null;
}

// Helper: Cerrar modal ROBUSTAMENTE
async function closeModal(page, modal) {
  try {
    const modalId = await modal.getAttribute('id').catch(() => 'unknown');
    console.log(`      🔄 Intentando cerrar modal: ${modalId}`);

    // ESTRATEGIA 1: Botón de cerrar (múltiples variantes)
    const closeBtnSelectors = [
      '[data-dismiss="modal"]',
      '.btn-close',
      '.close',
      'button:has-text("Cerrar")',
      'button:has-text("❌")',
      '.modal-header .close',
      '[onclick*="close"]',
      '[onclick*="cerrar"]',
      'i.fa-times'  // Icon-based close button
    ];

    for (const selector of closeBtnSelectors) {
      const closeBtn = modal.locator(selector).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        console.log(`      ✅ Cerrando con botón: ${selector}`);
        await closeBtn.click();
        await page.waitForTimeout(800);

        // Verificar si se cerró
        const isClosed = await page.evaluate((id) => {
          const m = document.getElementById(id);
          return !m || window.getComputedStyle(m).display === 'none';
        }, modalId);

        if (isClosed) {
          console.log(`      ✅ Modal ${modalId} cerrado exitosamente`);
          return;
        }
      }
    }

    // ESTRATEGIA 2: Escape (triple intento)
    console.log(`      ⌨️  Intentando cerrar con Escape...`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // ESTRATEGIA 3: Click en backdrop
    const backdrop = page.locator('.modal-backdrop, .modal-overlay, .backdrop').first();
    if (await backdrop.isVisible().catch(() => false)) {
      console.log(`      🖱️  Intentando click en backdrop...`);
      await backdrop.click({ force: true });
      await page.waitForTimeout(500);
    }

    // ESTRATEGIA 4: Forzar ocultar via JavaScript (último recurso)
    console.log(`      ⚡ Forzando cierre via JavaScript...`);
    await page.evaluate((id) => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show', 'in');
        modal.setAttribute('aria-hidden', 'true');
      }
      // Remover backdrop
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(b => b.remove());
      // Restaurar scroll del body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }, modalId);

    await page.waitForTimeout(1000);
    console.log(`      ✅ Modal ${modalId} cerrado (forzado)`);

  } catch (error) {
    console.log(`      ⚠️  Error cerrando modal: ${error.message}`);
  }
}

// Función para descubrir la estructura completa de un modal (incluyendo tabs)
async function discoverModalStructure(page, modal, results, actionType, triggerAction) {
  const modalStructure = {
    type: actionType,
    triggerAction,
    fields: [],
    tabs: [],
    tabContents: {}, // NUEVO: Contenido de cada tab
    relationships: []
  };

  console.log(`\n   📋 Analizando modal ${actionType}...`);

  // PASO 1: Descubrir TABS (estándar o custom)
  let tabs = await modal.locator('[role="tab"], .nav-link, .tab-item, li.nav-item a, .nav-tabs a').all();
  let tabType = 'bootstrap';

  // Si no hay tabs estándar, buscar CUSTOM TABS (botones con onclick que cambian tabs)
  if (tabs.length === 0) {
    const customTabButtons = await modal.locator('button[onclick*="showTab"], button[onclick*="showFileTab"], button[onclick*="switchTab"]').all();
    if (customTabButtons.length > 0) {
      console.log(`   🔍 Detectados ${customTabButtons.length} tabs CUSTOM (onclick con showTab/showFileTab)`);
      tabs = customTabButtons;
      tabType = 'custom';
    }
  }

  if (tabs.length > 0) {
    console.log(`   📑 Encontrados ${tabs.length} tabs (${tabType}) en el modal`);

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tabText = await tab.textContent().catch(() => '');
      const tabId = await tab.getAttribute('id').catch(() => null);
      const onclick = await tab.getAttribute('onclick').catch(() => null);

      if (!tabText || tabText.trim().length === 0) continue;

      const tabName = tabText.trim();
      modalStructure.tabs.push({ index: i, text: tabName, id: tabId, onclick, type: tabType });

      console.log(`\n      📑 TAB ${i + 1}/${tabs.length}: "${tabName}"`);

      // Click en el tab para activarlo
      await tab.click().catch(() => {});
      await page.waitForTimeout(1500); // Más tiempo para custom tabs

      // Descubrir TODOS los elementos dentro de este tab
      const tabContent = await discoverTabContent(page, modal, tabName);
      modalStructure.tabContents[tabName] = tabContent;

      console.log(`         ✅ ${tabContent.fields.length} campos, ${tabContent.buttons.length} botones, ${tabContent.sections.length} secciones`);
    }
  } else {
    // No hay tabs, descubrir contenido directo del modal
    console.log(`   📝 Modal sin tabs, descubriendo contenido directo...`);
    const content = await discoverTabContent(page, modal, 'main');
    modalStructure.fields = content.fields;
    modalStructure.tabContents['main'] = content;
  }

  results.modals.push(modalStructure);

  console.log(`\n   ✅ Modal ${actionType} completo:`);
  console.log(`      - ${modalStructure.tabs.length} tabs`);
  const totalFields = Object.values(modalStructure.tabContents).reduce((sum, tab) => sum + tab.fields.length, 0);
  console.log(`      - ${totalFields} campos totales`);
}

// Función para descubrir todo el contenido de un tab
async function discoverTabContent(page, modal, tabName) {
  const content = {
    fields: [],
    buttons: [],
    sections: [],
    tables: []
  };

  // Descubrir CAMPOS (inputs, selects, textareas)
  const inputs = await modal.locator('input:visible, select:visible, textarea:visible').all();

  for (const input of inputs) {
    const name = await input.getAttribute('name').catch(() => null);
    const type = await input.getAttribute('type').catch(() => null);
    const required = await input.getAttribute('required').catch(() => null);
    const readonly = await input.getAttribute('readonly').catch(() => null);
    const placeholder = await input.getAttribute('placeholder').catch(() => null);
    const tagName = await input.evaluate(el => el.tagName.toLowerCase());

    if (type === 'hidden') continue; // Skip hidden

    // Buscar label
    let label = '';
    const inputId = await input.getAttribute('id').catch(() => null);
    if (inputId) {
      const labelEl = page.locator(`label[for="${inputId}"]`).first();
      label = await labelEl.textContent().catch(() => '');
    }

    // Si no hay label, buscar texto cerca del input
    if (!label || label.trim().length === 0) {
      const parent = await input.locator('..').first();
      const parentText = await parent.textContent().catch(() => '');
      // Tomar primeras 50 chars como posible label
      label = parentText.substring(0, 50).trim();
    }

    const fieldInfo = {
      name,
      label: label.trim() || name || `campo_${content.fields.length + 1}`,
      type: type || tagName,
      tagName,
      required: required !== null,
      readonly: readonly !== null,
      placeholder
    };

    content.fields.push(fieldInfo);

    // Detectar relaciones (selects)
    if (tagName === 'select') {
      const options = await input.locator('option').count();
      if (options > 1) {
        const relationshipTo = detectRelationship(name);
        if (relationshipTo) {
          console.log(`         └─ Campo "${fieldInfo.label}" → Relación con ${relationshipTo}`);
        }
      }
    }
  }

  // Descubrir BOTONES dentro del tab (excluyendo tab navigation)
  const buttons = await modal.locator('button:visible, a.btn:visible').all();
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    const onclick = await btn.getAttribute('onclick').catch(() => null);

    // Filtrar botones de navegación de tabs
    const isTabNavigationButton = onclick && (
      onclick.includes('showTab') ||
      onclick.includes('showFileTab') ||
      onclick.includes('switchTab')
    );

    if (text && text.trim().length > 0 && text.trim().length < 50 && !isTabNavigationButton) {
      content.buttons.push({ text: text.trim(), onclick });
    }
  }

  // Descubrir SECCIONES/TÍTULOS dentro del tab
  const headings = await modal.locator('h1, h2, h3, h4, h5, h6, .section-title, .card-title').all();
  for (const heading of headings) {
    const text = await heading.textContent().catch(() => '');
    if (text && text.trim().length > 0) {
      content.sections.push(text.trim());
    }
  }

  return content;
}

// Función principal para descubrir un modal completo (con tabs)
async function discoverModalComplete(page, action, results, actionType) {
  console.log(`\n🔍 Descubriendo modal ${actionType}...`);

  try {
    // Click en la acción
    const actionBtn = action.id
      ? page.locator(`#${action.id}`)
      : page.getByText(action.text, { exact: false }).first();

    await actionBtn.click();
    console.log(`   ⏳ Esperando que aparezca modal...`);
    await page.waitForTimeout(3000);

    // Buscar modal visible
    const modal = await findVisibleModal(page);

    if (!modal) {
      console.log(`   ⚠️  No se detectó modal ${actionType}`);
      return;
    }

    console.log(`   ✅ Modal ${actionType} encontrado`);

    // Descubrir estructura completa del modal (incluyendo todos los tabs)
    await discoverModalStructure(page, modal, results, actionType, action.text);

    // Cerrar modal
    await closeModal(page, modal);

  } catch (error) {
    console.log(`   ❌ Error descubriendo modal ${actionType}: ${error.message}`);
  }
}

function detectRelationship(fieldName) {
  if (!fieldName) return null; // NULL CHECK
  const name = fieldName.toLowerCase();
  if (/empresa|company/.test(name)) return 'companies';
  if (/departamento|department/.test(name)) return 'departments';
  if (/usuario|user/.test(name)) return 'users';
  if (/cargo|position|puesto/.test(name)) return 'positions';
  if (/turno|shift/.test(name)) return 'shifts';
  if (/rol|role/.test(name)) return 'roles';
  return null;
}

// Ejecutar
discover().catch(console.error);
