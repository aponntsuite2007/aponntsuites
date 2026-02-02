/**
 * CRUD Visual Testing - DMS Dashboard (Gestión Documental)
 * FUENTE ÚNICA DE VERDAD DOCUMENTAL
 *
 * Empresa: ISI | Usuario: admin | Clave: admin123
 *
 * Test visual con screenshots de cada operación CRUD:
 * - READ: Ver documentos, tabs, stats
 * - CREATE: Abrir formulario de solicitud
 * - UPDATE: Ver tab de validación
 * - Navegación entre todos los tabs
 */

const { test } = require('@playwright/test');
const BASE_URL = 'http://localhost:9998';

// Helper para login
async function loginISI(page) {
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(1000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(6000);

    // Cerrar modal de login
    await page.evaluate(() => {
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer) {
            loginContainer.style.cssText = 'display: none !important; visibility: hidden !important;';
        }
        if (typeof showDashboard === 'function') showDashboard();
        document.body.style.opacity = '1';
        document.body.style.overflow = 'auto';
    });
    await page.waitForTimeout(1000);
}

// Helper para navegar a DMS con espera mejorada
async function navigateToDMS(page) {
    console.log('🔄 Navegando a DMS...');

    // Verificar logs de consola para debug
    page.on('console', msg => {
        if (msg.text().includes('[DMS]') || msg.text().includes('Error')) {
            console.log(`   BROWSER: ${msg.text()}`);
        }
    });

    // Llamar showModuleContent
    await page.evaluate(() => {
        console.log('📁 [TEST] Llamando showModuleContent...');
        if (typeof showModuleContent === 'function') {
            showModuleContent('dms-dashboard', 'Gestión Documental');
        } else {
            console.error('❌ showModuleContent no definido');
        }
    });

    // Esperar a que se cree el contenedor DMS
    await page.waitForTimeout(2000);

    // Verificar si el contenedor DMS existe
    const dmsContainerExists = await page.evaluate(() => {
        const container = document.getElementById('dms-dashboard-container');
        console.log('📁 [TEST] dms-dashboard-container:', container ? 'EXISTE' : 'NO EXISTE');
        return !!container;
    });

    if (!dmsContainerExists) {
        console.log('⚠️ Contenedor DMS no encontrado, intentando showDmsDashboardContent directamente...');
        await page.evaluate(() => {
            if (typeof window.showDmsDashboardContent === 'function') {
                window.showDmsDashboardContent();
            }
        });
        await page.waitForTimeout(2000);
    }

    // Esperar a que DMS renderice
    await page.waitForTimeout(3000);

    // Forzar scroll al módulo y ocultar grid
    await page.evaluate(() => {
        // Ocultar grid de módulos
        const moduleGrid = document.querySelector('.module-grid');
        if (moduleGrid) {
            moduleGrid.style.display = 'none';
        }

        // Hacer visible mainContent
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
            mainContent.style.opacity = '1';
            mainContent.scrollIntoView({ behavior: 'instant', block: 'start' });
        }

        // Scroll al contenedor DMS
        const dmsContainer = document.getElementById('dms-dashboard-container');
        if (dmsContainer) {
            dmsContainer.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    });

    await page.waitForTimeout(1000);
}

test.describe('CRUD Visual Testing - DMS Dashboard', () => {

    test('CRUD Completo con Screenshots', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 900 });
        test.setTimeout(300000); // 5 minutos para todo el test

        // ═══════════════════════════════════════════════════════════════
        // FASE 1: LOGIN
        // ═══════════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('FASE 1: LOGIN');
        console.log('═══════════════════════════════════════════════════════════════');

        await loginISI(page);
        await page.screenshot({ path: 'test-results/crud-dms-01-login-ok.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-01-login-ok.png');

        // ═══════════════════════════════════════════════════════════════
        // FASE 2: NAVEGAR A DMS
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 2: NAVEGAR A DMS');
        console.log('═══════════════════════════════════════════════════════════════');

        await navigateToDMS(page);

        // Verificar estado del DOM
        const domState = await page.evaluate(() => {
            return {
                moduleGrid: document.querySelector('.module-grid')?.style.display,
                mainContent: document.getElementById('mainContent')?.innerHTML?.substring(0, 200),
                dmsContainer: !!document.getElementById('dms-dashboard-container'),
                dmsHeader: !!document.querySelector('.dms-header'),
                dmsExplorer: !!document.querySelector('.dms-explorer'),
                windowDMS: !!window.DMS
            };
        });
        console.log('📊 Estado DOM:', JSON.stringify(domState, null, 2));

        // Screenshot del módulo (viewport sin fullPage para ver lo que está visible)
        await page.screenshot({ path: 'test-results/crud-dms-02-modulo-inicial.png' });
        console.log('📸 Screenshot: crud-dms-02-modulo-inicial.png');

        // Si el contenedor DMS existe, tomar screenshot específico
        const dmsContent = await page.$('#dms-dashboard-container, .dms-dashboard, .dms-header');
        if (dmsContent) {
            await dmsContent.screenshot({ path: 'test-results/crud-dms-02b-dms-content.png' });
            console.log('📸 Screenshot específico DMS: crud-dms-02b-dms-content.png');
        }

        // Verificar elementos UI
        const tabs = await page.$$('.dms-tab');
        const stats = await page.$$('.dms-stat-card');
        console.log(`📋 Tabs encontrados: ${tabs.length}`);
        console.log(`📊 Stats cards: ${stats.length}`);

        // ═══════════════════════════════════════════════════════════════
        // FASE 3: READ - Explorador General
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 3: READ - Explorador General');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.dms-tab');
            const explorador = Array.from(tabs).find(t => t.textContent.includes('Explorador'));
            if (explorador) explorador.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/crud-dms-03-read-explorador.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-03-read-explorador.png');

        // ═══════════════════════════════════════════════════════════════
        // FASE 4: READ - Mis Documentos
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 4: READ - Mis Documentos');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.dms-tab');
            const misDocs = Array.from(tabs).find(t => t.textContent.includes('Mis Documentos'));
            if (misDocs) misDocs.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/crud-dms-04-read-mis-documentos.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-04-read-mis-documentos.png');

        // ═══════════════════════════════════════════════════════════════
        // FASE 5: UPDATE - Validación
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 5: UPDATE - Tab Validación');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.dms-tab');
            const validacion = Array.from(tabs).find(t => t.textContent.includes('Validación'));
            if (validacion) validacion.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/crud-dms-05-update-validacion.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-05-update-validacion.png');

        // Contar documentos pendientes
        const pendingDocs = await page.$$('.dms-item, .validation-item');
        console.log(`📄 Documentos en validación: ${pendingDocs.length}`);

        // ═══════════════════════════════════════════════════════════════
        // FASE 6: READ - Mis Solicitudes
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 6: READ - Mis Solicitudes');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.dms-tab');
            const solicitudes = Array.from(tabs).find(t => t.textContent.includes('Solicitudes'));
            if (solicitudes) solicitudes.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/crud-dms-06-read-mis-solicitudes.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-06-read-mis-solicitudes.png');

        // ═══════════════════════════════════════════════════════════════
        // FASE 7: CREATE - Solicitar Documento
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 7: CREATE - Solicitar Documento');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.dms-tab');
            const solicitar = Array.from(tabs).find(t => t.textContent.includes('Solicitar'));
            if (solicitar) solicitar.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/crud-dms-07-create-solicitar.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-07-create-solicitar.png');

        // Verificar si hay formulario de creación
        const hasForm = await page.$('form, .request-form, .new-request-form');
        const hasSelects = await page.$$('select');
        const hasInputs = await page.$$('input, textarea');
        console.log(`📋 Formulario: ${hasForm ? 'Sí' : 'No'}`);
        console.log(`   Selects: ${hasSelects.length}`);
        console.log(`   Inputs: ${hasInputs.length}`);

        // ═══════════════════════════════════════════════════════════════
        // FASE 8: READ - Por Vencer
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 8: READ - Por Vencer');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.dms-tab');
            const porVencer = Array.from(tabs).find(t => t.textContent.includes('Vencer'));
            if (porVencer) porVencer.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/crud-dms-08-read-por-vencer.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-08-read-por-vencer.png');

        // ═══════════════════════════════════════════════════════════════
        // FASE 9: PROBAR FILTROS
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 9: PROBAR FILTROS');
        console.log('═══════════════════════════════════════════════════════════════');

        // Volver al explorador
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.dms-tab');
            const explorador = Array.from(tabs).find(t => t.textContent.includes('Explorador'));
            if (explorador) explorador.click();
        });
        await page.waitForTimeout(2000);

        // Cambiar filtro de categoría
        await page.evaluate(() => {
            const filter = document.querySelector('.dms-filter-select');
            if (filter && filter.options.length > 1) {
                filter.selectedIndex = 1;
                filter.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'test-results/crud-dms-09-filtro-categoria.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-09-filtro-categoria.png');

        // ═══════════════════════════════════════════════════════════════
        // FASE 10: PROBAR BÚSQUEDA
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FASE 10: PROBAR BÚSQUEDA');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.evaluate(() => {
            // Restaurar filtro
            const filter = document.querySelector('.dms-filter-select');
            if (filter) filter.selectedIndex = 0;
            filter?.dispatchEvent(new Event('change', { bubbles: true }));

            // Buscar
            const input = document.querySelector('.dms-search-box input');
            if (input) {
                input.value = 'documento';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'test-results/crud-dms-10-busqueda.png', fullPage: true });
        console.log('📸 Screenshot: crud-dms-10-busqueda.png');

        // ═══════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('RESUMEN FINAL');
        console.log('═══════════════════════════════════════════════════════════════');

        console.log('\n📊 VERIFICACIÓN DE ELEMENTOS UI:');
        const finalStats = {
            header: await page.$('.dms-header') !== null,
            tabs: (await page.$$('.dms-tab')).length,
            statsCards: (await page.$$('.dms-stat-card')).length,
            toolbar: await page.$('.dms-toolbar') !== null,
            search: await page.$('.dms-search-box') !== null,
            filters: (await page.$$('.dms-filter-select')).length,
            explorer: await page.$('.dms-explorer') !== null
        };

        console.log(`   ✅ Header: ${finalStats.header}`);
        console.log(`   📋 Tabs: ${finalStats.tabs}`);
        console.log(`   📊 Stats cards: ${finalStats.statsCards}`);
        console.log(`   ✅ Toolbar: ${finalStats.toolbar}`);
        console.log(`   ✅ Search: ${finalStats.search}`);
        console.log(`   🔍 Filters: ${finalStats.filters}`);
        console.log(`   ✅ Explorer: ${finalStats.explorer}`);

        console.log('\n📸 SCREENSHOTS CAPTURADOS:');
        console.log('   01. crud-dms-01-login-ok.png');
        console.log('   02. crud-dms-02-modulo-inicial.png');
        console.log('   03. crud-dms-03-read-explorador.png');
        console.log('   04. crud-dms-04-read-mis-documentos.png');
        console.log('   05. crud-dms-05-update-validacion.png');
        console.log('   06. crud-dms-06-read-mis-solicitudes.png');
        console.log('   07. crud-dms-07-create-solicitar.png');
        console.log('   08. crud-dms-08-read-por-vencer.png');
        console.log('   09. crud-dms-09-filtro-categoria.png');
        console.log('   10. crud-dms-10-busqueda.png');

        console.log('\n✅ TEST CRUD VISUAL COMPLETADO');
    });

});
