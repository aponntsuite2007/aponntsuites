/**
 * TEST DETALLADO: Verificar CRUD en tabs 3, 4, 5, 6
 */

const { chromium } = require('playwright');

async function testTabsDetailed() {
  console.log('🧪 TEST DETALLADO: CRUD en múltiples tabs');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = {};

  try {
    // Login
    console.log('\n📋 Login...');
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

    // Obtener userId
    const userId = await page.evaluate(() => {
      const modal = document.getElementById('employeeFileModal');
      const userIdMatch = modal?.innerHTML.match(/userId['":\s]+['"]([a-f0-9-]+)['"]/i);
      return userIdMatch ? userIdMatch[1] : null;
    });
    console.log('   👤 userId:', userId);

    // ============ TAB 3: ANTECEDENTES LABORALES ============
    console.log('\n📋 TAB 3: Antecedentes Laborales');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'work'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    // Buscar botón de agregar trabajo
    const workBtnInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('#work-tab button'));
      const addBtn = btns.find(b =>
        b.textContent.includes('Agregar') ||
        b.getAttribute('onclick')?.includes('addWork') ||
        b.getAttribute('onclick')?.includes('addJob')
      );
      return addBtn ? { found: true, text: addBtn.textContent, onclick: addBtn.getAttribute('onclick') } : { found: false, btns: btns.length };
    });
    console.log('   Botón agregar:', JSON.stringify(workBtnInfo));
    results.tab3 = { hasAddButton: workBtnInfo.found };

    // ============ TAB 4: GRUPO FAMILIAR ============
    console.log('\n📋 TAB 4: Grupo Familiar');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'family'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    const familyBtnInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('#family-tab button'));
      const addBtns = btns.filter(b =>
        b.textContent.includes('Agregar') ||
        b.getAttribute('onclick')?.includes('add')
      );
      return {
        found: addBtns.length > 0,
        buttons: addBtns.map(b => ({ text: b.textContent.trim(), onclick: b.getAttribute('onclick')?.substring(0, 50) }))
      };
    });
    console.log('   Botones agregar:', JSON.stringify(familyBtnInfo, null, 2));
    results.tab4 = { hasAddButton: familyBtnInfo.found, buttons: familyBtnInfo.buttons?.length };

    // ============ TAB 5: ANTECEDENTES MÉDICOS ============
    console.log('\n📋 TAB 5: Antecedentes Médicos');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'medical'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    const medicalBtnInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('#medical-tab button'));
      const addBtns = btns.filter(b =>
        b.textContent.includes('Agregar') ||
        b.getAttribute('onclick')?.includes('add')
      );
      return {
        found: addBtns.length > 0,
        buttons: addBtns.map(b => ({ text: b.textContent.trim().substring(0, 30), onclick: b.getAttribute('onclick')?.substring(0, 40) }))
      };
    });
    console.log('   Botones agregar:', JSON.stringify(medicalBtnInfo, null, 2));
    results.tab5 = { hasAddButton: medicalBtnInfo.found, buttons: medicalBtnInfo.buttons?.length };

    // ============ TAB 6: ASISTENCIAS/PERMISOS ============
    console.log('\n📋 TAB 6: Asistencias/Permisos');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'attendance'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    const attendanceBtnInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('#attendance-tab button'));
      const addBtns = btns.filter(b =>
        b.textContent.includes('Agregar') ||
        b.textContent.includes('Solicitar') ||
        b.getAttribute('onclick')?.includes('add') ||
        b.getAttribute('onclick')?.includes('request')
      );
      return {
        found: addBtns.length > 0,
        buttons: addBtns.map(b => ({ text: b.textContent.trim().substring(0, 30), onclick: b.getAttribute('onclick')?.substring(0, 40) }))
      };
    });
    console.log('   Botones agregar:', JSON.stringify(attendanceBtnInfo, null, 2));
    results.tab6 = { hasAddButton: attendanceBtnInfo.found, buttons: attendanceBtnInfo.buttons?.length };

    // RESUMEN
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE BOTONES CRUD:');
    console.log('   Tab 3 (Work):', results.tab3?.hasAddButton ? '✅ Tiene botón agregar' : '❌ Sin botón');
    console.log('   Tab 4 (Family):', results.tab4?.hasAddButton ? `✅ ${results.tab4.buttons} botones` : '❌ Sin botón');
    console.log('   Tab 5 (Medical):', results.tab5?.hasAddButton ? `✅ ${results.tab5.buttons} botones` : '❌ Sin botón');
    console.log('   Tab 6 (Attendance):', results.tab6?.hasAddButton ? `✅ ${results.tab6.buttons} botones` : '❌ Sin botón');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTabsDetailed();
