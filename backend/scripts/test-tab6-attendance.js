/**
 * TEST: Tab 6 (Asistencias/Permisos) - CRUD
 */
const { chromium } = require('playwright');

async function testTab6Attendance() {
  console.log('🧪 TEST: Tab 6 (Asistencias/Permisos) - CRUD');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = { create: false, read: false, persistence: false };

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('PERMISSION') || text.includes('ATTENDANCE') || text.includes('Error')) {
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

    // Tab Attendance
    console.log('\n2️⃣ Tab Attendance...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'attendance'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    // Obtener userId
    const userId = await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addPermissionRequest"]');
      if (!btn) return null;
      const match = btn.getAttribute('onclick').match(/addPermissionRequest\(['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    });
    console.log('   👤 userId:', userId);

    // Ver casos médicos ANTES via API
    const casesBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      try {
        const res = await fetch(`/api/medical-cases/employee/${uid}`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return { error: res.status };
        const result = await res.json();
        // Handle both { success: true, data: [...] } and array format
        if (result.success && Array.isArray(result.data)) {
          return result.data;
        }
        return Array.isArray(result) ? result : [];
      } catch(e) {
        return { error: e.message };
      }
    }, userId);
    console.log('   Casos ANTES:', Array.isArray(casesBefore) ? casesBefore.length : casesBefore);

    // CREATE - Abrir modal
    console.log('\n3️⃣ CREATE (Agregar Permiso/Ausencia)...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addPermissionRequest"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    // Verificar modal
    const modalOpen = await page.evaluate(() => {
      const modal = document.getElementById('permissionRequestModal');
      return modal && modal.style.display !== 'none';
    });
    console.log('   Modal abierto:', modalOpen);

    if (modalOpen) {
      // Llenar formulario
      const testDate = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      await page.evaluate((dates) => {
        document.getElementById('absenceType').value = 'authorized_leave';
        document.getElementById('startDate').value = dates.start;
        document.getElementById('endDate').value = dates.end;
        document.getElementById('requestedDays').value = '1';
        document.getElementById('employeeDescription').value = 'PERMISO_TEST_' + Date.now() + ' - Prueba automatizada';
      }, { start: testDate, end: futureDate });

      console.log('   ✅ Formulario llenado');

      // Submit via form dispatchEvent
      await page.evaluate(() => {
        const form = document.getElementById('permissionRequestForm');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(3000);

      // Verificar via API
      const casesAfter = await page.evaluate(async (uid) => {
        const token = localStorage.getItem('authToken');
        try {
          const res = await fetch(`/api/medical-cases/employee/${uid}`, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (!res.ok) return { error: res.status };
          const result = await res.json();
          // Handle both { success: true, data: [...] } and array format
          if (result.success && Array.isArray(result.data)) {
            return result.data;
          }
          return Array.isArray(result) ? result : [];
        } catch(e) {
          return { error: e.message };
        }
      }, userId);

      const beforeCount = Array.isArray(casesBefore) ? casesBefore.length : 0;
      const afterCount = Array.isArray(casesAfter) ? casesAfter.length : 0;

      results.create = afterCount > beforeCount;
      console.log('   Casos DESPUÉS:', afterCount);
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
        const casesPersist = await page.evaluate(async (uid) => {
          const token = localStorage.getItem('authToken');
          const res = await fetch(`/api/medical-cases/employee/${uid}`, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          const result = await res.json();
          // Handle both { success: true, data: [...] } and array format
          if (result.success && Array.isArray(result.data)) {
            return result.data;
          }
          return Array.isArray(result) ? result : [];
        }, userId);

        results.persistence = Array.isArray(casesPersist) && casesPersist.length >= afterCount;
        console.log('   PERSISTENCE:', results.persistence ? '✅ PASS' : '❌ FAIL');
      }
    } else {
      console.log('   ❌ Modal no se abrió');
    }

    // RESULTADO
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADO TAB 6 (Asistencias/Permisos):');
    console.log('   CREATE:', results.create ? '✅' : '❌');
    console.log('   READ:', results.read ? '✅' : '❌');
    console.log('   PERSISTENCE:', results.persistence ? '✅' : '❌');

    const allPass = results.create && results.read && results.persistence;
    console.log('\n' + (allPass ? '🎉 TAB 6 COMPLETO - 100% ÉXITO' : '⚠️ TAB 6 PARCIAL'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTab6Attendance();
