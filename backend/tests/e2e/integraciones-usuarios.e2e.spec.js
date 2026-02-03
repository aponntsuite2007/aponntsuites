/**
 * TEST INTEGRACIONES AVANZADAS - MÓDULO USUARIOS
 * ================================================
 * Verifica integraciones con otros módulos:
 * 1. Campos con fuentes externas (departamentos, turnos, convenios)
 * 2. Documentos → DMS como SSOT
 * 3. Alertas/Notificaciones (vencimientos licencias, certificados)
 * 4. Parametrizaciones para liquidación de sueldos
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = {
    companySlug: 'wftest-empresa-demo',
    username: 'admin@wftest-empresa-demo.com',
    password: 'admin123'
};

// Screenshots dir
const SS_DIR = path.join(__dirname, '../../test-results/integraciones-usuarios');
if (fs.existsSync(SS_DIR)) fs.rmSync(SS_DIR, { recursive: true });
fs.mkdirSync(SS_DIR, { recursive: true });

let ssCounter = 0;
async function ss(page, name) {
    ssCounter++;
    const file = `${String(ssCounter).padStart(3, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SS_DIR, file), fullPage: true });
    console.log(`   📸 ${file}`);
}

// Helper para esperar y loguear
async function waitAndLog(page, ms, msg) {
    console.log(`   ⏳ ${msg}...`);
    await page.waitForTimeout(ms);
}

test.describe('INTEGRACIONES USUARIOS', () => {
    test('Verificar campos externos + DMS + Alertas + Parametrizaciones', async ({ page }) => {
        test.setTimeout(600000); // 10 minutos

        console.log('\n' + '='.repeat(70));
        console.log('🔗 TEST INTEGRACIONES AVANZADAS - MÓDULO USUARIOS');
        console.log('='.repeat(70));

        // ========== FASE 1: LOGIN ==========
        console.log('\n📌 FASE 1: LOGIN');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await ss(page, '01-login-inicial');

        await page.waitForSelector('#companySelect', { timeout: 10000 });
        await page.selectOption('#companySelect', CREDENTIALS.companySlug);
        await page.waitForTimeout(3000);

        await page.waitForFunction(() => {
            const input = document.getElementById('userInput');
            return input && !input.disabled;
        }, { timeout: 15000 });

        await page.fill('#userInput', CREDENTIALS.username);
        await page.fill('#passwordInput', CREDENTIALS.password);
        await page.click('button:has-text("Iniciar Sesión")');

        await page.waitForFunction(() => {
            const grid = document.querySelector('.module-grid');
            return grid && grid.offsetParent !== null;
        }, { timeout: 20000 });

        await page.waitForTimeout(3000);
        await ss(page, '02-post-login');
        console.log('   ✅ Login completado');

        // ========== FASE 2: ABRIR GESTIÓN DE USUARIOS ==========
        console.log('\n📌 FASE 2: ABRIR GESTIÓN DE USUARIOS');

        await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const c of cards) {
                if (c.innerText.includes('Gestión de Usuarios')) {
                    c.scrollIntoView();
                    c.click();
                    return true;
                }
            }
            return false;
        });

        await waitAndLog(page, 4000, 'Cargando módulo');
        await ss(page, '03-modulo-usuarios');

        // ========== FASE 3: VERIFICAR CAMPOS CON FUENTES EXTERNAS ==========
        console.log('\n📌 FASE 3: VERIFICAR CAMPOS CON FUENTES EXTERNAS');

        // Abrir modal de agregar usuario para ver los selectores
        const addBtnClicked = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(b => /agregar.*usuario/i.test(b.innerText));
            if (btn) { btn.click(); return true; }
            return false;
        });

        if (addBtnClicked) {
            await waitAndLog(page, 2000, 'Modal agregar abierto');
            await ss(page, '04-modal-agregar');

            // Verificar select de departamentos
            const deptSelect = await page.evaluate(() => {
                const select = document.querySelector('#newUserDept, select[name="department"]');
                if (select) {
                    const options = [...select.options].map(o => ({ value: o.value, text: o.text }));
                    return { found: true, optionCount: options.length, options: options.slice(0, 5) };
                }
                return { found: false };
            });

            console.log(`   🏢 Departamentos: ${deptSelect.found ? `✅ ${deptSelect.optionCount} opciones` : '❌ No encontrado'}`);
            if (deptSelect.options) {
                deptSelect.options.forEach(o => console.log(`      - ${o.text}`));
            }

            // Verificar select de convenio
            const convenioSelect = await page.evaluate(() => {
                const select = document.querySelector('#newUserConvenio, select[name="convenio"]');
                if (select) {
                    const options = [...select.options].map(o => o.text);
                    return { found: true, optionCount: options.length, options: options.slice(0, 5) };
                }
                return { found: false };
            });

            console.log(`   📋 Convenios: ${convenioSelect.found ? `✅ ${convenioSelect.optionCount} opciones` : '❌ No encontrado'}`);

            // Cerrar modal
            await page.evaluate(() => {
                const close = document.querySelector('.modal-close, button.modal-close') ||
                              [...document.querySelectorAll('button')].find(b => /cancelar|cerrar/i.test(b.innerText));
                if (close) close.click();
            });
            await page.waitForTimeout(1000);
        }

        // ========== FASE 4: ABRIR USUARIO EXISTENTE - EXPEDIENTE COMPLETO ==========
        console.log('\n📌 FASE 4: ABRIR EXPEDIENTE DE USUARIO EXISTENTE');

        // Click en primer botón Ver de la lista
        const verClickeado = await page.evaluate(() => {
            const verBtn = document.querySelector('button[title*="Ver"]') ||
                          [...document.querySelectorAll('button')].find(b => b.innerText.includes('👁') || b.title?.includes('Ver'));
            if (verBtn) { verBtn.click(); return true; }
            return false;
        });

        await waitAndLog(page, 3000, 'Abriendo expediente');
        await ss(page, '05-expediente-usuario');

        if (verClickeado) {
            // Verificar datos del usuario cargados
            const userData = await page.evaluate(() => {
                return {
                    // Datos básicos
                    nombre: document.querySelector('#display-fullname, [id*="fullname"]')?.innerText || 'N/A',
                    email: document.querySelector('#display-email, [id*="email"]')?.innerText || 'N/A',
                    legajo: document.querySelector('#display-legajo, [id*="legajo"], [id*="employeeId"]')?.innerText || 'N/A',
                    // Datos de fuentes externas
                    departamento: document.querySelector('#display-department, [id*="department"]')?.innerText || 'N/A',
                    cargo: document.querySelector('#display-position, [id*="position"]')?.innerText || 'N/A',
                    sucursal: document.querySelector('#display-branch, [id*="branch"]')?.innerText || 'N/A',
                    // Tabs disponibles
                    tabs: [...document.querySelectorAll('.file-tab, [class*="tab"]')].map(t => t.innerText.substring(0, 30)).slice(0, 10)
                };
            });

            console.log(`   👤 Usuario: ${userData.nombre}`);
            console.log(`   📧 Email: ${userData.email}`);
            console.log(`   🏢 Departamento: ${userData.departamento}`);
            console.log(`   💼 Cargo: ${userData.cargo}`);
            console.log(`   📑 Tabs disponibles: ${userData.tabs.length}`);
        }

        // ========== FASE 5: VERIFICAR TAB DE DOCUMENTOS (DMS) ==========
        console.log('\n📌 FASE 5: TAB DOCUMENTOS - INTEGRACIÓN DMS');

        // Buscar y clickear tab de documentos
        const docTabClicked = await page.evaluate(() => {
            // Intentar showFileTab
            if (typeof window.showFileTab === 'function') {
                try { window.showFileTab('admin'); return 'admin-tab'; } catch(e) {}
            }
            // Buscar botón de tab
            const tabs = document.querySelectorAll('.file-tab, [onclick*="showFileTab"]');
            for (const tab of tabs) {
                if (tab.innerText.toLowerCase().includes('admin') || tab.innerText.toLowerCase().includes('documento')) {
                    tab.click();
                    return tab.innerText.substring(0, 20);
                }
            }
            return null;
        });

        await waitAndLog(page, 2000, 'Cargando tab admin/documentos');
        await ss(page, '06-tab-admin-docs');

        // Verificar sección de documentos
        const docsInfo = await page.evaluate(() => {
            const adminTab = document.getElementById('admin-tab');
            if (!adminTab) return { found: false };

            return {
                found: true,
                hasUploadBtn: !!adminTab.querySelector('button[onclick*="upload"], input[type="file"]'),
                hasDocList: !!adminTab.querySelector('[id*="document"], .document-list, .doc-item'),
                dniSection: !!adminTab.querySelector('[id*="dni"], [class*="dni"]'),
                photoSection: !!adminTab.querySelector('[id*="photo"], [class*="photo"]'),
                buttons: [...adminTab.querySelectorAll('button')].map(b => b.innerText.substring(0, 25)).slice(0, 10)
            };
        });

        console.log(`   📁 Tab Admin: ${docsInfo.found ? '✅ Encontrado' : '❌ No encontrado'}`);
        console.log(`   📤 Botón subir: ${docsInfo.hasUploadBtn ? '✅' : '❌'}`);
        console.log(`   🪪 Sección DNI: ${docsInfo.dniSection ? '✅' : '❌'}`);
        console.log(`   📷 Sección Foto: ${docsInfo.photoSection ? '✅' : '❌'}`);
        if (docsInfo.buttons?.length > 0) {
            console.log(`   🔘 Botones disponibles: ${docsInfo.buttons.join(', ')}`);
        }

        // ========== FASE 6: TAB MÉDICO - LICENCIAS Y VENCIMIENTOS ==========
        console.log('\n📌 FASE 6: TAB MÉDICO - LICENCIAS Y ALERTAS VENCIMIENTO');

        await page.evaluate(() => {
            if (typeof window.showFileTab === 'function') {
                window.showFileTab('medical');
            }
        });

        await waitAndLog(page, 2000, 'Cargando tab médico');
        await ss(page, '07-tab-medical');

        const medicalInfo = await page.evaluate(() => {
            const medTab = document.getElementById('medical-tab');
            if (!medTab) return { found: false };

            return {
                found: true,
                hasLicenseSection: medTab.innerText.includes('Licencia') || medTab.innerText.includes('licencia'),
                hasExpiryAlerts: medTab.innerText.includes('Vencimiento') || medTab.innerText.includes('vencimiento'),
                hasCertificates: medTab.innerText.includes('Certificado') || medTab.innerText.includes('certificado'),
                hasMedicalHistory: medTab.innerText.includes('Historia') || medTab.innerText.includes('historial'),
                buttons: [...medTab.querySelectorAll('button')].map(b => b.innerText.substring(0, 30)).slice(0, 8)
            };
        });

        console.log(`   🏥 Tab Médico: ${medicalInfo.found ? '✅ Encontrado' : '❌ No encontrado'}`);
        console.log(`   📜 Sección Licencias: ${medicalInfo.hasLicenseSection ? '✅' : '❌'}`);
        console.log(`   ⚠️ Alertas Vencimiento: ${medicalInfo.hasExpiryAlerts ? '✅' : '❌'}`);
        console.log(`   📋 Certificados: ${medicalInfo.hasCertificates ? '✅' : '❌'}`);
        if (medicalInfo.buttons?.length > 0) {
            console.log(`   🔘 Acciones: ${medicalInfo.buttons.slice(0, 5).join(', ')}`);
        }

        // ========== FASE 7: TAB WORK - LICENCIAS DE CONDUCIR ==========
        console.log('\n📌 FASE 7: TAB WORK - LICENCIAS DE CONDUCIR Y PROFESIONALES');

        await page.evaluate(() => {
            if (typeof window.showFileTab === 'function') {
                window.showFileTab('work');
            }
        });

        await waitAndLog(page, 2000, 'Cargando tab work');
        await ss(page, '08-tab-work');

        const workInfo = await page.evaluate(() => {
            const workTab = document.getElementById('work-tab');
            if (!workTab) return { found: false };

            return {
                found: true,
                hasDriverLicense: workTab.innerText.includes('Licencia de Conduc') || workTab.innerText.includes('🚗'),
                hasProfLicense: workTab.innerText.includes('Licencia Profesional') || workTab.innerText.includes('🚛'),
                hasExpiryInfo: workTab.innerText.includes('Vence') || workTab.innerText.includes('Vencimiento'),
                nationalLicense: workTab.querySelector('#national-license-info')?.innerText || 'N/A',
                intlLicense: workTab.querySelector('#international-license-info')?.innerText || 'N/A',
                buttons: [...workTab.querySelectorAll('button')].map(b => b.innerText.substring(0, 30)).slice(0, 8)
            };
        });

        console.log(`   💼 Tab Work: ${workInfo.found ? '✅ Encontrado' : '❌ No encontrado'}`);
        console.log(`   🚗 Licencia Conducir: ${workInfo.hasDriverLicense ? '✅' : '❌'}`);
        console.log(`      - Nacional: ${workInfo.nationalLicense}`);
        console.log(`      - Internacional: ${workInfo.intlLicense}`);
        console.log(`   🚛 Licencias Profesionales: ${workInfo.hasProfLicense ? '✅' : '❌'}`);
        console.log(`   ⏰ Info Vencimientos: ${workInfo.hasExpiryInfo ? '✅' : '❌'}`);

        // ========== FASE 8: TAB NOTIFICATIONS - ALERTAS CONFIGURADAS ==========
        console.log('\n📌 FASE 8: TAB NOTIFICATIONS - ALERTAS Y NOTIFICACIONES');

        await page.evaluate(() => {
            if (typeof window.showFileTab === 'function') {
                window.showFileTab('notifications');
            }
        });

        await waitAndLog(page, 2000, 'Cargando tab notificaciones');
        await ss(page, '09-tab-notifications');

        const notifInfo = await page.evaluate(() => {
            const notifTab = document.getElementById('notifications-tab');
            if (!notifTab) return { found: false };

            return {
                found: true,
                hasTimeline: !!notifTab.querySelector('.notification-timeline, [class*="timeline"]'),
                hasAlertConfig: notifTab.innerText.includes('Alertas') || notifTab.innerText.includes('alertas'),
                hasProactiveNotif: notifTab.innerText.includes('proactiv') || notifTab.innerText.includes('Proactiv'),
                hasExpiryAlerts: notifTab.innerText.includes('vencimiento') || notifTab.innerText.includes('Vencimiento'),
                notifCount: (notifTab.innerText.match(/notificaci/gi) || []).length,
                buttons: [...notifTab.querySelectorAll('button')].map(b => b.innerText.substring(0, 30)).slice(0, 5)
            };
        });

        console.log(`   🔔 Tab Notificaciones: ${notifInfo.found ? '✅ Encontrado' : '❌ No encontrado'}`);
        console.log(`   📊 Timeline: ${notifInfo.hasTimeline ? '✅' : '❌'}`);
        console.log(`   ⚙️ Config Alertas: ${notifInfo.hasAlertConfig ? '✅' : '❌'}`);
        console.log(`   🎯 Alertas Proactivas: ${notifInfo.hasProactiveNotif ? '✅' : '❌'}`);
        console.log(`   ⏰ Alertas Vencimiento: ${notifInfo.hasExpiryAlerts ? '✅' : '❌'}`);

        // Cerrar modal de expediente
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ========== FASE 9: VERIFICAR API DE INTEGRACIONES ==========
        console.log('\n📌 FASE 9: VERIFICAR APIS DE INTEGRACIÓN');

        // Obtener token del localStorage
        const authToken = await page.evaluate(() => {
            const session = localStorage.getItem('aponnt_session') || sessionStorage.getItem('aponnt_session');
            if (session) {
                try {
                    return JSON.parse(session).token;
                } catch(e) {}
            }
            return window.companyAuthToken || window.authToken;
        });

        if (authToken) {
            console.log('   🔑 Token obtenido, verificando APIs...');

            // Test API departamentos
            const deptResponse = await page.evaluate(async (token) => {
                try {
                    const resp = await fetch('/api/v1/departments', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await resp.json();
                    return { ok: resp.ok, count: Array.isArray(data) ? data.length : (data.data?.length || 0) };
                } catch(e) {
                    return { ok: false, error: e.message };
                }
            }, authToken);
            console.log(`   🏢 API Departamentos: ${deptResponse.ok ? `✅ ${deptResponse.count} registros` : '❌ ' + deptResponse.error}`);

            // Test API turnos
            const shiftsResponse = await page.evaluate(async (token) => {
                try {
                    const resp = await fetch('/api/v1/shifts', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await resp.json();
                    return { ok: resp.ok, count: Array.isArray(data) ? data.length : (data.shifts?.length || 0) };
                } catch(e) {
                    return { ok: false, error: e.message };
                }
            }, authToken);
            console.log(`   🕐 API Turnos: ${shiftsResponse.ok ? `✅ ${shiftsResponse.count} registros` : '❌ ' + (shiftsResponse.error || 'Sin datos')}`);

            // Test API notificaciones
            const notifResponse = await page.evaluate(async (token) => {
                try {
                    const resp = await fetch('/api/v1/notifications', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        return { ok: true, count: data.notifications?.length || data.length || 0 };
                    }
                    return { ok: false, status: resp.status };
                } catch(e) {
                    return { ok: false, error: e.message };
                }
            }, authToken);
            console.log(`   🔔 API Notificaciones: ${notifResponse.ok ? `✅ ${notifResponse.count} registros` : '❌ ' + (notifResponse.error || `Status ${notifResponse.status}`)}`);

        } else {
            console.log('   ⚠️ No se pudo obtener token para verificar APIs');
        }

        await ss(page, '10-final-estado');

        // ========== FASE 10: ABRIR MÓDULO LIQUIDACIÓN (Verificar parametrizaciones) ==========
        console.log('\n📌 FASE 10: VERIFICAR MÓDULO LIQUIDACIÓN DE SUELDOS');

        // Volver al grid de módulos
        await page.evaluate(() => {
            if (typeof window.goBackToModulesGrid === 'function') {
                window.goBackToModulesGrid();
            }
        });
        await page.waitForTimeout(2000);

        // Buscar módulo de liquidación
        const liquidacionFound = await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const c of cards) {
                const text = c.innerText.toLowerCase();
                if (text.includes('liquidación') || text.includes('liquidacion') || text.includes('payroll')) {
                    c.scrollIntoView();
                    c.click();
                    return c.innerText.substring(0, 50);
                }
            }
            return null;
        });

        if (liquidacionFound) {
            console.log(`   💰 Módulo encontrado: ${liquidacionFound}`);
            await waitAndLog(page, 4000, 'Cargando liquidación');
            await ss(page, '11-modulo-liquidacion');

            // Verificar que tiene acceso a datos de usuarios
            const payrollInfo = await page.evaluate(() => {
                return {
                    hasEmployeeSelect: !!document.querySelector('select[name*="employee"], select[id*="employee"], #employeeSelect'),
                    hasTemplates: document.body.innerText.includes('Plantilla') || document.body.innerText.includes('plantilla'),
                    hasCategories: document.body.innerText.includes('Categoría') || document.body.innerText.includes('categoría'),
                    hasConvenio: document.body.innerText.includes('Convenio') || document.body.innerText.includes('convenio'),
                    hasConcepts: document.body.innerText.includes('Concepto') || document.body.innerText.includes('concepto'),
                    buttons: [...document.querySelectorAll('button')].map(b => b.innerText.substring(0, 25)).slice(0, 10)
                };
            });

            console.log(`   👥 Selector Empleados: ${payrollInfo.hasEmployeeSelect ? '✅' : '❌'}`);
            console.log(`   📋 Plantillas: ${payrollInfo.hasTemplates ? '✅' : '❌'}`);
            console.log(`   🏷️ Categorías: ${payrollInfo.hasCategories ? '✅' : '❌'}`);
            console.log(`   📜 Convenios: ${payrollInfo.hasConvenio ? '✅' : '❌'}`);
            console.log(`   💵 Conceptos: ${payrollInfo.hasConcepts ? '✅' : '❌'}`);

        } else {
            console.log('   ⚠️ Módulo Liquidación no encontrado en el grid');
        }

        // ========== FASE 11: VERIFICAR MÓDULO DMS ==========
        console.log('\n📌 FASE 11: VERIFICAR MÓDULO GESTIÓN DOCUMENTAL (DMS)');

        // Volver al grid
        await page.evaluate(() => {
            if (typeof window.goBackToModulesGrid === 'function') {
                window.goBackToModulesGrid();
            }
        });
        await page.waitForTimeout(2000);

        const dmsFound = await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const c of cards) {
                const text = c.innerText.toLowerCase();
                if (text.includes('documental') || text.includes('dms') || text.includes('documentos')) {
                    c.scrollIntoView();
                    c.click();
                    return c.innerText.substring(0, 50);
                }
            }
            return null;
        });

        if (dmsFound) {
            console.log(`   📁 Módulo encontrado: ${dmsFound}`);
            await waitAndLog(page, 4000, 'Cargando DMS');
            await ss(page, '12-modulo-dms');

            const dmsInfo = await page.evaluate(() => {
                return {
                    hasCategories: document.body.innerText.includes('Categoría') || document.body.innerText.includes('categoría'),
                    hasVersioning: document.body.innerText.includes('Versión') || document.body.innerText.includes('versión'),
                    hasUpload: !!document.querySelector('input[type="file"], button[onclick*="upload"]'),
                    hasSearch: !!document.querySelector('input[type="search"], input[placeholder*="buscar" i]'),
                    hasEmployeeFilter: document.body.innerText.includes('Empleado') || document.body.innerText.includes('empleado'),
                    docTypes: (document.body.innerText.match(/DNI|Pasaporte|Contrato|Licencia|Certificado/gi) || []).length
                };
            });

            console.log(`   📂 Categorías: ${dmsInfo.hasCategories ? '✅' : '❌'}`);
            console.log(`   🔢 Versionado: ${dmsInfo.hasVersioning ? '✅' : '❌'}`);
            console.log(`   📤 Upload: ${dmsInfo.hasUpload ? '✅' : '❌'}`);
            console.log(`   🔍 Búsqueda: ${dmsInfo.hasSearch ? '✅' : '❌'}`);
            console.log(`   👥 Filtro Empleado: ${dmsInfo.hasEmployeeFilter ? '✅' : '❌'}`);
            console.log(`   📄 Tipos Doc encontrados: ${dmsInfo.docTypes}`);

        } else {
            console.log('   ⚠️ Módulo DMS no encontrado en el grid');
        }

        // ========== FASE 12: VERIFICAR CENTRO DE NOTIFICACIONES ==========
        console.log('\n📌 FASE 12: VERIFICAR CENTRO DE NOTIFICACIONES');

        // Volver al grid
        await page.evaluate(() => {
            if (typeof window.goBackToModulesGrid === 'function') {
                window.goBackToModulesGrid();
            }
        });
        await page.waitForTimeout(2000);

        const notifCenterFound = await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const c of cards) {
                const text = c.innerText.toLowerCase();
                if (text.includes('notificaciones') || text.includes('notification')) {
                    c.scrollIntoView();
                    c.click();
                    return c.innerText.substring(0, 50);
                }
            }
            return null;
        });

        if (notifCenterFound) {
            console.log(`   🔔 Módulo encontrado: ${notifCenterFound}`);
            await waitAndLog(page, 4000, 'Cargando Centro Notificaciones');
            await ss(page, '13-centro-notificaciones');

            const notifCenterInfo = await page.evaluate(() => {
                return {
                    hasAlertTypes: document.body.innerText.includes('Tipo') || document.body.innerText.includes('tipo'),
                    hasExpiryAlerts: document.body.innerText.includes('vencimiento') || document.body.innerText.includes('Vencimiento'),
                    hasTemplates: document.body.innerText.includes('Plantilla') || document.body.innerText.includes('Template'),
                    hasChannels: document.body.innerText.includes('Email') || document.body.innerText.includes('WhatsApp'),
                    hasSLA: document.body.innerText.includes('SLA') || document.body.innerText.includes('urgente'),
                    hasWorkflows: document.body.innerText.includes('Workflow') || document.body.innerText.includes('workflow')
                };
            });

            console.log(`   📊 Tipos de Alerta: ${notifCenterInfo.hasAlertTypes ? '✅' : '❌'}`);
            console.log(`   ⏰ Alertas Vencimiento: ${notifCenterInfo.hasExpiryAlerts ? '✅' : '❌'}`);
            console.log(`   📝 Plantillas: ${notifCenterInfo.hasTemplates ? '✅' : '❌'}`);
            console.log(`   📨 Canales (Email/WhatsApp): ${notifCenterInfo.hasChannels ? '✅' : '❌'}`);
            console.log(`   ⚡ SLA: ${notifCenterInfo.hasSLA ? '✅' : '❌'}`);
            console.log(`   🔄 Workflows: ${notifCenterInfo.hasWorkflows ? '✅' : '❌'}`);

        } else {
            console.log('   ⚠️ Centro de Notificaciones no encontrado');
        }

        await ss(page, '14-test-finalizado');

        // ========== RESUMEN ==========
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN TEST INTEGRACIONES USUARIOS');
        console.log('='.repeat(70));
        console.log(`   📸 Screenshots: ${ssCounter} en ${SS_DIR}`);
        console.log('   ✅ Verificaciones completadas');
        console.log('='.repeat(70) + '\n');
    });
});
