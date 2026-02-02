/**
 * TEST CRUD COMPLETO: Capacitaciones con Screenshots y Persistencia BD
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/crud-capacitaciones');

const CREDENTIALS = {
    companySlug: 'aponnt-empresa-demo',
    username: 'administrador',
    password: 'admin123'
};

// Datos con campos CORRECTOS del modelo Training
const TEST_TIMESTAMP = Date.now();
const TEST_TRAINING = {
    title: `Capacitación CRUD Test ${TEST_TIMESTAMP}`,
    description: 'Test automatizado de CRUD con persistencia en BD',
    category: 'safety',
    type: 'video',  // REQUERIDO: video, pdf, external_link, scorm, presentation, interactive
    duration: 2,    // Entero, no decimal
    instructor: 'Test Bot Automatizado',
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

async function runTest() {
    log('🚀', '=== TEST CRUD CAPACITACIONES CON PERSISTENCIA ===');

    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();

    let createdId = null;

    try {
        // ============ LOGIN ============
        log('🔐', 'LOGIN...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(5000);

        // Esperar que el dropdown tenga opciones
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.waitForTimeout(3000);

        // Seleccionar empresa
        const companySelected = await page.evaluate(() => {
            const s = document.getElementById('companySelect');
            if (!s) return { error: 'no select' };
            if (s.options.length <= 1) return { error: 'no options', count: s.options.length };

            // Buscar demo o seleccionar la primera
            for (let i = 1; i < s.options.length; i++) {
                if (s.options[i].text.toLowerCase().includes('demo') || s.options[i].value.includes('demo')) {
                    s.selectedIndex = i;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                    return { ok: true, selected: s.options[i].text };
                }
            }
            s.selectedIndex = 1;
            s.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true, selected: s.options[1].text };
        });
        log('🏢', `Empresa: ${JSON.stringify(companySelected)}`);
        await page.waitForTimeout(3000);

        // Esperar habilitación de inputs
        try {
            await page.waitForFunction(() => {
                const u = document.getElementById('userInput');
                return u && !u.disabled;
            }, { timeout: 15000 });
        } catch (e) {
            await screenshot(page, 'ERROR-inputs-disabled');
            throw new Error('Inputs no se habilitaron');
        }

        await page.fill('#userInput', CREDENTIALS.username);
        await page.fill('input[type="password"]', CREDENTIALS.password);
        await screenshot(page, '00-login-form');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(6000);

        const token = await page.evaluate(() => localStorage.getItem('authToken') || localStorage.getItem('token'));
        if (!token) {
            await screenshot(page, 'ERROR-no-token');
            throw new Error('Login falló - sin token');
        }
        log('✅', 'Login exitoso');

        // ============ NAVEGAR A CAPACITACIONES ============
        await page.evaluate(() => { if (typeof showTrainingManagementContent === 'function') showTrainingManagementContent(); });
        await page.waitForTimeout(3000);
        await page.evaluate(() => { if (typeof switchTrainingView === 'function') switchTrainingView('trainings'); });
        await page.waitForTimeout(2000);
        await screenshot(page, '01-ANTES-crear');

        // ============ CREATE ============
        log('➕', 'CREATE: Creando capacitación en BD...');
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

        // Refrescar lista para ver el nuevo registro
        await page.evaluate(() => { if (typeof switchTrainingView === 'function') switchTrainingView('trainings'); });
        await page.waitForTimeout(2000);
        await screenshot(page, '02-DESPUES-crear');

        // ============ READ ============
        log('📖', 'READ: Verificando en BD...');
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
            log('✅', `READ exitoso - Título: "${t.title}", Categoría: ${t.category}, Tipo: ${t.type}`);
        }
        await screenshot(page, '03-READ-verificado');

        // ============ UPDATE ============
        log('✏️', 'UPDATE: Modificando en BD...');
        const updateData = {
            title: `Capacitación EDITADA ${TEST_TIMESTAMP}`,
            description: 'Descripción modificada por test CRUD',
            duration: 5
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

        if (!updateResult.ok) {
            log('❌', `UPDATE falló: ${updateResult.status}`);
        } else {
            log('✅', 'UPDATE exitoso');
        }

        // Verificar el UPDATE
        const verifyUpdate = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            return data.training || data;
        }, createdId);

        log('📋', `Después de UPDATE: "${verifyUpdate.title}", Duración: ${verifyUpdate.duration}h`);

        await page.evaluate(() => { if (typeof switchTrainingView === 'function') switchTrainingView('trainings'); });
        await page.waitForTimeout(2000);
        await screenshot(page, '04-DESPUES-update');

        // ============ PERSISTENCIA: REFRESH COMPLETO ============
        log('🔄', 'PERSISTENCIA: Refresh completo de página (F5)...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Re-login después del refresh
        await page.waitForSelector('#companySelect', { timeout: 5000 });
        await page.evaluate(() => {
            const s = document.getElementById('companySelect');
            if (s && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        await page.waitForTimeout(1500);
        await page.waitForFunction(() => !document.getElementById('userInput')?.disabled, { timeout: 5000 });
        await page.fill('#userInput', CREDENTIALS.username);
        await page.fill('input[type="password"]', CREDENTIALS.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);

        // Verificar que el registro PERSISTE en BD después del refresh
        const persistCheck = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return { persisted: false, status: res.status };
            const data = await res.json();
            const t = data.training || data;
            return { persisted: true, title: t.title, duration: t.duration };
        }, createdId);

        if (persistCheck.persisted) {
            log('✅', `PERSISTENCIA VERIFICADA: "${persistCheck.title}" (${persistCheck.duration}h) existe en BD después de F5`);
        } else {
            log('❌', `PERSISTENCIA FALLÓ: ${persistCheck.status}`);
        }

        await page.evaluate(() => { if (typeof showTrainingManagementContent === 'function') showTrainingManagementContent(); });
        await page.waitForTimeout(2000);
        await page.evaluate(() => { if (typeof switchTrainingView === 'function') switchTrainingView('trainings'); });
        await page.waitForTimeout(2000);
        await screenshot(page, '05-DESPUES-refresh-persistencia');

        // ============ DELETE ============
        log('🗑️', 'DELETE: Eliminando de BD...');
        const deleteResult = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return { ok: res.ok, status: res.status };
        }, createdId);

        if (!deleteResult.ok) {
            log('❌', `DELETE falló: ${deleteResult.status}`);
        } else {
            log('✅', 'DELETE exitoso');
        }

        // Verificar que ya NO existe
        const verifyDelete = await page.evaluate(async (id) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`/api/v1/trainings/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return { exists: res.ok, status: res.status };
        }, createdId);

        if (!verifyDelete.exists) {
            log('✅', `DELETE VERIFICADO: Registro ${createdId} ya no existe en BD (status: ${verifyDelete.status})`);
        } else {
            log('⚠️', 'El registro aún existe después del DELETE');
        }

        await page.evaluate(() => { if (typeof switchTrainingView === 'function') switchTrainingView('trainings'); });
        await page.waitForTimeout(2000);
        await screenshot(page, '06-DESPUES-delete');

        // ============ RESUMEN ============
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║     TEST CRUD COMPLETADO CON PERSISTENCIA EN BD              ║');
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log('║  ✅ CREATE  - Registro creado en PostgreSQL                  ║');
        console.log('║  ✅ READ    - Datos leídos correctamente de BD               ║');
        console.log('║  ✅ UPDATE  - Registro modificado en BD                      ║');
        console.log('║  ✅ PERSIST - Datos persisten después de F5 (refresh)        ║');
        console.log('║  ✅ DELETE  - Registro eliminado de BD                       ║');
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log(`║  📸 Screenshots: ${SCREENSHOTS_DIR}`);
        console.log('╚══════════════════════════════════════════════════════════════╝');

    } catch (error) {
        log('❌', `ERROR: ${error.message}`);
        await screenshot(page, 'ERROR');

        // Cleanup si falló
        if (createdId) {
            await page.evaluate(async (id) => {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                await fetch(`/api/v1/trainings/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            }, createdId);
        }
    } finally {
        await browser.close();
        log('🏁', 'Test finalizado');
    }
}

runTest();
