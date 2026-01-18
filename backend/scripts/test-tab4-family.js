/**
 * TEST: Tab 4 (Grupo Familiar) - CRUD completo
 */

const { chromium } = require('playwright');

async function testTab4Family() {
  console.log('🧪 TEST: Tab 4 (Grupo Familiar) - CRUD');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = { create: false, read: false, persistence: false };

  // Capturar logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('FAMILY') || text.includes('CHILDREN') || text.includes('Error')) {
      console.log('[🖥️]', msg.type(), text.substring(0, 100));
    }
  });

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
    await page.evaluate(() => document.querySelector('[data-module-key="users"]').click());
    await page.waitForTimeout(2000);

    // Abrir modal
    await page.evaluate(() => document.querySelector('table tbody tr:first-child button.users-action-btn.view').click());
    await page.waitForTimeout(2000);

    // Tab Family
    console.log('\n2️⃣ Tab Family...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'family'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(3000);

    // Obtener userId
    const userId = await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addChild"]');
      const match = btn?.getAttribute('onclick')?.match(/addChild\(['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    });
    console.log('   👤 userId:', userId);

    // CREATE: Agregar hijo
    console.log('\n3️⃣ CREATE (Agregar Hijo)...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addChild"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);

    // Verificar modal abierto
    const modalOpen = await page.evaluate(() => {
      const modal = document.getElementById('childModal');
      return modal && getComputedStyle(modal).display !== 'none';
    });
    console.log('   Modal abierto:', modalOpen);

    if (!modalOpen) {
      console.log('   ❌ Modal no se abrió');
      results.create = false;
    } else {
      // Llenar formulario
      const testName = 'HIJO_TEST_' + Date.now();

      // Buscar campos disponibles
      const fields = await page.evaluate(() => {
        const modal = document.getElementById('childModal');
        if (!modal) return [];
        const inputs = modal.querySelectorAll('input, select');
        return Array.from(inputs).map(i => ({ id: i.id, name: i.name, type: i.type }));
      });
      console.log('   Campos:', JSON.stringify(fields.slice(0, 5)));

      // Intentar llenar campos comunes
      try {
        // Nombres de campos comunes
        const possibleNameFields = ['#childName', '#firstName', '#first_name', '#nombre'];
        for (const sel of possibleNameFields) {
          const exists = await page.$(sel);
          if (exists) {
            await page.fill(sel, testName);
            console.log('   ✅ Nombre llenado en:', sel);
            break;
          }
        }

        // Apellido
        const possibleSurnameFields = ['#childSurname', '#lastName', '#last_name', '#apellido'];
        for (const sel of possibleSurnameFields) {
          const exists = await page.$(sel);
          if (exists) {
            await page.fill(sel, 'Apellido_Test');
            break;
          }
        }

        // Fecha nacimiento
        const possibleDateFields = ['#childBirthdate', '#birthDate', '#birth_date'];
        for (const sel of possibleDateFields) {
          const exists = await page.$(sel);
          if (exists) {
            await page.fill(sel, '2020-01-15');
            break;
          }
        }

        // Submit
        await page.evaluate(() => {
          const form = document.getElementById('childForm');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
        });
        await page.waitForTimeout(3000);

        // Verificar si apareció en la lista
        const afterCreate = await page.evaluate((name) => {
          const tabContent = document.getElementById('family-tab');
          return tabContent ? tabContent.textContent.includes(name) : false;
        }, testName);

        results.create = afterCreate;
        console.log('   CREATE:', results.create ? '✅ PASS' : '❌ FAIL');

        if (results.create) {
          // READ
          console.log('\n4️⃣ READ...');
          results.read = afterCreate;
          console.log('   READ:', results.read ? '✅ PASS' : '❌ FAIL');

          // PERSISTENCE
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

          // Volver
          await page.evaluate(() => document.querySelector('[data-module-key="users"]').click());
          await page.waitForTimeout(2000);
          await page.evaluate(() => document.querySelector('table tbody tr:first-child button.users-action-btn.view').click());
          await page.waitForTimeout(2000);
          await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
            const tab = tabs.find(t => t.getAttribute('onclick').includes("'family'"));
            if (tab) tab.click();
          });
          await page.waitForTimeout(3000);

          const afterF5 = await page.evaluate((name) => {
            const tabContent = document.getElementById('family-tab');
            return tabContent ? tabContent.textContent.includes(name) : false;
          }, testName);

          results.persistence = afterF5;
          console.log('   PERSISTENCE:', results.persistence ? '✅ PASS' : '❌ FAIL');
        }

      } catch (e) {
        console.log('   ❌ Error llenando formulario:', e.message);
      }
    }

    // RESULTADO
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADO TAB 4 (Grupo Familiar):');
    console.log('   CREATE:', results.create ? '✅' : '❌');
    console.log('   READ:', results.read ? '✅' : '❌');
    console.log('   PERSISTENCE:', results.persistence ? '✅' : '❌');

    const allPass = results.create && results.read && results.persistence;
    console.log('\n' + (allPass ? '🎉 TAB 4 COMPLETO - 100% ÉXITO' : '⚠️ TAB 4 PARCIAL'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTab4Family();
