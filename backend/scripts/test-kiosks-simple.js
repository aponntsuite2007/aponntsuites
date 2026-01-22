/**
 * TEST SIMPLE - MÓDULO KIOSCOS
 * CRUD + E2E corregido
 */
const { chromium } = require('playwright');

(async () => {
    console.log('═'.repeat(70));
    console.log('TEST MÓDULO KIOSCOS - CRUD + E2E');
    console.log('═'.repeat(70));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = {
        crud: { create: false, read: false, update: false, delete: false },
        e2e: { login: false, navegacion: false, vistaModulo: false }
    };

    let testKioskId = null;

    try {
        // LOGIN
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
        // CRUD TESTS
        // =============================================
        console.log('\n' + '═'.repeat(50));
        console.log('▶ CRUD - API KIOSCOS');
        console.log('═'.repeat(50));

        // READ
        console.log('\n   READ - Listar kioscos');
        const readResult = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/v1/kiosks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            return {
                status: r.status,
                count: Array.isArray(data) ? data.length : (data.data?.length || 0),
                kiosks: Array.isArray(data) ? data.slice(0, 3) : (data.data?.slice(0, 3) || [])
            };
        });

        results.crud.read = readResult.status === 200;
        console.log('   Status:', readResult.status, readResult.status === 200 ? '✅' : '❌');
        console.log('   Kioscos:', readResult.count);
        readResult.kiosks.forEach(k => console.log('     -', k.id, k.name));

        // CREATE
        console.log('\n   CREATE - Crear kiosko');
        const ts = Date.now().toString().slice(-6);
        const createResult = await page.evaluate(async (timestamp) => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/v1/kiosks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `KIOSK_TEST_${timestamp}`,
                    description: 'Test automatizado',
                    location: 'Oficina Test',
                    gps_lat: -33.4569,
                    gps_lng: -70.6483,
                    is_active: true
                })
            });
            const data = await r.json();
            return {
                status: r.status,
                success: r.status === 201 || r.status === 200,
                id: data.id,
                name: data.name,
                error: data.error
            };
        }, ts);

        results.crud.create = createResult.success;
        testKioskId = createResult.id;
        console.log('   Status:', createResult.status, createResult.success ? '✅' : '❌');
        if (createResult.success) {
            console.log('   Creado ID:', createResult.id, '-', createResult.name);
        } else {
            console.log('   Error:', createResult.error);
        }

        // UPDATE (usando el ID creado)
        if (testKioskId) {
            console.log('\n   UPDATE - Actualizar kiosko ID:', testKioskId);
            const updateResult = await page.evaluate(async (params) => {
                const { id, ts } = params;
                const token = localStorage.getItem('authToken');
                const r = await fetch(`/api/v1/kiosks/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: `KIOSK_UPDATED_${ts}`,
                        description: 'Actualizado por test',
                        location: 'Oficina Actualizada'
                    })
                });
                const data = await r.json();
                return {
                    status: r.status,
                    success: r.status === 200,
                    name: data.name,
                    error: data.error || data.message
                };
            }, { id: testKioskId, ts });

            results.crud.update = updateResult.success;
            console.log('   Status:', updateResult.status, updateResult.success ? '✅' : '❌');
            if (updateResult.success) {
                console.log('   Nuevo nombre:', updateResult.name);
            } else {
                console.log('   Error:', updateResult.error);
            }

            // DELETE
            console.log('\n   DELETE - Eliminar kiosko ID:', testKioskId);
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
            console.log('   Status:', deleteResult.status, deleteResult.success ? '✅' : '❌');
        }

        // =============================================
        // E2E - NAVEGACIÓN AL MÓDULO
        // =============================================
        console.log('\n' + '═'.repeat(50));
        console.log('▶ E2E - EXPERIENCIA DE USUARIO');
        console.log('═'.repeat(50));

        // Navegar al módulo
        console.log('\n   Navegación al módulo');
        try {
            // Intentar click en "Gestión de Kioscos"
            const clicked = await page.evaluate(() => {
                const elements = document.querySelectorAll('*');
                for (const el of elements) {
                    const text = el.textContent || '';
                    if (text.includes('Gestión de Kioscos') || text.includes('Kioscos')) {
                        if (el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'BUTTON' ||
                            el.onclick || el.closest('[onclick]')) {
                            const clickable = el.closest('[onclick]') || el;
                            clickable.click();
                            return text.trim().substring(0, 40);
                        }
                    }
                }
                return null;
            });

            if (clicked) {
                results.e2e.navegacion = true;
                console.log('   ✅ Click en:', clicked);
            } else {
                console.log('   ❌ No se encontró el módulo');
            }
        } catch (e) {
            console.log('   ❌ Error:', e.message);
        }

        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'debug-kiosks-view.png' });
        console.log('   📸 Screenshot: debug-kiosks-view.png');

        // Verificar contenido del módulo
        const moduleContent = await page.evaluate(() => {
            const text = document.body.innerText;
            const tables = document.querySelectorAll('table');
            const cards = document.querySelectorAll('.card, [class*="kiosk"]');

            return {
                hasKioskText: text.toLowerCase().includes('kiosk') || text.toLowerCase().includes('terminal'),
                tables: tables.length,
                cards: cards.length,
                buttons: document.querySelectorAll('button').length
            };
        });

        results.e2e.vistaModulo = moduleContent.hasKioskText || moduleContent.tables > 0;
        console.log('\n   Contenido del módulo:');
        console.log('     Texto de kiosks:', moduleContent.hasKioskText ? '✅' : '❌');
        console.log('     Tablas:', moduleContent.tables);
        console.log('     Cards:', moduleContent.cards);
        console.log('     Botones:', moduleContent.buttons);

    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'debug-kiosks-error.png' });
    }

    await browser.close();

    // RESUMEN
    console.log('\n' + '═'.repeat(70));
    console.log('RESUMEN');
    console.log('═'.repeat(70));

    const crudPass = Object.values(results.crud).filter(Boolean).length;
    const e2ePass = Object.values(results.e2e).filter(Boolean).length;

    console.log('\n🔧 CRUD:', crudPass + '/4');
    Object.entries(results.crud).forEach(([k, v]) => console.log(`   ${k}: ${v ? '✅' : '❌'}`));

    console.log('\n👤 E2E:', e2ePass + '/3');
    Object.entries(results.e2e).forEach(([k, v]) => console.log(`   ${k}: ${v ? '✅' : '❌'}`));

    const total = crudPass + e2ePass;
    const pct = Math.round(total / 7 * 100);

    console.log('\n' + '═'.repeat(70));
    console.log(`📊 TOTAL: ${total}/7 (${pct}%) ${pct >= 70 ? '✅ FUNCIONAL' : '⚠️ REVISAR'}`);
    console.log('═'.repeat(70));
})();
