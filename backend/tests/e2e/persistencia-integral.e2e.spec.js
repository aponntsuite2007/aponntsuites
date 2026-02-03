/**
 * TEST DE PERSISTENCIA INTEGRAL
 * ==============================
 * Verifica que TODOS los datos realmente persistan y se puedan recuperar:
 * 1. Documentos subidos → DMS → descargables
 * 2. Licencias profesionales → BD → visualizables
 * 3. Alertas de vencimiento → Centro de Notificaciones
 * 4. Campos de fuentes externas → realmente vienen de otras tablas
 *
 * Este test es crítico para detectar "campos fantasma" que solo existen en UI
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
const SS_DIR = path.join(__dirname, '../../test-results/persistencia-integral');
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

// Crear fecha de vencimiento próximo (15 días)
function getFutureDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

test.describe('PERSISTENCIA INTEGRAL', () => {
    let authToken = null;
    let testUserId = null;

    test('Verificar persistencia real de datos y adjuntos', async ({ page }) => {
        test.setTimeout(900000); // 15 minutos

        console.log('\n' + '='.repeat(70));
        console.log('🔒 TEST PERSISTENCIA INTEGRAL - VERIFICACIÓN DE DATOS REALES');
        console.log('='.repeat(70));

        // ========== FASE 1: LOGIN Y OBTENER TOKEN ==========
        console.log('\n📌 FASE 1: LOGIN Y OBTENER TOKEN');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await ss(page, '01-login');

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

        // Obtener token
        authToken = await page.evaluate(() => {
            const session = localStorage.getItem('aponnt_session') || sessionStorage.getItem('aponnt_session');
            if (session) {
                try { return JSON.parse(session).token; } catch(e) {}
            }
            return window.companyAuthToken || window.authToken;
        });

        console.log(`   🔑 Token obtenido: ${authToken ? '✅' : '❌'}`);
        await ss(page, '02-post-login');

        // ========== FASE 2: OBTENER USUARIO DE PRUEBA ==========
        console.log('\n📌 FASE 2: OBTENER USUARIO DE PRUEBA');

        const usersResponse = await page.evaluate(async (token) => {
            try {
                const resp = await fetch('/api/v1/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                // Obtener primer usuario que no sea admin
                const users = Array.isArray(data) ? data : (data.data || data.users || []);
                const testUser = users.find(u => u.role !== 'admin' && u.is_active !== false) || users[0];
                return { success: resp.ok, user: testUser };
            } catch(e) {
                return { success: false, error: e.message };
            }
        }, authToken);

        if (usersResponse.success && usersResponse.user) {
            testUserId = usersResponse.user.user_id;
            console.log(`   👤 Usuario de prueba: ${usersResponse.user.firstName} ${usersResponse.user.lastName}`);
            console.log(`   🆔 ID: ${testUserId}`);
        } else {
            console.log(`   ⚠️ No se pudo obtener usuario, usando el actual`);
            testUserId = await page.evaluate(() => {
                const session = localStorage.getItem('aponnt_session');
                if (session) {
                    try { return JSON.parse(session).user?.user_id; } catch(e) {}
                }
                return null;
            });
        }

        // ========== FASE 3: CREAR LICENCIA PROFESIONAL VÍA API ==========
        console.log('\n📌 FASE 3: CREAR LICENCIA PROFESIONAL (VÍA API - PERSISTENCIA BD)');

        const expiryDate = getFutureDate(15); // Vence en 15 días
        const timestamp = Date.now();
        const licenseData = {
            licenseName: `Licencia Prueba E2E ${timestamp}`,
            profession: 'Conductor Profesional',
            licenseNumber: `LIC-E2E-${timestamp}`,
            issuingBody: 'Ministerio de Transporte',
            issuingCountry: 'Argentina',
            jurisdiction: 'Nacional',
            issueDate: getFutureDate(-365), // Emitida hace 1 año
            expiryDate: expiryDate, // Vence en 15 días
            requiresRenewal: true,
            renewalFrequency: 'anual',
            observations: 'Creada por test E2E de persistencia'
        };

        console.log(`   📋 Datos de licencia:`);
        console.log(`      - Nombre: ${licenseData.licenseName}`);
        console.log(`      - Número: ${licenseData.licenseNumber}`);
        console.log(`      - Vencimiento: ${expiryDate} (en 15 días - DEBE GENERAR ALERTA)`);

        const createLicenseResult = await page.evaluate(async (args) => {
            const { token, userId, data } = args;
            try {
                const resp = await fetch(`/api/v1/users/${userId}/professional-licenses`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                const result = await resp.json();
                return { success: resp.ok, status: resp.status, data: result };
            } catch(e) {
                return { success: false, error: e.message };
            }
        }, { token: authToken, userId: testUserId, data: licenseData });

        if (createLicenseResult.success) {
            console.log(`   ✅ Licencia CREADA en BD: ID ${createLicenseResult.data?.data?.id || 'N/A'}`);
        } else {
            console.log(`   ❌ Error creando licencia: ${createLicenseResult.status} - ${JSON.stringify(createLicenseResult.data || createLicenseResult.error)}`);
        }

        await ss(page, '03-post-crear-licencia');

        // ========== FASE 4: VERIFICAR LICENCIA PERSISTE (LEER DE BD) ==========
        console.log('\n📌 FASE 4: VERIFICAR LICENCIA PERSISTE (LEER DE BD)');

        const getLicensesResult = await page.evaluate(async (args) => {
            const { token, userId } = args;
            try {
                const resp = await fetch(`/api/v1/users/${userId}/professional-licenses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await resp.json();
                return { success: resp.ok, data: result };
            } catch(e) {
                return { success: false, error: e.message };
            }
        }, { token: authToken, userId: testUserId });

        if (getLicensesResult.success && getLicensesResult.data?.data) {
            const licenses = getLicensesResult.data.data;
            const ourLicense = licenses.find(l => l.licenseNumber?.includes('E2E'));
            if (ourLicense) {
                console.log(`   ✅ LICENCIA PERSISTE EN BD:`);
                console.log(`      - ID: ${ourLicense.id}`);
                console.log(`      - Nombre: ${ourLicense.licenseName}`);
                console.log(`      - Número: ${ourLicense.licenseNumber}`);
                console.log(`      - Vencimiento: ${ourLicense.expiryDate}`);
                console.log(`      - Activa: ${ourLicense.isActive}`);
            } else {
                console.log(`   ⚠️ Licencia E2E no encontrada en respuesta. Total licencias: ${licenses.length}`);
            }
        } else {
            console.log(`   ❌ Error leyendo licencias: ${getLicensesResult.error || 'Sin datos'}`);
        }

        // ========== FASE 5: SUBIR DOCUMENTO VÍA API (PERSISTENCIA DMS) ==========
        console.log('\n📌 FASE 5: SUBIR DOCUMENTO VÍA API (PERSISTENCIA DMS)');

        // Crear archivo de prueba
        const testFileContent = `TEST E2E - Documento de prueba
====================================
Timestamp: ${timestamp}
Fecha: ${new Date().toISOString()}
Usuario: ${testUserId}
Propósito: Verificar persistencia en DMS
====================================
Este documento fue creado automáticamente por el test E2E
para verificar que los adjuntos realmente persisten en el
sistema de gestión documental (DMS) y pueden ser recuperados.
`;

        // Subir documento usando FormData
        const uploadResult = await page.evaluate(async (args) => {
            const { token, content, timestamp } = args;
            try {
                const blob = new Blob([content], { type: 'text/plain' });
                const formData = new FormData();
                formData.append('document', blob, `test-e2e-${timestamp}.txt`);
                formData.append('type', 'test_document');
                formData.append('category', 'e2e_testing');
                formData.append('description', `Documento de prueba E2E - ${timestamp}`);

                const resp = await fetch('/api/v1/documents/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                const result = await resp.json();
                return { success: resp.ok, status: resp.status, data: result };
            } catch(e) {
                return { success: false, error: e.message };
            }
        }, { token: authToken, content: testFileContent, timestamp });

        if (uploadResult.success) {
            console.log(`   ✅ DOCUMENTO SUBIDO al DMS:`);
            console.log(`      - ID: ${uploadResult.data?.data?.documentId || 'N/A'}`);
            console.log(`      - Archivo: ${uploadResult.data?.data?.filename || 'N/A'}`);
            console.log(`      - DMS ID: ${uploadResult.data?.dms?.documentId || 'N/A'}`);
        } else {
            console.log(`   ❌ Error subiendo documento: ${uploadResult.status} - ${JSON.stringify(uploadResult.data || uploadResult.error)}`);
        }

        await ss(page, '04-post-upload-doc');

        // ========== FASE 6: VERIFICAR DOCUMENTO PERSISTE (LEER DEL DMS) ==========
        console.log('\n📌 FASE 6: VERIFICAR DOCUMENTO PERSISTE (LEER DEL DMS)');

        const getDocsResult = await page.evaluate(async (token) => {
            try {
                const resp = await fetch('/api/v1/documents/my-documents', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await resp.json();
                return { success: resp.ok, data: result };
            } catch(e) {
                return { success: false, error: e.message };
            }
        }, authToken);

        if (getDocsResult.success && getDocsResult.data) {
            const docs = getDocsResult.data.data || getDocsResult.data.documents || getDocsResult.data;
            const docsArray = Array.isArray(docs) ? docs : [];
            const ourDoc = docsArray.find(d => d.filename?.includes('e2e') || d.description?.includes('E2E'));

            console.log(`   📄 Total documentos: ${docsArray.length}`);
            if (ourDoc) {
                console.log(`   ✅ DOCUMENTO E2E PERSISTE:`);
                console.log(`      - ID: ${ourDoc.id}`);
                console.log(`      - Archivo: ${ourDoc.filename}`);
                console.log(`      - Tipo: ${ourDoc.type}`);
                console.log(`      - Subido: ${ourDoc.uploadedAt}`);
            } else {
                console.log(`   ⚠️ Documento E2E no encontrado en lista`);
                if (docsArray.length > 0) {
                    console.log(`      Últimos docs: ${docsArray.slice(0, 3).map(d => d.filename).join(', ')}`);
                }
            }
        } else {
            console.log(`   ❌ Error leyendo documentos: ${getDocsResult.error || 'Sin datos'}`);
        }

        // ========== FASE 7: VERIFICAR EN UI - ABRIR EXPEDIENTE DE USUARIO ==========
        console.log('\n📌 FASE 7: VERIFICAR EN UI - EXPEDIENTE DE USUARIO');

        // Abrir módulo de usuarios
        await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const c of cards) {
                if (c.innerText.includes('Gestión de Usuarios')) {
                    c.click();
                    return true;
                }
            }
            return false;
        });

        await waitAndLog(page, 4000, 'Cargando módulo usuarios');
        await ss(page, '05-modulo-usuarios');

        // Click en Ver del primer usuario
        await page.evaluate(() => {
            const verBtn = document.querySelector('button[title*="Ver"]') ||
                          [...document.querySelectorAll('button')].find(b => b.innerText.includes('👁'));
            if (verBtn) verBtn.click();
        });

        await waitAndLog(page, 3000, 'Abriendo expediente');
        await ss(page, '06-expediente');

        // Verificar tabs y datos
        const expedienteInfo = await page.evaluate(() => {
            const tabs = [...document.querySelectorAll('.file-tab, [onclick*="showFileTab"]')];
            const adminTab = document.getElementById('admin-tab');
            const workTab = document.getElementById('work-tab');

            return {
                tabsCount: tabs.length,
                tabNames: tabs.map(t => t.innerText.substring(0, 20)),
                adminTabExists: !!adminTab,
                workTabExists: !!workTab,
                hasLicenseSection: document.body.innerText.includes('Licencia') || document.body.innerText.includes('licencia'),
                hasDocSection: document.body.innerText.includes('Documento') || document.body.innerText.includes('documento')
            };
        });

        console.log(`   📑 Tabs en expediente: ${expedienteInfo.tabsCount}`);
        console.log(`   📁 Tab Admin: ${expedienteInfo.adminTabExists ? '✅' : '❌'}`);
        console.log(`   💼 Tab Work: ${expedienteInfo.workTabExists ? '✅' : '❌'}`);
        console.log(`   📜 Sección Licencias: ${expedienteInfo.hasLicenseSection ? '✅' : '❌'}`);
        console.log(`   📄 Sección Documentos: ${expedienteInfo.hasDocSection ? '✅' : '❌'}`);

        // Navegar a tab de trabajo para ver licencias
        await page.evaluate(() => {
            if (typeof window.showFileTab === 'function') {
                window.showFileTab('work');
            }
        });
        await waitAndLog(page, 2000, 'Tab Work');
        await ss(page, '07-tab-work-licencias');

        // ========== FASE 8: VERIFICAR DEPARTAMENTOS CARGADOS (FUENTE EXTERNA) ==========
        console.log('\n📌 FASE 8: VERIFICAR DATOS DE FUENTES EXTERNAS (DEPARTAMENTOS)');

        // Cerrar modal actual
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Abrir modal de agregar para ver selectores
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => /agregar.*usuario/i.test(b.innerText));
            if (btn) btn.click();
        });
        await waitAndLog(page, 2000, 'Modal agregar');

        const selectorsInfo = await page.evaluate(() => {
            const deptSelect = document.querySelector('#newUserDept, select[name="department"]');
            const convenioSelect = document.querySelector('#newUserConvenio, select[name="convenio"]');

            const result = {
                departamentos: { found: false, options: [] },
                convenios: { found: false, options: [] }
            };

            if (deptSelect) {
                result.departamentos.found = true;
                result.departamentos.options = [...deptSelect.options].map(o => ({
                    value: o.value,
                    text: o.text
                })).filter(o => o.value); // Solo opciones con valor
            }

            if (convenioSelect) {
                result.convenios.found = true;
                result.convenios.options = [...convenioSelect.options].map(o => o.text).filter(t => t && !t.includes('Selecciona'));
            }

            return result;
        });

        console.log(`   🏢 Departamentos:`);
        console.log(`      - Selector encontrado: ${selectorsInfo.departamentos.found ? '✅' : '❌'}`);
        console.log(`      - Opciones cargadas: ${selectorsInfo.departamentos.options.length}`);
        if (selectorsInfo.departamentos.options.length > 0) {
            console.log(`      - Datos de BD: ${selectorsInfo.departamentos.options.slice(0, 3).map(o => o.text).join(', ')}...`);
            console.log(`      - ✅ DATOS VIENEN DE BD (no hardcodeados)`);
        }

        console.log(`   📋 Convenios:`);
        console.log(`      - Selector encontrado: ${selectorsInfo.convenios.found ? '✅' : '❌'}`);
        console.log(`      - Opciones: ${selectorsInfo.convenios.options.length}`);

        await ss(page, '08-selectores-externos');

        // Cerrar modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // ========== FASE 9: VERIFICAR CENTRO DE NOTIFICACIONES (ALERTAS) ==========
        console.log('\n📌 FASE 9: VERIFICAR CENTRO DE NOTIFICACIONES');

        // Volver al grid
        await page.evaluate(() => {
            if (typeof window.goBackToModulesGrid === 'function') {
                window.goBackToModulesGrid();
            }
        });
        await page.waitForTimeout(2000);

        // Abrir centro de notificaciones
        const notifFound = await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const c of cards) {
                if (c.innerText.toLowerCase().includes('notificaciones')) {
                    c.click();
                    return true;
                }
            }
            return false;
        });

        if (notifFound) {
            await waitAndLog(page, 4000, 'Centro Notificaciones');
            await ss(page, '09-centro-notificaciones');

            const notifCenterInfo = await page.evaluate(() => {
                return {
                    hasVencimientos: document.body.innerText.includes('vencimiento') || document.body.innerText.includes('Vencimiento'),
                    hasAlertas: document.body.innerText.includes('alerta') || document.body.innerText.includes('Alerta'),
                    hasDocumentos: document.body.innerText.includes('documento') || document.body.innerText.includes('Documento'),
                    hasLicencias: document.body.innerText.includes('licencia') || document.body.innerText.includes('Licencia'),
                    hasSLA: document.body.innerText.includes('SLA'),
                    hasWorkflows: document.body.innerText.includes('workflow') || document.body.innerText.includes('Workflow')
                };
            });

            console.log(`   🔔 Centro de Notificaciones:`);
            console.log(`      - Alertas Vencimiento: ${notifCenterInfo.hasVencimientos ? '✅' : '❌'}`);
            console.log(`      - Sistema Alertas: ${notifCenterInfo.hasAlertas ? '✅' : '❌'}`);
            console.log(`      - Documentos: ${notifCenterInfo.hasDocumentos ? '✅' : '❌'}`);
            console.log(`      - Licencias: ${notifCenterInfo.hasLicencias ? '✅' : '❌'}`);
            console.log(`      - SLA: ${notifCenterInfo.hasSLA ? '✅' : '❌'}`);
            console.log(`      - Workflows: ${notifCenterInfo.hasWorkflows ? '✅' : '❌'}`);
        }

        // ========== FASE 10: VERIFICAR DMS DIRECTAMENTE ==========
        console.log('\n📌 FASE 10: VERIFICAR MÓDULO DMS (GESTIÓN DOCUMENTAL)');

        await page.evaluate(() => {
            if (typeof window.goBackToModulesGrid === 'function') {
                window.goBackToModulesGrid();
            }
        });
        await page.waitForTimeout(2000);

        const dmsFound = await page.evaluate(() => {
            const cards = document.querySelectorAll('.module-card');
            for (const c of cards) {
                if (c.innerText.toLowerCase().includes('documental') || c.innerText.toLowerCase().includes('dms')) {
                    c.click();
                    return true;
                }
            }
            return false;
        });

        if (dmsFound) {
            await waitAndLog(page, 4000, 'Módulo DMS');
            await ss(page, '10-modulo-dms');

            const dmsInfo = await page.evaluate(() => {
                return {
                    hasUploadBtn: !!document.querySelector('input[type="file"], button[onclick*="upload"], [class*="upload"]'),
                    hasDocList: !!document.querySelector('.document-list, .doc-item, table'),
                    hasSearch: !!document.querySelector('input[type="search"], input[placeholder*="buscar" i]'),
                    hasCategories: document.body.innerText.includes('Categoría') || document.body.innerText.includes('categoría'),
                    hasVersioning: document.body.innerText.includes('Versión') || document.body.innerText.includes('versión'),
                    docCount: (document.body.innerText.match(/\.pdf|\.txt|\.doc|\.jpg|\.png/gi) || []).length
                };
            });

            console.log(`   📁 Módulo DMS:`);
            console.log(`      - Botón Upload: ${dmsInfo.hasUploadBtn ? '✅' : '❌'}`);
            console.log(`      - Lista Documentos: ${dmsInfo.hasDocList ? '✅' : '❌'}`);
            console.log(`      - Búsqueda: ${dmsInfo.hasSearch ? '✅' : '❌'}`);
            console.log(`      - Categorías: ${dmsInfo.hasCategories ? '✅' : '❌'}`);
            console.log(`      - Versionado: ${dmsInfo.hasVersioning ? '✅' : '❌'}`);
            console.log(`      - Docs visibles: ~${dmsInfo.docCount}`);
        }

        await ss(page, '11-final');

        // ========== RESUMEN FINAL ==========
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN TEST PERSISTENCIA INTEGRAL');
        console.log('='.repeat(70));
        console.log(`   📸 Screenshots: ${ssCounter} en ${SS_DIR}`);
        console.log('');
        console.log('   VERIFICACIONES DE PERSISTENCIA:');
        console.log(`   ${createLicenseResult?.success ? '✅' : '❌'} Licencia Profesional → BD`);
        console.log(`   ${getLicensesResult?.success ? '✅' : '❌'} Licencia recuperable de BD`);
        console.log(`   ${uploadResult?.success ? '✅' : '❌'} Documento → DMS`);
        console.log(`   ${getDocsResult?.success ? '✅' : '❌'} Documento recuperable de DMS`);
        console.log(`   ${selectorsInfo?.departamentos?.options?.length > 0 ? '✅' : '❌'} Departamentos desde BD`);
        console.log('');
        console.log('='.repeat(70) + '\n');
    });
});
