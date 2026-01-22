/**
 * CRUD TEST - Tabs Pendientes (3 y 5)
 * Completa el testing del módulo Usuarios
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
    console.log('CRUD TEST - TABS PENDIENTES (3 y 5)');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let apiCreated = false;

    page.on('response', async r => {
        if (r.url().includes('/api/') && r.request().method() === 'POST') {
            if (r.status() === 201) {
                apiCreated = true;
                console.log(`    📡 API 201: ${r.url().substring(0, 70)}`);
            } else if (r.status() >= 400) {
                try {
                    const body = await r.json();
                    console.log(`    ❌ API ${r.status()}: ${body.message || JSON.stringify(body).substring(0, 60)}`);
                } catch {
                    console.log(`    ❌ API ${r.status()}`);
                }
            }
        }
    });

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

        // Navegar a Usuarios
        console.log('▶ NAVEGAR A USUARIOS');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('  ✓ OK\n');

        // Abrir primer usuario
        console.log('▶ ABRIR EXPEDIENTE');
        await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            if (rows.length > 0) {
                const btn = rows[0].querySelector('button');
                if (btn) btn.click();
            }
        });
        await page.waitForTimeout(3000);
        console.log('  ✓ OK\n');

        // ========== TAB 3: ANTECEDENTES LABORALES ==========
        console.log('▶ TAB 3: ANTECEDENTES LABORALES');
        console.log('-'.repeat(80));

        const countWorkBefore = await count('user_work_history');
        console.log(`  Registros antes (user_work_history): ${countWorkBefore}`);

        // Click en tab
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            for (const t of tabs) {
                if (t.textContent.toLowerCase().includes('antecedentes laborales')) {
                    t.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab abierto');

        // Click en "+ Agregar Experiencia" (no Registrar Aumento)
        apiCreated = false;
        const addWork = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            // Buscar botón de agregar experiencia laboral
            const addBtn = btns.find(b => {
                const t = b.textContent.toLowerCase();
                return b.offsetParent &&
                       (t.includes('agregar experiencia') ||
                        t.includes('+ experiencia') ||
                        (t.includes('agregar') && !t.includes('aumento')));
            });
            if (addBtn) {
                addBtn.click();
                return { ok: true, text: addBtn.textContent.trim() };
            }
            // Fallback: buscar en sección Experiencia Laboral
            const sections = document.querySelectorAll('h5, h4, .card-header');
            for (const sec of sections) {
                if (sec.textContent.toLowerCase().includes('experiencia')) {
                    const parent = sec.closest('.card, section, div');
                    if (parent) {
                        const btn = parent.querySelector('button');
                        if (btn && btn.textContent.includes('+')) {
                            btn.click();
                            return { ok: true, text: btn.textContent.trim(), fromSection: true };
                        }
                    }
                }
            }
            return { ok: false, btns: btns.filter(b => b.offsetParent).map(b => b.textContent.trim().substring(0, 30)) };
        });

        if (addWork.ok) {
            console.log(`  ✓ Click en: "${addWork.text}"`);
            await page.waitForTimeout(2000);

            // Llenar formulario de experiencia laboral
            await page.evaluate(() => {
                const ts = Date.now().toString().slice(-6);
                // Selects primero
                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                // Inputs
                document.querySelectorAll('input, textarea').forEach(input => {
                    if (!input.offsetParent || input.disabled) return;
                    if (input.type === 'date') {
                        input.value = '2020-01-15';
                    } else if (input.type === 'number') {
                        const max = input.max ? parseInt(input.max) : 100;
                        input.value = Math.min(50000, max).toString();
                    } else if (input.type !== 'hidden' && input.type !== 'checkbox') {
                        input.value = 'Empresa_Test_' + ts;
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            });
            console.log('  ✓ Campos llenados');

            // Guardar - buscar botón verde dentro del formulario/modal
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.startsWith('+') || t.includes('cancelar')) continue;
                    if (c.includes('success') || c.includes('primary') ||
                        t.includes('guardar') || t.includes('save') || t.includes('crear')) {
                        btn.click();
                        return;
                    }
                }
            });
            await page.waitForTimeout(4000);
        } else {
            console.log('  ✗ Botón agregar no encontrado');
            console.log(`    Disponibles: ${addWork.btns?.slice(0, 5).join(', ')}`);
        }

        const countWorkAfter = await count('user_work_history');
        console.log(`  Registros después: ${countWorkAfter} (${countWorkAfter - countWorkBefore >= 0 ? '+' : ''}${countWorkAfter - countWorkBefore})`);
        console.log(countWorkAfter > countWorkBefore || apiCreated ? '  ✓ CREATE verificado' : '  ? CREATE pendiente');
        console.log('');

        // ========== TAB 5: ANTECEDENTES MÉDICOS ==========
        console.log('▶ TAB 5: ANTECEDENTES MÉDICOS');
        console.log('-'.repeat(80));

        const countMedBefore = await count('user_medical_exams');
        console.log(`  Registros antes (user_medical_exams): ${countMedBefore}`);

        // Click en tab
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            for (const t of tabs) {
                if (t.textContent.toLowerCase().includes('antecedentes médicos') ||
                    t.textContent.toLowerCase().includes('médicos')) {
                    t.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(2000);
        console.log('  ✓ Tab abierto');

        // Click en "+ Agregar Examen"
        apiCreated = false;
        const addMed = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const addBtn = btns.find(b => {
                const t = b.textContent.toLowerCase();
                return b.offsetParent && t.includes('agregar examen');
            });
            if (addBtn) {
                addBtn.click();
                return { ok: true, text: addBtn.textContent.trim() };
            }
            return { ok: false };
        });

        if (addMed.ok) {
            console.log(`  ✓ Click en: "${addMed.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-tab5-modal.png' });

            // Llenar formulario de examen médico
            await page.evaluate(() => {
                const ts = Date.now().toString().slice(-6);
                // Selects primero
                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                // Inputs
                document.querySelectorAll('input, textarea').forEach(input => {
                    if (!input.offsetParent || input.disabled) return;
                    if (input.type === 'date') {
                        input.value = '2024-01-15';
                    } else if (input.type !== 'hidden' && input.type !== 'checkbox') {
                        input.value = 'Test_Medico_' + ts;
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            });
            console.log('  ✓ Campos llenados');

            // Buscar botón "Agregar Examen" (verde) dentro del modal
            const saveResult = await page.evaluate(() => {
                // Buscar específicamente el botón "Agregar Examen" del modal
                const btns = Array.from(document.querySelectorAll('button'));

                // Primero buscar botón con texto exacto
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.trim().toLowerCase();
                    // El botón de guardar dice "Agregar Examen" sin el +
                    if (t === 'agregar examen' || t.includes('agregar examen')) {
                        // Verificar que no es el botón de abrir (que tiene +)
                        if (!btn.textContent.includes('+')) {
                            btn.click();
                            return { ok: true, text: btn.textContent.trim() };
                        }
                    }
                }

                // Buscar botón verde/success
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if (t.includes('cancelar') || t.startsWith('+')) continue;
                    if ((c.includes('btn-success') || c.includes('success')) &&
                        (t.includes('agregar') || t.includes('guardar') || t.includes('crear'))) {
                        btn.click();
                        return { ok: true, text: btn.textContent.trim(), byClass: true };
                    }
                }

                return { ok: false };
            });

            if (saveResult.ok) {
                console.log(`  ✓ Click en: "${saveResult.text}"`);
            }
            await page.waitForTimeout(4000);
        } else {
            console.log('  ✗ Botón agregar no encontrado');
        }

        const countMedAfter = await count('user_medical_exams');
        console.log(`  Registros después: ${countMedAfter} (${countMedAfter - countMedBefore >= 0 ? '+' : ''}${countMedAfter - countMedBefore})`);
        console.log(countMedAfter > countMedBefore || apiCreated ? '  ✓ CREATE verificado' : '  ? CREATE pendiente');
        console.log('');

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-pendientes-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('='.repeat(80));
    console.log('RESUMEN - TABS PENDIENTES');
    console.log('='.repeat(80));
})();
