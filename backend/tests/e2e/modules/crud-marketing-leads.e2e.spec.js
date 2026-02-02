/**
 * CRUD Deep Testing - Marketing Leads Module
 *
 * Test completo de:
 * - CREATE: Crear lead y verificar en BD
 * - READ: Verificar datos en lista y detalle
 * - UPDATE: Editar lead y verificar persistencia
 * - DELETE: Eliminar y verificar que desaparece
 * - REFRESH: Verificar persistencia después de F5
 * - BACKEND vs FRONTEND: Comparar datos
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', '..', 'test-results', 'crud-leads');
const API_BASE = `${BASE_URL}/api`;

// Datos de prueba únicos
const timestamp = Date.now();
const TEST_LEAD = {
    full_name: `Test CRUD Lead ${timestamp}`,
    email: `crud_test_${timestamp}@example.com`,
    company_name: `TestCorp CRUD ${timestamp}`,
    industry: 'Tecnología',
    phone: '+54 11 5555-1234',
    language: 'es',
    notes: 'Lead creado por test CRUD automatizado'
};

const UPDATED_LEAD = {
    full_name: `Test CRUD Lead UPDATED ${timestamp}`,
    company_name: `TestCorp UPDATED ${timestamp}`,
    notes: 'Lead ACTUALIZADO por test CRUD'
};

// Helper para crear directorio si no existe
const fs = require('fs');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper para screenshot
async function screenshot(page, name) {
    await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `${name}.png`),
        fullPage: true
    });
    console.log(`📸 Screenshot: ${name}.png`);
}

// Helper para login robusto
async function loginToPanel(page) {
    await page.goto(`${BASE_URL}/panel-administrativo.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const loginEmail = await page.locator('#login-email').first();
    const isLoginVisible = await loginEmail.isVisible().catch(() => false);

    if (isLoginVisible) {
        console.log('🔐 Rellenando formulario de login...');
        await loginEmail.fill('admin@aponnt.com');
        await page.fill('#login-password', 'admin123');

        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForResponse(resp => resp.url().includes('/api/aponnt/staff/login')).catch(() => null)
        ]);

        await page.waitForFunction(() => {
            const loginForm = document.getElementById('login-form');
            return !loginForm || loginForm.style.display === 'none' || !loginForm.offsetParent;
        }, { timeout: 15000 }).catch(() => null);

        await page.waitForTimeout(3000);
        console.log('🔐 Login completado');
    } else {
        console.log('🔐 Ya estamos logueados');
    }
}

// Helper para llamar API directamente
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...(body && { body: JSON.stringify(body) })
    };

    console.log(`🔗 API Call: ${method} ${url}`);
    console.log(`🔑 Token: ${token ? token.substring(0, 50) + '...' : 'null'}`);

    const response = await fetch(url, options);
    const result = await response.json();
    console.log(`📨 API Response status: ${response.status}`);
    console.log(`📨 API Response body: ${JSON.stringify(result).substring(0, 200)}`);
    return result;
}

// Helper para esperar que el módulo Marketing esté completamente cargado
async function waitForMarketingModuleReady(page, timeoutMs = 15000) {
    console.log('⏳ Esperando que MarketingLeadsModule se cargue...');

    const startTime = Date.now();
    let lastCount = 0;

    while (Date.now() - startTime < timeoutMs) {
        const moduleState = await page.evaluate(() => {
            if (typeof MarketingLeadsModule === 'undefined') return { ready: false, reason: 'module undefined' };
            if (!MarketingLeadsModule.state) return { ready: false, reason: 'state undefined' };
            if (!MarketingLeadsModule.state.leads) return { ready: false, reason: 'leads undefined' };
            return {
                ready: true,
                leadsCount: MarketingLeadsModule.state.leads.length,
                view: MarketingLeadsModule.state.view
            };
        });

        if (moduleState.ready && moduleState.leadsCount > 0) {
            console.log(`✅ MarketingLeadsModule listo: ${moduleState.leadsCount} leads cargados`);
            return moduleState.leadsCount;
        }

        if (moduleState.leadsCount !== lastCount) {
            console.log(`⏳ Estado: ${JSON.stringify(moduleState)}`);
            lastCount = moduleState.leadsCount;
        }

        await page.waitForTimeout(500);
    }

    // Si después del timeout aún no hay leads, verificar el estado final
    const finalState = await page.evaluate(() => {
        if (typeof MarketingLeadsModule === 'undefined') return { error: 'module undefined' };
        return {
            leadsCount: MarketingLeadsModule?.state?.leads?.length || 0,
            view: MarketingLeadsModule?.state?.view,
            filters: MarketingLeadsModule?.state?.filters
        };
    });

    console.log(`⚠️ Timeout alcanzado. Estado final: ${JSON.stringify(finalState)}`);
    return finalState.leadsCount || 0;
}

test.describe('CRUD Deep Testing - Marketing Leads', () => {
    let staffToken = null;
    let createdLeadId = null;
    let page;

    test.beforeAll(async ({ browser }) => {
        // Usar E2E_SERVICE_TOKEN para evitar rate limiting en login
        console.log('🔍 E2E_SERVICE_TOKEN env:', process.env.E2E_SERVICE_TOKEN ? 'EXISTS' : 'NOT SET');
        staffToken = process.env.E2E_SERVICE_TOKEN;
        console.log('🔍 staffToken after assignment:', staffToken ? staffToken.substring(0, 30) + '...' : 'null');

        // Si no hay service token, intentar login directo
        if (!staffToken) {
            console.log('⚠️ No service token, attempting login...');
            try {
                const loginResponse = await fetch(`${API_BASE}/v1/auth/aponnt/staff/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'admin@aponnt.com', password: 'admin123' })
                });
                const loginData = await loginResponse.json();
                console.log('🔍 Login response:', JSON.stringify(loginData).substring(0, 100));
                staffToken = loginData.token;
            } catch (e) {
                console.error('❌ Error en login:', e.message);
            }
        }
        console.log('🔐 Token obtenido:', staffToken ? 'OK' : 'FAILED');
        console.log('🔐 Token value:', staffToken ? staffToken.substring(0, 30) + '...' : 'null');
    });

    test('1. CREATE - Crear nuevo lead y verificar en BD', async ({ page: testPage }) => {
        page = testPage;
        await page.setViewportSize({ width: 1600, height: 1000 });
        test.setTimeout(120000);

        console.log('\n========== PASO 1: CREATE ==========\n');

        // Login usando helper
        await loginToPanel(page);
        await screenshot(page, '01-login-complete');

        // Navegar al módulo Marketing
        await page.evaluate(() => {
            if (typeof AdminPanelController !== 'undefined') {
                AdminPanelController.loadSection('marketing');
            }
        });

        // Esperar que el módulo esté completamente cargado
        const leadsBefore = await waitForMarketingModuleReady(page, 15000);
        await screenshot(page, '02-marketing-module-loaded');
        console.log(`📊 Leads antes de crear: ${leadsBefore}`);

        // Abrir modal de nuevo lead
        await page.evaluate(() => {
            MarketingLeadsModule.showCreateForm();
        });
        await page.waitForTimeout(1000);
        await screenshot(page, '03-modal-nuevo-lead-vacio');

        // Llenar formulario
        await page.fill('input[name="full_name"]', TEST_LEAD.full_name);
        await page.fill('input[name="email"]', TEST_LEAD.email);
        await page.fill('input[name="company_name"]', TEST_LEAD.company_name);
        await page.fill('input[name="phone"]', TEST_LEAD.phone);
        await page.fill('textarea[name="notes"]', TEST_LEAD.notes);

        // Seleccionar industria si existe el select
        const industrySelect = await page.$('select[name="industry"]');
        if (industrySelect) {
            await page.selectOption('select[name="industry"]', TEST_LEAD.industry);
        }

        await screenshot(page, '04-modal-nuevo-lead-lleno');

        // Guardar lead
        await page.evaluate(() => {
            MarketingLeadsModule.saveLead();
        });

        // Esperar que la lista se actualice después del save
        await page.waitForTimeout(2000);

        // Esperar a que el nuevo lead aparezca en el estado
        let leadsAfter = 0;
        for (let i = 0; i < 10; i++) {
            leadsAfter = await page.evaluate(() => {
                return MarketingLeadsModule?.state?.leads?.length || 0;
            });
            if (leadsAfter > leadsBefore) break;
            console.log(`⏳ Esperando leads... actual: ${leadsAfter}, esperado: > ${leadsBefore}`);
            await page.waitForTimeout(1000);
        }

        await screenshot(page, '05-lead-creado-lista');
        console.log(`📊 Leads después de crear: ${leadsAfter}`);
        expect(leadsAfter).toBeGreaterThan(leadsBefore);

        // Obtener ID del lead creado
        const newLead = await page.evaluate((email) => {
            return MarketingLeadsModule?.state?.leads?.find(l => l.email === email);
        }, TEST_LEAD.email);

        expect(newLead).toBeTruthy();
        createdLeadId = newLead.id;
        console.log(`✅ Lead creado con ID: ${createdLeadId}`);

        // VERIFICAR EN BD via API
        const apiLead = await apiCall(`/marketing/leads/${createdLeadId}`, 'GET', null, staffToken);
        console.log('\n📊 COMPARACIÓN FRONTEND vs BACKEND:');
        console.log('Frontend full_name:', newLead.full_name);
        console.log('Backend full_name:', apiLead.data?.full_name);
        expect(apiLead.data?.full_name).toBe(TEST_LEAD.full_name);
        expect(apiLead.data?.email).toBe(TEST_LEAD.email);
        console.log('✅ Datos coinciden entre Frontend y Backend\n');
    });

    test('2. READ - Verificar datos después de refresh (F5)', async ({ page: testPage }) => {
        page = testPage;
        await page.setViewportSize({ width: 1600, height: 1000 });
        test.setTimeout(60000);

        console.log('\n========== PASO 2: READ + REFRESH ==========\n');

        // Login usando helper
        await loginToPanel(page);

        // Navegar al módulo
        await page.evaluate(() => {
            AdminPanelController.loadSection('marketing');
        });
        await waitForMarketingModuleReady(page, 15000);

        // REFRESH (F5)
        console.log('🔄 Ejecutando F5 (refresh)...');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Re-navegar al módulo después del refresh
        await page.evaluate(() => {
            AdminPanelController.loadSection('marketing');
        });
        await waitForMarketingModuleReady(page, 15000);
        await screenshot(page, '06-despues-refresh');

        // Verificar que el lead persiste
        const leadAfterRefresh = await page.evaluate((email) => {
            return MarketingLeadsModule?.state?.leads?.find(l => l.email === email);
        }, TEST_LEAD.email);

        expect(leadAfterRefresh).toBeTruthy();
        console.log('✅ Lead persiste después de F5');
        console.log(`   - ID: ${leadAfterRefresh.id}`);
        console.log(`   - Nombre: ${leadAfterRefresh.full_name}`);
        console.log(`   - Email: ${leadAfterRefresh.email}`);

        // Buscar el lead usando el filtro
        await page.fill('#searchInput', TEST_LEAD.email);
        await page.evaluate(() => {
            MarketingLeadsModule.applyFilters();
        });
        await page.waitForTimeout(2000);
        await screenshot(page, '07-busqueda-lead-creado');

        // Verificar que aparece en la búsqueda
        const searchResults = await page.evaluate(() => {
            return MarketingLeadsModule?.state?.leads?.length || 0;
        });
        console.log(`📊 Resultados de búsqueda: ${searchResults}`);
        expect(searchResults).toBeGreaterThan(0);
    });

    test('3. UPDATE - Editar lead y verificar cambios', async ({ page: testPage }) => {
        page = testPage;
        await page.setViewportSize({ width: 1600, height: 1000 });
        test.setTimeout(60000);

        console.log('\n========== PASO 3: UPDATE ==========\n');

        // Login usando helper
        await loginToPanel(page);

        await page.evaluate(() => {
            AdminPanelController.loadSection('marketing');
        });
        await waitForMarketingModuleReady(page, 15000);

        // Buscar el lead
        await page.fill('#searchInput', TEST_LEAD.email);
        await page.evaluate(() => {
            MarketingLeadsModule.applyFilters();
        });
        await page.waitForTimeout(2000);

        // Obtener el ID del lead (con retry si no se encuentra inmediatamente)
        let leadToEdit = null;
        for (let i = 0; i < 5; i++) {
            leadToEdit = await page.evaluate((email) => {
                return MarketingLeadsModule?.state?.leads?.find(l => l.email === email);
            }, TEST_LEAD.email);
            if (leadToEdit) break;
            console.log(`⏳ Buscando lead con email ${TEST_LEAD.email}... intento ${i + 1}`);
            await page.waitForTimeout(1000);
        }

        expect(leadToEdit).toBeTruthy();
        const leadId = leadToEdit.id;

        // Abrir modal de edición
        await page.evaluate((id) => {
            MarketingLeadsModule.editLead(id);
        }, leadId);
        await page.waitForTimeout(1500);
        await screenshot(page, '08-modal-editar-antes');

        // Modificar datos con clear primero para asegurar reemplazo completo
        await page.locator('input[name="full_name"]').clear();
        await page.fill('input[name="full_name"]', UPDATED_LEAD.full_name);
        await page.locator('input[name="company_name"]').clear();
        await page.fill('input[name="company_name"]', UPDATED_LEAD.company_name);
        await page.locator('textarea[name="notes"]').clear();
        await page.fill('textarea[name="notes"]', UPDATED_LEAD.notes);
        await screenshot(page, '09-modal-editar-modificado');

        // Verificar qué tiene el formulario antes de guardar
        const formDataBefore = await page.evaluate(() => {
            const form = document.getElementById('leadForm');
            const formData = new FormData(form);
            return Object.fromEntries(formData);
        });
        console.log('📋 FormData antes de guardar:', JSON.stringify(formDataBefore, null, 2));
        console.log('📋 currentLead antes de guardar:', JSON.stringify(await page.evaluate(() => MarketingLeadsModule.state.currentLead), null, 2));

        // Capturar logs del browser
        page.on('console', msg => console.log('🌐 Browser:', msg.text()));

        // Interceptar TODAS las respuestas de red para detectar el 500
        page.on('response', response => {
            const status = response.status();
            const url = response.url();
            if (url.includes('/api/')) {
                console.log(`🌐 Network: ${status} ${response.request().method()} ${url}`);
            }
            if (status >= 400) {
                console.log(`❌ ERROR RESPONSE: ${status} ${response.request().method()} ${url}`);
            }
        });

        // Guardar cambios y esperar respuesta
        const saveResult = await page.evaluate(async () => {
            await MarketingLeadsModule.saveLead();
            return true;
        });

        // Esperar que la lista se actualice con el nombre nuevo
        let updatedLead = null;
        for (let i = 0; i < 10; i++) {
            updatedLead = await page.evaluate((id) => {
                return MarketingLeadsModule?.state?.leads?.find(l => l.id === id);
            }, leadId);
            if (updatedLead?.full_name?.includes('UPDATED')) break;
            console.log(`⏳ Esperando actualización... nombre actual: ${updatedLead?.full_name}`);
            await page.waitForTimeout(1000);
        }

        await screenshot(page, '10-lead-actualizado-lista');

        console.log('📊 Verificación de UPDATE:');
        console.log(`   - Nombre anterior: ${TEST_LEAD.full_name}`);
        console.log(`   - Nombre nuevo: ${updatedLead?.full_name}`);
        expect(updatedLead?.full_name).toBe(UPDATED_LEAD.full_name);

        // VERIFICAR EN BD
        const apiUpdated = await apiCall(`/marketing/leads/${leadId}`, 'GET', null, staffToken);
        console.log(`   - Backend full_name: ${apiUpdated.data?.full_name}`);
        expect(apiUpdated.data?.full_name).toBe(UPDATED_LEAD.full_name);
        console.log('✅ UPDATE verificado en Frontend y Backend\n');

        // Reabrir modal para confirmar persistencia visual
        await page.evaluate((id) => {
            MarketingLeadsModule.editLead(id);
        }, leadId);
        await page.waitForTimeout(1500);
        await screenshot(page, '11-modal-editar-verificacion');

        // Verificar que los datos actualizados están en el modal
        const modalName = await page.$eval('input[name="full_name"]', el => el.value);
        expect(modalName).toBe(UPDATED_LEAD.full_name);
        console.log('✅ Datos actualizados persisten en modal');
    });

    test('4. DELETE - Eliminar lead y verificar', async ({ page: testPage }) => {
        page = testPage;
        await page.setViewportSize({ width: 1600, height: 1000 });
        test.setTimeout(60000);

        console.log('\n========== PASO 4: DELETE ==========\n');

        // Login usando helper
        await loginToPanel(page);

        await page.evaluate(() => {
            AdminPanelController.loadSection('marketing');
        });
        await waitForMarketingModuleReady(page, 15000);

        // Buscar el lead actualizado
        await page.fill('#searchInput', TEST_LEAD.email);
        await page.evaluate(() => {
            MarketingLeadsModule.applyFilters();
        });
        await page.waitForTimeout(2000);
        await screenshot(page, '12-antes-eliminar');

        // Obtener lead y contar
        const leadToDelete = await page.evaluate((email) => {
            return MarketingLeadsModule?.state?.leads?.find(l => l.email === email);
        }, TEST_LEAD.email);

        expect(leadToDelete).toBeTruthy();
        const leadId = leadToDelete.id;

        const countBefore = await page.evaluate(() => {
            return MarketingLeadsModule?.state?.leads?.length || 0;
        });
        console.log(`📊 Leads antes de eliminar: ${countBefore}`);

        // Configurar handler para el confirm dialog
        page.on('dialog', async dialog => {
            console.log(`   Dialog: ${dialog.message()}`);
            await dialog.accept();
        });

        // Eliminar lead
        await page.evaluate((id) => {
            MarketingLeadsModule.deleteLead(id);
        }, leadId);
        await page.waitForTimeout(3000);
        await screenshot(page, '13-despues-eliminar');

        // Verificar que desapareció del frontend
        const countAfter = await page.evaluate(() => {
            return MarketingLeadsModule?.state?.leads?.length || 0;
        });
        console.log(`📊 Leads después de eliminar: ${countAfter}`);

        const deletedLead = await page.evaluate((email) => {
            return MarketingLeadsModule?.state?.leads?.find(l => l.email === email);
        }, TEST_LEAD.email);

        expect(deletedLead).toBeFalsy();
        console.log('✅ Lead eliminado del frontend');

        // VERIFICAR EN BD
        const apiDeleted = await apiCall(`/marketing/leads/${leadId}`, 'GET', null, staffToken);
        console.log(`📊 Backend response: ${JSON.stringify(apiDeleted)}`);
        // El lead debería no existir o estar marcado como eliminado
        expect(apiDeleted.success === false || !apiDeleted.data).toBeTruthy();
        console.log('✅ Lead eliminado de la base de datos\n');
    });

    test('5. FINAL - Refresh y verificar que el lead ya no existe', async ({ page: testPage }) => {
        page = testPage;
        await page.setViewportSize({ width: 1600, height: 1000 });
        test.setTimeout(60000);

        console.log('\n========== PASO 5: VERIFICACIÓN FINAL ==========\n');

        // Login usando helper
        await loginToPanel(page);

        await page.evaluate(() => {
            AdminPanelController.loadSection('marketing');
        });
        await waitForMarketingModuleReady(page, 15000);

        // F5
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            AdminPanelController.loadSection('marketing');
        });
        await waitForMarketingModuleReady(page, 15000);
        await screenshot(page, '14-verificacion-final');

        // Buscar el lead eliminado
        await page.fill('#searchInput', TEST_LEAD.email);
        await page.evaluate(() => {
            MarketingLeadsModule.applyFilters();
        });
        await page.waitForTimeout(2000);
        await screenshot(page, '15-busqueda-final-vacia');

        // Verificar que no existe
        const finalCheck = await page.evaluate((email) => {
            return MarketingLeadsModule?.state?.leads?.find(l => l.email === email);
        }, TEST_LEAD.email);

        expect(finalCheck).toBeFalsy();
        console.log('✅ VERIFICACIÓN FINAL: Lead eliminado no aparece después de F5');

        console.log('\n========================================');
        console.log('✅ TEST CRUD COMPLETO EXITOSO');
        console.log('========================================');
        console.log('📸 Screenshots en:', SCREENSHOTS_DIR);
        console.log('========================================\n');
    });
});
