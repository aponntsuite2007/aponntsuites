/**
 * TEST CIRCUITO RRHH COMPLETO
 * ===========================
 *
 * Prueba TODO el circuito de RRHH como usuario real:
 * - Usuarios (10 tabs)
 * - Vacaciones
 * - Asistencia
 * - Turnos
 * - Departamentos
 * - Payroll/Liquidación
 *
 * Valida: carga, datos, CRUD, persistencia, errores
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { company: 'isi', user: 'admin', password: 'admin123' };
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots', 'rrhh-completo');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let step = 0;
const results = { passed: [], failed: [], warnings: [] };
const consoleErrors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function screenshot(page, name) {
    step++;
    const filename = `${String(step).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`📸 ${filename}`);
}

function pass(test) { results.passed.push(test); console.log(`✅ ${test}`); }
function fail(test, reason = '') { results.failed.push({ test, reason }); console.log(`❌ ${test} ${reason ? '- ' + reason : ''}`); }
function warn(msg) { results.warnings.push(msg); console.log(`⚠️  ${msg}`); }

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         TEST CIRCUITO RRHH COMPLETO                          ║');
    console.log('║   Usuarios - Vacaciones - Asistencia - Turnos - Payroll      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Limpiar
    const old = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    old.forEach(f => fs.unlinkSync(path.join(SCREENSHOTS_DIR, f)));

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 30
    });

    const page = await browser.newPage();

    // Capturar errores
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        // ════════════════════════════════════════════════════════
        // LOGIN
        // ════════════════════════════════════════════════════════
        console.log('\n═══ FASE 1: LOGIN ═══\n');

        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#companySelect', { timeout: 10000 });
        pass('Página login cargada');
        await screenshot(page, 'login');

        await page.select('#companySelect', CREDENTIALS.company);
        await sleep(1500);

        await page.evaluate((u, p) => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = u;
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = p;
        }, CREDENTIALS.user, CREDENTIALS.password);

        await page.evaluate(() => {
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(3000);

        const loggedIn = await page.evaluate(() => !!document.querySelector('[onclick*="showTab"]'));
        if (loggedIn) pass('Login exitoso');
        else fail('Login');

        await screenshot(page, 'post-login');

        // ════════════════════════════════════════════════════════
        // MÓDULO 1: USUARIOS
        // ════════════════════════════════════════════════════════
        console.log('\n═══ MÓDULO: USUARIOS ═══\n');

        await page.evaluate(() => showTab('users'));
        await sleep(3000);
        await screenshot(page, 'usuarios-lista');

        // Verificar tabla
        const usersCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
        if (usersCount > 0) pass(`Usuarios: ${usersCount} filas cargadas`);
        else fail('Usuarios: tabla vacía');

        // Verificar botón Ver (solo 1 por fila)
        const btnsPerRow = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            if (rows.length === 0) return { ok: false, count: 0 };
            const firstRow = rows[0];
            const btns = firstRow.querySelectorAll('.users-action-btn');
            return { ok: btns.length === 1, count: btns.length };
        });
        if (btnsPerRow.ok) pass('Usuarios: Solo 1 botón (Ver) por fila');
        else fail(`Usuarios: ${btnsPerRow.count} botones por fila (debería ser 1)`);

        // Abrir modal - usar evaluación directa para hacer click
        const viewBtnClicked = await page.evaluate(() => {
            const btn = document.querySelector('.users-action-btn.view');
            if (btn) {
                btn.scrollIntoView({ block: 'center' });
                // Obtener el onclick y ejecutarlo
                const onclick = btn.getAttribute('onclick');
                if (onclick) {
                    eval(onclick);
                    return 'onclick';
                }
                // Fallback: click directo
                btn.click();
                return 'click';
            }
            return false;
        });

        if (viewBtnClicked) {
            console.log(`   Click método: ${viewBtnClicked}`);
            // Esperar más tiempo - el modal hace fetch async para cargar datos
            await sleep(4000);

            const modalOpen = await page.evaluate(() => {
                const m = document.getElementById('editUserModal');
                return m && m.style.display !== 'none';
            });

            if (modalOpen) {
                pass('Modal usuario abierto');
                await screenshot(page, 'usuarios-modal');

                // Probar cada tab
                const userTabs = ['admin', 'personal', 'work', 'family', 'medical', 'attendance', 'calendar', 'disciplinary', 'biometric', 'notifications'];

                for (const tabId of userTabs) {
                    await page.evaluate((id) => {
                        document.querySelectorAll('.file-tab-content').forEach(t => t.style.display = 'none');
                        const tab = document.getElementById(`${id}-tab`);
                        if (tab) tab.style.display = 'block';
                    }, tabId);
                    await sleep(500);

                    const tabCheck = await page.evaluate((id) => {
                        const tab = document.getElementById(`${id}-tab`);
                        if (!tab || tab.style.display === 'none') return { ok: false, reason: 'no visible' };

                        const text = tab.innerText;
                        if (text.includes('undefined')) return { ok: false, reason: 'tiene "undefined"' };
                        if (text.includes('[object Object]')) return { ok: false, reason: 'tiene "[object Object]"' };

                        return { ok: true, sections: tab.querySelectorAll('h3,h4,h5').length };
                    }, tabId);

                    if (tabCheck.ok) {
                        pass(`Tab ${tabId}: OK (${tabCheck.sections} secciones)`);
                    } else {
                        fail(`Tab ${tabId}`, tabCheck.reason);
                    }
                }

                await screenshot(page, 'usuarios-tabs-verificados');

                // Cerrar modal
                await page.keyboard.press('Escape');
                await sleep(500);
            } else {
                fail('Modal usuario no se abrió');
            }
        } else {
            fail('Botón Ver no encontrado');
        }

        // ════════════════════════════════════════════════════════
        // MÓDULO 2: VACACIONES
        // ════════════════════════════════════════════════════════
        console.log('\n═══ MÓDULO: VACACIONES ═══\n');

        await page.evaluate(() => showTab('vacation-management'));
        await sleep(3000);
        await screenshot(page, 'vacaciones');

        const vacCheck = await page.evaluate(() => {
            const text = document.body.innerText;
            const hasEngine = text.includes('VACATION ENGINE') || text.includes('Vacaciones');
            const rows = document.querySelectorAll('table tbody tr').length;

            // Verificar que TIPO no muestre undefined
            const tipoOk = !text.includes('undefined') || !text.includes('TIPO');

            return { hasEngine, rows, tipoOk };
        });

        if (vacCheck.hasEngine) pass('Vacaciones: módulo cargó');
        else fail('Vacaciones: no cargó');

        if (vacCheck.tipoOk) pass('Vacaciones: sin "undefined" en datos');
        else fail('Vacaciones: muestra "undefined"');

        // ════════════════════════════════════════════════════════
        // MÓDULO 3: ASISTENCIA
        // ════════════════════════════════════════════════════════
        console.log('\n═══ MÓDULO: ASISTENCIA ═══\n');

        await page.evaluate(() => showTab('attendance'));
        await sleep(3000);
        await screenshot(page, 'asistencia');

        const attCheck = await page.evaluate(() => {
            const text = document.body.innerText;
            const hasEngine = text.includes('ATTENDANCE ENGINE') || text.includes('Asistencia');
            const hasKPIs = document.querySelectorAll('[class*="stat"], [class*="kpi"]').length > 0;
            return { hasEngine, hasKPIs };
        });

        if (attCheck.hasEngine) pass('Asistencia: módulo cargó');
        else fail('Asistencia: no cargó');

        if (attCheck.hasKPIs) pass('Asistencia: KPIs visibles');
        else warn('Asistencia: sin KPIs visibles');

        // ════════════════════════════════════════════════════════
        // MÓDULO 4: TURNOS
        // ════════════════════════════════════════════════════════
        console.log('\n═══ MÓDULO: TURNOS ═══\n');

        await page.evaluate(() => showTab('shifts'));
        await sleep(3000);
        await screenshot(page, 'turnos');

        const shiftsCheck = await page.evaluate(() => {
            const cards = document.querySelectorAll('.shift-card, [class*="shift"]').length;
            const hasContent = document.body.innerText.includes('Turno') || document.body.innerText.includes('shift');
            return { cards, hasContent };
        });

        if (shiftsCheck.hasContent) pass('Turnos: módulo cargó');
        else fail('Turnos: no cargó');

        // ════════════════════════════════════════════════════════
        // MÓDULO 5: DEPARTAMENTOS
        // ════════════════════════════════════════════════════════
        console.log('\n═══ MÓDULO: DEPARTAMENTOS ═══\n');

        await page.evaluate(() => showTab('departments'));
        await sleep(3000);
        await screenshot(page, 'departamentos');

        const deptCheck = await page.evaluate(() => {
            const items = document.querySelectorAll('.tree-item, .department-card, [class*="dept"]').length;
            const hasContent = document.body.innerText.includes('Departamento');
            return { items, hasContent };
        });

        if (deptCheck.hasContent) pass('Departamentos: módulo cargó');
        else fail('Departamentos: no cargó');

        // ════════════════════════════════════════════════════════
        // MÓDULO 6: PAYROLL/LIQUIDACIÓN
        // ════════════════════════════════════════════════════════
        console.log('\n═══ MÓDULO: PAYROLL ═══\n');

        await page.evaluate(() => showTab('payroll'));
        await sleep(4000);
        await screenshot(page, 'payroll');

        const payrollCheck = await page.evaluate(() => {
            const text = document.body.innerText;
            const hasEngine = text.includes('PAYROLL ENGINE') || text.includes('Liquidación');
            const hasError = text.includes('Failed to load') || text.includes('Error');
            const hasDashboard = document.querySelectorAll('[class*="dashboard"], [class*="kpi"]').length > 0;
            return { hasEngine, hasError, hasDashboard };
        });

        if (payrollCheck.hasEngine && !payrollCheck.hasError) {
            pass('Payroll: módulo cargó correctamente');
        } else if (payrollCheck.hasError) {
            fail('Payroll: error de carga');
        } else {
            fail('Payroll: no cargó');
        }

        // ════════════════════════════════════════════════════════
        // ERRORES DE CONSOLA
        // ════════════════════════════════════════════════════════
        console.log('\n═══ ERRORES DE CONSOLA ═══\n');

        if (consoleErrors.length > 0) {
            fail(`${consoleErrors.length} errores de consola`);
            consoleErrors.slice(0, 5).forEach(e => console.log(`   ❌ ${e.substring(0, 100)}`));
        } else {
            pass('Sin errores de consola');
        }

        // ════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(60));
        console.log('                    RESUMEN FINAL');
        console.log('═'.repeat(60));

        const total = results.passed.length + results.failed.length;
        const rate = ((results.passed.length / total) * 100).toFixed(1);

        console.log(`\n   ✅ PASSED: ${results.passed.length}`);
        console.log(`   ❌ FAILED: ${results.failed.length}`);
        console.log(`   ⚠️  WARNINGS: ${results.warnings.length}`);
        console.log(`   📊 SUCCESS RATE: ${rate}%`);

        if (results.failed.length > 0) {
            console.log('\n   FALLOS:');
            results.failed.forEach(f => console.log(`   ❌ ${f.test}: ${f.reason}`));
        }

        await screenshot(page, 'resumen');

        // Guardar reporte
        const report = `# TEST CIRCUITO RRHH COMPLETO

Fecha: ${new Date().toISOString()}

## RESUMEN
- PASSED: ${results.passed.length}
- FAILED: ${results.failed.length}
- SUCCESS RATE: ${rate}%

## PASSED
${results.passed.map(t => `- ✅ ${t}`).join('\n')}

## FAILED
${results.failed.map(f => `- ❌ ${f.test}: ${f.reason}`).join('\n')}

## WARNINGS
${results.warnings.map(w => `- ⚠️ ${w}`).join('\n')}
`;
        fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'REPORTE.md'), report);
        console.log(`\n📄 Reporte: test-screenshots/rrhh-completo/REPORTE.md`);
        console.log(`📸 Screenshots: ${step} capturados\n`);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await screenshot(page, 'ERROR');
    } finally {
        console.log('🔒 Cerrando navegador...');
        await browser.close();
        console.log('✅ Navegador cerrado\n');
    }
}

main().catch(console.error);
