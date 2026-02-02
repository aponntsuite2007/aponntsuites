/**
 * Visual Testing - Marketing Leads Module (panel-administrativo)
 *
 * Este test captura screenshots de todas las vistas del módulo Marketing Leads
 * para verificar visualmente que todo funciona correctamente.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', '..', 'test-results');

// Helper para cerrar cualquier modal abierto
async function closeAllModals(page) {
    await page.evaluate(() => {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.remove());
    });
    await page.waitForTimeout(500);
}

// Helper para capturar modal con scroll
async function captureModalWithScroll(page, modalSelector, baseName) {
    const modal = await page.$(modalSelector);
    if (!modal) {
        console.log(`⚠️ Modal ${modalSelector} no encontrado`);
        return;
    }

    await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `${baseName}-top.png`),
        fullPage: false
    });
    console.log(`📸 Screenshot: ${baseName}-top.png`);

    const modalContent = await page.$(`${modalSelector} .modal-content`);
    if (modalContent) {
        await modalContent.evaluate(el => el.scrollTop = el.scrollHeight / 2);
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${baseName}-mid.png`),
            fullPage: false
        });
        console.log(`📸 Screenshot: ${baseName}-mid.png`);

        await modalContent.evaluate(el => el.scrollTop = el.scrollHeight);
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${baseName}-bottom.png`),
            fullPage: false
        });
        console.log(`📸 Screenshot: ${baseName}-bottom.png`);
    }
}

test.describe('Visual Testing - Marketing Leads (panel-administrativo)', () => {

    test('Capturar todas las vistas del módulo Marketing Leads', async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 });
        test.setTimeout(180000);

        console.log('🔐 Iniciando login en panel-administrativo...');

        // PASO 1: LOGIN
        await page.goto(`${BASE_URL}/panel-administrativo.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-01-login.png'), fullPage: true });
        console.log('📸 Screenshot: marketing-01-login.png');

        const loginEmail = await page.$('#login-email');
        if (loginEmail) {
            console.log('📝 Formulario de login detectado, ingresando credenciales...');
            await page.fill('#login-email', 'admin@aponnt.com');
            await page.fill('#login-password', 'admin123');
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(5000);
        }

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-02-after-login.png'), fullPage: true });
        console.log('📸 Screenshot: marketing-02-after-login.png');

        // PASO 2: NAVEGAR AL MÓDULO MARKETING (programáticamente)
        console.log('📊 Navegando al módulo Marketing Leads...');

        await page.evaluate(() => {
            if (typeof AdminPanelController !== 'undefined' && AdminPanelController.loadSection) {
                AdminPanelController.loadSection('marketing');
            }
        });
        await page.waitForTimeout(5000);

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-03-main-view.png'), fullPage: true });
        console.log('📸 Screenshot: marketing-03-main-view.png');

        // PASO 3: VERIFICAR ELEMENTOS
        console.log('🔍 Verificando elementos del módulo...');

        const statsCards = await page.$$('.stat-card');
        console.log(`📊 Stats cards encontradas: ${statsCards.length}`);

        const leadsTable = await page.$('.leads-table');
        if (leadsTable) {
            console.log('✅ Tabla de leads encontrada');
        }

        // PASO 4: MODAL NUEVO LEAD
        console.log('📝 Abriendo modal de Nuevo Lead...');

        await page.evaluate(() => {
            if (typeof MarketingLeadsModule !== 'undefined') {
                MarketingLeadsModule.showCreateForm();
            }
        });
        await page.waitForTimeout(2000);

        const leadModal = await page.$('#leadModal');
        if (leadModal) {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-04-modal-nuevo-lead.png'), fullPage: true });
            console.log('📸 Screenshot: marketing-04-modal-nuevo-lead.png');
            await captureModalWithScroll(page, '#leadModal', 'marketing-04-modal-nuevo-lead');
        }

        await closeAllModals(page);

        // PASO 5: MODAL ESTADÍSTICAS
        console.log('📊 Abriendo modal de Estadísticas...');

        await page.evaluate(() => {
            if (typeof MarketingLeadsModule !== 'undefined') {
                MarketingLeadsModule.showStats();
            }
        });
        await page.waitForTimeout(2000);

        const statsModal = await page.$('#statsModal');
        if (statsModal) {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-05-modal-estadisticas.png'), fullPage: true });
            console.log('📸 Screenshot: marketing-05-modal-estadisticas.png');
            await captureModalWithScroll(page, '#statsModal', 'marketing-05-modal-estadisticas');
        }

        await closeAllModals(page);

        // PASO 6: MODAL ENVIAR FLYER
        console.log('📤 Probando modal Enviar Flyer...');

        // Obtener el ID del primer lead
        const firstLeadId = await page.evaluate(() => {
            if (typeof MarketingLeadsModule !== 'undefined' && MarketingLeadsModule.state.leads.length > 0) {
                return MarketingLeadsModule.state.leads[0].id;
            }
            return null;
        });

        if (firstLeadId) {
            console.log(`✅ Lead encontrado con ID: ${firstLeadId}`);

            // Modal Enviar Flyer
            await page.evaluate((leadId) => {
                MarketingLeadsModule.showSendOptions(leadId);
            }, firstLeadId);
            await page.waitForTimeout(2000);

            const sendModal = await page.$('#sendModal');
            if (sendModal) {
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-06-modal-enviar-flyer.png'), fullPage: true });
                console.log('📸 Screenshot: marketing-06-modal-enviar-flyer.png');
            }

            await closeAllModals(page);

            // PASO 7: MODAL CREAR PRESUPUESTO
            console.log('📝 Probando modal Crear Presupuesto...');

            await page.evaluate((leadId) => {
                MarketingLeadsModule.createQuoteFromLead(leadId);
            }, firstLeadId);
            await page.waitForTimeout(4000);

            const quoteModal = await page.$('#quoteModal');
            if (quoteModal) {
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-07-modal-presupuesto-full.png'), fullPage: true });
                console.log('📸 Screenshot: marketing-07-modal-presupuesto-full.png');

                // Scroll a sección de módulos
                await page.evaluate(() => {
                    const el = document.querySelector('#modulesContainer');
                    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
                });
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-07-modal-presupuesto-modulos.png'), fullPage: true });
                console.log('📸 Screenshot: marketing-07-modal-presupuesto-modulos.png');

                // Scroll a sección de trial
                await page.evaluate(() => {
                    const el = document.querySelector('#trialOptions');
                    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
                });
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-07-modal-presupuesto-trial.png'), fullPage: true });
                console.log('📸 Screenshot: marketing-07-modal-presupuesto-trial.png');

                // Scroll a sección resumen
                await page.evaluate(() => {
                    const el = document.querySelector('#quoteSummary');
                    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
                });
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-07-modal-presupuesto-resumen.png'), fullPage: true });
                console.log('📸 Screenshot: marketing-07-modal-presupuesto-resumen.png');
            }

            await closeAllModals(page);

            // PASO 8: MODAL EDITAR LEAD
            console.log('✏️ Probando modal Editar Lead...');

            await page.evaluate((leadId) => {
                MarketingLeadsModule.editLead(leadId);
            }, firstLeadId);
            await page.waitForTimeout(2000);

            const editModal = await page.$('#leadModal');
            if (editModal) {
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-08-modal-editar-lead.png'), fullPage: true });
                console.log('📸 Screenshot: marketing-08-modal-editar-lead.png');
            }

            await closeAllModals(page);

        } else {
            console.log('ℹ️ No hay leads en la tabla (estado vacío)');
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-06-empty-state.png'), fullPage: true });
            console.log('📸 Screenshot: marketing-06-empty-state.png');
        }

        // PASO 9: FILTROS
        console.log('🔍 Probando filtros...');

        const statusFilter = await page.$('#statusFilter');
        if (statusFilter) {
            await statusFilter.selectOption({ index: 1 });
            await page.waitForTimeout(500);

            await page.evaluate(() => {
                if (typeof MarketingLeadsModule !== 'undefined') {
                    MarketingLeadsModule.applyFilters();
                }
            });
            await page.waitForTimeout(2000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-09-filtros-aplicados.png'), fullPage: true });
            console.log('📸 Screenshot: marketing-09-filtros-aplicados.png');
        }

        // FINAL
        console.log('\n========================================');
        console.log('📸 SCREENSHOTS GENERADOS EN:', SCREENSHOTS_DIR);
        console.log('========================================\n');

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketing-final.png'), fullPage: true });
        console.log('📸 Screenshot final: marketing-final.png');
    });
});
