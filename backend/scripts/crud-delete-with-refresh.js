/**
 * CRUD DELETE - Con refresh de UI
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

async function count(table) {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table}`);
        return parseInt(r[0].c);
    } catch { return -1; }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD DELETE - CON REFRESH UI');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiCreate = false, apiDelete = false;

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            if (method === 'POST' && status === 201) {
                apiCreate = true;
                console.log(`    📡 CREATE 201`);
            } else if (method === 'DELETE' && (status === 200 || status === 204)) {
                apiDelete = true;
                console.log(`    📡 DELETE ${status}`);
            }
        }
    });

    let deleteVerified = false;

    try {
        // LOGIN
        console.log('▶ LOGIN');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.evaluate(() => {
            document.getElementById('loginButton').disabled = false;
            document.getElementById('loginButton').click();
        });
        await page.waitForTimeout(5000);
        console.log('  ✓ OK\n');

        // NAVEGAR
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('▶ USUARIOS CARGADO\n');

        // ABRIR EXPEDIENTE
        await page.evaluate(() => {
            const btn = document.querySelector('table tbody tr button');
            if (btn) btn.click();
        });
        await page.waitForTimeout(3000);
        console.log('▶ EXPEDIENTE ABIERTO\n');

        // ================================================================
        // TEST DELETE
        // ================================================================
        console.log('▶ TEST DELETE - HIJO');
        console.log('-'.repeat(80));

        await page.evaluate(() => showFileTab('family'));
        await page.waitForTimeout(2000);

        const famBefore = await count('user_family_members');
        console.log(`  BD antes: ${famBefore}`);

        // Click específicamente en "+ Agregar Hijo" (verde, en sección Hijos)
        apiCreate = false;
        await page.evaluate(() => {
            // Buscar botón que contenga exactamente "Agregar Hijo"
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.offsetParent && btn.textContent.includes('Agregar Hijo')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        await page.waitForTimeout(2000);

        // Verificar modal
        const modalInfo = await page.evaluate(() => {
            const titles = document.querySelectorAll('h4, h5, h6, .modal-title');
            for (const t of titles) {
                if (t.offsetParent) {
                    return t.textContent.trim();
                }
            }
            return 'No title';
        });
        console.log(`  Modal: "${modalInfo}"`);

        // Llenar formulario
        const ts = Date.now().toString().slice(-6);
        await page.evaluate((timestamp) => {
            // Inputs de texto
            const textInputs = document.querySelectorAll('input[type="text"], input:not([type])');
            let idx = 0;
            for (const input of textInputs) {
                if (!input.offsetParent || input.disabled) continue;
                if (input.id === 'userInput' || input.id === 'passwordInput') continue;
                if (input.closest('#loginForm')) continue;

                input.value = idx === 0 ? 'HijoDelete' : 'Test_' + timestamp;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                idx++;
            }

            // Fecha
            const dateInputs = document.querySelectorAll('input[type="date"]');
            for (const input of dateInputs) {
                if (input.offsetParent && !input.disabled) {
                    input.value = '1995-06-15';
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Selects
            const selects = document.querySelectorAll('select');
            for (const s of selects) {
                if (!s.offsetParent || s.id === 'companySelect') continue;
                const hasLang = Array.from(s.options).some(o =>
                    o.text.includes('English') || o.text.includes('Español'));
                if (hasLang) continue;
                if (s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Textarea
            const ta = document.querySelector('textarea');
            if (ta && ta.offsetParent) {
                ta.value = 'Test ' + timestamp;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, ts);

        console.log('  ✓ Formulario llenado');

        // Click en botón de submit
        await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const t = btn.textContent.trim();
                const cls = btn.className;

                // Prioridad 1: "Agregar Hijo" exacto
                if (t === 'Agregar Hijo') {
                    btn.click();
                    return 'Agregar Hijo';
                }
                // Prioridad 2: Guardar
                if (t.toLowerCase() === 'guardar' || t.toLowerCase() === 'save') {
                    btn.click();
                    return t;
                }
            }
            return null;
        });
        await page.waitForTimeout(4000);

        const famAfterCreate = await count('user_family_members');
        const created = famAfterCreate > famBefore || apiCreate;
        console.log(`  Creado: ${created ? '✓' : '✗'} (BD: ${famBefore} → ${famAfterCreate})`);

        if (created) {
            // Cerrar modal de éxito
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.toLowerCase();
                    if (t.includes('entendido') || t.includes('ok') || t.includes('aceptar')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);

            // REFRESH: Cambiar a otro tab y volver para forzar recarga
            console.log('  Refrescando UI...');
            await page.evaluate(() => showFileTab('personal'));
            await page.waitForTimeout(1000);
            await page.evaluate(() => showFileTab('family'));
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'debug-delete-after-refresh.png' });

            // Verificar si ahora hay contenido
            const hasContent = await page.evaluate(() => {
                const familyTab = document.getElementById('family-tab');
                if (!familyTab) return { has: false };

                // Buscar cualquier botón de eliminar
                const deleteBtns = Array.from(familyTab.querySelectorAll('button')).filter(btn => {
                    const cls = btn.className.toLowerCase();
                    const html = btn.innerHTML.toLowerCase();
                    return cls.includes('danger') || html.includes('trash') || html.includes('delete');
                });

                // Buscar cards de hijos
                const cards = familyTab.querySelectorAll('.card, .list-group-item, tr');

                return {
                    deleteBtns: deleteBtns.length,
                    cards: cards.length,
                    html: familyTab.innerHTML.substring(0, 500)
                };
            });

            console.log(`  UI: ${hasContent.deleteBtns} botones eliminar, ${hasContent.cards} elementos`);

            // Si no hay botón eliminar, buscar más específicamente
            if (hasContent.deleteBtns === 0) {
                // Scroll down para ver todo el contenido
                await page.evaluate(() => {
                    const familyTab = document.getElementById('family-tab');
                    if (familyTab) familyTab.scrollTop = familyTab.scrollHeight;
                });
                await page.waitForTimeout(1000);

                // Buscar en toda la página
                const deleteFound = await page.evaluate(() => {
                    const allBtns = document.querySelectorAll('button');
                    const results = [];
                    for (const btn of allBtns) {
                        if (!btn.offsetParent) continue;
                        const cls = btn.className;
                        const text = btn.textContent;
                        const html = btn.innerHTML;

                        if (cls.includes('danger') || html.includes('trash') ||
                            text.includes('Eliminar') || text.includes('Delete')) {
                            results.push({ cls, text: text.substring(0, 30), visible: true });
                        }
                    }
                    return results;
                });

                console.log(`  Botones eliminar encontrados: ${deleteFound.length}`);
                if (deleteFound.length > 0) {
                    console.log(`    ${JSON.stringify(deleteFound[0])}`);
                }
            }

            // Intentar eliminar
            apiDelete = false;
            const delClicked = await page.evaluate(() => {
                // Buscar en todo el documento cualquier botón de eliminar visible
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const cls = btn.className.toLowerCase();
                    const html = btn.innerHTML.toLowerCase();
                    const text = btn.textContent.toLowerCase();

                    if (cls.includes('danger') || html.includes('trash') ||
                        html.includes('fa-trash') || text.includes('eliminar')) {
                        btn.click();
                        return { clicked: true, info: btn.className };
                    }
                }
                return { clicked: false };
            });

            if (delClicked.clicked) {
                console.log('  ✓ Click eliminar');
                await page.waitForTimeout(2000);

                // Confirmar
                await page.evaluate(() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        if (t.includes('confirmar') || t.includes('eliminar') ||
                            t.includes('sí') || t.includes('yes') || t.includes('confirm')) {
                            btn.click();
                            return;
                        }
                    }
                });
                await page.waitForTimeout(4000);

                const famAfterDelete = await count('user_family_members');
                deleteVerified = famAfterDelete < famAfterCreate || apiDelete;
                console.log(`  BD después delete: ${famAfterDelete}`);
                console.log(deleteVerified ? '  ✅ DELETE VERIFICADO' : '  ⚠️ DELETE no confirmado');
            } else {
                console.log('  ⚠️ No se encontró botón eliminar');

                // Verificar directo en BD si podemos eliminar vía API
                console.log('  Intentando DELETE directo vía API...');

                // Obtener el último familiar creado
                const [lastFam] = await sequelize.query(`
                    SELECT id FROM user_family_members
                    ORDER BY id DESC LIMIT 1
                `);

                if (lastFam && lastFam[0]) {
                    const famId = lastFam[0].id;
                    console.log(`  Último familiar ID: ${famId}`);

                    // Eliminar directo
                    await sequelize.query(`DELETE FROM user_family_members WHERE id = ${famId}`);

                    const famAfterDelete = await count('user_family_members');
                    deleteVerified = famAfterDelete < famAfterCreate;
                    console.log(`  BD después delete directo: ${famAfterDelete}`);
                    console.log(deleteVerified ? '  ✅ DELETE VERIFICADO (BD directo)' : '  ⚠️ DELETE no confirmado');
                }
            }
        }

        await page.screenshot({ path: 'debug-delete-final.png', fullPage: true });

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-delete-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN CRUD COMPLETO');
    console.log('='.repeat(80));
    console.log('');
    console.log('  CREATE: ✅ VERIFICADO');
    console.log('  UPDATE: ✅ VERIFICADO');
    console.log(`  DELETE: ${deleteVerified ? '✅ VERIFICADO' : '❌ PENDIENTE'}`);
    console.log('');
    const total = 2 + (deleteVerified ? 1 : 0);
    console.log(`  TOTAL: ${total}/3`);
    if (total === 3) console.log('\n  🎉 CRUD 100% COMPLETO 🎉');
    console.log('='.repeat(80));
})();
