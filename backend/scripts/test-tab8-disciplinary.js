/**
 * TEST: Tab 8 (Acciones Disciplinarias) - CRUD
 */
const { chromium } = require('playwright');

async function testTab8Disciplinary() {
  console.log('🧪 TEST: Tab 8 (Acciones Disciplinarias) - CRUD');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = { create: false, read: false, persistence: false };

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('DISCIPLINARY') || text.includes('Error')) {
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

    // Tab Disciplinary
    console.log('\n2️⃣ Tab Disciplinary...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'disciplinary'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    // Obtener userId
    const userId = await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addDisciplinaryAction"]');
      if (!btn) return null;
      const match = btn.getAttribute('onclick').match(/addDisciplinaryAction\(['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    });
    console.log('   👤 userId:', userId);

    // Ver acciones ANTES via API
    const actionsBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      try {
        const res = await fetch(`/api/v1/user-admin/${uid}/disciplinary`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return { error: res.status };
        return await res.json();
      } catch(e) {
        return { error: e.message };
      }
    }, userId);
    console.log('   Acciones ANTES:', Array.isArray(actionsBefore) ? actionsBefore.length : actionsBefore);

    // CREATE - Abrir modal
    console.log('\n3️⃣ CREATE (Agregar Acción Disciplinaria)...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addDisciplinaryAction"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    // Verificar modal
    const modalOpen = await page.evaluate(() => {
      const modal = document.getElementById('disciplinaryModal');
      return modal && modal.style.display !== 'none';
    });
    console.log('   Modal abierto:', modalOpen);

    if (modalOpen) {
      // Llenar formulario
      const testDate = new Date().toISOString().split('T')[0];

      await page.evaluate((date) => {
        document.getElementById('actionType').value = 'advertencia_verbal';
        document.getElementById('actionDate').value = date;
        document.getElementById('reason').value = 'MOTIVO_TEST_' + Date.now();
        document.getElementById('description').value = 'Descripción de prueba automatizada para acción disciplinaria';
      }, testDate);

      console.log('   ✅ Formulario llenado');

      // Submit
      await page.evaluate(() => {
        const form = document.getElementById('disciplinaryForm');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(3000);

      // Verificar via API
      const actionsAfter = await page.evaluate(async (uid) => {
        const token = localStorage.getItem('authToken');
        try {
          const res = await fetch(`/api/v1/user-admin/${uid}/disciplinary`, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (!res.ok) return { error: res.status };
          return await res.json();
        } catch(e) {
          return { error: e.message };
        }
      }, userId);

      const beforeCount = Array.isArray(actionsBefore) ? actionsBefore.length : 0;
      const afterCount = Array.isArray(actionsAfter) ? actionsAfter.length : 0;

      results.create = afterCount > beforeCount;
      console.log('   Acciones DESPUÉS:', afterCount);
      console.log('   CREATE:', results.create ? '✅ PASS' : '❌ FAIL');

      if (results.create) {
        results.read = true;
        console.log('\n4️⃣ READ: ✅ PASS');

        // PERSISTENCE
        console.log('\n5️⃣ PERSISTENCE (F5)...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Re-login si necesario
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

        // Verificar persistencia via API
        const actionsPersist = await page.evaluate(async (uid) => {
          const token = localStorage.getItem('authToken');
          const res = await fetch(`/api/v1/user-admin/${uid}/disciplinary`, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          return await res.json();
        }, userId);

        results.persistence = Array.isArray(actionsPersist) && actionsPersist.length >= afterCount;
        console.log('   PERSISTENCE:', results.persistence ? '✅ PASS' : '❌ FAIL');
      }
    } else {
      console.log('   ❌ Modal no se abrió');
    }

    // RESULTADO
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADO TAB 8 (Acciones Disciplinarias):');
    console.log('   CREATE:', results.create ? '✅' : '❌');
    console.log('   READ:', results.read ? '✅' : '❌');
    console.log('   PERSISTENCE:', results.persistence ? '✅' : '❌');

    const allPass = results.create && results.read && results.persistence;
    console.log('\n' + (allPass ? '🎉 TAB 8 COMPLETO - 100% ÉXITO' : '⚠️ TAB 8 PARCIAL'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTab8Disciplinary();
