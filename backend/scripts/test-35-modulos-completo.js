/**
 * TEST COMPLETO DE 35 MÓDULOS - PUPPETEER
 * Prueba cada módulo, sus botones, modales y elementos interactivos
 */

const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Lista completa de módulos a testear
const MODULES_TO_TEST = [
    // CORE
    { id: 'users', name: 'Gestión de Usuarios', expectedButtons: ['Agregar', 'Ver', 'Editar'] },
    { id: 'attendance', name: 'Asistencia', expectedButtons: ['Filtrar', 'Exportar'] },
    { id: 'dashboard', name: 'Dashboard', expectedButtons: [] },

    // RRHH
    { id: 'vacation-management', name: 'Vacaciones', expectedButtons: ['Nueva Solicitud', 'Aprobar'] },
    { id: 'training-management', name: 'Capacitación', expectedButtons: ['Nuevo Curso', 'Inscribir'] },
    { id: 'sanctions-management', name: 'Sanciones', expectedButtons: ['Nueva Sanción'] },
    { id: 'job-postings', name: 'Reclutamiento', expectedButtons: ['Nueva Vacante'] },
    { id: 'organizational-structure', name: 'Estructura Org', expectedButtons: ['Nuevo Depto', 'Editar'] },

    // BIOMETRÍA
    { id: 'kiosks-professional', name: 'Kiosks', expectedButtons: ['Nuevo Kiosk', 'Configurar'] },
    { id: 'biometric-consent', name: 'Consentimiento Bio', expectedButtons: ['Ver Estado'] },

    // FINANZAS
    { id: 'payroll-liquidation', name: 'Liquidación', expectedButtons: ['Nueva Liquidación', 'Calcular'] },
    { id: 'finance-dashboard', name: 'Dashboard Finanzas', expectedButtons: [] },
    { id: 'finance-budget', name: 'Presupuesto', expectedButtons: ['Nuevo'] },
    { id: 'finance-treasury', name: 'Tesorería', expectedButtons: ['Movimiento'] },
    { id: 'finance-reports', name: 'Reportes Fin', expectedButtons: ['Generar'] },
    { id: 'hour-bank', name: 'Banco de Horas', expectedButtons: ['Ajuste'] },
    { id: 'hour-bank-dashboard', name: 'Dashboard Horas', expectedButtons: [] },

    // DOCUMENTOS
    { id: 'dms-dashboard', name: 'Documentos', expectedButtons: ['Subir', 'Nueva Carpeta'] },
    { id: 'procedures-manual', name: 'Manual Proced', expectedButtons: ['Nuevo'] },

    // LEGAL/COMPLIANCE
    { id: 'legal-dashboard', name: 'Legal', expectedButtons: ['Nuevo Contrato'] },
    { id: 'compliance-dashboard', name: 'Compliance', expectedButtons: ['Auditoría'] },
    { id: 'art-management', name: 'ART', expectedButtons: ['Nuevo Siniestro'] },

    // MÉDICO
    { id: 'medical-dashboard-professional', name: 'Médico', expectedButtons: ['Nuevo Examen'] },

    // LOGÍSTICA
    { id: 'logistics-dashboard', name: 'Logística', expectedButtons: ['Nuevo Pedido'] },

    // VISITANTES
    { id: 'visitors', name: 'Visitantes', expectedButtons: ['Registrar Visita'] },

    // NOTIFICACIONES
    { id: 'inbox', name: 'Bandeja Entrada', expectedButtons: [] },
    { id: 'notifications-enterprise', name: 'Notificaciones', expectedButtons: ['Nueva'] },

    // TURNOS
    { id: 'shift-calendar-view', name: 'Turnos', expectedButtons: ['Nuevo Turno', 'Asignar'] },

    // ROLES
    { id: 'roles-permissions', name: 'Roles y Permisos', expectedButtons: ['Nuevo Rol'] },

    // SOPORTE
    { id: 'user-support-dashboard', name: 'Soporte', expectedButtons: ['Nuevo Ticket'] },

    // ANALYTICS
    { id: 'predictive-workforce-dashboard', name: 'Predictivo', expectedButtons: [] },
    { id: 'engineering-dashboard', name: 'Ingeniería', expectedButtons: [] },

    // EMPLOYEE
    { id: 'employee-map', name: 'Mapa Empleados', expectedButtons: [] },
    { id: 'employee-360', name: 'Perfil 360', expectedButtons: [] },

    // EXTRA
    { id: 'facturacion', name: 'Facturación', expectedButtons: ['Nueva Factura'] }
];

async function testModule(page, module, results) {
    const moduleResult = {
        id: module.id,
        name: module.name,
        loaded: false,
        hasContent: false,
        buttons: [],
        modals: [],
        errors: []
    };

    try {
        console.log(`\n📦 Testeando: ${module.name} (${module.id})`);

        // Intentar cargar el módulo
        const loaded = await page.evaluate((moduleId) => {
            return new Promise((resolve) => {
                try {
                    // Método 1: showTab
                    if (typeof window.showTab === 'function') {
                        window.showTab(moduleId);
                        setTimeout(() => resolve(true), 500);
                        return;
                    }
                    // Método 2: showModuleContent
                    if (typeof window.showModuleContent === 'function') {
                        window.showModuleContent(moduleId, moduleId);
                        setTimeout(() => resolve(true), 500);
                        return;
                    }
                    // Método 3: loadModuleContent
                    if (typeof window.loadModuleContent === 'function') {
                        window.loadModuleContent(moduleId).then(() => resolve(true)).catch(() => resolve(false));
                        return;
                    }
                    resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }, module.id);

        await sleep(2000); // Esperar a que cargue

        moduleResult.loaded = loaded;

        // Verificar si hay contenido visible
        const contentCheck = await page.evaluate((moduleId) => {
            const mainContent = document.getElementById('mainContent');
            if (!mainContent) return { hasContent: false, text: '' };

            const text = mainContent.innerText || '';
            const hasContent = text.length > 100 && !text.includes('Cargando') && !text.includes('Error');

            return {
                hasContent,
                textLength: text.length,
                hasError: text.toLowerCase().includes('error'),
                hasLoading: text.includes('Cargando')
            };
        }, module.id);

        moduleResult.hasContent = contentCheck.hasContent;
        if (contentCheck.hasError) moduleResult.errors.push('Texto "Error" detectado');
        if (contentCheck.hasLoading) moduleResult.errors.push('Texto "Cargando" detectado');

        // Buscar botones interactivos
        const buttons = await page.evaluate(() => {
            const btns = document.querySelectorAll('#mainContent button, #mainContent [onclick], #mainContent .btn');
            return Array.from(btns).slice(0, 20).map(b => ({
                text: (b.textContent || '').trim().substring(0, 30),
                hasOnclick: !!b.getAttribute('onclick'),
                classes: b.className
            })).filter(b => b.text.length > 0);
        });

        moduleResult.buttons = buttons;
        console.log(`   ✅ Cargado: ${moduleResult.loaded ? 'SÍ' : 'NO'}`);
        console.log(`   📄 Contenido: ${contentCheck.textLength} chars`);
        console.log(`   🔘 Botones: ${buttons.length}`);

        // Intentar clickear el primer botón y ver si abre modal
        if (buttons.length > 0) {
            try {
                // Cerrar cualquier toast/notification antes
                await page.evaluate(() => {
                    document.querySelectorAll('.toast, .notification, [class*="toast"], [class*="alert-dismissible"]').forEach(t => t.remove());
                });

                const modalTest = await page.evaluate(() => {
                    // Buscar botón que NO sea de exportar/descargar para evitar dialogs
                    const btns = document.querySelectorAll('#mainContent button[onclick], #mainContent .btn[onclick]');
                    for (const btn of btns) {
                        const text = (btn.textContent || '').toLowerCase();
                        const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
                        // Evitar botones de exportar, descargar, pdf, excel
                        if (text.includes('exportar') || text.includes('descargar') || text.includes('pdf') ||
                            text.includes('excel') || onclick.includes('export') || onclick.includes('download')) {
                            continue;
                        }
                        // Buscar botones de crear, agregar, nuevo, ver, editar
                        if (text.includes('agregar') || text.includes('nuevo') || text.includes('crear') ||
                            text.includes('ver') || text.includes('editar') || text.includes('add')) {
                            try { btn.click(); return true; } catch(e) { continue; }
                        }
                    }
                    // Si no encontró ninguno bueno, intentar el primero
                    if (btns.length > 0) {
                        try { btns[0].click(); return true; } catch(e) { return false; }
                    }
                    return false;
                });

                if (modalTest) {
                    await sleep(1500);

                    // Verificar si se abrió un modal
                    const modalOpened = await page.evaluate(() => {
                        const modals = document.querySelectorAll('.modal.show, [class*="modal"][style*="display: block"], [id*="Modal"]:not([style*="display: none"])');
                        for (const m of modals) {
                            if (m.offsetHeight > 100) {
                                return { opened: true, id: m.id || 'unknown' };
                            }
                        }
                        return { opened: false };
                    });

                    if (modalOpened.opened) {
                        moduleResult.modals.push(modalOpened.id);
                        console.log(`   🎉 Modal abierto: ${modalOpened.id}`);

                        // Cerrar modal
                        await page.evaluate(() => {
                            const closeBtn = document.querySelector('.modal.show .btn-close, .modal.show [onclick*="close"], [onclick*="closeModal"]');
                            if (closeBtn) closeBtn.click();
                            document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
                            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                        });
                        await sleep(500);
                    }
                }
            } catch (clickError) {
                console.log(`   ⚠️  Error en click (ignorado): ${clickError.message.substring(0, 50)}`);
            }
        }

    } catch (error) {
        moduleResult.errors.push(error.message);
        console.log(`   ❌ Error: ${error.message}`);
    }

    results.push(moduleResult);
    return moduleResult;
}

async function main() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║          TEST COMPLETO DE 35 MÓDULOS - PUPPETEER                      ║');
    console.log('║          Prueba cada módulo, botones, modales y elementos             ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 50,
        args: ['--window-size=1450,950'],
        protocolTimeout: 60000 // Aumentar timeout de protocolo
    });

    const page = await browser.newPage();

    // MANEJAR ALERTAS/DIALOGS AUTOMÁTICAMENTE
    page.on('dialog', async dialog => {
        console.log(`   📢 Dialog detectado: "${dialog.message().substring(0, 50)}..." - Aceptando...`);
        await dialog.accept();
    });

    const results = [];

    try {
        // LOGIN
        console.log('🔐 Haciendo login...');
        await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        // Seleccionar empresa
        await page.select('#companySelect', 'isi');
        await sleep(2000);

        // Login
        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(5000);
        console.log('✅ Login completado\n');

        // Testear cada módulo
        let passed = 0;
        let failed = 0;
        let partial = 0;

        for (const module of MODULES_TO_TEST) {
            const result = await testModule(page, module, results);

            if (result.loaded && result.hasContent && result.errors.length === 0) {
                passed++;
            } else if (result.loaded || result.hasContent) {
                partial++;
            } else {
                failed++;
            }

            await sleep(500); // Pausa entre módulos
        }

        // RESUMEN FINAL
        console.log('\n\n');
        console.log('╔═══════════════════════════════════════════════════════════════════════╗');
        console.log('║                        RESUMEN DE RESULTADOS                          ║');
        console.log('╠═══════════════════════════════════════════════════════════════════════╣');
        console.log(`║   ✅ FUNCIONAN COMPLETO:    ${passed.toString().padStart(2)}                                        ║`);
        console.log(`║   ⚠️  FUNCIONAN PARCIAL:     ${partial.toString().padStart(2)}                                        ║`);
        console.log(`║   ❌ NO FUNCIONAN:          ${failed.toString().padStart(2)}                                        ║`);
        console.log(`║   📊 TOTAL TESTEADOS:       ${MODULES_TO_TEST.length.toString().padStart(2)}                                        ║`);
        console.log('╚═══════════════════════════════════════════════════════════════════════╝');

        // Detalle por módulo
        console.log('\n📋 DETALLE POR MÓDULO:\n');
        console.log('┌────────────────────────────────┬────────┬──────────┬─────────┬────────┐');
        console.log('│ Módulo                         │ Cargó  │ Contenido│ Botones │ Modals │');
        console.log('├────────────────────────────────┼────────┼──────────┼─────────┼────────┤');

        for (const r of results) {
            const name = r.name.substring(0, 30).padEnd(30);
            const loaded = r.loaded ? '  ✅  ' : '  ❌  ';
            const content = r.hasContent ? '   ✅   ' : '   ❌   ';
            const buttons = r.buttons.length.toString().padStart(3).padEnd(7);
            const modals = r.modals.length.toString().padStart(3).padEnd(6);
            console.log(`│ ${name} │${loaded}│${content}│${buttons}│${modals}│`);
        }
        console.log('└────────────────────────────────┴────────┴──────────┴─────────┴────────┘');

        // Módulos con errores
        const withErrors = results.filter(r => r.errors.length > 0);
        if (withErrors.length > 0) {
            console.log('\n❌ MÓDULOS CON ERRORES:');
            for (const r of withErrors) {
                console.log(`   • ${r.name}: ${r.errors.join(', ')}`);
            }
        }

        // Módulos que no cargaron
        const notLoaded = results.filter(r => !r.loaded);
        if (notLoaded.length > 0) {
            console.log('\n⚠️  MÓDULOS QUE NO CARGARON:');
            for (const r of notLoaded) {
                console.log(`   • ${r.name} (${r.id})`);
            }
        }

        // Módulos con modales funcionando
        const withModals = results.filter(r => r.modals.length > 0);
        if (withModals.length > 0) {
            console.log('\n🎉 MÓDULOS CON MODALES FUNCIONANDO:');
            for (const r of withModals) {
                console.log(`   • ${r.name}: ${r.modals.join(', ')}`);
            }
        }

        console.log('\n\n🖥️  NAVEGADOR ABIERTO - Podés probar manualmente.');
        console.log('   Presiona Ctrl+C para cerrar.\n');

        // Guardar resultados en JSON
        const fs = require('fs');
        fs.writeFileSync('test-results-35-modulos.json', JSON.stringify(results, null, 2));
        console.log('📁 Resultados guardados en: test-results-35-modulos.json\n');

        // Mantener abierto
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ ERROR FATAL:', error.message);
        console.error(error.stack);
    }
}

main();
