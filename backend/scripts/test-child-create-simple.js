/**
 * TEST SIMPLE: Crear hijo y verificar
 */
const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Login
    await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#companySelect');
    await page.waitForFunction(() => document.getElementById('companySelect').options.length > 1);
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(3000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(5000);

    // Users
    await page.evaluate(() => document.querySelector('[data-module-key="users"]').click());
    await page.waitForTimeout(2000);
    await page.evaluate(() => document.querySelector('table tbody tr:first-child button.users-action-btn.view').click());
    await page.waitForTimeout(2000);

    // Tab Family
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'family'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    // Ver lista de hijos ANTES
    const childrenBefore = await page.evaluate(async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/user-profile/8f08afe5-c335-465c-bad0-7946e32d87cf/children', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return await res.json();
    });
    console.log('Hijos ANTES:', childrenBefore.length);

    // Abrir modal
    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addChild"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    // Llenar formulario
    const testName = 'HIJO_SIMPLE_' + Date.now();
    await page.fill('#childName', testName);
    await page.fill('#childSurname', 'ApellidoTest');
    await page.fill('#childBirthdate', '2020-05-15');
    await page.selectOption('#childGender', 'masculino');
    await page.selectOption('#childLivesWith', 'yes');
    await page.selectOption('#childDependent', 'yes');

    console.log('Formulario llenado con:', testName);

    // Capturar request/response
    page.on('response', async res => {
      if (res.url().includes('children') && res.request().method() === 'POST') {
        console.log('POST Response:', res.status());
        try {
          const body = await res.json();
          console.log('Body:', JSON.stringify(body).substring(0, 200));
        } catch(e) {}
      }
    });

    // Submit
    await page.evaluate(() => {
      const form = document.getElementById('childForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(3000);

    // Ver lista de hijos DESPUÉS
    const childrenAfter = await page.evaluate(async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/user-profile/8f08afe5-c335-465c-bad0-7946e32d87cf/children', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return await res.json();
    });
    console.log('Hijos DESPUÉS:', childrenAfter.length);

    if (childrenAfter.length > childrenBefore.length) {
      console.log('✅ ÉXITO: Hijo creado');
      console.log('Nuevo hijo:', JSON.stringify(childrenAfter[childrenAfter.length - 1]));
    } else {
      console.log('❌ FALLO: No se creó el hijo');
    }

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

test();
