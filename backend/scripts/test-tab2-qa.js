/**
 * TEST: AutonomousQAAgent Tab 2 (Personal/Educación)
 * Prueba CREATE, READ, PERSISTENCE
 */

const { chromium } = require('playwright');

async function testTab2QA() {
  console.log('🧪 TEST: AutonomousQAAgent Tab 2 (Personal/Educación)');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = { create: false, read: false, persistence: false };

  try {
    // Login
    console.log('\n1️⃣ Login...');
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

    // Users module
    await page.evaluate(() => {
      const mod = document.querySelector('[data-module-key="users"]');
      if (mod) mod.click();
    });
    await page.waitForTimeout(2000);

    // Abrir modal
    await page.evaluate(() => {
      const btn = document.querySelector('table tbody tr:first-child button.users-action-btn.view');
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);

    // Tab Personal
    console.log('\n2️⃣ Tab Personal...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const personalTab = tabs.find(t => t.getAttribute('onclick').includes('personal'));
      if (personalTab) personalTab.click();
    });
    await page.waitForTimeout(3000);

    // CREATE: Abrir modal y crear registro
    console.log('\n3️⃣ CREATE...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('#personal-tab button'))
        .find(b => b.textContent.includes('Agregar') && b.getAttribute('onclick') && b.getAttribute('onclick').includes('addEducation'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    const testInst = 'QA_TEST_' + Date.now();
    await page.fill('#institution', testInst);
    await page.fill('#degree', 'QA Degree');
    await page.fill('#graduationYear', '2023');
    await page.fill('#gpa', '95');
    await page.selectOption('#educationType', 'universitaria');
    await page.selectOption('#status', 'completed');

    // Submit
    await page.evaluate(() => {
      const form = document.getElementById('educationForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(3000);

    // Verificar CREATE
    const afterCreate = await page.evaluate((inst) => {
      const tabContent = document.getElementById('personal-tab');
      return tabContent ? tabContent.textContent.includes(inst) : false;
    }, testInst);
    results.create = afterCreate;
    console.log('   CREATE:', results.create ? '✅ PASS' : '❌ FAIL');

    // READ: Verificar datos inmediatamente
    console.log('\n4️⃣ READ...');
    const readCheck = await page.evaluate((inst) => {
      const tabContent = document.getElementById('personal-tab');
      return {
        contains: tabContent ? tabContent.textContent.includes(inst) : false,
        universitySpan: document.getElementById('university-education') ? document.getElementById('university-education').textContent : null
      };
    }, testInst);
    results.read = readCheck.contains;
    console.log('   READ:', results.read ? '✅ PASS' : '❌ FAIL');
    console.log('   University span:', readCheck.universitySpan ? readCheck.universitySpan.substring(0, 50) : 'N/A');

    // PERSISTENCE: F5 y verificar
    console.log('\n5️⃣ PERSISTENCE (F5)...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Re-login
    const needsLogin = await page.$('#companySelect');
    if (needsLogin) {
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
    }

    // Volver a abrir todo
    await page.evaluate(() => {
      const mod = document.querySelector('[data-module-key="users"]');
      if (mod) mod.click();
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const btn = document.querySelector('table tbody tr:first-child button.users-action-btn.view');
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const personalTab = tabs.find(t => t.getAttribute('onclick').includes('personal'));
      if (personalTab) personalTab.click();
    });
    await page.waitForTimeout(3000);

    // Verificar persistencia
    const afterF5 = await page.evaluate((inst) => {
      const tabContent = document.getElementById('personal-tab');
      return tabContent ? tabContent.textContent.includes(inst) : false;
    }, testInst);
    results.persistence = afterF5;
    console.log('   PERSISTENCE:', results.persistence ? '✅ PASS' : '❌ FAIL');

    // RESULTADO FINAL
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADO TAB 2 (Personal/Educación):');
    console.log('   CREATE:', results.create ? '✅' : '❌');
    console.log('   READ:', results.read ? '✅' : '❌');
    console.log('   PERSISTENCE:', results.persistence ? '✅' : '❌');

    const allPass = results.create && results.read && results.persistence;
    console.log('\n' + (allPass ? '🎉 TAB 2 COMPLETO - 100% ÉXITO' : '⚠️ TAB 2 PARCIAL'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTab2QA();
