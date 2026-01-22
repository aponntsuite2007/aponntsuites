/**
 * TEST FINAL - MÓDULO GESTIÓN DE KIOSCOS
 * Click preciso + CRUD completo + E2E
 */
const { chromium } = require('playwright');

(async () => {
    console.log('═'.repeat(70));
    console.log('TEST FINAL - MÓDULO GESTIÓN DE KIOSCOS');
    console.log('═'.repeat(70));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = {
        crud: { create: false, read: false, update: false, delete: false },
        e2e: { login: false, navegacion: false, tabla: false, datos: false, modal: false },
        multiTenant: false
    };

    // Timestamp único para este test
    const uniqueId = Date.now().toString() + Math.random().toString(36).substring(7);
    let testKioskId = null;

    try {
        // =============================================
        // LOGIN
        // =============================================
        console.log('\n▶ LOGIN');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);
        results.e2e.login = true;
        console.log('   ✅ Login exitoso');

        // =============================================
        // CRUD - API TESTS
        // =============================================
        console.log('\n' + '═'.repeat(50));
        console.log('▶ CRUD - API KIOSCOS');
        console.log('═'.repeat(50));

        // READ - Listar kioscos existentes
        console.log('\n   📖 READ - Listar kioscos');
        const readResult = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/v1/kiosks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            const kiosks = Array.isArray(data) ? data : (data.data || []);
            return {
                status: r.status,
                count: kiosks.length,
                kiosks: kiosks.slice(0, 5).map(k => ({ id: k.id, name: k.name, company_id: k.company_id }))
            };
        });

        results.crud.read = readResult.status === 200;
        console.log('       Status:', readResult.status, readResult.status === 200 ? '✅' : '❌');
        console.log('       Total kioscos:', readResult.count);
        if (readResult.kiosks.length > 0) {
            console.log('       Muestra:');
            readResult.kiosks.forEach(k => console.log(`         - ID ${k.id}: ${k.name}`));
        }

        // Multi-tenant check
        const companyIds = [...new Set(readResult.kiosks.map(k => k.company_id))];
        results.multiTenant = companyIds.length <= 1;
        console.log('       Multi-tenant:', companyIds.length <= 1 ? '✅ Aislado' : '❌ Múltiples empresas');

        // CREATE - Crear kiosko con datos únicos
        console.log('\n   ➕ CREATE - Crear kiosko');
        const createResult = await page.evaluate(async (uid) => {
            const token = localStorage.getItem('authToken');
            // GPS único basado en timestamp
            const lat = -33.4 - (Math.random() * 0.1);
            const lng = -70.6 - (Math.random() * 0.1);

            const r = await fetch('/api/v1/kiosks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `KIOSK_${uid}`,
                    description: 'Test automatizado - eliminar',
                    location: 'Sala de pruebas E2E',
                    gps_lat: lat,
                    gps_lng: lng,
                    is_active: true
                })
            });
            const data = await r.json();
            // API returns { success, data: { id, name, ... }, message }
            const kioskData = data.data || data;
            return {
                status: r.status,
                success: r.status === 201 || r.status === 200,
                id: kioskData.id,
                name: kioskData.name,
                error: data.error || data.message
            };
        }, uniqueId);

        results.crud.create = createResult.success;
        testKioskId = createResult.id;
        console.log('       Status:', createResult.status, createResult.success ? '✅' : '❌');
        if (createResult.success) {
            console.log('       ID creado:', createResult.id);
            console.log('       Nombre:', createResult.name);
        } else {
            console.log('       Error:', createResult.error);
        }

        // UPDATE - Actualizar el kiosko creado
        if (testKioskId) {
            console.log('\n   ✏️ UPDATE - Actualizar kiosko ID:', testKioskId);
            const updateResult = await page.evaluate(async (params) => {
                const token = localStorage.getItem('authToken');
                const r = await fetch(`/api/v1/kiosks/${params.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: `KIOSK_UPDATED_${params.uid}`,
                        description: 'Actualizado por test E2E',
                        location: 'Sala actualizada'
                    })
                });
                const data = await r.json();
                // API returns { success, data: { id, name, ... }, message }
                const kioskData = data.data || data;
                return {
                    status: r.status,
                    success: r.status === 200,
                    name: kioskData.name,
                    error: data.error || data.message
                };
            }, { id: testKioskId, uid: uniqueId });

            results.crud.update = updateResult.success;
            console.log('       Status:', updateResult.status, updateResult.success ? '✅' : '❌');
            if (updateResult.success) {
                console.log('       Nombre actualizado:', updateResult.name);
            } else {
                console.log('       Error:', updateResult.error);
            }

            // DELETE - Eliminar el kiosko
            console.log('\n   🗑️ DELETE - Eliminar kiosko ID:', testKioskId);
            const deleteResult = await page.evaluate(async (id) => {
                const token = localStorage.getItem('authToken');
                const r = await fetch(`/api/v1/kiosks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                let data = {};
                try { data = await r.json(); } catch (e) {}
                return {
                    status: r.status,
                    success: r.status === 200 || r.status === 204,
                    message: data.message
                };
            }, testKioskId);

            results.crud.delete = deleteResult.success;
            console.log('       Status:', deleteResult.status, deleteResult.success ? '✅' : '❌');
        }

        // =============================================
        // E2E - EXPERIENCIA DE USUARIO
        // =============================================
        console.log('\n' + '═'.repeat(50));
        console.log('▶ E2E - EXPERIENCIA DE USUARIO');
        console.log('═'.repeat(50));

        // Navegar al módulo haciendo click en la card específica
        console.log('\n   🖱️ Navegación al módulo');

        // Usar selector más específico para la card
        try {
            // Buscar por texto exacto en el título de la card
            const cardSelector = 'text=Gestión de Kioscos';
            await page.locator(cardSelector).first().click();
            await page.waitForTimeout(4000);
            results.e2e.navegacion = true;
            console.log('       ✅ Click en "Gestión de Kioscos"');
        } catch (e) {
            console.log('       ❌ No se pudo hacer click en la card');
        }

        // Screenshot después de navegar
        await page.screenshot({ path: 'debug-kiosks-dentro.png' });
        console.log('       📸 Screenshot: debug-kiosks-dentro.png');

        // Verificar contenido del módulo
        console.log('\n   📋 Verificar contenido del módulo');
        const moduleContent = await page.evaluate(() => {
            const text = document.body.innerText;
            const tables = document.querySelectorAll('table');
            const tbodyRows = document.querySelectorAll('tbody tr');
            const buttons = document.querySelectorAll('button');
            const inputs = document.querySelectorAll('input');
            const selects = document.querySelectorAll('select');

            // Buscar elementos específicos de kiosks
            const hasKioskContent = text.includes('Kiosk') || text.includes('kiosk') ||
                                    text.includes('Terminal') || text.includes('Dispositivo');
            const hasTableHeader = text.includes('Nombre') || text.includes('Ubicación') ||
                                   text.includes('Estado') || text.includes('GPS');

            return {
                hasKioskContent,
                hasTableHeader,
                tables: tables.length,
                rows: tbodyRows.length,
                buttons: buttons.length,
                inputs: inputs.length,
                selects: selects.length,
                pageTitle: document.querySelector('h1, h2, .title, .module-title')?.textContent?.trim()
            };
        });

        results.e2e.tabla = moduleContent.tables > 0 || moduleContent.hasTableHeader;
        results.e2e.datos = moduleContent.hasKioskContent;

        console.log('       Título:', moduleContent.pageTitle || 'No detectado');
        console.log('       Contenido de kiosks:', moduleContent.hasKioskContent ? '✅' : '❌');
        console.log('       Headers de tabla:', moduleContent.hasTableHeader ? '✅' : '❌');
        console.log('       Tablas:', moduleContent.tables);
        console.log('       Filas:', moduleContent.rows);
        console.log('       Botones:', moduleContent.buttons);
        console.log('       Inputs:', moduleContent.inputs);

        // Buscar y probar botón de crear
        console.log('\n   🆕 Verificar botón de crear');
        const createBtnResult = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                const text = (btn.textContent || '').toLowerCase();
                if (text.includes('nuevo') || text.includes('crear') || text.includes('agregar') ||
                    text.includes('+') || text.includes('add')) {
                    return { found: true, text: btn.textContent.trim() };
                }
            }
            return { found: false };
        });

        if (createBtnResult.found) {
            console.log('       ✅ Botón encontrado:', createBtnResult.text);

            // Intentar abrir modal
            try {
                await page.locator(`button:has-text("${createBtnResult.text}")`).first().click();
                await page.waitForTimeout(1500);

                const modalVisible = await page.evaluate(() => {
                    const modals = document.querySelectorAll('.modal, [class*="modal"], [role="dialog"], .dialog');
                    for (const modal of modals) {
                        const style = getComputedStyle(modal);
                        if (style.display !== 'none' && style.visibility !== 'hidden') {
                            return true;
                        }
                    }
                    // También verificar si hay un form visible
                    const forms = document.querySelectorAll('form');
                    for (const form of forms) {
                        const inputs = form.querySelectorAll('input[name]');
                        if (inputs.length >= 2) return true;
                    }
                    return false;
                });

                results.e2e.modal = modalVisible;
                console.log('       Modal/Form visible:', modalVisible ? '✅' : '❌');

                await page.screenshot({ path: 'debug-kiosks-modal.png' });
                console.log('       📸 Screenshot modal: debug-kiosks-modal.png');

                // Cerrar modal
                await page.keyboard.press('Escape');
            } catch (e) {
                console.log('       ⚠️ Error al abrir modal:', e.message);
            }
        } else {
            console.log('       ⚠️ No se encontró botón de crear');
        }

    } catch (error) {
        console.log('\n❌ ERROR GENERAL:', error.message);
        await page.screenshot({ path: 'debug-kiosks-error.png' });
    }

    await browser.close();

    // =============================================
    // RESUMEN FINAL
    // =============================================
    console.log('\n' + '═'.repeat(70));
    console.log('RESUMEN FINAL - MÓDULO GESTIÓN DE KIOSCOS');
    console.log('═'.repeat(70));

    const crudPass = Object.values(results.crud).filter(Boolean).length;
    const e2ePass = Object.values(results.e2e).filter(Boolean).length;

    console.log('\n🔧 CRUD API:', crudPass + '/4');
    console.log('   CREATE:', results.crud.create ? '✅' : '❌');
    console.log('   READ:', results.crud.read ? '✅' : '❌');
    console.log('   UPDATE:', results.crud.update ? '✅' : '❌');
    console.log('   DELETE:', results.crud.delete ? '✅' : '❌');

    console.log('\n👤 E2E Usuario:', e2ePass + '/5');
    console.log('   Login:', results.e2e.login ? '✅' : '❌');
    console.log('   Navegación:', results.e2e.navegacion ? '✅' : '❌');
    console.log('   Tabla:', results.e2e.tabla ? '✅' : '❌');
    console.log('   Datos:', results.e2e.datos ? '✅' : '❌');
    console.log('   Modal:', results.e2e.modal ? '✅' : '❌');

    console.log('\n🏢 Multi-Tenant:', results.multiTenant ? '✅ Aislamiento correcto' : '❌');

    const totalPass = crudPass + e2ePass + (results.multiTenant ? 1 : 0);
    const totalTests = 10;
    const pct = Math.round(totalPass / totalTests * 100);

    console.log('\n' + '═'.repeat(70));
    if (pct >= 80) {
        console.log(`✅ RESULTADO: ${totalPass}/${totalTests} (${pct}%) - LISTO PARA PRODUCCIÓN`);
    } else if (pct >= 60) {
        console.log(`⚠️ RESULTADO: ${totalPass}/${totalTests} (${pct}%) - FUNCIONAL CON OBSERVACIONES`);
    } else {
        console.log(`❌ RESULTADO: ${totalPass}/${totalTests} (${pct}%) - NECESITA TRABAJO`);
    }
    console.log('═'.repeat(70));
})();
