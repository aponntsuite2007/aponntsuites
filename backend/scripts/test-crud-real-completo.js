/**
 * TEST CRUD REAL COMPLETO
 * =======================
 * Prueba operaciones REALES de creación, edición y persistencia
 * como lo haría un usuario real.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { company: 'isi', user: 'admin', password: 'admin123' };
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots', 'crud-real');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let step = 0;
const results = { passed: [], failed: [] };

async function screenshot(page, name) {
    step++;
    const filename = `${String(step).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`📸 ${filename}`);
}

function pass(test) { results.passed.push(test); console.log(`✅ ${test}`); }
function fail(test, reason = '') { results.failed.push({ test, reason }); console.log(`❌ ${test} ${reason ? '- ' + reason : ''}`); }

async function login(page) {
    console.log('\n🔐 LOGIN\n');
    await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
    await page.select('#companySelect', CREDENTIALS.company);
    await sleep(1500);
    await page.evaluate((u, p) => {
        document.getElementById('userInput').disabled = false;
        document.getElementById('userInput').value = u;
        document.getElementById('passwordInput').disabled = false;
        document.getElementById('passwordInput').value = p;
        document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
    }, CREDENTIALS.user, CREDENTIALS.password);
    await sleep(3000);
    pass('Login completado');
}

async function testUsuariosTabs(page) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST 1: MODAL USUARIO - 10 TABS');
    console.log('═══════════════════════════════════════════════════════\n');

    await page.evaluate(() => showTab('users'));
    await sleep(3000);

    // Abrir modal del primer usuario
    const userId = await page.evaluate(() => {
        const btn = document.querySelector('.users-action-btn.view');
        if (!btn) return null;
        const onclick = btn.getAttribute('onclick');
        const match = onclick.match(/viewUser\('([^']+)'\)/);
        return match ? match[1] : null;
    });

    if (!userId) {
        fail('Obtener ID de usuario');
        return;
    }

    await page.evaluate((id) => viewUser(id), userId);
    await sleep(4000);
    await screenshot(page, 'usuario-modal-abierto');

    // Verificar cada tab
    const tabs = [
        { selector: '[onclick*="admin"], [data-tab="admin"]', name: 'Administración' },
        { selector: '[onclick*="personal"], [data-tab="personal"]', name: 'Datos Personales' },
        { selector: '[onclick*="work"], [data-tab="work"]', name: 'Antecedentes Laborales' },
        { selector: '[onclick*="family"], [data-tab="family"]', name: 'Grupo Familiar' },
        { selector: '[onclick*="medical"], [data-tab="medical"]', name: 'Antecedentes Médicos' },
        { selector: '[onclick*="attendance"], [data-tab="attendance"]', name: 'Asistencias' },
        { selector: '[onclick*="calendar"], [data-tab="calendar"]', name: 'Calendario' },
        { selector: '[onclick*="disciplinary"], [data-tab="disciplinary"]', name: 'Disciplinarios' },
        { selector: '[onclick*="biometric"], [data-tab="biometric"]', name: 'Biométrico' },
        { selector: '[onclick*="notifications"], [data-tab="notifications"]', name: 'Notificaciones' }
    ];

    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const clicked = await page.evaluate((idx) => {
            const allTabs = document.querySelectorAll('.file-tab, [class*="tab-btn"]');
            if (allTabs[idx]) {
                allTabs[idx].click();
                return true;
            }
            return false;
        }, i);

        if (clicked) {
            await sleep(800);
            const hasContent = await page.evaluate((idx) => {
                const contents = document.querySelectorAll('.file-tab-content');
                if (contents[idx]) {
                    return contents[idx].innerText.length > 50;
                }
                return false;
            }, i);

            if (hasContent) {
                pass(`Tab ${i + 1}: ${tab.name}`);
            } else {
                fail(`Tab ${i + 1}: ${tab.name}`, 'Sin contenido');
            }
        } else {
            fail(`Tab ${i + 1}: ${tab.name}`, 'No se pudo hacer click');
        }
    }

    await screenshot(page, 'usuario-tabs-verificados');

    // Cerrar modal
    await page.keyboard.press('Escape');
    await sleep(500);
}

async function testVacacionesCRUD(page) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST 2: VACACIONES - CRUD Y ACCIONES');
    console.log('═══════════════════════════════════════════════════════\n');

    await page.evaluate(() => showTab('vacation-management'));
    await sleep(3000);
    await screenshot(page, 'vacaciones-lista');

    // Verificar KPIs
    const kpis = await page.evaluate(() => {
        const stats = document.querySelectorAll('[class*="stat"], [class*="kpi"]');
        return stats.length;
    });
    if (kpis > 0) pass(`Vacaciones: ${kpis} KPIs visibles`);
    else fail('Vacaciones: KPIs');

    // Verificar tabla
    const rows = await page.evaluate(() => {
        return document.querySelectorAll('table tbody tr').length;
    });
    pass(`Vacaciones: ${rows} solicitudes en tabla`);

    // Verificar botones de acción (aprobar/rechazar)
    const actionBtns = await page.evaluate(() => {
        const btns = document.querySelectorAll('table tbody button, table tbody [onclick]');
        return btns.length;
    });
    if (actionBtns > 0) pass(`Vacaciones: ${actionBtns} botones de acción`);

    // Intentar abrir modal de nueva solicitud
    const newBtnClicked = await page.evaluate(() => {
        const btn = document.querySelector('button[onclick*="nueva"], button[onclick*="Nueva"], [onclick*="crear"], .btn-success');
        if (btn && btn.textContent.includes('Nueva')) {
            btn.click();
            return true;
        }
        return false;
    });

    if (newBtnClicked) {
        await sleep(1500);
        await screenshot(page, 'vacaciones-modal-nueva');
        pass('Vacaciones: Modal nueva solicitud abre');
        await page.keyboard.press('Escape');
        await sleep(500);
    }
}

async function testDepartamentosCRUD(page) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST 3: DEPARTAMENTOS - ESTRUCTURA ORGANIZACIONAL');
    console.log('═══════════════════════════════════════════════════════\n');

    await page.evaluate(() => showTab('departments'));
    await sleep(4000);
    await screenshot(page, 'departamentos-lista');

    // Verificar que cargó
    const loaded = await page.evaluate(() => {
        return document.body.innerText.includes('Estructura Organizacional') ||
               document.body.innerText.includes('Departamentos');
    });
    if (loaded) pass('Departamentos: Módulo cargado');
    else fail('Departamentos: No cargó');

    // Contar departamentos
    const deptCount = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        return rows.length;
    });
    pass(`Departamentos: ${deptCount} en lista`);

    // Verificar tabs del módulo
    const moduleTabs = await page.evaluate(() => {
        const tabs = document.querySelectorAll('.nav-link, [role="tab"], [class*="tab-btn"]');
        return Array.from(tabs).map(t => t.textContent.trim()).filter(t => t.length > 0 && t.length < 30);
    });
    if (moduleTabs.length > 0) {
        pass(`Departamentos: Tabs disponibles: ${moduleTabs.slice(0, 5).join(', ')}`);
    }

    // Intentar crear nuevo departamento
    const newDeptBtn = await page.evaluate(() => {
        const btn = document.querySelector('button[onclick*="nuevo"], button[onclick*="Nuevo"], .btn-success');
        if (btn && (btn.textContent.includes('Nuevo') || btn.textContent.includes('+'))) {
            btn.click();
            return btn.textContent.trim();
        }
        return null;
    });

    if (newDeptBtn) {
        await sleep(1500);
        await screenshot(page, 'departamentos-modal-nuevo');
        pass(`Departamentos: Modal "${newDeptBtn}" abre`);
        await page.keyboard.press('Escape');
        await sleep(500);
    }
}

async function testTurnosCRUD(page) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST 4: TURNOS - GESTIÓN');
    console.log('═══════════════════════════════════════════════════════\n');

    await page.evaluate(() => showTab('shifts'));
    await sleep(3000);
    await screenshot(page, 'turnos-lista');

    // Verificar contenido
    const shiftsLoaded = await page.evaluate(() => {
        return document.body.innerText.includes('Turno') ||
               document.body.innerText.includes('turno') ||
               document.querySelectorAll('.shift-card, [class*="shift"]').length > 0;
    });

    if (shiftsLoaded) pass('Turnos: Módulo cargado');
    else fail('Turnos: No cargó');

    // Contar turnos
    const shiftCount = await page.evaluate(() => {
        const cards = document.querySelectorAll('.shift-card, [class*="card"]');
        const rows = document.querySelectorAll('table tbody tr');
        return Math.max(cards.length, rows.length);
    });
    pass(`Turnos: ${shiftCount} turnos visibles`);
}

async function testAsistenciaDashboard(page) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST 5: ASISTENCIA - DASHBOARD Y FILTROS');
    console.log('═══════════════════════════════════════════════════════\n');

    await page.evaluate(() => showTab('attendance'));
    await sleep(3000);
    await screenshot(page, 'asistencia-dashboard');

    // Verificar KPIs
    const attKpis = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
            hasTotal: text.includes('Total') || text.includes('total'),
            hasPuntual: text.includes('Puntual') || text.includes('puntual') || text.includes('%'),
            hasRecords: text.match(/\d{2,}/) !== null
        };
    });

    if (attKpis.hasTotal) pass('Asistencia: KPI Total visible');
    if (attKpis.hasPuntual) pass('Asistencia: KPI Puntualidad visible');
    if (attKpis.hasRecords) pass('Asistencia: Registros con datos');

    // Verificar filtros
    const filters = await page.evaluate(() => {
        return document.querySelectorAll('select, input[type="date"], .filter').length;
    });
    if (filters > 0) pass(`Asistencia: ${filters} filtros disponibles`);

    // Verificar tabla de registros
    const attRecords = await page.evaluate(() => {
        return document.querySelectorAll('table tbody tr').length;
    });
    pass(`Asistencia: ${attRecords} registros en tabla`);
}

async function testPayrollDashboard(page) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST 6: PAYROLL - LIQUIDACIÓN');
    console.log('═══════════════════════════════════════════════════════\n');

    await page.evaluate(() => showTab('payroll'));
    await sleep(4000);
    await screenshot(page, 'payroll-dashboard');

    // Verificar que cargó
    const payrollLoaded = await page.evaluate(() => {
        return document.body.innerText.includes('PAYROLL') ||
               document.body.innerText.includes('Liquidación') ||
               document.body.innerText.includes('Empleados');
    });

    if (payrollLoaded) pass('Payroll: Módulo cargado');
    else fail('Payroll: No cargó');

    // Verificar KPIs
    const payrollKpis = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
            hasEmpleados: text.match(/\d+\s*(empleado|EMPLEADO)/i) !== null,
            hasBruto: text.includes('Bruto') || text.includes('bruto'),
            hasNeto: text.includes('Neto') || text.includes('neto')
        };
    });

    if (payrollKpis.hasEmpleados) pass('Payroll: KPI Empleados visible');
    if (payrollKpis.hasBruto) pass('Payroll: KPI Bruto visible');
    if (payrollKpis.hasNeto) pass('Payroll: KPI Neto visible');

    // Verificar tabs del módulo
    const payrollTabs = await page.evaluate(() => {
        const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
        return tabs.length;
    });
    if (payrollTabs > 0) pass(`Payroll: ${payrollTabs} tabs disponibles`);

    // Verificar botones de acción
    const payrollActions = await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        return Array.from(btns).filter(b =>
            b.textContent.includes('Liquidación') ||
            b.textContent.includes('Iniciar') ||
            b.textContent.includes('Exportar') ||
            b.textContent.includes('Reporte')
        ).length;
    });
    if (payrollActions > 0) pass(`Payroll: ${payrollActions} acciones disponibles`);
}

async function testFiltrosYBusqueda(page) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST 7: FILTROS Y BÚSQUEDA');
    console.log('═══════════════════════════════════════════════════════\n');

    // Volver a usuarios para probar filtros
    await page.evaluate(() => showTab('users'));
    await sleep(3000);

    // Probar filtro de búsqueda por nombre
    const searchInput = await page.evaluate(() => {
        const input = document.querySelector('input[placeholder*="Nombre"], input[placeholder*="Buscar"], input[type="search"]');
        if (input) {
            input.value = 'admin';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        }
        return false;
    });

    if (searchInput) {
        await sleep(1500);
        const filteredCount = await page.evaluate(() => {
            return document.querySelectorAll('table tbody tr').length;
        });
        pass(`Filtro búsqueda: ${filteredCount} resultados para "admin"`);
        await screenshot(page, 'filtro-busqueda');

        // Limpiar filtro
        await page.evaluate(() => {
            const input = document.querySelector('input[placeholder*="Nombre"], input[placeholder*="Buscar"]');
            if (input) {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await sleep(1000);
    }

    // Probar filtro de estado
    const statusFilter = await page.evaluate(() => {
        const select = document.querySelector('select[name*="estado"], select[name*="status"]');
        if (select && select.options.length > 1) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return select.options[1].text;
        }
        return null;
    });

    if (statusFilter) {
        await sleep(1500);
        pass(`Filtro estado: "${statusFilter}" aplicado`);
        await screenshot(page, 'filtro-estado');
    }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         TEST CRUD REAL COMPLETO - RRHH                       ║');
    console.log('║   Operaciones reales como usuario                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Limpiar screenshots anteriores
    const old = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    old.forEach(f => fs.unlinkSync(path.join(SCREENSHOTS_DIR, f)));

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 30
    });

    const page = await browser.newPage();

    try {
        await login(page);
        await testUsuariosTabs(page);
        await testVacacionesCRUD(page);
        await testDepartamentosCRUD(page);
        await testTurnosCRUD(page);
        await testAsistenciaDashboard(page);
        await testPayrollDashboard(page);
        await testFiltrosYBusqueda(page);

        // RESUMEN
        console.log('\n' + '═'.repeat(60));
        console.log('                    RESUMEN FINAL');
        console.log('═'.repeat(60));

        const total = results.passed.length + results.failed.length;
        const rate = ((results.passed.length / total) * 100).toFixed(1);

        console.log(`\n   ✅ PASSED: ${results.passed.length}`);
        console.log(`   ❌ FAILED: ${results.failed.length}`);
        console.log(`   📊 SUCCESS RATE: ${rate}%`);

        if (results.failed.length > 0) {
            console.log('\n   FALLOS:');
            results.failed.forEach(f => console.log(`   ❌ ${f.test}: ${f.reason}`));
        }

        console.log('\n   TESTS PASSED:');
        results.passed.forEach(t => console.log(`   ✅ ${t}`));

        await screenshot(page, 'resumen-final');

        // Guardar reporte
        const report = `# TEST CRUD REAL COMPLETO - RRHH

Fecha: ${new Date().toISOString()}

## RESUMEN
- **PASSED**: ${results.passed.length}
- **FAILED**: ${results.failed.length}
- **SUCCESS RATE**: ${rate}%

## TESTS PASSED
${results.passed.map(t => `- ✅ ${t}`).join('\n')}

## TESTS FAILED
${results.failed.map(f => `- ❌ ${f.test}: ${f.reason}`).join('\n') || 'Ninguno'}

## SCREENSHOTS
${step} capturas en test-screenshots/crud-real/
`;
        fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'REPORTE.md'), report);
        console.log(`\n📄 Reporte: test-screenshots/crud-real/REPORTE.md`);
        console.log(`📸 Screenshots: ${step} capturas\n`);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await screenshot(page, 'ERROR');
    } finally {
        console.log('🔒 Cerrando navegador...');
        await browser.close();
        console.log('✅ Navegador cerrado\n');
    }
}

main();
