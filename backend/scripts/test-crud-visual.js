/**
 * TEST VISUAL CRUD - VER EN VIVO
 * Abre cada tab y prueba los botones de crear/editar/eliminar
 */

const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CRUD_TESTS = {
    'admin': {
        name: 'Administración',
        buttons: [
            { text: 'Cambiar Rol', action: 'editUserRole' },
            { text: 'Editar Posición', action: 'editPosition' },
            { text: 'Cambiar Departamento', action: 'changeDepartment' }
        ]
    },
    'personal': {
        name: 'Datos Personales',
        buttons: [
            { text: 'Editar', action: 'editBasicData' },
            { text: 'Agregar', action: 'addEducation' }
        ]
    },
    'work': {
        name: 'Datos Laborales',
        buttons: [
            { text: 'Editar Configuración', action: 'editSalaryConfig' },
            { text: 'Registrar Aumento', action: 'addSalaryIncrease' },
            { text: 'Agregar', action: 'addWorkHistory' }
        ]
    },
    'family': {
        name: 'Grupo Familiar',
        buttons: [
            { text: 'Editar', action: 'editMaritalStatus' },
            { text: 'Agregar Hijo', action: 'addChild' },
            { text: 'Agregar Familiar', action: 'addFamilyMember' }
        ]
    },
    'medical': {
        name: 'Antecedentes Médicos',
        buttons: [
            { text: 'Agregar', action: 'addSurgery' },
            { text: 'Agregar', action: 'addAllergy' },
            { text: 'Agregar Vacuna', action: 'addVaccination' }
        ]
    },
    'attendance': {
        name: 'Asistencia',
        buttons: [
            { text: 'Permiso', action: 'addPermissionRequest' }
        ]
    },
    'disciplinary': {
        name: 'Disciplinario',
        buttons: [
            { text: 'Acción Disciplinaria', action: 'addDisciplinaryAction' }
        ]
    },
    'biometric': {
        name: 'Biométrico',
        buttons: [
            { text: 'Iniciar Captura', action: 'startBiometricCapture' }
        ]
    }
};

async function main() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     TEST VISUAL CRUD - MIRÁ EN EL NAVEGADOR                   ║');
    console.log('║     Voy a clickear cada botón para que veas si funciona       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 800 },
        slowMo: 200,
        args: ['--window-size=1300,850']
    });

    const page = await browser.newPage();
    const results = { working: [], broken: [], noModal: [] };

    try {
        // LOGIN
        console.log('🔐 Haciendo login...');
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
        console.log('✅ Login OK\n');

        // IR A USUARIOS
        console.log('👥 Navegando a Usuarios...');
        await page.evaluate(() => showTab('users'));
        await sleep(3000);

        // ABRIR EXPEDIENTE
        console.log('📋 Abriendo expediente del primer usuario...');
        await page.evaluate(() => {
            const btn = document.querySelector('.users-action-btn.view');
            if (btn) {
                const onclick = btn.getAttribute('onclick');
                if (onclick) eval(onclick);
            }
        });
        await sleep(5000);

        // PROBAR CADA TAB
        for (const [tabId, config] of Object.entries(CRUD_TESTS)) {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`📑 TAB: ${config.name.toUpperCase()}`);
            console.log(`${'═'.repeat(60)}`);

            // Cambiar al tab usando la función global
            await page.evaluate((id) => {
                // Usar showFileTab directamente
                if (typeof window.showFileTab === 'function') {
                    window.showFileTab(id);
                }
            }, tabId);
            await sleep(2500);

            // Probar cada botón CRUD
            for (const btn of config.buttons) {
                console.log(`   🔘 Buscando: "${btn.action}"...`);

                // PRIMERO: Scroll al botón si existe
                await page.evaluate((action) => {
                    const b = document.querySelector(`[onclick*="${action}"]`);
                    if (b) {
                        b.scrollIntoView({ behavior: 'instant', block: 'center' });
                    }
                }, btn.action);
                await sleep(400);

                const buttonFound = await page.evaluate((action) => {
                    // Buscar por onclick específico
                    const b = document.querySelector(`[onclick*="${action}"]`);
                    if (b && b.offsetHeight > 0) {
                        return { found: true, text: b.textContent?.trim().substring(0, 35) || 'sin texto' };
                    }
                    return { found: false };
                }, btn.action);

                if (buttonFound.found) {
                    console.log(`      ✅ ENCONTRADO: ${buttonFound.text}`);

                    // Clickear el botón
                    try {
                        await page.evaluate((action) => {
                            const b = document.querySelector(`[onclick*="${action}"]`);
                            if (b) b.click();
                        }, btn.action);
                        const clicked = true;

                        if (clicked) {
                            await sleep(1500);

                            // Verificar si abrió un modal
                            const modalOpened = await page.evaluate(() => {
                                const modals = document.querySelectorAll('[id*="Modal"], .modal, [style*="position: fixed"]');
                                for (const m of modals) {
                                    if (m.offsetHeight > 200 && m.style.display !== 'none') {
                                        return true;
                                    }
                                }
                                return false;
                            });

                            if (modalOpened) {
                                console.log(`      🎉 MODAL ABIERTO - FUNCIONA!`);
                                results.working.push(`${config.name}: ${btn.text}`);

                                // Cerrar modal
                                await page.evaluate(() => {
                                    const closeBtn = document.querySelector('[onclick*="closeModal"], .btn-close, [aria-label="Close"]');
                                    if (closeBtn) closeBtn.click();
                                    // También intentar cerrar con ESC
                                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                                });
                                await sleep(500);
                            } else {
                                console.log(`      ⚠️  Botón clickeado pero NO abrió modal`);
                                results.noModal.push(`${config.name}: ${btn.text}`);
                            }
                        }
                    } catch (e) {
                        console.log(`      ❌ Error al clickear: ${e.message}`);
                    }
                } else {
                    console.log(`      ❌ NO ENCONTRADO`);
                    results.broken.push(`${config.name}: ${btn.text}`);
                }
            }
        }

        // RESUMEN
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN CRUD                               ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log(`║   ✅ FUNCIONAN:     ${results.working.length.toString().padEnd(3)}                                     ║`);
        console.log(`║   ⚠️  SIN MODAL:     ${results.noModal.length.toString().padEnd(3)}                                     ║`);
        console.log(`║   ❌ NO EXISTEN:    ${results.broken.length.toString().padEnd(3)}                                     ║`);
        console.log('╚═══════════════════════════════════════════════════════════════╝');

        if (results.working.length > 0) {
            console.log('\n✅ BOTONES QUE FUNCIONAN:');
            results.working.forEach(w => console.log(`   → ${w}`));
        }

        if (results.noModal.length > 0) {
            console.log('\n⚠️  BOTONES QUE NO ABREN MODAL:');
            results.noModal.forEach(w => console.log(`   → ${w}`));
        }

        if (results.broken.length > 0) {
            console.log('\n❌ BOTONES QUE FALTAN:');
            results.broken.forEach(w => console.log(`   → ${w}`));
        }

        console.log('\n🖥️  NAVEGADOR ABIERTO - Probá vos mismo los botones.');
        console.log('   Presiona Ctrl+C para cerrar.\n');

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    }
}

main();
