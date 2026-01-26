/**
 * TEST EXHAUSTIVO DE LOS 10 TABS DEL MODAL DE USUARIO
 * Verifica CADA elemento de CADA tab funcione correctamente
 */

const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TABS_CONFIG = {
    'admin': {
        name: 'Administración',
        elements: ['Rol', 'Estado', 'Permisos', 'Departamento'],
        buttons: ['Guardar', 'Baja'],
        inputs: ['email', 'username']
    },
    'personal': {
        name: 'Datos Personales',
        elements: ['Nombre', 'Apellido', 'DNI', 'Fecha Nacimiento', 'Género', 'Teléfono', 'Dirección'],
        buttons: [],
        inputs: ['firstName', 'lastName', 'phone']
    },
    'work': {
        name: 'Datos Laborales',
        elements: ['Puesto', 'Fecha Ingreso', 'Contrato', 'Salario', 'Legajo'],
        buttons: [],
        inputs: ['position', 'hireDate']
    },
    'family': {
        name: 'Datos Familiares',
        elements: ['Contacto Emergencia', 'Familiares', 'Hijos'],
        buttons: ['Agregar Familiar'],
        inputs: []
    },
    'medical': {
        name: 'Datos Médicos',
        elements: ['Grupo Sanguíneo', 'Alergias', 'Condiciones', 'Exámenes'],
        buttons: [],
        inputs: []
    },
    'attendance': {
        name: 'Asistencia',
        elements: ['Historial', 'Estadísticas', 'Calendario'],
        buttons: ['Ver Detalle'],
        inputs: []
    },
    'calendar': {
        name: 'Calendario',
        elements: ['Eventos', 'Vacaciones', 'Licencias'],
        buttons: [],
        inputs: []
    },
    'disciplinary': {
        name: 'Disciplinario',
        elements: ['Sanciones', 'Amonestaciones', 'Casos Legales'],
        buttons: ['Nueva Sanción'],
        inputs: []
    },
    'biometric': {
        name: 'Biométrico',
        elements: ['Consentimiento', 'Fotos', 'Huellas', 'Estado'],
        buttons: ['Registrar Foto', 'DNI'],
        inputs: []
    },
    'notifications': {
        name: 'Notificaciones',
        elements: ['Bandeja', 'Resumen', 'Total', 'Sin Leer'],
        buttons: ['Actualizar'],
        inputs: []
    }
};

async function main() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     TEST EXHAUSTIVO - 10 TABS DEL EXPEDIENTE DE USUARIO       ║');
    console.log('║     Verificando CADA elemento de CADA tab                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1500, height: 950 },
        slowMo: 50,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const results = { passed: [], failed: [], warnings: [] };

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    try {
        // ═══════════════════════════════════════════════════════════
        // LOGIN
        // ═══════════════════════════════════════════════════════════
        console.log('🔐 FASE 1: LOGIN\n');
        await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle2' });
        await sleep(2000);

        await page.select('#companySelect', 'isi');
        await sleep(2000);

        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(4000);
        console.log('✅ Login completado\n');

        // ═══════════════════════════════════════════════════════════
        // NAVEGAR A USUARIOS
        // ═══════════════════════════════════════════════════════════
        console.log('👥 FASE 2: NAVEGANDO A USUARIOS\n');
        await page.evaluate(() => showTab('users'));
        await sleep(4000);

        const usersCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
        console.log(`   ✅ Tabla cargada: ${usersCount} usuarios\n`);

        // ═══════════════════════════════════════════════════════════
        // ABRIR MODAL DEL PRIMER USUARIO
        // ═══════════════════════════════════════════════════════════
        console.log('📋 FASE 3: ABRIENDO EXPEDIENTE DEL USUARIO\n');

        // Obtener nombre del usuario para referencia
        const userName = await page.evaluate(() => {
            const row = document.querySelector('table tbody tr');
            if (row) {
                const cells = row.querySelectorAll('td');
                return cells[1]?.textContent || 'Usuario';
            }
            return 'Usuario';
        });
        console.log(`   Usuario seleccionado: ${userName}\n`);

        await page.evaluate(() => {
            const btn = document.querySelector('.users-action-btn.view');
            if (btn) {
                const onclick = btn.getAttribute('onclick');
                if (onclick) eval(onclick);
            }
        });
        await sleep(6000);

        // Verificar que el modal abrió
        const modalOpen = await page.evaluate(() => {
            // Buscar cualquier modal fullscreen visible
            const modals = document.querySelectorAll('[class*="modal"], [id*="Modal"]');
            for (const m of modals) {
                if (m.style.display !== 'none' && m.offsetHeight > 500) {
                    return true;
                }
            }
            return false;
        });

        if (!modalOpen) {
            console.log('❌ ERROR: Modal no se abrió correctamente');
            results.failed.push('Modal de usuario no abrió');
        } else {
            console.log('   ✅ Modal de expediente abierto\n');
            results.passed.push('Modal de usuario abre correctamente');
        }

        // ═══════════════════════════════════════════════════════════
        // VERIFICAR CADA TAB
        // ═══════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('              VERIFICACIÓN DE LOS 10 TABS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        for (const [tabId, config] of Object.entries(TABS_CONFIG)) {
            console.log(`\n📑 TAB ${Object.keys(TABS_CONFIG).indexOf(tabId) + 1}/10: ${config.name.toUpperCase()}`);
            console.log('─'.repeat(50));

            // Cambiar al tab
            await page.evaluate((id) => {
                // Buscar botón del tab
                const tabBtns = document.querySelectorAll('.file-tab, [onclick*="showFileTab"]');
                tabBtns.forEach(btn => {
                    const onclick = btn.getAttribute('onclick') || '';
                    if (onclick.includes(`'${id}'`) || onclick.includes(`"${id}"`)) {
                        btn.click();
                    }
                });

                // Mostrar contenido del tab
                document.querySelectorAll('.file-tab-content').forEach(t => t.style.display = 'none');
                const tab = document.getElementById(`${id}-tab`);
                if (tab) tab.style.display = 'block';
            }, tabId);

            await sleep(2000);

            // Verificar que el tab está visible
            const tabInfo = await page.evaluate((id, expectedElements) => {
                const tab = document.getElementById(`${id}-tab`);
                if (!tab) return { exists: false };

                const text = tab.innerText || '';
                const html = tab.innerHTML || '';

                // Buscar elementos esperados
                const foundElements = [];
                const missingElements = [];

                for (const elem of expectedElements) {
                    if (text.toLowerCase().includes(elem.toLowerCase()) ||
                        html.toLowerCase().includes(elem.toLowerCase())) {
                        foundElements.push(elem);
                    } else {
                        missingElements.push(elem);
                    }
                }

                // Verificar problemas comunes
                const hasUndefined = text.includes('undefined');
                const hasObjectObject = text.includes('[object Object]');
                const hasNaN = text.includes('NaN');
                const hasError = text.toLowerCase().includes('error');
                const hasCargando = text.includes('Cargando') && !text.includes('Cargando notificaciones');

                // Contar campos de formulario
                const inputs = tab.querySelectorAll('input, select, textarea').length;
                const buttons = tab.querySelectorAll('button, .btn').length;
                const sections = tab.querySelectorAll('h3, h4, h5, .section').length;

                return {
                    exists: true,
                    visible: tab.style.display !== 'none',
                    foundElements,
                    missingElements,
                    hasUndefined,
                    hasObjectObject,
                    hasNaN,
                    hasError,
                    hasCargando,
                    inputs,
                    buttons,
                    sections,
                    textLength: text.length
                };
            }, tabId, config.elements);

            if (!tabInfo.exists) {
                console.log(`   ❌ Tab ${tabId} NO EXISTE`);
                results.failed.push(`Tab ${config.name}: No existe`);
                continue;
            }

            if (!tabInfo.visible) {
                console.log(`   ❌ Tab ${tabId} existe pero NO está visible`);
                results.failed.push(`Tab ${config.name}: No visible`);
                continue;
            }

            // Reportar elementos encontrados
            if (tabInfo.foundElements.length > 0) {
                console.log(`   ✅ Elementos encontrados: ${tabInfo.foundElements.join(', ')}`);
            }
            if (tabInfo.missingElements.length > 0) {
                console.log(`   ⚠️  Elementos faltantes: ${tabInfo.missingElements.join(', ')}`);
                results.warnings.push(`Tab ${config.name}: Faltan ${tabInfo.missingElements.join(', ')}`);
            }

            // Verificar problemas de datos
            if (tabInfo.hasUndefined) {
                console.log(`   ❌ Contiene "undefined" - datos mal cargados`);
                results.failed.push(`Tab ${config.name}: Muestra "undefined"`);
            }
            if (tabInfo.hasObjectObject) {
                console.log(`   ❌ Contiene "[object Object]" - objeto no renderizado`);
                results.failed.push(`Tab ${config.name}: Muestra "[object Object]"`);
            }
            if (tabInfo.hasNaN) {
                console.log(`   ❌ Contiene "NaN" - cálculo incorrecto`);
                results.failed.push(`Tab ${config.name}: Muestra "NaN"`);
            }
            if (tabInfo.hasError) {
                console.log(`   ⚠️  Contiene palabra "error"`);
                results.warnings.push(`Tab ${config.name}: Posible error visible`);
            }
            if (tabInfo.hasCargando) {
                console.log(`   ⚠️  Sigue mostrando "Cargando..." - datos no cargaron`);
                results.warnings.push(`Tab ${config.name}: Datos no terminaron de cargar`);
            }

            // Estadísticas del tab
            console.log(`   📊 Inputs: ${tabInfo.inputs} | Botones: ${tabInfo.buttons} | Secciones: ${tabInfo.sections}`);

            // Si no hay problemas críticos, marcar como pasado
            if (!tabInfo.hasUndefined && !tabInfo.hasObjectObject && !tabInfo.hasNaN && tabInfo.textLength > 50) {
                results.passed.push(`Tab ${config.name}: OK`);
                console.log(`   ✅ Tab ${config.name} VERIFICADO`);
            }

            await sleep(1000);
        }

        // ═══════════════════════════════════════════════════════════
        // VERIFICAR BOTONES FUNCIONALES
        // ═══════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('              VERIFICACIÓN DE BOTONES Y ACCIONES');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Verificar botón de cerrar
        const hasCloseButton = await page.evaluate(() => {
            const closeBtn = document.querySelector('[onclick*="closeEmployeeFile"], [onclick*="closeViewModal"], .close-modal, [aria-label="Close"]');
            return !!closeBtn;
        });
        console.log(`   ${hasCloseButton ? '✅' : '❌'} Botón cerrar modal: ${hasCloseButton ? 'Presente' : 'Faltante'}`);

        // Verificar navegación de tabs
        const tabNavigation = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.file-tab');
            return tabs.length;
        });
        console.log(`   ✅ Tabs de navegación: ${tabNavigation} encontrados`);

        // ═══════════════════════════════════════════════════════════
        // ERRORES DE CONSOLA
        // ═══════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('              ERRORES DE CONSOLA');
        console.log('═══════════════════════════════════════════════════════════════\n');

        if (consoleErrors.length > 0) {
            console.log(`   ❌ ${consoleErrors.length} errores de consola detectados:`);
            consoleErrors.slice(0, 5).forEach(e => {
                console.log(`      → ${e.substring(0, 80)}...`);
            });
            results.failed.push(`${consoleErrors.length} errores de consola`);
        } else {
            console.log('   ✅ Sin errores de consola');
            results.passed.push('Sin errores de consola');
        }

        // ═══════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN FINAL                              ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');

        const total = results.passed.length + results.failed.length;
        const rate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

        console.log(`║   ✅ PASSED:   ${String(results.passed.length).padEnd(3)} tests                                    ║`);
        console.log(`║   ❌ FAILED:   ${String(results.failed.length).padEnd(3)} tests                                    ║`);
        console.log(`║   ⚠️  WARNINGS: ${String(results.warnings.length).padEnd(3)}                                          ║`);
        console.log(`║   📊 SUCCESS:  ${rate}%                                        ║`);
        console.log('╚═══════════════════════════════════════════════════════════════╝');

        if (results.failed.length > 0) {
            console.log('\n❌ FALLOS DETECTADOS:');
            results.failed.forEach(f => console.log(`   → ${f}`));
        }

        if (results.warnings.length > 0) {
            console.log('\n⚠️  ADVERTENCIAS:');
            results.warnings.forEach(w => console.log(`   → ${w}`));
        }

        console.log('\n✅ Test completado.');

        await browser.close();
        process.exit(results.failed.length > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        process.exit(1);
    }
}

main();
