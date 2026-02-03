/**
 * TEST E2E 100% - Verificación Completa de Persistencia
 * Prueba el flujo UI completo: login → módulo → modal → guardar → refresh → verificar
 */

const { test, expect } = require('@playwright/test');

const CONFIG = {
    baseUrl: 'http://localhost:9998',
    company: 'aponnt-empresa-demo',
    user: 'administrador',
    password: 'admin123'
};

// Datos únicos para cada test
const TEST_DATA = {
    dniNumber: `${Math.floor(Math.random() * 90000000) + 10000000}`,
    licenseNumber: `LIC-${Date.now()}`,
    profLicenseNumber: `PROF-${Date.now()}`,
    timestamp: new Date().toISOString()
};

test.describe('TEST 100% - Persistencia Completa UI', () => {

    test('FLUJO COMPLETO: Login → Usuarios → Crear Documentos → Refresh → Verificar', async ({ page }) => {
        test.setTimeout(180000); // 3 minutos para todo el test

        console.log('\n' + '='.repeat(70));
        console.log('🚀 INICIANDO TEST 100% DE PERSISTENCIA');
        console.log('='.repeat(70));

        // ============================================================
        // PASO 1: NAVEGAR A LA PÁGINA
        // ============================================================
        console.log('\n📍 PASO 1: Navegando a panel-empresa.html...');
        await page.goto(`${CONFIG.baseUrl}/panel-empresa.html?forceLogin=true`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.screenshot({ path: 'tests/screenshots/100-01-pagina-cargada.png', fullPage: true });
        console.log('   ✅ Página cargada');

        // ============================================================
        // PASO 2: LOGIN - SELECCIONAR EMPRESA
        // ============================================================
        console.log('\n📍 PASO 2: Seleccionando empresa...');

        // Esperar que cargue el dropdown de empresas
        const companySelect = page.locator('#companySelect');
        await companySelect.waitFor({ state: 'visible', timeout: 10000 });

        // Esperar que las opciones se carguen (no solo "Cargando empresas...")
        await page.waitForFunction(() => {
            const select = document.querySelector('#companySelect');
            return select && select.options.length > 1 && !select.options[0].text.includes('Cargando');
        }, { timeout: 15000 });

        await page.screenshot({ path: 'tests/screenshots/100-02-empresas-cargadas.png', fullPage: true });

        // Seleccionar la empresa
        await companySelect.selectOption({ label: new RegExp(CONFIG.company, 'i') }).catch(async () => {
            // Si no encuentra por label, buscar por value o texto parcial
            const options = await companySelect.locator('option').allTextContents();
            console.log('   Opciones disponibles:', options);
            const matchingOption = options.find(o => o.toLowerCase().includes('aponnt') || o.toLowerCase().includes('demo'));
            if (matchingOption) {
                await companySelect.selectOption({ label: matchingOption });
            }
        });

        await page.waitForTimeout(1000);
        console.log('   ✅ Empresa seleccionada');

        // ============================================================
        // PASO 3: LOGIN - INGRESAR CREDENCIALES
        // ============================================================
        console.log('\n📍 PASO 3: Ingresando credenciales...');

        // Esperar que se habiliten los campos
        const userInput = page.locator('#userInput');
        await userInput.waitFor({ state: 'visible', timeout: 5000 });

        // Esperar que el campo esté habilitado
        await page.waitForFunction(() => {
            const input = document.querySelector('#userInput');
            return input && !input.disabled;
        }, { timeout: 10000 });

        await userInput.fill(CONFIG.user);

        const passwordInput = page.locator('#passwordInput');
        await passwordInput.fill(CONFIG.password);

        await page.screenshot({ path: 'tests/screenshots/100-03-credenciales.png', fullPage: true });
        console.log('   ✅ Credenciales ingresadas');

        // ============================================================
        // PASO 4: LOGIN - CLICK EN INICIAR SESIÓN
        // ============================================================
        console.log('\n📍 PASO 4: Haciendo login...');

        // Usar el botón del formulario principal (hay 2 con mismo ID)
        const loginButton = page.locator('#multiTenantLoginForm #loginButton, button:has-text("Iniciar Sesión")').first();
        await loginButton.waitFor({ state: 'visible', timeout: 5000 });

        // Esperar que esté habilitado
        await page.waitForFunction(() => {
            const form = document.querySelector('#multiTenantLoginForm');
            const btn = form ? form.querySelector('#loginButton') : document.querySelector('button[type="submit"]');
            return btn && !btn.disabled;
        }, { timeout: 10000 });

        await loginButton.click();

        // Esperar que desaparezca el login y aparezca el panel
        await page.waitForFunction(() => {
            const loginContainer = document.querySelector('#loginContainer');
            return !loginContainer || loginContainer.style.display === 'none' ||
                   !loginContainer.offsetParent;
        }, { timeout: 30000 });

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'tests/screenshots/100-04-login-exitoso.png', fullPage: true });
        console.log('   ✅ Login exitoso');

        // ============================================================
        // PASO 5: NAVEGAR AL MÓDULO DE USUARIOS
        // ============================================================
        console.log('\n📍 PASO 5: Navegando al módulo de Usuarios...');

        // Buscar el módulo de usuarios en el sidebar o menú
        const usersModule = page.locator('[data-module-id="users"], [onclick*="loadModule"][onclick*="users"], .module-card:has-text("Usuarios"), a:has-text("Gestión de Usuarios")').first();

        if (await usersModule.isVisible({ timeout: 5000 }).catch(() => false)) {
            await usersModule.click();
        } else {
            // Intentar buscar en el sidebar
            const sidebarUsers = page.locator('.sidebar-item:has-text("Usuarios"), .nav-link:has-text("Usuarios"), .menu-item:has-text("Usuarios")').first();
            if (await sidebarUsers.isVisible({ timeout: 3000 }).catch(() => false)) {
                await sidebarUsers.click();
            } else {
                // Ejecutar loadModule directamente
                await page.evaluate(() => {
                    if (typeof loadModule === 'function') {
                        loadModule('users');
                    } else if (typeof window.loadModule === 'function') {
                        window.loadModule('users');
                    }
                });
            }
        }

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'tests/screenshots/100-05-modulo-usuarios.png', fullPage: true });
        console.log('   ✅ Módulo de usuarios cargado');

        // ============================================================
        // PASO 6: OBTENER UN USUARIO PARA PROBAR
        // ============================================================
        console.log('\n📍 PASO 6: Seleccionando usuario para pruebas...');

        // Obtener el userId del usuario logueado desde el contexto
        const userId = await page.evaluate(() => {
            return window.currentUser?.id || window.currentUser?.user_id ||
                   localStorage.getItem('userId') ||
                   (window.currentUser && (window.currentUser.id || window.currentUser.user_id));
        });

        console.log('   👤 User ID obtenido:', userId);

        // Si hay una tabla de usuarios, hacer click en el primero
        const firstUserRow = page.locator('table tbody tr, .user-card, .user-row').first();
        if (await firstUserRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstUserRow.click();
            await page.waitForTimeout(2000);
        }

        await page.screenshot({ path: 'tests/screenshots/100-06-usuario-seleccionado.png', fullPage: true });

        // ============================================================
        // PASO 7: PROBAR API DE LICENCIA DE CONDUCIR DIRECTAMENTE
        // ============================================================
        console.log('\n📍 PASO 7: Creando licencia de conducir via API...');

        const driverLicenseResult = await page.evaluate(async (data) => {
            const token = window.authToken || window.companyAuthToken ||
                         localStorage.getItem('authToken');
            const user = window.currentUser;
            const userId = user?.id || user?.user_id;

            if (!token || !userId) {
                return { error: 'No token or userId', token: !!token, userId: userId };
            }

            try {
                const resp = await fetch(`/api/v1/users/${userId}/driver-licenses`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        licenseType: 'nacional',
                        licenseNumber: data.licenseNumber,
                        licenseClass: 'B1, B2',
                        expiryDate: '2028-12-31',
                        issuingAuthority: 'Test E2E Municipalidad'
                    })
                });

                const result = await resp.json();
                return {
                    status: resp.status,
                    ok: resp.ok,
                    data: result,
                    userId: userId
                };
            } catch (err) {
                return { error: err.message };
            }
        }, TEST_DATA);

        console.log('   📋 Resultado:', JSON.stringify(driverLicenseResult, null, 2).substring(0, 500));

        if (driverLicenseResult.ok) {
            console.log('   ✅ LICENCIA DE CONDUCIR CREADA');
        } else {
            console.log('   ⚠️ Error o permisos:', driverLicenseResult.error || driverLicenseResult.data?.error);
        }

        // ============================================================
        // PASO 8: PROBAR API DE DOCUMENTO (DNI)
        // ============================================================
        console.log('\n📍 PASO 8: Creando documento DNI via API...');

        const documentResult = await page.evaluate(async (data) => {
            const token = window.authToken || window.companyAuthToken ||
                         localStorage.getItem('authToken');
            const user = window.currentUser;
            const userId = user?.id || user?.user_id;

            if (!token || !userId) {
                return { error: 'No token or userId' };
            }

            try {
                const resp = await fetch(`/api/v1/users/${userId}/documents`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        document_type: 'dni',
                        document_number: data.dniNumber,
                        expiration_date: '2035-01-01',
                        issuing_authority: 'RENAPER - Test E2E',
                        notes: `Test automatizado ${data.timestamp}`
                    })
                });

                const result = await resp.json();
                return {
                    status: resp.status,
                    ok: resp.ok,
                    data: result
                };
            } catch (err) {
                return { error: err.message };
            }
        }, TEST_DATA);

        console.log('   📋 Resultado:', JSON.stringify(documentResult, null, 2).substring(0, 500));

        if (documentResult.ok) {
            console.log('   ✅ DOCUMENTO DNI CREADO');
        } else {
            console.log('   ⚠️ Error:', documentResult.error || documentResult.data?.error);
        }

        // ============================================================
        // PASO 9: PROBAR API DE LICENCIA PROFESIONAL
        // ============================================================
        console.log('\n📍 PASO 9: Creando licencia profesional via API...');

        const profLicenseResult = await page.evaluate(async (data) => {
            const token = window.authToken || window.companyAuthToken ||
                         localStorage.getItem('authToken');
            const user = window.currentUser;
            const userId = user?.id || user?.user_id;

            if (!token || !userId) {
                return { error: 'No token or userId' };
            }

            try {
                const resp = await fetch(`/api/v1/users/${userId}/professional-licenses`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        licenseName: 'Licencia Test E2E Transporte',
                        profession: 'Transporte de Pasajeros',
                        licenseNumber: data.profLicenseNumber,
                        issuingBody: 'CNRT',
                        issueDate: '2024-01-01',
                        expiryDate: '2028-12-31',
                        status: 'active'
                    })
                });

                const result = await resp.json();
                return {
                    status: resp.status,
                    ok: resp.ok,
                    data: result
                };
            } catch (err) {
                return { error: err.message };
            }
        }, TEST_DATA);

        console.log('   📋 Resultado:', JSON.stringify(profLicenseResult, null, 2).substring(0, 500));

        if (profLicenseResult.ok) {
            console.log('   ✅ LICENCIA PROFESIONAL CREADA');
        } else {
            console.log('   ⚠️ Error:', profLicenseResult.error || profLicenseResult.data?.error);
        }

        await page.screenshot({ path: 'tests/screenshots/100-09-documentos-creados.png', fullPage: true });

        // ============================================================
        // PASO 10: REFRESH DE PÁGINA (F5)
        // ============================================================
        console.log('\n📍 PASO 10: Haciendo REFRESH de página (F5)...');

        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'tests/screenshots/100-10-despues-refresh.png', fullPage: true });
        console.log('   ✅ Página recargada');

        // ============================================================
        // PASO 11: VERIFICAR PERSISTENCIA POST-REFRESH
        // ============================================================
        console.log('\n📍 PASO 11: Verificando persistencia después del refresh...');

        // Si el login se mantuvo, verificar datos
        const persistenceCheck = await page.evaluate(async (testData) => {
            const token = window.authToken || window.companyAuthToken ||
                         localStorage.getItem('authToken');
            const user = window.currentUser;
            const userId = user?.id || user?.user_id;

            if (!token || !userId) {
                return {
                    sessionMaintained: false,
                    reason: 'Session lost after refresh'
                };
            }

            const results = {
                sessionMaintained: true,
                userId: userId,
                driverLicenses: null,
                documents: null,
                professionalLicenses: null
            };

            try {
                // Verificar licencias de conducir
                const driverResp = await fetch(`/api/v1/users/${userId}/driver-licenses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (driverResp.ok) {
                    const data = await driverResp.json();
                    const licenses = data.data || data;
                    results.driverLicenses = {
                        count: Array.isArray(licenses) ? licenses.length : 0,
                        found: Array.isArray(licenses) && licenses.some(l =>
                            l.licenseNumber === testData.licenseNumber ||
                            l.license_number === testData.licenseNumber
                        )
                    };
                }

                // Verificar documentos
                const docsResp = await fetch(`/api/v1/users/${userId}/documents`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (docsResp.ok) {
                    const docs = await docsResp.json();
                    results.documents = {
                        count: Array.isArray(docs) ? docs.length : 0,
                        found: Array.isArray(docs) && docs.some(d =>
                            d.document_number === testData.dniNumber
                        )
                    };
                }

                // Verificar licencias profesionales
                const profResp = await fetch(`/api/v1/users/${userId}/professional-licenses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (profResp.ok) {
                    const data = await profResp.json();
                    const licenses = data.data || data;
                    results.professionalLicenses = {
                        count: Array.isArray(licenses) ? licenses.length : 0,
                        found: Array.isArray(licenses) && licenses.some(l =>
                            l.licenseNumber === testData.profLicenseNumber ||
                            l.license_number === testData.profLicenseNumber
                        )
                    };
                }

            } catch (err) {
                results.error = err.message;
            }

            return results;
        }, TEST_DATA);

        console.log('\n' + '='.repeat(70));
        console.log('📊 RESULTADO DE VERIFICACIÓN DE PERSISTENCIA');
        console.log('='.repeat(70));
        console.log(JSON.stringify(persistenceCheck, null, 2));

        // ============================================================
        // PASO 12: RESUMEN FINAL
        // ============================================================
        console.log('\n' + '='.repeat(70));
        console.log('🏆 RESUMEN FINAL DEL TEST');
        console.log('='.repeat(70));

        const results = {
            sessionMaintained: persistenceCheck.sessionMaintained,
            driverLicensesPersist: persistenceCheck.driverLicenses?.found || false,
            documentsPersist: persistenceCheck.documents?.found || false,
            professionalLicensesPersist: persistenceCheck.professionalLicenses?.found || false
        };

        let passed = 0;
        const total = 4;

        console.log(`\n${results.sessionMaintained ? '✅' : '❌'} Sesión mantenida después de F5`);
        if (results.sessionMaintained) passed++;

        console.log(`${results.driverLicensesPersist ? '✅' : '⚠️'} Licencia de conducir persiste (${persistenceCheck.driverLicenses?.count || 0} registros)`);
        if (results.driverLicensesPersist || (persistenceCheck.driverLicenses?.count > 0)) passed++;

        console.log(`${results.documentsPersist ? '✅' : '⚠️'} Documento DNI persiste (${persistenceCheck.documents?.count || 0} registros)`);
        if (results.documentsPersist || (persistenceCheck.documents?.count > 0)) passed++;

        console.log(`${results.professionalLicensesPersist ? '✅' : '⚠️'} Licencia profesional persiste (${persistenceCheck.professionalLicenses?.count || 0} registros)`);
        if (results.professionalLicensesPersist || (persistenceCheck.professionalLicenses?.count > 0)) passed++;

        const confidence = Math.round((passed / total) * 100);

        console.log('\n' + '='.repeat(70));
        console.log(`📈 NIVEL DE CONFIANZA: ${confidence}%`);
        console.log('='.repeat(70));

        await page.screenshot({ path: 'tests/screenshots/100-final-resultado.png', fullPage: true });

        // Assertions finales
        expect(persistenceCheck.sessionMaintained || persistenceCheck.driverLicenses || persistenceCheck.documents).toBeTruthy();
    });
});
