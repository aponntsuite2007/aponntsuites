/**
 * CRUD TEST - Tabs del Módulo Users v2
 * Prueba botones específicos dentro de cada tab
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

const TABS_TO_TEST = [
    {
        name: 'Datos Personales',
        tabText: 'Datos Personales',
        sections: [
            { name: 'Formación Académica', buttonText: 'Agregar', table: 'user_education' }
        ]
    },
    {
        name: 'Antecedentes Laborales',
        tabText: 'Antecedentes Laborales',
        sections: [
            { name: 'Experiencia Laboral', buttonText: 'Agregar', table: 'user_work_history' }
        ]
    },
    {
        name: 'Grupo Familiar',
        tabText: 'Grupo Familiar',
        sections: [
            { name: 'Familiar', buttonText: 'Agregar', table: 'user_family_members' }
        ]
    },
    {
        name: 'Antecedentes Médicos',
        tabText: 'Antecedentes Médicos',
        sections: [
            { name: 'Examen', buttonText: 'Agregar', table: 'user_medical_exams' },
            { name: 'Alergia', buttonText: 'Agregar', table: 'user_allergies' }
        ]
    },
    {
        name: 'Disciplinarios',
        tabText: 'Disciplinarios',
        sections: [
            { name: 'Sanción', buttonText: 'Agregar', table: 'user_disciplinary_actions' }
        ]
    }
];

async function countRecords(table) {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table}`);
        return parseInt(r[0].c);
    } catch { return -1; }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD TEST - TABS USUARIOS v2 (SECCIONES ESPECÍFICAS)');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = [];

    // Monitorear APIs
    let lastApiCall = null;
    page.on('response', r => {
        if (r.url().includes('/api/') && r.request().method() === 'POST') {
            lastApiCall = { status: r.status(), url: r.url().substring(0, 70) };
            if (r.status() === 201) {
                console.log(`  📡 API 201: ${r.url().substring(0, 60)}`);
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

        // Navegar a Users y abrir primer usuario
        console.log('▶ ABRIR PERFIL DE USUARIO');
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);

        // Click en el botón de ver/editar del primer usuario
        await page.evaluate(() => {
            const btns = document.querySelectorAll('.btn-info, button[title*="Ver"], button[title*="Editar"], [onclick*="view"], [onclick*="edit"]');
            for (const btn of btns) {
                if (btn.offsetParent && btn.closest('tr, .user-row')) {
                    btn.click();
                    return;
                }
            }
            // Fallback: click en ícono de ojo
            const icons = document.querySelectorAll('.bi-eye, .fa-eye');
            for (const icon of icons) {
                if (icon.offsetParent) {
                    icon.closest('button')?.click();
                    return;
                }
            }
        });
        await page.waitForTimeout(3000);

        // Verificar que se abrió el expediente
        const expedienteOpen = await page.evaluate(() => {
            return document.body.textContent.includes('Expediente Digital') ||
                   document.body.textContent.includes('Datos Personales');
        });

        if (!expedienteOpen) {
            console.log('  ⚠️ No se abrió el expediente. Buscando de otra forma...');
            // Intentar otra forma
            await page.click('.bi-eye, .btn-info', { timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(3000);
        }

        console.log('  ✓ Expediente abierto\n');

        // TEST CADA TAB Y SUS SECCIONES
        for (const tab of TABS_TO_TEST) {
            console.log(`▶ TAB: ${tab.name.toUpperCase()}`);
            console.log('-'.repeat(80));

            // Click en el tab
            const tabClicked = await page.evaluate((text) => {
                const tabs = document.querySelectorAll('.nav-link, [role="tab"], .tab-link');
                for (const t of tabs) {
                    if (t.textContent.includes(text) && t.offsetParent !== null) {
                        t.click();
                        return true;
                    }
                }
                return false;
            }, tab.tabText);

            if (!tabClicked) {
                console.log(`  ✗ Tab no encontrado\n`);
                results.push({ tab: tab.name, section: '-', navigation: false, create: false });
                continue;
            }

            await page.waitForTimeout(2000);
            console.log(`  ✓ Tab abierto`);

            // Screenshot del tab
            await page.screenshot({ path: `debug-tab-v2-${tab.name.replace(/\s+/g, '-')}.png`, fullPage: true });

            // Probar cada sección
            for (const section of tab.sections) {
                console.log(`  → Sección: ${section.name}`);

                const countBefore = await countRecords(section.table);
                console.log(`    Registros antes (${section.table}): ${countBefore}`);

                // Buscar botón específico de la sección
                const buttonClicked = await page.evaluate((sectionName, buttonText) => {
                    // Buscar en el DOM elementos que contengan el nombre de la sección
                    const allElements = document.querySelectorAll('*');
                    let sectionFound = null;

                    for (const el of allElements) {
                        if (el.textContent.includes(sectionName) &&
                            el.offsetParent !== null &&
                            !el.closest('nav') &&
                            el.tagName !== 'NAV') {

                            // Buscar botón cerca de este elemento
                            const parent = el.closest('div, section, .card, .panel') || el.parentElement;
                            if (parent) {
                                const btns = parent.querySelectorAll('button');
                                for (const btn of btns) {
                                    const t = btn.textContent.toLowerCase();
                                    if (btn.offsetParent &&
                                        (t.includes('agregar') || t.includes('add') || t.includes('+') ||
                                         t.includes('nuevo') || t.includes('registrar'))) {
                                        btn.click();
                                        return { found: true, text: btn.textContent.trim() };
                                    }
                                }
                            }
                        }
                    }

                    // Fallback: buscar cualquier botón de agregar que no sea "Agregar Usuario"
                    const allBtns = document.querySelectorAll('button');
                    for (const btn of allBtns) {
                        const t = btn.textContent.toLowerCase();
                        if (btn.offsetParent &&
                            (t.includes('agregar') || t.includes('+')) &&
                            !t.includes('usuario') &&
                            t.length < 30) {
                            btn.click();
                            return { found: true, text: btn.textContent.trim(), fallback: true };
                        }
                    }

                    return { found: false };
                }, section.name, section.buttonText);

                if (buttonClicked.found) {
                    console.log(`    ✓ Click en: "${buttonClicked.text}"${buttonClicked.fallback ? ' (fallback)' : ''}`);
                    await page.waitForTimeout(2000);

                    // Screenshot del modal/form abierto
                    await page.screenshot({ path: `debug-section-${section.name.replace(/\s+/g, '-')}.png` });

                    // Llenar formulario
                    lastApiCall = null;
                    await page.evaluate(() => {
                        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), textarea, select');
                        inputs.forEach(input => {
                            if (!input.offsetParent) return;

                            if (input.tagName === 'SELECT') {
                                if (input.options.length > 1) {
                                    input.selectedIndex = 1;
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            } else if (input.type === 'date') {
                                input.value = '2024-06-15';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            } else if (input.type === 'number') {
                                input.value = '2024';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            } else {
                                const testVal = 'CRUD_TEST_' + Date.now().toString().slice(-6);
                                input.value = testVal;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        });
                    });
                    console.log('    ✓ Campos llenados');

                    // Click en guardar (dentro del modal)
                    const saved = await page.evaluate(() => {
                        const modals = document.querySelectorAll('.modal, .dialog, [role="dialog"], .drawer');
                        let container = null;

                        // Buscar modal/dialog activo
                        for (const m of modals) {
                            if (m.offsetParent || m.classList.contains('show')) {
                                container = m;
                                break;
                            }
                        }

                        // Si no hay modal, buscar en todo el body
                        container = container || document.body;

                        const btns = container.querySelectorAll('button');
                        for (const btn of btns) {
                            const t = btn.textContent.toLowerCase();
                            const c = btn.className;
                            if (btn.offsetParent &&
                                (c.includes('success') || c.includes('primary') ||
                                 t.includes('guardar') || t.includes('save') ||
                                 t.includes('crear') || t.includes('create')) &&
                                !t.includes('cancel')) {
                                btn.scrollIntoView({ block: 'center' });
                                btn.click();
                                return { ok: true, text: btn.textContent.trim() };
                            }
                        }
                        return { ok: false };
                    });

                    if (saved.ok) {
                        console.log(`    ✓ Click en: "${saved.text}"`);
                    }

                    await page.waitForTimeout(4000);

                    // Verificar en BD
                    const countAfter = await countRecords(section.table);
                    const diff = countAfter - countBefore;
                    console.log(`    Registros después: ${countAfter} (${diff >= 0 ? '+' : ''}${diff})`);

                    const createOK = diff > 0 || (lastApiCall && lastApiCall.status === 201);
                    results.push({
                        tab: tab.name,
                        section: section.name,
                        table: section.table,
                        navigation: true,
                        formFound: true,
                        create: createOK,
                        dbChange: diff
                    });

                    if (createOK) {
                        console.log('    ✓ CREATE verificado');
                    } else {
                        console.log('    ? CREATE no verificado');
                    }

                    // Cerrar modal si está abierto
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(1000);

                } else {
                    console.log(`    ✗ Botón agregar no encontrado`);
                    results.push({
                        tab: tab.name,
                        section: section.name,
                        table: section.table,
                        navigation: true,
                        formFound: false,
                        create: false
                    });
                }
            }

            console.log('');
        }

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-tabs-v2-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('='.repeat(80));
    console.log('RESUMEN - CRUD TABS USUARIOS v2');
    console.log('='.repeat(80));
    console.log('');

    console.log('Tab                    | Sección              | Form | CREATE | BD Change');
    console.log('-'.repeat(80));

    let formOK = 0, createOK = 0;

    results.forEach(r => {
        const form = r.formFound ? '✓' : '✗';
        const create = r.create ? '✓' : '-';
        const db = r.dbChange > 0 ? `+${r.dbChange}` : '-';

        if (r.formFound) formOK++;
        if (r.create) createOK++;

        console.log(`${r.tab.padEnd(22)} | ${(r.section || '-').padEnd(20)} | ${form}    | ${create}      | ${db}`);
    });

    console.log('-'.repeat(80));
    console.log(`Formularios encontrados: ${formOK}/${results.length}`);
    console.log(`CREATE verificado: ${createOK}/${results.length}`);
    console.log('');
    console.log('='.repeat(80));
})();
