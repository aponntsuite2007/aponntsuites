/**
 * DEBUG: Verificar si el guardado de educación funciona
 * y si la lista #education-list se actualiza
 */

const { chromium } = require('playwright');

async function debugSaveEducation() {
  console.log('🔍 DEBUG: Verificando guardado de educación\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Capturar errores de consola y network
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure()?.errorText
    });
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  try {
    // Login
    console.log('🔐 Haciendo login...');
    await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#companySelect', { timeout: 10000 });
    await page.waitForFunction(() => {
      const select = document.getElementById('companySelect');
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(5000);
    await page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });
    await page.fill('#userInput', 'admin');
    await page.waitForSelector('#passwordInput:not([disabled])', { timeout: 15000 });
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(8000);
    console.log('✅ Login completado\n');

    // Navegar a Users
    console.log('🧭 Navegando a módulo Users...');
    await page.evaluate(() => {
      const userModule = document.querySelector('[data-module-key="users"]');
      if (userModule) userModule.click();
    });
    await page.waitForTimeout(3000);

    // Abrir employeeFileModal
    console.log('👁️ Abriendo modal de usuario...');
    await page.evaluate(() => {
      const viewBtn = document.querySelector('table tbody tr:first-child button.users-action-btn.view');
      if (viewBtn) viewBtn.click();
    });
    await page.waitForTimeout(3000);

    // Activar Tab 2: Datos Personales
    console.log('\n📑 Activando Tab 2: Datos Personales');
    await page.evaluate(() => {
      const tab = document.querySelector('[onclick*="showFileTab(\'personal\')"]');
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    // VER ESTADO INICIAL de #education-list
    const educationListBefore = await page.evaluate(() => {
      const list = document.getElementById('education-list');
      if (!list) return { exists: false };

      return {
        exists: true,
        innerHTML: list.innerHTML.substring(0, 500),
        textContent: list.textContent.substring(0, 300),
        childCount: list.children.length
      };
    });
    console.log('\n📋 #education-list ANTES:', JSON.stringify(educationListBefore, null, 2));

    // Abrir modal de educación
    console.log('\n➕ Abriendo modal de educación...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#personal-tab button'));
      const addBtn = buttons.find(b =>
        b.textContent.includes('Agregar') &&
        b.getAttribute('onclick')?.includes('addEducation')
      );
      if (addBtn) addBtn.click();
    });
    await page.waitForTimeout(2000);

    // Verificar que el modal está abierto
    const modalOpen = await page.evaluate(() => {
      const modal = document.getElementById('educationModal');
      return modal && getComputedStyle(modal).display !== 'none';
    });
    console.log('📋 Modal abierto:', modalOpen);

    // Obtener ID del usuario actual
    const userId = await page.evaluate(() => {
      const form = document.getElementById('educationForm');
      // Buscar el onclick del botón agregar para extraer userId
      const addBtns = Array.from(document.querySelectorAll('button[onclick*="addEducation"]'));
      for (const btn of addBtns) {
        const onclick = btn.getAttribute('onclick');
        const match = onclick?.match(/addEducation\(['"]([^'"]+)['"]\)/);
        if (match) return match[1];
      }
      return null;
    });
    console.log('👤 User ID:', userId);

    // Llenar formulario
    const testData = {
      institution: 'UNIVERSIDAD_TEST_' + Date.now(),
      degree: 'INGENIERIA_TESTING',
      graduationYear: '2023',
      gpa: '90'
    };
    console.log('\n✍️ Llenando formulario:', testData);

    await page.fill('#institution', testData.institution);
    await page.fill('#degree', testData.degree);
    await page.fill('#graduationYear', testData.graduationYear);
    await page.fill('#gpa', testData.gpa);
    await page.selectOption('#educationType', 'universitaria');  // ESPAÑOL - fix aplicado
    await page.selectOption('#status', 'completed');

    // Verificar valores antes de guardar
    const formValues = await page.evaluate(() => {
      return {
        institution: document.getElementById('institution')?.value,
        degree: document.getElementById('degree')?.value,
        graduationYear: document.getElementById('graduationYear')?.value,
        gpa: document.getElementById('gpa')?.value,
        educationType: document.getElementById('educationType')?.value,
        status: document.getElementById('status')?.value
      };
    });
    console.log('📋 Valores del formulario:', JSON.stringify(formValues, null, 2));

    // Buscar botón guardar
    const saveButtonInfo = await page.evaluate(() => {
      const modal = document.getElementById('educationModal');
      if (!modal) return { found: false, error: 'Modal no encontrado' };

      const buttons = Array.from(modal.querySelectorAll('button'));
      const saveBtn = buttons.find(b =>
        b.textContent.toLowerCase().includes('guardar') ||
        b.classList.contains('btn-primary') ||
        b.classList.contains('btn-success')
      );

      if (!saveBtn) return { found: false, buttons: buttons.map(b => b.textContent.trim()) };

      return {
        found: true,
        text: saveBtn.textContent.trim(),
        onclick: saveBtn.getAttribute('onclick'),
        className: saveBtn.className
      };
    });
    console.log('\n💾 Botón guardar:', JSON.stringify(saveButtonInfo, null, 2));

    // Capturar requests antes de guardar
    const requestsCapture = [];
    page.on('request', request => {
      if (request.url().includes('/api/') && request.method() === 'POST') {
        requestsCapture.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/') && response.request().method() === 'POST') {
        try {
          const body = await response.json();
          console.log('📥 Response:', response.url(), response.status(), JSON.stringify(body).substring(0, 200));
        } catch (e) {
          console.log('📥 Response:', response.url(), response.status());
        }
      }
    });

    // Hacer click en guardar
    console.log('\n💾 Haciendo click en guardar...');
    await page.evaluate(() => {
      const modal = document.getElementById('educationModal');
      if (!modal) return;

      const buttons = Array.from(modal.querySelectorAll('button'));
      const saveBtn = buttons.find(b =>
        b.textContent.toLowerCase().includes('guardar') ||
        b.classList.contains('btn-primary')
      );

      if (saveBtn) {
        console.log('Clicking save button:', saveBtn.textContent);
        saveBtn.click();
      }
    });

    // Esperar a que se procese
    await page.waitForTimeout(5000);

    // Ver requests capturadas
    console.log('\n📤 Requests POST capturadas:', requestsCapture.length);
    requestsCapture.forEach(r => console.log('   -', r.url));

    // Ver errores de consola
    console.log('\n❌ Errores de consola:', consoleErrors.length);
    consoleErrors.forEach(e => console.log('   -', e.substring(0, 100)));

    // Ver errores de network
    console.log('\n❌ Errores de network:', networkErrors.length);
    networkErrors.forEach(e => console.log('   -', JSON.stringify(e)));

    // VER ESTADO FINAL de #education-list
    const educationListAfter = await page.evaluate(() => {
      const list = document.getElementById('education-list');
      if (!list) return { exists: false };

      return {
        exists: true,
        innerHTML: list.innerHTML.substring(0, 500),
        textContent: list.textContent.substring(0, 300),
        childCount: list.children.length
      };
    });
    console.log('\n📋 #education-list DESPUÉS:', JSON.stringify(educationListAfter, null, 2));

    // Comparar
    console.log('\n📊 COMPARACIÓN:');
    console.log('   Children antes:', educationListBefore.childCount || 0);
    console.log('   Children después:', educationListAfter.childCount || 0);
    console.log('   Contiene test data:', educationListAfter.textContent?.includes(testData.institution) || false);

    if (educationListAfter.childCount > (educationListBefore.childCount || 0)) {
      console.log('\n✅ GUARDADO EXITOSO - La lista se actualizó');
    } else if (educationListAfter.textContent?.includes(testData.institution)) {
      console.log('\n✅ GUARDADO EXITOSO - Test data encontrado en lista');
    } else {
      console.log('\n❌ GUARDADO FALLÓ - La lista NO se actualizó');
    }

    // Mantener browser abierto
    console.log('\n⏳ Browser abierto para inspección. Ctrl+C para cerrar.');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugSaveEducation();
