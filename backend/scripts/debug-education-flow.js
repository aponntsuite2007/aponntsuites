/**
 * DEBUG: Flujo completo de educación con logs detallados
 */

const { chromium } = require('playwright');

async function debugEducationFlow() {
  console.log('🔬 DEBUG: Flujo completo de educación\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // Capturar TODOS los console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('EDUCATION') || text.includes('educación') || text.includes('education')) {
      console.log('[🖥️]', msg.type().toUpperCase(), text.substring(0, 200));
    }
  });

  try {
    // Login
    console.log('1️⃣ Login...');
    await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#companySelect', { timeout: 10000 });
    await page.waitForFunction(() => document.getElementById('companySelect') && document.getElementById('companySelect').options.length > 1, { timeout: 10000 });
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(3000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(5000);
    console.log('   ✅ Login OK');

    // Verificar token
    const tokenCheck = await page.evaluate(() => {
      const authToken = localStorage.getItem('authToken');
      const token = localStorage.getItem('token');
      return { authToken: authToken ? authToken.substring(0, 30) + '...' : null, token: token ? token.substring(0, 30) + '...' : null };
    });
    console.log('   🔐 Tokens:', JSON.stringify(tokenCheck));

    // Navegar a Users
    console.log('\n2️⃣ Navegar a Users...');
    await page.evaluate(() => document.querySelector('[data-module-key="users"]').click());
    await page.waitForTimeout(2000);

    // Abrir modal usuario
    console.log('\n3️⃣ Abrir modal usuario...');
    await page.evaluate(() => document.querySelector('table tbody tr:first-child button.users-action-btn.view').click());
    await page.waitForTimeout(2000);

    // Tab Personal - esto debería disparar loadEducation
    console.log('\n4️⃣ Ir a Tab Personal (debería llamar loadEducation)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const personalTab = tabs.find(t => t.getAttribute('onclick').includes('personal'));
      if (personalTab) personalTab.click();
    });
    await page.waitForTimeout(3000);

    // Verificar estado de los spans ANTES
    const spansBefore = await page.evaluate(() => {
      return {
        primary: document.getElementById('primary-education')?.textContent,
        secondary: document.getElementById('secondary-education')?.textContent,
        tertiary: document.getElementById('tertiary-education')?.textContent,
        university: document.getElementById('university-education')?.textContent
      };
    });
    console.log('   📋 Spans ANTES:', JSON.stringify(spansBefore));

    // Obtener userId
    const userId = await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addEducation"]');
      const match = btn?.getAttribute('onclick')?.match(/addEducation\(['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    });
    console.log('   👤 userId:', userId);

    // Llamar loadEducation manualmente para ver qué pasa
    console.log('\n5️⃣ Llamar loadEducation() manualmente...');
    const loadResult = await page.evaluate(async (uid) => {
      if (typeof loadEducation === 'function') {
        try {
          await loadEducation(uid);
          return { success: true };
        } catch(e) {
          return { error: e.message };
        }
      }
      return { error: 'loadEducation no existe' };
    }, userId);
    console.log('   Resultado:', JSON.stringify(loadResult));
    await page.waitForTimeout(2000);

    // Verificar estado de los spans DESPUÉS
    const spansAfter = await page.evaluate(() => {
      return {
        primary: document.getElementById('primary-education')?.textContent,
        secondary: document.getElementById('secondary-education')?.textContent,
        tertiary: document.getElementById('tertiary-education')?.textContent,
        university: document.getElementById('university-education')?.textContent
      };
    });
    console.log('   📋 Spans DESPUÉS:', JSON.stringify(spansAfter));

    // Crear un nuevo registro
    console.log('\n6️⃣ Crear nuevo registro de educación...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('#personal-tab button'))
        .find(b => b.textContent.includes('Agregar') && b.getAttribute('onclick')?.includes('addEducation'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    const testInst = 'FLOWTEST_' + Date.now();
    await page.fill('#institution', testInst);
    await page.fill('#degree', 'Test Degree');
    await page.fill('#graduationYear', '2023');
    await page.fill('#gpa', '90');
    await page.selectOption('#educationType', 'universitaria');
    await page.selectOption('#status', 'completed');

    // Submit
    console.log('   💾 Guardando...');
    await page.evaluate(() => {
      const form = document.getElementById('educationForm');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(3000);

    // Verificar spans después de guardar
    const spansAfterSave = await page.evaluate(() => {
      return {
        primary: document.getElementById('primary-education')?.textContent,
        secondary: document.getElementById('secondary-education')?.textContent,
        university: document.getElementById('university-education')?.textContent,
        educationList: document.getElementById('education-list')?.innerHTML.substring(0, 300)
      };
    });
    console.log('\n7️⃣ Estado después de guardar:');
    console.log('   University span:', spansAfterSave.university);
    console.log('   Education list preview:', spansAfterSave.educationList?.substring(0, 150));

    // F5 y verificar persistencia
    console.log('\n8️⃣ F5 y verificar persistencia...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Re-login
    const needsLogin = await page.$('#companySelect');
    if (needsLogin) {
      await page.waitForFunction(() => document.getElementById('companySelect') && document.getElementById('companySelect').options.length > 1, { timeout: 10000 });
      await page.selectOption('#companySelect', 'isi');
      await page.waitForTimeout(3000);
      await page.fill('#userInput', 'admin');
      await page.fill('#passwordInput', 'admin123');
      await page.click('#loginButton');
      await page.waitForTimeout(5000);
    }

    // Volver a Users > modal > tab personal
    await page.evaluate(() => document.querySelector('[data-module-key="users"]').click());
    await page.waitForTimeout(2000);
    await page.evaluate(() => document.querySelector('table tbody tr:first-child button.users-action-btn.view').click());
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const personalTab = tabs.find(t => t.getAttribute('onclick').includes('personal'));
      if (personalTab) personalTab.click();
    });
    await page.waitForTimeout(3000);

    // Verificar spans finales
    const spansFinal = await page.evaluate((inst) => {
      const tabContent = document.getElementById('personal-tab');
      return {
        primary: document.getElementById('primary-education')?.textContent,
        university: document.getElementById('university-education')?.textContent,
        containsInstitution: tabContent?.textContent.includes(inst)
      };
    }, testInst);
    console.log('\n9️⃣ Estado FINAL después de F5:');
    console.log('   University span:', spansFinal.university);
    console.log('   Contiene institución test:', spansFinal.containsInstitution);

    // Resultado
    console.log('\n========== RESULTADO ==========');
    if (spansFinal.containsInstitution || spansFinal.university?.includes(testInst)) {
      console.log('✅ ÉXITO: Registro persiste después de F5');
    } else if (spansFinal.university !== 'No especificado') {
      console.log('⚠️ PARCIAL: Hay datos pero no el registro de prueba específico');
      console.log('   (Puede que haya otros registros universitarios)');
    } else {
      console.log('❌ FALLO: No se encontró el registro');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugEducationFlow();
