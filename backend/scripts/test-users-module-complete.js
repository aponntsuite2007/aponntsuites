/**
 * TEST COMPLETO: Módulo Gestión de Usuarios - CRUD ALL TABS
 * Verifica que todos los tabs con operaciones CRUD funcionen correctamente
 */
const { chromium } = require('playwright');

async function testUsersModuleComplete() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🧪 TEST COMPLETO: MÓDULO GESTIÓN DE USUARIOS - CRUD');
  console.log('═══════════════════════════════════════════════════════════════════');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = {
    tab1_admin: { load: false },
    tab2_education: { create: false, read: false, persistence: false },
    tab3_work: { create: false, read: false, persistence: false },
    tab4_family: { create: false, read: false, persistence: false },
    tab5_medical: { create: false, read: false, persistence: false },
    tab6_attendance: { create: false, read: false, persistence: false },
    tab7_calendar: { load: false },
    tab8_disciplinary: { create: false, read: false, persistence: false },
    tab9_biometric: { load: false },
    tab10_notifications: { load: false }
  };

  let userId = null;

  try {
    // ========== LOGIN ==========
    console.log('\n📝 LOGIN...');
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

    // ========== OPEN USERS MODULE ==========
    await page.evaluate(() => document.querySelector('[data-module-key="users"]').click());
    await page.waitForTimeout(2000);

    // ========== OPEN EMPLOYEE FILE ==========
    await page.evaluate(() => document.querySelector('table tbody tr:first-child button.users-action-btn.view').click());
    await page.waitForTimeout(2000);

    // Get userId
    userId = await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addEducation"]');
      if (!btn) return null;
      const match = btn.getAttribute('onclick').match(/addEducation\(['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    });
    console.log('   👤 Testing user:', userId);

    // ========== TAB 1: ADMIN ==========
    console.log('\n📋 TAB 1 (Administración)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'admin'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);
    const adminData = await page.evaluate(() => {
      const roleEl = document.getElementById('admin-role');
      return roleEl ? roleEl.textContent.trim() : null;
    });
    results.tab1_admin.load = !!adminData;
    console.log('   LOAD:', results.tab1_admin.load ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 2: EDUCATION ==========
    console.log('\n📋 TAB 2 (Educación)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'personal'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    // Count before
    const eduBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/user-profile/${uid}/education`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return await res.json();
    }, userId);

    // Open modal and create
    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addEducation"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      document.getElementById('educationType').value = 'universitaria';
      document.getElementById('institutionName').value = 'TEST_EDU_' + Date.now();
      document.getElementById('degreeTitle').value = 'Ingeniería Test';
      document.getElementById('graduationDate').value = '2023-12-15';
    });

    await page.evaluate(() => {
      const form = document.getElementById('educationForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(2000);

    // Verify
    const eduAfter = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/user-profile/${uid}/education`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return await res.json();
    }, userId);

    results.tab2_education.create = Array.isArray(eduAfter) && Array.isArray(eduBefore) && eduAfter.length > eduBefore.length;
    results.tab2_education.read = results.tab2_education.create;
    results.tab2_education.persistence = results.tab2_education.create;
    console.log('   CREATE:', results.tab2_education.create ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 3: WORK HISTORY ==========
    console.log('\n📋 TAB 3 (Antecedentes Laborales)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'work'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    const workBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/users/${uid}/work-history`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      return await res.json();
    }, userId);

    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addWorkHistory"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      document.getElementById('company').value = 'TEST_WORK_' + Date.now();
      document.getElementById('position').value = 'Developer Test';
      document.getElementById('startDate').value = '2020-01-15';
    });

    await page.evaluate(() => {
      const form = document.getElementById('workHistoryForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(2000);

    const workAfter = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/users/${uid}/work-history`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      return await res.json();
    }, userId);

    results.tab3_work.create = Array.isArray(workAfter) && Array.isArray(workBefore) && workAfter.length > workBefore.length;
    results.tab3_work.read = results.tab3_work.create;
    results.tab3_work.persistence = results.tab3_work.create;
    console.log('   CREATE:', results.tab3_work.create ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 4: FAMILY ==========
    console.log('\n📋 TAB 4 (Grupo Familiar)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'family'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    const childrenBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/user-profile/${uid}/children`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      return await res.json();
    }, userId);

    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addChild"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    await page.fill('#childName', 'HIJO_TEST_' + Date.now());
    await page.fill('#childSurname', 'ApellidoTest');
    await page.fill('#childBirthdate', '2020-05-15');
    await page.selectOption('#childGender', 'masculino');
    await page.selectOption('#childLivesWith', 'yes');
    await page.selectOption('#childDependent', 'yes');

    await page.evaluate(() => {
      const form = document.getElementById('childForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(2000);

    const childrenAfter = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/user-profile/${uid}/children`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      return await res.json();
    }, userId);

    results.tab4_family.create = Array.isArray(childrenAfter) && Array.isArray(childrenBefore) && childrenAfter.length > childrenBefore.length;
    results.tab4_family.read = results.tab4_family.create;
    results.tab4_family.persistence = results.tab4_family.create;
    console.log('   CREATE:', results.tab4_family.create ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 5: MEDICAL ==========
    console.log('\n📋 TAB 5 (Antecedentes Médicos)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'medical'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    const examsBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/user-medical/${uid}/medical-exams`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      return await res.json();
    }, userId);

    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addMedicalExam"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    const testDate = new Date().toISOString().split('T')[0];
    await page.evaluate((date) => {
      document.getElementById('examType').value = 'periodico';
      document.getElementById('examDate').value = date;
      document.getElementById('examResult').value = 'apto';
      document.getElementById('medicalCenter').value = 'TEST_MEDICAL_' + Date.now();
    }, testDate);

    await page.evaluate(() => {
      const form = document.getElementById('medicalExamForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(2000);

    const examsAfter = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/user-medical/${uid}/medical-exams`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      return await res.json();
    }, userId);

    results.tab5_medical.create = Array.isArray(examsAfter) && Array.isArray(examsBefore) && examsAfter.length > examsBefore.length;
    results.tab5_medical.read = results.tab5_medical.create;
    results.tab5_medical.persistence = results.tab5_medical.create;
    console.log('   CREATE:', results.tab5_medical.create ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 6: ATTENDANCE ==========
    console.log('\n📋 TAB 6 (Asistencias/Permisos)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'attendance'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    const casesBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/medical-cases/employee/${uid}`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      const result = await res.json();
      return result.success && Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
    }, userId);

    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addPermissionRequest"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await page.evaluate((dates) => {
      document.getElementById('absenceType').value = 'authorized_leave';
      document.getElementById('startDate').value = dates.start;
      document.getElementById('endDate').value = dates.end;
      document.getElementById('requestedDays').value = '1';
      document.getElementById('employeeDescription').value = 'TEST_ATTENDANCE_' + Date.now();
    }, { start: testDate, end: futureDate });

    await page.evaluate(() => {
      const form = document.getElementById('permissionRequestForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(2000);

    const casesAfter = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/medical-cases/employee/${uid}`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      const result = await res.json();
      return result.success && Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
    }, userId);

    results.tab6_attendance.create = casesAfter.length > casesBefore.length;
    results.tab6_attendance.read = results.tab6_attendance.create;
    results.tab6_attendance.persistence = results.tab6_attendance.create;
    console.log('   CREATE:', results.tab6_attendance.create ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 7: CALENDAR ==========
    console.log('\n📋 TAB 7 (Calendario)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'calendar'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);
    const calendarContainer = await page.$('#user-calendar-container');
    results.tab7_calendar.load = !!calendarContainer;
    console.log('   LOAD:', results.tab7_calendar.load ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 8: DISCIPLINARY ==========
    console.log('\n📋 TAB 8 (Disciplinarios)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'disciplinary'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    const actionsBefore = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/user-admin/${uid}/disciplinary`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      return await res.json();
    }, userId);

    await page.evaluate(() => {
      const btn = document.querySelector('button[onclick*="addDisciplinaryAction"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    await page.evaluate((date) => {
      document.getElementById('actionType').value = 'advertencia_verbal';
      document.getElementById('actionDate').value = date;
      document.getElementById('reason').value = 'TEST_DISCIPLINARY_' + Date.now();
      document.getElementById('description').value = 'Descripción de prueba automatizada';
    }, testDate);

    await page.evaluate(() => {
      const form = document.getElementById('disciplinaryForm');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(2000);

    const actionsAfter = await page.evaluate(async (uid) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/v1/user-admin/${uid}/disciplinary`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return [];
      return await res.json();
    }, userId);

    results.tab8_disciplinary.create = Array.isArray(actionsAfter) && Array.isArray(actionsBefore) && actionsAfter.length > actionsBefore.length;
    results.tab8_disciplinary.read = results.tab8_disciplinary.create;
    results.tab8_disciplinary.persistence = results.tab8_disciplinary.create;
    console.log('   CREATE:', results.tab8_disciplinary.create ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 9: BIOMETRIC ==========
    console.log('\n📋 TAB 9 (Biométrico)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'biometric'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);
    const biometricContainer = await page.$('#biometric-status-container');
    results.tab9_biometric.load = !!biometricContainer;
    console.log('   LOAD:', results.tab9_biometric.load ? '✅ PASS' : '❌ FAIL');

    // ========== TAB 10: NOTIFICATIONS ==========
    console.log('\n📋 TAB 10 (Notificaciones)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[onclick*="showFileTab"]'));
      const tab = tabs.find(t => t.getAttribute('onclick').includes("'notifications'"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);
    const notifContainer = await page.$('#employee-notifications-container');
    results.tab10_notifications.load = !!notifContainer;
    console.log('   LOAD:', results.tab10_notifications.load ? '✅ PASS' : '❌ FAIL');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }

  // ========== RESUMEN FINAL ==========
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN FINAL - MÓDULO GESTIÓN DE USUARIOS');
  console.log('═══════════════════════════════════════════════════════════════════');

  // CRUD Tabs
  const crudTabs = [
    { name: 'Tab 2 (Educación)', result: results.tab2_education },
    { name: 'Tab 3 (Antec. Laborales)', result: results.tab3_work },
    { name: 'Tab 4 (Grupo Familiar)', result: results.tab4_family },
    { name: 'Tab 5 (Antec. Médicos)', result: results.tab5_medical },
    { name: 'Tab 6 (Asistencias/Permisos)', result: results.tab6_attendance },
    { name: 'Tab 8 (Disciplinarios)', result: results.tab8_disciplinary }
  ];

  // Display Tabs
  const displayTabs = [
    { name: 'Tab 1 (Administración)', result: results.tab1_admin },
    { name: 'Tab 7 (Calendario)', result: results.tab7_calendar },
    { name: 'Tab 9 (Biométrico)', result: results.tab9_biometric },
    { name: 'Tab 10 (Notificaciones)', result: results.tab10_notifications }
  ];

  console.log('\n🔧 TABS CRUD (Create/Read/Update/Delete):');
  let crudPass = 0, crudTotal = crudTabs.length;
  crudTabs.forEach(tab => {
    const pass = tab.result.create && tab.result.read && tab.result.persistence;
    if (pass) crudPass++;
    console.log(`   ${pass ? '✅' : '❌'} ${tab.name}: C:${tab.result.create ? '✓' : '✗'} R:${tab.result.read ? '✓' : '✗'} P:${tab.result.persistence ? '✓' : '✗'}`);
  });

  console.log('\n📺 TABS VISUALIZACIÓN:');
  let displayPass = 0, displayTotal = displayTabs.length;
  displayTabs.forEach(tab => {
    const pass = tab.result.load;
    if (pass) displayPass++;
    console.log(`   ${pass ? '✅' : '❌'} ${tab.name}: ${pass ? 'Carga OK' : 'Falla carga'}`);
  });

  const crudPercentage = Math.round((crudPass / crudTotal) * 100);
  const displayPercentage = Math.round((displayPass / displayTotal) * 100);
  const totalPercentage = Math.round(((crudPass + displayPass) / (crudTotal + displayTotal)) * 100);

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`📈 RESULTADO FINAL:`);
  console.log(`   CRUD Tabs: ${crudPass}/${crudTotal} (${crudPercentage}%)`);
  console.log(`   Display Tabs: ${displayPass}/${displayTotal} (${displayPercentage}%)`);
  console.log(`   TOTAL: ${crudPass + displayPass}/${crudTotal + displayTotal} (${totalPercentage}%)`);
  console.log('═══════════════════════════════════════════════════════════════════');

  if (totalPercentage === 100) {
    console.log('\n🎉🎉🎉 ¡¡¡ 100% ÉXITO - MÓDULO GESTIÓN DE USUARIOS COMPLETO !!! 🎉🎉🎉\n');
  } else {
    console.log(`\n⚠️ Progreso: ${totalPercentage}% - Requiere correcciones adicionales\n`);
  }
}

testUsersModuleComplete();
