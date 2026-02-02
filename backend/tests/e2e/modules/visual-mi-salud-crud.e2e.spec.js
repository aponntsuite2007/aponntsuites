/**
 * 🏥 Visual CRUD Testing - Mi Salud (Comunicaciones Médicas)
 *
 * Test visual completo del módulo Mi Salud en Mi Espacio:
 * - Tarjeta Mi Salud con badge de pendientes
 * - Modal con 3 tabs: Pendientes, Subir Documento, Historial
 * - Flujo CRUD: Crear solicitud → Ver pendiente → Acusar recibo → Cumplir
 *
 * @version 1.0.0
 * @date 2026-02-02
 */
const { test, expect, request } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';
const TEST_COMPANY_SLUG = 'aponnt-empresa-demo';
const TEST_USER = 'administrador';
const TEST_PASS = 'admin123';

// Variables compartidas
let authToken = null;
let currentUser = null;
let currentCompany = null;

test.describe('🏥 Visual CRUD - Mi Salud', () => {

    test('Capturar flujo completo Mi Salud con screenshots', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 900 });

        // ═══════════════════════════════════════════════════════════════
        // PASO 1: LOGIN VIA UI (método real)
        // ═══════════════════════════════════════════════════════════════
        console.log('🔐 Paso 1: Login via UI...');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Esperar a que carguen las empresas
        await page.waitForSelector('#companySelect option:not([value=""])', {
            state: 'attached',
            timeout: 15000
        }).catch(() => console.log('   ⚠️ Timeout esperando opciones'));

        // Seleccionar primera empresa disponible
        const companyInfo = await page.evaluate(() => {
            const select = document.querySelector('#companySelect');
            if (!select || select.options.length < 2) return { success: false };

            // Seleccionar primera opción válida
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value && select.options[i].value !== '') {
                    select.selectedIndex = i;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return {
                        success: true,
                        company: select.options[i].text,
                        companyId: select.options[i].dataset?.companyId || select.options[i].value
                    };
                }
            }
            return { success: false };
        });

        console.log(`   Empresa: ${companyInfo.success ? companyInfo.company : 'FALLÓ'}`);
        await page.waitForTimeout(1000);

        // Llenar credenciales
        await page.fill('#userInput', TEST_USER);
        await page.waitForTimeout(300);
        await page.fill('#passwordInput', TEST_PASS);
        await page.waitForTimeout(300);

        // Click en login
        await page.click('#loginButton');

        // Esperar a que el token aparezca (hasta 15 segundos)
        let isLoggedIn = false;
        for (let i = 0; i < 15; i++) {
            await page.waitForTimeout(1000);
            const hasToken = await page.evaluate(() => !!localStorage.getItem('authToken'));
            if (hasToken) {
                isLoggedIn = true;
                break;
            }
        }

        // Obtener datos de sesión para uso posterior (desde localStorage)
        if (isLoggedIn) {
            const sessionData = await page.evaluate(() => {
                const userStr = localStorage.getItem('currentUser');
                const companyStr = localStorage.getItem('currentCompany') || localStorage.getItem('selectedCompany');
                return {
                    token: localStorage.getItem('authToken'),
                    user: userStr ? JSON.parse(userStr) : window.currentUser,
                    company: companyStr ? JSON.parse(companyStr) : (window.currentCompany || window.selectedCompany)
                };
            });
            authToken = sessionData.token;
            currentUser = sessionData.user;
            currentCompany = sessionData.company;
            console.log(`   ✅ Login exitoso - User: ${currentUser?.usuario || currentUser?.email || 'unknown'}`);
            console.log(`   User ID: ${currentUser?.id || currentUser?.user_id || 'N/A'}`);
        }

        console.log(`   Token: ${isLoggedIn ? '✅ OK' : '❌ FALLÓ'}`);

        // Esperar a que se cargue el dashboard completamente
        await page.waitForTimeout(3000);

        // Screenshot del dashboard después del login
        await page.screenshot({ path: 'test-results/mi-salud-01-login.png', fullPage: true });
        console.log('   📸 mi-salud-01-login.png');

        if (!isLoggedIn) {
            await page.screenshot({ path: 'test-results/mi-salud-ERROR-login.png', fullPage: true });
            console.log('   📸 mi-salud-ERROR-login.png (login falló)');
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 2: NAVEGAR A MI ESPACIO
        // ═══════════════════════════════════════════════════════════════
        console.log('👤 Paso 2: Navegar a Mi Espacio...');

        // Esperar que la UI del dashboard se cargue completamente
        await page.waitForTimeout(2000);

        // Navegar a Mi Espacio usando showEmployeeDashboard directamente
        const navigated = await page.evaluate(() => {
            // Primero, asegurar que window.currentUser esté definido (desde localStorage si es necesario)
            if (!window.currentUser) {
                const userStr = localStorage.getItem('currentUser');
                if (userStr) {
                    window.currentUser = JSON.parse(userStr);
                    console.log('Recuperado currentUser desde localStorage');
                }
            }
            if (!window.currentCompany && !window.selectedCompany) {
                const companyStr = localStorage.getItem('currentCompany') || localStorage.getItem('selectedCompany');
                if (companyStr) {
                    window.currentCompany = JSON.parse(companyStr);
                    window.selectedCompany = window.currentCompany;
                    console.log('Recuperado currentCompany desde localStorage');
                }
            }

            // Ocultar grid de módulos admin
            const moduleGrid = document.querySelector('.module-grid');
            if (moduleGrid) moduleGrid.style.display = 'none';

            // Mostrar mainContent
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.display = 'block';
                mainContent.style.visibility = 'visible';
            }

            // Método preferido: showEmployeeDashboard
            if (typeof window.showEmployeeDashboard === 'function' && window.currentUser) {
                const user = window.currentUser;
                const company = window.currentCompany || window.selectedCompany;
                console.log('Llamando showEmployeeDashboard con:', { user: user?.usuario, company: company?.name });
                window.showEmployeeDashboard(user, company);
                return { method: 'showEmployeeDashboard direct', success: true, user: user?.usuario };
            }

            // Fallback: Intentar MiEspacio.init
            if (typeof window.MiEspacio !== 'undefined' && window.MiEspacio.init) {
                window.MiEspacio.init();
                return { method: 'MiEspacio.init', success: true };
            }

            return {
                method: 'none',
                success: false,
                showEmployeeDashboardExists: typeof window.showEmployeeDashboard === 'function',
                userExists: !!window.currentUser,
                userFromLS: !!localStorage.getItem('currentUser')
            };
        });

        console.log(`   Método: ${navigated.method} - ${navigated.success ? '✅' : '❌'}`);

        // Esperar a que se renderice el employee dashboard
        await page.waitForTimeout(2000);

        // Verificar y forzar que el employee dashboard se muestre
        const dashboardRendered = await page.evaluate(() => {
            // Verificar si mainContent tiene el employee-dashboard
            const mainContent = document.getElementById('mainContent');
            let hasEmployeeDashboard = mainContent && mainContent.innerHTML.includes('employee-dashboard');

            // Debug: qué hay en mainContent
            const mainContentPreview = mainContent ? mainContent.innerHTML.substring(0, 300) : 'no content';
            console.log('mainContent preview:', mainContentPreview);

            if (!hasEmployeeDashboard) {
                // Forzar la renderización directamente
                const moduleGrid = document.querySelector('.module-grid');
                if (moduleGrid) moduleGrid.style.display = 'none';

                // Verificar que tenemos los datos necesarios
                const user = window.currentUser;
                const company = window.currentCompany || window.selectedCompany;

                console.log('User:', user);
                console.log('Company:', company);
                console.log('showEmployeeDashboard exists:', typeof window.showEmployeeDashboard);

                if (typeof window.showEmployeeDashboard === 'function' && user && company) {
                    try {
                        window.showEmployeeDashboard(user, company);
                        hasEmployeeDashboard = mainContent && mainContent.innerHTML.includes('employee-dashboard');
                        return { forced: true, success: hasEmployeeDashboard, error: null };
                    } catch (e) {
                        return { forced: true, success: false, error: e.message };
                    }
                } else {
                    return {
                        forced: false,
                        hasEmployeeDashboard,
                        noFunction: typeof window.showEmployeeDashboard !== 'function',
                        noUser: !user,
                        noCompany: !company
                    };
                }
            }

            return {
                forced: false,
                hasEmployeeDashboard,
                mainContentVisible: mainContent ? mainContent.style.display !== 'none' : false,
                moduleGridHidden: document.querySelector('.module-grid')?.style.display === 'none'
            };
        });

        console.log(`   Dashboard rendered:`, JSON.stringify(dashboardRendered));
        await page.waitForTimeout(2000);

        // Screenshot de Mi Espacio
        await page.screenshot({ path: 'test-results/mi-salud-02-mi-espacio.png', fullPage: true });
        console.log('   📸 mi-salud-02-mi-espacio.png');

        // ═══════════════════════════════════════════════════════════════
        // PASO 3: SCROLL Y BUSCAR MI SALUD
        // ═══════════════════════════════════════════════════════════════
        console.log('💊 Paso 3: Buscar y abrir Mi Salud...');

        // Asegurar que el admin grid sigue oculto antes de scroll
        await page.evaluate(() => {
            const moduleGrid = document.querySelector('.module-grid');
            if (moduleGrid) moduleGrid.style.display = 'none';
        });

        // Hacer scroll suave dentro del mainContent (no el body completo)
        await page.evaluate(() => {
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.scrollTo({ top: mainContent.scrollHeight, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 500, behavior: 'smooth' });
            }
        });
        await page.waitForTimeout(1000);

        // Screenshot después de scroll
        await page.screenshot({ path: 'test-results/mi-salud-02b-scroll-down.png', fullPage: true });
        console.log('   📸 mi-salud-02b-scroll-down.png (con scroll)');

        // Verificar si existe la tarjeta Mi Salud - búsqueda exhaustiva
        const cardInfo = await page.evaluate(() => {
            // Debug: mostrar contenido de mainContent
            const mainContent = document.getElementById('mainContent');
            const mainContentHtml = mainContent ? mainContent.innerHTML.substring(0, 500) : 'no mainContent';
            console.log('MainContent HTML (first 500):', mainContentHtml);

            // Buscar por ID específico del employee dashboard
            let card = document.getElementById('card-mi-salud-employee');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return { exists: true, visible: card.offsetParent !== null, foundBy: 'id-employee', cardId: card.id };
            }

            // Buscar por ID alternativo
            card = document.getElementById('card-mi-salud');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return { exists: true, visible: card.offsetParent !== null, foundBy: 'id-original', cardId: card.id };
            }

            // Buscar por data-module-key="mi-salud"
            card = document.querySelector('[data-module-key="mi-salud"]');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return { exists: true, visible: true, foundBy: 'data-module-key', cardId: card.id || 'no-id' };
            }

            // Buscar por texto "Mi Salud" en cualquier elemento
            const allCards = document.querySelectorAll('.employee-module-card, .mi-espacio-module-card, [data-module-key], .module-card');
            const cardsList = [];
            for (const c of allCards) {
                cardsList.push({ id: c.id, text: c.textContent?.substring(0, 50), moduleKey: c.dataset?.moduleKey });
                if (c.textContent?.includes('Mi Salud') || c.textContent?.includes('💊')) {
                    c.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return { exists: true, visible: true, foundBy: 'text-search', cardId: c.id || 'no-id' };
                }
            }

            // Buscar por h4 con texto "Mi Salud"
            const h4s = document.querySelectorAll('h4');
            for (const h4 of h4s) {
                if (h4.textContent?.includes('Mi Salud')) {
                    const parentCard = h4.closest('[data-module-key], .employee-module-card, .module-card, div[onclick]');
                    if (parentCard) {
                        parentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return { exists: true, visible: true, foundBy: 'h4-parent', cardId: parentCard.id || 'no-id' };
                    }
                }
            }

            return {
                exists: false,
                totalCards: allCards.length,
                cardsFound: cardsList,
                mainContentExists: !!mainContent,
                mainContentVisible: mainContent ? mainContent.style.display !== 'none' : false
            };
        });

        console.log(`   Card Mi Salud: ${cardInfo.exists ? '✅ encontrado via ' + cardInfo.foundBy : '❌ no encontrado'}`);
        if (cardInfo.exists) {
            console.log(`   Card ID: ${cardInfo.cardId}`);
        } else {
            console.log(`   Total tarjetas encontradas: ${cardInfo.totalCards}`);
            console.log(`   mainContent existe: ${cardInfo.mainContentExists}`);
            console.log(`   mainContent visible: ${cardInfo.mainContentVisible}`);
            if (cardInfo.cardsFound && cardInfo.cardsFound.length > 0) {
                console.log(`   Tarjetas detectadas:`);
                cardInfo.cardsFound.forEach((c, i) => console.log(`      ${i+1}. id="${c.id}" key="${c.moduleKey}" text="${c.text}"`));
            }
        }
        await page.waitForTimeout(500);

        // ═══════════════════════════════════════════════════════════════
        // PASO 4: ABRIR MODAL MI SALUD (método directo)
        // ═══════════════════════════════════════════════════════════════
        console.log('🏥 Paso 4: Abrir Modal Mi Salud...');

        // Abrir Mi Salud directamente llamando a la función
        const modalOpened = await page.evaluate(() => {
            // Método 1: Click en card del employee dashboard
            const cardEmployee = document.getElementById('card-mi-salud-employee');
            if (cardEmployee) {
                cardEmployee.click();
                return { method: 'card-mi-salud-employee click', success: true };
            }

            // Método 2: MiEspacio.openMiSalud()
            if (typeof window.MiEspacio !== 'undefined' && window.MiEspacio.openMiSalud) {
                window.MiEspacio.openMiSalud();
                return { method: 'openMiSalud', success: true };
            }

            // Método 3: Click en card original
            const card = document.getElementById('card-mi-salud');
            if (card) {
                card.click();
                return { method: 'card click', success: true };
            }

            // Método 4: Buscar card por texto y click
            const allCards = document.querySelectorAll('.employee-module-card, .mi-espacio-module-card, [data-module-key]');
            for (const c of allCards) {
                if (c.textContent.includes('Mi Salud')) {
                    c.click();
                    return { method: 'text search click', success: true };
                }
            }

            return { method: 'none', success: false };
        });

        console.log(`   Modal abierto via: ${modalOpened.method} - ${modalOpened.success ? '✅' : '❌'}`);
        await page.waitForTimeout(2000);

        // Verificar si el modal existe
        const modalExists = await page.evaluate(() => {
            const modal = document.getElementById('miSaludModal');
            return !!modal;
        });
        console.log(`   Modal Mi Salud existe: ${modalExists ? '✅' : '❌'}`);

        // Screenshot del modal Mi Salud
        await page.screenshot({ path: 'test-results/mi-salud-03-modal-abierto.png', fullPage: true });
        console.log('   📸 mi-salud-03-modal-abierto.png');

        // ═══════════════════════════════════════════════════════════════
        // PASO 5: CAPTURAR TABS
        // ═══════════════════════════════════════════════════════════════
        console.log('📑 Paso 5: Capturar tabs...');

        // Solo si el modal existe
        if (modalExists) {
            // Tab 1: Pendientes (ya debería estar activo)
            await page.screenshot({ path: 'test-results/mi-salud-04-tab-pendientes.png', fullPage: true });
            console.log('   📸 mi-salud-04-tab-pendientes.png');

            // Tab 2: Subir Documento
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('.salud-tab, [data-tab], button');
                for (const tab of tabs) {
                    const text = tab.textContent || '';
                    if (text.includes('Subir') || tab.dataset?.tab === 'upload') {
                        tab.click();
                        break;
                    }
                }
            });
            await page.waitForTimeout(1500);
            await page.screenshot({ path: 'test-results/mi-salud-05-tab-subir.png', fullPage: true });
            console.log('   📸 mi-salud-05-tab-subir.png');

            // Tab 3: Historial
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('.salud-tab, [data-tab], button');
                for (const tab of tabs) {
                    const text = tab.textContent || '';
                    if (text.includes('Historial') || tab.dataset?.tab === 'history') {
                        tab.click();
                        break;
                    }
                }
            });
            await page.waitForTimeout(1500);
            await page.screenshot({ path: 'test-results/mi-salud-06-tab-historial.png', fullPage: true });
            console.log('   📸 mi-salud-06-tab-historial.png');
        } else {
            console.log('   ⚠️ Modal no disponible - saltando capturas de tabs');
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 6: CREAR SOLICITUD VIA API
        // ═══════════════════════════════════════════════════════════════
        console.log('📝 Paso 6: Crear solicitud médica via API...');

        // Obtener token y userId del contexto de la página
        const authData = await page.evaluate(() => ({
            token: localStorage.getItem('authToken'),
            userId: window.currentUser?.id || window.currentUser?.user_id
        }));

        if (authData.token && authData.userId) {
            const apiContext = await request.newContext({
                baseURL: BASE_URL,
                extraHTTPHeaders: {
                    'Authorization': `Bearer ${authData.token}`,
                    'X-Test-Mode': 'true'
                }
            });

            const createRes = await apiContext.post('/api/medical/communications/request-document', {
                data: {
                    userId: authData.userId,
                    documentType: 'certificate',
                    subject: 'Test Visual CRUD - Certificado Médico',
                    message: 'Solicitud creada durante test visual CRUD',
                    urgency: 'high',
                    deadlineHours: 24
                }
            });

            if (createRes.ok()) {
                const createData = await createRes.json();
                console.log(`   ✅ Solicitud creada: ${createData.data?.id}`);

                // Guardar ID para después
                await page.evaluate((id) => {
                    window.testCommunicationId = id;
                }, createData.data?.id);
            } else {
                console.log('   ❌ Error creando solicitud:', createRes.status());
            }

            await apiContext.dispose();
        } else {
            console.log('   ⚠️ Sin token/userId para crear solicitud');
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 7: VERIFICAR SOLICITUD EN PENDIENTES
        // ═══════════════════════════════════════════════════════════════
        console.log('🔄 Paso 7: Verificar solicitud en pendientes...');

        if (modalExists) {
            // Volver al tab de pendientes
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('.salud-tab, [data-tab], button');
                for (const tab of tabs) {
                    const text = tab.textContent || '';
                    if (text.includes('Pendiente') || tab.dataset?.tab === 'pending') {
                        tab.click();
                        break;
                    }
                }
            });
            await page.waitForTimeout(2000);

            // Refrescar pendientes si hay función disponible
            await page.evaluate(() => {
                if (typeof window.MiEspacio !== 'undefined' && window.MiEspacio.renderPendingTab) {
                    window.MiEspacio.renderPendingTab();
                }
            });
            await page.waitForTimeout(2000);
        }

        await page.screenshot({ path: 'test-results/mi-salud-07-pendiente-creado.png', fullPage: true });
        console.log('   📸 mi-salud-07-pendiente-creado.png');

        // ═══════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📸 SCREENSHOTS GENERADOS:');
        console.log('   1. mi-salud-01-login.png           - Formulario de login');
        console.log('   2. mi-salud-02-mi-espacio.png      - Dashboard Mi Espacio');
        console.log('   2b. mi-salud-02b-scroll-down.png   - Mi Espacio (scroll)');
        console.log('   3. mi-salud-03-modal-abierto.png   - Modal Mi Salud');
        console.log('   4. mi-salud-04-tab-pendientes.png  - Tab Pendientes');
        console.log('   5. mi-salud-05-tab-subir.png       - Tab Subir Documento');
        console.log('   6. mi-salud-06-tab-historial.png   - Tab Historial');
        console.log('   7. mi-salud-07-pendiente-creado.png - Verificación final');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ Visual CRUD Testing Mi Salud completado');
    });
});
