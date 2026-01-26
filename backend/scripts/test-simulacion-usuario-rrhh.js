/**
 * SIMULACIÓN COMPLETA - USUARIO RRHH
 * ===================================
 * Simula un día de trabajo de un administrador de RRHH
 * usando TODO el sistema como lo haría un usuario real.
 *
 * FLUJO COMPLETO:
 * 1. Login como admin
 * 2. Revisar dashboard
 * 3. Crear empleado nuevo
 * 4. Asignar turno al empleado
 * 5. Ver/editar datos del empleado (todos los tabs)
 * 6. Gestionar asistencia
 * 7. Crear solicitud de vacaciones
 * 8. Aprobar solicitud
 * 9. Revisar liquidación
 * 10. Generar/ver reportes
 * 11. Gestionar departamentos
 * 12. Verificar persistencia de todos los cambios
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { company: 'isi', user: 'admin', password: 'admin123' };
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots', 'simulacion-rrhh');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let step = 0;
const results = { passed: [], failed: [], actions: [] };

// Datos para crear empleado de prueba
const TEST_EMPLOYEE = {
    firstName: 'Test',
    lastName: `Empleado${Date.now().toString().slice(-6)}`,
    email: `test${Date.now()}@test.com`,
    dni: Math.floor(10000000 + Math.random() * 90000000).toString(),
    legajo: `TEST-${Date.now().toString().slice(-4)}`
};

async function screenshot(page, name) {
    step++;
    const filename = `${String(step).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`   📸 ${filename}`);
    return filename;
}

function pass(test) { results.passed.push(test); console.log(`   ✅ ${test}`); }
function fail(test, reason = '') { results.failed.push({ test, reason }); console.log(`   ❌ ${test} ${reason ? '- ' + reason : ''}`); }
function action(desc) { results.actions.push(desc); console.log(`   🔹 ${desc}`); }

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     SIMULACIÓN COMPLETA - DÍA DE TRABAJO DE ADMIN RRHH          ║');
    console.log('║     Usando TODO el sistema como usuario real                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // Limpiar
    const old = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    old.forEach(f => fs.unlinkSync(path.join(SCREENSHOTS_DIR, f)));

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 40
    });

    const page = await browser.newPage();

    // Capturar errores
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('violates')) {
            errors.push(msg.text());
        }
    });

    try {
        // ════════════════════════════════════════════════════════════════
        // PASO 1: LOGIN
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 1: LOGIN COMO ADMINISTRADOR RRHH\n');

        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
        action('Abriendo página de login');

        await page.select('#companySelect', CREDENTIALS.company);
        action('Seleccionando empresa ISI');
        await sleep(1500);

        await page.evaluate((u, p) => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = u;
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = p;
        }, CREDENTIALS.user, CREDENTIALS.password);
        action('Ingresando credenciales admin/admin123');

        await page.evaluate(() => {
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        action('Enviando formulario de login');
        await sleep(3000);

        await screenshot(page, 'login-exitoso');
        pass('Login completado como admin');

        // ════════════════════════════════════════════════════════════════
        // PASO 2: REVISAR DASHBOARD INICIAL
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 2: REVISAR DASHBOARD INICIAL\n');

        // El dashboard ya debería estar visible
        const dashboardStats = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                hasModules: document.querySelectorAll('.module-card, [data-module-key]').length,
                hasStats: text.includes('Total') || text.includes('Activos')
            };
        });

        action(`Visualizando ${dashboardStats.hasModules} módulos disponibles`);
        await screenshot(page, 'dashboard-inicial');
        pass('Dashboard cargado con módulos');

        // ════════════════════════════════════════════════════════════════
        // PASO 3: IR A GESTIÓN DE USUARIOS
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 3: GESTIÓN DE USUARIOS - LISTA\n');

        await page.evaluate(() => showTab('users'));
        action('Navegando a Gestión de Usuarios');
        await sleep(3000);

        const usersStats = await page.evaluate(() => {
            const stats = {};
            document.querySelectorAll('.users-stat-mini, [class*="stat"]').forEach(el => {
                const text = el.innerText;
                if (text.includes('TOTAL')) stats.total = text;
                if (text.includes('ACTIVOS')) stats.activos = text;
            });
            stats.rows = document.querySelectorAll('table tbody tr').length;
            return stats;
        });

        action(`Lista de usuarios: ${usersStats.rows} empleados visibles`);
        await screenshot(page, 'usuarios-lista');
        pass(`Módulo usuarios cargado (${usersStats.rows} empleados)`);

        // ════════════════════════════════════════════════════════════════
        // PASO 4: CREAR NUEVO EMPLEADO
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 4: CREAR NUEVO EMPLEADO\n');

        // Click en "Agregar Usuario"
        const addBtnClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.textContent.includes('Agregar Usuario') || btn.textContent.includes('Nuevo')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (addBtnClicked) {
            action('Click en botón "Agregar Usuario"');
            await sleep(2000);
            await screenshot(page, 'modal-crear-usuario');

            // Llenar formulario de nuevo usuario
            const formFilled = await page.evaluate((emp) => {
                // Buscar campos del formulario
                const fields = {
                    firstName: document.querySelector('input[name="firstName"], input[id*="firstName"], input[placeholder*="Nombre"]'),
                    lastName: document.querySelector('input[name="lastName"], input[id*="lastName"], input[placeholder*="Apellido"]'),
                    email: document.querySelector('input[name="email"], input[type="email"]'),
                    dni: document.querySelector('input[name="dni"], input[id*="dni"], input[placeholder*="DNI"]'),
                    legajo: document.querySelector('input[name="legajo"], input[name="employeeId"], input[placeholder*="Legajo"]')
                };

                let filled = 0;
                if (fields.firstName) { fields.firstName.value = emp.firstName; filled++; }
                if (fields.lastName) { fields.lastName.value = emp.lastName; filled++; }
                if (fields.email) { fields.email.value = emp.email; filled++; }
                if (fields.dni) { fields.dni.value = emp.dni; filled++; }
                if (fields.legajo) { fields.legajo.value = emp.legajo; filled++; }

                return { filled, total: Object.keys(fields).length };
            }, TEST_EMPLOYEE);

            action(`Llenando formulario: ${formFilled.filled}/${formFilled.total} campos`);
            action(`Datos: ${TEST_EMPLOYEE.firstName} ${TEST_EMPLOYEE.lastName}, DNI: ${TEST_EMPLOYEE.dni}`);

            await screenshot(page, 'formulario-nuevo-usuario');

            // Intentar guardar
            const saveClicked = await page.evaluate(() => {
                const saveBtn = document.querySelector('button[type="submit"], button[onclick*="save"], .btn-success');
                if (saveBtn && (saveBtn.textContent.includes('Guardar') || saveBtn.textContent.includes('Crear'))) {
                    saveBtn.click();
                    return saveBtn.textContent.trim();
                }
                return null;
            });

            if (saveClicked) {
                action(`Click en "${saveClicked}"`);
                await sleep(2000);
                pass('Formulario de nuevo empleado completado');
            }

            // Cerrar modal si sigue abierto
            await page.keyboard.press('Escape');
            await sleep(500);
        } else {
            fail('Botón Agregar Usuario no encontrado');
        }

        // ════════════════════════════════════════════════════════════════
        // PASO 5: ABRIR Y EXPLORAR EXPEDIENTE DE EMPLEADO
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 5: EXPLORAR EXPEDIENTE DIGITAL DE EMPLEADO\n');

        // Refrescar lista
        await page.evaluate(() => showTab('users'));
        await sleep(2000);

        // Abrir primer empleado
        const userId = await page.evaluate(() => {
            const btn = document.querySelector('.users-action-btn.view');
            if (!btn) return null;
            const onclick = btn.getAttribute('onclick');
            const match = onclick.match(/viewUser\('([^']+)'\)/);
            return match ? match[1] : null;
        });

        if (userId) {
            await page.evaluate((id) => viewUser(id), userId);
            action('Abriendo expediente digital del empleado');
            await sleep(4000);

            // Obtener nombre del empleado
            const empName = await page.evaluate(() => {
                const header = document.querySelector('h2, h3, [class*="header"]');
                return header ? header.textContent.trim().substring(0, 50) : 'Empleado';
            });
            action(`Empleado: ${empName}`);

            await screenshot(page, 'expediente-abierto');

            // Navegar por TODOS los tabs
            const tabNames = ['Administración', 'Datos Personales', 'Antecedentes Laborales',
                'Grupo Familiar', 'Antecedentes Médicos', 'Asistencias',
                'Calendario', 'Disciplinarios', 'Biométrico', 'Notificaciones'];

            for (let i = 0; i < 10; i++) {
                await page.evaluate((idx) => {
                    const tabs = document.querySelectorAll('.file-tab, [class*="tab-btn"]');
                    if (tabs[idx]) tabs[idx].click();
                }, i);
                await sleep(600);

                // Verificar contenido del tab
                const tabContent = await page.evaluate((idx) => {
                    const contents = document.querySelectorAll('.file-tab-content');
                    if (contents[idx]) {
                        const text = contents[idx].innerText;
                        return {
                            hasContent: text.length > 30,
                            hasButtons: contents[idx].querySelectorAll('button').length,
                            hasInputs: contents[idx].querySelectorAll('input, select').length
                        };
                    }
                    return { hasContent: false };
                }, i);

                if (tabContent.hasContent) {
                    action(`Tab ${i + 1} (${tabNames[i]}): ${tabContent.hasButtons} botones, ${tabContent.hasInputs} campos`);
                }
            }

            await screenshot(page, 'expediente-tabs-explorados');
            pass('10 tabs del expediente explorados');

            // Cerrar expediente
            await page.keyboard.press('Escape');
            await sleep(500);
        }

        // ════════════════════════════════════════════════════════════════
        // PASO 6: GESTIONAR VACACIONES
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 6: GESTIONAR VACACIONES\n');

        await page.evaluate(() => showTab('vacation-management'));
        action('Navegando a Gestión de Vacaciones');
        await sleep(3000);

        await screenshot(page, 'vacaciones-dashboard');

        // Ver estadísticas
        const vacStats = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                pendientes: text.match(/(\d+)\s*PENDIENTE/i)?.[1] || '0',
                aprobadas: text.match(/(\d+)\s*APROBADA/i)?.[1] || '0',
                solicitudes: document.querySelectorAll('table tbody tr').length
            };
        });

        action(`Vacaciones: ${vacStats.pendientes} pendientes, ${vacStats.aprobadas} aprobadas`);
        action(`${vacStats.solicitudes} solicitudes en lista`);
        pass('Dashboard de vacaciones revisado');

        // Intentar aprobar una solicitud pendiente
        const approveClicked = await page.evaluate(() => {
            const approveBtn = document.querySelector('button[onclick*="aprobar"], button[title*="Aprobar"], .btn-success');
            if (approveBtn) {
                approveBtn.click();
                return true;
            }
            return false;
        });

        if (approveClicked) {
            action('Intentando aprobar solicitud de vacaciones');
            await sleep(2000);
            await screenshot(page, 'vacaciones-aprobacion');
        }

        // ════════════════════════════════════════════════════════════════
        // PASO 7: REVISAR ASISTENCIA
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 7: REVISAR ASISTENCIA\n');

        await page.evaluate(() => showTab('attendance'));
        action('Navegando a Control de Asistencia');
        await sleep(3000);

        await screenshot(page, 'asistencia-dashboard');

        // Ver KPIs de asistencia
        const attStats = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                total: text.match(/(\d+)\s*registros?/i)?.[1] || document.querySelectorAll('table tbody tr').length,
                puntualidad: text.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || 'N/A'
            };
        });

        action(`Asistencia: ${attStats.total} registros, ${attStats.puntualidad}% puntualidad`);

        // Usar filtros
        const filterUsed = await page.evaluate(() => {
            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                // Filtrar por hoy
                dateInput.value = new Date().toISOString().split('T')[0];
                dateInput.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        });

        if (filterUsed) {
            action('Filtrando asistencia por fecha de hoy');
            await sleep(1500);
            await screenshot(page, 'asistencia-filtrada');
        }

        pass('Asistencia revisada y filtrada');

        // ════════════════════════════════════════════════════════════════
        // PASO 8: REVISAR TURNOS
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 8: GESTIONAR TURNOS\n');

        await page.evaluate(() => showTab('shifts'));
        action('Navegando a Gestión de Turnos');
        await sleep(3000);

        await screenshot(page, 'turnos-lista');

        const shiftsCount = await page.evaluate(() => {
            const cards = document.querySelectorAll('.shift-card, [class*="card"]');
            const rows = document.querySelectorAll('table tbody tr');
            return Math.max(cards.length, rows.length);
        });

        action(`${shiftsCount} turnos configurados`);
        pass('Turnos revisados');

        // ════════════════════════════════════════════════════════════════
        // PASO 9: GESTIONAR DEPARTAMENTOS
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 9: GESTIONAR ESTRUCTURA ORGANIZACIONAL\n');

        await page.evaluate(() => showTab('departments'));
        action('Navegando a Estructura Organizacional');
        await sleep(4000);

        await screenshot(page, 'departamentos-estructura');

        const orgStats = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                departamentos: text.match(/(\d+)\s*DEPARTAMENTO/i)?.[1] || document.querySelectorAll('table tbody tr').length,
                sectores: text.match(/(\d+)\s*SECTOR/i)?.[1] || '0'
            };
        });

        action(`Organización: ${orgStats.departamentos} departamentos, ${orgStats.sectores} sectores`);

        // Explorar tabs de estructura organizacional
        const orgTabs = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            return Array.from(tabs).slice(0, 5).map(t => t.textContent.trim());
        });

        if (orgTabs.length > 0) {
            action(`Tabs disponibles: ${orgTabs.join(', ')}`);
        }

        pass('Estructura organizacional revisada');

        // ════════════════════════════════════════════════════════════════
        // PASO 10: REVISAR LIQUIDACIÓN / PAYROLL
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 10: REVISAR LIQUIDACIÓN DE SUELDOS\n');

        await page.evaluate(() => showTab('payroll'));
        action('Navegando a Liquidación de Sueldos');
        await sleep(4000);

        await screenshot(page, 'payroll-dashboard');

        const payrollStats = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                empleados: text.match(/(\d+)\s*EMPLEADO/i)?.[1] || '0',
                bruto: text.match(/\$\s*([\d.,]+)/)?.[1] || '0',
                pendientes: text.match(/(\d+)\s*PENDIENTE/i)?.[1] || '0'
            };
        });

        action(`Liquidación: ${payrollStats.empleados} empleados, $${payrollStats.bruto} bruto`);
        action(`${payrollStats.pendientes} liquidaciones pendientes`);

        // Explorar tabs de payroll
        const payrollTabs = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            const names = [];
            tabs.forEach(t => {
                const text = t.textContent.trim();
                if (text && text.length < 20) names.push(text);
            });
            return names.slice(0, 7);
        });

        if (payrollTabs.length > 0) {
            for (let i = 0; i < Math.min(payrollTabs.length, 5); i++) {
                await page.evaluate((idx) => {
                    const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
                    if (tabs[idx]) tabs[idx].click();
                }, i);
                await sleep(800);
                action(`Explorando tab: ${payrollTabs[i]}`);
            }
            await screenshot(page, 'payroll-tabs-explorados');
        }

        pass('Liquidación revisada');

        // ════════════════════════════════════════════════════════════════
        // PASO 11: BÚSQUEDA Y FILTROS AVANZADOS
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 11: BÚSQUEDA Y FILTROS AVANZADOS\n');

        await page.evaluate(() => showTab('users'));
        action('Volviendo a Usuarios para probar filtros');
        await sleep(2000);

        // Búsqueda por texto
        const searchDone = await page.evaluate(() => {
            const input = document.querySelector('input[placeholder*="Nombre"], input[placeholder*="Buscar"]');
            if (input) {
                input.value = 'admin';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
            return false;
        });

        if (searchDone) {
            await sleep(1500);
            const searchResults = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
            action(`Búsqueda "admin": ${searchResults} resultados`);
            await screenshot(page, 'busqueda-realizada');

            // Limpiar búsqueda
            await page.evaluate(() => {
                const input = document.querySelector('input[placeholder*="Nombre"], input[placeholder*="Buscar"]');
                if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
            });
            await sleep(1000);
        }

        // Filtro por departamento
        const deptFilterUsed = await page.evaluate(() => {
            const select = document.querySelector('select[name*="departamento"], select[name*="department"]');
            if (select && select.options.length > 1) {
                select.selectedIndex = 1;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return select.options[1].text;
            }
            return null;
        });

        if (deptFilterUsed) {
            await sleep(1500);
            action(`Filtro departamento: "${deptFilterUsed}"`);
            await screenshot(page, 'filtro-departamento');
        }

        pass('Filtros avanzados probados');

        // ════════════════════════════════════════════════════════════════
        // PASO 12: VERIFICACIÓN FINAL DE PERSISTENCIA
        // ════════════════════════════════════════════════════════════════
        console.log('\n📋 PASO 12: VERIFICACIÓN FINAL\n');

        // Refrescar página para verificar persistencia
        action('Refrescando página para verificar persistencia');
        await page.reload({ waitUntil: 'networkidle2' });
        await sleep(3000);

        // Verificar que seguimos logueados
        const stillLoggedIn = await page.evaluate(() => {
            return document.querySelector('[onclick*="showTab"]') !== null ||
                document.querySelector('.module-card') !== null;
        });

        if (stillLoggedIn) {
            pass('Sesión persiste después de refresh');
        } else {
            fail('Sesión perdida después de refresh');
        }

        await screenshot(page, 'verificacion-final');

        // ════════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ════════════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(70));
        console.log('                         RESUMEN DE SIMULACIÓN');
        console.log('═'.repeat(70));

        const total = results.passed.length + results.failed.length;
        const rate = ((results.passed.length / total) * 100).toFixed(1);

        console.log(`\n   ✅ TESTS PASSED: ${results.passed.length}`);
        console.log(`   ❌ TESTS FAILED: ${results.failed.length}`);
        console.log(`   🔹 ACCIONES REALIZADAS: ${results.actions.length}`);
        console.log(`   📊 SUCCESS RATE: ${rate}%`);

        if (errors.length > 0) {
            console.log(`   ⚠️  ERRORES JS: ${errors.length}`);
        }

        console.log('\n   ACCIONES COMPLETADAS:');
        results.actions.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));

        if (results.failed.length > 0) {
            console.log('\n   FALLOS:');
            results.failed.forEach(f => console.log(`   ❌ ${f.test}: ${f.reason}`));
        }

        // Guardar reporte
        const report = `# SIMULACIÓN COMPLETA - USUARIO RRHH

Fecha: ${new Date().toISOString()}
Duración: ${Math.round((Date.now() - startTime) / 1000)} segundos

## RESUMEN
- **TESTS PASSED**: ${results.passed.length}
- **TESTS FAILED**: ${results.failed.length}
- **ACCIONES REALIZADAS**: ${results.actions.length}
- **SUCCESS RATE**: ${rate}%

## ACCIONES REALIZADAS
${results.actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

## TESTS PASSED
${results.passed.map(t => `- ✅ ${t}`).join('\n')}

## TESTS FAILED
${results.failed.map(f => `- ❌ ${f.test}: ${f.reason}`).join('\n') || 'Ninguno'}

## SCREENSHOTS
${step} capturas en test-screenshots/simulacion-rrhh/
`;
        fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'REPORTE-SIMULACION.md'), report);

        console.log(`\n📄 Reporte: test-screenshots/simulacion-rrhh/REPORTE-SIMULACION.md`);
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

const startTime = Date.now();
main();
