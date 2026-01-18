/**
 * TEST: Tab 5 (Antecedentes Médicos) - CRUD Exámenes Médicos
 */
const { chromium } = require('playwright');

async function testTab5Medical() {
  console.log('🧪 TEST: Tab 5 (Antecedentes Médicos) - CRUD');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = { create: false, read: false, persistence: false };

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('MEDICAL') || text.includes('Error')) {
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

    // Tab Medical
    console.log('\n2️⃣ Tab Medical...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'medical'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(3000);

    // Obtener userId del botón addMedicalExam
    const userId = await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addMedicalExam"]');
      if (!btn) return null;
      const match = btn.getAttribute('onclick').match(/addMedicalExam\(['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    });
    console.log('   👤 userId:', userId);

    if (!userId) {
      console.log('   ❌ No se encontró userId - verificando botones disponibles...');
      const btns = await page.evaluate(() => {
        const tabContent = document.getElementById('medical-tab');
        if (!tabContent) return [];
        const buttons = tabContent.querySelectorAll('button');
        return Array.from(buttons).map(b => ({ text: b.textContent.substring(0, 30), onclick: b.getAttribute('onclick')?.substring(0, 50) }));
      });
      console.log('   Botones:', JSON.stringify(btns.slice(0, 5)));
    }

    // Ver exámenes ANTES via API
    const examsBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      try {
        const res = await fetch(`/api/v1/user-medical/${uid}/medical-exams`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return { error: res.status };
        return await res.json();
      } catch(e) {
        return { error: e.message };
      }
    }, userId);
    console.log('   Exámenes ANTES:', Array.isArray(examsBefore) ? examsBefore.length : examsBefore);

    // CREATE - Abrir modal
    console.log('\n3️⃣ CREATE (Agregar Examen Médico)...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addMedicalExam"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    // Verificar modal
    const modalOpen = await page.evaluate(() => {
      const modal = document.getElementById('medicalExamModal');
      return modal && modal.style.display !== 'none';
    });
    console.log('   Modal abierto:', modalOpen);

    if (modalOpen) {
      // Llenar formulario
      const testDate = new Date().toISOString().split('T')[0];

      await page.evaluate((date) => {
        document.getElementById('examType').value = 'periodico';
        document.getElementById('examDate').value = date;
        document.getElementById('examResult').value = 'apto';
        document.getElementById('medicalCenter').value = 'CENTRO_TEST_' + Date.now();
        document.getElementById('examDoctor').value = 'Dr. Test Automatizado';
        document.getElementById('examNotes').value = 'Examen de prueba automatizada';
      }, testDate);

      console.log('   ✅ Formulario llenado');

      // Submit
      await page.evaluate(() => {
        const form = document.getElementById('medicalExamForm');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(3000);

      // Verificar via API
      const examsAfter = await page.evaluate(async (uid) => {
        const token = localStorage.getItem('authToken');
        try {
          const res = await fetch(`/api/v1/user-medical/${uid}/medical-exams`, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (!res.ok) return { error: res.status };
          return await res.json();
        } catch(e) {
          return { error: e.message };
        }
      }, userId);

      const beforeCount = Array.isArray(examsBefore) ? examsBefore.length : 0;
      const afterCount = Array.isArray(examsAfter) ? examsAfter.length : 0;

      results.create = afterCount > beforeCount;
      console.log('   Exámenes DESPUÉS:', afterCount);
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
        const examsPersist = await page.evaluate(async (uid) => {
          const token = localStorage.getItem('authToken');
          const res = await fetch(`/api/v1/user-medical/${uid}/medical-exams`, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          return await res.json();
        }, userId);

        results.persistence = Array.isArray(examsPersist) && examsPersist.length >= afterCount;
        console.log('   PERSISTENCE:', results.persistence ? '✅ PASS' : '❌ FAIL');
      }
    } else {
      console.log('   ❌ Modal no se abrió');
    }

    // RESULTADO
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADO TAB 5 (Antecedentes Médicos):');
    console.log('   CREATE:', results.create ? '✅' : '❌');
    console.log('   READ:', results.read ? '✅' : '❌');
    console.log('   PERSISTENCE:', results.persistence ? '✅' : '❌');

    const allPass = results.create && results.read && results.persistence;
    console.log('\n' + (allPass ? '🎉 TAB 5 COMPLETO - 100% ÉXITO' : '⚠️ TAB 5 PARCIAL'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTab5Medical();
