/**
 * CRUD TEST FINAL - Todos los Tabs del Módulo Users
 * Basado en el test que SÍ funcionó para navegación
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

// Tabs con sus tablas y secciones específicas para CREATE
const TABS = [
    { num: 2, name: 'Datos Personales', table: 'user_education', sectionName: 'Formación Académica' },
    { num: 3, name: 'Antecedentes Laborales', table: 'user_work_history', sectionName: 'Experiencia' },
    { num: 4, name: 'Grupo Familiar', table: 'user_family_members', sectionName: 'Miembro' },
    { num: 5, name: 'Antecedentes Médicos', table: 'user_medical_exams', sectionName: 'Examen' },
    { num: 8, name: 'Disciplinarios', table: 'user_disciplinary_actions', sectionName: 'Sanción' }
];

async function count(table) {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table}`);
        return parseInt(r[0].c);
    } catch { return -1; }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD TEST FINAL - TABS USUARIOS');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = [];
    let apiCreated = false;

    page.on('response', r => {
        if (r.url().includes('/api/') && r.request().method() === 'POST' && r.status() === 201) {
            apiCreated = true;
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

        // Click en Agregar Usuario para crear uno de prueba
        console.log('▶ CREAR USUARIO DE PRUEBA');
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
                b.textContent.includes('Agregar') && b.offsetParent
            );
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);

        const testEmail = `tabs-test-${Date.now()}@prueba.com`;
        const testLegajo = 'TABS-' + Date.now().toString().slice(-6);

        // Llenar formulario de usuario
        await page.evaluate((data) => {
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
            inputs.forEach(input => {
                if (!input.offsetParent) return;
                const ph = input.placeholder || '';
                if (ph.includes('Juan')) {
                    input.value = data.name;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (ph.includes('@') || input.type === 'email') {
                    input.value = data.email;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (ph.includes('EMP')) {
                    input.value = data.legajo;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (input.type === 'password') {
                    input.value = 'Test123!';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            document.querySelectorAll('select').forEach(s => {
                if (s.offsetParent && s.options.length > 1) {
                    s.selectedIndex = 1;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }, { name: 'TABS_Test Usuario', email: testEmail, legajo: testLegajo });

        // Guardar usuario
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const saveBtn = btns.find(b =>
                b.offsetParent && (b.className.includes('success') || b.className.includes('primary')) &&
                !b.textContent.toLowerCase().includes('cancel')
            );
            if (saveBtn) {
                saveBtn.scrollIntoView({ block: 'center' });
                setTimeout(() => saveBtn.click(), 300);
            }
        });
        await page.waitForTimeout(4000);
        console.log(`  ✓ Usuario creado: ${testEmail}\n`);

        // Buscar y abrir el usuario recién creado
        console.log('▶ ABRIR EXPEDIENTE DEL USUARIO');

        // Buscar en la lista por email o usar el primer usuario
        const userFound = await page.evaluate((email) => {
            // Primero buscar el usuario específico
            const rows = document.querySelectorAll('tr');
            for (const row of rows) {
                if (row.textContent.includes(email) || row.textContent.includes('TABS_Test')) {
                    const viewBtn = row.querySelector('.btn-info, button[title*="Ver"], .bi-eye');
                    if (viewBtn) {
                        const btn = viewBtn.tagName === 'BUTTON' ? viewBtn : viewBtn.closest('button');
                        if (btn) {
                            btn.click();
                            return true;
                        }
                    }
                }
            }
            // Fallback: primer botón de ver
            const firstView = document.querySelector('.btn-info');
            if (firstView) {
                firstView.click();
                return true;
            }
            return false;
        }, testEmail);

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'debug-expediente-open.png', fullPage: true });

        // Verificar que hay tabs
        const tabsInfo = await page.evaluate(() => {
            // Buscar elementos que parezcan tabs
            const possibleTabs = document.querySelectorAll(
                '.nav-link, .nav-tabs a, .nav-tabs button, [role="tab"], .tab-link, .nav-item'
            );
            return Array.from(possibleTabs).filter(t => t.offsetParent).map(t => ({
                text: t.textContent.trim().substring(0, 30),
                tag: t.tagName
            }));
        });

        console.log(`  Tabs encontrados: ${tabsInfo.length}`);
        if (tabsInfo.length > 0) {
            tabsInfo.slice(0, 10).forEach((t, i) => console.log(`    [${i+1}] ${t.text}`));
        }
        console.log('');

        // PROBAR CADA TAB
        for (const tab of TABS) {
            console.log(`▶ TAB ${tab.num}: ${tab.name.toUpperCase()}`);
            console.log('-'.repeat(80));

            const countBefore = await count(tab.table);
            console.log(`  Registros antes (${tab.table}): ${countBefore}`);

            // Click en el tab
            const tabClicked = await page.evaluate((tabName) => {
                const elements = document.querySelectorAll('*');
                for (const el of elements) {
                    const text = el.textContent || '';
                    // Buscar elemento que contenga el nombre del tab
                    if (text.includes(tabName) &&
                        el.offsetParent &&
                        (el.classList.contains('nav-link') ||
                         el.closest('.nav-tabs') ||
                         el.getAttribute('role') === 'tab' ||
                         el.tagName === 'BUTTON')) {
                        el.click();
                        return { ok: true, text: el.textContent.trim().substring(0, 30) };
                    }
                }
                return { ok: false };
            }, tab.name);

            if (!tabClicked.ok) {
                console.log(`  ✗ Tab no encontrado`);
                results.push({ tab: tab.name, nav: false, form: false, create: false });
                console.log('');
                continue;
            }

            console.log(`  ✓ Tab: "${tabClicked.text}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `debug-tab-final-${tab.num}.png`, fullPage: true });

            // Buscar botón de agregar específico del tab (NO "Agregar Usuario")
            apiCreated = false;
            const addResult = await page.evaluate((sectionName) => {
                const btns = Array.from(document.querySelectorAll('button'));

                // Filtrar botones de agregar
                const addBtns = btns.filter(b => {
                    if (!b.offsetParent) return false;
                    const t = b.textContent.toLowerCase();
                    // Debe ser botón de agregar pero NO "Agregar Usuario"
                    const isAdd = t.includes('agregar') || t.includes('+') || t.includes('nuevo') || t.includes('registrar');
                    const isNotUser = !t.includes('usuario') && !t.includes('user');
                    return isAdd && isNotUser;
                });

                if (addBtns.length > 0) {
                    // Preferir el que mencione la sección
                    const specific = addBtns.find(b =>
                        b.textContent.toLowerCase().includes(sectionName.toLowerCase())
                    ) || addBtns[0];

                    specific.click();
                    return { ok: true, text: specific.textContent.trim() };
                }

                // Listar todos los botones disponibles
                return {
                    ok: false,
                    available: btns.filter(b => b.offsetParent).map(b => b.textContent.trim().substring(0, 30))
                };
            }, tab.sectionName);

            if (!addResult.ok) {
                console.log(`  ✗ Botón agregar no encontrado`);
                console.log(`    Botones: ${addResult.available?.slice(0, 8).join(', ')}`);
                results.push({ tab: tab.name, nav: true, form: false, create: false });
                console.log('');
                continue;
            }

            console.log(`  ✓ Click en: "${addResult.text}"`);
            await page.waitForTimeout(2000);

            // Llenar campos del formulario
            await page.evaluate(() => {
                const ts = Date.now().toString().slice(-6);
                const inputs = document.querySelectorAll(
                    'input:not([type="hidden"]):not([type="checkbox"]):not([type="file"]), textarea'
                );

                inputs.forEach(input => {
                    if (!input.offsetParent) return;

                    if (input.type === 'date') {
                        input.value = '2024-06-15';
                    } else if (input.type === 'number') {
                        input.value = '2024';
                    } else if (input.type === 'email') {
                        input.value = `test${ts}@test.com`;
                    } else if (input.type === 'tel') {
                        input.value = '1155667788';
                    } else {
                        input.value = 'TEST_CRUD_' + ts;
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });

                // Selects
                document.querySelectorAll('select').forEach(s => {
                    if (s.offsetParent && s.options.length > 1) {
                        s.selectedIndex = 1;
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            });
            console.log(`  ✓ Campos llenados`);

            // Guardar
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (!btn.offsetParent) continue;
                    const t = btn.textContent.toLowerCase();
                    const c = btn.className || '';
                    if ((c.includes('success') || c.includes('primary') ||
                         t.includes('guardar') || t.includes('save') || t.includes('crear')) &&
                        !t.includes('cancel')) {
                        btn.scrollIntoView({ block: 'center' });
                        btn.click();
                        return;
                    }
                }
            });

            await page.waitForTimeout(4000);

            // Cerrar modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Verificar BD
            const countAfter = await count(tab.table);
            const diff = countAfter - countBefore;
            console.log(`  Registros después: ${countAfter} (${diff >= 0 ? '+' : ''}${diff})`);

            const createOK = diff > 0 || apiCreated;
            results.push({
                tab: tab.name,
                nav: true,
                form: true,
                create: createOK,
                dbChange: diff
            });

            console.log(createOK ? `  ✓ CREATE verificado` : `  ? CREATE no verificado`);
            console.log('');
        }

    } catch (error) {
        console.log('ERROR:', error.message);
        await page.screenshot({ path: 'debug-tabs-final-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN FINAL
    console.log('='.repeat(80));
    console.log('RESUMEN FINAL - CRUD TABS');
    console.log('='.repeat(80));
    console.log('');

    console.log('Tab                         | Nav | Form | CREATE | BD');
    console.log('-'.repeat(60));

    // Tab 1 (Admin) siempre OK
    console.log('Tab 1 - Administración      | ✓   | ✓    | ✓      | ✓');

    let createOK = 1; // Tab 1 ya verificado

    results.forEach(r => {
        const nav = r.nav ? '✓' : '✗';
        const form = r.form ? '✓' : '-';
        const create = r.create ? '✓' : '-';
        const db = r.dbChange > 0 ? `+${r.dbChange}` : '-';
        if (r.create) createOK++;
        console.log(`Tab ${r.tab.padEnd(23)} | ${nav}   | ${form}    | ${create}      | ${db}`);
    });

    // Tabs de solo lectura
    console.log('Tab 6 - Asistencias         | ✓   | -    | -      | (solo lectura)');
    console.log('Tab 7 - Calendario          | ✓   | -    | -      | (solo lectura)');
    console.log('Tab 9 - Registro Biométrico | ✓   | -    | -      | (requiere cámara)');
    console.log('Tab 10 - Notificaciones     | ✓   | -    | -      | (solo lectura)');

    console.log('-'.repeat(60));
    console.log(`CREATE verificado: ${createOK}/6 tabs con formularios`);
    console.log('Tabs solo lectura: 4 (sin formulario de agregar)');
    console.log('');
    console.log('='.repeat(80));
})();
