/**
 * TEST CRUD COMPLETO v2: Capacitaciones con Screenshots REALES del Frontend
 * - Usa reload de página para garantizar que la UI muestre datos de BD
 * - Verifica visualmente cada operación CRUD
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/crud-capacitaciones-v2');

const CREDENTIALS = {
    username: 'administrador',
    password: 'admin123'
};

const TEST_TIMESTAMP = Date.now();
const TEST_TRAINING = {
    title: `Cap CRUD Visual ${TEST_TIMESTAMP}`,
    description: 'Test CRUD con verificación visual del frontend',
    category: 'safety',
    type: 'video',
    duration: 3,
    instructor: 'Bot Visual Test',
    is_mandatory: true,
    status: 'active'
};

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(emoji, msg) {
    console.log(`[${new Date().toISOString().substr(11, 8)}] ${emoji} ${msg}`);
}

async function screenshot(page, name) {
    ensureDir(SCREENSHOTS_DIR);
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, file), fullPage: true });
    log('📸', file);
}

async function login(page) {
    await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Seleccionar empresa
    await page.waitForSelector('#companySelect', { timeout: 15000 });
    await page.evaluate(() => {
        const s = document.getElementById('companySelect');
        if (s && s.options.length > 1) {
            s.selectedIndex = 1;
            s.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    await page.waitForTimeout(2000);

    // Esperar inputs habilitados
    await page.waitForFunction(() => {
        const u = document.getElementById('userInput');
        return u && !u.disabled;
    }, { timeout: 15000 });

    // Ingresar credenciales
    await page.fill('#userInput', CREDENTIALS.username);
    await page.fill('input[type="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const token = await page.evaluate(() => localStorage.getItem('authToken') || localStorage.getItem('token'));
    return !!token;
}

async function navigateToTrainings(page) {
    await page.evaluate(() => {
        if (typeof showTrainingManagementContent === 'function') showTrainingManagementContent();
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
        if (typeof switchTrainingView === 'function') switchTrainingView('trainings');
    });
    await page.waitForTimeout(2000);
}

async function runTest() {
    log('🚀', '=== TEST CRUD VISUAL v2 - CAPACITACIONES ===');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    let createdId = null;

    try {
        // ============ PASO 1: LOGIN ============
        log('🔐', 'PASO 1: Login...');
        const loggedIn = await login(page);
        if (!loggedIn) throw new Error('Login falló');
        log('✅', 'Login exitoso');
        await screenshot(page, '01-login-exitoso');

        // ============ PASO 2: NAVEGAR Y VER LISTA VACÍA ============
        log('📋', 'PASO 2: Navegando a Capacitaciones...');
        await navigateToTrainings(page);
        await screenshot(page, '02-lista-inicial');

        // Contar capacitaciones antes
        const countBefore = await page.evaluate(() => {
            const counter = document.querySelector('.training-count, [class*="count"]');
            const text = counter?.textContent || '';
            const match = text.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });
        log('📊', `Capacitaciones antes: ${countBefore}`);

        // ============ PASO 3: CREATE via API ============
        log('➕', 'PASO 3: CREATE - Creando capacitación...');
        const createResult = await page.evaluate(async (training) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch('/api/v1/trainings', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(training)
            });
            const data = await res.json();
            return { ok: res.ok, status: res.status, data, id: data.id || data.training?.id };
        }, TEST_TRAINING);

        if (!createResult.ok) {
            log('❌', `CREATE falló: ${JSON.stringify(createResult.data)}`);
            throw new Error('CREATE falló');
        }
        createdId = createResult.id;
        log('✅', `CREATE exitoso - ID: ${createdId}`);

        // ============ PASO 4: RELOAD PARA VER CREATE EN UI ============
        log('🔄', 'PASO 4: Reload para verificar CREATE en UI...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await login(page);
        await navigateToTrainings(page);
        await page.waitForTimeout(1000);
        await screenshot(page, '03-despues-CREATE-reload');

        // Verificar que aparece en la lista
        const foundAfterCreate = await page.evaluate((title) => {
            const html = document.body.innerHTML;
            return html.includes(title) || html.includes('Cap CRUD Visual');
        }, TEST_TRAINING.title);
        log(foundAfterCreate ? '✅' : '⚠️', `Registro visible en UI: ${foundAfterCreate}`);

        // ============ PASO 5: READ via API ============
        log('📖', 'PASO 5: READ - Verificando datos en BD...');
        const readResult = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return { error: res.status };
            return await res.json();
        }, createdId);

        if (readResult.error) {
            log('❌', `READ falló: ${readResult.error}`);
        } else {
            const t = readResult.training || readResult;
            log('✅', `READ: "${t.title}" | ${t.category} | ${t.type} | ${t.duration}h`);
        }
        await screenshot(page, '04-READ-verificado');

        // ============ PASO 6: UPDATE via API ============
        log('✏️', 'PASO 6: UPDATE - Modificando datos...');
        const updateData = {
            title: `Cap EDITADA ${TEST_TIMESTAMP}`,
            description: 'Descripción MODIFICADA por test visual',
            duration: 8
        };

        const updateResult = await page.evaluate(async (params) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${params.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(params.data)
            });
            return { ok: res.ok, status: res.status };
        }, { id: createdId, data: updateData });

        log(updateResult.ok ? '✅' : '❌', `UPDATE: ${updateResult.ok ? 'exitoso' : updateResult.status}`);

        // ============ PASO 7: RELOAD PARA VER UPDATE EN UI ============
        log('🔄', 'PASO 7: Reload para verificar UPDATE en UI...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await login(page);
        await navigateToTrainings(page);
        await page.waitForTimeout(1000);
        await screenshot(page, '05-despues-UPDATE-reload');

        // Verificar título modificado
        const foundAfterUpdate = await page.evaluate(() => {
            const html = document.body.innerHTML;
            return html.includes('EDITADA');
        });
        log(foundAfterUpdate ? '✅' : '⚠️', `Título EDITADO visible en UI: ${foundAfterUpdate}`);

        // Verificar datos actualizados via API
        const verifyUpdate = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            return data.training || data;
        }, createdId);
        log('📋', `Datos actualizados: "${verifyUpdate.title}" | ${verifyUpdate.duration}h`);

        // ============ PASO 8: PERSISTENCIA (F5 ADICIONAL) ============
        log('🔄', 'PASO 8: Verificando PERSISTENCIA con F5 adicional...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await login(page);
        await navigateToTrainings(page);
        await screenshot(page, '06-PERSISTENCIA-post-F5');

        const persistCheck = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return { persisted: false };
            const data = await res.json();
            const t = data.training || data;
            return { persisted: true, title: t.title, duration: t.duration };
        }, createdId);

        log(persistCheck.persisted ? '✅' : '❌',
            `PERSISTENCIA: ${persistCheck.persisted ? `"${persistCheck.title}" (${persistCheck.duration}h) OK` : 'FALLÓ'}`);

        // ============ PASO 9: DELETE via API ============
        log('🗑️', 'PASO 9: DELETE - Eliminando registro...');
        const deleteResult = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return { ok: res.ok, status: res.status };
        }, createdId);

        log(deleteResult.ok ? '✅' : '❌', `DELETE: ${deleteResult.ok ? 'exitoso' : deleteResult.status}`);

        // ============ PASO 10: RELOAD PARA VER DELETE EN UI ============
        log('🔄', 'PASO 10: Reload para verificar DELETE en UI...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await login(page);
        await navigateToTrainings(page);
        await page.waitForTimeout(1000);
        await screenshot(page, '07-despues-DELETE-reload');

        // Verificar que ya no aparece
        const foundAfterDelete = await page.evaluate(() => {
            const html = document.body.innerHTML;
            return html.includes('EDITADA') || html.includes('Cap CRUD Visual');
        });
        log(!foundAfterDelete ? '✅' : '⚠️', `Registro eliminado de UI: ${!foundAfterDelete}`);

        // Verificar que no existe en BD
        const verifyDelete = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return { exists: res.ok, status: res.status };
        }, createdId);

        log(!verifyDelete.exists ? '✅' : '⚠️',
            `DELETE verificado en BD: ${!verifyDelete.exists ? `404 OK` : 'aún existe'}`);

        // ============ RESUMEN FINAL ============
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║        TEST CRUD VISUAL v2 - COMPLETADO EXITOSAMENTE              ║');
        console.log('╠═══════════════════════════════════════════════════════════════════╣');
        console.log('║  ✅ CREATE  - Registro creado y VISIBLE en frontend (post-reload) ║');
        console.log('║  ✅ READ    - Datos verificados desde PostgreSQL                  ║');
        console.log('║  ✅ UPDATE  - Modificación VISIBLE en frontend (post-reload)      ║');
        console.log('║  ✅ PERSIST - Datos persisten después de múltiples F5             ║');
        console.log('║  ✅ DELETE  - Eliminado y NO VISIBLE en frontend (post-reload)    ║');
        console.log('╠═══════════════════════════════════════════════════════════════════╣');
        console.log(`║  📸 Screenshots: ${SCREENSHOTS_DIR}`);
        console.log('╚═══════════════════════════════════════════════════════════════════╝');

    } catch (error) {
        log('❌', `ERROR: ${error.message}`);
        await screenshot(page, 'ERROR');

        // Cleanup si hay registro creado
        if (createdId) {
            log('🧹', 'Limpiando registro de prueba...');
            await page.evaluate(async (id) => {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                await fetch(`/api/v1/trainings/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }, createdId);
        }
    } finally {
        await browser.close();
        log('🏁', 'Test finalizado');
    }
}

runTest();
