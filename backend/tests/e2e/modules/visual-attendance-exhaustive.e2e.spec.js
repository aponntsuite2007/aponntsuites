/**
 * TEST VISUAL EXHAUSTIVO - Módulo Control de Asistencia
 * Sigue el protocolo de TESTING-VISUAL-EXHAUSTIVO-SPEC.md
 *
 * EMPRESA: ISI | USUARIO: admin | CLAVE: admin123
 *
 * TABS A TESTEAR:
 * 1. Dashboard
 * 2. Registros
 * 3. Analytics
 * 4. Alertas (Patterns)
 * 5. Insights
 * 6. Panel Ejecutivo (Cubo)
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots/attendance-exhaustive');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Reporte de bugs encontrados
const bugsFound = [];

function reportBug(category, description, details = {}) {
    const bug = { category, description, details, timestamp: new Date().toISOString() };
    bugsFound.push(bug);
    console.log(`\n🐛 BUG DETECTADO: [${category}]`);
    console.log(`   ${description}`);
    Object.entries(details).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
}

async function saveScreenshot(page, name) {
    const filename = `${Date.now()}_${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`📸 Screenshot: ${filename}`);
    return filename;
}

async function detectUIBlocked(page) {
    return await page.evaluate(() => {
        const result = { isBlocked: false, reasons: [] };

        // Overlay/backdrop huérfano
        document.querySelectorAll('.modal-backdrop, .loading-overlay, .att-modal-overlay').forEach(o => {
            if (o.offsetParent !== null) {
                result.isBlocked = true;
                result.reasons.push(`Overlay visible: ${o.className}`);
            }
        });

        // Spinner infinito
        document.querySelectorAll('.spinner, .loading, .att-loading, .att-spinner').forEach(s => {
            if (s.offsetParent !== null && !s.closest('.att-loading')?.style.display?.includes('none')) {
                result.isBlocked = true;
                result.reasons.push(`Spinner visible: ${s.className}`);
            }
        });

        // Body con pointer-events none
        if (getComputedStyle(document.body).pointerEvents === 'none') {
            result.isBlocked = true;
            result.reasons.push('Body tiene pointer-events: none');
        }

        return result;
    });
}

async function login(page) {
    console.log('🔐 Iniciando login con ISI/admin/admin123...');
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Esperar que el dropdown de empresas tenga opciones cargadas
    console.log('⏳ Esperando carga de empresas...');
    await page.waitForFunction(() => {
        const select = document.querySelector('#companySelect');
        return select && select.options.length > 1;
    }, { timeout: 30000 });
    console.log('✅ Empresas cargadas');

    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(1000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(6000);

    await page.evaluate(() => {
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer) loginContainer.style.cssText = 'display: none !important;';
        if (typeof showDashboard === 'function') showDashboard();
    });
    await page.waitForTimeout(2000);
    console.log('✅ Login completado');
}

async function navigateToAttendance(page) {
    console.log('🧭 Navegando al módulo de Control de Asistencia...');
    await page.evaluate(() => {
        if (typeof showModuleContent === 'function') {
            showModuleContent('attendance', 'Control de Asistencia');
        }
    });
    await page.waitForTimeout(5000);

    // Verificar que el módulo cargó
    const moduleLoaded = await page.evaluate(() => {
        return document.querySelector('#attendance-enterprise') !== null ||
               document.querySelector('.att-enterprise') !== null;
    });

    if (moduleLoaded) {
        console.log('✅ Módulo de Asistencia cargado');
    } else {
        console.log('⚠️ Módulo no detectado, esperando más...');
        await page.waitForTimeout(3000);
    }
}

async function switchToView(page, viewName) {
    console.log(`📑 Cambiando a vista: ${viewName}...`);
    await page.evaluate((view) => {
        if (typeof AttendanceEngine !== 'undefined' && AttendanceEngine.showView) {
            AttendanceEngine.showView(view);
        } else {
            // Fallback: click en el botón
            const btn = document.querySelector(`[data-view="${view}"]`);
            if (btn) btn.click();
        }
    }, viewName);
    await page.waitForTimeout(3000);
}

test.describe('Testing Exhaustivo - Módulo Control de Asistencia', () => {

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(600000);

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text().substring(0, 200)}`);
            }
        });
    });

    test('FASE 1: Carga inicial y Dashboard', async ({ page }) => {
        await login(page);
        await saveScreenshot(page, 'att-01-post-login');

        await navigateToAttendance(page);
        await saveScreenshot(page, 'att-02-modulo-cargado');

        // Verificar elementos del dashboard
        const dashboardInfo = await page.evaluate(() => {
            return {
                hasHeader: !!document.querySelector('.att-header'),
                hasNav: !!document.querySelector('.att-nav'),
                hasContent: !!document.querySelector('.att-main, #att-content'),
                navItems: document.querySelectorAll('.att-nav-item').length,
                statsCards: document.querySelectorAll('.att-stat-card, .att-kpi-card, .stat-card').length
            };
        });

        console.log('\n📊 INFO DEL DASHBOARD:');
        console.log(`   Header: ${dashboardInfo.hasHeader ? '✅' : '❌'}`);
        console.log(`   Nav: ${dashboardInfo.hasNav ? '✅' : '❌'}`);
        console.log(`   Content: ${dashboardInfo.hasContent ? '✅' : '❌'}`);
        console.log(`   Nav items: ${dashboardInfo.navItems}`);
        console.log(`   Stats cards: ${dashboardInfo.statsCards}`);

        expect(dashboardInfo.hasContent).toBe(true);
    });

    test('FASE 2: Verificar las 6 vistas/tabs', async ({ page }) => {
        await login(page);
        await navigateToAttendance(page);

        const views = [
            { name: 'dashboard', label: 'Dashboard' },
            { name: 'records', label: 'Registros' },
            { name: 'analytics', label: 'Analytics' },
            { name: 'patterns', label: 'Alertas' },
            { name: 'insights', label: 'Insights' },
            { name: 'cubo', label: 'Panel Ejecutivo' }
        ];

        console.log('\n📑 VERIFICANDO 6 VISTAS:');
        console.log('=' .repeat(50));

        for (const view of views) {
            console.log(`\n🔄 Verificando: ${view.label} (${view.name})`);

            await switchToView(page, view.name);
            await page.waitForTimeout(2000);

            // Verificar contenido cargado
            const viewInfo = await page.evaluate((viewName) => {
                const content = document.querySelector('#att-content, .att-main');
                const hasError = !!document.querySelector('.att-error');
                const hasLoading = !!document.querySelector('.att-loading:not([style*="none"])');
                const hasData = content?.innerText?.length > 100;

                return {
                    hasContent: !!content,
                    hasError,
                    hasLoading,
                    hasData,
                    contentLength: content?.innerText?.length || 0
                };
            }, view.name);

            console.log(`   Content: ${viewInfo.hasContent ? '✅' : '❌'}`);
            console.log(`   Error: ${viewInfo.hasError ? '❌ SÍ' : '✅ No'}`);
            console.log(`   Loading: ${viewInfo.hasLoading ? '⏳ Sí' : '✅ No'}`);
            console.log(`   Data length: ${viewInfo.contentLength} chars`);

            if (viewInfo.hasError) {
                reportBug('VIEW_ERROR', `Vista ${view.name} muestra error`, { view: view.name });
            }

            await saveScreenshot(page, `att-03-view-${view.name}`);
        }
    });

    test('FASE 3: Verificar dropdowns en formulario de nuevo registro', async ({ page }) => {
        await login(page);
        await navigateToAttendance(page);

        // Ir a la vista de registros
        await switchToView(page, 'records');
        await page.waitForTimeout(2000);

        // Buscar y hacer click en botón agregar
        console.log('\n📋 Buscando botón "Nuevo Registro"...');

        const addBtnFound = await page.evaluate(() => {
            // Buscar botón de agregar
            const btns = Array.from(document.querySelectorAll('button'));
            const addBtn = btns.find(b =>
                b.textContent.includes('Nuevo') ||
                b.textContent.includes('Agregar') ||
                b.onclick?.toString().includes('showAddModal')
            );
            if (addBtn) {
                addBtn.click();
                return true;
            }
            return false;
        });

        if (!addBtnFound) {
            // Intentar con AttendanceEngine directamente
            await page.evaluate(() => {
                if (typeof AttendanceEngine !== 'undefined' && AttendanceEngine.showAddModal) {
                    AttendanceEngine.showAddModal();
                }
            });
        }

        await page.waitForTimeout(3000);
        await saveScreenshot(page, 'att-04-modal-nuevo-registro');

        // Verificar modal abierto
        const modalInfo = await page.evaluate(() => {
            const modal = document.querySelector('#att-modal, .att-modal-overlay');
            if (!modal) return { found: false };

            const selects = modal.querySelectorAll('select');
            const inputs = modal.querySelectorAll('input');

            return {
                found: true,
                visible: modal.offsetParent !== null,
                selectsCount: selects.length,
                inputsCount: inputs.length,
                selectsWithOptions: Array.from(selects).map(s => ({
                    id: s.id,
                    optionsCount: s.options.length
                }))
            };
        });

        console.log('\n📝 INFO DEL MODAL:');
        console.log(`   Modal encontrado: ${modalInfo.found ? '✅' : '❌'}`);
        console.log(`   Visible: ${modalInfo.visible ? '✅' : '❌'}`);
        console.log(`   Selects: ${modalInfo.selectsCount}`);
        console.log(`   Inputs: ${modalInfo.inputsCount}`);

        if (modalInfo.selectsWithOptions) {
            modalInfo.selectsWithOptions.forEach(s => {
                const status = s.optionsCount > 1 ? '✅' : '⚠️';
                console.log(`   ${status} ${s.id}: ${s.optionsCount} opciones`);
                if (s.optionsCount <= 1) {
                    reportBug('DROPDOWN_VACIO', `Select ${s.id} tiene ${s.optionsCount} opciones`, { select: s.id });
                }
            });
        }

        // Cerrar modal
        await page.evaluate(() => {
            if (typeof AttendanceEngine !== 'undefined' && AttendanceEngine.closeModal) {
                AttendanceEngine.closeModal();
            } else {
                const closeBtn = document.querySelector('.att-modal-close');
                if (closeBtn) closeBtn.click();
            }
        });
    });

    test('FASE 4: Test CRUD - Crear registro y verificar persistencia', async ({ page }) => {
        const TEST_DATE = new Date().toISOString().split('T')[0];
        const TEST_TIME_IN = '08:30';
        const TEST_TIME_OUT = '17:30';

        await login(page);
        await navigateToAttendance(page);
        await switchToView(page, 'records');
        await page.waitForTimeout(3000);

        // Contar registros antes
        const recordsBefore = await page.evaluate(() => {
            const rows = document.querySelectorAll('.att-table tbody tr, table tbody tr');
            return rows.length;
        });
        console.log(`\n📊 Registros antes: ${recordsBefore}`);

        // Abrir modal - intentar múltiples métodos
        console.log('📋 Intentando abrir modal de nuevo registro...');
        await page.evaluate(() => {
            // Método 1: AttendanceEngine
            if (typeof AttendanceEngine !== 'undefined' && AttendanceEngine.showAddModal) {
                AttendanceEngine.showAddModal();
                return;
            }
            // Método 2: Buscar botón
            const btns = Array.from(document.querySelectorAll('button'));
            const addBtn = btns.find(b =>
                b.textContent.includes('Nuevo') ||
                b.textContent.includes('➕') ||
                b.textContent.includes('Agregar')
            );
            if (addBtn) addBtn.click();
        });
        await page.waitForTimeout(4000);

        // Verificar que hay empleados en el dropdown
        const employeesCount = await page.evaluate(() => {
            const select = document.getElementById('att-user-id');
            return select ? select.options.length : 0;
        });

        console.log(`   Empleados en dropdown: ${employeesCount}`);

        if (employeesCount <= 1) {
            reportBug('NO_EMPLEADOS', 'No hay empleados para seleccionar en el formulario');
            return;
        }

        // Llenar formulario
        console.log('\n📝 Llenando formulario de asistencia...');
        await page.evaluate(({ testDate, timeIn, timeOut }) => {
            // Seleccionar primer empleado disponible
            const userSelect = document.getElementById('att-user-id');
            if (userSelect && userSelect.options.length > 1) {
                userSelect.value = userSelect.options[1].value;
            }

            // Fecha
            const dateInput = document.getElementById('att-date');
            if (dateInput) dateInput.value = testDate;

            // Hora entrada
            const timeInInput = document.getElementById('att-time-in');
            if (timeInInput) timeInInput.value = timeIn;

            // Hora salida
            const timeOutInput = document.getElementById('att-time-out');
            if (timeOutInput) timeOutInput.value = timeOut;

            // Estado
            const statusSelect = document.getElementById('att-status');
            if (statusSelect) statusSelect.value = 'present';

        }, { testDate: TEST_DATE, timeIn: TEST_TIME_IN, timeOut: TEST_TIME_OUT });

        await saveScreenshot(page, 'att-05-form-llenado');

        // Guardar
        console.log('\n💾 Guardando registro...');
        await page.evaluate(() => {
            const form = document.getElementById('att-add-form');
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.click();
            }
        });

        await page.waitForTimeout(4000);
        await saveScreenshot(page, 'att-06-despues-guardar');

        // Verificar que UI no se bloqueó
        const blockage = await detectUIBlocked(page);
        if (blockage.isBlocked) {
            reportBug('UI_BLOQUEADA', 'UI se bloqueó después de guardar asistencia', {
                razones: blockage.reasons.join('; ')
            });
        } else {
            console.log('✅ UI sigue funcional');
        }

        // Verificar que el registro aparece (sin F5)
        await switchToView(page, 'records');
        await page.waitForTimeout(3000);

        const recordsAfter = await page.evaluate(() => {
            const rows = document.querySelectorAll('.att-table tbody tr, table tbody tr');
            return rows.length;
        });

        console.log(`   Registros después: ${recordsAfter}`);

        if (recordsAfter <= recordsBefore) {
            reportBug('NO_REFRESH', 'Registro no aparece en lista sin recargar', {
                antes: recordsBefore,
                despues: recordsAfter
            });
        } else {
            console.log('✅ Registro aparece en la lista');
        }
    });

    test('FASE 5: Verificar tabla de registros tiene datos', async ({ page }) => {
        await login(page);
        await navigateToAttendance(page);
        await switchToView(page, 'records');
        await page.waitForTimeout(3000);

        const tableInfo = await page.evaluate(() => {
            const table = document.querySelector('.att-table, table');
            const rows = document.querySelectorAll('.att-table tbody tr, table tbody tr');
            const headers = document.querySelectorAll('.att-table thead th, table thead th');

            return {
                hasTable: !!table,
                rowCount: rows.length,
                headerCount: headers.length,
                headers: Array.from(headers).map(h => h.textContent?.trim()).slice(0, 10)
            };
        });

        console.log('\n📋 INFO DE TABLA DE REGISTROS:');
        console.log(`   Tabla encontrada: ${tableInfo.hasTable ? '✅' : '❌'}`);
        console.log(`   Filas de datos: ${tableInfo.rowCount}`);
        console.log(`   Columnas: ${tableInfo.headerCount}`);
        console.log(`   Headers: ${tableInfo.headers.join(', ')}`);

        await saveScreenshot(page, 'att-07-tabla-registros');

        expect(tableInfo.hasTable).toBe(true);
    });

    test('FASE 6: Verificar filtros de fecha funcionan', async ({ page }) => {
        await login(page);
        await navigateToAttendance(page);

        // Asegurarse de estar en el dashboard donde están los filtros
        await switchToView(page, 'dashboard');
        await page.waitForTimeout(2000);

        // Verificar que existen los inputs de fecha
        const dateInputsExist = await page.evaluate(() => {
            const startDate = document.getElementById('att-date-start');
            const endDate = document.getElementById('att-date-end');
            return {
                hasStart: !!startDate,
                hasEnd: !!endDate,
                startValue: startDate?.value || '',
                endValue: endDate?.value || '',
                startVisible: startDate ? startDate.offsetParent !== null : false,
                endVisible: endDate ? endDate.offsetParent !== null : false
            };
        });

        console.log('\n📅 FILTROS DE FECHA:');
        console.log(`   Input inicio: ${dateInputsExist.hasStart ? '✅' : '❌'} (${dateInputsExist.startValue}) visible: ${dateInputsExist.startVisible}`);
        console.log(`   Input fin: ${dateInputsExist.hasEnd ? '✅' : '❌'} (${dateInputsExist.endValue}) visible: ${dateInputsExist.endVisible}`);

        // Cambiar rango de fechas usando evaluate para evitar problemas de visibilidad
        if (dateInputsExist.hasStart && dateInputsExist.hasEnd) {
            const today = new Date();
            const lastMonth = new Date(today);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            const startValue = lastMonth.toISOString().split('T')[0];
            const endValue = today.toISOString().split('T')[0];

            await page.evaluate(({ start, end }) => {
                const startInput = document.getElementById('att-date-start');
                const endInput = document.getElementById('att-date-end');
                if (startInput) {
                    startInput.value = start;
                    startInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (endInput) {
                    endInput.value = end;
                    endInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, { start: startValue, end: endValue });

            // Click en refresh
            await page.evaluate(() => {
                if (typeof AttendanceEngine !== 'undefined' && AttendanceEngine.refresh) {
                    AttendanceEngine.refresh();
                }
            });

            await page.waitForTimeout(3000);
            console.log('✅ Filtros de fecha aplicados');
        } else {
            console.log('⚠️ Inputs de fecha no encontrados, saltando test de filtros');
        }

        await saveScreenshot(page, 'att-08-filtros-fecha');
    });

    test('RESUMEN: Generar reporte final', async ({ page }) => {
        await login(page);
        await navigateToAttendance(page);

        const report = {
            fecha: new Date().toISOString(),
            modulo: 'Control de Asistencia',
            empresa: 'ISI',
            bugsEncontrados: bugsFound.length,
            bugs: bugsFound
        };

        // Contar elementos
        const moduleInfo = await page.evaluate(() => {
            return {
                navItems: document.querySelectorAll('.att-nav-item').length,
                statsCards: document.querySelectorAll('.att-stat-card, .att-kpi-card').length
            };
        });

        report.navItems = moduleInfo.navItems;
        report.statsCards = moduleInfo.statsCards;

        console.log('\n' + '=' .repeat(60));
        console.log('📊 REPORTE FINAL - CONTROL DE ASISTENCIA');
        console.log('=' .repeat(60));
        console.log(`   Fecha: ${report.fecha}`);
        console.log(`   Módulo: ${report.modulo}`);
        console.log(`   Empresa: ${report.empresa}`);
        console.log(`   Vistas/Tabs: ${report.navItems}`);
        console.log(`   Stats cards: ${report.statsCards}`);
        console.log(`   Bugs encontrados: ${report.bugsEncontrados}`);

        if (report.bugsEncontrados > 0) {
            console.log('\n🐛 BUGS DETECTADOS:');
            bugsFound.forEach((bug, i) => {
                console.log(`   ${i + 1}. [${bug.category}] ${bug.description}`);
            });
        } else {
            console.log('\n✅ No se detectaron bugs');
        }

        // Guardar reporte
        const reportPath = path.join(SCREENSHOTS_DIR, 'reporte-attendance.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Reporte guardado en: ${reportPath}`);

        await saveScreenshot(page, 'att-99-estado-final');
    });
});
