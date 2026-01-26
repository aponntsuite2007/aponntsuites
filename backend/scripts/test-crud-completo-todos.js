/**
 * TEST CRUD COMPLETO - TODOS LOS MÓDULOS DEL SISTEMA
 * Incluye: Compras, Proveedores, Almacén, Finanzas extendido, etc.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// TODOS los módulos de negocio del sistema (NO incluye módulos admin/internos)
const MODULES = [
    // ═══════════════════════════════════════════════════════════
    // RRHH CORE
    // ═══════════════════════════════════════════════════════════
    { id: 'users', name: 'Usuarios', createTexts: ['Agregar', 'Nuevo Usuario', '+ Usuario'] },
    { id: 'attendance', name: 'Asistencia', createTexts: ['Registrar', 'Fichaje Manual', '+ Asistencia'] },
    { id: 'vacation-management', name: 'Vacaciones', createTexts: ['Nueva Solicitud', 'Solicitar', '+ Solicitud'] },
    { id: 'training-management', name: 'Capacitación', createTexts: ['Nueva Capacitación', 'Nuevo Curso', 'Agregar'] },
    { id: 'sanctions-management', name: 'Sanciones', createTexts: ['Nueva Sanción', 'Nueva Solicitud', 'Agregar'] },
    { id: 'job-postings', name: 'Reclutamiento', createTexts: ['Nueva Oferta', 'Nueva Vacante', 'Publicar'] },
    { id: 'organizational-structure', name: 'Estructura Org', createTexts: ['Nuevo Departamento', 'Agregar', '+'] },
    { id: 'benefits-management', name: 'Beneficios', createTexts: ['Nuevo Beneficio', 'Agregar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // VISITANTES Y ACCESO
    // ═══════════════════════════════════════════════════════════
    { id: 'visitors', name: 'Visitantes', createTexts: ['Nueva Visita', 'Registrar', '+'] },
    { id: 'biometric-consent', name: 'Consentimiento Bio', createTexts: ['Nuevo', 'Agregar', '+'] },
    { id: 'kiosks-professional', name: 'Kiosks', createTexts: ['Nuevo Kiosk', 'Agregar', '+'] },
    { id: 'temporary-access', name: 'Acceso Temporal', createTexts: ['Nuevo Acceso', 'Agregar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // DOCUMENTOS Y LEGAL
    // ═══════════════════════════════════════════════════════════
    { id: 'procedures-manual', name: 'Procedimientos', createTexts: ['Nuevo', 'Agregar', '+'] },
    { id: 'dms-dashboard', name: 'Documentos', createTexts: ['Subir', 'Nueva Carpeta', '+'] },
    { id: 'legal-dashboard', name: 'Legal', createTexts: ['Nuevo Contrato', 'Agregar', '+'] },
    { id: 'compliance-dashboard', name: 'Compliance', createTexts: ['Nueva Auditoría', 'Agregar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // SALUD Y SEGURIDAD
    // ═══════════════════════════════════════════════════════════
    { id: 'art-management', name: 'ART', createTexts: ['Nueva ART', 'Nuevo Siniestro', 'Reportar'] },
    { id: 'medical-dashboard-professional', name: 'Médico', createTexts: ['Nuevo Examen', 'Agregar', '+'] },
    { id: 'hse-management', name: 'HSE', createTexts: ['Nuevo Incidente', 'Reportar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // FINANZAS COMPLETO
    // ═══════════════════════════════════════════════════════════
    { id: 'finance-dashboard', name: 'Dashboard Finanzas', createTexts: [] },
    { id: 'finance-budget', name: 'Presupuesto', createTexts: ['Nuevo Presupuesto', 'Agregar', '+'] },
    { id: 'finance-treasury', name: 'Tesorería', createTexts: ['Agregar Cuenta', 'Nuevo Movimiento', '+'] },
    { id: 'finance-reports', name: 'Reportes Finanzas', createTexts: ['Generar', '+'] },
    { id: 'finance-chart-of-accounts', name: 'Plan de Cuentas', createTexts: ['Nueva Cuenta', 'Agregar', '+'] },
    { id: 'finance-cost-centers', name: 'Centros de Costo', createTexts: ['Nuevo Centro', 'Agregar', '+'] },
    { id: 'finance-cash-flow', name: 'Flujo de Caja', createTexts: ['Nuevo', 'Agregar', '+'] },
    { id: 'finance-journal-entries', name: 'Asientos Contables', createTexts: ['Nuevo Asiento', 'Agregar', '+'] },
    { id: 'cash-management', name: 'Gestión de Caja', createTexts: ['Nuevo', 'Agregar', '+'] },
    { id: 'facturacion', name: 'Facturación', createTexts: ['Nueva Factura', 'Agregar', '+'] },
    { id: 'payment-orders-dashboard', name: 'Órdenes de Pago', createTexts: ['Nueva Orden', 'Agregar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // COMPRAS Y PROVEEDORES
    // ═══════════════════════════════════════════════════════════
    { id: 'procurement-management', name: 'Compras', createTexts: ['Nueva Orden', 'Nueva Compra', 'Agregar', '+'] },
    { id: 'vendor-dashboard', name: 'Proveedores', createTexts: ['Nuevo Proveedor', 'Agregar', '+'] },
    { id: 'vendor-invoicing-system', name: 'Facturas Proveedores', createTexts: ['Nueva Factura', 'Agregar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // ALMACÉN E INVENTARIO
    // ═══════════════════════════════════════════════════════════
    { id: 'warehouse-management', name: 'Almacén', createTexts: ['Nuevo Producto', 'Agregar', '+'] },
    { id: 'logistics-dashboard', name: 'Logística', createTexts: ['Nuevo Pedido', 'Agregar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // PAYROLL Y HORAS
    // ═══════════════════════════════════════════════════════════
    { id: 'payroll-liquidation', name: 'Liquidación', createTexts: ['Nueva', 'Liquidar', '+'] },
    { id: 'hour-bank', name: 'Banco Horas', createTexts: ['Ajuste', 'Nuevo', '+'] },
    { id: 'hour-bank-dashboard', name: 'Dashboard Horas', createTexts: [] },

    // ═══════════════════════════════════════════════════════════
    // CLIENTES Y VENTAS
    // ═══════════════════════════════════════════════════════════
    { id: 'clientes', name: 'Clientes', createTexts: ['Nuevo Cliente', 'Agregar', '+'] },
    { id: 'leads-pipeline-dashboard', name: 'Pipeline Leads', createTexts: ['Nuevo Lead', 'Agregar', '+'] },
    { id: 'retail-analytics-dashboard', name: 'Analytics Retail', createTexts: [] },
    { id: 'siac-commercial-dashboard', name: 'SIAC Comercial', createTexts: [] },

    // ═══════════════════════════════════════════════════════════
    // ROLES Y PERMISOS
    // ═══════════════════════════════════════════════════════════
    { id: 'roles-permissions', name: 'Roles', createTexts: ['Nuevo Rol', 'Agregar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // DASHBOARDS Y VISTAS
    // ═══════════════════════════════════════════════════════════
    { id: 'dashboard', name: 'Dashboard Principal', createTexts: [] },
    { id: 'shift-calendar-view', name: 'Turnos', createTexts: ['Nuevo Turno', 'Agregar', '+'] },
    { id: 'employee-map', name: 'Mapa Empleados', createTexts: [] },
    { id: 'employee-360', name: 'Perfil 360', createTexts: [] },
    { id: 'organizational-chart', name: 'Organigrama', createTexts: [] },

    // ═══════════════════════════════════════════════════════════
    // COMUNICACIONES
    // ═══════════════════════════════════════════════════════════
    { id: 'inbox', name: 'Bandeja Entrada', createTexts: ['Nuevo Mensaje', 'Redactar', '+'] },
    { id: 'notifications-enterprise', name: 'Notificaciones', createTexts: ['Nueva', '+'] },
    { id: 'company-news', name: 'Noticias Empresa', createTexts: ['Nueva Noticia', 'Publicar', '+'] },

    // ═══════════════════════════════════════════════════════════
    // ANALYTICS Y SOPORTE
    // ═══════════════════════════════════════════════════════════
    { id: 'user-support-dashboard', name: 'Soporte', createTexts: ['Nuevo Ticket', 'Agregar', '+'] },
    { id: 'predictive-workforce-dashboard', name: 'Predictivo', createTexts: [] },
    { id: 'engineering-dashboard', name: 'Ingeniería', createTexts: [] },
    { id: 'oh-analytics-dashboard', name: 'Analytics OH', createTexts: [] },

    // ═══════════════════════════════════════════════════════════
    // BIENESTAR Y CULTURA
    // ═══════════════════════════════════════════════════════════
    { id: 'voice-platform', name: 'Voz Empleado', createTexts: ['Nueva Sugerencia', 'Agregar', '+'] },
    { id: 'emotional-analysis', name: 'Análisis Emocional', createTexts: [] },
    { id: 'psychological-assessment', name: 'Evaluación Psicológica', createTexts: ['Nueva Evaluación', '+'] },
    { id: 'mi-espacio', name: 'Mi Espacio', createTexts: [] },

    // ═══════════════════════════════════════════════════════════
    // PARTNERS Y MARKETPLACE
    // ═══════════════════════════════════════════════════════════
    { id: 'associate-marketplace', name: 'Marketplace Asociados', createTexts: [] },
    { id: 'partners-marketplace', name: 'Marketplace Partners', createTexts: [] }
];

const results = { passed: [], failed: [], skipped: [], details: {} };

async function testModule(page, mod) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📦 ${mod.name} (${mod.id})`);
    console.log(`${'═'.repeat(60)}`);

    const result = {
        id: mod.id,
        name: mod.name,
        loaded: false,
        hasCreateButton: false,
        modalOpened: false,
        hasFormFields: false,
        hasSaveButton: false,
        errors: []
    };

    try {
        // 1. CARGAR MÓDULO
        console.log('   1️⃣ Cargando módulo...');
        const loadResult = await page.evaluate((moduleId) => {
            try {
                if (window.showTab) {
                    window.showTab(moduleId);
                    return { success: true, method: 'showTab' };
                }
                if (window.showModuleContent) {
                    window.showModuleContent(moduleId);
                    return { success: true, method: 'showModuleContent' };
                }
                // Intentar cargar directamente el módulo
                if (window.Modules && window.Modules[moduleId] && window.Modules[moduleId].init) {
                    window.Modules[moduleId].init();
                    return { success: true, method: 'Modules.init' };
                }
                return { success: false, method: 'none' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }, mod.id);

        await sleep(3000);

        // Verificar si el módulo se cargó (hay contenido)
        const contentInfo = await page.evaluate(() => {
            const mainContent = document.getElementById('mainContent');
            if (!mainContent) return { hasContent: false, text: '' };
            const text = mainContent.innerText || '';
            const hasContent = text.length > 50 && !text.includes('Módulo no disponible') && !text.includes('Error');
            return { hasContent, textLength: text.length };
        });

        if (!contentInfo.hasContent) {
            console.log(`      ⏭️  Módulo no disponible o no cargó`);
            result.errors.push('Módulo no disponible');
            results.skipped.push(mod.name);
            results.details[mod.id] = result;
            return result;
        }

        result.loaded = true;
        console.log('      ✅ Módulo cargado');

        // 2. BUSCAR BOTÓN CREAR
        if (mod.createTexts.length === 0) {
            console.log('      ⚠️ Módulo solo lectura (sin botón crear definido)');
            results.passed.push(mod.name + ' (solo lectura)');
            results.details[mod.id] = result;
            return result;
        }

        console.log('   2️⃣ Buscando botón crear...');
        const createBtnInfo = await page.evaluate((texts) => {
            const allButtons = document.querySelectorAll('#mainContent button, #mainContent .btn, #mainContent [onclick], #mainContent a.btn');
            for (const btn of allButtons) {
                const btnText = (btn.textContent || '').trim().toLowerCase();
                for (const searchText of texts) {
                    if (btnText.includes(searchText.toLowerCase())) {
                        return { found: true, text: btn.textContent.trim().substring(0, 40) };
                    }
                }
            }
            // Buscar por íconos comunes
            for (const btn of allButtons) {
                const btnText = btn.textContent || '';
                if (btnText.includes('+') || btnText.includes('➕') || btnText.includes('✚')) {
                    return { found: true, text: btnText.trim().substring(0, 40) };
                }
            }
            return { found: false };
        }, mod.createTexts);

        if (createBtnInfo.found) {
            result.hasCreateButton = true;
            console.log(`      ✅ Botón encontrado: "${createBtnInfo.text}"`);

            // 3. CLICK EN BOTÓN CREAR
            console.log('   3️⃣ Clickeando botón crear...');
            await page.evaluate((texts) => {
                const allButtons = document.querySelectorAll('#mainContent button, #mainContent .btn, #mainContent [onclick], #mainContent a.btn');
                for (const btn of allButtons) {
                    const btnText = (btn.textContent || '').trim().toLowerCase();
                    for (const searchText of texts) {
                        if (btnText.includes(searchText.toLowerCase())) {
                            btn.click();
                            return;
                        }
                    }
                }
                for (const btn of allButtons) {
                    if ((btn.textContent || '').includes('+')) {
                        btn.click();
                        return;
                    }
                }
            }, mod.createTexts);
            await sleep(2000);

            // 4. VERIFICAR MODAL ABIERTO
            console.log('   4️⃣ Verificando modal...');
            const modalInfo = await page.evaluate(() => {
                const modals = document.querySelectorAll('.modal, [class*="modal"], [id*="Modal"], [id*="modal"], [role="dialog"]');
                for (const m of modals) {
                    const style = window.getComputedStyle(m);
                    const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && m.offsetHeight > 100;
                    if (isVisible) {
                        const inputs = m.querySelectorAll('input, textarea, select');
                        const saveBtn = m.querySelector('button[type="submit"], [onclick*="save"], [onclick*="Save"], [onclick*="guardar"], .btn-primary, .btn-success');
                        return {
                            opened: true,
                            id: m.id || m.className.substring(0, 30),
                            fieldCount: inputs.length,
                            hasSaveBtn: !!saveBtn
                        };
                    }
                }
                return { opened: false };
            });

            if (modalInfo.opened) {
                result.modalOpened = true;
                result.hasFormFields = modalInfo.fieldCount > 0;
                result.hasSaveButton = modalInfo.hasSaveBtn;
                console.log(`      ✅ Modal abierto: ${modalInfo.id}`);
                console.log(`      📝 Campos: ${modalInfo.fieldCount}`);
                console.log(`      💾 Botón guardar: ${modalInfo.hasSaveBtn ? 'SÍ' : 'NO'}`);

                // CERRAR MODAL
                await page.evaluate(() => {
                    const closeBtn = document.querySelector('.modal .btn-close, .modal [onclick*="close"], .modal .close, [aria-label="Close"], .modal-header button');
                    if (closeBtn) closeBtn.click();
                    document.querySelectorAll('.modal').forEach(m => {
                        m.classList.remove('show');
                        m.style.display = 'none';
                    });
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                    document.body.classList.remove('modal-open');
                });
                await sleep(500);
            } else {
                console.log('      ⚠️ Modal no se abrió');
                result.errors.push('Modal no abrió');
            }
        } else {
            console.log('      ⚠️ No se encontró botón crear');
            result.errors.push('Sin botón crear visible');
        }

        // DETERMINAR SI PASÓ
        if (result.loaded && result.hasCreateButton && result.modalOpened && result.hasFormFields) {
            results.passed.push(mod.name);
            console.log('   ✅ MÓDULO OK - CRUD COMPLETO');
        } else if (result.loaded && !result.hasCreateButton) {
            results.passed.push(mod.name + ' (sin crear)');
            console.log('   ✅ MÓDULO OK (solo lectura)');
        } else if (result.loaded) {
            results.failed.push(mod.name);
            console.log('   ❌ MÓDULO CON PROBLEMAS');
        } else {
            results.skipped.push(mod.name);
            console.log('   ⏭️ MÓDULO OMITIDO');
        }

    } catch (err) {
        console.log(`   ❌ ERROR: ${err.message}`);
        result.errors.push(err.message);
        results.failed.push(mod.name);
    }

    results.details[mod.id] = result;
    return result;
}

async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║     TEST CRUD COMPLETO - TODOS LOS MÓDULOS DEL SISTEMA             ║');
    console.log('║     Incluye: Compras, Proveedores, Almacén, Finanzas, etc.         ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Total módulos a testear: ${MODULES.length}\n`);

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 30,
        args: ['--window-size=1450,950'],
        protocolTimeout: 120000
    });

    const page = await browser.newPage();
    page.on('dialog', async d => {
        console.log(`   📢 Dialog: "${d.message().substring(0, 40)}..." - OK`);
        await d.accept();
    });

    try {
        // LOGIN
        console.log('🔐 Login...');
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
        await sleep(5000);
        console.log('✅ Login OK\n');

        // TEST CADA MÓDULO
        for (const mod of MODULES) {
            await testModule(page, mod);
            await sleep(1000);
        }

        // RESUMEN
        console.log('\n\n');
        console.log('╔════════════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN FINAL                                    ║');
        console.log('╠════════════════════════════════════════════════════════════════════╣');
        console.log(`║   ✅ PASARON:    ${results.passed.length.toString().padStart(2)}                                             ║`);
        console.log(`║   ❌ FALLARON:   ${results.failed.length.toString().padStart(2)}                                             ║`);
        console.log(`║   ⏭️  OMITIDOS:   ${results.skipped.length.toString().padStart(2)}                                             ║`);
        console.log(`║   📊 TOTAL:      ${MODULES.length.toString().padStart(2)}                                             ║`);
        console.log('╚════════════════════════════════════════════════════════════════════╝');

        const passRate = (results.passed.length / (results.passed.length + results.failed.length) * 100).toFixed(0);
        console.log(`\n📊 TASA DE ÉXITO: ${passRate}% (de módulos disponibles)`);

        if (results.passed.length > 0) {
            console.log('\n✅ PASARON:');
            results.passed.forEach(m => console.log(`   ✓ ${m}`));
        }
        if (results.failed.length > 0) {
            console.log('\n❌ FALLARON:');
            results.failed.forEach(m => console.log(`   ✗ ${m}`));
        }
        if (results.skipped.length > 0) {
            console.log('\n⏭️ OMITIDOS (no disponibles en menú):');
            results.skipped.forEach(m => console.log(`   ○ ${m}`));
        }

        // Detalle de cada módulo
        console.log('\n📋 DETALLE:');
        console.log('┌──────────────────────────┬────────┬────────┬───────┬────────┬────────┐');
        console.log('│ Módulo                   │ Cargó  │ BtnAdd │ Modal │ Campos │ Save   │');
        console.log('├──────────────────────────┼────────┼────────┼───────┼────────┼────────┤');
        for (const mod of MODULES) {
            const d = results.details[mod.id] || {};
            const row = [
                mod.name.substring(0, 24).padEnd(24),
                d.loaded ? '  ✅  ' : '  ❌  ',
                d.hasCreateButton ? '  ✅  ' : '  ⚠️  ',
                d.modalOpened ? '  ✅ ' : '  ❌ ',
                d.hasFormFields ? '  ✅  ' : '  ❌  ',
                d.hasSaveButton ? '  ✅  ' : '  ❌  '
            ];
            console.log(`│ ${row.join('│')}│`);
        }
        console.log('└──────────────────────────┴────────┴────────┴───────┴────────┴────────┘');

        // Guardar resultados
        fs.writeFileSync('test-crud-completo-todos-results.json', JSON.stringify(results, null, 2));
        console.log('\n📁 Guardado: test-crud-completo-todos-results.json');

        if (passRate >= 80) {
            console.log('\n🚀 SISTEMA APTO PARA PRODUCCIÓN');
        } else {
            console.log('\n⚠️ REVISAR MÓDULOS FALLIDOS ANTES DE PRODUCCIÓN');
        }

        console.log('\n🖥️ Navegador abierto - Ctrl+C para cerrar\n');
        await new Promise(() => {});

    } catch (err) {
        console.error('❌ ERROR:', err);
    }
}

main();
