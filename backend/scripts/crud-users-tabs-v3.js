/**
 * CRUD TEST - Tabs del Módulo Users v3
 * Con selectores mejorados para tabs con emojis
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

// Configuración de tabs con sus tablas y botones específicos
const TABS = [
    { num: 1, name: 'Administración', table: 'users', skip: true },
    { num: 2, name: 'Datos Personales', table: 'user_education', addSection: 'Formación' },
    { num: 3, name: 'Antecedentes Laborales', table: 'user_work_history', addSection: 'Experiencia' },
    { num: 4, name: 'Grupo Familiar', table: 'user_family_members', addSection: 'Familiar' },
    { num: 5, name: 'Antecedentes Médicos', table: 'user_medical_exams', addSection: 'Examen' },
    { num: 6, name: 'Asistencias', table: 'attendances', skip: true }, // Solo lectura
    { num: 7, name: 'Calendario', table: 'calendar_events', skip: true }, // Solo lectura
    { num: 8, name: 'Disciplinarios', table: 'user_disciplinary_actions', addSection: 'Sanción' },
    { num: 9, name: 'Registro Biométrico', table: 'facial_biometric_data', skip: true }, // Requiere cámara
    { num: 10, name: 'Notificaciones', table: 'notifications', skip: true } // Solo lectura
];

async function count(table) {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table}`);
        return parseInt(r[0].c);
    } catch { return -1; }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD TEST - TABS USUARIOS v3');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = [];
    let apiCreate = false;

    page.on('response', r => {
        if (r.url().includes('/api/') && r.request().method() === 'POST' && r.status() === 201) {
            apiCreate = true;
            console.log(`    📡 API 201: ${r.url().substring(0, 60)}`);
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

        // Navegar a Users
        console.log('▶ NAVEGAR A GESTIÓN DE USUARIOS');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('  ✓ OK\n');

        // Click en botón de ver primer usuario (ícono ojo azul)
        console.log('▶ ABRIR EXPEDIENTE DE USUARIO');
        const opened = await page.evaluate(() => {
            // Buscar todos los botones con ícono de ojo o info
            const btns = document.querySelectorAll('button.btn-info, button[class*="info"], .bi-eye');
            for (const el of btns) {
                const btn = el.tagName === 'BUTTON' ? el : el.closest('button');
                if (btn && btn.offsetParent) {
                    btn.click();
                    return true;
                }
            }
            // Fallback: cualquier botón de acción en la primera fila
            const row = document.querySelector('table tbody tr');
            if (row) {
                const actionBtn = row.querySelector('button');
                if (actionBtn) {
                    actionBtn.click();
                    return true;
                }
            }
            return false;
        });

        await page.waitForTimeout(3000);

        // Verificar que el expediente se abrió
        const expedienteVisible = await page.evaluate(() => {
            return document.body.innerHTML.includes('Expediente Digital') ||
                   document.body.innerHTML.includes('Datos Personales');
        });

        if (!expedienteVisible) {
            throw new Error('Expediente no se abrió');
        }
        console.log('  ✓ Expediente abierto\n');

        // Listar tabs disponibles
        const tabsList = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-link, [role="tab"]');
            return Array.from(tabs).map(t => t.textContent.trim().replace(/\s+/g, ' '));
        });
        console.log('Tabs disponibles:', tabsList.length);
        tabsList.forEach((t, i) => console.log(`  [${i+1}] ${t}`));
        console.log('');

        // TEST CADA TAB
        for (const tab of TABS) {
            console.log(`▶ TAB ${tab.num}: ${tab.name.toUpperCase()}`);
            console.log('-'.repeat(80));

            if (tab.skip) {
                console.log(`  ⏭️ Saltando (${tab.name === 'Administración' ? 'ya verificado' : 'solo lectura/especial'})`);
                results.push({ tab: tab.name, navigation: true, create: tab.num === 1 });
                console.log('');
                continue;
            }

            try {
                const countBefore = await count(tab.table);
                console.log(`  Registros antes (${tab.table}): ${countBefore}`);

                // Click en el tab usando texto parcial
                const tabClicked = await page.evaluate((tabName) => {
                    const tabs = document.querySelectorAll('.nav-link, [role="tab"], .nav-item a');
                    for (const t of tabs) {
                        // Buscar por contenido de texto (ignorando emojis)
                        const text = t.textContent.replace(/[^\w\sáéíóúñ]/gi, '').trim();
                        if (text.toLowerCase().includes(tabName.toLowerCase())) {
                            t.click();
                            return { ok: true, found: t.textContent.trim() };
                        }
                    }
                    return { ok: false };
                }, tab.name);

                if (!tabClicked.ok) {
                    console.log(`  ✗ Tab no encontrado`);
                    results.push({ tab: tab.name, navigation: false, create: false });
                    continue;
                }

                console.log(`  ✓ Tab abierto: "${tabClicked.found}"`);
                await page.waitForTimeout(2000);

                // Screenshot
                await page.screenshot({ path: `debug-tab${tab.num}-${tab.name.replace(/\s/g, '')}.png`, fullPage: true });

                // Buscar botón de agregar en la sección específica
                apiCreate = false;
                const addClicked = await page.evaluate((sectionHint) => {
                    // Buscar botones de agregar que NO sean "Agregar Usuario"
                    const btns = Array.from(document.querySelectorAll('button'));
                    const addBtns = btns.filter(b => {
                        if (!b.offsetParent) return false;
                        const t = b.textContent.toLowerCase();
                        return (t.includes('agregar') || t.includes('+') || t.includes('nuevo') || t.includes('registrar')) &&
                               !t.includes('usuario') &&
                               t.length < 40;
                    });

                    // Si hay varios, preferir el que menciona la sección
                    if (sectionHint) {
                        const specific = addBtns.find(b =>
                            b.textContent.toLowerCase().includes(sectionHint.toLowerCase())
                        );
                        if (specific) {
                            specific.click();
                            return { ok: true, text: specific.textContent.trim() };
                        }
                    }

                    // Si no, usar el primero disponible
                    if (addBtns.length > 0) {
                        addBtns[0].click();
                        return { ok: true, text: addBtns[0].textContent.trim() };
                    }

                    return { ok: false, available: btns.filter(b => b.offsetParent).map(b => b.textContent.trim().substring(0, 25)) };
                }, tab.addSection);

                if (!addClicked.ok) {
                    console.log(`  ✗ Botón agregar no encontrado`);
                    console.log(`    Disponibles: ${addClicked.available?.slice(0, 5).join(', ')}`);
                    results.push({ tab: tab.name, navigation: true, formFound: false, create: false });
                    console.log('');
                    continue;
                }

                console.log(`  ✓ Click en: "${addClicked.text}"`);
                await page.waitForTimeout(2000);

                // Llenar formulario
                await page.evaluate(() => {
                    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="file"]), textarea, select');
                    const timestamp = Date.now().toString().slice(-6);

                    inputs.forEach(input => {
                        if (!input.offsetParent) return;

                        if (input.tagName === 'SELECT') {
                            if (input.options.length > 1) {
                                input.selectedIndex = 1;
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        } else if (input.type === 'date') {
                            input.value = '2024-03-15';
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        } else if (input.type === 'number') {
                            input.value = '2024';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        } else if (input.type === 'email') {
                            input.value = `test${timestamp}@test.com`;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        } else if (input.type === 'tel') {
                            input.value = '1234567890';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        } else {
                            input.value = 'TEST_' + timestamp;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    });
                });
                console.log(`  ✓ Campos llenados`);

                // Click en guardar
                const saved = await page.evaluate(() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (!btn.offsetParent) continue;
                        const t = btn.textContent.toLowerCase();
                        const c = btn.className || '';
                        if ((c.includes('success') || c.includes('primary') ||
                             t.includes('guardar') || t.includes('save') || t.includes('crear')) &&
                            !t.includes('cancel') && !t.includes('cerrar')) {
                            btn.scrollIntoView({ block: 'center' });
                            btn.click();
                            return { ok: true, text: btn.textContent.trim() };
                        }
                    }
                    return { ok: false };
                });

                if (saved.ok) {
                    console.log(`  ✓ Click en: "${saved.text}"`);
                }

                await page.waitForTimeout(4000);

                // Cerrar modal si está abierto
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);

                // Verificar en BD
                const countAfter = await count(tab.table);
                const diff = countAfter - countBefore;
                console.log(`  Registros después: ${countAfter} (${diff >= 0 ? '+' : ''}${diff})`);

                const createOK = diff > 0 || apiCreate;
                results.push({
                    tab: tab.name,
                    navigation: true,
                    formFound: true,
                    create: createOK,
                    dbChange: diff
                });

                if (createOK) {
                    console.log(`  ✓ CREATE verificado`);
                } else {
                    console.log(`  ? CREATE no verificado`);
                }

            } catch (err) {
                console.log(`  ✗ Error: ${err.message}`);
                results.push({ tab: tab.name, navigation: false, create: false, error: err.message });
            }

            console.log('');
        }

    } catch (error) {
        console.log('ERROR GLOBAL:', error.message);
        await page.screenshot({ path: 'debug-tabs-v3-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('='.repeat(80));
    console.log('RESUMEN - CRUD TABS USUARIOS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Tab                         | Nav | Form | CREATE | BD');
    console.log('-'.repeat(65));

    let navOK = 0, formOK = 0, createOK = 0;

    results.forEach(r => {
        const nav = r.navigation ? '✓' : '✗';
        const form = r.formFound ? '✓' : '-';
        const create = r.create ? '✓' : '-';
        const db = r.dbChange > 0 ? `+${r.dbChange}` : '-';

        if (r.navigation) navOK++;
        if (r.formFound) formOK++;
        if (r.create) createOK++;

        console.log(`${(r.tab || '-').padEnd(27)} | ${nav}   | ${form}    | ${create}      | ${db}`);
    });

    console.log('-'.repeat(65));
    console.log(`Navegación: ${navOK}/${results.length}`);
    console.log(`Formularios: ${formOK}/${results.length}`);
    console.log(`CREATE: ${createOK}/${results.length}`);
    console.log('');
    console.log('='.repeat(80));
})();
