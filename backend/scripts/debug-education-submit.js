/**
 * DEBUG: Verificar por qué el submit del formulario de educación no envía POST
 */

const { chromium } = require('playwright');

async function debugEducationSubmit() {
  console.log('🔬 DEBUG: Submit del formulario de educación\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // Capturar console logs del browser
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('EDUCATION') || text.includes('Error') || text.includes('POST')) {
      console.log('[BROWSER]', msg.type(), text.substring(0, 200));
    }
  });

  try {
    // Login
    console.log('1️⃣ Login...');
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

    // Navegar a Users
    console.log('\n2️⃣ Navegar a Users...');
    await page.evaluate(() => {
      const mod = document.querySelector('[data-module-key="users"]');
      if (mod) mod.click();
    });
    await page.waitForTimeout(2000);
    console.log('   ✅ Módulo cargado');

    // Abrir modal usuario
    console.log('\n3️⃣ Abrir modal usuario...');
    await page.evaluate(() => {
      const btn = document.querySelector('table tbody tr:first-child button.users-action-btn.view');
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);
    console.log('   ✅ Modal abierto');

    // Tab Personal
    console.log('\n4️⃣ Tab Personal...');
    await page.evaluate(() => {
      const tab = document.querySelector('[onclick*="showFileTab"]');
      // Buscar específicamente el tab "personal"
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const personalTab = tabs.find(t => t.getAttribute('onclick').includes('personal'));
      if (personalTab) personalTab.click();
    });
    await page.waitForTimeout(2000);
    console.log('   ✅ Tab activado');

    // Abrir modal educación
    console.log('\n5️⃣ Abrir modal educación...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#personal-tab button'));
      const addBtn = buttons.find(b =>
        b.textContent.includes('Agregar') &&
        b.getAttribute('onclick') &&
        b.getAttribute('onclick').includes('addEducation')
      );
      if (addBtn) {
        console.log('Click en:', addBtn.textContent);
        addBtn.click();
      }
    });
    await page.waitForTimeout(2000);

    // Verificar que el modal está abierto y tiene el form
    const formInfo = await page.evaluate(() => {
      const modal = document.getElementById('educationModal');
      const form = document.getElementById('educationForm');

      if (!modal) return { error: 'Modal no encontrado' };
      if (!form) return { error: 'Form no encontrado' };

      return {
        modalVisible: getComputedStyle(modal).display !== 'none',
        formExists: true,
        hasOnsubmit: typeof form.onsubmit === 'function',
        formId: form.id,
        submitButton: form.querySelector('button[type="submit"]') ? 'existe' : 'no existe'
      };
    });
    console.log('   📋 Form info:', JSON.stringify(formInfo));

    if (formInfo.error) {
      throw new Error(formInfo.error);
    }

    // Llenar formulario
    console.log('\n6️⃣ Llenar formulario...');
    const testInstitution = 'UNIVERSIDAD_SUBMIT_TEST_' + Date.now();
    await page.fill('#institution', testInstitution);
    await page.fill('#degree', 'Ingeniería Test');
    await page.fill('#graduationYear', '2023');
    await page.fill('#gpa', '90');
    await page.selectOption('#educationType', 'universitaria');
    await page.selectOption('#status', 'completed');
    console.log('   ✅ Formulario llenado:', testInstitution);

    // Capturar requests
    let postCaptured = false;
    let postResponse = null;

    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('education')) {
        postCaptured = true;
        console.log('   📤 POST enviado:', req.url());
        console.log('   📤 Body:', req.postData());
      }
    });

    page.on('response', async res => {
      if (res.request().method() === 'POST' && res.url().includes('education')) {
        postResponse = { status: res.status() };
        try {
          postResponse.body = await res.json();
        } catch(e) {}
        console.log('   📥 Response:', res.status());
      }
    });

    // INTENTAR SUBMIT DE TRES FORMAS
    console.log('\n7️⃣ Intentando submit...');

    // Método 1: Click en botón submit
    console.log('   Método 1: Click en button[type=submit]');
    await page.evaluate(() => {
      const submitBtn = document.querySelector('#educationForm button[type="submit"]');
      if (submitBtn) {
        console.log('Clicking submit button...');
        submitBtn.click();
      }
    });
    await page.waitForTimeout(2000);

    if (!postCaptured) {
      // Método 2: dispatchEvent submit
      console.log('   Método 2: dispatchEvent submit');
      await page.evaluate(() => {
        const form = document.getElementById('educationForm');
        if (form) {
          console.log('Dispatching submit event...');
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
      await page.waitForTimeout(2000);
    }

    if (!postCaptured) {
      // Método 3: Llamar onsubmit directamente
      console.log('   Método 3: form.onsubmit() directo');
      await page.evaluate(() => {
        const form = document.getElementById('educationForm');
        if (form && typeof form.onsubmit === 'function') {
          console.log('Calling form.onsubmit directly...');
          const fakeEvent = { preventDefault: () => {} };
          form.onsubmit(fakeEvent);
        }
      });
      await page.waitForTimeout(3000);
    }

    // Resultado
    console.log('\n========== RESULTADO ==========');
    console.log('POST enviado:', postCaptured ? '✅ SÍ' : '❌ NO');
    if (postResponse) {
      console.log('Response status:', postResponse.status);
      console.log('Response body:', JSON.stringify(postResponse.body).substring(0, 200));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugEducationSubmit();
