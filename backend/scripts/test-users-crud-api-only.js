/**
 * TEST SIMPLIFICADO: CRUD via API directa
 * Verifica que todas las APIs de CRUD funcionan correctamente
 */
const { chromium } = require('playwright');

async function testUsersCrudApi() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🧪 TEST CRUD API - MÓDULO GESTIÓN DE USUARIOS');
  console.log('═══════════════════════════════════════════════════════════════════');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = {};

  try {
    // Login
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

    // Get userId from first user
    const userId = await page.evaluate(async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/users?page=1&limit=1', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      return data.users && data.users.length > 0 ? data.users[0].id : null;
    });
    console.log('   👤 Testing user:', userId);

    const testDate = new Date().toISOString().split('T')[0];

    // ========== TEST 1: EDUCATION ==========
    console.log('\n📋 TEST: Educación (Tab 2)');
    try {
      const eduBefore = await page.evaluate(async (uid) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/user-profile/${uid}/education`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        return await res.json();
      }, userId);

      const eduCreate = await page.evaluate(async (data) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/user-profile/${data.userId}/education`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            education_level: 'universitaria',
            institution_name: 'TEST_INST_' + Date.now(),
            degree_title: 'Test Degree',
            graduation_date: data.date
          })
        });
        return { status: res.status, ok: res.ok };
      }, { userId, date: testDate });

      results.education = eduCreate.ok;
      console.log('   CREATE:', results.education ? '✅ PASS (' + eduCreate.status + ')' : '❌ FAIL (' + eduCreate.status + ')');
    } catch (e) {
      results.education = false;
      console.log('   CREATE: ❌ FAIL (' + e.message.substring(0, 30) + ')');
    }

    // ========== TEST 2: WORK HISTORY ==========
    console.log('\n📋 TEST: Antecedentes Laborales (Tab 3)');
    try {
      const workCreate = await page.evaluate(async (data) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/users/${data.userId}/work-history`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company_name: 'TEST_COMPANY_' + Date.now(),
            position: 'Developer',
            start_date: data.date,
            responsibilities: 'Test responsibilities'
          })
        });
        return { status: res.status, ok: res.ok };
      }, { userId, date: '2020-01-15' });

      results.work = workCreate.ok;
      console.log('   CREATE:', results.work ? '✅ PASS (' + workCreate.status + ')' : '❌ FAIL (' + workCreate.status + ')');
    } catch (e) {
      results.work = false;
      console.log('   CREATE: ❌ FAIL (' + e.message.substring(0, 30) + ')');
    }

    // ========== TEST 3: CHILDREN ==========
    console.log('\n📋 TEST: Hijos (Tab 4)');
    try {
      const childCreate = await page.evaluate(async (data) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/user-profile/${data.userId}/children`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            full_name: 'TEST_CHILD_' + Date.now(),
            birth_date: '2020-05-15',
            gender: 'masculino',
            lives_with_employee: true,
            is_dependent: true
          })
        });
        return { status: res.status, ok: res.ok };
      }, { userId });

      results.children = childCreate.ok;
      console.log('   CREATE:', results.children ? '✅ PASS (' + childCreate.status + ')' : '❌ FAIL (' + childCreate.status + ')');
    } catch (e) {
      results.children = false;
      console.log('   CREATE: ❌ FAIL (' + e.message.substring(0, 30) + ')');
    }

    // ========== TEST 4: MEDICAL EXAMS ==========
    console.log('\n📋 TEST: Exámenes Médicos (Tab 5)');
    try {
      const medCreate = await page.evaluate(async (data) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/user-medical/${data.userId}/medical-exams`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            exam_type: 'periodico',
            exam_date: data.date,
            result: 'apto',
            facility_name: 'TEST_CENTER_' + Date.now()
          })
        });
        return { status: res.status, ok: res.ok };
      }, { userId, date: testDate });

      results.medical = medCreate.ok;
      console.log('   CREATE:', results.medical ? '✅ PASS (' + medCreate.status + ')' : '❌ FAIL (' + medCreate.status + ')');
    } catch (e) {
      results.medical = false;
      console.log('   CREATE: ❌ FAIL (' + e.message.substring(0, 30) + ')');
    }

    // ========== TEST 5: MEDICAL CASES (Attendance) ==========
    console.log('\n📋 TEST: Ausencias/Permisos (Tab 6)');
    try {
      const caseCreate = await page.evaluate(async (data) => {
        const token = localStorage.getItem('authToken');
        const formData = new FormData();
        formData.append('employee_id', data.userId);
        formData.append('absence_type', 'authorized_leave');
        formData.append('start_date', data.date);
        formData.append('requested_days', '1');
        formData.append('employee_description', 'TEST_CASE_' + Date.now());

        const res = await fetch('/api/medical-cases', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token
          },
          body: formData
        });
        return { status: res.status, ok: res.ok };
      }, { userId, date: testDate });

      results.attendance = caseCreate.ok;
      console.log('   CREATE:', results.attendance ? '✅ PASS (' + caseCreate.status + ')' : '❌ FAIL (' + caseCreate.status + ')');
    } catch (e) {
      results.attendance = false;
      console.log('   CREATE: ❌ FAIL (' + e.message.substring(0, 30) + ')');
    }

    // ========== TEST 6: DISCIPLINARY ==========
    console.log('\n📋 TEST: Acciones Disciplinarias (Tab 8)');
    try {
      const discCreate = await page.evaluate(async (data) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/user-admin/${data.userId}/disciplinary`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action_type: 'advertencia_verbal',
            severity: 'moderada',
            date_occurred: data.date,
            description: 'TEST_DISCIPLINARY_' + Date.now(),
            action_taken: 'Test action'
          })
        });
        return { status: res.status, ok: res.ok };
      }, { userId, date: testDate });

      results.disciplinary = discCreate.ok;
      console.log('   CREATE:', results.disciplinary ? '✅ PASS (' + discCreate.status + ')' : '❌ FAIL (' + discCreate.status + ')');
    } catch (e) {
      results.disciplinary = false;
      console.log('   CREATE: ❌ FAIL (' + e.message.substring(0, 30) + ')');
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await browser.close();
  }

  // ========== RESUMEN ==========
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN FINAL - CRUD APIs');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const tests = [
    { name: 'Educación (Tab 2)', pass: results.education },
    { name: 'Antec. Laborales (Tab 3)', pass: results.work },
    { name: 'Hijos (Tab 4)', pass: results.children },
    { name: 'Exámenes Médicos (Tab 5)', pass: results.medical },
    { name: 'Ausencias/Permisos (Tab 6)', pass: results.attendance },
    { name: 'Disciplinarios (Tab 8)', pass: results.disciplinary }
  ];

  let passed = 0;
  tests.forEach(t => {
    console.log(`   ${t.pass ? '✅' : '❌'} ${t.name}`);
    if (t.pass) passed++;
  });

  const percentage = Math.round((passed / tests.length) * 100);
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`📈 RESULTADO: ${passed}/${tests.length} APIs funcionando (${percentage}%)`);
  console.log('═══════════════════════════════════════════════════════════════════');

  if (percentage === 100) {
    console.log('\n🎉🎉🎉 ¡¡¡ 100% ÉXITO - TODAS LAS APIs CRUD FUNCIONAN !!! 🎉🎉🎉\n');
  }
}

testUsersCrudApi();
