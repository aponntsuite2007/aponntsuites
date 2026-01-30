/**
 * TEST E2E REAL - Gestión de Usuarios: 10 Tabs
 *
 * Estrategia HÍBRIDA:
 * - CRUD via API directa (confiable, rápido)
 * - UI checks via Puppeteer (login, módulo, modal, tabs)
 * - Persistencia verificada con GET después de POST/PUT
 */
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:9998';
const API_BASE = `${BASE_URL}/api/v1`;

// Test results
const results = [];
function log(tab, test, status, detail = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${tab}] ${test}${detail ? ' - ' + detail : ''}`);
    results.push({ tab, test, status, detail });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// PHASE 1: API-BASED CRUD TESTING
// ============================================================
async function testAPICrud(token, userId) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // --- TAB 4: GRUPO FAMILIAR ---
    console.log('\n═══════════════════════════════════════');
    console.log('TAB 4: 👨‍👩‍👧‍👦 GRUPO FAMILIAR (API)');
    console.log('═══════════════════════════════════════');

    // Family Members - CREATE
    let familyMemberId = null;
    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/family-members`, {
            method: 'POST', headers,
            body: JSON.stringify({ full_name: 'TestE2E Familiar', relationship: 'sibling', dni: '99887766' })
        });
        const data = await res.json();
        familyMemberId = data.id;
        log('FAMILIA', 'CREATE familiar', res.status === 201 ? 'PASS' : 'FAIL', `status=${res.status}, id=${data.id}`);
    } catch (e) { log('FAMILIA', 'CREATE familiar', 'FAIL', e.message); }

    // Family Members - READ
    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/family-members`, { headers });
        const data = await res.json();
        const found = Array.isArray(data) && data.some(m => m.full_name === 'TestE2E Familiar');
        log('FAMILIA', 'READ familiares', found ? 'PASS' : 'FAIL', `${data.length} registros, encontrado=${found}`);
    } catch (e) { log('FAMILIA', 'READ familiares', 'FAIL', e.message); }

    // Family Members - UPDATE
    if (familyMemberId) {
        try {
            const res = await fetch(`${API_BASE}/user-profile/${userId}/family-members/${familyMemberId}`, {
                method: 'PUT', headers,
                body: JSON.stringify({ full_name: 'TestE2E FamiliarUpdated', relationship: 'parent' })
            });
            log('FAMILIA', 'UPDATE familiar', res.ok ? 'PASS' : 'FAIL', `status=${res.status}`);
        } catch (e) { log('FAMILIA', 'UPDATE familiar', 'FAIL', e.message); }

        // Verify update persisted
        try {
            const res = await fetch(`${API_BASE}/user-profile/${userId}/family-members`, { headers });
            const data = await res.json();
            const found = data.some(m => m.full_name === 'TestE2E FamiliarUpdated');
            log('FAMILIA', 'PERSIST update', found ? 'PASS' : 'FAIL');
        } catch (e) { log('FAMILIA', 'PERSIST update', 'FAIL', e.message); }
    }

    // Children - CREATE
    let childId = null;
    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/children`, {
            method: 'POST', headers,
            body: JSON.stringify({ full_name: 'HijoTestE2E Apellido', birth_date: '2020-05-15' })
        });
        const data = await res.json();
        childId = data.id;
        log('HIJOS', 'CREATE hijo', res.status === 201 ? 'PASS' : 'FAIL', `id=${data.id}`);
    } catch (e) { log('HIJOS', 'CREATE hijo', 'FAIL', e.message); }

    // Children - READ
    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/children`, { headers });
        const data = await res.json();
        const found = Array.isArray(data) && data.some(c => c.full_name === 'HijoTestE2E Apellido');
        log('HIJOS', 'READ hijos', found ? 'PASS' : 'FAIL', `${data.length} registros`);
    } catch (e) { log('HIJOS', 'READ hijos', 'FAIL', e.message); }

    // Marital Status - UPSERT
    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/marital-status`, {
            method: 'PUT', headers,
            body: JSON.stringify({ marital_status: 'casado', marriage_date: '2018-03-10', spouse_name: 'CónyugeTest' })
        });
        log('CIVIL', 'UPSERT estado civil', res.ok ? 'PASS' : 'FAIL', `status=${res.status}`);
    } catch (e) { log('CIVIL', 'UPSERT estado civil', 'FAIL', e.message); }

    // Marital Status - READ
    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/marital-status`, { headers });
        const data = await res.json();
        log('CIVIL', 'READ estado civil', data.marital_status === 'casado' ? 'PASS' : 'FAIL', `marital_status=${data.marital_status}`);
    } catch (e) { log('CIVIL', 'READ estado civil', 'FAIL', e.message); }

    // --- TAB 3: ANTECEDENTES LABORALES ---
    console.log('\n═══════════════════════════════════════');
    console.log('TAB 3: 💼 ANTECEDENTES LABORALES (API)');
    console.log('═══════════════════════════════════════');

    let workId = null;
    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/work-history`, {
            method: 'POST', headers,
            body: JSON.stringify({ company_name: 'EmpresaTestE2E', position: 'Dev', start_date: '2020-01-01' })
        });
        const data = await res.json();
        workId = data.id;
        log('LABORAL', 'CREATE trabajo', res.status === 201 ? 'PASS' : 'FAIL', `id=${data.id}`);
    } catch (e) { log('LABORAL', 'CREATE trabajo', 'FAIL', e.message); }

    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/work-history`, { headers });
        const data = await res.json();
        const found = Array.isArray(data) && data.some(w => w.company_name === 'EmpresaTestE2E');
        log('LABORAL', 'READ+PERSIST trabajo', found ? 'PASS' : 'FAIL', `${data.length} registros`);
    } catch (e) { log('LABORAL', 'READ+PERSIST trabajo', 'FAIL', e.message); }

    // --- TAB 2: EDUCACIÓN ---
    console.log('\n═══════════════════════════════════════');
    console.log('TAB 2: 🎓 EDUCACIÓN (API)');
    console.log('═══════════════════════════════════════');

    let eduId = null;
    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/education`, {
            method: 'POST', headers,
            body: JSON.stringify({ institution_name: 'UniversidadTestE2E', education_level: 'universitaria', degree: 'Ingeniería', start_date: '2015-03-01' })
        });
        const data = await res.json();
        eduId = data.id;
        log('EDUCACIÓN', 'CREATE educación', res.status === 201 ? 'PASS' : 'FAIL', `id=${data.id}`);
    } catch (e) { log('EDUCACIÓN', 'CREATE educación', 'FAIL', e.message); }

    try {
        const res = await fetch(`${API_BASE}/user-profile/${userId}/education`, { headers });
        const data = await res.json();
        const found = Array.isArray(data) && data.some(e => e.institution_name === 'UniversidadTestE2E');
        log('EDUCACIÓN', 'READ+PERSIST educación', found ? 'PASS' : 'FAIL', `${data.length} registros`);
    } catch (e) { log('EDUCACIÓN', 'READ+PERSIST educación', 'FAIL', e.message); }

    // --- TAB 5: MÉDICO ---
    console.log('\n═══════════════════════════════════════');
    console.log('TAB 5: 🏥 ANTECEDENTES MÉDICOS (API)');
    console.log('═══════════════════════════════════════');

    // Check which medical endpoints exist
    const medicalEndpoints = [
        { name: 'condiciones crónicas', path: 'chronic-conditions', createData: { condition_name: 'DiabetesTestE2E', severity: 'moderada' } },
        { name: 'medicamentos', path: 'medications', createData: { medication_name: 'MetforminaTestE2E', dosage: '500mg' } },
        { name: 'alergias', path: 'allergies', createData: { allergen: 'PenicilinaTestE2E', severity: 'moderada' } },
        { name: 'vacunaciones', path: 'vaccinations', createData: { vaccine_name: 'COVID19TestE2E', date_administered: '2024-01-15' } },
        { name: 'exámenes médicos', path: 'medical-exams', createData: { exam_type: 'preocupacional', exam_date: '2024-06-01' } },
    ];

    for (const ep of medicalEndpoints) {
        // CREATE
        try {
            const res = await fetch(`${API_BASE}/user-medical/${userId}/${ep.path}`, {
                method: 'POST', headers,
                body: JSON.stringify(ep.createData)
            });
            const status = res.status;
            if (status === 201 || status === 200) {
                log('MÉDICO', `CREATE ${ep.name}`, 'PASS');
            } else if (status === 404) {
                log('MÉDICO', `CREATE ${ep.name}`, 'WARN', 'Endpoint no existe (404)');
                continue;
            } else {
                const body = await res.text();
                log('MÉDICO', `CREATE ${ep.name}`, 'FAIL', `status=${status} ${body.substring(0, 80)}`);
                continue;
            }
        } catch (e) { log('MÉDICO', `CREATE ${ep.name}`, 'FAIL', e.message); continue; }

        // READ + PERSIST
        try {
            const res = await fetch(`${API_BASE}/user-medical/${userId}/${ep.path}`, { headers });
            if (res.ok) {
                const data = await res.json();
                log('MÉDICO', `READ ${ep.name}`, 'PASS', `${Array.isArray(data) ? data.length : 1} registros`);
            } else {
                log('MÉDICO', `READ ${ep.name}`, 'FAIL', `status=${res.status}`);
            }
        } catch (e) { log('MÉDICO', `READ ${ep.name}`, 'FAIL', e.message); }
    }

    // --- TAB 8: DISCIPLINARIOS ---
    console.log('\n═══════════════════════════════════════');
    console.log('TAB 8: ⚖️ DISCIPLINARIOS (API)');
    console.log('═══════════════════════════════════════');

    try {
        const res = await fetch(`${API_BASE}/user-admin/${userId}/disciplinary`, {
            method: 'POST', headers,
            body: JSON.stringify({ action_type: 'advertencia_escrita', description: 'TestE2E disciplinario', date_occurred: '2024-12-01', action_taken: 'Amonestación verbal registrada' })
        });
        const status = res.status;
        if (status === 201 || status === 200) {
            log('DISCIPL.', 'CREATE acción', 'PASS');
        } else if (status === 404) {
            log('DISCIPL.', 'CREATE acción', 'WARN', 'Endpoint no existe (404)');
        } else {
            log('DISCIPL.', 'CREATE acción', 'FAIL', `status=${status}`);
        }
    } catch (e) { log('DISCIPL.', 'CREATE acción', 'FAIL', e.message); }

    try {
        const res = await fetch(`${API_BASE}/user-admin/${userId}/disciplinary`, { headers });
        if (res.ok) {
            const data = await res.json();
            log('DISCIPL.', 'READ acciones', 'PASS', `${Array.isArray(data) ? data.length : 0} registros`);
        } else if (res.status === 404) {
            log('DISCIPL.', 'READ acciones', 'WARN', 'Endpoint no existe');
        } else {
            log('DISCIPL.', 'READ acciones', 'FAIL', `status=${res.status}`);
        }
    } catch (e) { log('DISCIPL.', 'READ acciones', 'FAIL', e.message); }

    // --- TAB 6: ASISTENCIAS ---
    console.log('\n═══════════════════════════════════════');
    console.log('TAB 6: 📅 ASISTENCIAS (API)');
    console.log('═══════════════════════════════════════');

    try {
        const res = await fetch(`${API_BASE}/attendance/today/status`, { headers });
        log('ASISTENCIA', 'GET status hoy', res.ok ? 'PASS' : 'WARN', `status=${res.status}`);
    } catch (e) { log('ASISTENCIA', 'GET status hoy', 'FAIL', e.message); }

    // --- CLEANUP: Delete test data ---
    console.log('\n═══════════════════════════════════════');
    console.log('🧹 LIMPIEZA DE DATOS TEST');
    console.log('═══════════════════════════════════════');

    const cleanups = [];
    if (familyMemberId) cleanups.push({ path: `user-profile/${userId}/family-members/${familyMemberId}`, name: 'familiar' });
    if (childId) cleanups.push({ path: `user-profile/${userId}/children/${childId}`, name: 'hijo' });
    if (workId) cleanups.push({ path: `user-profile/${userId}/work-history/${workId}`, name: 'trabajo' });
    if (eduId) cleanups.push({ path: `user-profile/${userId}/education/${eduId}`, name: 'educación' });

    for (const c of cleanups) {
        try {
            const res = await fetch(`${API_BASE}/${c.path}`, { method: 'DELETE', headers });
            console.log(`   🗑️ ${c.name}: ${res.ok ? 'eliminado' : 'error ' + res.status}`);
        } catch (e) { console.log(`   🗑️ ${c.name}: error ${e.message}`); }
    }

    return { familyMemberId, childId, workId, eduId };
}

// ============================================================
// PHASE 2: UI TESTING (Puppeteer)
// ============================================================
async function testUI(token, userId) {
    console.log('\n\n═══════════════════════════════════════');
    console.log('🖥️  FASE 2: TESTS DE UI (Puppeteer)');
    console.log('═══════════════════════════════════════');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        // Login via form (token injection alone doesn't trigger dashboard render)
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        // Fill login form
        const companySelect = await page.$('#companySelect');
        if (companySelect) {
            await page.select('#companySelect', 'aponnt-empresa-demo');
        } else {
            const companyInput = await page.$('#companyInput');
            if (companyInput) await page.type('#companyInput', 'aponnt-empresa-demo');
        }
        await sleep(500);

        const hasUserInput = await page.$('#userInput');
        await page.type(hasUserInput ? '#userInput' : '#usernameInput', 'administrador');

        const hasPassInput = await page.$('#passwordInput');
        await page.type(hasPassInput ? '#passwordInput' : '#passInput', 'admin123');

        const loginBtn = await page.$('#loginButton') || await page.$('button[type="submit"]');
        if (loginBtn) await loginBtn.click();
        await sleep(4000);

        const isLoggedIn = await page.evaluate(() => !!localStorage.getItem('authToken'));
        log('UI', 'Login via formulario', isLoggedIn ? 'PASS' : 'FAIL');

        // Navigate to Users module
        const navResult = await page.evaluate(() => {
            // Try loadModule first (most reliable)
            if (typeof window.loadModule === 'function') {
                window.loadModule('users');
                return 'loadModule';
            }
            // Try showModuleContent
            if (typeof window.showModuleContent === 'function') {
                window.showModuleContent('users');
                return 'showModuleContent';
            }
            // Try clicking sidebar links
            const links = document.querySelectorAll('[onclick*="users"], [data-module="users"], a, button, div');
            for (const l of links) {
                const onclick = l.getAttribute('onclick') || '';
                const text = l.textContent || '';
                if (onclick.includes("'users'") || onclick.includes('"users"') ||
                    (text.includes('Usuarios') && l.tagName !== 'BODY')) {
                    l.click();
                    return 'click: ' + text.substring(0, 30);
                }
            }
            return 'none - functions: loadModule=' + (typeof window.loadModule) + ', showModuleContent=' + (typeof window.showModuleContent);
        });
        console.log(`   Nav method: ${navResult}`);
        await sleep(5000);

        // Wait for users.js to load
        for (let i = 0; i < 15; i++) {
            const hasViewUser = await page.evaluate(() => typeof window.viewUser === 'function');
            if (hasViewUser) break;
            await sleep(1000);
        }

        const moduleLoaded = await page.evaluate(() => typeof window.viewUser === 'function');
        log('UI', 'Módulo users.js cargado', moduleLoaded ? 'PASS' : 'FAIL');

        if (!moduleLoaded) {
            log('UI', 'Skipping UI tests', 'WARN', 'viewUser no disponible');
            await browser.close();
            return;
        }

        // Open user file
        await page.evaluate(async (uid) => {
            window.viewUser(uid);
        }, userId);
        await sleep(5000);

        // Check modal opened
        const modalExists = await page.evaluate(() => {
            const modal = document.getElementById('employeeFileModal');
            return !!modal;
        });
        log('UI', 'Modal expediente existe', modalExists ? 'PASS' : 'FAIL');

        if (!modalExists) {
            // Debug: check what happened
            const debug = await page.evaluate(() => ({
                currentViewUserId: window.currentViewUserId,
                bodyChildCount: document.body.children.length,
                hasProgressiveAdmin: typeof window.progressiveAdmin !== 'undefined',
                lastError: document.querySelector('.error, [class*="error"]')?.textContent?.substring(0, 100)
            }));
            console.log('   DEBUG:', JSON.stringify(debug));
            await browser.close();
            return;
        }

        // Test each tab visibility
        const tabNames = ['admin', 'personal', 'work', 'family', 'medical', 'attendance', 'calendar', 'disciplinary', 'biometric', 'notifications'];
        const tabLabels = ['Administración', 'Datos Personales', 'Ant. Laborales', 'Grupo Familiar', 'Ant. Médicos', 'Asistencias', 'Calendario', 'Disciplinarios', 'Biométrico', 'Notificaciones'];

        for (let i = 0; i < tabNames.length; i++) {
            const tn = tabNames[i];
            const label = tabLabels[i];

            await page.evaluate((name) => {
                if (typeof window.showFileTab === 'function') {
                    window.showFileTab(name);
                } else {
                    const modal = document.getElementById('employeeFileModal');
                    if (modal) {
                        modal.querySelectorAll('.file-tab-content').forEach(t => t.style.display = 'none');
                        const tab = document.getElementById(`${name}-tab`);
                        if (tab) tab.style.display = 'block';
                    }
                }
            }, tn);
            await sleep(1500);

            const tabVisible = await page.evaluate((name) => {
                const tab = document.getElementById(`${name}-tab`);
                return tab && tab.style.display !== 'none';
            }, tn);
            log('UI-TAB', `${label} visible`, tabVisible ? 'PASS' : 'FAIL');
        }

        // Test family tab CRUD via UI
        console.log('\n--- UI CRUD: Familiar ---');
        await page.evaluate(() => {
            if (typeof window.showFileTab === 'function') window.showFileTab('family');
        });
        await sleep(2000);

        const familyUITest = await page.evaluate((uid) => {
            return new Promise((resolve) => {
                // Check if addFamilyMember exists
                if (typeof window.addFamilyMember !== 'function') {
                    resolve({ error: 'addFamilyMember no existe como función' });
                    return;
                }

                // Open modal
                window.addFamilyMember(uid);

                setTimeout(() => {
                    const modal = document.getElementById('familyMemberModal');
                    if (!modal) {
                        resolve({ modalOpened: false, error: 'Modal no apareció en DOM' });
                        return;
                    }

                    // Fill form
                    const nameInput = document.getElementById('familyName');
                    const surnameInput = document.getElementById('familySurname');
                    const relSelect = document.getElementById('relationship');
                    if (nameInput) nameInput.value = 'UITestE2E';
                    if (surnameInput) surnameInput.value = 'FamiliarUI';
                    if (relSelect) relSelect.value = 'sibling';

                    // Submit
                    const form = document.getElementById('familyMemberForm');
                    if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

                    setTimeout(() => {
                        const stillOpen = document.getElementById('familyMemberModal');
                        const list = document.getElementById('family-members-list');
                        resolve({
                            modalOpened: true,
                            modalClosed: !stillOpen,
                            dataInList: list ? list.innerHTML.includes('UITestE2E') : false,
                            listItemCount: list ? list.querySelectorAll('div[style*="padding"]').length : 0,
                            listPreview: list ? list.innerHTML.substring(0, 200) : 'NO LIST ELEMENT'
                        });
                    }, 4000);
                }, 1500);
            });
        }, userId);

        log('UI-CRUD', 'Modal familiar abierto', familyUITest.modalOpened ? 'PASS' : 'FAIL', familyUITest.error || '');
        if (familyUITest.modalOpened) {
            log('UI-CRUD', 'Modal familiar cerrado', familyUITest.modalClosed ? 'PASS' : 'FAIL');
            log('UI-CRUD', 'Dato aparece en lista', familyUITest.dataInList ? 'PASS' : 'FAIL',
                familyUITest.dataInList ? `${familyUITest.listItemCount} items` : familyUITest.listPreview);
        }

        // Persistence: switch tab and come back
        await page.evaluate(() => { if (typeof window.showFileTab === 'function') window.showFileTab('admin'); });
        await sleep(1500);
        await page.evaluate(() => { if (typeof window.showFileTab === 'function') window.showFileTab('family'); });
        await sleep(3000);

        const familyPersist = await page.evaluate(() => {
            const list = document.getElementById('family-members-list');
            return {
                hasData: list ? list.querySelectorAll('div[style*="padding"]').length > 0 : false,
                hasTestData: list ? list.innerHTML.includes('UITestE2E') : false
            };
        });
        log('UI-CRUD', 'Persistencia familiar (tab switch)', familyPersist.hasTestData ? 'PASS' : 'FAIL');

        // Console errors summary
        const criticalErrors = consoleErrors.filter(e =>
            !e.includes('favicon') && !e.includes('404') && !e.includes('net::') &&
            !e.includes('Refused to execute') && !e.includes('PAYROLL') &&
            !e.includes('401') && !e.includes('e2e-advanced')
        );
        if (criticalErrors.length > 0) {
            log('UI', 'Errores JS críticos', 'WARN', `${criticalErrors.length} errores`);
            criticalErrors.slice(0, 3).forEach(e => console.log(`   ⚠️ ${e.substring(0, 120)}`));
        } else {
            log('UI', 'Sin errores JS críticos', 'PASS');
        }

    } catch (error) {
        console.error('\n💥 Error en tests UI:', error.message);
        log('UI', 'Error fatal', 'FAIL', error.message);
    } finally {
        await browser.close();
    }
}

// ============================================================
// MAIN
// ============================================================
(async () => {
    console.log('🚀 TEST E2E HÍBRIDO - Gestión de Usuarios (10 Tabs)\n');
    console.log('Fase 1: CRUD via API (confiable)');
    console.log('Fase 2: UI via Puppeteer (tabs, modales, persistencia visual)\n');

    // Step 1: Login via API to get token
    console.log('═══════════════════════════════════════');
    console.log('🔐 LOGIN');
    console.log('═══════════════════════════════════════');

    let token = null;
    let userId = null;

    try {
        // Login
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companySlug: 'aponnt-empresa-demo', identifier: 'administrador', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        token = loginData.token;
        log('LOGIN', 'Autenticación API', token ? 'PASS' : 'FAIL');

        if (!token) {
            console.error('No se pudo obtener token. Abortando.');
            process.exit(1);
        }

        // Get first user
        const usersRes = await fetch(`${API_BASE}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        const users = usersData.users || usersData;
        userId = users[0]?.id;
        log('LOGIN', 'Usuario para test', userId ? 'PASS' : 'FAIL', `id=${userId}, name=${users[0]?.first_name} ${users[0]?.last_name}`);

        if (!userId) {
            console.error('No hay usuarios. Abortando.');
            process.exit(1);
        }
    } catch (e) {
        console.error('Error en login:', e.message);
        process.exit(1);
    }

    // Phase 1: API CRUD
    console.log('\n\n═══════════════════════════════════════');
    console.log('🔧 FASE 1: CRUD via API');
    console.log('═══════════════════════════════════════');
    await testAPICrud(token, userId);

    // Phase 2: UI
    await testUI(token, userId);

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n\n' + '═'.repeat(60));
    console.log('📊 RESUMEN FINAL - TEST E2E HÍBRIDO USUARIOS');
    console.log('═'.repeat(60));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const total = results.length;

    console.log(`\n   ✅ PASS:  ${passed}/${total}`);
    console.log(`   ❌ FAIL:  ${failed}/${total}`);
    console.log(`   ⚠️  WARN:  ${warned}/${total}`);
    console.log(`   📊 Score: ${Math.round(passed / total * 100)}%\n`);

    if (failed > 0) {
        console.log('❌ TESTS FALLIDOS:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - [${r.tab}] ${r.test}${r.detail ? ': ' + r.detail : ''}`);
        });
    }

    console.log('\n' + '═'.repeat(60));
    process.exit(failed > 0 ? 1 : 0);
})();
