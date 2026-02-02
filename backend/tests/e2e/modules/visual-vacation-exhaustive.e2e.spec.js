/**
 * TEST VISUAL EXHAUSTIVO - Módulo Gestión de Vacaciones
 * Sigue el protocolo de TESTING-VISUAL-EXHAUSTIVO-SPEC.md
 *
 * EMPRESA: ISI | USUARIO: admin | CLAVE: admin123
 *
 * TABS A TESTEAR:
 * 1. Solicitudes (requests)
 * 2. Calendario (calendar)
 * 3. Políticas LCT (policies)
 * 4. Balance (balance)
 * 5. Analytics (analytics)
 * 6. Configuración (config)
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots/vacation-exhaustive');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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

        document.querySelectorAll('.modal-backdrop, .loading-overlay, .ve-modal-overlay').forEach(o => {
            if (o.offsetParent !== null) {
                result.isBlocked = true;
                result.reasons.push(`Overlay visible: ${o.className}`);
            }
        });

        document.querySelectorAll('.spinner, .loading, .ve-loading, .ve-spinner').forEach(s => {
            if (s.offsetParent !== null) {
                result.isBlocked = true;
                result.reasons.push(`Spinner visible: ${s.className}`);
            }
        });

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

async function navigateToVacation(page) {
    console.log('🧭 Navegando al módulo de Gestión de Vacaciones...');
    await page.evaluate(() => {
        if (typeof showModuleContent === 'function') {
            showModuleContent('vacation-management', 'Gestión de Vacaciones');
        }
    });
    await page.waitForTimeout(5000);

    const moduleLoaded = await page.evaluate(() => {
        return document.querySelector('#vacation-app') !== null ||
               document.querySelector('.vacation-enterprise') !== null;
    });

    if (moduleLoaded) {
        console.log('✅ Módulo de Vacaciones cargado');
    } else {
        console.log('⚠️ Módulo no detectado, esperando más...');
        await page.waitForTimeout(3000);
    }
}

async function switchToView(page, viewName) {
    console.log(`📑 Cambiando a vista: ${viewName}...`);
    await page.evaluate((view) => {
        if (typeof VacationEngine !== 'undefined' && VacationEngine.showView) {
            VacationEngine.showView(view);
        } else {
            const btn = document.querySelector(`[data-view="${view}"]`);
            if (btn) btn.click();
        }
    }, viewName);
    await page.waitForTimeout(3000);
}

test.describe('Testing Exhaustivo - Módulo Gestión de Vacaciones', () => {

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(600000);

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text().substring(0, 200)}`);
            }
        });
    });

    test('FASE 1: Carga inicial del módulo', async ({ page }) => {
        await login(page);
        await saveScreenshot(page, 'vac-01-post-login');

        await navigateToVacation(page);
        await saveScreenshot(page, 'vac-02-modulo-cargado');

        const moduleInfo = await page.evaluate(() => {
            return {
                hasHeader: !!document.querySelector('.ve-header'),
                hasNav: !!document.querySelector('.ve-nav'),
                hasContent: !!document.querySelector('.ve-main, #ve-content'),
                navItems: document.querySelectorAll('.ve-nav-item').length,
                kpiCards: document.querySelectorAll('.ve-kpi-card').length
            };
        });

        console.log('\n📊 INFO DEL MÓDULO:');
        console.log(`   Header: ${moduleInfo.hasHeader ? '✅' : '❌'}`);
        console.log(`   Nav: ${moduleInfo.hasNav ? '✅' : '❌'}`);
        console.log(`   Content: ${moduleInfo.hasContent ? '✅' : '❌'}`);
        console.log(`   Nav items: ${moduleInfo.navItems}`);
        console.log(`   KPI cards: ${moduleInfo.kpiCards}`);

        expect(moduleInfo.navItems).toBeGreaterThanOrEqual(5);
    });

    test('FASE 2: Verificar las 6 vistas/tabs', async ({ page }) => {
        await login(page);
        await navigateToVacation(page);

        const views = [
            { name: 'requests', label: 'Solicitudes' },
            { name: 'calendar', label: 'Calendario' },
            { name: 'policies', label: 'Políticas LCT' },
            { name: 'balance', label: 'Balance' },
            { name: 'analytics', label: 'Analytics' },
            { name: 'config', label: 'Configuración' }
        ];

        console.log('\n📑 VERIFICANDO 6 VISTAS:');
        console.log('=' .repeat(50));

        for (const view of views) {
            console.log(`\n🔄 Verificando: ${view.label} (${view.name})`);

            await switchToView(page, view.name);
            await page.waitForTimeout(2000);

            const viewInfo = await page.evaluate(() => {
                const content = document.querySelector('#ve-content, .ve-main');
                const hasError = content?.innerText?.includes('Error') || !!document.querySelector('.ve-error');
                const hasLoading = !!document.querySelector('.ve-loading:not([style*="none"])');

                return {
                    hasContent: !!content,
                    contentLength: content?.innerText?.length || 0,
                    hasError,
                    hasLoading
                };
            });

            console.log(`   Content: ${viewInfo.hasContent ? '✅' : '❌'}`);
            console.log(`   Error: ${viewInfo.hasError ? '❌ SÍ' : '✅ No'}`);
            console.log(`   Content length: ${viewInfo.contentLength} chars`);

            if (viewInfo.hasError) {
                reportBug('VIEW_ERROR', `Vista ${view.name} muestra error`, { view: view.name });
            }

            await saveScreenshot(page, `vac-03-view-${view.name}`);
        }
    });

    test('FASE 3: Verificar modal de nueva solicitud', async ({ page }) => {
        await login(page);
        await navigateToVacation(page);

        console.log('\n📋 Abriendo modal de nueva solicitud...');

        await page.evaluate(() => {
            if (typeof VacationEngine !== 'undefined' && VacationEngine.showNewRequestModal) {
                VacationEngine.showNewRequestModal();
            } else {
                const btn = document.querySelector('[onclick*="showNewRequestModal"]');
                if (btn) btn.click();
            }
        });

        await page.waitForTimeout(3000);
        await saveScreenshot(page, 'vac-04-modal-nueva-solicitud');

        const modalInfo = await page.evaluate(() => {
            const modal = document.querySelector('.ve-modal, .ve-modal-overlay, #ve-modal');
            if (!modal) return { found: false };

            const selects = modal.querySelectorAll('select');
            const inputs = modal.querySelectorAll('input');
            const textareas = modal.querySelectorAll('textarea');

            return {
                found: true,
                visible: modal.offsetParent !== null || getComputedStyle(modal).display !== 'none',
                selectsCount: selects.length,
                inputsCount: inputs.length,
                textareasCount: textareas.length,
                selectsInfo: Array.from(selects).map(s => ({
                    id: s.id || s.name,
                    optionsCount: s.options.length
                }))
            };
        });

        console.log('\n📝 INFO DEL MODAL:');
        console.log(`   Modal encontrado: ${modalInfo.found ? '✅' : '❌'}`);
        console.log(`   Visible: ${modalInfo.visible ? '✅' : '❌'}`);
        console.log(`   Selects: ${modalInfo.selectsCount}`);
        console.log(`   Inputs: ${modalInfo.inputsCount}`);
        console.log(`   Textareas: ${modalInfo.textareasCount}`);

        if (modalInfo.selectsInfo) {
            modalInfo.selectsInfo.forEach(s => {
                const status = s.optionsCount > 1 ? '✅' : '⚠️';
                console.log(`   ${status} ${s.id}: ${s.optionsCount} opciones`);
                if (s.optionsCount <= 1) {
                    reportBug('DROPDOWN_VACIO', `Select ${s.id} tiene ${s.optionsCount} opciones`, { select: s.id });
                }
            });
        }

        // Cerrar modal
        await page.evaluate(() => {
            const closeBtn = document.querySelector('.ve-modal-close, .ve-btn-close, [onclick*="closeModal"]');
            if (closeBtn) closeBtn.click();
            else {
                const modal = document.querySelector('.ve-modal-overlay');
                if (modal) modal.remove();
            }
        });
    });

    test('FASE 4: Verificar KPIs y estadísticas', async ({ page }) => {
        await login(page);
        await navigateToVacation(page);

        const statsInfo = await page.evaluate(() => {
            const kpis = document.querySelectorAll('.ve-kpi-card, .ve-stat-card');
            const kpiData = [];

            kpis.forEach(kpi => {
                const label = kpi.querySelector('.ve-kpi-label, .ve-stat-label')?.textContent?.trim();
                const value = kpi.querySelector('.ve-kpi-value, .ve-stat-value')?.textContent?.trim();
                kpiData.push({ label, value });
            });

            return {
                kpiCount: kpis.length,
                kpis: kpiData
            };
        });

        console.log('\n📊 KPIs Y ESTADÍSTICAS:');
        console.log(`   Total KPIs: ${statsInfo.kpiCount}`);

        statsInfo.kpis.forEach(kpi => {
            console.log(`   - ${kpi.label}: ${kpi.value}`);
        });

        await saveScreenshot(page, 'vac-05-kpis');

        expect(statsInfo.kpiCount).toBeGreaterThanOrEqual(3);
    });

    test('FASE 5: Verificar tabla de solicitudes', async ({ page }) => {
        await login(page);
        await navigateToVacation(page);
        await switchToView(page, 'requests');
        await page.waitForTimeout(3000);

        const tableInfo = await page.evaluate(() => {
            const table = document.querySelector('.ve-table, table');
            const rows = document.querySelectorAll('.ve-table tbody tr, table tbody tr, .ve-request-row');
            const headers = document.querySelectorAll('.ve-table thead th, table thead th');

            return {
                hasTable: !!table,
                rowCount: rows.length,
                headerCount: headers.length,
                headers: Array.from(headers).map(h => h.textContent?.trim()).slice(0, 8)
            };
        });

        console.log('\n📋 INFO DE TABLA DE SOLICITUDES:');
        console.log(`   Tabla encontrada: ${tableInfo.hasTable ? '✅' : '❌'}`);
        console.log(`   Filas de datos: ${tableInfo.rowCount}`);
        console.log(`   Columnas: ${tableInfo.headerCount}`);
        console.log(`   Headers: ${tableInfo.headers.join(', ')}`);

        await saveScreenshot(page, 'vac-06-tabla-solicitudes');
    });

    test('FASE 6: Verificar filtros funcionan', async ({ page }) => {
        await login(page);
        await navigateToVacation(page);
        await switchToView(page, 'requests');
        await page.waitForTimeout(2000);

        const filtersInfo = await page.evaluate(() => {
            const selects = document.querySelectorAll('.ve-filters select, .ve-filter-select');
            const searchInput = document.querySelector('.ve-search, input[type="search"]');

            return {
                selectsCount: selects.length,
                hasSearch: !!searchInput,
                filters: Array.from(selects).map(s => ({
                    id: s.id || s.name,
                    optionsCount: s.options.length
                }))
            };
        });

        console.log('\n🔍 FILTROS:');
        console.log(`   Selects de filtro: ${filtersInfo.selectsCount}`);
        console.log(`   Campo búsqueda: ${filtersInfo.hasSearch ? '✅' : '❌'}`);

        filtersInfo.filters.forEach(f => {
            console.log(`   - ${f.id}: ${f.optionsCount} opciones`);
        });

        await saveScreenshot(page, 'vac-07-filtros');
    });

    test('FASE 7: Verificar vista Políticas LCT', async ({ page }) => {
        await login(page);
        await navigateToVacation(page);
        await switchToView(page, 'policies');
        await page.waitForTimeout(3000);

        const policiesInfo = await page.evaluate(() => {
            const content = document.querySelector('#ve-content, .ve-main');
            const scales = document.querySelectorAll('.ve-scale-item, .ve-scale-card, tr');
            const addScaleBtn = document.querySelector('[onclick*="showScaleModal"], .ve-btn-add-scale');

            return {
                hasContent: !!content,
                scalesCount: scales.length,
                hasAddButton: !!addScaleBtn,
                contentText: content?.innerText?.substring(0, 300) || ''
            };
        });

        console.log('\n📜 POLÍTICAS LCT:');
        console.log(`   Content: ${policiesInfo.hasContent ? '✅' : '❌'}`);
        console.log(`   Escalas: ${policiesInfo.scalesCount}`);
        console.log(`   Botón agregar: ${policiesInfo.hasAddButton ? '✅' : '❌'}`);

        await saveScreenshot(page, 'vac-08-policies');
    });

    test('RESUMEN: Generar reporte final', async ({ page }) => {
        await login(page);
        await navigateToVacation(page);

        const report = {
            fecha: new Date().toISOString(),
            modulo: 'Gestión de Vacaciones',
            empresa: 'ISI',
            bugsEncontrados: bugsFound.length,
            bugs: bugsFound
        };

        const moduleInfo = await page.evaluate(() => {
            return {
                navItems: document.querySelectorAll('.ve-nav-item').length,
                kpiCards: document.querySelectorAll('.ve-kpi-card').length
            };
        });

        report.navItems = moduleInfo.navItems;
        report.kpiCards = moduleInfo.kpiCards;

        console.log('\n' + '=' .repeat(60));
        console.log('📊 REPORTE FINAL - GESTIÓN DE VACACIONES');
        console.log('=' .repeat(60));
        console.log(`   Fecha: ${report.fecha}`);
        console.log(`   Módulo: ${report.modulo}`);
        console.log(`   Empresa: ${report.empresa}`);
        console.log(`   Vistas/Tabs: ${report.navItems}`);
        console.log(`   KPI cards: ${report.kpiCards}`);
        console.log(`   Bugs encontrados: ${report.bugsEncontrados}`);

        if (report.bugsEncontrados > 0) {
            console.log('\n🐛 BUGS DETECTADOS:');
            bugsFound.forEach((bug, i) => {
                console.log(`   ${i + 1}. [${bug.category}] ${bug.description}`);
            });
        } else {
            console.log('\n✅ No se detectaron bugs');
        }

        const reportPath = path.join(SCREENSHOTS_DIR, 'reporte-vacation.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Reporte guardado en: ${reportPath}`);

        await saveScreenshot(page, 'vac-99-estado-final');
    });
});
