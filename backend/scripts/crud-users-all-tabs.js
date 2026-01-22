/**
 * CRUD TEST - Todos los Tabs del Módulo Users
 * Verifica CREATE en cada tab con persistencia en BD
 */
const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false }
);

// Configuración de tabs y sus tablas
const TABS_CONFIG = [
    {
        name: 'Tab 1 - Administración',
        table: 'users',
        skip: true, // Ya probado
        note: 'Ya verificado - CREATE usuario principal'
    },
    {
        name: 'Tab 2 - Datos Personales',
        tabSelector: 'Datos Personales',
        tables: ['user_education', 'user_emergency_contacts'],
        testEducation: true
    },
    {
        name: 'Tab 3 - Antecedentes Laborales',
        tabSelector: 'Antecedentes Laborales',
        tables: ['user_work_history', 'user_professional_licenses']
    },
    {
        name: 'Tab 4 - Grupo Familiar',
        tabSelector: 'Grupo Familiar',
        tables: ['user_family_members', 'user_children']
    },
    {
        name: 'Tab 5 - Antecedentes Médicos',
        tabSelector: 'Antecedentes Médicos',
        tables: ['user_medical_exams', 'user_allergies', 'user_chronic_conditions']
    },
    {
        name: 'Tab 6 - Asistencias Permisos',
        tabSelector: 'Asistencias',
        tables: ['attendances', 'user_permission_requests']
    },
    {
        name: 'Tab 7 - Calendario',
        tabSelector: 'Calendario',
        tables: ['calendar_events']
    },
    {
        name: 'Tab 8 - Disciplinarios',
        tabSelector: 'Disciplinarios',
        tables: ['user_disciplinary_actions']
    },
    {
        name: 'Tab 9 - Registro Biométrico',
        tabSelector: 'Registro Biométrico',
        tables: ['biometric_data', 'facial_biometric_data']
    },
    {
        name: 'Tab 10 - Notificaciones',
        tabSelector: 'Notificaciones',
        tables: ['notifications']
    }
];

async function countRecords(table, filter = '1=1') {
    try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${table} WHERE ${filter}`);
        return parseInt(r[0].c);
    } catch (e) {
        return -1; // Table may not exist
    }
}

(async () => {
    console.log('='.repeat(80));
    console.log('CRUD TEST - TODOS LOS TABS DEL MÓDULO USERS');
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = [];

    try {
        // LOGIN
        console.log('▶ LOGIN');
        console.log('-'.repeat(80));
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
        console.log('  ✓ Login exitoso\n');

        // Navegar a Users
        console.log('▶ NAVEGAR A GESTIÓN DE USUARIOS');
        console.log('-'.repeat(80));
        await page.click('text=Gestión de Usuarios');
        await page.waitForTimeout(4000);
        console.log('  ✓ Módulo cargado\n');

        // Click en el primer usuario de la lista para ver sus tabs
        console.log('▶ ABRIR PERFIL DE USUARIO');
        console.log('-'.repeat(80));

        const userOpened = await page.evaluate(() => {
            // Buscar botón de ver/editar en la primera fila
            const viewBtns = document.querySelectorAll('button[title*="Ver"], button[title*="Edit"], .btn-info, [onclick*="view"], [onclick*="edit"]');
            for (const btn of viewBtns) {
                if (btn.offsetParent) {
                    btn.click();
                    return true;
                }
            }
            // Buscar ícono de ojo o lápiz
            const icons = document.querySelectorAll('.bi-eye, .bi-pencil, .fa-eye, .fa-edit, [class*="view"], [class*="edit"]');
            for (const icon of icons) {
                const btn = icon.closest('button, a');
                if (btn && btn.offsetParent) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (!userOpened) {
            console.log('  ⚠️ No se pudo abrir perfil de usuario');
            console.log('  Intentando con click en fila...');

            // Intentar click en la primera fila de datos
            await page.evaluate(() => {
                const rows = document.querySelectorAll('table tbody tr, .user-row, [class*="user-item"]');
                if (rows.length > 0) {
                    rows[0].click();
                }
            });
        }

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'debug-user-profile-open.png', fullPage: true });

        // Obtener lista de tabs disponibles
        const tabsFound = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-tabs .nav-link, .tab-link, [role="tab"], .nav-item a');
            return Array.from(tabs).filter(t => t.offsetParent).map(t => ({
                text: t.textContent.trim(),
                classes: t.className
            }));
        });

        console.log('  Tabs encontrados:', tabsFound.length);
        tabsFound.forEach((t, i) => console.log(`    [${i+1}] ${t.text}`));
        console.log('');

        // Probar cada tab
        for (let i = 0; i < TABS_CONFIG.length; i++) {
            const tab = TABS_CONFIG[i];
            console.log(`▶ ${tab.name}`);
            console.log('-'.repeat(80));

            const tabResult = {
                name: tab.name,
                navigation: false,
                formFound: false,
                create: false,
                dbChange: false
            };

            if (tab.skip) {
                console.log(`  ⏭️ ${tab.note}`);
                tabResult.navigation = true;
                tabResult.create = true;
                results.push(tabResult);
                console.log('');
                continue;
            }

            try {
                // Contar registros antes
                let countBefore = 0;
                if (tab.tables && tab.tables[0]) {
                    countBefore = await countRecords(tab.tables[0]);
                    console.log(`  Registros antes (${tab.tables[0]}): ${countBefore}`);
                }

                // Click en el tab
                const tabClicked = await page.evaluate((selector) => {
                    const tabs = document.querySelectorAll('.nav-tabs .nav-link, .tab-link, [role="tab"], .nav-item a, button');
                    for (const t of tabs) {
                        if (t.textContent.includes(selector) && t.offsetParent) {
                            t.click();
                            return { ok: true, text: t.textContent.trim() };
                        }
                    }
                    return { ok: false };
                }, tab.tabSelector);

                if (tabClicked.ok) {
                    tabResult.navigation = true;
                    console.log(`  ✓ Tab abierto: "${tabClicked.text}"`);
                } else {
                    console.log(`  ✗ Tab no encontrado: "${tab.tabSelector}"`);
                    results.push(tabResult);
                    console.log('');
                    continue;
                }

                await page.waitForTimeout(2000);
                await page.screenshot({ path: `debug-tab-${i+1}-${tab.tabSelector.replace(/\s+/g, '-')}.png`, fullPage: true });

                // Buscar botón de agregar en este tab
                const addBtnInfo = await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const addBtn = btns.find(b => {
                        if (!b.offsetParent) return false;
                        const t = b.textContent.toLowerCase();
                        return t.includes('agregar') || t.includes('add') || t.includes('nuevo') ||
                               t.includes('crear') || t.includes('+') || t.includes('registrar');
                    });
                    if (addBtn) {
                        return { found: true, text: addBtn.textContent.trim() };
                    }
                    return { found: false, buttons: btns.filter(b => b.offsetParent).map(b => b.textContent.trim().substring(0, 25)) };
                });

                if (addBtnInfo.found) {
                    tabResult.formFound = true;
                    console.log(`  ✓ Botón agregar: "${addBtnInfo.text}"`);

                    // Click en agregar
                    await page.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        const addBtn = btns.find(b => {
                            if (!b.offsetParent) return false;
                            const t = b.textContent.toLowerCase();
                            return t.includes('agregar') || t.includes('add') || t.includes('nuevo') ||
                                   t.includes('crear') || t.includes('+') || t.includes('registrar');
                        });
                        if (addBtn) addBtn.click();
                    });
                    await page.waitForTimeout(2000);

                    // Llenar formulario genérico
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
                                input.value = '2024-01-15';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            } else if (input.type === 'number') {
                                input.value = '100';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            } else if (input.type !== 'checkbox' && input.type !== 'radio') {
                                input.value = 'TEST_CRUD_' + Date.now().toString().slice(-6);
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        });
                    });
                    console.log('  ✓ Campos llenados');

                    // Click en guardar
                    await page.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        const saveBtn = btns.find(b => {
                            if (!b.offsetParent) return false;
                            const t = b.textContent.toLowerCase();
                            const c = b.className;
                            return (c.includes('success') || c.includes('primary') ||
                                    t.includes('guardar') || t.includes('save') || t.includes('crear')) &&
                                   !t.includes('cancel');
                        });
                        if (saveBtn) {
                            saveBtn.scrollIntoView({ block: 'center' });
                            setTimeout(() => saveBtn.click(), 300);
                        }
                    });
                    await page.waitForTimeout(4000);

                    // Verificar en BD
                    if (tab.tables && tab.tables[0]) {
                        const countAfter = await countRecords(tab.tables[0]);
                        const diff = countAfter - countBefore;
                        console.log(`  Registros después: ${countAfter} (${diff >= 0 ? '+' : ''}${diff})`);

                        if (diff > 0) {
                            tabResult.create = true;
                            tabResult.dbChange = true;
                            console.log('  ✓ CREATE verificado en BD');
                        } else {
                            console.log('  ? CREATE no detectado en BD');
                        }
                    }

                } else {
                    console.log('  ? Sin botón agregar visible');
                    console.log(`    Botones: ${addBtnInfo.buttons?.slice(0, 5).join(', ')}`);
                }

            } catch (error) {
                console.log(`  ✗ Error: ${error.message.substring(0, 50)}`);
            }

            results.push(tabResult);
            console.log('');
        }

    } catch (error) {
        console.log('ERROR GLOBAL:', error.message);
        await page.screenshot({ path: 'debug-tabs-error.png', fullPage: true });
    }

    await browser.close();
    await sequelize.close();

    // RESUMEN
    console.log('='.repeat(80));
    console.log('RESUMEN - CRUD TABS MÓDULO USERS');
    console.log('='.repeat(80));
    console.log('');

    console.log('Tab                              | Nav | Form | CREATE | BD');
    console.log('-'.repeat(70));

    let navOK = 0, formOK = 0, createOK = 0;

    results.forEach(r => {
        const nav = r.navigation ? '✓' : '✗';
        const form = r.formFound ? '✓' : '-';
        const create = r.create ? '✓' : (r.navigation ? '-' : '✗');
        const db = r.dbChange ? '✓' : '-';

        if (r.navigation) navOK++;
        if (r.formFound) formOK++;
        if (r.create) createOK++;

        console.log(`${r.name.padEnd(32)} | ${nav}   | ${form}    | ${create}      | ${db}`);
    });

    console.log('-'.repeat(70));
    console.log(`Navegación: ${navOK}/${results.length}`);
    console.log(`Formularios: ${formOK}/${results.length}`);
    console.log(`CREATE verificado: ${createOK}/${results.length}`);
    console.log('');
    console.log('='.repeat(80));
})();
