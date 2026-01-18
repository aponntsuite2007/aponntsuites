/**
 * TEST: Tab 3 (Antecedentes Laborales) - CRUD
 */
const { chromium } = require('playwright');

async function testTab3Work() {
  console.log('🧪 TEST: Tab 3 (Antecedentes Laborales) - CRUD');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = { create: false, read: false, persistence: false };

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WORK') || text.includes('Error')) {
      console.log('[🖥️]', msg.type(), text.substring(0, 120));
    }
  });

  try {
    // Login
    console.log('\n1️⃣ Login...');
    await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#companySelect', { timeout: 10000 });
    await page.waitForFunction(() => document.getElementById('companySelect').options.length > 1, { timeout: 10000 });
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(3000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(5000);
    console.log('   ✅ Login OK');

    // Users
    await page.evaluate(() => document.querySelector('[data-module-key="users"]').click());
    await page.waitForTimeout(2000);
    await page.evaluate(() => document.querySelector('table tbody tr:first-child button.users-action-btn.view').click());
    await page.waitForTimeout(2000);

    // Tab Work
    console.log('\n2️⃣ Tab Work...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'work'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    // Obtener userId
    const userId = await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addWorkHistory"]');
      if (!btn) return null;
      const match = btn.getAttribute('onclick').match(/addWorkHistory\(['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    });
    console.log('   👤 userId:', userId);

    if (!userId) {
      // Buscar otro botón
      const altBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#work-tab button'));
        return btns.map(b => ({ text: b.textContent, onclick: b.getAttribute('onclick')?.substring(0, 50) }));
      });
      console.log('   Botones encontrados:', JSON.stringify(altBtn));
    }

    // Ver registros ANTES
    const workBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      try {
        const res = await fetch(`/api/v1/users/${uid}/work-history`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return { error: res.status };
        return await res.json();
      } catch(e) {
        return { error: e.message };
      }
    }, userId);
    console.log('   Registros ANTES:', Array.isArray(workBefore) ? workBefore.length : workBefore);

    // CREATE
    console.log('\n3️⃣ CREATE...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addWorkHistory"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    // Verificar modal
    const modalOpen = await page.evaluate(() => {
      const modal = document.getElementById('workHistoryModal');
      return modal && getComputedStyle(modal).display !== 'none';
    });

    if (!modalOpen) {
      console.log('   ❌ Modal no se abrió - buscando alternativa');
      // Intentar abrir cualquier modal de trabajo
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#work-tab button'));
        const addBtn = btns.find(b => b.textContent.includes('Agregar'));
        if (addBtn) addBtn.click();
      });
      await page.waitForTimeout(1500);
    }

    // Llenar formulario
    const testCompany = 'EMPRESA_TEST_' + Date.now();

    const filled = await page.evaluate(async (company) => {
      const companyInput = document.getElementById('company');
      const positionInput = document.getElementById('position');
      const startDateInput = document.getElementById('startDate');

      if (!companyInput) return { error: 'Campo company no encontrado' };

      companyInput.value = company;
      if (positionInput) positionInput.value = 'Desarrollador Test';
      if (startDateInput) startDateInput.value = '2020-01-15';

      return { success: true };
    }, testCompany);

    console.log('   Formulario:', JSON.stringify(filled));

    // Submit
    await page.evaluate(() => {
      const form = document.getElementById('workHistoryForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(3000);

    // Verificar
    const workAfter = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      try {
        const res = await fetch(`/api/v1/users/${uid}/work-history`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return { error: res.status };
        return await res.json();
      } catch(e) {
        return { error: e.message };
      }
    }, userId);

    const beforeCount = Array.isArray(workBefore) ? workBefore.length : 0;
    const afterCount = Array.isArray(workAfter) ? workAfter.length : 0;

    results.create = afterCount > beforeCount;
    console.log('   Registros DESPUÉS:', afterCount);
    console.log('   CREATE:', results.create ? '✅ PASS' : '❌ FAIL');

    if (results.create) {
      results.read = true;
      console.log('\n4️⃣ READ: ✅ PASS');

      // PERSISTENCE
      console.log('\n5️⃣ PERSISTENCE (F5)...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Re-login
      const needsLogin = await page.$('#companySelect');
      if (needsLogin) {
        await page.waitForFunction(() => document.getElementById('companySelect').options.length > 1, { timeout: 10000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForTimeout(3000);
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);
      }

      // Verificar persistencia
      const workPersist = await page.evaluate(async (uid) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/users/${uid}/work-history`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        return await res.json();
      }, userId);

      results.persistence = Array.isArray(workPersist) && workPersist.length >= afterCount;
      console.log('   PERSISTENCE:', results.persistence ? '✅ PASS' : '❌ FAIL');
    }

    // RESULTADO
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADO TAB 3 (Antecedentes Laborales):');
    console.log('   CREATE:', results.create ? '✅' : '❌');
    console.log('   READ:', results.read ? '✅' : '❌');
    console.log('   PERSISTENCE:', results.persistence ? '✅' : '❌');

    const allPass = results.create && results.read && results.persistence;
    console.log('\n' + (allPass ? '🎉 TAB 3 COMPLETO - 100% ÉXITO' : '⚠️ TAB 3 PARCIAL'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTab3Work();
